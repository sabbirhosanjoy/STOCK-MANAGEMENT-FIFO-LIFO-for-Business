import React, { useState } from 'react';
import {
  Boxes,
  Plus,
  Package,
  Layers,
  Calendar,
  AlertTriangle,
  ChevronDown,
  ChevronUp,
  Trash2,
  Edit3,
  Check,
  X,
  History,
  TrendingUp
} from 'lucide-react';
import { InventoryItem, InventoryBatch, ValuationMethod } from '../types';
import { calculateItemStock } from '../services/fifoLifoEngine';
import { ConfirmModal } from './ConfirmModal';

interface InventoryViewProps {
  inventory: InventoryItem[];
  onAddItem: (item: Omit<InventoryItem, 'id' | 'createdAt'>) => void;
  onUpdateItem: (item: InventoryItem) => void;
  onDeleteItem: (itemId: string) => void;
  onAddBatch: (itemId: string, batch: Omit<InventoryBatch, 'batchId'>) => void;
  onDeleteBatch: (itemId: string, batchId: string) => void;
}

const CATEGORIES = [
  'কুর্তি ও টপস',
  'শাড়ি ও জমকালো পোশাক',
  'পাঞ্জাবি ও পুরুষদের পোশাক',
  'ওড়না ও স্কার্ফ',
  'থ্রি-পিস ও আনস্টিচ',
  'হ্যান্ডমেড গহনা ও অ্যাক্সেসরিজ',
  'অন্যান্য পণ্য',
];

