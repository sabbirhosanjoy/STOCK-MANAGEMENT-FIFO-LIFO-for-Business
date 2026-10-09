import React, { useState, useEffect } from 'react';
import { Truck, X, Calendar, Clock, Hash, Check } from 'lucide-react';
import { Order } from '../types';

interface CourierModalProps {
  order: Order | null;
  isOpen: boolean;
  onClose: () => void;
  onSave: (orderId: string, courierService: string, trackingCode: string, scheduledDate: string, scheduledTime: string) => void;
}

const COURIER_OPTIONS = [
  'Steadfast Courier',
  'Pathao Courier',
  'RedX Delivery',
  'Sundarban Courier',
  'Paperfly',
  'eCourier',
  'নিজস্ব ডেলিভারি ম্যান',
  'শোরুম সরাসরি পিকআপ',
];

export const CourierModal: React.FC<CourierModalProps> = ({
  order,
  isOpen,
  onClose,
  onSave,
}) => {
  const [courierService, setCourierService] = useState<string>('Steadfast Courier');
  const [trackingCode, setTrackingCode] = useState<string>('');
  const [scheduledDate, setScheduledDate] = useState<string>('');
  const [scheduledTime, setScheduledTime] = useState<string>('');

  useEffect(() => {
    if (order) {
      setCourierService(order.courierService || 'Steadfast Courier');
      setTrackingCode(order.courierTrackingCode || '');
      setScheduledDate(order.courierScheduledDate || new Date().toISOString().split('T')[0]);
      setScheduledTime(order.courierScheduledTime || '16:00');
    }
  }, [order]);

  if (!isOpen || !order) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave(order.id, courierService, trackingCode, scheduledDate, scheduledTime);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
      <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-100">
        <div className="flex items-center justify-between pb-4 border-b border-slate-100">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-100 text-amber-700 flex items-center justify-center">
              <Truck className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-slate-900 text-lg">কুরিয়ার ডেলিভারি ও ট্র্যাকিং এন্ট্রি</h3>
              <p className="text-xs text-slate-500">অর্ডার #{order.orderNumber} • {order.customerName}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 p-1.5 rounded-lg hover:bg-slate-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="mt-5 space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              কুরিয়ার সার্ভিস বা ডেলিভারি মাধ্যম <span className="text-rose-500">*</span>
            </label>
            <select
              value={courierService}
              onChange={(e) => setCourierService(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none bg-white font-medium"
              required
            >
              {COURIER_OPTIONS.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              কুরিয়ার ট্র্যাকিং নম্বর / কনসাইনমেন্ট কোড <span className="text-rose-500">*</span>
            </label>
            <div className="relative">
              <Hash className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
              <input
                type="text"
                value={trackingCode}
                onChange={(e) => setTrackingCode(e.target.value)}
                placeholder="উদাহরণ: ST-883921 / PTH-DHK-9021"
                className="w-full pl-10 pr-3.5 py-2.5 rounded-xl border border-slate-300 text-sm focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none"
                required
              />
            </div>
            <p className="text-[11px] text-slate-400 mt-1">
              কুরিয়ার ড্যাশবোর্ড থেকে পাওয়া পার্সেল ট্র্যাকিং আইডি দিন।
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                সম্ভাব্য ডেলিভারি তারিখ <span className="text-rose-500">*</span>
              </label>
              <div className="relative">
                <Calendar className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                <input
                  type="date"
                  value={scheduledDate}
                  onChange={(e) => setScheduledDate(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 rounded-xl border border-slate-300 text-sm focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none"
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                সম্ভাব্য ডেলিভারি সময়সূচি <span className="text-rose-500">*</span>
              </label>
              <div className="relative">
                <Clock className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                <input
                  type="time"
                  value={scheduledTime}
                  onChange={(e) => setScheduledTime(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 rounded-xl border border-slate-300 text-sm focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none"
                  required
                />
              </div>
            </div>
          </div>

          <div className="bg-amber-50 rounded-xl p-3 border border-amber-200 text-xs text-amber-800 leading-relaxed">
            💡 <strong>মনে রাখুন:</strong> কুরিয়ার প্রক্রিয়া ও সময়সূচি আপনার অভ্যন্তরীণ ট্র্যাকিং এবং ডেলিভারি রিপোর্টে সংরক্ষিত থাকবে; গ্রাহকের মূল ইনভয়েসে এটি দৃশ্যমান হবে না।
          </div>

          <div className="pt-3 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 rounded-xl border border-slate-200 text-slate-700 hover:bg-slate-50 font-medium text-sm transition-all"
            >
              বাতিল
            </button>
            <button
              type="submit"
              className="flex items-center gap-1.5 px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-medium text-sm shadow-md shadow-emerald-200 transition-all"
            >
              <Check className="w-4 h-4" />
              সংরক্ষণ করুন
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
