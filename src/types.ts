export type ValuationMethod = 'FIFO' | 'LIFO';

export interface UserAccount {
  email: string;
  name: string;
  avatar: string;
  role: string;
  loggedInAt: string;
}

export interface TaskItem {
  id: string;
  title: string;
  description?: string;
  date: string; // YYYY-MM-DD
  time: string; // HH:mm
  priority: 'high' | 'medium' | 'low';
  category: string;
  completed: boolean;
  snoozedUntil?: number; // timestamp in ms
  createdAt: string;
}

export interface InventoryBatch {
  batchId: string;
  batchCode: string;
  purchaseDate: string; // YYYY-MM-DD
  unitCostPrice: number; // ক্রয় মূল্য (প্রতি পিস)
  defaultSellingPrice: number; // নির্ধারিত বিক্রয় মূল্য
  initialQty: number;
  remainingQty: number;
  supplier: string;
}

export interface InventoryItem {
  id: string;
  sku: string;
  nameEn: string;
  nameBn: string;
  category: string;
  valuationMethod: ValuationMethod; // FIFO or LIFO
  defaultSellingPrice: number; // সাধারণ নির্ধারিত বিক্রয় মূল্য
  alertThreshold: number; // কম স্টকের সতর্কবার্তা সীমা
  batches: InventoryBatch[];
  createdAt: string;
}

export interface OrderItem {
  itemId: string;
  itemNameEn: string;
  itemNameBn: string;
  quantity: number;
  unitDefaultPrice: number; // নির্ধারিত বিক্রয় মূল্য
  unitActualPrice: number; // প্রকৃত বিক্রয় মূল্য (একক)
  totalSellingPrice: number; // quantity * unitActualPrice
  unitCostPrice: number; // FIFO/LIFO অনুযায়ী নির্ধারিত ক্রয়মূল্য (গড়)
  totalCostPrice: number; // quantity * unitCostPrice
}

export interface BatchDeductionRecord {
  itemId: string;
  batchId: string;
  batchCode: string;
  qtyDeducted: number;
  unitCostPrice: number;
}

export type OrderStatus =
  | 'Pending' // অর্ডার গৃহীত
  | 'Processing' // প্রসেসিং / প্যাকেজিং
  | 'Handed to Courier' // কুরিয়ারে হস্তান্তর
  | 'Delivered' // ডেলিভারি সম্পন্ন
  | 'Returned' // রিটার্ন
  | 'Cancelled'; // বাতিল

export interface Order {
  id: string;
  orderNumber: string; // e.g. NL-2026-001
  customerName: string;
  customerPhone: string;
  customerAddress: string;
  district: string;
  items: OrderItem[];
  subtotal: number;
  deliveryCharge: number;
  advancePaid: number;
  totalAmount: number;
  dueAmount: number; // ক্যাশ অন ডেলিভারি (COD)
  orderDate: string; // YYYY-MM-DD
  orderTime: string; // HH:mm
  source: 'Facebook Page' | 'WhatsApp' | 'Marketplace' | 'Showroom' | 'Other';
  status: OrderStatus;
  
  // কুরিয়ার ট্র্যাকিং ও ডেলিভারি বিবরণ (Handed to Courier-এ এন্ট্রি)
  courierService?: string; // Steadfast, Pathao, RedX, Sundarban, etc.
  courierTrackingCode?: string;
  courierScheduledDate?: string; // YYYY-MM-DD
  courierScheduledTime?: string; // HH:mm

  // FIFO/LIFO হিসাব ও স্টক ট্র্যাকিং
  cogsTotal: number; // মোট ক্রয়মূল্য
  batchDeductions: BatchDeductionRecord[];
  notes?: string;
  createdAt: string;
}

export interface ExpenseItem {
  id: string;
  date: string; // YYYY-MM-DD
  category: 'Facebook Boosting' | 'প্যাকেজিং খরচ' | 'কারিগর মজুরি' | 'কুরিয়ার/যাতায়াত' | 'দোকান/অফিস ভাড়া' | 'অন্যান্য';
  description: string;
  amount: number;
  createdAt: string;
}

export interface BusinessSettings {
  businessNameEn: string;
  businessNameBn: string;
  tagline: string;
  phone: string;
  email: string;
  address: string;
  facebookPageUrl: string;
  invoiceFooterNote: string;
  defaultCourier: string;
  appPin: string;
  isPinEnabled: boolean;
  autoDriveBackup: boolean;
  lastBackupDate?: string;
}

export interface BackupPayload {
  version: string;
  exportedAt: string;
  settings: BusinessSettings;
  tasks: TaskItem[];
  inventory: InventoryItem[];
  orders: Order[];
  expenses: ExpenseItem[];
}
