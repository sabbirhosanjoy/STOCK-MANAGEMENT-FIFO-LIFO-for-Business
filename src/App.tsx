/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import {
  CheckSquare,
  Boxes,
  ShoppingCart,
  FileSpreadsheet,
  Settings,
  Bell,
  HardDrive,
  FolderOpen,
  Save,
  Menu,
  X,
  CheckCircle,
  AlertCircle
} from 'lucide-react';

import {
  BusinessSettings,
  TaskItem,
  InventoryItem,
  InventoryBatch,
  Order,
  OrderStatus,
  ExpenseItem,
  BackupPayload,
} from './types';

import {
  loadSettings,
  saveSettings,
  loadTasks,
  saveTasks,
  loadInventory,
  saveInventory,
  loadOrders,
  saveOrders,
  loadExpenses,
  saveExpenses,
  INITIAL_TASKS,
  INITIAL_INVENTORY,
  INITIAL_ORDERS,
  INITIAL_EXPENSES,
  DEFAULT_SETTINGS,
} from './services/storage';

import {
  savePayloadToComputer,
  openPayloadFromComputer,
} from './services/fileStorageService';

import { playNotificationChime } from './services/chime';
import { TasksView } from './components/TasksView';
import { InventoryView } from './components/InventoryView';
import { OrdersView } from './components/OrdersView';
import { ReportCenterView } from './components/ReportCenterView';
import { ReportsAndBackupView } from './components/ReportsAndBackupView';
import { ReminderBanner } from './components/ReminderBanner';
import { PWAInstallButton } from './components/PWAInstallButton';

type ActiveTab = 'tasks' | 'inventory' | 'orders' | 'reports' | 'settings';

