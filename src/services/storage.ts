import {
  BusinessSettings,
  TaskItem,
  InventoryItem,
  Order,
  ExpenseItem,
  BackupPayload,
  UserAccount,
} from '../types';
import {
  getFirestoreUser,
  saveFirestoreUser,
  deleteFirestoreUser,
  saveFirestoreSettings,
  fetchAllFirestoreUserData,
  syncUserDataToFirestore,
} from './firebase';

export interface KnownAccount {
  email: string;
  name: string;
  avatar: string;
  lastLogin: string;
}

export const DEFAULT_SETTINGS: BusinessSettings = {
  businessNameEn: 'NakshaLata',
  businessNameBn: 'নকশালতা',
  tagline: 'সৌখিন দেশীয় পোশাক ও হস্তশিল্পের নিজস্ব সম্ভার',
  phone: '+880 1711-234567',
  email: 'nakshalata.official@gmail.com',
  address: 'বাড়ি #৪৫, রোড #১২, ধানমন্ডি, ঢাকা - ১২০৯',
  facebookPageUrl: 'facebook.com/nakshalata',
  invoiceFooterNote: 'নকশালতার সাথে থাকার জন্য ধন্যবাদ! ত্রুটিযুক্ত পণ্যের ক্ষেত্রে ৪৮ ঘণ্টার মধ্যে যোগাযোগ করুন।',
  defaultCourier: 'Steadfast',
  appPin: '1234',
  isPinEnabled: false,
  autoDriveBackup: false,
  lastBackupDate: new Date().toISOString(),
};

export const INITIAL_TASKS: TaskItem[] = [
  {
    id: 'task-1',
    title: 'আজকের ১০টি কুর্তি ও শাড়ির পার্সেল প্যাকিং ও কুরিয়ারে এন্ট্রি',
    description: 'Steadfast ও Pathao কুরিয়ারের জন্য পার্সেলগুলো ইনভয়েস ও বাবল র‍্যাপ দিয়ে রেডি করা',
    date: new Date().toISOString().split('T')[0],
    time: '11:30',
    priority: 'high',
    category: 'প্যাকিং ও কুরিয়ার',
    completed: false,
    createdAt: new Date().toISOString(),
  },
  {
    id: 'task-2',
    title: 'নকশী কাঁথা ও সুতি কুর্তির নতুন লটের কারিগর পেমেন্ট ক্লিয়ার করা',
    description: 'জামালপুরের হস্তশিল্প কারিগরদের মজুরি ও নতুন অর্ডারের কাপড়ের টাকা পাঠানো',
    date: new Date().toISOString().split('T')[0],
    time: '14:00',
    priority: 'medium',
    category: 'কারিগর ও সাপ্লায়ার',
    completed: false,
    createdAt: new Date().toISOString(),
  },
  {
    id: 'task-3',
    title: 'Facebook Page এ নকশালতার নতুন বৈশাখী কালেকশন ফটো পোস্ট ও মেসেঞ্জার ফলোআপ',
    description: 'পেন্ডিং মেসেজগুলোর সাইজ ও কালার কনফার্মেশন নিয়ে ইনভয়েস তৈরি করা',
    date: new Date().toISOString().split('T')[0],
    time: '17:30',
    priority: 'high',
    category: 'সোশ্যাল মিডিয়া ও মার্কেটিং',
    completed: false,
    createdAt: new Date().toISOString(),
  },
  {
    id: 'task-4',
    title: 'সাপ্তাহিক স্টক ও লাভ-ক্ষতি লেজার মিলানো',
    description: 'FIFO ও LIFO ব্যাচ ভিত্তিক বিক্রয় হিসাব ও ক্যাশ অন ডেলিভারি পেমেন্ট যাচাই',
    date: new Date(Date.now() + 86400000).toISOString().split('T')[0],
    time: '19:00',
    priority: 'low',
    category: 'অ্যাকাউন্টিং ও স্টক',
    completed: false,
    createdAt: new Date().toISOString(),
  },
];