export const InventoryView: React.FC<InventoryViewProps> = ({
  inventory,
  onAddItem,
  onUpdateItem,
  onDeleteItem,
  onAddBatch,
  onDeleteBatch,
}) => {
  const [expandedItemId, setExpandedItemId] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [methodFilter, setMethodFilter] = useState<'all' | 'FIFO' | 'LIFO'>('all');

  // Modals
  const [isAddItemModalOpen, setIsAddItemModalOpen] = useState(false);
  const [isAddBatchModalOpen, setIsAddBatchModalOpen] = useState(false);
  const [activeItemForBatch, setActiveItemForBatch] = useState<InventoryItem | null>(null);
  const [deletingItemId, setDeletingItemId] = useState<string | null>(null);
  const [deletingBatchInfo, setDeletingBatchInfo] = useState<{ itemId: string; batchId: string } | null>(null);

  // New Item Form State
  const [newItemSku, setNewItemSku] = useState('');
  const [newItemNameEn, setNewItemNameEn] = useState('');
  const [newItemNameBn, setNewItemNameBn] = useState('');
  const [newItemCategory, setNewItemCategory] = useState(CATEGORIES[0]);
  const [newItemMethod, setNewItemMethod] = useState<ValuationMethod>('FIFO');
  const [newItemDefaultPrice, setNewItemDefaultPrice] = useState<number>(1500);
  const [newItemAlertThreshold, setNewItemAlertThreshold] = useState<number>(5);
  // Initial batch fields
  const [newBatchCode, setNewBatchCode] = useState('');
  const [newBatchPurchaseDate, setNewBatchPurchaseDate] = useState(new Date().toISOString().split('T')[0]);
  const [newBatchCostPrice, setNewBatchCostPrice] = useState<number>(900);
  const [newBatchInitialQty, setNewBatchInitialQty] = useState<number>(20);
  const [newBatchSupplier, setNewBatchSupplier] = useState('');

  // Add Batch Modal Form State
  const [standaloneBatchCode, setStandaloneBatchCode] = useState('');
  const [standalonePurchaseDate, setStandalonePurchaseDate] = useState(new Date().toISOString().split('T')[0]);
  const [standaloneCostPrice, setStandaloneCostPrice] = useState<number>(1000);
  const [standaloneQty, setStandaloneQty] = useState<number>(20);
  const [standaloneSupplier, setStandaloneSupplier] = useState('');

  const toggleExpand = (id: string) => {
    setExpandedItemId(expandedItemId === id ? null : id);
  };

  const handleOpenAddBatch = (item: InventoryItem) => {
    setActiveItemForBatch(item);
    setStandaloneBatchCode(`LOT-${new Date().toISOString().slice(2, 7).replace('-', '')}-${Math.floor(10 + Math.random() * 90)}`);
    setStandalonePurchaseDate(new Date().toISOString().split('T')[0]);
    setStandaloneCostPrice(item.batches.length > 0 ? item.batches[item.batches.length - 1].unitCostPrice : 1000);
    setStandaloneQty(20);
    setStandaloneSupplier(item.batches.length > 0 ? item.batches[0].supplier : 'জামালপুর কারিগর সমবায়');
    setIsAddBatchModalOpen(true);
  };

  const handleSaveBatchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeItemForBatch) return;

    onAddBatch(activeItemForBatch.id, {
      batchCode: standaloneBatchCode.trim() || `LOT-${Date.now().toString().slice(-4)}`,
      purchaseDate: standalonePurchaseDate,
      unitCostPrice: Number(standaloneCostPrice),
      defaultSellingPrice: activeItemForBatch.defaultSellingPrice,
      initialQty: Number(standaloneQty),
      remainingQty: Number(standaloneQty),
      supplier: standaloneSupplier.trim() || 'নিজস্ব কারিগর',
    });

    setIsAddBatchModalOpen(false);
    setActiveItemForBatch(null);
  };

  const handleSaveItemSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newItemNameBn.trim()) return;

    const initialBatch: InventoryBatch = {
      batchId: `batch-${Date.now()}`,
      batchCode: newBatchCode.trim() || `LOT-${new Date().getFullYear()}-01`,
      purchaseDate: newBatchPurchaseDate,
      unitCostPrice: Number(newBatchCostPrice),
      defaultSellingPrice: Number(newItemDefaultPrice),
      initialQty: Number(newBatchInitialQty),
      remainingQty: Number(newBatchInitialQty),
      supplier: newBatchSupplier.trim() || 'নিজস্ব সোর্সিং',
    };

    onAddItem({
      sku: newItemSku.trim() || `NL-${Math.floor(1000 + Math.random() * 9000)}`,
      nameEn: newItemNameEn.trim() || newItemNameBn.trim(),
      nameBn: newItemNameBn.trim(),
      category: newItemCategory,
      valuationMethod: newItemMethod,
      defaultSellingPrice: Number(newItemDefaultPrice),
      alertThreshold: Number(newItemAlertThreshold),
      batches: [initialBatch],
    });

    setIsAddItemModalOpen(false);
  };

  // Switch FIFO / LIFO method
  const handleToggleMethod = (item: InventoryItem) => {
    const nextMethod: ValuationMethod = item.valuationMethod === 'FIFO' ? 'LIFO' : 'FIFO';
    onUpdateItem({
      ...item,
      valuationMethod: nextMethod,
    });
  };

  // Calculations
  const totalStockPieces = inventory.reduce((sum, item) => {
    const { totalQty } = calculateItemStock(item);
    return sum + totalQty;
  }, 0);

  const totalInventoryValuation = inventory.reduce((sum, item) => {
    const { totalValuation } = calculateItemStock(item);
    return sum + totalValuation;
  }, 0);

  const lowStockCount = inventory.filter((item) => {
    const { totalQty } = calculateItemStock(item);
    return totalQty <= item.alertThreshold;
  }).length;

  // Filter items
  const filteredItems = inventory.filter((item) => {
    const matchesSearch =
      item.nameBn.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.nameEn.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.sku.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCat = categoryFilter === 'all' || item.category === categoryFilter;
    const matchesMethod = methodFilter === 'all' || item.valuationMethod === methodFilter;
    return matchesSearch && matchesCat && matchesMethod;
  });

  return (
    <div className="space-y-6">
      {/* Top Banner & Highlights */}
      <div className="bg-gradient-to-r from-emerald-950 via-teal-900 to-slate-900 rounded-3xl p-6 sm:p-8 text-white shadow-xl relative overflow-hidden">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-6 relative z-10">
          <div>
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-0.5 rounded-full bg-emerald-400/20 text-emerald-300 border border-emerald-400/30 text-xs font-semibold">
                আইটেম ভিত্তিক আলাদা FIFO / LIFO লেজার
              </span>
              <span className="text-xs text-slate-300">
                মোট আইটেম: <strong>{inventory.length}</strong> টি
              </span>
            </div>
            <h2 className="text-2xl sm:text-3xl font-black mt-2 tracking-tight">
              স্টক লেজার ও পণ্যের ক্রয়-বিক্রয় মূল্য
            </h2>
            <p className="text-slate-300 text-xs sm:text-sm mt-1 max-w-xl">
              প্রতিটি পণ্যের জন্য আলাদাভাবে FIFO (আগে আসা লট আগে বিক্রি) অথবা LIFO (পরে আসা লট আগে বিক্রি) পদ্ধতি নির্ধারণ করুন। সঠিক ক্রয়মূল্য ও অবশিষ্ট মজুদ ট্র্যাক করুন।
            </p>
          </div>

          <button
            onClick={() => {
              setNewItemSku(`NL-${Math.floor(1000 + Math.random() * 9000)}`);
              setNewBatchCode(`LOT-${new Date().toISOString().slice(2, 7).replace('-', '')}-01`);
              setIsAddItemModalOpen(true);
            }}
            className="flex items-center gap-2 px-5 py-3 rounded-2xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-sm shadow-lg shadow-emerald-500/25 transition-all transform hover:-translate-y-0.5 cursor-pointer shrink-0"
          >
            <Plus className="w-5 h-5" />
            নতুন পণ্য যোগ করুন
          </button>
        </div>

        {/* 4 Financial Stat Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4 mt-6 pt-6 border-t border-emerald-800/50">
          <div className="bg-white/10 backdrop-blur-xs rounded-2xl p-3.5 border border-white/10">
            <span className="text-[11px] text-emerald-300 font-medium block">মোট বর্তমান মজুদ</span>
            <div className="text-xl sm:text-2xl font-black text-white mt-1">
              {totalStockPieces} <span className="text-xs font-normal text-slate-300">পিস</span>
            </div>
          </div>

          <div className="bg-white/10 backdrop-blur-xs rounded-2xl p-3.5 border border-white/10">
            <span className="text-[11px] text-teal-300 font-medium block">স্টকের ক্রয়মূল্য (ভ্যালুয়েশন)</span>
            <div className="text-xl sm:text-2xl font-black text-white mt-1">
              ৳{totalInventoryValuation.toLocaleString()}
            </div>
          </div>

          <div className="bg-white/10 backdrop-blur-xs rounded-2xl p-3.5 border border-white/10">
            <span className="text-[11px] text-amber-300 font-medium block">কম স্টক সতর্কতা</span>
            <div className="text-xl sm:text-2xl font-black text-amber-300 mt-1 flex items-center gap-1.5">
              <span>{lowStockCount}</span>
              <span className="text-xs font-normal text-slate-300">টি আইটেম</span>
            </div>
          </div>

          <div className="bg-white/10 backdrop-blur-xs rounded-2xl p-3.5 border border-white/10">
            <span className="text-[11px] text-cyan-300 font-medium block">পদ্ধতি অনুপাত</span>
            <div className="text-xs sm:text-sm font-bold text-white mt-2 flex items-center gap-2">
              <span className="bg-emerald-500/30 text-emerald-200 px-2 py-0.5 rounded">
                FIFO: {inventory.filter((i) => i.valuationMethod === 'FIFO').length}
              </span>
              <span className="bg-purple-500/30 text-purple-200 px-2 py-0.5 rounded">
                LIFO: {inventory.filter((i) => i.valuationMethod === 'LIFO').length}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white rounded-2xl p-4 border border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-3 shadow-xs">
        <div className="w-full sm:w-72">
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="পণ্য বা SKU দিয়ে খুঁজুন..."
            className="w-full px-3.5 py-2 rounded-xl border border-slate-300 text-xs sm:text-sm focus:ring-2 focus:ring-emerald-500 outline-none"
          />
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto flex-wrap">
          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="px-3 py-2 rounded-xl border border-slate-300 text-xs sm:text-sm bg-white outline-none flex-1 sm:flex-none"
          >
            <option value="all">সকল ক্যাটাগরি</option>
            {CATEGORIES.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>

          <select
            value={methodFilter}
            onChange={(e) => setMethodFilter(e.target.value as 'all' | 'FIFO' | 'LIFO')}
            className="px-3 py-2 rounded-xl border border-slate-300 text-xs sm:text-sm bg-white outline-none"
          >
            <option value="all">সকল লেজার মেথড</option>
            <option value="FIFO">শুধু FIFO</option>
            <option value="LIFO">শুধু LIFO</option>
          </select>
        </div>
      </div>

      {/* Inventory Item Cards */}
      <div className="space-y-4">
        {filteredItems.length === 0 ? (
          <div className="bg-white rounded-2xl p-12 text-center border border-dashed border-slate-200">
            <Package className="w-12 h-12 text-slate-300 mx-auto mb-3" />
            <h4 className="text-base font-bold text-slate-800">কোন পণ্য পাওয়া যায়নি</h4>
            <p className="text-xs text-slate-500 mt-1">আপনার সার্চ বা ফিল্টারের সাথে মিলছে না।</p>
          </div>
        ) : (
          filteredItems.map((item) => {
            const { totalQty, totalValuation, averageCostPrice } = calculateItemStock(item);
            const isLowStock = totalQty <= item.alertThreshold;
            const isExpanded = expandedItemId === item.id;

            return (
              <div
                key={item.id}
                className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-xs hover:border-slate-300 transition-all"
              >
                {/* Item Summary Row */}
                <div className="p-4 sm:p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                  <div className="flex items-start gap-3.5 flex-1">
                    <div className="w-12 h-12 rounded-xl bg-gradient-to-tr from-emerald-100 to-teal-100 text-emerald-800 flex items-center justify-center shrink-0 font-bold text-base border border-emerald-200/60">
                      {item.sku.slice(-2)}
                    </div>

                    <div className="space-y-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-mono text-xs font-bold text-slate-500 bg-slate-100 px-2 py-0.5 rounded">
                          {item.sku}
                        </span>
                        <h3 className="font-bold text-slate-900 text-base">{item.nameBn}</h3>

                        {/* Valuation Method Switcher Button */}
                        <button
                          type="button"
                          onClick={() => handleToggleMethod(item)}
                          className={`px-2.5 py-0.5 rounded-full text-xs font-bold cursor-pointer transition-all flex items-center gap-1 ${
                            item.valuationMethod === 'FIFO'
                              ? 'bg-emerald-100 text-emerald-800 border border-emerald-300 hover:bg-emerald-200'
                              : 'bg-purple-100 text-purple-800 border border-purple-300 hover:bg-purple-200'
                          }`}
                          title="পদ্ধতি পরিবর্তন করতে ক্লিক করুন (FIFO/LIFO)"
                        >
                          <Layers className="w-3 h-3" />
                          <span>{item.valuationMethod}</span>
                          <span className="text-[10px] opacity-75 font-normal">
                            ({item.valuationMethod === 'FIFO' ? 'আগে আসা লট আগে' : 'পরে আসা লট আগে'})
                          </span>
                        </button>

                        {isLowStock && (
                          <span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-rose-100 text-rose-700 flex items-center gap-1">
                            <AlertTriangle className="w-3 h-3" />
                            কম স্টক ({totalQty} পিস বাকি)
                          </span>
                        )}
                      </div>

                      <p className="text-xs text-slate-500">{item.nameEn} • {item.category}</p>

                      <div className="flex items-center gap-4 text-xs text-slate-600 pt-1 flex-wrap">
                        <span>
                          নির্ধারিত বিক্রয়মূল্য: <strong className="text-slate-900">৳{item.defaultSellingPrice.toLocaleString()}</strong>
                        </span>
                        <span>•</span>
                        <span>
                          গড় ক্রয়মূল্য: <strong className="text-slate-800">৳{Math.round(averageCostPrice).toLocaleString()}</strong>
                        </span>
                        <span>•</span>
                        <span>
                          মোট ব্যাচ/লট: <strong>{item.batches.length}</strong> টি
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Stock Counts and Action Buttons */}
                  <div className="flex items-center gap-3 sm:gap-6 self-stretch sm:self-center justify-between sm:justify-end pt-3 sm:pt-0 border-t sm:border-t-0 border-slate-100">
                    <div className="text-right">
                      <div className="text-lg sm:text-xl font-black text-slate-900">
                        {totalQty} <span className="text-xs font-normal text-slate-500">পিস</span>
                      </div>
                      <div className="text-xs text-emerald-700 font-semibold">
                        মোট ভ্যালু: ৳{totalValuation.toLocaleString()}
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5">
                      <button
                        onClick={() => handleOpenAddBatch(item)}
                        className="px-3 py-1.5 rounded-xl bg-emerald-50 text-emerald-700 hover:bg-emerald-100 text-xs font-bold border border-emerald-200 flex items-center gap-1 transition-colors cursor-pointer"
                        title="এই পণ্যে নতুন লট/স্টক যুক্ত করুন"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        স্টক ইন
                      </button>

                      <button
                        onClick={() => toggleExpand(item.id)}
                        className="p-1.5 rounded-xl text-slate-500 hover:bg-slate-100 transition-colors cursor-pointer"
                        title={isExpanded ? 'লট লেজার লুকান' : 'লট লেজার দেখুন'}
                      >
                        {isExpanded ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
                      </button>

                      <button
                        onClick={() => setDeletingItemId(item.id)}
                        className="p-1.5 rounded-xl text-rose-400 hover:text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
                        title="পণ্যটি মুছে ফেলুন"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>

                {/* Expanded Batches (FIFO/LIFO Ledger Table) */}
                {isExpanded && (
                  <div className="bg-slate-50 p-4 sm:p-5 border-t border-slate-200">
                    <div className="flex items-center justify-between pb-3 mb-3 border-b border-slate-200">
                      <div className="flex items-center gap-2">
                        <History className="w-4 h-4 text-emerald-700" />
                        <h4 className="text-xs sm:text-sm font-bold text-slate-800">
                          {item.nameBn} - ক্রয় ব্যাচ ও মজুদ লেজার ({item.valuationMethod} অর্ডার অগ্রাধিকার)
                        </h4>
                      </div>
                      <span className="text-[11px] text-slate-500">
                        {item.valuationMethod === 'FIFO'
                          ? 'অর্ডার হলে সবচেয়ে পুরোনো লট থেকে আগে স্টক কমবে'
                          : 'অর্ডার হলে সবচেয়ে নতুন লট থেকে আগে স্টক কমবে'}
                      </span>
                    </div>

                    <div className="overflow-x-auto">
                      <table className="w-full text-xs text-left">
                        <thead>
                          <tr className="bg-white text-slate-600 font-bold border border-slate-200 rounded-lg">
                            <th className="py-2.5 px-3">ব্যাচ / লট কোড</th>
                            <th className="py-2.5 px-3">ক্রয় তারিখ</th>
                            <th className="py-2.5 px-3">সাপ্লায়ার / কারিগর</th>
                            <th className="py-2.5 px-3 text-right">একক ক্রয়মূল্য</th>
                            <th className="py-2.5 px-3 text-center">শুরুর স্টক</th>
                            <th className="py-2.5 px-3 text-center">অবশিষ্ট স্টক</th>
                            <th className="py-2.5 px-3 text-right">মোট অবশিষ্ট ক্রয়মূল্য</th>
                            <th className="py-2.5 px-3 text-center">অ্যাকশন</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-200 bg-white border border-slate-200">
                          {item.batches.map((batch) => (
                            <tr key={batch.batchId} className="hover:bg-slate-50">
                              <td className="py-2.5 px-3 font-mono font-bold text-slate-800">
                                {batch.batchCode}
                              </td>
                              <td className="py-2.5 px-3 text-slate-600">{batch.purchaseDate}</td>
                              <td className="py-2.5 px-3 text-slate-700">{batch.supplier}</td>
                              <td className="py-2.5 px-3 text-right font-semibold text-emerald-800">
                                ৳{batch.unitCostPrice.toLocaleString()}
                              </td>
                              <td className="py-2.5 px-3 text-center text-slate-500">{batch.initialQty}</td>
                              <td className="py-2.5 px-3 text-center font-bold text-slate-900">
                                {batch.remainingQty}
                              </td>
                              <td className="py-2.5 px-3 text-right font-bold text-slate-800">
                                ৳{(batch.remainingQty * batch.unitCostPrice).toLocaleString()}
                              </td>
                              <td className="py-2.5 px-3 text-center">
                                {item.batches.length > 1 && (
                                  <button
                                    onClick={() =>
                                      setDeletingBatchInfo({ itemId: item.id, batchId: batch.batchId })
                                    }
                                    className="text-rose-400 hover:text-rose-600 p-1 rounded"
                                    title="এই লটটি ডিলিট করুন"
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </button>
                                )}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      {/* Add New Inventory Item Modal */}
      {isAddItemModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs overflow-y-auto">
          <div className="bg-white rounded-2xl max-w-xl w-full p-6 shadow-2xl border border-slate-100 my-8">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100">
              <h3 className="font-bold text-slate-900 text-lg">নতুন পণ্য ও প্রারম্ভিক স্টক লট যোগ করুন</h3>
              <button
                onClick={() => setIsAddItemModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-1.5 rounded-lg hover:bg-slate-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveItemSubmit} className="mt-4 space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    পণ্যের নাম (বাংলা) <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={newItemNameBn}
                    onChange={(e) => setNewItemNameBn(e.target.value)}
                    placeholder="যেমন: হাতের কাজের লিনেন কুর্তি"
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 text-sm focus:ring-2 focus:ring-emerald-500 outline-none"
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    পণ্যের নাম (English)
                  </label>
                  <input
                    type="text"
                    value={newItemNameEn}
                    onChange={(e) => setNewItemNameEn(e.target.value)}
                    placeholder="Handmade Linen Kurti"
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 text-sm focus:ring-2 focus:ring-emerald-500 outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    SKU / বারকোড কোড
                  </label>
                  <input
                    type="text"
                    value={newItemSku}
                    onChange={(e) => setNewItemSku(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 text-sm font-mono focus:ring-2 focus:ring-emerald-500 outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    ক্যাটাগরি
                  </label>
                  <select
                    value={newItemCategory}
                    onChange={(e) => setNewItemCategory(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 text-sm bg-white outline-none"
                  >
                    {CATEGORIES.map((c) => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    লেজার পদ্ধতি (Valuation) <span className="text-rose-500">*</span>
                  </label>
                  <select
                    value={newItemMethod}
                    onChange={(e) => setNewItemMethod(e.target.value as ValuationMethod)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 text-sm bg-white outline-none font-bold text-emerald-800"
                  >
                    <option value="FIFO">FIFO (আগে আসা লট আগে)</option>
                    <option value="LIFO">LIFO (পরে আসা লট আগে)</option>
                  </select>
                </div>
              </div>

              {/* Price & Threshold */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    নির্ধারিত বিক্রয়মূল্য (টাকা) <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={newItemDefaultPrice}
                    onChange={(e) => setNewItemDefaultPrice(Number(e.target.value))}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 text-sm focus:ring-2 focus:ring-emerald-500 outline-none"
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    কম স্টক সতর্কতা সীমা (পিস)
                  </label>
                  <input
                    type="number"
                    min="1"
                    value={newItemAlertThreshold}
                    onChange={(e) => setNewItemAlertThreshold(Number(e.target.value))}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 text-sm focus:ring-2 focus:ring-emerald-500 outline-none"
                  />
                </div>
              </div>

              {/* Initial Batch Section */}
              <div className="bg-emerald-50/60 p-4 rounded-xl border border-emerald-100 space-y-3">
                <span className="text-xs font-bold text-emerald-900 block">
                  প্রথম ব্যাচ / লটের তথ্য (প্রারম্ভিক স্টক)
                </span>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-600 mb-1">লট কোড</label>
                    <input
                      type="text"
                      value={newBatchCode}
                      onChange={(e) => setNewBatchCode(e.target.value)}
                      className="w-full px-3 py-1.5 rounded-lg border border-slate-300 text-xs bg-white font-mono"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-slate-600 mb-1">ক্রয় তারিখ</label>
                    <input
                      type="date"
                      value={newBatchPurchaseDate}
                      onChange={(e) => setNewBatchPurchaseDate(e.target.value)}
                      className="w-full px-3 py-1.5 rounded-lg border border-slate-300 text-xs bg-white"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                      একক ক্রয়মূল্য (টাকা) <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="number"
                      min="0"
                      value={newBatchCostPrice}
                      onChange={(e) => setNewBatchCostPrice(Number(e.target.value))}
                      className="w-full px-3 py-1.5 rounded-lg border border-slate-300 text-xs bg-white"
                      required
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                      প্রারম্ভিক পরিমাণ (পিস) <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="number"
                      min="1"
                      value={newBatchInitialQty}
                      onChange={(e) => setNewBatchInitialQty(Number(e.target.value))}
                      className="w-full px-3 py-1.5 rounded-lg border border-slate-300 text-xs bg-white font-bold"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                      সাপ্লায়ার বা কারিগর
                    </label>
                    <input
                      type="text"
                      value={newBatchSupplier}
                      onChange={(e) => setNewBatchSupplier(e.target.value)}
                      placeholder="যেমন: জামালপুর সমবায়"
                      className="w-full px-3 py-1.5 rounded-lg border border-slate-300 text-xs bg-white"
                    />
                  </div>
                </div>
              </div>

              <div className="pt-3 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setIsAddItemModalOpen(false)}
                  className="px-4 py-2.5 rounded-xl border border-slate-200 text-slate-700 hover:bg-slate-50 font-medium text-sm transition-all"
                >
                  বাতিল
                </button>
                <button
                  type="submit"
                  className="flex items-center gap-1.5 px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-medium text-sm shadow-md shadow-emerald-200 transition-all cursor-pointer"
                >
                  <Check className="w-4 h-4" />
                  পণ্য সংরক্ষণ করুন
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add Batch Modal (Stock In) */}
      {isAddBatchModalOpen && activeItemForBatch && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-100">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100">
              <div>
                <h3 className="font-bold text-slate-900 text-lg">নতুন স্টক ইন (লট যুক্তকরণ)</h3>
                <p className="text-xs text-slate-500">{activeItemForBatch.nameBn}</p>
              </div>
              <button
                onClick={() => setIsAddBatchModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-1.5 rounded-lg hover:bg-slate-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveBatchSubmit} className="mt-4 space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">লট / ব্যাচ কোড</label>
                <input
                  type="text"
                  value={standaloneBatchCode}
                  onChange={(e) => setStandaloneBatchCode(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 text-sm font-mono outline-none"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">ক্রয় তারিখ</label>
                  <input
                    type="date"
                    value={standalonePurchaseDate}
                    onChange={(e) => setStandalonePurchaseDate(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 text-sm outline-none"
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    একক ক্রয়মূল্য (টাকা)
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={standaloneCostPrice}
                    onChange={(e) => setStandaloneCostPrice(Number(e.target.value))}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 text-sm outline-none font-bold text-emerald-800"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">পরিমাণ (পিস)</label>
                  <input
                    type="number"
                    min="1"
                    value={standaloneQty}
                    onChange={(e) => setStandaloneQty(Number(e.target.value))}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 text-sm outline-none font-bold"
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">সাপ্লায়ার / কারিগর</label>
                  <input
                    type="text"
                    value={standaloneSupplier}
                    onChange={(e) => setStandaloneSupplier(e.target.value)}
                    placeholder="সাপ্লায়ারের নাম"
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 text-sm outline-none"
                  />
                </div>
              </div>

              <div className="pt-3 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setIsAddBatchModalOpen(false)}
                  className="px-4 py-2.5 rounded-xl border border-slate-200 text-slate-700 hover:bg-slate-50 font-medium text-sm transition-all"
                >
                  বাতিল
                </button>
                <button
                  type="submit"
                  className="flex items-center gap-1.5 px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-medium text-sm shadow-md shadow-emerald-200 transition-all cursor-pointer"
                >
                  <Check className="w-4 h-4" />
                  স্টক ইন কনফার্ম
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Item Confirmation Modal */}
      <ConfirmModal
        isOpen={!!deletingItemId}
        title="পণ্যটি মুছে ফেলতে চান?"
        message="এই পণ্যটি মুছে ফেললে এর সমস্ত ব্যাচ ও হিস্ট্রি মুছে যাবে। নিশ্চিত করতে চান?"
        confirmText="মুছে ফেলুন"
        cancelText="বাতিল"
        onConfirm={() => {
          if (deletingItemId) {
            onDeleteItem(deletingItemId);
            setDeletingItemId(null);
          }
        }}
        onCancel={() => setDeletingItemId(null)}
      />

      {/* Delete Batch Confirmation Modal */}
      <ConfirmModal
        isOpen={!!deletingBatchInfo}
        title="ব্যাচ লটটি মুছে ফেলতে চান?"
        message="এই নির্দিষ্ট লটটির অবশিষ্ট স্টক লেজার থেকে মুছে যাবে।"
        confirmText="মুছে ফেলুন"
        cancelText="বাতিল"
        onConfirm={() => {
          if (deletingBatchInfo) {
            onDeleteBatch(deletingBatchInfo.itemId, deletingBatchInfo.batchId);
            setDeletingBatchInfo(null);
          }
        }}
        onCancel={() => setDeletingBatchInfo(null)}
      />
    </div>
  );
};
