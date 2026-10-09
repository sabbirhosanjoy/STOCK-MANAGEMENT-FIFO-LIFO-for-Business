import React, { useEffect, useState, useRef } from 'react';
import QRCode from 'qrcode';
import { Printer, Copy, Check, X, QrCode as QrIcon } from 'lucide-react';
import { Order, BusinessSettings } from '../types';

interface InvoiceModalProps {
  order: Order | null;
  settings: BusinessSettings;
  isOpen: boolean;
  onClose: () => void;
}

export const InvoiceModal: React.FC<InvoiceModalProps> = ({
  order,
  settings,
  isOpen,
  onClose,
}) => {
  const [qrDataUrl, setQrDataUrl] = useState<string>('');
  const [copied, setCopied] = useState<boolean>(false);
  const printContentRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (order) {
      // QR Code payload containing order number, customer name, bill details, and NakshaLata
      const qrPayload = JSON.stringify({
        org: `${settings.businessNameEn} - ${settings.businessNameBn}`,
        invoiceNo: order.orderNumber,
        customer: order.customerName,
        phone: order.customerPhone,
        total: `৳${order.totalAmount}`,
        due: `৳${order.dueAmount}`,
        date: order.orderDate,
      });

      QRCode.toDataURL(qrPayload, {
        width: 140,
        margin: 1,
        color: {
          dark: '#0f172a',
          light: '#ffffff',
        },
      })
        .then((url) => setQrDataUrl(url))
        .catch((err) => console.error('QR code generation error:', err));
    }
  }, [order, settings]);

  if (!isOpen || !order) return null;

  const handlePrint = () => {
    window.print();
  };

  const handleCopyMessengerText = () => {
    const text = `🌸 ${settings.businessNameBn} (${settings.businessNameEn}) 🌸
অফিসিয়াল ইনভয়েস ও অর্ডার নিশ্চিতকরণ

অর্ডার নম্বর: ${order.orderNumber}
তারিখ: ${order.orderDate} | সময়: ${order.orderTime}

গ্রাহকের নাম: ${order.customerName}
ফোন: ${order.customerPhone}
ঠিকানা: ${order.customerAddress}, ${order.district}

আইটেম বিবরণ:
${order.items
  .map(
    (item, idx) =>
      `${idx + 1}. ${item.itemNameBn || item.itemNameEn} - ${item.quantity}টি × ৳${item.unitActualPrice} = ৳${item.totalSellingPrice}`
  )
  .join('\n')}

মোট পণ্য মূল্য: ৳${order.subtotal}
ডেলিভারি চার্জ: ৳${order.deliveryCharge}
মোট প্রদেয়: ৳${order.totalAmount}
অগ্রিম প্রাপ্ত: ৳${order.advancePaid}
ক্যাশ অন ডেলিভারি (বকেয়া): ৳${order.dueAmount}

${settings.invoiceFooterNote}
পেইজ: ${settings.facebookPageUrl} | ফোন: ${settings.phone}`;

    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-xs overflow-y-auto">
      <div className="bg-white rounded-2xl max-w-2xl w-full shadow-2xl border border-slate-100 my-8 overflow-hidden flex flex-col max-h-[92vh]">
        {/* Modal Top Bar (Hidden during print) */}
        <div className="flex items-center justify-between px-6 py-4 bg-slate-50 border-b border-slate-200 no-print">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse"></span>
            <h3 className="font-bold text-slate-800 text-base sm:text-lg">
              কাস্টমার ইনভয়েস (#{order.orderNumber})
            </h3>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handleCopyMessengerText}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200 transition-colors"
              title="মেসেঞ্জারে পাঠানোর উপযোগী টেক্সট কপি করুন"
            >
              {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
              {copied ? 'কপি হয়েছে!' : 'মেসেঞ্জারে কপি'}
            </button>
            <button
              onClick={handlePrint}
              className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-semibold bg-indigo-600 text-white hover:bg-indigo-700 shadow-xs transition-colors"
            >
              <Printer className="w-3.5 h-3.5" />
              প্রিন্ট / PDF সেভ
            </button>
            <button
              onClick={onClose}
              className="text-slate-400 hover:text-slate-600 p-1.5 rounded-lg hover:bg-slate-200 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Invoice Printable Area */}
        <div
          ref={printContentRef}
          className="p-6 sm:p-8 overflow-y-auto flex-1 text-slate-800 bg-white"
          id="printable-invoice"
        >
          {/* Header */}
          <div className="flex flex-col sm:flex-row justify-between items-start gap-4 pb-6 border-b-2 border-slate-200">
            <div>
              <div className="flex items-center gap-2">
                <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-emerald-600 to-teal-500 flex items-center justify-center text-white font-bold text-lg shadow-sm">
                  ন
                </div>
                <div>
                  <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight leading-none">
                    {settings.businessNameBn}
                  </h1>
                  <span className="text-xs uppercase tracking-widest text-emerald-700 font-bold">
                    {settings.businessNameEn}
                  </span>
                </div>
              </div>
              <p className="text-xs text-slate-500 mt-2 max-w-xs">{settings.tagline}</p>
              <p className="text-xs text-slate-600 mt-1">{settings.address}</p>
              <p className="text-xs text-slate-600">
                হটলাইন: <span className="font-semibold">{settings.phone}</span> | {settings.facebookPageUrl}
              </p>
            </div>

            <div className="text-left sm:text-right w-full sm:w-auto">
              <span className="inline-block bg-slate-900 text-white text-[11px] font-bold px-3 py-1 rounded-full uppercase tracking-wider mb-2">
                INVOICE / ক্যাশ মেমো
              </span>
              <div className="text-xs text-slate-600 space-y-0.5">
                <p>
                  ইনভয়েস নং: <span className="font-bold text-slate-900">#{order.orderNumber}</span>
                </p>
                <p>
                  তারিখ: <span className="font-semibold text-slate-800">{order.orderDate}</span>
                </p>
                <p>
                  সময়: <span className="font-semibold text-slate-800">{order.orderTime}</span>
                </p>
              </div>
            </div>
          </div>

          {/* Customer Info Box */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 py-4 border-b border-slate-100">
            <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-100">
              <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">
                গ্রাহকের বিবরণ (Bill To)
              </span>
              <h4 className="text-sm font-bold text-slate-900 mt-0.5">{order.customerName}</h4>
              <p className="text-xs text-slate-600 mt-0.5">মোবাইল: <span className="font-semibold">{order.customerPhone}</span></p>
              <p className="text-xs text-slate-600 mt-0.5">{order.customerAddress}, {order.district}</p>
            </div>
            
            {/* Automatic QR Code Box (With Order # & Customer Name) */}
            <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-100 flex items-center justify-between">
              <div>
                <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider flex items-center gap-1">
                  <QrIcon className="w-3 h-3 text-emerald-600" /> অটোমেটিক সিকিউরিটি QR
                </span>
                <p className="text-[11px] text-slate-700 font-semibold mt-1">
                  অর্ডার: #{order.orderNumber}
                </p>
                <p className="text-[11px] text-slate-600">
                  গ্রাহক: {order.customerName}
                </p>
                <span className="inline-block mt-1 text-[10px] text-emerald-700 bg-emerald-100/70 px-2 py-0.5 rounded font-medium">
                  {settings.businessNameBn} ভেরিফাইড
                </span>
              </div>
              {qrDataUrl && (
                <div className="bg-white p-1 rounded-lg border border-slate-200 shadow-2xs">
                  <img src={qrDataUrl} alt="Invoice QR Code" className="w-18 h-18 object-contain" />
                </div>
              )}
            </div>
          </div>

          {/* Itemized Table */}
          <div className="mt-4">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-100 text-slate-700 font-bold border-b border-slate-200">
                  <th className="py-2.5 px-3 rounded-l-lg">নং</th>
                  <th className="py-2.5 px-3">পণ্যের বিবরণ</th>
                  <th className="py-2.5 px-3 text-center">পরিমাণ</th>
                  <th className="py-2.5 px-3 text-right">মূল্য (একক)</th>
                  <th className="py-2.5 px-3 text-right rounded-r-lg">মোট মূল্য</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {order.items.map((item, idx) => (
                  <tr key={idx} className="hover:bg-slate-50/50">
                    <td className="py-3 px-3 text-slate-400 font-medium">{idx + 1}</td>
                    <td className="py-3 px-3">
                      <p className="font-semibold text-slate-800">{item.itemNameBn || item.itemNameEn}</p>
                      {item.itemNameBn && (
                        <p className="text-[10px] text-slate-400">{item.itemNameEn}</p>
                      )}
                    </td>
                    <td className="py-3 px-3 text-center font-bold text-slate-800">{item.quantity}</td>
                    <td className="py-3 px-3 text-right font-medium text-slate-700">৳{item.unitActualPrice.toLocaleString()}</td>
                    <td className="py-3 px-3 text-right font-bold text-slate-900">৳{item.totalSellingPrice.toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Totals Summary */}
          <div className="mt-6 pt-4 border-t border-slate-200 flex flex-col sm:flex-row justify-between items-start gap-6">
            <div className="text-xs text-slate-500 max-w-xs space-y-1">
              <p className="font-bold text-slate-700">ইনভয়েস নীতিমালা ও শর্তাবলী:</p>
              <p className="leading-relaxed">{settings.invoiceFooterNote}</p>
            </div>

            <div className="w-full sm:w-64 bg-slate-50 p-3.5 rounded-xl border border-slate-200 space-y-2 text-xs">
              <div className="flex justify-between text-slate-600">
                <span>পণ্য উপমোট (Subtotal):</span>
                <span className="font-medium text-slate-800">৳{order.subtotal.toLocaleString()}</span>
              </div>
              <div className="flex justify-between text-slate-600">
                <span>ডেলিভারি চার্জ:</span>
                <span className="font-medium text-slate-800">৳{order.deliveryCharge.toLocaleString()}</span>
              </div>
              <div className="flex justify-between text-slate-900 font-bold text-sm pt-1 border-t border-slate-200">
                <span>সর্বমোট বিল:</span>
                <span>৳{order.totalAmount.toLocaleString()}</span>
              </div>
              <div className="flex justify-between text-emerald-700 font-medium">
                <span>অগ্রিম পরিশোধ (Advance):</span>
                <span>- ৳{order.advancePaid.toLocaleString()}</span>
              </div>
              <div className="flex justify-between bg-emerald-600 text-white font-bold p-2 rounded-lg text-sm shadow-xs">
                <span>ক্যাশ অন ডেলিভারি (বকেয়া):</span>
                <span>৳{order.dueAmount.toLocaleString()}</span>
              </div>
            </div>
          </div>

          {/* Signature / Footer */}
          <div className="mt-10 pt-4 flex justify-between items-end text-xs text-slate-500 border-t border-dashed border-slate-200">
            <div>
              <p className="text-[10px] text-slate-400">এই কম্পিউটার জেনারেটেড ইনভয়েসে সিল বা স্বাক্ষরের প্রয়োজন নেই।</p>
              <p className="font-medium text-slate-600 mt-0.5">অর্ডার সোর্স: {order.source}</p>
            </div>
            <div className="text-center">
              <div className="w-32 border-b border-slate-400 mb-1"></div>
              <p className="font-semibold text-slate-700">{settings.businessNameBn} কর্তৃপক্ষ</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
