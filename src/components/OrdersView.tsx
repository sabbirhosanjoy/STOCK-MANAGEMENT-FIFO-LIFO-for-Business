import React, { useState } from 'react';
import {
  ShoppingCart,
  Plus,
  Truck,
  FileText,
  Clock,
  CheckCircle,
  XCircle,
  RotateCcw,
  Trash2,
  Edit2,
  Calendar,
  Phone,
  MapPin,
  Tag,
  AlertCircle,
  X,
  Check,
  Search,
  ExternalLink
} from 'lucide-react';
import { Order, OrderStatus, InventoryItem, BusinessSettings } from '../types';
import { deductStock, restoreStock, calculateItemStock } from '../services/fifoLifoEngine';
import { CourierModal } from './CourierModal';
import { InvoiceModal } from './InvoiceModal';
import { ConfirmModal } from './ConfirmModal';

interface OrdersViewProps {
  orders: Order[];
  inventory: InventoryItem[];
  settings: BusinessSettings;
  onAddOrder: (order: Order, updatedInventory: InventoryItem[]) => void;
  onUpdateOrderStatus: (
    orderId: string,
    newStatus: OrderStatus,
    updatedInventory?: InventoryItem[]
  ) => void;
  onUpdateCourierDetails: (
    orderId: string,
    courierService: string,
    trackingCode: string,
    scheduledDate: string,
    scheduledTime: string
  ) => void;
  onDeleteOrder: (orderId: string, updatedInventory?: InventoryItem[]) => void;
}

const DISTRICTS = [
  'ঢাকা',
  'চট্টগ্রাম',
  'রাজশাহী',
  'খুলনা',
  'সিলেট',
  'বরিশাল',
  'রংপুর',
  'ময়মনসিংহ',
  'কুমিল্লা',
  'গাজীপুর',
  'নারায়ণগঞ্জ',
  'বগুড়া',
  'যশোর',
  'অন্যান্য জেলা',
];