export const INITIAL_INVENTORY: InventoryItem[] = [
  {
    id: 'item-1',
    sku: 'NL-KURTI-01',
    nameEn: 'Hand-Embroidered Cotton Kurti (Pastel Mint)',
    nameBn: 'হস্তশিল্প সুতি কারুকাজ কুর্তি (মিন্ট গ্রিন)',
    category: 'কুর্তি ও টপস',
    valuationMethod: 'FIFO',
    defaultSellingPrice: 1650,
    alertThreshold: 5,
    createdAt: '2026-03-01T10:00:00Z',
    batches: [
      {
        batchId: 'batch-101',
        batchCode: 'LOT-FEB-26-01',
        purchaseDate: '2026-02-15',
        unitCostPrice: 920,
        defaultSellingPrice: 1650,
        initialQty: 25,
        remainingQty: 6,
        supplier: 'জামালপুর হস্তশিল্প সমিতি',
      },
      {
        batchId: 'batch-102',
        batchCode: 'LOT-MAR-26-02',
        purchaseDate: '2026-03-10',
        unitCostPrice: 980,
        defaultSellingPrice: 1650,
        initialQty: 30,
        remainingQty: 22,
        supplier: 'জামালপুর হস্তশিল্প সমিতি',
      },
    ],
  },
  {
    id: 'item-2',
    sku: 'NL-SAREE-02',
    nameEn: 'Nakshi Kantha Stitch Silk Saree (Royal Indigo)',
    nameBn: 'রয়েল ইন্ডিগো নকশী কাঁথা স্টিচ সিল্ক শাড়ি',
    category: 'শাড়ি ও জমকালো পোশাক',
    valuationMethod: 'FIFO',
    defaultSellingPrice: 4200,
    alertThreshold: 3,
    createdAt: '2026-03-05T10:00:00Z',
    batches: [
      {
        batchId: 'batch-201',
        batchCode: 'LOT-FEB-SAREE-A',
        purchaseDate: '2026-02-20',
        unitCostPrice: 2450,
        defaultSellingPrice: 4200,
        initialQty: 12,
        remainingQty: 3,
        supplier: 'রাজশাহী রেশম শিল্প',
      },
      {
        batchId: 'batch-202',
        batchCode: 'LOT-MAR-SAREE-B',
        purchaseDate: '2026-03-12',
        unitCostPrice: 2600,
        defaultSellingPrice: 4200,
        initialQty: 15,
        remainingQty: 15,
        supplier: 'রাজশাহী রেশম শিল্প',
      },
    ],
  },
  {
    id: 'item-3',
    sku: 'NL-PANJABI-03',
    nameEn: 'Men Premium Handloom Linen Panjabi (Off-White)',
    nameBn: 'হস্তচালিত তাঁত প্রিমিয়াম লিনেন পাঞ্জাবি (অফ-হোয়াইট)',
    category: 'পাঞ্জাবি ও পুরুষদের পোশাক',
    valuationMethod: 'LIFO',
    defaultSellingPrice: 2150,
    alertThreshold: 4,
    createdAt: '2026-03-10T10:00:00Z',
    batches: [
      {
        batchId: 'batch-301',
        batchCode: 'LOT-FEB-PAN-01',
        purchaseDate: '2026-02-28',
        unitCostPrice: 1150,
        defaultSellingPrice: 2150,
        initialQty: 20,
        remainingQty: 8,
        supplier: 'টাঙ্গাইল তাঁত সমবায়',
      },
      {
        batchId: 'batch-302',
        batchCode: 'LOT-MAR-PAN-02',
        purchaseDate: '2026-03-25',
        unitCostPrice: 1250,
        defaultSellingPrice: 2150,
        initialQty: 25,
        remainingQty: 18,
        supplier: 'টাঙ্গাইল তাঁত সমবায়',
      },
    ],
  },
  {
    id: 'item-4',
    sku: 'NL-DUPATTA-04',
    nameEn: 'Block Printed Organic Cotton Dupatta (Terracotta)',
    nameBn: 'ব্লক প্রিন্টেড সুতি ঐতিহ্যবাহী ওড়না (পোড়ামাটি)',
    category: 'ওড়না ও স্কার্ফ',
    valuationMethod: 'FIFO',
    defaultSellingPrice: 850,
    alertThreshold: 6,
    createdAt: '2026-03-15T10:00:00Z',
    batches: [
      {
        batchId: 'batch-401',
        batchCode: 'LOT-MAR-DUP-01',
        purchaseDate: '2026-03-01',
        unitCostPrice: 420,
        defaultSellingPrice: 850,
        initialQty: 40,
        remainingQty: 14,
        supplier: 'কুমিল্লা খাদি উইভার্স',
      },
    ],
  },
];

