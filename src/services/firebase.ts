import { initializeApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider, signInWithPopup } from 'firebase/auth';
import {
  getFirestore,
  doc,
  getDoc,
  setDoc,
  deleteDoc,
  collection,
  getDocs,
  getDocFromServer,
  writeBatch,
} from 'firebase/firestore';
import firebaseConfig from '../../firebase-applet-config.json';
import {
  BusinessSettings,
  TaskItem,
  InventoryItem,
  Order,
  ExpenseItem,
} from '../types';
import { RegisteredUserRecord } from './storage';

// Initialize Firebase
const app = initializeApp(firebaseConfig);
export const db = getFirestore(app, firebaseConfig.firestoreDatabaseId); /* CRITICAL: The app will break without this line */
export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();

// Error handling types and helper as specified in firebase-integration skill
export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
    tenantId?: string | null;
    providerInfo?: {
      providerId?: string | null;
      email?: string | null;
    }[];
  };
}

export function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null): never {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo: auth.currentUser?.providerData?.map((provider) => ({
        providerId: provider.providerId,
        email: provider.email,
      })) || [],
    },
    operationType,
    path,
  };
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

// Connectivity test on app boot
async function testConnection() {
  try {
    await getDocFromServer(doc(db, 'test', 'connection'));
  } catch (error) {
    if (error instanceof Error && error.message.includes('the client is offline')) {
      console.warn('Firebase client is offline or configuration is checking in.');
    }
  }
}
testConnection();

// Clean document ID generator for Firestore
export function sanitizeDocId(text: string): string {
  if (!text) return 'user_default';
  const clean = text.trim().toLowerCase().replace(/[^a-z0-9_-]/g, '_');
  return clean.slice(0, 100) || 'user_id';
}

/**
 * Fetch a registered user by email from Firestore Cloud
 */
export async function getFirestoreUser(email: string): Promise<RegisteredUserRecord | null> {
  const userId = sanitizeDocId(email);
  const path = `users/${userId}`;
  try {
    const userDoc = await getDoc(doc(db, 'users', userId));
    if (userDoc.exists()) {
      return userDoc.data() as RegisteredUserRecord;
    }
    return null;
  } catch (error) {
    handleFirestoreError(error, OperationType.GET, path);
  }
}

/**
 * Save / Update a registered user in Firestore Cloud
 */