export default function App() {
  // Persistent Local States (Directly available without login)
  const [settings, setSettings] = useState<BusinessSettings>(() => loadSettings());
  const [tasks, setTasks] = useState<TaskItem[]>(() => loadTasks());
  const [inventory, setInventory] = useState<InventoryItem[]>(() => loadInventory());
  const [orders, setOrders] = useState<Order[]>(() => loadOrders());
  const [expenses, setExpenses] = useState<ExpenseItem[]>(() => loadExpenses());

  // Navigation
  const [activeTab, setActiveTab] = useState<ActiveTab>('tasks');
  const [mobileMenuOpen, setMobileMenuOpen] = useState<boolean>(false);

  // Reminder Alarm State
  const [activeReminder, setActiveReminder] = useState<TaskItem | null>(null);
  const [triggeredTaskIds, setTriggeredTaskIds] = useState<Set<string>>(new Set());

  // Global Quick Action Notification Toast
  const [toastMsg, setToastMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Auto-Save to LocalStorage on state changes for seamless offline persistence
  useEffect(() => {
    saveSettings(settings);
  }, [settings]);

  useEffect(() => {
    saveTasks(tasks);
  }, [tasks]);

  useEffect(() => {
    saveInventory(inventory);
  }, [inventory]);

  useEffect(() => {
    saveOrders(orders);
  }, [orders]);

  useEffect(() => {
    saveExpenses(expenses);
  }, [expenses]);

  const showToast = (text: string, type: 'success' | 'error' = 'success') => {
    setToastMsg({ type, text });
    setTimeout(() => {
      setToastMsg((cur) => (cur?.text === text ? null : cur));
    }, 4500);
  };

  // Quick Action: Save to Computer Folder
  const handleQuickSaveToComputer = async () => {
    const payload: BackupPayload = {
      version: '2.0.0',
      exportedAt: new Date().toISOString(),
      settings,
      tasks,
      inventory,
      orders,
      expenses,
    };

    const res = await savePayloadToComputer(payload);
    if (res.success) {
      const nowStr = new Date().toLocaleTimeString('bn-BD', { hour: '2-digit', minute: '2-digit' });
      try {
        localStorage.setItem('nl_last_file_saved_at', nowStr);
      } catch {}
      showToast(`আপনার কম্পিউটারের ফোল্ডারে "${res.filename}" ফাইলটি সেভ করা হয়েছে!`, 'success');
    } else if (res.error && res.error !== 'ব্যবহারকারী সেভ বাতিল করেছেন।') {
      showToast(res.error, 'error');
    }
  };

  // Quick Action: Open Saved File from Computer
  const handleQuickOpenFile = async () => {
    const res = await openPayloadFromComputer();
    if (res.success && res.payload) {
      handleRestoreDatabase(res.payload);
      showToast(`কম্পিউটারের ফাইল "${res.filename || 'ডেটা ফাইল'}" সফলভাবে ওপেন করা হয়েছে!`, 'success');
    } else if (res.error && res.error !== 'ফাইল ওপেন বাতিল করা হয়েছে।') {
      showToast(res.error, 'error');
    }
  };

  const handleUpdateSettings = (newSettings: BusinessSettings) => {
    setSettings(newSettings);
    saveSettings(newSettings);
  };

  // Reminder Checker (Runs every 8 seconds)
  useEffect(() => {
    const checkReminders = () => {
      const now = new Date();
      const todayDateStr = now.toISOString().split('T')[0];
      const currentHours = now.getHours().toString().padStart(2, '0');
      const currentMinutes = now.getMinutes().toString().padStart(2, '0');
      const currentTimeStr = `${currentHours}:${currentMinutes}`;
      const nowTimestamp = now.getTime();

      for (const task of tasks) {
        if (task.completed) continue;

        // Check if snoozed time has arrived
        if (task.snoozedUntil && task.snoozedUntil <= nowTimestamp) {
          triggerTaskAlarm(task);
          break;
        }

        // Check regular time match
        if (task.date === todayDateStr && task.time === currentTimeStr) {
          if (!triggeredTaskIds.has(task.id)) {
            triggerTaskAlarm(task);
            setTriggeredTaskIds((prev) => new Set(prev).add(task.id));
            break;
          }
        }
      }
    };

    const interval = setInterval(checkReminders, 8000);
    return () => clearInterval(interval);
  }, [tasks, triggeredTaskIds]);

  const triggerTaskAlarm = (task: TaskItem) => {
    setActiveReminder(task);
    playNotificationChime();
  };

  const handleCompleteReminder = (taskId: string) => {
    setTasks((prev) =>
      prev.map((t) => (t.id === taskId ? { ...t, completed: true, snoozedUntil: undefined } : t))
    );
    setActiveReminder(null);
  };

  const handleSnoozeReminder = (taskId: string) => {
    const tenMinutesLater = Date.now() + 10 * 60 * 1000;
    setTasks((prev) =>
      prev.map((t) => (t.id === taskId ? { ...t, snoozedUntil: tenMinutesLater } : t))
    );
    setActiveReminder(null);
  };

  // Task Operations
  const handleAddTask = (newTask: Omit<TaskItem, 'id' | 'createdAt'>) => {
    const task: TaskItem = {
      ...newTask,
      id: `task-${Date.now()}`,
      createdAt: new Date().toISOString(),
    };
    setTasks((prev) => [task, ...prev]);
  };

  const handleUpdateTask = (updatedTask: TaskItem) => {
    setTasks((prev) => prev.map((t) => (t.id === updatedTask.id ? updatedTask : t)));
  };

  const handleDeleteTask = (taskId: string) => {
    setTasks((prev) => prev.filter((t) => t.id !== taskId));
    if (activeReminder?.id === taskId) {
      setActiveReminder(null);
    }
  };

  const handleToggleTaskComplete = (taskId: string) => {
    setTasks((prev) =>
      prev.map((t) =>
        t.id === taskId ? { ...t, completed: !t.completed, snoozedUntil: undefined } : t
      )
    );
  };

  // Inventory Operations
  const handleAddInventoryItem = (newItem: Omit<InventoryItem, 'id' | 'createdAt'>) => {
    const item: InventoryItem = {
      ...newItem,
      id: `item-${Date.now()}`,
      createdAt: new Date().toISOString(),
    };
    setInventory((prev) => [item, ...prev]);
  };

  const handleUpdateInventoryItem = (updatedItem: InventoryItem) => {
    setInventory((prev) => prev.map((i) => (i.id === updatedItem.id ? updatedItem : i)));
  };

  const handleDeleteInventoryItem = (itemId: string) => {
    setInventory((prev) => prev.filter((i) => i.id !== itemId));
  };

  const handleAddBatch = (itemId: string, newBatch: Omit<InventoryBatch, 'batchId'>) => {
    const batch: InventoryBatch = {
      ...newBatch,
      batchId: `batch-${Date.now()}`,
    };
    setInventory((prev) =>
      prev.map((item) =>
        item.id === itemId ? { ...item, batches: [...item.batches, batch] } : item
      )
    );
  };

  const handleDeleteBatch = (itemId: string, batchId: string) => {
    setInventory((prev) =>
      prev.map((item) =>
        item.id === itemId
          ? { ...item, batches: item.batches.filter((b) => b.batchId !== batchId) }
          : item
      )
    );
  };

  // Order Operations
  const handleAddOrder = (newOrder: Order, updatedInventory: InventoryItem[]) => {
    setOrders((prev) => [newOrder, ...prev]);
    setInventory(updatedInventory);
  };

  const handleUpdateOrderStatus = (
    orderId: string,
    newStatus: OrderStatus,
    updatedInventory?: InventoryItem[]
  ) => {
    setOrders((prev) =>
      prev.map((o) => (o.id === orderId ? { ...o, status: newStatus } : o))
    );
    if (updatedInventory) {
      setInventory(updatedInventory);
    }
  };

  const handleUpdateCourierDetails = (
    orderId: string,
    courierService: string,
    trackingCode: string,
    scheduledDate: string,
    scheduledTime: string
  ) => {
    setOrders((prev) =>
      prev.map((o) =>
        o.id === orderId
          ? {
              ...o,
              courierService,
              courierTrackingCode: trackingCode,
              courierScheduledDate: scheduledDate,
              courierScheduledTime: scheduledTime,
            }
          : o
      )
    );
  };

  const handleDeleteOrder = (orderId: string, updatedInventory?: InventoryItem[]) => {
    setOrders((prev) => prev.filter((o) => o.id !== orderId));
    if (updatedInventory) {
      setInventory(updatedInventory);
    }
  };

  // Expense Operations
  const handleAddExpense = (expenseData: Omit<ExpenseItem, 'id' | 'createdAt'>) => {
    const newExp: ExpenseItem = {
      ...expenseData,
      id: `exp-${Date.now()}`,
      createdAt: new Date().toISOString(),
    };
    setExpenses((prev) => [newExp, ...prev]);
  };

  const handleDeleteExpense = (expenseId: string) => {
    setExpenses((prev) => prev.filter((e) => e.id !== expenseId));
  };

  // Database Backup Restore & Reset
  const handleRestoreDatabase = (payload: BackupPayload) => {
    if (payload.settings) setSettings(payload.settings);
    if (payload.tasks) setTasks(payload.tasks);
    if (payload.inventory) setInventory(payload.inventory);
    if (payload.orders) setOrders(payload.orders);
    if (payload.expenses) setExpenses(payload.expenses);

    saveSettings(payload.settings);
    saveTasks(payload.tasks || []);
    saveInventory(payload.inventory);
    saveOrders(payload.orders);
    saveExpenses(payload.expenses || []);
  };

  const handleResetDatabase = () => {
    setSettings(DEFAULT_SETTINGS);
    setTasks(INITIAL_TASKS);
    setInventory(INITIAL_INVENTORY);
    setOrders(INITIAL_ORDERS);
    setExpenses(INITIAL_EXPENSES);

    saveSettings(DEFAULT_SETTINGS);
    saveTasks(INITIAL_TASKS);
    saveInventory(INITIAL_INVENTORY);
    saveOrders(INITIAL_ORDERS);
    saveExpenses(INITIAL_EXPENSES);
  };

  // Calculate uncompleted tasks count for badge
  const pendingTasksCount = tasks.filter(
    (t) => !t.completed && t.date === new Date().toISOString().split('T')[0]
  ).length;

  return (
    <div className="min-h-screen bg-slate-100 flex flex-col text-slate-800">
      {/* Active To-Do Reminder Alert Banner */}
      <ReminderBanner
        activeReminder={activeReminder}
        onComplete={handleCompleteReminder}
        onSnooze={handleSnoozeReminder}
        onDismiss={() => setActiveReminder(null)}
      />

      {/* Floating Notification Toast */}
      {toastMsg && (
        <div className="fixed bottom-5 right-5 z-50 animate-bounce">
          <div
            className={`px-4 py-3 rounded-2xl shadow-xl flex items-center gap-2.5 text-xs font-bold border ${
              toastMsg.type === 'success'
                ? 'bg-emerald-950 text-white border-emerald-500'
                : 'bg-rose-950 text-white border-rose-500'
            }`}
          >
            {toastMsg.type === 'success' ? (
              <CheckCircle className="w-4 h-4 text-emerald-400 shrink-0" />
            ) : (
              <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
            )}
            <span>{toastMsg.text}</span>
          </div>
        </div>
      )}

      {/* Top Application Navbar */}
      <header className="bg-slate-900 text-white sticky top-0 z-40 shadow-lg no-print">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 flex items-center justify-between h-16">
          {/* Brand Logo & Name */}
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-emerald-600 to-teal-400 flex items-center justify-center font-black text-white text-lg shadow-md shadow-emerald-500/20 shrink-0">
              ন
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-extrabold text-base sm:text-lg tracking-tight text-white leading-none">
                  {settings.businessNameBn}
                </span>
                <span className="text-[10px] text-emerald-400 uppercase tracking-widest font-bold hidden sm:inline-block">
                  {settings.businessNameEn}
                </span>
              </div>
              <span className="text-[11px] text-slate-400 hidden sm:block">
                ডেস্কটপ ও ব্রাউজার সংস্করণ (লগইন মুক্ত)
              </span>
            </div>
          </div>

          {/* Desktop Navigation Links */}
          <nav className="hidden md:flex items-center gap-1">
            <button
              onClick={() => setActiveTab('tasks')}
              className={`px-3 py-2 rounded-xl text-xs sm:text-sm font-bold flex items-center gap-2 transition-all cursor-pointer ${
                activeTab === 'tasks'
                  ? 'bg-emerald-600 text-white shadow-xs'
                  : 'text-slate-300 hover:text-white hover:bg-slate-800'
              }`}
            >
              <CheckSquare className="w-4 h-4" />
              <span>কাজের তালিকা</span>
              {pendingTasksCount > 0 && (
                <span className="px-1.5 py-0.2 rounded-full bg-amber-400 text-slate-950 text-[10px] font-black">
                  {pendingTasksCount}
                </span>
              )}
            </button>

            <button
              onClick={() => setActiveTab('inventory')}
              className={`px-3 py-2 rounded-xl text-xs sm:text-sm font-bold flex items-center gap-2 transition-all cursor-pointer ${
                activeTab === 'inventory'
                  ? 'bg-emerald-600 text-white shadow-xs'
                  : 'text-slate-300 hover:text-white hover:bg-slate-800'
              }`}
            >
              <Boxes className="w-4 h-4" />
              <span>স্টক ও লেজার</span>
            </button>

            <button
              onClick={() => setActiveTab('orders')}
              className={`px-3 py-2 rounded-xl text-xs sm:text-sm font-bold flex items-center gap-2 transition-all cursor-pointer ${
                activeTab === 'orders'
                  ? 'bg-emerald-600 text-white shadow-xs'
                  : 'text-slate-300 hover:text-white hover:bg-slate-800'
              }`}
            >
              <ShoppingCart className="w-4 h-4" />
              <span>অর্ডার ও ডেলিভারি</span>
            </button>

            <button
              onClick={() => setActiveTab('reports')}
              className={`px-3 py-2 rounded-xl text-xs sm:text-sm font-bold flex items-center gap-2 transition-all cursor-pointer ${
                activeTab === 'reports'
                  ? 'bg-emerald-600 text-white shadow-xs'
                  : 'text-slate-300 hover:text-white hover:bg-slate-800'
              }`}
            >
              <FileSpreadsheet className="w-4 h-4" />
              <span>রিপোর্ট জেনারেশন</span>
            </button>

            <button
              onClick={() => setActiveTab('settings')}
              className={`px-3 py-2 rounded-xl text-xs sm:text-sm font-bold flex items-center gap-2 transition-all cursor-pointer ${
                activeTab === 'settings'
                  ? 'bg-emerald-600 text-white shadow-xs'
                  : 'text-slate-300 hover:text-white hover:bg-slate-800'
              }`}
            >
              <Settings className="w-4 h-4" />
              <span>সেটিংস ও ফাইল</span>
            </button>
          </nav>

          {/* Direct Computer Actions: Save & Open */}
          <div className="flex items-center gap-2">
            {/* Quick Save to Computer */}
            <button
              onClick={handleQuickSaveToComputer}
              className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition-all shadow-sm cursor-pointer active:scale-95"
              title="কম্পিউটারের ফোল্ডারে সম্পূর্ণ তথ্য সেভ করুন"
            >
              <Save className="w-3.5 h-3.5" />
              <span>সেভ করুন</span>
            </button>

            {/* Quick Open File from Computer */}
            <button
              onClick={handleQuickOpenFile}
              className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-emerald-300 border border-slate-700 text-xs font-bold transition-all cursor-pointer active:scale-95"
              title="কম্পিউটার থেকে পূর্বে সেভ করা ফাইল খুলুন"
            >
              <FolderOpen className="w-3.5 h-3.5 text-emerald-400" />
              <span>ফাইল খুলুন</span>
            </button>

            {/* Android / Desktop Install */}
            <PWAInstallButton />

            {/* Mobile Hamburger Toggle */}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="p-2 rounded-xl text-slate-300 hover:text-white md:hidden cursor-pointer"
            >
              {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>
        </div>

        {/* Mobile Dropdown Navigation */}
        {mobileMenuOpen && (
          <div className="md:hidden bg-slate-950 px-4 py-3 border-t border-slate-800 space-y-1">
            <button
              onClick={() => {
                setActiveTab('tasks');
                setMobileMenuOpen(false);
              }}
              className={`w-full text-left px-3 py-2 rounded-xl text-xs font-bold flex items-center justify-between ${
                activeTab === 'tasks' ? 'bg-emerald-600 text-white' : 'text-slate-300'
              }`}
            >
              <span className="flex items-center gap-2">
                <CheckSquare className="w-4 h-4" /> কাজের তালিকা
              </span>
              {pendingTasksCount > 0 && (
                <span className="px-1.5 py-0.2 rounded-full bg-amber-400 text-slate-950 text-[10px] font-black">
                  {pendingTasksCount}
                </span>
              )}
            </button>

            <button
              onClick={() => {
                setActiveTab('inventory');
                setMobileMenuOpen(false);
              }}
              className={`w-full text-left px-3 py-2 rounded-xl text-xs font-bold flex items-center gap-2 ${
                activeTab === 'inventory' ? 'bg-emerald-600 text-white' : 'text-slate-300'
              }`}
            >
              <Boxes className="w-4 h-4" /> স্টক ও লেজার (FIFO/LIFO)
            </button>

            <button
              onClick={() => {
                setActiveTab('orders');
                setMobileMenuOpen(false);
              }}
              className={`w-full text-left px-3 py-2 rounded-xl text-xs font-bold flex items-center gap-2 ${
                activeTab === 'orders' ? 'bg-emerald-600 text-white' : 'text-slate-300'
              }`}
            >
              <ShoppingCart className="w-4 h-4" /> অর্ডার ও কুরিয়ার ডেলিভারি
            </button>

            <button
              onClick={() => {
                setActiveTab('reports');
                setMobileMenuOpen(false);
              }}
              className={`w-full text-left px-3 py-2 rounded-xl text-xs font-bold flex items-center gap-2 ${
                activeTab === 'reports' ? 'bg-emerald-600 text-white' : 'text-slate-300'
              }`}
            >
              <FileSpreadsheet className="w-4 h-4" /> রিপোর্ট জেনারেশন
            </button>

            <button
              onClick={() => {
                setActiveTab('settings');
                setMobileMenuOpen(false);
              }}
              className={`w-full text-left px-3 py-2 rounded-xl text-xs font-bold flex items-center gap-2 ${
                activeTab === 'settings' ? 'bg-emerald-600 text-white' : 'text-slate-300'
              }`}
            >
              <Settings className="w-4 h-4" /> সেটিংস ও ফাইল সেভ
            </button>

            {/* Mobile Save & Open Buttons */}
            <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-800">
              <button
                onClick={() => {
                  setMobileMenuOpen(false);
                  handleQuickSaveToComputer();
                }}
                className="flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl bg-emerald-600 text-white text-xs font-bold"
              >
                <Save className="w-3.5 h-3.5" />
                <span>কম্পিউটারে সেভ</span>
              </button>

              <button
                onClick={() => {
                  setMobileMenuOpen(false);
                  handleQuickOpenFile();
                }}
                className="flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl bg-slate-800 border border-slate-700 text-emerald-300 text-xs font-bold"
              >
                <FolderOpen className="w-3.5 h-3.5" />
                <span>ফাইল খুলুন</span>
              </button>
            </div>

            <div className="pt-2 flex justify-center">
              <PWAInstallButton variant="hero" className="w-full" />
            </div>
          </div>
        )}
      </header>

      {/* Main Content View Switcher */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 lg:p-8">
        {activeTab === 'tasks' && (
          <TasksView
            tasks={tasks}
            onAddTask={handleAddTask}
            onUpdateTask={handleUpdateTask}
            onDeleteTask={handleDeleteTask}
            onToggleComplete={handleToggleTaskComplete}
            onTestReminder={triggerTaskAlarm}
          />
        )}

        {activeTab === 'inventory' && (
          <InventoryView
            inventory={inventory}
            onAddItem={handleAddInventoryItem}
            onUpdateItem={handleUpdateInventoryItem}
            onDeleteItem={handleDeleteInventoryItem}
            onAddBatch={handleAddBatch}
            onDeleteBatch={handleDeleteBatch}
          />
        )}

        {activeTab === 'orders' && (
          <OrdersView
            orders={orders}
            inventory={inventory}
            settings={settings}
            onAddOrder={handleAddOrder}
            onUpdateOrderStatus={handleUpdateOrderStatus}
            onUpdateCourierDetails={handleUpdateCourierDetails}
            onDeleteOrder={handleDeleteOrder}
          />
        )}

        {activeTab === 'reports' && (
          <ReportCenterView
            orders={orders}
            inventory={inventory}
            expenses={expenses}
            settings={settings}
          />
        )}

        {activeTab === 'settings' && (
          <ReportsAndBackupView
            settings={settings}
            expenses={expenses}
            orders={orders}
            inventory={inventory}
            tasks={tasks}
            onUpdateSettings={handleUpdateSettings}
            onAddExpense={handleAddExpense}
            onDeleteExpense={handleDeleteExpense}
            onRestoreDatabase={handleRestoreDatabase}
            onResetDatabase={handleResetDatabase}
          />
        )}
      </main>

      {/* App Footer */}
      <footer className="bg-slate-900 text-slate-400 text-xs py-4 px-6 border-t border-slate-800 text-center no-print">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-2">
          <p>
            © ২০২৬ {settings.businessNameBn} ({settings.businessNameEn}) • সরাসরি ব্রাউজার ও অফলাইন সংস্করণ
          </p>
          <div className="flex items-center gap-4">
            <span className="text-emerald-400 font-medium">কোনো লগইন ছাড়াই নিরাপদ কম্পিউটার ফাইল স্টোরেজ</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