export const INITIAL_ORDERS: Order[] = [
  {
    id: 'ord-101',
    orderNumber: 'NL-2026-001',
    customerName: 'তানজিলা তাসনিম',
    customerPhone: '01712-889900',
    customerAddress: 'বাড়ি #১৫, রোড #৪, সেক্টর #১১, উত্তরা',
    district: 'ঢাকা',
    items: [
      {
        itemId: 'item-1',
        itemNameEn: 'Hand-Embroidered Cotton Kurti (Pastel Mint)',
        itemNameBn: 'হস্তশিল্প সুতি কারুকাজ কুর্তি (মিন্ট গ্রিন)',
        quantity: 1,
        unitDefaultPrice: 1650,
        unitActualPrice: 1650,
        totalSellingPrice: 1650,
        unitCostPrice: 920,
        totalCostPrice: 920,
      },
    ],
    subtotal: 1650,
    deliveryCharge: 80,
    advancePaid: 200,
    totalAmount: 1730,
    dueAmount: 1530,
    orderDate: '2026-04-01',
    orderTime: '11:15',
    source: 'Facebook Page',
    status: 'Delivered',
    courierService: 'Steadfast',
    courierTrackingCode: 'ST-998241',
    courierScheduledDate: '2026-04-02',
    courierScheduledTime: '16:00',
    cogsTotal: 920,
    batchDeductions: [
      {
        itemId: 'item-1',
        batchId: 'batch-101',
        batchCode: 'LOT-FEB-26-01',
        qtyDeducted: 1,
        unitCostPrice: 920,
      },
    ],
    notes: 'কাস্টমার মেসেঞ্জারে অগ্রিম ২০০ টাকা বিকাশ করেছে',
    createdAt: '2026-04-01T11:15:00Z',
  },
  {
    id: 'ord-102',
    orderNumber: 'NL-2026-002',
    customerName: 'মাহমুদুল হাসান',
    customerPhone: '01819-334455',
    customerAddress: 'জিইসি মোড়, ওআর নিজাম রোড, নাসিরাবাদ',
    district: 'চট্টগ্রাম',
    items: [
      {
        itemId: 'item-3',
        itemNameEn: 'Men Premium Handloom Linen Panjabi (Off-White)',
        itemNameBn: 'হস্তচালিত তাঁত প্রিমিয়াম লিনেন পাঞ্জাবি (অফ-হোয়াইট)',
        quantity: 2,
        unitDefaultPrice: 2150,
        unitActualPrice: 2050, // বিশেষ অফার মূল্যে বিক্রি
        totalSellingPrice: 4100,
        unitCostPrice: 1250,
        totalCostPrice: 2500,
      },
    ],
    subtotal: 4100,
    deliveryCharge: 130,
    advancePaid: 500,
    totalAmount: 4230,
    dueAmount: 3730,
    orderDate: '2026-04-03',
    orderTime: '15:40',
    source: 'Facebook Page',
    status: 'Handed to Courier',
    courierService: 'Pathao',
    courierTrackingCode: 'PTH-CT-44018',
    courierScheduledDate: '2026-04-05',
    courierScheduledTime: '14:30',
    cogsTotal: 2500,
    batchDeductions: [
      {
        itemId: 'item-3',
        batchId: 'batch-302',
        batchCode: 'LOT-MAR-PAN-02',
        qtyDeducted: 2,
        unitCostPrice: 1250,
      },
    ],
    notes: 'সাইজ ৪০ এবং ৪২ দুটি পাঞ্জাবি',
    createdAt: '2026-04-03T15:40:00Z',
  },
  {
    id: 'ord-103',
    orderNumber: 'NL-2026-003',
    customerName: 'সুমাইয়া ফারহানা',
    customerPhone: '01911-667788',
    customerAddress: 'উপশহর মেইন রোড, ব্লক ডি',
    district: 'রাজশাহী',
    items: [
      {
        itemId: 'item-2',
        itemNameEn: 'Nakshi Kantha Stitch Silk Saree (Royal Indigo)',
        itemNameBn: 'রয়েল ইন্ডিগো নকশী কাঁথা স্টিচ সিল্ক শাড়ি',
        quantity: 1,
        unitDefaultPrice: 4200,
        unitActualPrice: 4200,
        totalSellingPrice: 4200,
        unitCostPrice: 2450,
        totalCostPrice: 2450,
      },
      {
        itemId: 'item-4',
        itemNameEn: 'Block Printed Organic Cotton Dupatta (Terracotta)',
        itemNameBn: 'ব্লক প্রিন্টেড সুতি ঐতিহ্যবাহী ওড়না (পোড়ামাটি)',
        quantity: 1,
        unitDefaultPrice: 850,
        unitActualPrice: 800, // ৫০ টাকা ছাড়
        totalSellingPrice: 800,
        unitCostPrice: 420,
        totalCostPrice: 420,
      },
    ],
    subtotal: 5000,
    deliveryCharge: 130,
    advancePaid: 1000,
    totalAmount: 5130,
    dueAmount: 4130,
    orderDate: '2026-04-05',
    orderTime: '18:20',
    source: 'Facebook Page',
    status: 'Processing',
    cogsTotal: 2870,
    batchDeductions: [
      {
        itemId: 'item-2',
        batchId: 'batch-201',
        batchCode: 'LOT-FEB-SAREE-A',
        qtyDeducted: 1,
        unitCostPrice: 2450,
      },
      {
        itemId: 'item-4',
        batchId: 'batch-401',
        batchCode: 'LOT-MAR-DUP-01',
        qtyDeducted: 1,
        unitCostPrice: 420,
      },
    ],
    notes: 'উপহার হিসেবে সুন্দর বক্স প্যাকেজিং চেয়েছেন',
    createdAt: '2026-04-05T18:20:00Z',
  },
];

export const INITIAL_EXPENSES: ExpenseItem[] = [
  {
    id: 'exp-1',
    date: '2026-03-28',
    category: 'Facebook Boosting',
    description: 'নকশালতা বৈশাখী কুর্তি ও শাড়ি ক্যাম্পেইন স্পনসরড অ্যাড (৫ দিন)',
    amount: 3500,
    createdAt: '2026-03-28T12:00:00Z',
  },
  {
    id: 'exp-2',
    date: '2026-03-30',
    category: 'প্যাকেজিং খরচ',
    description: 'ব্র্যান্ডেড পরিবেশবান্ধব কাগজের শপিং ব্যাগ ও সিকিউরিটি বাবল র‍্যাপ (৩০০ পিস)',
    amount: 2400,
    createdAt: '2026-03-30T14:30:00Z',
  },
  {
    id: 'exp-3',
    date: '2026-04-02',
    category: 'কারিগর মজুরি',
    description: 'হাতে করা নকশী কাজের কারিগর দলের অ্যাডভান্স পারিশ্রমিক',
    amount: 6000,
    createdAt: '2026-04-02T16:00:00Z',
  },
];