export const OrdersView: React.FC<OrdersViewProps> = ({
  orders,
  inventory,
  settings,
  onAddOrder,
  onUpdateOrderStatus,
  onUpdateCourierDetails,
  onDeleteOrder,
}) => {
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState<string>('');

  // Modals
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [selectedInvoiceOrder, setSelectedInvoiceOrder] = useState<Order | null>(null);
  const [courierModalOrder, setCourierModalOrder] = useState<Order | null>(null);
  const [deletingOrderId, setDeletingOrderId] = useState<string | null>(null);

  // New Order Form State
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [customerAddress, setCustomerAddress] = useState('');
  const [district, setDistrict] = useState(DISTRICTS[0]);
  const [source, setSource] = useState<'Facebook Page' | 'WhatsApp' | 'Marketplace' | 'Showroom' | 'Other'>('Facebook Page');
  const [deliveryCharge, setDeliveryCharge] = useState<number>(80);
  const [advancePaid, setAdvancePaid] = useState<number>(0);
  const [notes, setNotes] = useState('');

  // Order Items Selection
  interface SelectedItemEntry {
    itemId: string;
    quantity: number;
    unitActualPrice: number;
  }
  const [selectedItems, setSelectedItems] = useState<SelectedItemEntry[]>([]);
  const [orderFormError, setOrderFormError] = useState<string>('');

  const handleOpenAddModal = () => {
    setCustomerName('');
    setCustomerPhone('');
    setCustomerAddress('');
    setDistrict(DISTRICTS[0]);
    setSource('Facebook Page');
    setDeliveryCharge(80);
    setAdvancePaid(0);
    setNotes('');
    setOrderFormError('');

    // Pre-populate with first available inventory item
    if (inventory.length > 0) {
      setSelectedItems([
        {
          itemId: inventory[0].id,
          quantity: 1,
          unitActualPrice: inventory[0].defaultSellingPrice,
        },
      ]);
    } else {
      setSelectedItems([]);
    }

    setIsAddModalOpen(true);
  };

  const handleAddItemRow = () => {
    if (inventory.length === 0) return;
    setSelectedItems([
      ...selectedItems,
      {
        itemId: inventory[0].id,
        quantity: 1,
        unitActualPrice: inventory[0].defaultSellingPrice,
      },
    ]);
  };

  const handleRemoveItemRow = (index: number) => {
    setSelectedItems(selectedItems.filter((_, idx) => idx !== index));
  };

  const handleItemChange = (index: number, itemId: string) => {
    const targetItem = inventory.find((i) => i.id === itemId);
    const updated = [...selectedItems];
    updated[index].itemId = itemId;
    if (targetItem) {
      updated[index].unitActualPrice = targetItem.defaultSellingPrice;
    }
    setSelectedItems(updated);
  };

  const handleQtyChange = (index: number, qty: number) => {
    const updated = [...selectedItems];
    updated[index].quantity = Math.max(1, qty);
    setSelectedItems(updated);
  };

  const handleActualPriceChange = (index: number, price: number) => {
    const updated = [...selectedItems];
    updated[index].unitActualPrice = Math.max(0, price);
    setSelectedItems(updated);
  };

  // Submit New Order
  const handleCreateOrderSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setOrderFormError('');

    if (selectedItems.length === 0) {
      setOrderFormError('কমপক্ষে একটি পণ্য সিলেক্ট করুন!');
      return;
    }

    // Clone inventory to process deductions
    let currentInventory = inventory.map((inv) => ({
      ...inv,
      batches: inv.batches.map((b) => ({ ...b })),
    }));

    const orderItemsBuilt = [];
    const allDeductions = [];
    let totalCogs = 0;
    let subtotal = 0;

    for (const entry of selectedItems) {
      const invItemIndex = currentInventory.findIndex((i) => i.id === entry.itemId);
      if (invItemIndex === -1) continue;

      const invItem = currentInventory[invItemIndex];
      const result = deductStock(invItem, entry.quantity);

      if (!result.success) {
        setOrderFormError(`"${invItem.nameBn}" এর ক্ষেত্রে: ${result.error}`);
        return;
      }

      currentInventory[invItemIndex].batches = result.updatedBatches;
      allDeductions.push(...result.deductions);
      totalCogs += result.totalCost;

      const itemTotalSelling = entry.quantity * entry.unitActualPrice;
      subtotal += itemTotalSelling;

      orderItemsBuilt.push({
        itemId: invItem.id,
        itemNameEn: invItem.nameEn,
        itemNameBn: invItem.nameBn,
        quantity: entry.quantity,
        unitDefaultPrice: invItem.defaultSellingPrice,
        unitActualPrice: entry.unitActualPrice,
        totalSellingPrice: itemTotalSelling,
        unitCostPrice: result.averageUnitCost,
        totalCostPrice: result.totalCost,
      });
    }

    const totalAmount = subtotal + Number(deliveryCharge);
    const dueAmount = Math.max(0, totalAmount - Number(advancePaid));

    const now = new Date();
    const orderNumber = `NL-${now.getFullYear().toString().slice(-2)}${(now.getMonth() + 1)
      .toString()
      .padStart(2, '0')}-${Math.floor(100 + Math.random() * 900)}`;

    const newOrder: Order = {
      id: `ord-${Date.now()}`,
      orderNumber,
      customerName: customerName.trim(),
      customerPhone: customerPhone.trim(),
      customerAddress: customerAddress.trim(),
      district,
      items: orderItemsBuilt,
      subtotal,
      deliveryCharge: Number(deliveryCharge),
      advancePaid: Number(advancePaid),
      totalAmount,
      dueAmount,
      orderDate: now.toISOString().split('T')[0],
      orderTime: now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false }),
      source,
      status: 'Pending',
      cogsTotal: totalCogs,
      batchDeductions: allDeductions,
      notes: notes.trim(),
      createdAt: now.toISOString(),
    };

    onAddOrder(newOrder, currentInventory);
    setIsAddModalOpen(false);

    // Prompt to view invoice
    setSelectedInvoiceOrder(newOrder);
  };

  // Status Change Handler
  const handleStatusChange = (order: Order, newStatus: OrderStatus) => {
    // If moving to Handed to Courier, open courier modal for entry
    if (newStatus === 'Handed to Courier') {
      onUpdateOrderStatus(order.id, newStatus);
      setCourierModalOrder(order);
      return;
    }

    // If order is marked as Returned or Cancelled, restore stock!
    if ((newStatus === 'Returned' || newStatus === 'Cancelled') && order.status !== 'Returned' && order.status !== 'Cancelled') {
      let currentInventory = inventory.map((inv) => ({
        ...inv,
        batches: inv.batches.map((b) => ({ ...b })),
      }));

      for (const ded of order.batchDeductions) {
        const itemIdx = currentInventory.findIndex((i) => i.id === ded.itemId);
        if (itemIdx !== -1) {
          currentInventory[itemIdx].batches = restoreStock(
            currentInventory[itemIdx],
            order.batchDeductions
          );
        }
      }

      onUpdateOrderStatus(order.id, newStatus, currentInventory);
      return;
    }

    onUpdateOrderStatus(order.id, newStatus);
  };

  // Delete Order
  const handleConfirmDelete = () => {
    if (!deletingOrderId) return;
    const targetOrder = orders.find((o) => o.id === deletingOrderId);
    if (!targetOrder) {
      setDeletingOrderId(null);
      return;
    }

    // If order was active (not returned/cancelled), ask to restore stock back
    let updatedInv: InventoryItem[] | undefined;
    if (targetOrder.status !== 'Returned' && targetOrder.status !== 'Cancelled') {
      let currentInventory = inventory.map((inv) => ({
        ...inv,
        batches: inv.batches.map((b) => ({ ...b })),
      }));
      for (const ded of targetOrder.batchDeductions) {
        const itemIdx = currentInventory.findIndex((i) => i.id === ded.itemId);
        if (itemIdx !== -1) {
          currentInventory[itemIdx].batches = restoreStock(
            currentInventory[itemIdx],
            targetOrder.batchDeductions
          );
        }
      }
      updatedInv = currentInventory;
    }

    onDeleteOrder(deletingOrderId, updatedInv);
    setDeletingOrderId(null);
  };

  // Filter orders
  const filteredOrders = orders.filter((o) => {
    const matchesStatus = filterStatus === 'all' || o.status === filterStatus;
    const matchesSearch =
      o.orderNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
      o.customerName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      o.customerPhone.includes(searchTerm) ||
      (o.courierTrackingCode && o.courierTrackingCode.toLowerCase().includes(searchTerm.toLowerCase()));
    return matchesStatus && matchesSearch;
  });

  const getStatusBadge = (status: OrderStatus) => {
    switch (status) {
      case 'Pending':
        return <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-amber-100 text-amber-800">অর্ডার গৃহীত (Pending)</span>;
      case 'Processing':
        return <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-blue-100 text-blue-800">প্যাকিং চলছে (Processing)</span>;
      case 'Handed to Courier':
        return <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-purple-100 text-purple-800 flex items-center gap-1"><Truck className="w-3 h-3" /> কুরিয়ারে হস্তান্তর</span>;
      case 'Delivered':
        return <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800 flex items-center gap-1"><CheckCircle className="w-3 h-3" /> ডেলিভারি সম্পন্ন</span>;
      case 'Returned':
        return <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-rose-100 text-rose-800 flex items-center gap-1"><RotateCcw className="w-3 h-3" /> রিটার্ন (স্টক ফেরত)</span>;
      case 'Cancelled':
        return <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-slate-200 text-slate-700">বাতিল (স্টক ফেরত)</span>;
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="bg-gradient-to-r from-emerald-950 via-teal-900 to-slate-900 rounded-3xl p-6 sm:p-8 text-white shadow-xl relative overflow-hidden">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-6 relative z-10">
          <div>
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-0.5 rounded-full bg-emerald-400/20 text-emerald-300 border border-emerald-400/30 text-xs font-semibold">
                Facebook Page ও মার্কেটপ্লেস অর্ডার হাব
              </span>
              <span className="text-xs text-slate-300">
                মোট অর্ডার: <strong>{orders.length}</strong> টি
              </span>
            </div>
            <h2 className="text-2xl sm:text-3xl font-black mt-2 tracking-tight">
              অর্ডার, কুরিয়ার ডেলিভারি ও ইনভয়েস
            </h2>
            <p className="text-slate-300 text-xs sm:text-sm mt-1 max-w-xl">
              Facebook বা যেকোনো মার্কেটপ্লেসের পণ্যের অর্ডার প্লেস করুন। কুরিয়ার ট্র্যাকিং ও ডেলিভারি সময়সূচি ব্যবস্থাপনা এবং গ্রাহকের জন্য অটোমেটিক QR কোডযুক্ত ইনভয়েস জেনারেট করুন।
            </p>
          </div>

          <button
            onClick={handleOpenAddModal}
            className="flex items-center gap-2 px-5 py-3 rounded-2xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-sm shadow-lg shadow-emerald-500/25 transition-all transform hover:-translate-y-0.5 cursor-pointer shrink-0"
          >
            <Plus className="w-5 h-5" />
            নতুন অর্ডার এন্ট্রি
          </button>
        </div>

        {/* Status mini count */}
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 mt-6 pt-6 border-t border-emerald-800/50">
          <div className="bg-white/10 rounded-xl p-2.5 text-center">
            <span className="text-[10px] text-amber-300 font-medium block">পেন্ডিং ও প্রসেসিং</span>
            <span className="text-lg font-black text-white">
              {orders.filter((o) => o.status === 'Pending' || o.status === 'Processing').length}
            </span>
          </div>
          <div className="bg-white/10 rounded-xl p-2.5 text-center">
            <span className="text-[10px] text-purple-300 font-medium block">কুরিয়ারে হস্তান্তর</span>
            <span className="text-lg font-black text-white">
              {orders.filter((o) => o.status === 'Handed to Courier').length}
            </span>
          </div>
          <div className="bg-white/10 rounded-xl p-2.5 text-center">
            <span className="text-[10px] text-emerald-300 font-medium block">ডেলিভারি সম্পন্ন</span>
            <span className="text-lg font-black text-white">
              {orders.filter((o) => o.status === 'Delivered').length}
            </span>
          </div>
          <div className="bg-white/10 rounded-xl p-2.5 text-center">
            <span className="text-[10px] text-rose-300 font-medium block">রিটার্ন / বাতিল</span>
            <span className="text-lg font-black text-white">
              {orders.filter((o) => o.status === 'Returned' || o.status === 'Cancelled').length}
            </span>
          </div>
          <div className="bg-white/10 rounded-xl p-2.5 text-center col-span-2 sm:col-span-1">
            <span className="text-[10px] text-teal-300 font-medium block">মোট ক্যাশ অন ডেলিভারি</span>
            <span className="text-lg font-black text-white">
              ৳{orders.reduce((sum, o) => (o.status !== 'Cancelled' && o.status !== 'Returned' ? sum + o.dueAmount : sum), 0).toLocaleString()}
            </span>
          </div>
        </div>
      </div>

      {/* Filter Tabs & Search */}
      <div className="bg-white rounded-2xl p-4 border border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-3 shadow-xs">
        <div className="w-full sm:w-80 relative">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="অর্ডার নং, কাস্টমার নাম, ফোন বা কুরিয়ার ট্র্যাকিং..."
            className="w-full pl-9 pr-3.5 py-2 rounded-xl border border-slate-300 text-xs sm:text-sm focus:ring-2 focus:ring-emerald-500 outline-none"
          />
        </div>

        <div className="flex items-center gap-2 overflow-x-auto w-full sm:w-auto pb-1 sm:pb-0">
          <button
            onClick={() => setFilterStatus('all')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all shrink-0 cursor-pointer ${
              filterStatus === 'all'
                ? 'bg-emerald-600 text-white shadow-xs'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            সকল অর্ডার ({orders.length})
          </button>
          <button
            onClick={() => setFilterStatus('Pending')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all shrink-0 cursor-pointer ${
              filterStatus === 'Pending'
                ? 'bg-amber-600 text-white shadow-xs'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            পেন্ডিং ({orders.filter((o) => o.status === 'Pending').length})
          </button>
          <button
            onClick={() => setFilterStatus('Handed to Courier')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all shrink-0 cursor-pointer ${
              filterStatus === 'Handed to Courier'
                ? 'bg-purple-600 text-white shadow-xs'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            কুরিয়ারে ({orders.filter((o) => o.status === 'Handed to Courier').length})
          </button>
          <button
            onClick={() => setFilterStatus('Delivered')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all shrink-0 cursor-pointer ${
              filterStatus === 'Delivered'
                ? 'bg-emerald-600 text-white shadow-xs'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            ডেলিভারি ({orders.filter((o) => o.status === 'Delivered').length})
          </button>
          <button
            onClick={() => setFilterStatus('Returned')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all shrink-0 cursor-pointer ${
              filterStatus === 'Returned'
                ? 'bg-rose-600 text-white shadow-xs'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            রিটার্ন ({orders.filter((o) => o.status === 'Returned').length})
          </button>
        </div>
      </div>

      {/* Orders List */}
      <div className="space-y-4">
        {filteredOrders.length === 0 ? (
          <div className="bg-white rounded-2xl p-12 text-center border border-dashed border-slate-200">
            <ShoppingCart className="w-12 h-12 text-slate-300 mx-auto mb-3" />
            <h4 className="text-base font-bold text-slate-800">কোন অর্ডার পাওয়া যায়নি</h4>
            <p className="text-xs text-slate-500 mt-1">সার্চ বা ফিল্টার পরিবর্তন করুন অথবা নতুন অর্ডার প্লেস করুন।</p>
          </div>
        ) : (
          filteredOrders.map((order) => {
            return (
              <div
                key={order.id}
                className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-xs hover:border-slate-300 transition-all p-4 sm:p-5 flex flex-col gap-4"
              >
                {/* Header Row: Order Number, Customer, Date, Status */}
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 pb-3 border-b border-slate-100">
                  <div className="flex items-center gap-3">
                    <span className="font-mono text-sm font-black text-slate-900 bg-slate-100 px-3 py-1 rounded-xl">
                      #{order.orderNumber}
                    </span>
                    <div>
                      <h3 className="font-bold text-base text-slate-900">{order.customerName}</h3>
                      <div className="flex items-center gap-3 text-xs text-slate-500">
                        <span className="flex items-center gap-1">
                          <Phone className="w-3 h-3 text-slate-400" />
                          {order.customerPhone}
                        </span>
                        <span className="flex items-center gap-1">
                          <MapPin className="w-3 h-3 text-slate-400" />
                          {order.customerAddress}, {order.district}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2.5 self-end sm:self-center">
                    {getStatusBadge(order.status)}
                    <span className="text-xs text-slate-400 font-medium">
                      {order.orderDate} ({order.orderTime})
                    </span>
                  </div>
                </div>

                {/* Items & Financial Breakdown */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
                  {/* Items List */}
                  <div className="sm:col-span-2 bg-slate-50 p-3 rounded-xl border border-slate-100 space-y-1.5">
                    <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">
                      অর্ডারকৃত পণ্যসমূহ:
                    </span>
                    {order.items.map((it, idx) => (
                      <div key={idx} className="flex justify-between items-center text-slate-700">
                        <div>
                          <strong className="text-slate-900">{it.itemNameBn || it.itemNameEn}</strong>
                          <span className="text-slate-500 ml-1">× {it.quantity} পিস</span>
                          {it.unitActualPrice !== it.unitDefaultPrice && (
                            <span className="ml-2 text-[10px] text-amber-700 bg-amber-100 px-1.5 py-0.2 rounded font-medium">
                              প্রকৃত দর: ৳{it.unitActualPrice} (নির্ধারিত: ৳{it.unitDefaultPrice})
                            </span>
                          )}
                        </div>
                        <span className="font-semibold text-slate-900">৳{it.totalSellingPrice.toLocaleString()}</span>
                      </div>
                    ))}
                    {order.notes && (
                      <p className="text-[11px] text-slate-500 pt-1 border-t border-slate-200">
                        নোট: {order.notes}
                      </p>
                    )}
                  </div>

                  {/* Financial Bill Card */}
                  <div className="bg-slate-50 p-3 rounded-xl border border-slate-100 space-y-1">
                    <div className="flex justify-between text-slate-600">
                      <span>সাবটোটাল:</span>
                      <span className="font-semibold text-slate-800">৳{order.subtotal.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between text-slate-600">
                      <span>ডেলিভারি চার্জ:</span>
                      <span className="font-semibold text-slate-800">৳{order.deliveryCharge.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between text-slate-600">
                      <span>অগ্রিম প্রাপ্ত:</span>
                      <span className="font-semibold text-emerald-700">৳{order.advancePaid.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between text-slate-900 font-bold pt-1 border-t border-slate-200">
                      <span>ক্যাশ অন ডেলিভারি:</span>
                      <span className="text-emerald-800 font-black">৳{order.dueAmount.toLocaleString()}</span>
                    </div>
                  </div>
                </div>

                {/* Courier Details (Visible when Handed to Courier or Entered) */}
                {order.courierService && (
                  <div className="bg-purple-50/70 p-3 rounded-xl border border-purple-200 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 text-xs">
                    <div className="flex items-center gap-2 text-purple-900">
                      <Truck className="w-4 h-4 text-purple-700 shrink-0" />
                      <span>
                        কুরিয়ার মাধ্যম: <strong>{order.courierService}</strong>
                      </span>
                      <span>•</span>
                      <span>
                        ট্র্যাকিং কোড: <strong className="font-mono">{order.courierTrackingCode || 'N/A'}</strong>
                      </span>
                      {order.courierScheduledDate && (
                        <>
                          <span>•</span>
                          <span>
                            সম্ভাব্য ডেলিভারি: <strong>{order.courierScheduledDate} {order.courierScheduledTime}</strong>
                          </span>
                        </>
                      )}
                    </div>

                    <button
                      type="button"
                      onClick={() => setCourierModalOrder(order)}
                      className="text-purple-700 hover:text-purple-900 font-bold underline cursor-pointer text-[11px]"
                    >
                      কুরিয়ার তথ্য এডিট
                    </button>
                  </div>
                )}

                {/* Bottom Actions: Invoice Button, Status Dropdown, Delete */}
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 pt-2 border-t border-slate-100">
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setSelectedInvoiceOrder(order)}
                      className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold shadow-xs transition-colors cursor-pointer"
                    >
                      <FileText className="w-3.5 h-3.5" />
                      ইনভয়েস দেখুন / প্রিন্ট (QR কোডসহ)
                    </button>

                    {/* Quick Courier Entry button if not entered */}
                    {!order.courierService && (
                      <button
                        type="button"
                        onClick={() => setCourierModalOrder(order)}
                        className="flex items-center gap-1 px-3 py-1.5 rounded-xl border border-slate-200 hover:bg-slate-100 text-xs font-medium text-slate-700 transition-colors cursor-pointer"
                      >
                        <Truck className="w-3.5 h-3.5 text-slate-500" />
                        কুরিয়ার বিবরণ যুক্ত করুন
                      </button>
                    )}
                  </div>

                  <div className="flex items-center gap-2 self-end sm:self-center">
                    <label className="text-xs text-slate-500 font-medium">স্ট্যাটাস:</label>
                    <select
                      value={order.status}
                      onChange={(e) => handleStatusChange(order, e.target.value as OrderStatus)}
                      className="px-2.5 py-1 rounded-xl border border-slate-300 text-xs font-bold bg-white outline-none cursor-pointer"
                    >
                      <option value="Pending">অর্ডার গৃহীত (Pending)</option>
                      <option value="Processing">প্রসেসিং (Processing)</option>
                      <option value="Handed to Courier">কুরিয়ারে হস্তান্তর (Handed to Courier)</option>
                      <option value="Delivered">ডেলিভারি সম্পন্ন (Delivered)</option>
                      <option value="Returned">রিটার্ন (Returned - স্টক ফেরত)</option>
                      <option value="Cancelled">বাতিল (Cancelled - স্টক ফেরত)</option>
                    </select>

                    <button
                      type="button"
                      onClick={() => setDeletingOrderId(order.id)}
                      className="p-1.5 rounded-xl text-rose-400 hover:text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
                      title="অর্ডারটি মুছে ফেলুন"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Add New Order Modal */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-xs overflow-y-auto">
          <div className="bg-white rounded-2xl max-w-2xl w-full p-6 shadow-2xl border border-slate-100 my-8">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <ShoppingCart className="w-5 h-5 text-emerald-700" />
                <h3 className="font-bold text-slate-900 text-lg">নতুন কাস্টমার অর্ডার এন্ট্রি</h3>
              </div>
              <button
                onClick={() => setIsAddModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-1.5 rounded-lg hover:bg-slate-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {orderFormError && (
              <div className="mt-3 p-3 rounded-xl bg-rose-50 border border-rose-200 text-xs text-rose-700 flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{orderFormError}</span>
              </div>
            )}

            <form onSubmit={handleCreateOrderSubmit} className="mt-4 space-y-4">
              {/* Customer Details */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    গ্রাহকের নাম <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={customerName}
                    onChange={(e) => setCustomerName(e.target.value)}
                    placeholder="যেমন: তানজিলা রহমান"
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 text-sm focus:ring-2 focus:ring-emerald-500 outline-none"
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    মোবাইল নম্বর <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={customerPhone}
                    onChange={(e) => setCustomerPhone(e.target.value)}
                    placeholder="01XXXXXXXXX"
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 text-sm focus:ring-2 focus:ring-emerald-500 outline-none"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="sm:col-span-2">
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    ডেলিভারি ঠিকানা <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={customerAddress}
                    onChange={(e) => setCustomerAddress(e.target.value)}
                    placeholder="বাড়ি নং, রোড নং, থানা/এলাকা"
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 text-sm focus:ring-2 focus:ring-emerald-500 outline-none"
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    জেলা / শহর
                  </label>
                  <select
                    value={district}
                    onChange={(e) => setDistrict(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 text-sm bg-white outline-none"
                  >
                    {DISTRICTS.map((d) => (
                      <option key={d} value={d}>
                        {d}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    অর্ডার সোর্স
                  </label>
                  <select
                    value={source}
                    onChange={(e) =>
                      setSource(
                        e.target.value as 'Facebook Page' | 'WhatsApp' | 'Marketplace' | 'Showroom' | 'Other'
                      )
                    }
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 text-sm bg-white outline-none"
                  >
                    <option value="Facebook Page">Facebook Page (NakshaLata)</option>
                    <option value="WhatsApp">WhatsApp Message</option>
                    <option value="Marketplace">Marketplace</option>
                    <option value="Showroom">Showroom / সরাসরি</option>
                    <option value="Other">অন্যান্য মাধ্যম</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    বিশেষ নোট (ঐচ্ছিক)
                  </label>
                  <input
                    type="text"
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="যেমন: দ্রুত ডেলিভারি দিতে হবে"
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 text-sm outline-none"
                  />
                </div>
              </div>

              {/* Items Table Section */}
              <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-800">
                    পণ্যের তালিকা (নির্ধারিত বিক্রয়মূল্য বনাম প্রকৃত বিক্রয়মূল্য)
                  </span>
                  <button
                    type="button"
                    onClick={handleAddItemRow}
                    className="text-xs text-emerald-700 hover:text-emerald-900 font-bold flex items-center gap-1 cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" /> পণ্য লাইন যোগ করুন
                  </button>
                </div>

                {selectedItems.map((entry, index) => {
                  const targetItem = inventory.find((i) => i.id === entry.itemId);
                  const { totalQty } = targetItem ? calculateItemStock(targetItem) : { totalQty: 0 };

                  return (
                    <div
                      key={index}
                      className="bg-white p-3 rounded-lg border border-slate-200 grid grid-cols-1 sm:grid-cols-12 gap-2.5 items-end text-xs"
                    >
                      <div className="sm:col-span-5">
                        <label className="block text-[10px] text-slate-500 mb-0.5">পণ্য সিলেক্ট করুন</label>
                        <select
                          value={entry.itemId}
                          onChange={(e) => handleItemChange(index, e.target.value)}
                          className="w-full px-2 py-1.5 rounded-lg border border-slate-300 text-xs bg-white outline-none"
                        >
                          {inventory.map((inv) => (
                            <option key={inv.id} value={inv.id}>
                              {inv.nameBn} ({inv.valuationMethod})
                            </option>
                          ))}
                        </select>
                        <span className="text-[10px] text-slate-400">
                          মজুদ: {totalQty} পিস • নির্ধারিত দর: ৳{targetItem?.defaultSellingPrice}
                        </span>
                      </div>

                      <div className="sm:col-span-2">
                        <label className="block text-[10px] text-slate-500 mb-0.5">পরিমাণ</label>
                        <input
                          type="number"
                          min="1"
                          max={totalQty > 0 ? totalQty : 1}
                          value={entry.quantity}
                          onChange={(e) => handleQtyChange(index, Number(e.target.value))}
                          className="w-full px-2 py-1.5 rounded-lg border border-slate-300 text-xs font-bold text-center outline-none"
                          required
                        />
                      </div>

                      <div className="sm:col-span-3">
                        <label className="block text-[10px] text-slate-500 mb-0.5">
                          প্রকৃত বিক্রয়মূল্য (একক)
                        </label>
                        <input
                          type="number"
                          min="0"
                          value={entry.unitActualPrice}
                          onChange={(e) => handleActualPriceChange(index, Number(e.target.value))}
                          className="w-full px-2 py-1.5 rounded-lg border border-slate-300 text-xs font-bold text-emerald-800 outline-none"
                          required
                        />
                      </div>

                      <div className="sm:col-span-2 flex items-center justify-between gap-1">
                        <div className="font-bold text-slate-900">
                          ৳{(entry.quantity * entry.unitActualPrice).toLocaleString()}
                        </div>
                        {selectedItems.length > 1 && (
                          <button
                            type="button"
                            onClick={() => handleRemoveItemRow(index)}
                            className="text-rose-500 hover:text-rose-700 p-1"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Delivery and Advance Payment */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    ডেলিভারি চার্জ (টাকা)
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={deliveryCharge}
                    onChange={(e) => setDeliveryCharge(Number(e.target.value))}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 text-sm outline-none"
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    অগ্রিম গ্রহণ (টাকা)
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={advancePaid}
                    onChange={(e) => setAdvancePaid(Number(e.target.value))}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 text-sm outline-none font-semibold text-emerald-700"
                  />
                </div>
              </div>

              <div className="pt-3 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="px-4 py-2.5 rounded-xl border border-slate-200 text-slate-700 hover:bg-slate-50 font-medium text-sm transition-all"
                >
                  বাতিল
                </button>
                <button
                  type="submit"
                  className="flex items-center gap-1.5 px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-medium text-sm shadow-md shadow-emerald-200 transition-all cursor-pointer"
                >
                  <Check className="w-4 h-4" />
                  অর্ডার প্লেস ও ইনভয়েস তৈরি
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Courier Modal */}
      <CourierModal
        order={courierModalOrder}
        isOpen={!!courierModalOrder}
        onClose={() => setCourierModalOrder(null)}
        onSave={(orderId, courierService, trackingCode, scheduledDate, scheduledTime) => {
          onUpdateCourierDetails(orderId, courierService, trackingCode, scheduledDate, scheduledTime);
        }}
      />

      {/* Invoice Modal */}
      <InvoiceModal
        order={selectedInvoiceOrder}
        settings={settings}
        isOpen={!!selectedInvoiceOrder}
        onClose={() => setSelectedInvoiceOrder(null)}
      />

      {/* Delete Order Confirmation */}
      <ConfirmModal
        isOpen={!!deletingOrderId}
        title="অর্ডারটি মুছে ফেলতে চান?"
        message="অর্ডার মুছে ফেললে যদি এটি ডেলিভারি না হয়ে থাকে, তবে কাটা স্টক পুনরায় স্বয়ংক্রিয়ভাবে ইনভেনটরি ব্যাচে যোগ হয়ে যাবে।"
        confirmText="মুছে ফেলুন"
        cancelText="বাতিল"
        onConfirm={handleConfirmDelete}
        onCancel={() => setDeletingOrderId(null)}
      />
    </div>
  );
};
