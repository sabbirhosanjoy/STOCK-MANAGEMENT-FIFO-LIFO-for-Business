import React from 'react';
import { Smartphone, Download, X, CheckCircle2, Sparkles, HelpCircle, ExternalLink } from 'lucide-react';
import { usePWAInstall } from '../hooks/usePWAInstall';

interface AndroidAppModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const AndroidAppModal: React.FC<AndroidAppModalProps> = ({ isOpen, onClose }) => {
  const { isInstallable, isInstalled, install } = usePWAInstall();

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
      <div className="bg-white rounded-3xl max-w-lg w-full p-6 sm:p-7 shadow-2xl border border-slate-100 overflow-hidden relative">
        <div className="flex items-start justify-between pb-4 border-b border-slate-100">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-emerald-950 text-emerald-400 flex items-center justify-center shadow-lg shadow-emerald-950/20">
              <Smartphone className="w-6 h-6" />
            </div>
            <div>
              <span className="text-[10px] font-bold text-emerald-700 uppercase tracking-widest bg-emerald-50 px-2 py-0.5 rounded-md">
                Android 11+ Ready
              </span>
              <h3 className="font-extrabold text-slate-900 text-lg sm:text-xl mt-0.5">
                Android ডিভাইসে অ্যাপ ইনস্টল
              </h3>
            </div>
          </div>

          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 p-1.5 rounded-xl hover:bg-slate-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="mt-5 space-y-4 text-xs text-slate-600">
          {/* Status Message */}
          {isInstalled ? (
            <div className="p-3.5 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-900 flex items-center gap-2.5">
              <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
              <div>
                <p className="font-bold text-sm">অ্যাপটি ইতিমধ্যে ইনস্টল করা আছে!</p>
                <p className="text-[11px] text-emerald-700">আপনার মোবাইলের হোম স্ক্রিন থেকে এটি সরাসরি চালাতে পারবেন।</p>
              </div>
            </div>
          ) : isInstallable ? (
            <div className="p-4 rounded-2xl bg-gradient-to-br from-emerald-900 to-teal-950 text-white shadow-lg space-y-3">
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-amber-400" />
                <span className="font-bold text-sm">সরাসরি ইনস্টল করার জন্য তৈরি!</span>
              </div>
              <p className="text-xs text-slate-200 leading-relaxed">
                নিচের বাটনে চাপ দিলে আপনার অ্যান্ড্রয়েড মোবাইলে নকশালতা অ্যাপটি হোম স্ক্রিনে ইনস্টল হয়ে যাবে।
              </p>
              <button
                onClick={async () => {
                  await install();
                  onClose();
                }}
                className="w-full py-3 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-sm flex items-center justify-center gap-2 shadow-md transition-all cursor-pointer"
              >
                <Download className="w-4 h-4" />
                এখনই Android App ইনস্টল করুন
              </button>
            </div>
          ) : (
            <div className="space-y-3">
              <div className="p-3 rounded-2xl bg-slate-50 border border-slate-200">
                <h4 className="font-bold text-slate-900 text-xs flex items-center gap-1.5">
                  <HelpCircle className="w-4 h-4 text-emerald-600" />
                  অ্যান্ড্রয়েডে ইনস্টল করার সহজ নিয়ম (Chrome / Browser):
                </h4>
                <ol className="list-decimal list-inside space-y-1.5 mt-2 text-slate-700 leading-relaxed">
                  <li>
                    আপনার মোবাইলের ব্রাউজারে (যেমন Google Chrome) উপরের ডানদিকের <strong>তিনটি ডট (⋮)</strong> মেনুতে ক্লিক করুন।
                  </li>
                  <li>
                    মেনু থেকে <strong>"Install app"</strong> অথবা <strong>"Add to Home screen" (হোম স্ক্রিনে যোগ করুন)</strong> চাপুন।
                  </li>
                  <li>
                    কনফার্ম করলে নকশালতা অ্যাপটি আপনার ফোনের অ্যাপ মেনু ও হোম স্ক্রিনে অরিজিনাল অ্যান্ড্রয়েড অ্যাপের মতো যোগ হয়ে যাবে।
                  </li>
                </ol>
              </div>
            </div>
          )}

          {/* Capabilities Grid */}
          <div className="grid grid-cols-2 gap-2.5 pt-2">
            <div className="p-3 rounded-xl bg-slate-50 border border-slate-100">
              <span className="font-bold text-slate-800 block text-xs">ফুল স্ক্রিন মোড</span>
              <span className="text-[11px] text-slate-500">ব্রাউজারের কোনো বার ছাড়াই আসল অ্যাপের মতো চলবে।</span>
            </div>
            <div className="p-3 rounded-xl bg-slate-50 border border-slate-100">
              <span className="font-bold text-slate-800 block text-xs">অফলাইন ক্যাশিং</span>
              <span className="text-[11px] text-slate-500">সার্ভিস ওয়ার্কারের মাধ্যমে দ্রুত লোড হবে।</span>
            </div>
          </div>

          {/* Developer / Play Store Package notice */}
          <div className="bg-amber-50 p-3 rounded-xl border border-amber-200 text-amber-900 text-[11px] leading-relaxed">
            💡 <strong>Play Store বা APK তৈরি:</strong> এই অ্যাপটি সম্পূর্ণ PWA স্ট্যান্ডার্ড মেনে তৈরি। চাইলে Google-এর অফিসিয়াল <strong>Bubblewrap CLI</strong> বা <strong>PWABuilder.com</strong> দিয়ে এর সরাসরি সাইনড <code>.apk</code> বা <code>.aab</code> ফাইল বানিয়ে Google Play Store-এ আপলোড করতে পারবেন।
          </div>
        </div>

        <div className="mt-5 pt-3 border-t border-slate-100 flex justify-end">
          <button
            onClick={onClose}
            className="px-5 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs transition-colors"
          >
            বুঝেছি, বন্ধ করুন
          </button>
        </div>
      </div>
    </div>
  );
};