const STORAGE_KEYS = {
  SETTINGS: 'nl_business_settings',
  TASKS: 'nl_tasks_data',
  INVENTORY: 'nl_inventory_data',
  ORDERS: 'nl_orders_data',
  EXPENSES: 'nl_expenses_data',
  USER: 'nl_user_account',
  LOCKED: 'nl_app_is_locked',
  KNOWN_ACCOUNTS: 'nl_known_accounts_list',
  REGISTERED_USERS: 'nl_registered_users_registry',
};

export interface RegisteredUserRecord {
  email: string;
  name: string;
  pin: string;
  createdAt: string;
  lastLogin?: string;
  avatar?: string;
}

export function getUserDatabaseKey(prefix: string, email?: string): string {
  if (!email || !email.trim()) return prefix;
  const cleanEmail = email.trim().toLowerCase().replace(/[^a-z0-9_]/g, '_');
  return `${prefix}_usr_${cleanEmail}`;
}

export function getRegisteredUsers(): RegisteredUserRecord[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.REGISTERED_USERS);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) return parsed;
    }
    // Seed initial admin user if registry is clean
    const existingPin = localStorage.getItem(getUserDatabaseKey('nl_user_pin', 'sabbirhosanjoy@gmail.com'))?.trim() || '1234';
    const seeded: RegisteredUserRecord[] = [
      {
        email: 'sabbirhosanjoy@gmail.com',
        name: 'সাকিব হোসাইন (NakshaLata)',
        pin: existingPin,
        createdAt: new Date().toISOString(),
        avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=160&q=80',
      },
    ];
    localStorage.setItem(STORAGE_KEYS.REGISTERED_USERS, JSON.stringify(seeded));
    return seeded;
  } catch {
    return [];
  }
}

export function isUserRegistered(email: string): boolean {
  if (!email) return false;
  const clean = email.trim().toLowerCase();
  const users = getRegisteredUsers();
  return users.some((u) => u.email.toLowerCase() === clean);
}

export function registerNewUser(
  name: string,
  email: string,
  pin: string
): { success: boolean; error?: string; userAccount?: UserAccount } {
  try {
    const cleanEmail = email.trim().toLowerCase();
    const cleanPin = pin.trim();
    const cleanName = name.trim() || cleanEmail.split('@')[0];

    if (!cleanEmail || !cleanEmail.includes('@') || !cleanEmail.endsWith('@gmail.com')) {
      return { success: false, error: 'সঠিক জিমেইল অ্যাড্রেস (যেমন: yourname@gmail.com) লিখুন!' };
    }
    if (!cleanPin || cleanPin.length < 4) {
      return { success: false, error: 'ইনবিল্ট সিকিউরিটি পিন কমপক্ষে ৪ সংখ্যার হতে হবে!' };
    }

    const users = getRegisteredUsers();
    if (users.some((u) => u.email.toLowerCase() === cleanEmail)) {
      return {
        success: false,
        error: `"${cleanEmail}" অ্যাকাউন্টটি ইতিমধ্যে নিবন্ধিত! অনুগ্রহ করে জিমেইল ও পিন দিয়ে সরাসরি লগইন করুন।`,
      };
    }

    const newUserRecord: RegisteredUserRecord = {
      email: cleanEmail,
      name: cleanName,
      pin: cleanPin,
      createdAt: new Date().toISOString(),
      lastLogin: new Date().toISOString(),
      avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=160&q=80',
    };

    const updated = [...users, newUserRecord];
    localStorage.setItem(STORAGE_KEYS.REGISTERED_USERS, JSON.stringify(updated));

    // Save and sync user pin
    setUserPin(cleanEmail, cleanPin);

    // Initialize business settings for this user
    const initialSettings: BusinessSettings = {
      ...DEFAULT_SETTINGS,
      email: cleanEmail,
      appPin: cleanPin,
    };
    saveSettings(initialSettings, cleanEmail);

    // Seed per-user initial starter data
    saveTasks(INITIAL_TASKS, cleanEmail);
    saveInventory(INITIAL_INVENTORY, cleanEmail);
    saveOrders(INITIAL_ORDERS, cleanEmail);
    saveExpenses(INITIAL_EXPENSES, cleanEmail);

    // Persist to Firebase Firestore Cloud
    saveFirestoreUser(newUserRecord).catch((err) => console.warn('Firestore user save deferred:', err));
    syncUserDataToFirestore(cleanEmail, {
      settings: initialSettings,
      tasks: INITIAL_TASKS,
      inventory: INITIAL_INVENTORY,
      orders: INITIAL_ORDERS,
      expenses: INITIAL_EXPENSES,
    }).catch((err) => console.warn('Firestore initial data sync deferred:', err));

    const userAccount: UserAccount = {
      name: cleanName,
      email: cleanEmail,
      avatar: newUserRecord.avatar || '',
      role: 'অফিসিয়াল অ্যাকাউন্ট ইউজার',
      loggedInAt: new Date().toISOString(),
    };

    return { success: true, userAccount };
  } catch (err: any) {
    return { success: false, error: err?.message || 'নতুন ইউজার তৈরি ব্যর্থ হয়েছে।' };
  }
}

