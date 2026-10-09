import React, { useState, useEffect } from 'react';
import {
  DollarSign,
  Download,
  Upload,
  Save,
  Trash2,
  Plus,
  CheckCircle,
  AlertTriangle,
  Building2,
  Calendar,
  Layers,
  Sparkles,
  FileSpreadsheet,
  FolderOpen,
  HardDrive,
  CheckCircle2,
  Smartphone,
  Printer,
  FileText,
  FileDown
} from 'lucide-react';
import {
  BusinessSettings,
  ExpenseItem,
  Order,
  InventoryItem,
  TaskItem,
  BackupPayload,
} from '../types';
import {
  exportFullBackup,
  importFullBackup,
  saveSettings,
  saveExpenses,
} from '../services/storage';
import {
  savePayloadToComputer,
  openPayloadFromComputer,
} from '../services/fileStorageService';
import { ConfirmModal } from './ConfirmModal';
import { PWAInstallButton } from './PWAInstallButton';

interface ReportsAndBackupViewProps {
  settings: BusinessSettings;
  expenses: ExpenseItem[];
  orders: Order[];
  inventory: InventoryItem[];
  tasks: TaskItem[];
  onUpdateSettings: (settings: BusinessSettings) => void;
  onAddExpense: (expense: Omit<ExpenseItem, 'id' | 'createdAt'>) => void;
  onDeleteExpense: (expenseId: string) => void;
  onRestoreDatabase: (payload: BackupPayload) => void;
  onResetDatabase: () => void;
}

const EXPENSE_CATEGORIES = [
  'Facebook Boosting',
  'প্যাকেজিং খরচ',
  'কারিগর মজুরি',
  'কুরিয়ার/যাতায়াত',
  'দোকান/অফিস ভাড়া',
  'অন্যান্য',
] as const;

