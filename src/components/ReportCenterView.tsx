import React, { useState } from 'react';
import {
  FileSpreadsheet,
  Printer,
  Download,
  Calendar,
  Layers,
  TrendingUp,
  Truck,
  RotateCcw,
  CheckSquare,
  Square,
  DollarSign,
  Package,
  FileText
} from 'lucide-react';
import {
  Order,
  InventoryItem,
  ExpenseItem,
  BusinessSettings,
} from '../types';
import { calculateItemStock } from '../services/fifoLifoEngine';

interface ReportCenterViewProps {
  orders: Order[];
  inventory: InventoryItem[];
  expenses: ExpenseItem[];
  settings: BusinessSettings;
}

type ReportType = 'profit_loss' | 'stock' | 'courier' | 'returns' | 'all';

export const ReportCenterView: React.FC<ReportCenterViewProps> = ({
  orders,
  inventory,
  expenses,
  settings,
}) => {
  const todayStr = new Date().toISOString().split('T')[0];

  // First day of current month
  const firstDayOfMonth = new Date(new Date().getFullYear(), new Date().getMonth(), 1)
    .toISOString()
    .split('T')[0];

  const [fromDate, setFromDate] = useState<string>(firstDayOfMonth);
  const [toDate, setToDate] = useState<string>(todayStr);
  const [selectedReportType, setSelectedReportType] = useState<ReportType>('all');

  // Quick date presets
  const handlePreset = (type: 'today' | '7days' | 'this_month' | 'last_month' | 'all') => {
    const now = new Date();
    if (type === 'today') {
      setFromDate(todayStr);
      setToDate(todayStr);
    } else if (type === '7days') {
      const past7 = new Date(Date.now() - 6 * 86400000).toISOString().split('T')[0];
      setFromDate(past7);
      setToDate(todayStr);
    } else if (type === 'this_month') {
      setFromDate(firstDayOfMonth);
      setToDate(todayStr);
    } else if (type === 'last_month') {
      const prevMonthFirst = new Date(now.getFullYear(), now.getMonth() - 1, 1)
        .toISOString()
        .split('T')[0];
      const prevMonthLast = new Date(now.getFullYear(), now.getMonth(), 0)
        .toISOString()
        .split('T')[0];
      setFromDate(prevMonthFirst);
      setToDate(prevMonthLast);
    } else if (type === 'all') {
      setFromDate('2025-01-01');
      setToDate(todayStr);
    }
  };

  // Filter orders by date range
  const filteredOrders = orders.filter((o) => {
    return o.orderDate >= fromDate && o.orderDate <= toDate;
  });

  // Filter expenses by date range
  const filteredExpenses = expenses.filter((e) => {
    return e.date >= fromDate && e.date <= toDate;
  });

  // Financial Calculations for the selected date range
  const validOrders = filteredOrders.filter((o) => o.status !== 'Cancelled' && o.status !== 'Returned');
  const returnedOrders = filteredOrders.filter((o) => o.status === 'Returned' || o.status === 'Cancelled');

  const totalRevenue = validOrders.reduce((sum, o) => sum + o.subtotal, 0);
  const totalCogs = validOrders.reduce((sum, o) => sum + o.cogsTotal, 0);
  const grossProfit = totalRevenue - totalCogs;
  const totalExpenses = filteredExpenses.reduce((sum, e) => sum + e.amount, 0);
  const netProfit = grossProfit - totalExpenses;

  // Item-wise sales & actual selling price analytics
  interface ItemSalesStat {
    itemId: string;
    nameBn: string;
    nameEn: string;
    method: string;
    defaultPrice: number;
    totalQtySold: number;
    totalRevenue: number;
    totalCogs: number;
    actualPrices: number[];
  }

  const itemSalesMap: Record<string, ItemSalesStat> = {};

  validOrders.forEach((o) => {
    o.items.forEach((item) => {
      if (!itemSalesMap[item.itemId]) {
        const inv = inventory.find((i) => i.id === item.itemId);
        itemSalesMap[item.itemId] = {
          itemId: item.itemId,
          nameBn: item.itemNameBn,
          nameEn: item.itemNameEn,
          method: inv?.valuationMethod || 'FIFO',
          defaultPrice: item.unitDefaultPrice,
          totalQtySold: 0,
          totalRevenue: 0,
          totalCogs: 0,
          actualPrices: [],
        };
      }
      itemSalesMap[item.itemId].totalQtySold += item.quantity;
      itemSalesMap[item.itemId].totalRevenue += item.totalSellingPrice;
      itemSalesMap[item.itemId].totalCogs += item.totalCostPrice;
      itemSalesMap[item.itemId].actualPrices.push(item.unitActualPrice);
    });
  });

  const itemSalesList = Object.values(itemSalesMap);

  // CSV Export
  const handleExportCSV = () => {
    let csvContent = 'data:text/csv;charset=utf-8,\uFEFF';
    csvContent += `প্রতিষ্ঠান: ${settings.businessNameBn} (${settings.businessNameEn})\n`;
    csvContent += `রিপোর্টের সময়সীমা: ${fromDate} থেকে ${toDate}\n\n`;

    if (selectedReportType === 'profit_loss' || selectedReportType === 'all') {
      csvContent += `--- লাভ-ক্ষতি ও আইটেম বিশ্লেষণ রিপোর্ট ---\n`;
      csvContent += `পণ্য,লেজার মেথড,নির্ধারিত বিক্রয়মূল্য (একক),প্রকৃত গড় বিক্রয়মূল্য,বিক্রিত পরিমাণ,মোট বিক্রয়মূল্য,ক্রয়মূল্য (COGS),প্রকৃত লাভ\n`;
      itemSalesList.forEach((stat) => {
        const avgActualPrice = stat.totalQtySold > 0 ? Math.round(stat.totalRevenue / stat.totalQtySold) : 0;
        const profit = stat.totalRevenue - stat.totalCogs;
        csvContent += `"${stat.nameBn}",${stat.method},${stat.defaultPrice},${avgActualPrice},${stat.totalQtySold},${stat.totalRevenue},${stat.totalCogs},${profit}\n`;
      });
      csvContent += `\nমোট বিক্রয় (Revenue),${totalRevenue}\nমোট ক্রয়মূল্য (COGS),${totalCogs}\nমোট পরিচালন ব্যয় (Expenses),${totalExpenses}\nনিট লাভ/ক্ষতি (Net Profit),${netProfit}\n\n`;
    }

    if (selectedReportType === 'courier' || selectedReportType === 'all') {
      csvContent += `--- কুরিয়ার ও ডেলিভারি রিপোর্ট ---\n`;
      csvContent += `অর্ডার নং,গ্রাহকের নাম,মোবাইল,ঠিকানা,কুরিয়ার সার্ভিস,ট্র্যাকিং কোড,সম্ভাব্য ডেলিভারি,বিল,বকেয়া (COD),স্ট্যাটাস\n`;
      filteredOrders.forEach((o) => {
        csvContent += `"${o.orderNumber}","${o.customerName}","${o.customerPhone}","${o.customerAddress} ${o.district}","${o.courierService || 'N/A'}","${o.courierTrackingCode || 'N/A'}","${o.courierScheduledDate || ''} ${o.courierScheduledTime || ''}",${o.totalAmount},${o.dueAmount},"${o.status}"\n`;
      });
      csvContent += `\n`;
    }

    if (selectedReportType === 'stock' || selectedReportType === 'all') {
      csvContent += `--- স্টক ভ্যালুয়েশন রিপোর্ট ---\n`;
      csvContent += `পণ্য,SKU,ক্যাটাগরি,পদ্ধতি,বর্তমান মজুদ (পিস),গড় ক্রয়মূল্য,বর্তমান মোট ভ্যালু\n`;
      inventory.forEach((inv) => {
        const { totalQty, totalValuation, averageCostPrice } = calculateItemStock(inv);
        csvContent += `"${inv.nameBn}","${inv.sku}","${inv.category}",${inv.valuationMethod},${totalQty},${Math.round(averageCostPrice)},${totalValuation}\n`;
      });
    }

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `NakshaLata_Report_${fromDate}_to_${toDate}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handlePrintReport = () => {
    window.print();
  };

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-emerald-950 via-teal-900 to-slate-900 rounded-3xl p-6 sm:p-8 text-white shadow-xl relative overflow-hidden no-print">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-6 relative z-10">
          <div>
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-0.5 rounded-full bg-emerald-400/20 text-emerald-300 border border-emerald-400/30 text-xs font-semibold">
                তারিখ ভিত্তিক রিপোর্ট কেন্দ্র (Report Center)
              </span>
              <span className="text-xs text-slate-300">
                প্রতিষ্ঠান: <strong className="text-white">{settings.businessNameBn}</strong>
              </span>
            </div>
            <h2 className="text-2xl sm:text-3xl font-black mt-2 tracking-tight">
              তারিখ ভিত্তিক পৃথক ও সমন্বিত রিপোর্ট জেনারেশন
            </h2>
            <p className="text-slate-300 text-xs sm:text-sm mt-1 max-w-xl">
              যেকোনো নির্দিষ্ট তারিখ হতে নির্দিষ্ট তারিখ পর্যন্ত লাভ-ক্ষতি রিপোর্ট, স্টক রিপোর্ট, অর্ডার ডেলিভারি অথবা রিটার্ন রিপোর্ট পৃথকভাবে বা একসাথে প্রিন্ট ও এক্সেল CSV ফাইলে ডাউনলোড করুন।
            </p>
          </div>

          <div className="flex items-center gap-3 shrink-0">
            <button
              onClick={handleExportCSV}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white/10 hover:bg-white/20 text-white font-bold text-xs sm:text-sm border border-white/20 transition-all cursor-pointer"
            >
              <Download className="w-4 h-4" />
              CSV (Excel) ডাউনলোড
            </button>
            <button
              onClick={handlePrintReport}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs sm:text-sm shadow-lg shadow-emerald-500/25 transition-all cursor-pointer"
            >
              <Printer className="w-4 h-4" />
              রিপোর্ট প্রিন্ট / PDF
            </button>
          </div>
        </div>
      </div>

      {/* Date Range Selection & Quick Filters */}
      <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs space-y-4 no-print">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3 flex-wrap">
            <div className="flex items-center gap-2">
              <Calendar className="w-4 h-4 text-emerald-700" />
              <label className="text-xs font-bold text-slate-700">শুরুর তারিখ (From):</label>
              <input
                type="date"
                value={fromDate}
                onChange={(e) => setFromDate(e.target.value)}
                className="px-3 py-1.5 rounded-xl border border-slate-300 text-xs font-medium outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>

            <div className="flex items-center gap-2">
              <label className="text-xs font-bold text-slate-700">শেষ তারিখ (To):</label>
              <input
                type="date"
                value={toDate}
                onChange={(e) => setToDate(e.target.value)}
                className="px-3 py-1.5 rounded-xl border border-slate-300 text-xs font-medium outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>
          </div>

          {/* Quick Date Buttons */}
          <div className="flex items-center gap-1.5 flex-wrap">
            <button
              onClick={() => handlePreset('today')}
              className="px-2.5 py-1 rounded-lg text-xs font-medium bg-slate-100 hover:bg-slate-200 text-slate-700 cursor-pointer"
            >
              আজকে
            </button>
            <button
              onClick={() => handlePreset('7days')}
              className="px-2.5 py-1 rounded-lg text-xs font-medium bg-slate-100 hover:bg-slate-200 text-slate-700 cursor-pointer"
            >
              গত ৭ দিন
            </button>
            <button
              onClick={() => handlePreset('this_month')}
              className="px-2.5 py-1 rounded-lg text-xs font-medium bg-slate-100 hover:bg-slate-200 text-slate-700 cursor-pointer"
            >
              এই মাস
            </button>
            <button
              onClick={() => handlePreset('last_month')}
              className="px-2.5 py-1 rounded-lg text-xs font-medium bg-slate-100 hover:bg-slate-200 text-slate-700 cursor-pointer"
            >
              গত মাস
            </button>
            <button
              onClick={() => handlePreset('all')}
              className="px-2.5 py-1 rounded-lg text-xs font-medium bg-slate-100 hover:bg-slate-200 text-slate-700 cursor-pointer"
            >
              সব সময়
            </button>
          </div>
        </div>

        {/* Report Type Selector Tabs */}
        <div className="pt-3 border-t border-slate-100 flex items-center gap-2 overflow-x-auto pb-1">
          <span className="text-xs font-bold text-slate-500 shrink-0">রিপোর্টের ধরন:</span>

          <button
            onClick={() => setSelectedReportType('all')}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all shrink-0 cursor-pointer flex items-center gap-1.5 ${
              selectedReportType === 'all'
                ? 'bg-slate-900 text-white shadow-xs'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            <CheckSquare className="w-3.5 h-3.5 text-emerald-400" />
            একসাথে সবগুলো (Combined Full Report)
          </button>

          <button
            onClick={() => setSelectedReportType('profit_loss')}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all shrink-0 cursor-pointer flex items-center gap-1.5 ${
              selectedReportType === 'profit_loss'
                ? 'bg-emerald-600 text-white shadow-xs'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            <TrendingUp className="w-3.5 h-3.5" />
            শুধুমাত্র লাভ-ক্ষতি ও বিক্রয়মূল্য রিপোর্ট
          </button>

          <button
            onClick={() => setSelectedReportType('stock')}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all shrink-0 cursor-pointer flex items-center gap-1.5 ${
              selectedReportType === 'stock'
                ? 'bg-teal-600 text-white shadow-xs'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            <Package className="w-3.5 h-3.5" />
            শুধুমাত্র স্টক ও মজুদ রিপোর্ট
          </button>

          <button
            onClick={() => setSelectedReportType('courier')}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all shrink-0 cursor-pointer flex items-center gap-1.5 ${
              selectedReportType === 'courier'
                ? 'bg-purple-600 text-white shadow-xs'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            <Truck className="w-3.5 h-3.5" />
            শুধুমাত্র কুরিয়ার ও ডেলিভারি রিপোর্ট
          </button>

          <button
            onClick={() => setSelectedReportType('returns')}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all shrink-0 cursor-pointer flex items-center gap-1.5 ${
              selectedReportType === 'returns'
                ? 'bg-rose-600 text-white shadow-xs'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            <RotateCcw className="w-3.5 h-3.5" />
            শুধুমাত্র রিটার্ন ও বাতিল রিপোর্ট
          </button>
        </div>
      </div>

      {/* PRINTABLE REPORT DOCUMENT WRAPPER */}
      <div id="full-report-area" className="bg-white rounded-2xl p-6 sm:p-8 border border-slate-200 shadow-sm space-y-8 text-slate-800">
        {/* Report Official Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start gap-4 pb-6 border-b-2 border-slate-200">
          <div>
            <div className="flex items-center gap-2">
              <span className="w-8 h-8 rounded-lg bg-emerald-700 text-white flex items-center justify-center font-bold text-lg">
                ন
              </span>
              <div>
                <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
                  {settings.businessNameBn}
                </h1>
                <span className="text-xs uppercase font-bold text-emerald-800">
                  {settings.businessNameEn} • অফিসিয়াল অডিট রিপোর্ট
                </span>
              </div>
            </div>
            <p className="text-xs text-slate-500 mt-1">{settings.address} • হটলাইন: {settings.phone}</p>
          </div>

          <div className="text-left sm:text-right">
            <span className="inline-block px-3 py-1 rounded-full bg-slate-100 text-slate-800 text-xs font-bold">
              তারিখ পরিসীমা: {fromDate} থেকে {toDate}
            </span>
            <p className="text-xs text-slate-400 mt-1">
              রিপোর্ট তৈরির সময়: {todayStr} ({new Date().toLocaleTimeString('en-US')})
            </p>
          </div>
        </div>

        {/* SECTION 1: PROFIT & LOSS REPORT (লাভ-ক্ষতি ও বিক্রয়মূল্য রিপোর্ট) */}
        {(selectedReportType === 'profit_loss' || selectedReportType === 'all') && (
          <div className="space-y-4 print-card">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <TrendingUp className="w-5 h-5 text-emerald-700" />
                <h3 className="text-base sm:text-lg font-bold text-slate-900">
                  ১. লাভ-ক্ষতি ও আইটেম ভিত্তিক বিক্রয়মূল্য বিশ্লেষণ রিপোর্ট
                </h3>
              </div>
              <span className="text-xs font-bold text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-lg border border-emerald-200">
                নিট মুনাফা: ৳{netProfit.toLocaleString()}
              </span>
            </div>

            {/* Financial Overview Cards */}
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
              <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 text-center">
                <span className="text-[11px] text-slate-500 font-medium block">মোট পণ্য বিক্রয়</span>
                <span className="text-base sm:text-lg font-black text-slate-900">৳{totalRevenue.toLocaleString()}</span>
              </div>
              <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 text-center">
                <span className="text-[11px] text-slate-500 font-medium block">ক্রয়মূল্য (FIFO/LIFO COGS)</span>
                <span className="text-base sm:text-lg font-black text-slate-800">৳{totalCogs.toLocaleString()}</span>
              </div>
              <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 text-center">
                <span className="text-[11px] text-emerald-700 font-medium block">মোট লাভ (Gross Profit)</span>
                <span className="text-base sm:text-lg font-black text-emerald-700">৳{grossProfit.toLocaleString()}</span>
              </div>
              <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 text-center">
                <span className="text-[11px] text-rose-600 font-medium block">পরিচালন খরচ (Expenses)</span>
                <span className="text-base sm:text-lg font-black text-rose-600">৳{totalExpenses.toLocaleString()}</span>
              </div>
              <div className="bg-emerald-600 text-white p-3 rounded-xl text-center col-span-2 sm:col-span-1 shadow-xs">
                <span className="text-[11px] font-medium block opacity-90">নিট ব্যবসায়িক লাভ</span>
                <span className="text-base sm:text-lg font-black">৳{netProfit.toLocaleString()}</span>
              </div>
            </div>

            {/* Item-wise Expected Selling Price vs Actual Selling Price Table */}
            <div className="overflow-x-auto border border-slate-200 rounded-xl">
              <table className="w-full text-xs text-left">
                <thead className="bg-slate-100 text-slate-700 font-bold border-b border-slate-200">
                  <tr>
                    <th className="py-2.5 px-3">পণ্যের নাম</th>
                    <th className="py-2.5 px-3 text-center">লেজার পদ্ধতি</th>
                    <th className="py-2.5 px-3 text-right">নির্ধারিত বিক্রয়মূল্য</th>
                    <th className="py-2.5 px-3 text-right bg-emerald-50/70 text-emerald-900">প্রকৃত বিক্রয়মূল্য (গড়)</th>
                    <th className="py-2.5 px-3 text-center">বিক্রিত পরিমাণ</th>
                    <th className="py-2.5 px-3 text-right">মোট বিক্রয়মূল্য</th>
                    <th className="py-2.5 px-3 text-right">ক্রয়মূল্য (COGS)</th>
                    <th className="py-2.5 px-3 text-right font-bold">প্রকৃত লাভ</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {itemSalesList.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="py-6 text-center text-slate-400">
                        নির্বাচিত তারিখের মধ্যে কোনো পণ্য বিক্রয় হয়নি।
                      </td>
                    </tr>
                  ) : (
                    itemSalesList.map((stat, idx) => {
                      const avgActualPrice = stat.totalQtySold > 0 ? Math.round(stat.totalRevenue / stat.totalQtySold) : 0;
                      const itemProfit = stat.totalRevenue - stat.totalCogs;
                      const hasPriceDiff = avgActualPrice !== stat.defaultPrice;

                      return (
                        <tr key={idx} className="hover:bg-slate-50">
                          <td className="py-2.5 px-3 font-semibold text-slate-900">
                            {stat.nameBn}
                          </td>
                          <td className="py-2.5 px-3 text-center">
                            <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-100 text-slate-700">
                              {stat.method}
                            </span>
                          </td>
                          <td className="py-2.5 px-3 text-right text-slate-600 font-medium">
                            ৳{stat.defaultPrice.toLocaleString()}
                          </td>
                          <td className="py-2.5 px-3 text-right bg-emerald-50/50 font-bold text-emerald-800">
                            ৳{avgActualPrice.toLocaleString()}
                            {hasPriceDiff && (
                              <span className="block text-[10px] font-normal text-amber-600">
                                {avgActualPrice < stat.defaultPrice ? `(৳${stat.defaultPrice - avgActualPrice} ডিসকাউন্ট)` : `(৳${avgActualPrice - stat.defaultPrice} প্রিমিয়াম)`}
                              </span>
                            )}
                          </td>
                          <td className="py-2.5 px-3 text-center font-bold text-slate-900">
                            {stat.totalQtySold}
                          </td>
                          <td className="py-2.5 px-3 text-right font-semibold text-slate-900">
                            ৳{stat.totalRevenue.toLocaleString()}
                          </td>
                          <td className="py-2.5 px-3 text-right text-slate-700">
                            ৳{stat.totalCogs.toLocaleString()}
                          </td>
                          <td className="py-2.5 px-3 text-right font-bold text-emerald-700">
                            ৳{itemProfit.toLocaleString()}
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* SECTION 2: STOCK & INVENTORY VALUATION REPORT (স্টক ও মজুদ রিপোর্ট) */}
        {(selectedReportType === 'stock' || selectedReportType === 'all') && (
          <div className="space-y-4 print-card pt-4 border-t border-slate-200">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Package className="w-5 h-5 text-teal-700" />
                <h3 className="text-base sm:text-lg font-bold text-slate-900">
                  ২. বর্তমান স্টক ভ্যালুয়েশন ও মজুদ লেজার রিপোর্ট
                </h3>
              </div>
              <span className="text-xs text-slate-500">
                মোট আইটেম: {inventory.length} টি
              </span>
            </div>

            <div className="overflow-x-auto border border-slate-200 rounded-xl">
              <table className="w-full text-xs text-left">
                <thead className="bg-slate-100 text-slate-700 font-bold border-b border-slate-200">
                  <tr>
                    <th className="py-2.5 px-3">SKU</th>
                    <th className="py-2.5 px-3">পণ্যের নাম</th>
                    <th className="py-2.5 px-3">ক্যাটাগরি</th>
                    <th className="py-2.5 px-3 text-center">লেজার পদ্ধতি</th>
                    <th className="py-2.5 px-3 text-center">বর্তমান মজুদ (পিস)</th>
                    <th className="py-2.5 px-3 text-right">গড় ক্রয়মূল্য</th>
                    <th className="py-2.5 px-3 text-right">নির্ধারিত বিক্রয়মূল্য</th>
                    <th className="py-2.5 px-3 text-right font-bold">মোট বর্তমান ভ্যালু</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {inventory.map((inv) => {
                    const { totalQty, totalValuation, averageCostPrice } = calculateItemStock(inv);
                    return (
                      <tr key={inv.id} className="hover:bg-slate-50">
                        <td className="py-2.5 px-3 font-mono font-bold text-slate-600">{inv.sku}</td>
                        <td className="py-2.5 px-3 font-semibold text-slate-900">{inv.nameBn}</td>
                        <td className="py-2.5 px-3 text-slate-600">{inv.category}</td>
                        <td className="py-2.5 px-3 text-center">
                          <span
                            className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                              inv.valuationMethod === 'FIFO'
                                ? 'bg-emerald-100 text-emerald-800'
                                : 'bg-purple-100 text-purple-800'
                            }`}
                          >
                            {inv.valuationMethod}
                          </span>
                        </td>
                        <td className="py-2.5 px-3 text-center font-bold text-slate-900">{totalQty}</td>
                        <td className="py-2.5 px-3 text-right text-slate-700">৳{Math.round(averageCostPrice).toLocaleString()}</td>
                        <td className="py-2.5 px-3 text-right text-slate-700">৳{inv.defaultSellingPrice.toLocaleString()}</td>
                        <td className="py-2.5 px-3 text-right font-bold text-teal-800">৳{totalValuation.toLocaleString()}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* SECTION 3: ORDERS & COURIER DELIVERY REPORT (কুরিয়ার ও ডেলিভারি রিপোর্ট) */}
        {(selectedReportType === 'courier' || selectedReportType === 'all') && (
          <div className="space-y-4 print-card pt-4 border-t border-slate-200">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Truck className="w-5 h-5 text-purple-700" />
                <h3 className="text-base sm:text-lg font-bold text-slate-900">
                  ৩. অর্ডার ও কুরিয়ার ট্র্যাকিং ডেলিভারি রিপোর্ট
                </h3>
              </div>
              <span className="text-xs text-slate-500">
                মোট অর্ডার: {filteredOrders.length} টি
              </span>
            </div>

            <div className="overflow-x-auto border border-slate-200 rounded-xl">
              <table className="w-full text-xs text-left">
                <thead className="bg-slate-100 text-slate-700 font-bold border-b border-slate-200">
                  <tr>
                    <th className="py-2.5 px-3">অর্ডার নং</th>
                    <th className="py-2.5 px-3">তারিখ</th>
                    <th className="py-2.5 px-3">গ্রাহক ও জেলা</th>
                    <th className="py-2.5 px-3">কুরিয়ার মাধ্যম</th>
                    <th className="py-2.5 px-3 font-mono">ট্র্যাকিং কোড</th>
                    <th className="py-2.5 px-3">সম্ভাব্য ডেলিভারি</th>
                    <th className="py-2.5 px-3 text-right">বকেয়া (COD)</th>
                    <th className="py-2.5 px-3 text-center">স্ট্যাটাস</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {filteredOrders.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="py-6 text-center text-slate-400">
                        নির্বাচিত তারিখের মধ্যে কোনো অর্ডার নেই।
                      </td>
                    </tr>
                  ) : (
                    filteredOrders.map((ord) => (
                      <tr key={ord.id} className="hover:bg-slate-50">
                        <td className="py-2.5 px-3 font-mono font-bold text-slate-900">#{ord.orderNumber}</td>
                        <td className="py-2.5 px-3 text-slate-600">{ord.orderDate}</td>
                        <td className="py-2.5 px-3 font-semibold text-slate-800">
                          {ord.customerName} ({ord.district})
                        </td>
                        <td className="py-2.5 px-3 text-slate-700">{ord.courierService || 'N/A'}</td>
                        <td className="py-2.5 px-3 font-mono text-purple-700 font-semibold">{ord.courierTrackingCode || '-'}</td>
                        <td className="py-2.5 px-3 text-slate-600">
                          {ord.courierScheduledDate ? `${ord.courierScheduledDate} ${ord.courierScheduledTime}` : '-'}
                        </td>
                        <td className="py-2.5 px-3 text-right font-bold text-slate-900">৳{ord.dueAmount.toLocaleString()}</td>
                        <td className="py-2.5 px-3 text-center">
                          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-100 text-slate-700">
                            {ord.status}
                          </span>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* SECTION 4: RETURNS & CANCELLATION REPORT (রিটার্ন ও বাতিল রিপোর্ট) */}
        {(selectedReportType === 'returns' || selectedReportType === 'all') && (
          <div className="space-y-4 print-card pt-4 border-t border-slate-200">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <RotateCcw className="w-5 h-5 text-rose-700" />
                <h3 className="text-base sm:text-lg font-bold text-slate-900">
                  ৪. রিটার্ন ও বাতিল অর্ডার রিপোর্ট
                </h3>
              </div>
              <span className="text-xs text-rose-600 font-bold">
                রিটার্ন/বাতিল: {returnedOrders.length} টি
              </span>
            </div>

            <div className="overflow-x-auto border border-slate-200 rounded-xl">
              <table className="w-full text-xs text-left">
                <thead className="bg-slate-100 text-slate-700 font-bold border-b border-slate-200">
                  <tr>
                    <th className="py-2.5 px-3">অর্ডার নং</th>
                    <th className="py-2.5 px-3">তারিখ</th>
                    <th className="py-2.5 px-3">গ্রাহকের নাম ও ফোন</th>
                    <th className="py-2.5 px-3">ফেরত যাওয়া পণ্য</th>
                    <th className="py-2.5 px-3 text-right">মূল্য</th>
                    <th className="py-2.5 px-3 text-center">স্টক পুনরুদ্ধার স্ট্যাটাস</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {returnedOrders.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="py-6 text-center text-slate-400">
                        নির্বাচিত সময়সীমায় কোনো রিটার্ন বা বাতিল অর্ডার নেই (উৎকৃষ্ট সাফল্য!)।
                      </td>
                    </tr>
                  ) : (
                    returnedOrders.map((ord) => (
                      <tr key={ord.id} className="hover:bg-slate-50">
                        <td className="py-2.5 px-3 font-mono font-bold text-rose-700">#{ord.orderNumber}</td>
                        <td className="py-2.5 px-3 text-slate-600">{ord.orderDate}</td>
                        <td className="py-2.5 px-3 text-slate-800 font-medium">
                          {ord.customerName} ({ord.customerPhone})
                        </td>
                        <td className="py-2.5 px-3 text-slate-700">
                          {ord.items.map((i) => `${i.itemNameBn} (${i.quantity}টি)`).join(', ')}
                        </td>
                        <td className="py-2.5 px-3 text-right font-bold text-slate-900">৳{ord.totalAmount.toLocaleString()}</td>
                        <td className="py-2.5 px-3 text-center">
                          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-800">
                            স্টক ব্যাচে ফেরত যোগ হয়েছে
                          </span>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Report Official Footer Signature */}
        <div className="pt-8 border-t border-dashed border-slate-300 flex justify-between items-end text-xs text-slate-500">
          <div>
            <p className="font-semibold text-slate-700">{settings.businessNameBn} - অভ্যন্তরীণ ব্যবস্থাপনা সিস্টেম</p>
            <p className="text-[11px] text-slate-400">রিপোর্ট প্রিন্ট ও জেনারেট সম্পন্ন</p>
          </div>
          <div className="text-center">
            <div className="w-36 border-b border-slate-400 mb-1"></div>
            <p className="font-bold text-slate-700">হিসাবরক্ষক / পরিচালক স্বাক্ষর</p>
          </div>
        </div>
      </div>
    </div>
  );
};