export async function registerNewUserAsync(
  name: string,
  email: string,
  pin: string
): Promise<{ success: boolean; error?: string; userAccount?: UserAccount }> {
  try {
    const cleanEmail = email.trim().toLowerCase();
    const cleanPin = pin.trim();
    const cleanName = name.trim() || cleanEmail.split('@')[0];

    if (!cleanEmail || !cleanEmail.includes('@') || !cleanEmail.endsWith('@gmail.com')) {
      return { success: false, error: 'সঠিক জিমেইল অ্যাড্রেস (যেমন: yourname@gmail.com) লিখুন!' };
    }
    if (!cleanPin || cleanPin.length < 4) {
      return { success: false, error: 'ইনবিল্ট সিকিউরিটি পিন কমপক্ষে ৪ সংখ্যার হতে হবে!' };
    }

    // Check locally first
    const users = getRegisteredUsers();
    if (users.some((u) => u.email.toLowerCase() === cleanEmail)) {
      return {
        success: false,
        error: `"${cleanEmail}" অ্যাকাউন্টটি ইতিমধ্যে নিবন্ধিত! অনুগ্রহ করে জিমেইল ও পিন দিয়ে সরাসরি লগইন করুন।`,
      };
    }

    // Check Firebase Firestore for existing account across any device
    try {
      const cloudUser = await getFirestoreUser(cleanEmail);
      if (cloudUser) {
        return {
          success: false,
          error: `"${cleanEmail}" অ্যাকাউন্টটি ক্লাউডে ইতিমধ্যে নিবন্ধিত! অনুগ্রহ করে জিমেইল ও পিন দিয়ে সরাসরি লগইন করুন।`,
        };
      }
    } catch {
      // Continue if network test fails
    }

    const newUserRecord: RegisteredUserRecord = {
      email: cleanEmail,
      name: cleanName,
      pin: cleanPin,
      createdAt: new Date().toISOString(),
      lastLogin: new Date().toISOString(),
      avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=160&q=80',
    };

    const updated = [...users, newUserRecord];
    localStorage.setItem(STORAGE_KEYS.REGISTERED_USERS, JSON.stringify(updated));

    setUserPin(cleanEmail, cleanPin);

    const initialSettings: BusinessSettings = {
      ...DEFAULT_SETTINGS,
      email: cleanEmail,
      appPin: cleanPin,
    };
    saveSettings(initialSettings, cleanEmail);
    saveTasks(INITIAL_TASKS, cleanEmail);
    saveInventory(INITIAL_INVENTORY, cleanEmail);
    saveOrders(INITIAL_ORDERS, cleanEmail);
    saveExpenses(INITIAL_EXPENSES, cleanEmail);

    // Save to Firestore Cloud
    try {
      await saveFirestoreUser(newUserRecord);
      await syncUserDataToFirestore(cleanEmail, {
        settings: initialSettings,
        tasks: INITIAL_TASKS,
        inventory: INITIAL_INVENTORY,
        orders: INITIAL_ORDERS,
        expenses: INITIAL_EXPENSES,
      });
    } catch (cloudErr) {
      console.warn('Firebase sync warning:', cloudErr);
    }

    const userAccount: UserAccount = {
      name: cleanName,
      email: cleanEmail,
      avatar: newUserRecord.avatar || '',
      role: 'অফিসিয়াল অ্যাকাউন্ট ইউজার',
      loggedInAt: new Date().toISOString(),
    };

    return { success: true, userAccount };
  } catch (err: any) {
    return { success: false, error: err?.message || 'নতুন ইউজার তৈরি ব্যর্থ হয়েছে।' };
  }
}

export function verifyUserLogin(
  email: string,
  pin: string
): { success: boolean; error?: string; userAccount?: UserAccount } {
  const cleanEmail = email.trim().toLowerCase();
  const cleanPin = pin.trim();

  if (!cleanEmail) {
    return { success: false, error: 'অনুগ্রহ করে আপনার জিমেইল লিখুন।' };
  }
  if (!cleanPin) {
    return { success: false, error: 'অনুগ্রহ করে আপনার গোপন সিকিউরিটি পিন লিখুন।' };
  }

  const users = getRegisteredUsers();
  const matchedUser = users.find((u) => u.email.toLowerCase() === cleanEmail);

  if (!matchedUser) {
    return {
      success: false,
      error: `"${cleanEmail}" অ্যাকাউন্টে কোনো ইউজার পাওয়া যায়নি! সঠিক জিমেইল লিখুন অথবা নিচে 'নতুন ইউজার তৈরি করুন' বাটনে ক্লিক করে অ্যাকাউন্ট খুলুন।`,
    };
  }

  const storedPin = getUserPin(cleanEmail) || matchedUser.pin;
  if (cleanPin !== storedPin.trim()) {
    return {
      success: false,
      error: 'ভুল সিকিউরিটি পিন! সঠিক গোপন পিন প্রদান করুন অথবা নিচে "পিন ভুলে গেছেন? ওটিপি (OTP)" দিয়ে রিসেট করুন।',
    };
  }

  // Update last login
  matchedUser.lastLogin = new Date().toISOString();
  try {
    localStorage.setItem(STORAGE_KEYS.REGISTERED_USERS, JSON.stringify(users));
  } catch {}

  const userAccount: UserAccount = {
    name: matchedUser.name,
    email: matchedUser.email,
    avatar: matchedUser.avatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=160&q=80',
    role: 'অফিসিয়াল অ্যাকাউন্ট ইউজার',
    loggedInAt: new Date().toISOString(),
  };

  return { success: true, userAccount };
}

