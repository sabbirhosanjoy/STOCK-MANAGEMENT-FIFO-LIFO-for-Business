import React, { useState } from 'react';
import { Smartphone, Download } from 'lucide-react';
import { usePWAInstall } from '../hooks/usePWAInstall';
import { AndroidAppModal } from './AndroidAppModal';

interface PWAInstallButtonProps {
  className?: string;
  variant?: 'nav' | 'hero' | 'simple';
}

export const PWAInstallButton: React.FC<PWAInstallButtonProps> = ({
  className = '',
  variant = 'nav',
}) => {
  const { isInstallable, isInstalled, install } = usePWAInstall();
  const [modalOpen, setModalOpen] = useState(false);

  const handleClick = async () => {
    if (isInstallable) {
      const ok = await install();
      if (!ok) {
        setModalOpen(true);
      }
    } else {
      setModalOpen(true);
    }
  };

  if (isInstalled) {
    return null;
  }

  if (variant === 'hero') {
    return (
      <>
        <button
          type="button"
          onClick={handleClick}
          className={`flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs shadow-md transition-all cursor-pointer ${className}`}
        >
          <Smartphone className="w-4 h-4" />
          <span>Android App ইনস্টল করুন</span>
        </button>
        <AndroidAppModal isOpen={modalOpen} onClose={() => setModalOpen(false)} />
      </>
    );
  }

  return (
    <>
      <button
        type="button"
        onClick={handleClick}
        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-300 border border-emerald-400/30 text-xs font-semibold transition-all cursor-pointer ${className}`}
        title="অ্যান্ড্রয়েড মোবাইলে অ্যাপ হিসেবে ইনস্টল করুন"
      >
        <Smartphone className="w-3.5 h-3.5 text-emerald-400" />
        <span className="hidden sm:inline">Android App</span>
        <span className="sm:hidden">App</span>
      </button>
      <AndroidAppModal isOpen={modalOpen} onClose={() => setModalOpen(false)} />
    </>
  );
};