export async function saveFirestoreUser(user: RegisteredUserRecord): Promise<void> {
  const userId = sanitizeDocId(user.email);
  const path = `users/${userId}`;
  try {
    await setDoc(doc(db, 'users', userId), {
      email: user.email,
      name: user.name,
      pin: user.pin,
      createdAt: user.createdAt || new Date().toISOString(),
      lastLogin: user.lastLogin || new Date().toISOString(),
      avatar: user.avatar || '',
      role: 'অফিসিয়াল অ্যাকাউন্ট ইউজার',
    }, { merge: true });
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

/**
 * Delete a user and all their subcollections from Firestore permanently
 */
export async function deleteFirestoreUser(email: string): Promise<void> {
  const userId = sanitizeDocId(email);
  const path = `users/${userId}`;
  try {
    // Delete settings
    await deleteDoc(doc(db, `users/${userId}/settings`, 'current')).catch(() => {});

    // Delete subcollections documents
    const subcollections = ['tasks', 'inventory', 'orders', 'expenses'];
    for (const sub of subcollections) {
      const snap = await getDocs(collection(db, `users/${userId}/${sub}`)).catch(() => null);
      if (snap && !snap.empty) {
        const batch = writeBatch(db);
        snap.forEach((d) => batch.delete(d.ref));
        await batch.commit().catch(() => {});
      }
    }

    // Delete root user doc
    await deleteDoc(doc(db, 'users', userId));
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
  }
}

/**
 * Save user business settings to Firestore
 */
export async function saveFirestoreSettings(email: string, settings: BusinessSettings): Promise<void> {
  const userId = sanitizeDocId(email);
  const path = `users/${userId}/settings/current`;
  try {
    await setDoc(doc(db, `users/${userId}/settings`, 'current'), {
      businessNameEn: settings.businessNameEn || 'NakshaLata',
      businessNameBn: settings.businessNameBn || 'নকশালতা',
      tagline: settings.tagline || '',
      phone: settings.phone || '',
      email: settings.email || email,
      address: settings.address || '',
      facebookPageUrl: settings.facebookPageUrl || '',
      invoiceFooterNote: settings.invoiceFooterNote || '',
      defaultCourier: settings.defaultCourier || 'Steadfast',
      appPin: settings.appPin || '1234',
      isPinEnabled: Boolean(settings.isPinEnabled),
      autoDriveBackup: Boolean(settings.autoDriveBackup),
      lastBackupDate: settings.lastBackupDate || new Date().toISOString(),
    }, { merge: true });
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

/**
 * Fetch all user cloud data from Firestore for cross-device sync
 */
export async function fetchAllFirestoreUserData(email: string): Promise<{
  settings?: BusinessSettings;
  tasks?: TaskItem[];
  inventory?: InventoryItem[];
  orders?: Order[];
  expenses?: ExpenseItem[];
} | null> {
  const userId = sanitizeDocId(email);
  try {
    const userDoc = await getDoc(doc(db, 'users', userId));
    if (!userDoc.exists()) {
      return null;
    }

    // Fetch settings
    let settings: BusinessSettings | undefined;
    const settingsDoc = await getDoc(doc(db, `users/${userId}/settings`, 'current'));
    if (settingsDoc.exists()) {
      settings = settingsDoc.data() as BusinessSettings;
    }

    // Fetch tasks
    let tasks: TaskItem[] | undefined;
    const tasksSnap = await getDocs(collection(db, `users/${userId}/tasks`));
    if (!tasksSnap.empty) {
      tasks = tasksSnap.docs.map((d) => d.data() as TaskItem);
    }

    // Fetch inventory
    let inventory: InventoryItem[] | undefined;
    const invSnap = await getDocs(collection(db, `users/${userId}/inventory`));
    if (!invSnap.empty) {
      inventory = invSnap.docs.map((d) => d.data() as InventoryItem);
    }

    // Fetch orders
    let orders: Order[] | undefined;
    const ordersSnap = await getDocs(collection(db, `users/${userId}/orders`));
    if (!ordersSnap.empty) {
      orders = ordersSnap.docs.map((d) => d.data() as Order);
    }

    // Fetch expenses
    let expenses: ExpenseItem[] | undefined;
    const expensesSnap = await getDocs(collection(db, `users/${userId}/expenses`));
    if (!expensesSnap.empty) {
      expenses = expensesSnap.docs.map((d) => d.data() as ExpenseItem);
    }

    return { settings, tasks, inventory, orders, expenses };
  } catch (error) {
    handleFirestoreError(error, OperationType.GET, `users/${userId}`);
  }
}

/**
 * Sync entire user data to Firestore
 */
export async function syncUserDataToFirestore(
  email: string,
  payload: {
    settings?: BusinessSettings;
    tasks?: TaskItem[];
    inventory?: InventoryItem[];
    orders?: Order[];
    expenses?: ExpenseItem[];
  }
): Promise<void> {
  const userId = sanitizeDocId(email);
  try {
    if (payload.settings) {
      await saveFirestoreSettings(email, payload.settings);
    }

    if (payload.tasks && payload.tasks.length > 0) {
      const batch = writeBatch(db);
      for (const t of payload.tasks) {
        const taskId = sanitizeDocId(t.id);
        batch.set(doc(db, `users/${userId}/tasks`, taskId), t, { merge: true });
      }
      await batch.commit();
    }

    if (payload.inventory && payload.inventory.length > 0) {
      const batch = writeBatch(db);
      for (const item of payload.inventory) {
        const itemId = sanitizeDocId(item.id);
        batch.set(doc(db, `users/${userId}/inventory`, itemId), item, { merge: true });
      }
      await batch.commit();
    }

    if (payload.orders && payload.orders.length > 0) {
      const batch = writeBatch(db);
      for (const order of payload.orders) {
        const orderId = sanitizeDocId(order.id);
        batch.set(doc(db, `users/${userId}/orders`, orderId), order, { merge: true });
      }
      await batch.commit();
    }

    if (payload.expenses && payload.expenses.length > 0) {
      const batch = writeBatch(db);
      for (const exp of payload.expenses) {
        const expId = sanitizeDocId(exp.id);
        batch.set(doc(db, `users/${userId}/expenses`, expId), exp, { merge: true });
      }
      await batch.commit();
    }
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, `users/${userId}`);
  }
}

/**
 * Google Sign-In with popup using Firebase Auth
 */
export async function signInWithGoogleFirebase() {
  return await signInWithPopup(auth, googleProvider);
}
