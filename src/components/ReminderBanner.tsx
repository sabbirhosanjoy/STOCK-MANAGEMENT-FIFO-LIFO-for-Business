import React from 'react';
import { Bell, CheckCircle2, Clock, X } from 'lucide-react';
import { TaskItem } from '../types';

interface ReminderBannerProps {
  activeReminder: TaskItem | null;
  onComplete: (taskId: string) => void;
  onSnooze: (taskId: string) => void;
  onDismiss: () => void;
}

export const ReminderBanner: React.FC<ReminderBannerProps> = ({
  activeReminder,
  onComplete,
  onSnooze,
  onDismiss,
}) => {
  if (!activeReminder) return null;

  return (
    <aside aria-label="রিমাইন্ডার নোটিফিকেশন" className="fixed top-4 right-4 left-4 sm:left-auto sm:w-[460px] z-50 animate-bounce-short">
      <div className="bg-slate-900 text-white rounded-2xl p-4 sm:p-5 shadow-2xl border-2 border-amber-400 flex flex-col gap-3">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-xl bg-amber-400 text-slate-900 flex items-center justify-center shrink-0 font-bold shadow-lg shadow-amber-400/30">
            <Bell className="w-5 h-5 animate-spin-slow" />
          </div>
          <div className="flex-1">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold text-amber-400 uppercase tracking-wider bg-amber-400/10 px-2 py-0.5 rounded">
                ⏰ সময়সূচি অ্যালার্ম (To-Do Reminder)
              </span>
              <button
                onClick={onDismiss}
                className="text-slate-400 hover:text-white p-1 rounded-lg"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <h4 className="text-base font-bold text-white mt-1 leading-snug">
              আজ এই সময়ে আপনার এই কাজটি করার কথা ছিল!
            </h4>
            <p className="text-sm font-semibold text-emerald-300 mt-1">
              "{activeReminder.title}"
            </p>
            {activeReminder.description && (
              <p className="text-xs text-slate-300 mt-0.5 line-clamp-2">
                {activeReminder.description}
              </p>
            )}
            <div className="flex items-center gap-2 text-xs text-slate-400 mt-2">
              <Clock className="w-3.5 h-3.5 text-amber-300" />
              <span>নির্ধারিত সময়: <strong>{activeReminder.time}</strong></span>
              <span>•</span>
              <span className="text-slate-300">{activeReminder.category}</span>
            </div>
          </div>
        </div>

        <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-800">
          <button
            onClick={() => onSnooze(activeReminder.id)}
            className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-amber-300 text-xs font-semibold flex items-center gap-1.5 transition-colors"
          >
            <Clock className="w-3.5 h-3.5" />
            ১০ মিনিট পর মনে করান (Snooze)
          </button>
          <button
            onClick={() => onComplete(activeReminder.id)}
            className="px-3.5 py-1.5 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-bold text-xs flex items-center gap-1.5 shadow-md shadow-emerald-500/20 transition-colors"
          >
            <CheckCircle2 className="w-3.5 h-3.5" />
            কাজটি সম্পন্ন হয়েছে
          </button>
        </div>
      </div>
    </aside>
  );
};