export async function verifyUserLoginAsync(
  email: string,
  pin: string
): Promise<{ success: boolean; error?: string; userAccount?: UserAccount }> {
  const cleanEmail = email.trim().toLowerCase();
  const cleanPin = pin.trim();

  if (!cleanEmail) {
    return { success: false, error: 'অনুগ্রহ করে আপনার জিমেইল লিখুন।' };
  }
  if (!cleanPin) {
    return { success: false, error: 'অনুগ্রহ করে আপনার গোপন সিকিউরিটি পিন লিখুন।' };
  }

  const users = getRegisteredUsers();
  let matchedUser = users.find((u) => u.email.toLowerCase() === cleanEmail);

  // If not found locally, query Firebase Firestore (e.g. user registered on another device/mobile!)
  if (!matchedUser) {
    try {
      const cloudUser = await getFirestoreUser(cleanEmail);
      if (cloudUser) {
        matchedUser = cloudUser;
        // Save to local registry for smooth offline caching
        const updated = [...users, cloudUser];
        localStorage.setItem(STORAGE_KEYS.REGISTERED_USERS, JSON.stringify(updated));
        setUserPin(cleanEmail, cloudUser.pin);

        // Fetch user's business cloud data from Firestore
        const cloudData = await fetchAllFirestoreUserData(cleanEmail);
        if (cloudData) {
          if (cloudData.settings) saveSettings(cloudData.settings, cleanEmail);
          if (cloudData.tasks) saveTasks(cloudData.tasks, cleanEmail);
          if (cloudData.inventory) saveInventory(cloudData.inventory, cleanEmail);
          if (cloudData.orders) saveOrders(cloudData.orders, cleanEmail);
          if (cloudData.expenses) saveExpenses(cloudData.expenses, cleanEmail);
        }
      }
    } catch (e) {
      console.warn('Firestore lookup warning:', e);
    }
  }

  if (!matchedUser) {
    return {
      success: false,
      error: `"${cleanEmail}" অ্যাকাউন্টে কোনো ইউজার পাওয়া যায়নি! সঠিক জিমেইল লিখুন অথবা নিচে 'নতুন ইউজার তৈরি করুন' বাটনে ক্লিক করে অ্যাকাউন্ট খুলুন।`,
    };
  }

  const storedPin = getUserPin(cleanEmail) || matchedUser.pin;
  if (cleanPin !== storedPin.trim()) {
    return {
      success: false,
      error: 'ভুল সিকিউরিটি পিন! সঠিক গোপন পিন প্রদান করুন অথবা নিচে "পিন ভুলে গেছেন? ওটিপি (OTP)" দিয়ে রিসেট করুন।',
    };
  }

  matchedUser.lastLogin = new Date().toISOString();
  try {
    localStorage.setItem(STORAGE_KEYS.REGISTERED_USERS, JSON.stringify(users));
    saveFirestoreUser(matchedUser).catch(() => {});
  } catch {}

  const userAccount: UserAccount = {
    name: matchedUser.name,
    email: matchedUser.email,
    avatar: matchedUser.avatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=160&q=80',
    role: 'অফিসিয়াল অ্যাকাউন্ট ইউজার',
    loggedInAt: new Date().toISOString(),
  };

  return { success: true, userAccount };
}

export function deleteUserAccountPermanently(email: string): boolean {
  try {
    if (!email) return false;
    const cleanEmail = email.trim().toLowerCase();

    // 1. Remove from registered users registry
    const users = getRegisteredUsers();
    const updatedUsers = users.filter((u) => u.email.toLowerCase() !== cleanEmail);
    localStorage.setItem(STORAGE_KEYS.REGISTERED_USERS, JSON.stringify(updatedUsers));

    // 2. Remove all partitioned keys for this user
    const prefixes = [
      'nl_user_pin',
      STORAGE_KEYS.SETTINGS,
      STORAGE_KEYS.TASKS,
      STORAGE_KEYS.INVENTORY,
      STORAGE_KEYS.ORDERS,
      STORAGE_KEYS.EXPENSES,
    ];
    prefixes.forEach((p) => {
      const k = getUserDatabaseKey(p, cleanEmail);
      localStorage.removeItem(k);
    });

    // 3. Clear session if it's the current user
    const currentRaw = localStorage.getItem(STORAGE_KEYS.USER);
    if (currentRaw) {
      try {
        const cur = JSON.parse(currentRaw);
        if (cur.email?.toLowerCase() === cleanEmail) {
          localStorage.removeItem(STORAGE_KEYS.USER);
          localStorage.removeItem(STORAGE_KEYS.LOCKED);
        }
      } catch {}
    }

    // 4. Delete permanently from Firebase Firestore Cloud
    deleteFirestoreUser(cleanEmail).catch((err) => console.warn('Cloud delete deferred:', err));

    return true;
  } catch (err) {
    console.error('Delete user account error:', err);
    return false;
  }
}