export const ReportsAndBackupView: React.FC<ReportsAndBackupViewProps> = ({
  settings,
  expenses,
  orders,
  inventory,
  tasks,
  onUpdateSettings,
  onAddExpense,
  onDeleteExpense,
  onRestoreDatabase,
  onResetDatabase,
}) => {
  // Settings Form State
  const [formSettings, setFormSettings] = useState<BusinessSettings>({ ...settings });
  const [settingsSavedMsg, setSettingsSavedMsg] = useState(false);

  // Sync settings when props change
  useEffect(() => {
    setFormSettings({ ...settings });
  }, [settings]);

  // Status Notification
  const [statusMsg, setStatusMsg] = useState<{ type: 'success' | 'error' | 'info'; text: string } | null>(null);

  // Expense Form State
  const [expenseDate, setExpenseDate] = useState(new Date().toISOString().split('T')[0]);
  const [expenseCategory, setExpenseCategory] = useState<typeof EXPENSE_CATEGORIES[number]>('Facebook Boosting');
  const [expenseDesc, setExpenseDesc] = useState('');
  const [expenseAmount, setExpenseAmount] = useState<number>(1000);
  const [isExpenseModalOpen, setIsExpenseModalOpen] = useState(false);
  const [deletingExpenseId, setDeletingExpenseId] = useState<string | null>(null);

  // Reset database confirm modal
  const [isResetConfirmOpen, setIsResetConfirmOpen] = useState(false);

  // Last saved timestamp
  const [lastSavedTime, setLastSavedTime] = useState<string | null>(() => {
    try {
      return localStorage.getItem('nl_last_file_saved_at') || null;
    } catch {
      return null;
    }
  });

  // Handle Save Business Settings
  const handleSaveSettings = (e: React.FormEvent) => {
    e.preventDefault();
    const updated = { ...formSettings };
    onUpdateSettings(updated);
    setSettingsSavedMsg(true);
    setTimeout(() => setSettingsSavedMsg(false), 3000);
  };

  // Handle Save to Computer Folder
  const handleSaveToComputerFolder = async () => {
    const payload: BackupPayload = {
      version: '2.0.0',
      exportedAt: new Date().toISOString(),
      settings: formSettings,
      tasks,
      inventory,
      orders,
      expenses,
    };

    const res = await savePayloadToComputer(payload);
    if (res.success) {
      const nowStr = new Date().toLocaleTimeString('bn-BD', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
      setLastSavedTime(nowStr);
      try {
        localStorage.setItem('nl_last_file_saved_at', nowStr);
      } catch {}

      setStatusMsg({
        type: 'success',
        text: `অভিনন্দন! আপনার কম্পিউটারের ফোল্ডারে "${res.filename}" ফাইল সফলভাবে সেভ করা হয়েছে (${res.method === 'picker' ? 'নির্বাচিত ফোল্ডারে' : 'ডাউনলোড ফোল্ডারে'})।`,
      });
      setTimeout(() => setStatusMsg(null), 6000);
    } else if (res.error && res.error !== 'ব্যবহারকারী সেভ বাতিল করেছেন।') {
      setStatusMsg({
        type: 'error',
        text: res.error,
      });
      setTimeout(() => setStatusMsg(null), 5000);
    }
  };

  // Handle Open Saved File from Computer
  const handleOpenFromComputer = async () => {
    const res = await openPayloadFromComputer();
    if (res.success && res.payload) {
      onRestoreDatabase(res.payload);
      setStatusMsg({
        type: 'success',
        text: `কম্পিউটারের ফাইল "${res.filename || 'ডেটা ফাইল'}" থেকে সফলভাবে সমস্ত তথ্য লোড করা হয়েছে! স্টক, অর্ডার ও হিসাব আপডেট হয়েছে।`,
      });
      setTimeout(() => setStatusMsg(null), 7000);
    } else if (res.error && res.error !== 'ফাইল ওপেন বাতিল করা হয়েছে।') {
      setStatusMsg({
        type: 'error',
        text: res.error,
      });
      setTimeout(() => setStatusMsg(null), 6000);
    }
  };

  // Direct JSON file upload handler
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const json = JSON.parse(event.target?.result as string);
        if (json.settings && json.inventory && json.orders) {
          onRestoreDatabase(json as BackupPayload);
          setStatusMsg({
            type: 'success',
            text: `ব্যাকআপ ফাইল "${file.name}" সফলভাবে রিস্টোর হয়েছে!`,
          });
          setTimeout(() => setStatusMsg(null), 6000);
        } else {
          setStatusMsg({
            type: 'error',
            text: 'অবৈধ ফাইল ফরম্যাট! সঠিক NakshaLata ব্যাকআপ ফাইল প্রদান করুন।',
          });
          setTimeout(() => setStatusMsg(null), 6000);
        }
      } catch (err) {
        setStatusMsg({
          type: 'error',
          text: 'ফাইলটি পড়তে সমস্যা হয়েছে। দয়া করে সঠিক JSON ফাইল সিলেক্ট করুন।',
        });
        setTimeout(() => setStatusMsg(null), 6000);
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  // Export CSV of Orders for Excel
  const handleExportOrdersCSV = () => {
    if (orders.length === 0) {
      setStatusMsg({ type: 'info', text: 'এক্সপোর্ট করার মতো কোনো অর্ডার পাওয়া যায়নি।' });
      setTimeout(() => setStatusMsg(null), 4000);
      return;
    }

    const headers = ['Order Number', 'Date', 'Customer Name', 'Phone', 'District', 'Items', 'Total Amount', 'Due Amount', 'Status', 'Courier', 'Tracking Code'];
    const rows = orders.map((o) => [
      `"${o.orderNumber}"`,
      `"${o.orderDate}"`,
      `"${o.customerName.replace(/"/g, '""')}"`,
      `"${o.customerPhone}"`,
      `"${o.district || ''}"`,
      `"${o.items.map((i) => `${i.itemNameBn} (${i.quantity})`).join(', ').replace(/"/g, '""')}"`,
      o.totalAmount,
      o.dueAmount,
      `"${o.status}"`,
      `"${o.courierService || ''}"`,
      `"${o.courierTrackingCode || ''}"`,
    ]);

    const csvContent = '\uFEFF' + [headers.join(','), ...rows.map((r) => r.join(','))].join('\r\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `nakshalata-orders-${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  // Export CSV of Inventory for Excel
  const handleExportInventoryCSV = () => {
    if (inventory.length === 0) {
      setStatusMsg({ type: 'info', text: 'এক্সপোর্ট করার মতো কোনো পণ্য পাওয়া যায়নি।' });
      setTimeout(() => setStatusMsg(null), 4000);
      return;
    }

    const headers = ['SKU', 'Product Name BN', 'Product Name EN', 'Category', 'Valuation Method', 'Selling Price', 'Total In Stock', 'Total Cost Value'];
    const rows = inventory.map((item) => {
      const remainingQty = item.batches.reduce((sum, b) => sum + b.remainingQty, 0);
      const totalCostValue = item.batches.reduce((sum, b) => sum + b.remainingQty * b.unitCostPrice, 0);
      return [
        `"${item.sku}"`,
        `"${item.nameBn.replace(/"/g, '""')}"`,
        `"${item.nameEn.replace(/"/g, '""')}"`,
        `"${item.category}"`,
        `"${item.valuationMethod}"`,
        item.defaultSellingPrice,
        remainingQty,
        totalCostValue,
      ];
    });

    const csvContent = '\uFEFF' + [headers.join(','), ...rows.map((r) => r.join(','))].join('\r\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `nakshalata-inventory-${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  // Handle Add Expense
  const handleExpenseSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!expenseAmount) return;

    onAddExpense({
      date: expenseDate,
      category: expenseCategory,
      description: expenseDesc.trim(),
      amount: Number(expenseAmount),
    });

    setExpenseDesc('');
    setExpenseAmount(1000);
    setIsExpenseModalOpen(false);
  };

  // Financial summary numbers
  const totalRevenue = orders
    .filter((o) => o.status !== 'Cancelled')
    .reduce((sum, o) => sum + (o.subtotal || 0), 0);

  const totalCogs = orders
    .filter((o) => o.status !== 'Cancelled')
    .reduce((sum, o) => sum + (o.cogsTotal || 0), 0);

  const totalExpenses = expenses.reduce((sum, e) => sum + e.amount, 0);
  const grossProfit = totalRevenue - totalCogs;
  const netBusinessProfit = grossProfit - totalExpenses;

  return (
    <div className="space-y-8">
      {/* Top Banner: Direct Computer Mode with 1-Click Save/Open */}
      <div className="bg-gradient-to-r from-emerald-950 via-teal-900 to-slate-900 rounded-3xl p-6 sm:p-8 text-white shadow-xl relative overflow-hidden">
        <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6 relative z-10">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <span className="px-3 py-1 rounded-full bg-emerald-400/20 text-emerald-300 border border-emerald-400/30 text-xs font-bold flex items-center gap-1.5">
                <HardDrive className="w-3.5 h-3.5 text-emerald-400" />
                কম্পিউটার ব্রাউজার ও লোকাল ফাইল সংস্করণ
              </span>
              <span className="text-xs text-slate-300 bg-white/10 px-2.5 py-0.5 rounded-full">
                কোনো লগইন বা ইন্টারনেটের প্রয়োজন নেই
              </span>
            </div>
            <h2 className="text-2xl sm:text-3xl font-black mt-2.5 tracking-tight">
              ব্যবসায়িক সেটিংস ও কম্পিউটার ফাইল হাব
            </h2>
            <p className="text-slate-300 text-xs sm:text-sm mt-1.5 max-w-2xl leading-relaxed">
              সরাসরি আপনার কম্পিউটারের যেকোনো ফোল্ডারে ডেটা ফাইল সেভ করে রাখুন এবং প্রয়োজনমতো ঐ ফাইল ওপেন করে সাথে সাথে সব কাজ শুরু করুন।
            </p>
          </div>

          {/* Primary 1-Click Computer Actions */}
          <div className="flex flex-wrap items-center gap-3 shrink-0">
            <button
              onClick={handleSaveToComputerFolder}
              className="flex items-center gap-2 px-5 py-3 rounded-2xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-sm shadow-lg shadow-emerald-500/25 transition-all cursor-pointer active:scale-95"
              title="কম্পিউটারের যেকোনো ফোল্ডার সিলেক্ট করে সম্পূর্ণ ডেটা সেভ করুন"
            >
              <HardDrive className="w-4 h-4 text-slate-950" />
              <span>কম্পিউটারের ফোল্ডারে সেভ</span>
            </button>

            <button
              onClick={handleOpenFromComputer}
              className="flex items-center gap-2 px-5 py-3 rounded-2xl bg-slate-800/90 hover:bg-slate-700 text-white font-bold text-sm border border-slate-600 shadow-md transition-all cursor-pointer active:scale-95"
              title="পূর্বে সেভ করা ডেটা ফাইল ওপেন করুন"
            >
              <FolderOpen className="w-4 h-4 text-emerald-400" />
              <span>ফাইল থেকে ওপেন</span>
            </button>
          </div>
        </div>

        {/* Live Net Profit strip */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-6 pt-6 border-t border-emerald-800/50">
          <div className="bg-white/10 rounded-xl p-3">
            <span className="text-[11px] text-slate-300 block">মোট পণ্য বিক্রয়</span>
            <span className="text-lg font-black text-white">৳{totalRevenue.toLocaleString()}</span>
          </div>
          <div className="bg-white/10 rounded-xl p-3">
            <span className="text-[11px] text-slate-300 block">ক্রয়মূল্য (COGS)</span>
            <span className="text-lg font-black text-white">৳{totalCogs.toLocaleString()}</span>
          </div>
          <div className="bg-white/10 rounded-xl p-3">
            <span className="text-[11px] text-rose-300 block">পরিচালন খরচ (Expenses)</span>
            <span className="text-lg font-black text-rose-300">৳{totalExpenses.toLocaleString()}</span>
          </div>
          <div className="bg-white/10 rounded-xl p-3">
            <span className="text-[11px] text-emerald-300 block">সর্বমোট নিট লাভ</span>
            <span className="text-lg font-black text-emerald-300">৳{netBusinessProfit.toLocaleString()}</span>
          </div>
        </div>
      </div>

      {/* Global Status Banner */}
      {statusMsg && (
        <div
          className={`p-4 rounded-2xl border font-bold text-sm flex items-center justify-between gap-3 shadow-xs transition-all ${
            statusMsg.type === 'success'
              ? 'bg-emerald-50 border-emerald-300 text-emerald-900'
              : statusMsg.type === 'error'
              ? 'bg-rose-50 border-rose-300 text-rose-900'
              : 'bg-blue-50 border-blue-300 text-blue-900'
          }`}
        >
          <div className="flex items-center gap-2.5">
            {statusMsg.type === 'success' && <CheckCircle className="w-5 h-5 text-emerald-600 shrink-0" />}
            {statusMsg.type === 'error' && <AlertTriangle className="w-5 h-5 text-rose-600 shrink-0" />}
            {statusMsg.type === 'info' && <CheckCircle2 className="w-5 h-5 text-blue-600 shrink-0" />}
            <span>{statusMsg.text}</span>
          </div>
          <button
            onClick={() => setStatusMsg(null)}
            className="text-xs opacity-60 hover:opacity-100 cursor-pointer px-2 py-1"
          >
            ✕
          </button>
        </div>
      )}

      {/* 2 COLUMN GRID: SETTINGS ON LEFT, FILE CONTROL & EXPENSES ON RIGHT */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* COLUMN 1: BUSINESS & INVOICE SETTINGS */}
        <div className="bg-white rounded-2xl p-6 sm:p-7 border border-slate-200 shadow-xs space-y-6">
          <div className="flex items-center justify-between pb-4 border-b border-slate-100">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-emerald-100 text-emerald-800 flex items-center justify-center">
                <Building2 className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-bold text-slate-900 text-base sm:text-lg">
                  প্রতিষ্ঠানের নাম ও ইনভয়েস সেটিংস
                </h3>
                <p className="text-xs text-slate-500">
                  ইনভয়েস, মেমো ও রশিদে এই নাম ও যোগাযোগের তথ্য প্রদর্শিত হবে
                </p>
              </div>
            </div>
          </div>

          <form onSubmit={handleSaveSettings} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  প্রতিষ্ঠানের নাম (বাংলা) <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  value={formSettings.businessNameBn}
                  onChange={(e) =>
                    setFormSettings({ ...formSettings, businessNameBn: e.target.value })
                  }
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 text-sm font-bold text-slate-900 focus:ring-2 focus:ring-emerald-500 outline-none"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  প্রতিষ্ঠানের নাম (English) <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  value={formSettings.businessNameEn}
                  onChange={(e) =>
                    setFormSettings({ ...formSettings, businessNameEn: e.target.value })
                  }
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 text-sm font-bold text-slate-900 focus:ring-2 focus:ring-emerald-500 outline-none"
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                স্লোগান / ট্যাগলাইন
              </label>
              <input
                type="text"
                value={formSettings.tagline}
                onChange={(e) => setFormSettings({ ...formSettings, tagline: e.target.value })}
                className="w-full px-3 py-2 rounded-xl border border-slate-300 text-sm outline-none"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  হটলাইন / মোবাইল নম্বর
                </label>
                <input
                  type="text"
                  value={formSettings.phone}
                  onChange={(e) => setFormSettings({ ...formSettings, phone: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 text-sm outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  ফেসবুক পেইজ লিংক
                </label>
                <input
                  type="text"
                  value={formSettings.facebookPageUrl}
                  onChange={(e) =>
                    setFormSettings({ ...formSettings, facebookPageUrl: e.target.value })
                  }
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 text-sm outline-none"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                প্রতিষ্ঠানের ঠিকানা
              </label>
              <input
                type="text"
                value={formSettings.address}
                onChange={(e) => setFormSettings({ ...formSettings, address: e.target.value })}
                className="w-full px-3 py-2 rounded-xl border border-slate-300 text-sm outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                ইনভয়েস ফুটার নোট ও শর্তাবলী
              </label>
              <textarea
                rows={2}
                value={formSettings.invoiceFooterNote}
                onChange={(e) =>
                  setFormSettings({ ...formSettings, invoiceFooterNote: e.target.value })
                }
                className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs outline-none"
              />
            </div>

            <div className="pt-2 flex items-center justify-between">
              {settingsSavedMsg && (
                <span className="text-xs font-bold text-emerald-700 flex items-center gap-1">
                  <CheckCircle className="w-4 h-4" /> প্রতিষ্ঠানের সেটিংস সফলভাবে সংরক্ষিত হয়েছে!
                </span>
              )}
              <div className="ml-auto">
                <button
                  type="submit"
                  className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-sm shadow-md shadow-emerald-200 transition-all cursor-pointer"
                >
                  <Save className="w-4 h-4" />
                  প্রতিষ্ঠানের তথ্য সংরক্ষণ
                </button>
              </div>
            </div>
          </form>
        </div>

        {/* COLUMN 2: LOCAL COMPUTER FILE STORAGE & EXPENSES */}
        <div className="space-y-6">
          {/* COMPUTER FILE STORAGE & BACKUP HUB */}
          <div className="bg-white rounded-2xl p-6 sm:p-7 border border-emerald-300 shadow-sm space-y-5">
            <div className="flex items-center justify-between pb-3 border-b border-emerald-100">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-xl bg-emerald-100 text-emerald-800 flex items-center justify-center">
                  <HardDrive className="w-5 h-5 text-emerald-700" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-900 text-base">কম্পিউটার লোকাল ফাইল ও ব্যাকআপ সিস্টেম</h3>
                  <p className="text-xs text-slate-500">আপনার তথ্য সম্পূর্ণ আপনার কম্পিউটারে সংরক্ষিত থাকে</p>
                </div>
              </div>
              <span className="text-[11px] font-bold text-emerald-800 bg-emerald-100 px-2.5 py-1 rounded-full border border-emerald-200">
                ১০০% অফলাইন
              </span>
            </div>

            {/* Auto-save status card */}
            <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse shrink-0"></span>
                <div>
                  <span className="text-xs font-bold text-slate-900 block">ব্রাউজারে অটো-সেভ সক্রিয় রয়েছে</span>
                  <span className="text-[11px] text-slate-500">
                    পেজ রিলোড বা বন্ধ করলেও বর্তমান ব্রাউজারে তথ্য অক্ষুণ্ন থাকবে
                  </span>
                </div>
              </div>
              {lastSavedTime && (
                <span className="text-[10px] text-slate-500 font-medium bg-white px-2 py-1 rounded border border-slate-200 shrink-0">
                  সর্বশেষ ফাইলে সেভ: {lastSavedTime}
                </span>
              )}
            </div>

            {/* Core File Operations: Save & Open */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 pt-1">
              <div className="p-4 rounded-xl border-2 border-emerald-500/40 bg-emerald-50/50 flex flex-col justify-between space-y-3">
                <div>
                  <div className="flex items-center gap-2 font-bold text-emerald-950 text-sm">
                    <Save className="w-4 h-4 text-emerald-700" />
                    <span>ফোল্ডারে সেভ করুন</span>
                  </div>
                  <p className="text-[11px] text-emerald-900/80 mt-1 leading-relaxed">
                    কম্পিউটারের যেকোনো ফোল্ডার (Desktop, Documents, পেনড্রাইভ) নির্বাচন করে নিরাপদ ফাইল হিসেবে রাখুন।
                  </p>
                </div>
                <button
                  type="button"
                  onClick={handleSaveToComputerFolder}
                  className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-md shadow-emerald-500/20 transition-all cursor-pointer active:scale-98"
                >
                  <Save className="w-4 h-4" />
                  <span>কম্পিউটারে সেভ করুন</span>
                </button>
              </div>

              <div className="p-4 rounded-xl border-2 border-teal-500/40 bg-teal-50/50 flex flex-col justify-between space-y-3">
                <div>
                  <div className="flex items-center gap-2 font-bold text-teal-950 text-sm">
                    <FolderOpen className="w-4 h-4 text-teal-700" />
                    <span>ফাইল ওপেন করুন</span>
                  </div>
                  <p className="text-[11px] text-teal-900/80 mt-1 leading-relaxed">
                    পূর্বে সেভ করা যেকোনো .json ফাইল ওপেন করে এক ক্লিকে সব স্টক ও হিসাব ফিরিয়ে আনুন।
                  </p>
                </div>
                <button
                  type="button"
                  onClick={handleOpenFromComputer}
                  className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-teal-700 hover:bg-teal-800 text-white text-xs font-bold shadow-md shadow-teal-700/20 transition-all cursor-pointer active:scale-98"
                >
                  <FolderOpen className="w-4 h-4" />
                  <span>সংরক্ষিত ফাইল ওপেন করুন</span>
                </button>
              </div>
            </div>

            {/* Quick Export / Import Options */}
            <div className="pt-2 border-t border-slate-100 space-y-2">
              <span className="text-xs font-bold text-slate-700 block">অন্যান্য ফাইল ও এক্সপোর্ট অপশন:</span>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                <button
                  type="button"
                  onClick={handleExportOrdersCSV}
                  className="flex items-center justify-center gap-1.5 p-2 rounded-xl bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-700 text-[11px] font-bold transition-all cursor-pointer"
                  title="মাইক্রোসফট এক্সেলে খোলার জন্য অর্ডার সিএসভি ডাউনলোড"
                >
                  <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600" />
                  <span>অর্ডার Excel CSV</span>
                </button>

                <button
                  type="button"
                  onClick={handleExportInventoryCSV}
                  className="flex items-center justify-center gap-1.5 p-2 rounded-xl bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-700 text-[11px] font-bold transition-all cursor-pointer"
                  title="মাইক্রোসফট এক্সেলে খোলার জন্য স্টক লেজার সিএসভি ডাউনলোড"
                >
                  <FileSpreadsheet className="w-3.5 h-3.5 text-teal-600" />
                  <span>স্টক Excel CSV</span>
                </button>

                <label className="flex items-center justify-center gap-1.5 p-2 rounded-xl bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-700 text-[11px] font-bold transition-all cursor-pointer col-span-2 sm:col-span-1">
                  <Upload className="w-3.5 h-3.5 text-slate-600" />
                  <span>ফাইল আপলোড</span>
                  <input
                    type="file"
                    accept=".json,application/json"
                    onChange={handleFileUpload}
                    className="hidden"
                  />
                </label>
              </div>
            </div>

            {/* Database Reset Option */}
            <div className="pt-2 border-t border-slate-100 flex items-center justify-between">
              <span className="text-xs text-slate-500">প্রয়োজনে প্রাথমিক ডেমো ডাটাতে ফিরিয়ে নেওয়া:</span>
              <button
                type="button"
                onClick={() => setIsResetConfirmOpen(true)}
                className="text-xs text-rose-600 hover:text-rose-800 font-bold underline cursor-pointer"
              >
                ডাটাবেস রিসেট
              </button>
            </div>
          </div>

          {/* Expenses Card */}
          <div className="bg-white rounded-2xl p-6 sm:p-7 border border-slate-200 shadow-xs space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <DollarSign className="w-5 h-5 text-rose-600" />
                <div>
                  <h3 className="font-bold text-slate-900 text-base">অন্যান্য খরচ খাতা (Expense Book)</h3>
                  <p className="text-xs text-slate-500">ফেসবুক বুস্টিং, কারিগর মজুরি, প্যাকেজিং ইত্যাদি</p>
                </div>
              </div>

              <button
                onClick={() => setIsExpenseModalOpen(true)}
                className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-rose-50 text-rose-700 hover:bg-rose-100 text-xs font-bold border border-rose-200 transition-colors cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" /> খরচ যোগ করুন
              </button>
            </div>

            {/* Expenses List */}
            <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
              {expenses.length === 0 ? (
                <p className="text-xs text-slate-400 text-center py-4">কোন খরচ লিপিবদ্ধ নেই।</p>
              ) : (
                expenses.map((exp) => (
                  <div
                    key={exp.id}
                    className="p-2.5 rounded-xl bg-slate-50 border border-slate-100 flex items-center justify-between gap-3 text-xs"
                  >
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-slate-800">{exp.category}</span>
                        <span className="text-[10px] text-slate-400">{exp.date}</span>
                      </div>
                      <p className="text-[11px] text-slate-500 mt-0.5">{exp.description}</p>
                    </div>

                    <div className="flex items-center gap-3 shrink-0">
                      <span className="font-bold text-rose-700">৳{exp.amount.toLocaleString()}</span>
                      <button
                        onClick={() => setDeletingExpenseId(exp.id)}
                        className="text-slate-400 hover:text-rose-600 p-1 rounded cursor-pointer"
                        title="মুছে ফেলুন"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Desktop & Android Native PWA App Card */}
          <div className="bg-gradient-to-br from-slate-900 to-emerald-950 text-white rounded-2xl p-6 border border-emerald-800/40 shadow-xs space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 flex items-center justify-center">
                <Smartphone className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-bold text-white text-base">কম্পিউটার ও মোবাইল অ্যাপ হিসেবে ব্যবহার</h3>
                <p className="text-xs text-slate-300">ডেস্কটপ ও অ্যান্ডয়েডে ইন্টারনেট ছাড়াই ফুল স্ক্রিনে চলবে</p>
              </div>
            </div>
            <p className="text-xs text-slate-300 leading-relaxed">
              এই অ্যাপ্লিকেশনটি সরাসরি আপনার ব্রাউজারে ডাবল ক্লিক করে অথবা হোম স্ক্রিনে বা ডেস্কটপে ইনস্টল করে সফটওয়্যার হিসেবে ব্যবহার করতে পারবেন।
            </p>
            <PWAInstallButton variant="hero" className="w-full" />
          </div>
        </div>
      </div>

      {/* Add Expense Modal */}
      {isExpenseModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-100">
            <h3 className="font-bold text-slate-900 text-lg pb-3 border-b border-slate-100">
              নতুন খরচ যুক্ত করুন
            </h3>
            <form onSubmit={handleExpenseSubmit} className="mt-4 space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">তারিখ</label>
                <input
                  type="date"
                  value={expenseDate}
                  onChange={(e) => setExpenseDate(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 text-sm outline-none"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">ক্যাটাগরি</label>
                <select
                  value={expenseCategory}
                  onChange={(e) =>
                    setExpenseCategory(e.target.value as typeof EXPENSE_CATEGORIES[number])
                  }
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 text-sm outline-none bg-white"
                >
                  {EXPENSE_CATEGORIES.map((cat) => (
                    <option key={cat} value={cat}>
                      {cat}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  বিবরণ / নোট
                </label>
                <input
                  type="text"
                  value={expenseDesc}
                  onChange={(e) => setExpenseDesc(e.target.value)}
                  placeholder="যেমন: নতুন ৩০০টি পেপার ব্যাগ তৈরি"
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 text-sm outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  টাকার পরিমাণ (৳) <span className="text-rose-500">*</span>
                </label>
                <input
                  type="number"
                  min="0"
                  value={expenseAmount || ''}
                  onChange={(e) => setExpenseAmount(Number(e.target.value))}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 text-sm font-bold text-slate-900 outline-none"
                  required
                />
              </div>

              <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsExpenseModalOpen(false)}
                  className="px-4 py-2 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-100 text-xs font-semibold cursor-pointer"
                >
                  বাতিল
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold shadow-xs cursor-pointer"
                >
                  খরচ যোগ করুন
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Expense Confirm */}
      <ConfirmModal
        isOpen={!!deletingExpenseId}
        title="খরচটি মুছে ফেলতে চান?"
        message="এই খরচটি ক্যাশ বুক ও হিসাব থেকে মুছে যাবে।"
        confirmText="মুছে ফেলুন"
        cancelText="বাতিল"
        onConfirm={() => {
          if (deletingExpenseId) {
            onDeleteExpense(deletingExpenseId);
            setDeletingExpenseId(null);
          }
        }}
        onCancel={() => setDeletingExpenseId(null)}
      />

      {/* Clear/Reset Database Confirm */}
      <ConfirmModal
        isOpen={isResetConfirmOpen}
        title="সমস্ত তথ্য রিসেট করতে চান?"
        message="এটি বর্তমান সমস্ত অর্ডার, স্টক এবং খরচ মুছে প্রাথমিক ডেমো অবস্থায় ফিরিয়ে আনবে। আপনি কি নিশ্চিত?"
        confirmText="হ্যাঁ, রিসেট করুন"
        cancelText="বাতিল"
        isDestructive={true}
        onConfirm={() => {
          onResetDatabase();
          setIsResetConfirmOpen(false);
          setStatusMsg({
            type: 'info',
            text: 'ডাটাবেস সফলভাবে প্রাথমিক অবস্থায় রিসেট করা হয়েছে।',
          });
          setTimeout(() => setStatusMsg(null), 4000);
        }}
        onCancel={() => setIsResetConfirmOpen(false)}
      />
    </div>
  );
};
