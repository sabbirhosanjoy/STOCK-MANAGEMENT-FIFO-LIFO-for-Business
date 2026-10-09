import React, { useState, useEffect } from 'react';
import {
  Key,
  Mail,
  Clock,
  CheckCircle,
  AlertCircle,
  X,
  ExternalLink,
  Copy,
  Check,
  Eye,
  EyeOff,
  RotateCcw,
  ShieldAlert,
  Send,
  Lock,
} from 'lucide-react';
import {
  generateOtp,
  getRemainingOtpSeconds,
  verifyOtp,
  clearOtp,
  buildGmailDispatch,
  getActiveOtp,
} from '../services/otpService';
import { setUserPin } from '../services/storage';

interface ForgotPinModalProps {
  isOpen: boolean;
  onClose: () => void;
  defaultEmail?: string;
  businessNameBn?: string;
  onSuccess: (newPin: string, email: string) => void;
}

export const ForgotPinModal: React.FC<ForgotPinModalProps> = ({
  isOpen,
  onClose,
  defaultEmail = '',
  businessNameBn = 'নকশালতা',
  onSuccess,
}) => {
  const [emailInput, setEmailInput] = useState<string>(defaultEmail || '');
  const [step, setStep] = useState<'request' | 'verify'>('request');
  const [enteredOtp, setEnteredOtp] = useState<string>('');
  const [newPin, setNewPin] = useState<string>('');
  const [confirmPin, setConfirmPin] = useState<string>('');
  const [showNewPin, setShowNewPin] = useState<boolean>(false);
  const [showConfirmPin, setShowConfirmPin] = useState<boolean>(false);

  const [remainingSeconds, setRemainingSeconds] = useState<number>(0);
  const [dispatchedOtp, setDispatchedOtp] = useState<string>('');
  const [gmailUrls, setGmailUrls] = useState<{
    gmailWebUrl: string;
    mailtoUrl: string;
    subject: string;
  } | null>(null);

  const [errorMessage, setErrorMessage] = useState<string>('');
  const [successMessage, setSuccessMessage] = useState<string>('');
  const [copiedCode, setCopiedCode] = useState<boolean>(false);

  // Sync defaultEmail when modal opens
  useEffect(() => {
    if (isOpen) {
      const target = (defaultEmail || '').trim().toLowerCase();
      setEmailInput(target);
      setErrorMessage('');
      setSuccessMessage('');

      // Check if there is already an active non-expired OTP for this email
      const active = getActiveOtp(target);
      if (active) {
        const rem = getRemainingOtpSeconds(target);
        if (rem > 0) {
          setDispatchedOtp(active.otp);
          setRemainingSeconds(rem);
          setStep('verify');
          const dispatch = buildGmailDispatch(target, active.otp, businessNameBn);
          setGmailUrls(dispatch);
        } else {
          setStep('request');
        }
      } else {
        setStep('request');
      }
    }
  }, [isOpen, defaultEmail, businessNameBn]);

  // Live countdown timer for 5-minute (300 seconds) validity
  useEffect(() => {
    if (step !== 'verify') return;

    const interval = setInterval(() => {
      const target = emailInput.trim().toLowerCase();
      const rem = getRemainingOtpSeconds(target);
      setRemainingSeconds(rem);

      if (rem <= 0) {
        // OTP has officially expired!
        setErrorMessage(
          'ওটিপি এর মেয়াদ শেষ (৫ মিনিট অতিক্রান্ত)! এই ওটিপি আর কাজ করবে না। নতুন পিন সেট করতে অনুগ্রহ করে পুনরায় ওটিপি প্রেরণ করুন।'
        );
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [step, emailInput]);

  if (!isOpen) return null;

  // Bengali number formatter
  const banglaDigits = ['০', '১', '২', '৩', '৪', '৫', '৬', '৭', '৮', '৯'];
  const toBangla = (num: number | string): string => {
    return num
      .toString()
      .split('')
      .map((d) => (banglaDigits[parseInt(d, 10)] !== undefined ? banglaDigits[parseInt(d, 10)] : d))
      .join('');
  };

  const minutes = Math.floor(remainingSeconds / 60);
  const seconds = remainingSeconds % 60;
  const timeFormatted = `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
  const timeFormattedBn = `${toBangla(String(minutes).padStart(2, '0'))}:${toBangla(
    String(seconds).padStart(2, '0')
  )}`;

  // Handle Send OTP
  const handleSendOtp = () => {
    const cleanEmail = emailInput.trim().toLowerCase();
    if (!cleanEmail || !cleanEmail.includes('@')) {
      setErrorMessage('অনুগ্রহ করে সঠিক জিমেইল/ইমেইল এড্রেস লিখুন।');
      return;
    }

    setErrorMessage('');
    const otpRecord = generateOtp(cleanEmail);
    setDispatchedOtp(otpRecord.otp);
    setRemainingSeconds(300); // 5 minutes exactly

    const dispatch = buildGmailDispatch(cleanEmail, otpRecord.otp, businessNameBn);
    setGmailUrls(dispatch);

    setStep('verify');
    setEnteredOtp('');
    setNewPin('');
    setConfirmPin('');
    setSuccessMessage(`আপনার জিমেইল (${cleanEmail})-এ ৫ মিনিটের ওটিপি পাঠানো হয়েছে!`);

    setTimeout(() => {
      setSuccessMessage('');
    }, 6000);
  };

  // Copy OTP to clipboard
  const handleCopyOtp = () => {
    if (!dispatchedOtp) return;
    navigator.clipboard.writeText(dispatchedOtp);
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2500);
  };

  // Handle Submit & Reset PIN
  const handleResetSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');

    const cleanEmail = emailInput.trim().toLowerCase();

    // 1. Check expiration strictly
    const rem = getRemainingOtpSeconds(cleanEmail);
    if (rem <= 0) {
      setErrorMessage(
        'ওটিপি এর মেয়াদ শেষ (৫ মিনিট অতিক্রান্ত)! এই ওটিপি আর কাজ করবে না। অনুগ্রহ করে পুনরায় ওটিপি প্রেরণ করুন।'
      );
      return;
    }

    // 2. Verify OTP code
    const verification = verifyOtp(cleanEmail, enteredOtp);
    if (!verification.success) {
      setErrorMessage(verification.message);
      return;
    }

    // 3. Validate New PIN
    const cleanNewPin = newPin.trim();
    if (!cleanNewPin || cleanNewPin.length < 4) {
      setErrorMessage('নতুন সিকিউরিটি পিন কমপক্ষে ৪ সংখ্যার হতে হবে!');
      return;
    }

    if (cleanNewPin !== confirmPin.trim()) {
      setErrorMessage('নতুন পিন এবং নিশ্চিতকরণ পিন হুবহু মেলেনি!');
      return;
    }

    // 4. Save new PIN
    setUserPin(cleanEmail, cleanNewPin);
    clearOtp(cleanEmail);

    setSuccessMessage('অভিনন্দন! আপনার পিন সফলভাবে পরিবর্তন ও আপডেট হয়েছে।');

    setTimeout(() => {
      onSuccess(cleanNewPin, cleanEmail);
      onClose();
    }, 1200);
  };

  // Calculate percentage of remaining time for progress bar (0 to 100)
  const timerPercentage = Math.max(0, Math.min(100, (remainingSeconds / 300) * 100));

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-xs">
      <div className="bg-slate-900 border border-emerald-500/30 rounded-2xl max-w-lg w-full p-5 sm:p-6 shadow-2xl text-slate-100 space-y-4 max-h-[92vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-start justify-between border-b border-slate-800 pb-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-400">
              <Key className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base sm:text-lg font-bold text-white flex items-center gap-2">
                <span>পিন রিসেট ও ভেরিফিকেশন</span>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-950 border border-emerald-500/50 text-emerald-300 font-normal">
                  Forgot PIN
                </span>
              </h3>
              <p className="text-xs text-slate-400">
                জিমেইল ওটিপি (OTP) ও ৫ মিনিটের নিরাপত্তা ভ্যালিডেশন
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Global Notifications */}
        {errorMessage && (
          <div className="p-3 rounded-xl bg-rose-500/20 border border-rose-500/40 text-rose-300 text-xs flex items-start gap-2">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
            <span>{errorMessage}</span>
          </div>
        )}

        {successMessage && (
          <div className="p-3 rounded-xl bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 text-xs flex items-center gap-2">
            <CheckCircle className="w-4 h-4 shrink-0 text-emerald-400" />
            <span>{successMessage}</span>
          </div>
        )}

        {/* Step 1: Request OTP */}
        {step === 'request' && (
          <div className="space-y-4">
            <div className="bg-slate-950/60 p-3.5 rounded-xl border border-slate-800 space-y-2">
              <label className="block text-xs font-semibold text-slate-300">
                নিবন্ধিত জিমেইল / ইমেইল অ্যাড্রেস
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 text-slate-500 absolute left-3 top-3" />
                <input
                  type="email"
                  value={emailInput}
                  onChange={(e) => setEmailInput(e.target.value)}
                  placeholder="যেমন: yourname@gmail.com"
                  className="w-full pl-9 pr-3 py-2.5 rounded-xl bg-slate-800 border border-slate-700 text-white text-xs sm:text-sm font-mono focus:ring-2 focus:ring-emerald-500 outline-none"
                  required
                />
              </div>
              <p className="text-[11px] text-slate-400">
                এই জিমেইলে তাৎক্ষণিকভাবে একটি ৬-সংখ্যার গোপন ওটিপি (OTP) পাঠানো হবে।
              </p>
            </div>

            <div className="bg-amber-950/20 border border-amber-900/40 rounded-xl p-3 flex items-start gap-2 text-xs text-amber-200">
              <Clock className="w-4 h-4 shrink-0 text-amber-400 mt-0.5" />
              <span>
                <strong>৫ মিনিট সময়সীমা:</strong> ওটিপি কোড প্রেরণের পর ঠিক ৫ মিনিট (৩০০ সেকেন্ড) কার্যকর থাকবে। ৫ মিনিট পার হয়ে গেলে ওটিপিটি স্বয়ংক্রিয়ভাবে বাতিল হয়ে যাবে।
              </span>
            </div>

            <button
              type="button"
              onClick={handleSendOtp}
              className="w-full py-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs sm:text-sm shadow-lg shadow-emerald-600/30 flex items-center justify-center gap-2 cursor-pointer transition-all"
            >
              <Send className="w-4 h-4" />
              <span>জিমেইলে ওটিপি (OTP) প্রেরণ করুন</span>
            </button>
          </div>
        )}

        {/* Step 2: OTP Entry + 5-Minute Countdown + New PIN Setup */}
        {step === 'verify' && (
          <form onSubmit={handleResetSubmit} className="space-y-4">
            {/* Live 5-Minute Expiry Countdown Banner */}
            <div
              className={`p-3.5 rounded-xl border flex flex-col gap-2 transition-all ${
                remainingSeconds > 60
                  ? 'bg-emerald-950/30 border-emerald-500/40'
                  : remainingSeconds > 0
                  ? 'bg-amber-950/40 border-amber-500/50'
                  : 'bg-rose-950/40 border-rose-500/60'
              }`}
            >
              <div className="flex items-center justify-between text-xs">
                <div className="flex items-center gap-1.5 font-bold">
                  <Clock
                    className={`w-4 h-4 ${
                      remainingSeconds > 0 ? 'text-amber-400 animate-pulse' : 'text-rose-400'
                    }`}
                  />
                  <span>
                    {remainingSeconds > 0
                      ? 'ওটিপি এর মেয়াদ সক্রিয় আছে:'
                      : 'ওটিপি এর মেয়াদ উত্তীর্ণ হয়েছে!'}
                  </span>
                </div>
                <div
                  className={`font-mono font-black text-sm px-2.5 py-0.5 rounded-lg ${
                    remainingSeconds > 60
                      ? 'bg-emerald-900/80 text-emerald-200'
                      : remainingSeconds > 0
                      ? 'bg-amber-900/80 text-amber-200'
                      : 'bg-rose-900/80 text-rose-200'
                  }`}
                >
                  {timeFormatted} ({timeFormattedBn})
                </div>
              </div>

              {/* Countdown Progress Bar */}
              <div className="w-full h-1.5 bg-slate-800 rounded-full overflow-hidden">
                <div
                  className={`h-full transition-all duration-1000 ${
                    remainingSeconds > 60
                      ? 'bg-emerald-500'
                      : remainingSeconds > 0
                      ? 'bg-amber-500'
                      : 'bg-rose-500'
                  }`}
                  style={{ width: `${timerPercentage}%` }}
                />
              </div>

              <div className="flex items-center justify-between text-[11px] text-slate-400">
                <span>গ্রাহক: {emailInput}</span>
                {remainingSeconds <= 0 ? (
                  <button
                    type="button"
                    onClick={handleSendOtp}
                    className="text-amber-400 hover:text-amber-300 font-bold underline flex items-center gap-1 cursor-pointer"
                  >
                    <RotateCcw className="w-3 h-3" />
                    পুনরায় নতুন ওটিপি পাঠান
                  </button>
                ) : (
                  <span>সর্বোচ্চ ৫ মিনিট (৩০০ সেকেন্ড)</span>
                )}
              </div>
            </div>

            {/* Direct Gmail Dispatch & Instant Code Preview Panel */}
            <div className="bg-slate-950/70 border border-emerald-900/60 rounded-xl p-3 space-y-2.5 text-xs">
              <div className="flex items-center justify-between">
                <span className="font-bold text-emerald-300 flex items-center gap-1.5">
                  <Mail className="w-4 h-4 text-emerald-400" />
                  সরাসরি জিমেইল ইনবক্স চেক ও ওটিপি ভিউ:
                </span>
                {gmailUrls && (
                  <a
                    href={gmailUrls.gmailWebUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-[11px] px-2.5 py-1 rounded-lg bg-emerald-600/30 hover:bg-emerald-600 text-emerald-200 hover:text-white border border-emerald-500/40 transition-colors"
                  >
                    <span>জিমেইল খুলুন</span>
                    <ExternalLink className="w-3 h-3" />
                  </a>
                )}
              </div>

              {/* In-app OTP preview card for high usability */}
              <div className="p-2.5 rounded-lg bg-slate-900 border border-slate-700/80 flex items-center justify-between">
                <div>
                  <span className="text-[10px] text-slate-400 block">
                    প্রেরিত ৬-সংখ্যার ওটিপি কোড (Gmail Preview):
                  </span>
                  <span className="font-mono font-black text-lg text-amber-300 tracking-widest">
                    {dispatchedOtp || '------'}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={handleCopyOtp}
                  className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-600 flex items-center gap-1 text-xs cursor-pointer transition-colors"
                  title="কোড কপি করুন"
                >
                  {copiedCode ? (
                    <>
                      <Check className="w-3.5 h-3.5 text-emerald-400" />
                      <span className="text-emerald-400 font-bold">কপি হয়েছে</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3.5 h-3.5" />
                      <span>কপি কোড</span>
                    </>
                  )}
                </button>
              </div>
            </div>

            {/* OTP Input Field */}
            <div className="space-y-1">
              <label className="block text-xs font-semibold text-slate-300">
                জিমেইল থেকে প্রাপ্ত ৬-সংখ্যার ওটিপি (OTP) লিখুন <span className="text-rose-400">*</span>
              </label>
              <div className="relative">
                <input
                  type="text"
                  maxLength={6}
                  value={enteredOtp}
                  onChange={(e) => setEnteredOtp(e.target.value.replace(/\D/g, ''))}
                  placeholder="৬-সংখ্যার ওটিপি (যেমন: 123456)"
                  disabled={remainingSeconds <= 0}
                  className="w-full text-center py-2.5 rounded-xl bg-slate-800 border border-slate-700 text-white font-mono tracking-widest text-base sm:text-lg focus:ring-2 focus:ring-emerald-500 outline-none disabled:opacity-50"
                  required
                />
              </div>
            </div>

            {/* New PIN & Confirm New PIN */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  নতুন ৪-৮ সংখ্যার পিন <span className="text-rose-400">*</span>
                </label>
                <div className="relative">
                  <Lock className="w-4 h-4 text-slate-500 absolute left-3 top-3" />
                  <input
                    type={showNewPin ? 'text' : 'password'}
                    maxLength={8}
                    value={newPin}
                    onChange={(e) => setNewPin(e.target.value)}
                    placeholder="যেমন: 2026"
                    disabled={remainingSeconds <= 0}
                    className="w-full pl-9 pr-9 py-2 rounded-xl bg-slate-800 border border-slate-700 text-white text-xs sm:text-sm font-mono tracking-widest text-center focus:ring-2 focus:ring-emerald-500 outline-none disabled:opacity-50"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowNewPin(!showNewPin)}
                    className="absolute right-2.5 top-2.5 text-slate-400 hover:text-white p-0.5 cursor-pointer"
                  >
                    {showNewPin ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  নতুন পিন নিশ্চিত করুন <span className="text-rose-400">*</span>
                </label>
                <div className="relative">
                  <Lock className="w-4 h-4 text-slate-500 absolute left-3 top-3" />
                  <input
                    type={showConfirmPin ? 'text' : 'password'}
                    maxLength={8}
                    value={confirmPin}
                    onChange={(e) => setConfirmPin(e.target.value)}
                    placeholder="আবার লিখুন"
                    disabled={remainingSeconds <= 0}
                    className="w-full pl-9 pr-9 py-2 rounded-xl bg-slate-800 border border-slate-700 text-white text-xs sm:text-sm font-mono tracking-widest text-center focus:ring-2 focus:ring-emerald-500 outline-none disabled:opacity-50"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPin(!showConfirmPin)}
                    className="absolute right-2.5 top-2.5 text-slate-400 hover:text-white p-0.5 cursor-pointer"
                  >
                    {showConfirmPin ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                  </button>
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex items-center gap-2 pt-2">
              <button
                type="button"
                onClick={handleSendOtp}
                className="px-3 py-2.5 rounded-xl border border-slate-700 hover:bg-slate-800 text-xs text-amber-300 font-semibold flex items-center gap-1.5 cursor-pointer transition-colors"
                title="পুনরায় ওটিপি পাঠান"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>পুনরায় ওটিপি</span>
              </button>

              <button
                type="submit"
                disabled={remainingSeconds <= 0 || !enteredOtp || !newPin || !confirmPin}
                className="flex-1 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 disabled:bg-slate-800 disabled:text-slate-500 text-white font-bold text-xs sm:text-sm shadow-lg shadow-emerald-600/30 flex items-center justify-center gap-2 cursor-pointer disabled:cursor-not-allowed transition-all"
              >
                <CheckCircle className="w-4 h-4" />
                <span>নতুন পিন সেট ও সংরক্ষণ করুন</span>
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};