export function getKnownAccounts(): KnownAccount[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.KNOWN_ACCOUNTS);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) return parsed;
    }
    return [];
  } catch {
    return [];
  }
}

export function hasUserPin(email: string): boolean {
  try {
    if (!email) return false;
    const pinKey = getUserDatabaseKey('nl_user_pin', email);
    const storedPin = localStorage.getItem(pinKey)?.trim();
    if (storedPin) return true;

    const settingsKey = getUserDatabaseKey(STORAGE_KEYS.SETTINGS, email);
    const rawSettings = localStorage.getItem(settingsKey);
    if (rawSettings) {
      const parsed = JSON.parse(rawSettings);
      if (parsed.appPin && typeof parsed.appPin === 'string' && parsed.appPin.trim()) {
        return true;
      }
    }
    return false;
  } catch {
    return false;
  }
}

export function registerKnownAccount(account: KnownAccount): void {
  try {
    const existing = getKnownAccounts();
    const filtered = existing.filter(
      (a) => a.email.toLowerCase() !== account.email.toLowerCase()
    );
    const updated = [account, ...filtered];
    localStorage.setItem(STORAGE_KEYS.KNOWN_ACCOUNTS, JSON.stringify(updated));
  } catch (err) {
    console.warn('Failed to save known account:', err);
  }
}

export function getUserPin(email: string): string {
  try {
    if (!email) return '1234';
    const settingsKey = getUserDatabaseKey(STORAGE_KEYS.SETTINGS, email);
    const rawSettings = localStorage.getItem(settingsKey);
    let settingsPin: string | null = null;
    if (rawSettings) {
      try {
        const parsed = JSON.parse(rawSettings);
        if (parsed.appPin && typeof parsed.appPin === 'string') {
          settingsPin = parsed.appPin.trim();
        }
      } catch {
        // ignore json parse error
      }
    }

    const pinKey = getUserDatabaseKey('nl_user_pin', email);
    const storedPin = localStorage.getItem(pinKey)?.trim();

    // If settings has a defined PIN, it is authoritative and syncs to nl_user_pin
    if (settingsPin) {
      if (storedPin !== settingsPin) {
        localStorage.setItem(pinKey, settingsPin);
      }
      return settingsPin;
    }

    // Otherwise check stored pinKey
    if (storedPin) {
      return storedPin;
    }

    return '1234';
  } catch {
    return '1234';
  }
}

export function setUserPin(email: string, pin: string): void {
  const cleanPin = pin.trim();
  const cleanEmail = email.trim().toLowerCase();
  const pinKey = getUserDatabaseKey('nl_user_pin', cleanEmail);
  localStorage.setItem(pinKey, cleanPin);

  // Directly update settings in localStorage to ensure synchronous persistence
  const settingsKey = getUserDatabaseKey(STORAGE_KEYS.SETTINGS, cleanEmail);
  const rawSettings = localStorage.getItem(settingsKey);
  const currentSettings: BusinessSettings = rawSettings
    ? { ...DEFAULT_SETTINGS, ...JSON.parse(rawSettings) }
    : { ...DEFAULT_SETTINGS, email: cleanEmail };

  const updatedSettings: BusinessSettings = {
    ...currentSettings,
    appPin: cleanPin,
    isPinEnabled: true,
  };

  localStorage.setItem(settingsKey, JSON.stringify(updatedSettings));

  // Sync with registered users registry
  try {
    const rawUsers = localStorage.getItem(STORAGE_KEYS.REGISTERED_USERS);
    if (rawUsers) {
      const users: RegisteredUserRecord[] = JSON.parse(rawUsers);
      const matched = users.find((u) => u.email.toLowerCase() === cleanEmail);
      if (matched) {
        matched.pin = cleanPin;
        localStorage.setItem(STORAGE_KEYS.REGISTERED_USERS, JSON.stringify(users));
      }
    }
  } catch {}
}

export function loadSettings(email?: string): BusinessSettings {
  try {
    const key = getUserDatabaseKey(STORAGE_KEYS.SETTINGS, email);
    let raw = localStorage.getItem(key);
    
    // Fallback: If no direct key and email not specified, look for any existing stored settings
    if (!raw && !email) {
      for (let i = 0; i < localStorage.length; i++) {
        const k = localStorage.key(i);
        if (k && k.startsWith(STORAGE_KEYS.SETTINGS)) {
          raw = localStorage.getItem(k);
          if (raw) {
            localStorage.setItem(STORAGE_KEYS.SETTINGS, raw);
            break;
          }
        }
      }
    }

    let settings: BusinessSettings = DEFAULT_SETTINGS;
    if (raw) {
      settings = { ...DEFAULT_SETTINGS, ...JSON.parse(raw) };
    } else {
      settings = {
        ...DEFAULT_SETTINGS,
        email: email || DEFAULT_SETTINGS.email,
      };
    }

    return settings;
  } catch {
    return DEFAULT_SETTINGS;
  }
}

export function saveSettings(settings: BusinessSettings, email?: string): void {
  const targetEmail = email || settings.email;
  const key = getUserDatabaseKey(STORAGE_KEYS.SETTINGS, targetEmail);
  localStorage.setItem(key, JSON.stringify(settings));
  // Also save to generic key for instant offline access
  localStorage.setItem(STORAGE_KEYS.SETTINGS, JSON.stringify(settings));
}

export function loadTasks(email?: string): TaskItem[] {
  try {
    const key = getUserDatabaseKey(STORAGE_KEYS.TASKS, email);
    let raw = localStorage.getItem(key);

    if (!raw && !email) {
      for (let i = 0; i < localStorage.length; i++) {
        const k = localStorage.key(i);
        if (k && k.startsWith(STORAGE_KEYS.TASKS)) {
          raw = localStorage.getItem(k);
          if (raw) {
            localStorage.setItem(STORAGE_KEYS.TASKS, raw);
            break;
          }
        }
      }
    }

    if (raw) {
      return JSON.parse(raw);
    }
    return INITIAL_TASKS;
  } catch {
    return INITIAL_TASKS;
  }
}

export function saveTasks(tasks: TaskItem[], email?: string): void {
  const key = getUserDatabaseKey(STORAGE_KEYS.TASKS, email);
  localStorage.setItem(key, JSON.stringify(tasks));
  localStorage.setItem(STORAGE_KEYS.TASKS, JSON.stringify(tasks));
}

export function loadInventory(email?: string): InventoryItem[] {
  try {
    const key = getUserDatabaseKey(STORAGE_KEYS.INVENTORY, email);
    let raw = localStorage.getItem(key);

    if (!raw && !email) {
      for (let i = 0; i < localStorage.length; i++) {
        const k = localStorage.key(i);
        if (k && k.startsWith(STORAGE_KEYS.INVENTORY)) {
          raw = localStorage.getItem(k);
          if (raw) {
            localStorage.setItem(STORAGE_KEYS.INVENTORY, raw);
            break;
          }
        }
      }
    }

    if (raw) {
      return JSON.parse(raw);
    }
    return INITIAL_INVENTORY;
  } catch {
    return INITIAL_INVENTORY;
  }
}

export function saveInventory(items: InventoryItem[], email?: string): void {
  const key = getUserDatabaseKey(STORAGE_KEYS.INVENTORY, email);
  localStorage.setItem(key, JSON.stringify(items));
  localStorage.setItem(STORAGE_KEYS.INVENTORY, JSON.stringify(items));
}

export function loadOrders(email?: string): Order[] {
  try {
    const key = getUserDatabaseKey(STORAGE_KEYS.ORDERS, email);
    let raw = localStorage.getItem(key);

    if (!raw && !email) {
      for (let i = 0; i < localStorage.length; i++) {
        const k = localStorage.key(i);
        if (k && k.startsWith(STORAGE_KEYS.ORDERS)) {
          raw = localStorage.getItem(k);
          if (raw) {
            localStorage.setItem(STORAGE_KEYS.ORDERS, raw);
            break;
          }
        }
      }
    }

    if (raw) {
      return JSON.parse(raw);
    }
    return INITIAL_ORDERS;
  } catch {
    return INITIAL_ORDERS;
  }
}

export function saveOrders(orders: Order[], email?: string): void {
  const key = getUserDatabaseKey(STORAGE_KEYS.ORDERS, email);
  localStorage.setItem(key, JSON.stringify(orders));
  localStorage.setItem(STORAGE_KEYS.ORDERS, JSON.stringify(orders));
}

export function loadExpenses(email?: string): ExpenseItem[] {
  try {
    const key = getUserDatabaseKey(STORAGE_KEYS.EXPENSES, email);
    let raw = localStorage.getItem(key);

    if (!raw && !email) {
      for (let i = 0; i < localStorage.length; i++) {
        const k = localStorage.key(i);
        if (k && k.startsWith(STORAGE_KEYS.EXPENSES)) {
          raw = localStorage.getItem(k);
          if (raw) {
            localStorage.setItem(STORAGE_KEYS.EXPENSES, raw);
            break;
          }
        }
      }
    }

    if (raw) {
      return JSON.parse(raw);
    }
    return INITIAL_EXPENSES;
  } catch {
    return INITIAL_EXPENSES;
  }
}

export function saveExpenses(expenses: ExpenseItem[], email?: string): void {
  const key = getUserDatabaseKey(STORAGE_KEYS.EXPENSES, email);
  localStorage.setItem(key, JSON.stringify(expenses));
  localStorage.setItem(STORAGE_KEYS.EXPENSES, JSON.stringify(expenses));
}

export function exportFullBackup(email?: string): BackupPayload {
  return {
    version: '2.0.0',
    exportedAt: new Date().toISOString(),
    settings: loadSettings(email),
    tasks: loadTasks(email),
    inventory: loadInventory(email),
    orders: loadOrders(email),
    expenses: loadExpenses(email),
  };
}

export function importFullBackup(payload: BackupPayload, email?: string): boolean {
  try {
    if (!payload.settings || !payload.inventory || !payload.orders) {
      throw new Error('অবৈধ ব্যাকআপ ফাইল কাঠামো!');
    }
    saveSettings(payload.settings, email);
    saveTasks(payload.tasks || [], email);
    saveInventory(payload.inventory, email);
    saveOrders(payload.orders, email);
    saveExpenses(payload.expenses || [], email);
    return true;
  } catch (err) {
    console.error('Import error:', err);
    return false;
  }
}
