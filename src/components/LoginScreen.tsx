import React, { useState, useEffect } from 'react';
import {
  Clock,
  Calendar,
  CloudSun,
  ShieldCheck,
  Lock,
  ExternalLink,
  ChevronDown,
  Wind,
  Droplets,
  AlertCircle,
  Eye,
  EyeOff,
  Key,
  UserPlus,
  LogIn,
  Mail,
  User,
  CheckCircle,
  Check,
} from 'lucide-react';
import { UserAccount, BusinessSettings } from '../types';
import {
  verifyUserLogin,
  verifyUserLoginAsync,
  registerNewUser,
  registerNewUserAsync,
  getUserPin,
  setUserPin,
} from '../services/storage';
import { signInWithGoogleFirebase } from '../services/firebase';

import { PWAInstallButton } from './PWAInstallButton';
import { ForgotPinModal } from './ForgotPinModal';

// Import the generated image of child with Bangladesh flag in mustard field
import mustardFieldChildImg from '../assets/images/bangladesh_child_mustard_field_1791435700694.jpg';

interface LoginScreenProps {
  settings: BusinessSettings;
  onLogin: (account: UserAccount) => void;
  isLockedOnly?: boolean;
  onUnlockPin?: (pin: string) => boolean;
}

interface CityWeather {
  nameBn: string;
  temp: number;
  conditionBn: string;
  humidity: number;
  windSpeed: number;
}

const BD_CITIES_WEATHER: Record<string, CityWeather> = {
  dhaka: {
    nameBn: 'ঢাকা',
    temp: 29,
    conditionBn: 'হালকা মেঘলা ও রোদ',
    humidity: 68,
    windSpeed: 12,
  },
  narayanganj: {
    nameBn: 'নারায়ণগঞ্জ',
    temp: 29,
    conditionBn: 'পরিষ্কার আকাশ',
    humidity: 70,
    windSpeed: 11,
  },
  chattogram: {
    nameBn: 'চট্টগ্রাম',
    temp: 28,
    conditionBn: 'উপকূলীয় মৃদুমন্দ বাতাস',
    humidity: 74,
    windSpeed: 16,
  },
  sylhet: {
    nameBn: 'সিলেট',
    temp: 26,
    conditionBn: 'মনোরম স্নিগ্ধ আবহাওয়া',
    humidity: 80,
    windSpeed: 8,
  },
  rajshahi: {
    nameBn: 'রাজশাহী',
    temp: 30,
    conditionBn: 'রৌদ্রোজ্জ্বল আবহাওয়া',
    humidity: 58,
    windSpeed: 10,
  },
  khulna: {
    nameBn: 'খুলনা',
    temp: 29,
    conditionBn: 'আংশিক মেঘলা',
    humidity: 72,
    windSpeed: 13,
  },
};

export const LoginScreen: React.FC<LoginScreenProps> = ({
  settings,
  onLogin,
  isLockedOnly = false,
  onUnlockPin,
}) => {
  // Mode: 'login' or 'register' (new user creation)
  const [authMode, setAuthMode] = useState<'login' | 'register'>('login');

  // Login form state (strictly clean - no user data exposed on screen)
  const [loginEmail, setLoginEmail] = useState<string>('');
  const [loginPin, setLoginPin] = useState<string>('');
  const [showLoginPin, setShowLoginPin] = useState<boolean>(false);
  const [loginError, setLoginError] = useState<string>('');
  const [isSubmittingLogin, setIsSubmittingLogin] = useState<boolean>(false);

  // Registration form state
  const [regName, setRegName] = useState<string>('');
  const [regEmail, setRegEmail] = useState<string>('');
  const [regPin, setRegPin] = useState<string>('');
  const [regConfirmPin, setRegConfirmPin] = useState<string>('');
  const [showRegPin, setShowRegPin] = useState<boolean>(false);
  const [regError, setRegError] = useState<string>('');
  const [regSuccessMsg, setRegSuccessMsg] = useState<string>('');
  const [isSubmittingReg, setIsSubmittingReg] = useState<boolean>(false);

  // Lock screen state
  const [lockPinInput, setLockPinInput] = useState<string>('');
  const [lockPinError, setLockPinError] = useState<string>('');
  const [showLockPin, setShowLockPin] = useState<boolean>(false);

  // Forgot PIN Modal state
  const [isForgotPinModalOpen, setIsForgotPinModalOpen] = useState<boolean>(false);
  const [forgotPinSuccessMsg, setForgotPinSuccessMsg] = useState<string>('');

  // Clock & Weather
  const [currentTime, setCurrentTime] = useState<Date>(new Date());
  const [selectedCity, setSelectedCity] = useState<string>('dhaka');
  const [isCityDropdownOpen, setIsCityDropdownOpen] = useState<boolean>(false);

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const currentWeather = BD_CITIES_WEATHER[selectedCity] || BD_CITIES_WEATHER.dhaka;

  const banglaDigits = ['০', '১', '২', '৩', '৪', '৫', '৬', '৭', '৮', '৯'];
  const toBanglaNumber = (num: number | string): string => {
    return num
      .toString()
      .split('')
      .map((d) => (banglaDigits[parseInt(d, 10)] !== undefined ? banglaDigits[parseInt(d, 10)] : d))
      .join('');
  };

  const banglaDays = ['রবিবার', 'সোমবার', 'মঙ্গলবার', 'বুধবার', 'বৃহস্পতিবার', 'শুক্রবার', 'শনিবার'];
  const banglaMonths = [
    'জানুয়ারি',
    'ফেব্রুয়ারি',
    'মার্চ',
    'এপ্রিল',
    'মে',
    'জুন',
    'জুলাই',
    'আগস্ট',
    'সেপ্টেম্বর',
    'অক্টোবর',
    'নভেম্বর',
    'ডিসেম্বর',
  ];

  const formattedTime = currentTime.toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: true,
  });

  const formattedDate = `${banglaDays[currentTime.getDay()]}, ${toBanglaNumber(
    currentTime.getDate()
  )} ${banglaMonths[currentTime.getMonth()]} ${toBanglaNumber(currentTime.getFullYear())}`;

  // Handle Login submission with strict credential check (supporting cross-device Firebase Firestore)
  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError('');

    const trimmedEmail = loginEmail.trim().toLowerCase();
    const trimmedPin = loginPin.trim();

    if (!trimmedEmail) {
      setLoginError('অনুগ্রহ করে আপনার জিমেইল অ্যাকাউন্ট লিখুন।');
      return;
    }
    if (!trimmedPin) {
      setLoginError('অনুগ্রহ করে আপনার সিকিউরিটি পিন লিখুন।');
      return;
    }

    setIsSubmittingLogin(true);
    try {
      const result = await verifyUserLoginAsync(trimmedEmail, trimmedPin);
      setIsSubmittingLogin(false);

      if (!result.success || !result.userAccount) {
        setLoginError(result.error || 'জিমেইল অথবা পিন সঠিক নয়! পুনরায় চেষ্টা করুন।');
        return;
      }

      // Login success
      onLogin(result.userAccount);
    } catch (err: any) {
      setIsSubmittingLogin(false);
      setLoginError(err?.message || 'লগইন যাচাই করতে সমস্যা হয়েছে।');
    }
  };

  // Handle New User Registration submission (persisting to Firebase Firestore Cloud)
  const handleRegisterSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setRegError('');
    setRegSuccessMsg('');

    const trimmedName = regName.trim();
    const trimmedEmail = regEmail.trim().toLowerCase();
    const trimmedPin = regPin.trim();
    const trimmedConfirm = regConfirmPin.trim();

    if (!trimmedEmail) {
      setRegError('অনুগ্রহ করে জিমেইল লিখুন।');
      return;
    }
    if (!trimmedEmail.includes('@') || !trimmedEmail.endsWith('@gmail.com')) {
      setRegError('সঠিক জিমেইল অ্যাড্রেস লিখুন (যেমন: name@gmail.com)');
      return;
    }
    if (!trimmedPin || trimmedPin.length < 4) {
      setRegError('সিকিউরিটি পিন কমপক্ষে ৪ সংখ্যার হতে হবে!');
      return;
    }
    if (trimmedPin !== trimmedConfirm) {
      setRegError('পিন ও পিন নিশ্চিতকরণ মিলছে না! উভয় ঘরে একই পিন দিন।');
      return;
    }

    setIsSubmittingReg(true);
    try {
      const res = await registerNewUserAsync(trimmedName, trimmedEmail, trimmedPin);
      setIsSubmittingReg(false);

      if (!res.success || !res.userAccount) {
        setRegError(res.error || 'নতুন ইউজার তৈরিতে সমস্যা হয়েছে।');
        return;
      }

      setRegSuccessMsg(`"${trimmedEmail}" অ্যাকাউন্টটি ক্লাউডে সফলভাবে তৈরি হয়েছে! স্বাগতম।`);
      setTimeout(() => {
        onLogin(res.userAccount!);
      }, 700);
    } catch (err: any) {
      setIsSubmittingReg(false);
      setRegError(err?.message || 'নতুন ইউজার তৈরি ব্যর্থ হয়েছে।');
    }
  };

  // Handle Google Sign-in with Firebase Auth popup
  const [isGoogleSigningIn, setIsGoogleSigningIn] = useState<boolean>(false);
  const handleGoogleFirebaseSignIn = async () => {
    setLoginError('');
    setIsGoogleSigningIn(true);
    try {
      const cred = await signInWithGoogleFirebase();
      const user = cred.user;
      if (user && user.email) {
        const email = user.email.toLowerCase();
        const displayName = user.displayName || email.split('@')[0];
        setLoginEmail(email);

        // Check if user has PIN
        const currentPin = getUserPin(email);
        if (currentPin && currentPin !== '1234') {
          // User already exists, set email and prompt for PIN to enter
          setLoginError(`স্বাগতম ${displayName}! আপনার ৪ সংখ্যার গোপন পিনটি দিয়ে লগইন করুন।`);
        } else {
          // Prompt to register new PIN
          setRegEmail(email);
          setRegName(displayName);
          setAuthMode('register');
          setRegError(`Google দিয়ে যাচাই সম্পন্ন হয়েছে! এখন শুধু একটি ৪ সংখ্যার গোপন পিন সেট করুন।`);
        }
      }
    } catch (err: any) {
      console.warn('Google sign-in cancelled or error:', err);
      if (err?.code !== 'auth/popup-closed-by-user') {
        setLoginError('Google দিয়ে সাইন ইন ব্যর্থ হয়েছে। অনুগ্রহ করে জিমেইল ও পিন দিয়ে প্রবেশ করুন।');
      }
    } finally {
      setIsGoogleSigningIn(false);
    }
  };

  // Handle Unlock Screen submit
  const handleUnlockPinSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!onUnlockPin) return;
    const ok = onUnlockPin(lockPinInput);
    if (!ok) {
      setLockPinError('ভুল পাসওয়ার্ড/পিন! পুনরায় চেষ্টা করুন।');
      setLockPinInput('');
    } else {
      setLockPinError('');
    }
  };

  // Handle success from Forgot PIN OTP reset
  const handleForgotPinSuccess = (newPin: string, email: string) => {
    setLoginPin(newPin);
    setLockPinInput(newPin);
    setLoginError('');
    setLockPinError('');
    setForgotPinSuccessMsg(
      `"${email}" অ্যাকাউন্টের পিন সফলভাবে পরিবর্তন হয়েছে! নতুন পিন দিয়ে প্রবেশ করতে পারবেন।`
    );
    setIsForgotPinModalOpen(false);
    setTimeout(() => setForgotPinSuccessMsg(''), 7000);

    if (isLockedOnly && onUnlockPin) {
      onUnlockPin(newPin);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-950 via-slate-900 to-teal-950 flex flex-col justify-between items-center p-4 sm:p-6 text-slate-100">
      {/* Top Security & Brand Badge */}
      <div className="w-full max-w-4xl flex items-center justify-between py-2 border-b border-emerald-900/40">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-emerald-500/20 border border-emerald-400/30 flex items-center justify-center text-emerald-400 font-bold">
            ন
          </div>
          <div>
            <h1 className="text-sm sm:text-base font-bold text-white tracking-wide">
              {settings.businessNameBn}
            </h1>
            <span className="text-[10px] text-emerald-400 font-medium tracking-wider uppercase block">
              অফিসিয়াল ব্যবসা ও স্টক পোর্টাল
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <PWAInstallButton />
          <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-900/30 border border-emerald-500/30 text-[11px] text-emerald-300">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
            <span>সুরক্ষিত পোর্টাল</span>
          </div>
        </div>
      </div>

      {/* Main Center Card */}
      <div className="w-full max-w-lg my-6 bg-slate-900/90 backdrop-blur-md rounded-3xl border border-emerald-800/40 shadow-2xl overflow-hidden flex flex-col">
        {/* Child with Bangladesh Flag in Mustard Field Image */}
        <div className="relative w-full h-44 sm:h-52 overflow-hidden bg-emerald-950">
          <img
            src={mustardFieldChildImg}
            alt="সরিষা ক্ষেতে বাংলাদেশের ছোট পতাকা হাতে শিশু"
            className="w-full h-full object-cover object-center transform hover:scale-105 transition-transform duration-700"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-slate-900 via-slate-900/30 to-transparent"></div>

          {/* Floating Tag */}
          <div className="absolute top-3 left-3 bg-slate-950/70 backdrop-blur-md px-3 py-1 rounded-full border border-white/20 text-[11px] text-emerald-300 font-semibold flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping"></span>
            <span>নকশালতা • বাংলাদেশ</span>
          </div>
        </div>

        {/* Live Time, Date & Weather Bar */}
        <div className="bg-slate-950/70 p-3 sm:p-3.5 border-b border-emerald-900/40 grid grid-cols-1 sm:grid-cols-3 gap-2.5 text-center sm:text-left divide-y sm:divide-y-0 sm:divide-x divide-slate-800">
          {/* Time */}
          <div className="flex items-center sm:justify-start justify-center gap-2 px-2 pt-1 sm:pt-0">
            <div className="w-7 h-7 rounded-lg bg-emerald-500/10 text-emerald-400 flex items-center justify-center shrink-0">
              <Clock className="w-3.5 h-3.5" />
            </div>
            <div>
              <span className="text-[9px] uppercase font-bold text-slate-400 tracking-wider block">
                চলমান সময়
              </span>
              <span className="text-xs font-bold text-white font-mono">{formattedTime}</span>
            </div>
          </div>

          {/* Date */}
          <div className="flex items-center sm:justify-start justify-center gap-2 px-2 pt-1.5 sm:pt-0">
            <div className="w-7 h-7 rounded-lg bg-teal-500/10 text-teal-400 flex items-center justify-center shrink-0">
              <Calendar className="w-3.5 h-3.5" />
            </div>
            <div>
              <span className="text-[9px] uppercase font-bold text-slate-400 tracking-wider block">
                আজকের তারিখ
              </span>
              <span className="text-xs font-medium text-slate-200">{formattedDate}</span>
            </div>
          </div>

          {/* Weather */}
          <div className="flex items-center sm:justify-start justify-center gap-2 px-2 pt-1.5 sm:pt-0 relative">
            <div className="w-7 h-7 rounded-lg bg-amber-500/10 text-amber-400 flex items-center justify-center shrink-0">
              <CloudSun className="w-3.5 h-3.5" />
            </div>
            <div className="flex-1 text-left">
              <div className="flex items-center justify-between">
                <button
                  type="button"
                  onClick={() => setIsCityDropdownOpen(!isCityDropdownOpen)}
                  className="text-[9px] uppercase font-bold text-amber-300 flex items-center gap-0.5 hover:underline cursor-pointer"
                >
                  <span>{currentWeather.nameBn}</span>
                  <ChevronDown className="w-3 h-3" />
                </button>
              </div>
              <div className="flex items-center gap-1 text-xs">
                <span className="font-bold text-amber-200">{currentWeather.temp}°C</span>
                <span className="text-[10px] text-slate-300 truncate max-w-[80px]">
                  {currentWeather.conditionBn}
                </span>
              </div>
            </div>

            {isCityDropdownOpen && (
              <div className="absolute top-10 right-0 left-0 sm:left-auto sm:w-44 bg-slate-900 border border-slate-700 rounded-xl shadow-2xl p-1 z-30 text-xs">
                {Object.entries(BD_CITIES_WEATHER).map(([key, data]) => (
                  <button
                    key={key}
                    type="button"
                    onClick={() => {
                      setSelectedCity(key);
                      setIsCityDropdownOpen(false);
                    }}
                    className={`w-full text-left px-3 py-1.5 rounded-lg flex items-center justify-between hover:bg-slate-800 transition-colors ${
                      selectedCity === key ? 'text-emerald-400 font-bold bg-emerald-950/40' : 'text-slate-300'
                    }`}
                  >
                    <span>{data.nameBn}</span>
                    <span className="text-amber-300">{data.temp}°C</span>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Content Body */}
        <div className="p-5 sm:p-6 flex flex-col gap-4">
          {/* Lock Screen UI if app is temporarily locked */}
          {isLockedOnly ? (
            <div className="space-y-4">
              <div className="text-center">
                <h2 className="text-xl font-bold text-white tracking-tight">অ্যাপ আনলক করুন</h2>
                <p className="text-xs text-slate-400 mt-1">
                  আপনার অ্যাকাউন্টের গোপনীয় পিন দিয়ে অ্যাপটি আনলক করুন।
                </p>
              </div>

              <form onSubmit={handleUnlockPinSubmit} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1.5 text-center">
                    গোপন সিকিউরিটি পিন (Security PIN)
                  </label>
                  <div className="relative max-w-xs mx-auto">
                    <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5" />
                    <input
                      type={showLockPin ? 'text' : 'password'}
                      maxLength={8}
                      value={lockPinInput}
                      onChange={(e) => setLockPinInput(e.target.value)}
                      placeholder="****"
                      autoFocus
                      className="w-full text-center px-10 py-2.5 rounded-xl bg-slate-800 border border-slate-700 text-white font-mono tracking-widest text-lg focus:ring-2 focus:ring-emerald-500 outline-none"
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowLockPin(!showLockPin)}
                      className="absolute right-3.5 top-3 text-slate-400 hover:text-white p-0.5 cursor-pointer"
                      title={showLockPin ? 'লুকান' : 'দেখুন'}
                    >
                      {showLockPin ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                  {lockPinError && (
                    <p className="text-rose-400 text-xs text-center mt-2 flex items-center justify-center gap-1">
                      <AlertCircle className="w-3.5 h-3.5" />
                      {lockPinError}
                    </p>
                  )}
                </div>

                <button
                  type="submit"
                  className="w-full max-w-xs mx-auto block py-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-sm shadow-lg shadow-emerald-600/30 transition-all cursor-pointer"
                >
                  আনলক করুন
                </button>

                <div className="text-center pt-1">
                  <button
                    type="button"
                    onClick={() => setIsForgotPinModalOpen(true)}
                    className="text-xs text-amber-300 hover:text-amber-200 underline cursor-pointer inline-flex items-center gap-1.5 font-medium"
                  >
                    <Key className="w-3.5 h-3.5" />
                    <span>পিন ভুলে গেছেন? জিমেইল ওটিপি (OTP) দিয়ে রিসেট করুন</span>
                  </button>
                </div>
              </form>
            </div>
          ) : (
            /* Main Auth Portal (Login / Create New User) */
            <div className="space-y-4">
              {/* Tab Switcher: [লগইন] & [নতুন ইউজার তৈরি] */}
              <div className="grid grid-cols-2 p-1 bg-slate-950/70 rounded-2xl border border-slate-800">
                <button
                  type="button"
                  onClick={() => {
                    setAuthMode('login');
                    setLoginError('');
                    setRegError('');
                  }}
                  className={`flex items-center justify-center gap-2 py-2.5 rounded-xl font-bold text-xs transition-all cursor-pointer ${
                    authMode === 'login'
                      ? 'bg-emerald-600 text-white shadow-md'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  <LogIn className="w-3.5 h-3.5" />
                  <span>লগইন করুন</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setAuthMode('register');
                    setLoginError('');
                    setRegError('');
                  }}
                  className={`flex items-center justify-center gap-2 py-2.5 rounded-xl font-bold text-xs transition-all cursor-pointer ${
                    authMode === 'register'
                      ? 'bg-teal-600 text-white shadow-md'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  <UserPlus className="w-3.5 h-3.5" />
                  <span>নতুন ইউজার তৈরি</span>
                </button>
              </div>

              {/* Status / Success Messages */}
              {forgotPinSuccessMsg && (
                <div className="p-3 rounded-xl bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 text-xs flex items-center gap-2">
                  <Check className="w-4 h-4 shrink-0 text-emerald-400" />
                  <span>{forgotPinSuccessMsg}</span>
                </div>
              )}

              {/* MODE 1: SECURE LOGIN FORM */}
              {authMode === 'login' && (
                <form onSubmit={handleLoginSubmit} className="space-y-3.5">
                  <div className="text-center pb-1">
                    <h2 className="text-lg font-bold text-white">অ্যাকাউন্টে প্রবেশ করুন</h2>
                    <p className="text-[11px] text-slate-400 mt-0.5">
                      নিরাপত্তার স্বার্থে আপনার জিমেইল ও সিকিউরিটি পিন প্রদান করুন
                    </p>
                  </div>

                  {loginError && (
                    <div className="p-3 rounded-xl bg-rose-500/20 border border-rose-500/40 text-rose-300 text-xs flex items-start gap-2">
                      <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                      <span className="leading-relaxed">{loginError}</span>
                    </div>
                  )}

                  {/* Gmail Input - COMPLETELY EMPTY (NO EXPOSED DATA) */}
                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1">
                      আপনার জিমেইল (Gmail) <span className="text-rose-400">*</span>
                    </label>
                    <div className="relative">
                      <Mail className="w-4 h-4 text-slate-500 absolute left-3 top-3" />
                      <input
                        type="email"
                        value={loginEmail}
                        onChange={(e) => {
                          setLoginEmail(e.target.value);
                          setLoginError('');
                        }}
                        placeholder="যেমন: yourname@gmail.com"
                        className="w-full pl-9 pr-3.5 py-2.5 rounded-xl bg-slate-800 border border-slate-700 text-white text-xs sm:text-sm focus:ring-2 focus:ring-emerald-500 outline-none font-mono"
                        required
                        autoFocus
                      />
                    </div>
                  </div>

                  {/* Security PIN Input - COMPLETELY EMPTY */}
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="block text-xs font-semibold text-slate-300">
                        সিকিউরিটি পিন (PIN) <span className="text-rose-400">*</span>
                      </label>
                      <button
                        type="button"
                        onClick={() => setShowLoginPin(!showLoginPin)}
                        className="text-[10px] text-slate-400 hover:text-emerald-400 flex items-center gap-1 cursor-pointer"
                      >
                        {showLoginPin ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                        <span>{showLoginPin ? 'লুকান' : 'দেখুন'}</span>
                      </button>
                    </div>
                    <div className="relative">
                      <Lock className="w-4 h-4 text-slate-500 absolute left-3 top-3" />
                      <input
                        type={showLoginPin ? 'text' : 'password'}
                        maxLength={8}
                        value={loginPin}
                        onChange={(e) => {
                          setLoginPin(e.target.value);
                          setLoginError('');
                        }}
                        placeholder="আপনার গোপন পিন লিখুন"
                        className="w-full pl-9 pr-10 py-2.5 rounded-xl bg-slate-800 border border-slate-700 text-white text-xs sm:text-sm focus:ring-2 focus:ring-emerald-500 outline-none font-mono tracking-wider"
                        required
                      />
                      <button
                        type="button"
                        onClick={() => setShowLoginPin(!showLoginPin)}
                        className="absolute right-3 top-2.5 text-slate-400 hover:text-white p-0.5 cursor-pointer"
                      >
                        {showLoginPin ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>

                  {/* Forgot PIN Link */}
                  <div className="flex items-center justify-end text-[11px] pt-0.5">
                    <button
                      type="button"
                      onClick={() => setIsForgotPinModalOpen(true)}
                      className="text-amber-300 hover:text-amber-200 underline cursor-pointer font-medium inline-flex items-center gap-1"
                    >
                      <Key className="w-3 h-3" />
                      <span>পিন মনে নেই? জিমেইল ওটিপি (OTP) রিসেট</span>
                    </button>
                  </div>

                  {/* Submit Button */}
                  <button
                    type="submit"
                    disabled={isSubmittingLogin}
                    className="w-full py-3 rounded-2xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-sm shadow-xl shadow-emerald-700/30 transition-all active:scale-[0.99] cursor-pointer disabled:opacity-75 flex items-center justify-center gap-2"
                  >
                    <LogIn className="w-4 h-4" />
                    <span>{isSubmittingLogin ? 'যাচাই করা হচ্ছে...' : 'লগইন করুন'}</span>
                  </button>

                  {/* Or Google Sign-In via Firebase */}
                  <div className="relative my-3 flex items-center justify-center">
                    <div className="border-t border-slate-700/80 w-full" />
                    <span className="bg-slate-900 px-3 text-[11px] text-slate-400 absolute">অথবা</span>
                  </div>

                  <button
                    type="button"
                    onClick={handleGoogleFirebaseSignIn}
                    disabled={isGoogleSigningIn}
                    className="w-full py-2.5 px-3 rounded-2xl bg-white hover:bg-slate-100 text-slate-800 font-semibold text-xs shadow-md transition-all active:scale-[0.99] cursor-pointer flex items-center justify-center gap-2 border border-slate-200"
                  >
                    <svg className="w-4 h-4" viewBox="0 0 24 24">
                      <path
                        fill="#4285F4"
                        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                      />
                      <path
                        fill="#34A853"
                        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                      />
                      <path
                        fill="#FBBC05"
                        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                      />
                      <path
                        fill="#EA4335"
                        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                      />
                    </svg>
                    <span>{isGoogleSigningIn ? 'Google যুক্ত হচ্ছে...' : 'Google দিয়ে সাইন ইন (Firebase)'}</span>
                  </button>

                  <div className="text-center pt-2">
                    <span className="text-xs text-slate-400">অ্যাকাউন্ট নেই? </span>
                    <button
                      type="button"
                      onClick={() => {
                        setAuthMode('register');
                        setLoginError('');
                      }}
                      className="text-xs text-teal-400 hover:text-teal-300 font-bold underline cursor-pointer"
                    >
                      নতুন ইউজার তৈরি করুন
                    </button>
                  </div>
                </form>
              )}

              {/* MODE 2: CREATE NEW USER FORM */}
              {authMode === 'register' && (
                <form onSubmit={handleRegisterSubmit} className="space-y-3.5">
                  <div className="text-center pb-1">
                    <h2 className="text-lg font-bold text-white">নতুন ইউজার রেজিস্ট্রেশন</h2>
                    <p className="text-[11px] text-slate-400 mt-0.5">
                      ইমেইল ও পিন প্রদান করে আপনার নিজস্ব অ্যাকাউন্ট ও ডাটাবেস তৈরি করুন
                    </p>
                  </div>

                  {regError && (
                    <div className="p-3 rounded-xl bg-rose-500/20 border border-rose-500/40 text-rose-300 text-xs flex items-start gap-2">
                      <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                      <span>{regError}</span>
                    </div>
                  )}

                  {regSuccessMsg && (
                    <div className="p-3 rounded-xl bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 text-xs flex items-center gap-2">
                      <CheckCircle className="w-4 h-4 shrink-0 text-emerald-400" />
                      <span>{regSuccessMsg}</span>
                    </div>
                  )}

                  {/* User Name */}
                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1">
                      আপনার নাম / প্রতিষ্ঠানের নাম <span className="text-rose-400">*</span>
                    </label>
                    <div className="relative">
                      <User className="w-4 h-4 text-slate-500 absolute left-3 top-3" />
                      <input
                        type="text"
                        value={regName}
                        onChange={(e) => setRegName(e.target.value)}
                        placeholder="যেমন: সাকিব হোসাইন / নকশালতা"
                        className="w-full pl-9 pr-3.5 py-2.5 rounded-xl bg-slate-800 border border-slate-700 text-white text-xs sm:text-sm focus:ring-2 focus:ring-teal-500 outline-none"
                        required
                        autoFocus
                      />
                    </div>
                  </div>

                  {/* Gmail Address */}
                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1">
                      জিমেইল অ্যাড্রেস <span className="text-rose-400">*</span>
                    </label>
                    <div className="relative">
                      <Mail className="w-4 h-4 text-slate-500 absolute left-3 top-3" />
                      <input
                        type="email"
                        value={regEmail}
                        onChange={(e) => setRegEmail(e.target.value)}
                        placeholder="যেমন: yourname@gmail.com"
                        className="w-full pl-9 pr-3.5 py-2.5 rounded-xl bg-slate-800 border border-slate-700 text-white text-xs sm:text-sm focus:ring-2 focus:ring-teal-500 outline-none font-mono"
                        required
                      />
                    </div>
                    <span className="text-[10px] text-slate-400 mt-1 block">
                      এই জিমেইলটি আপনার ডাটা আইসোলেশন ও ব্যাকআপের জন্য ব্যবহৃত হবে।
                    </span>
                  </div>

                  {/* PIN & Confirm PIN */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <label className="block text-xs font-semibold text-slate-300">
                          নতুন গোপন পিন <span className="text-rose-400">*</span>
                        </label>
                        <button
                          type="button"
                          onClick={() => setShowRegPin(!showRegPin)}
                          className="text-[10px] text-slate-400 hover:text-teal-400 cursor-pointer"
                        >
                          {showRegPin ? 'লুকান' : 'দেখুন'}
                        </button>
                      </div>
                      <div className="relative">
                        <Lock className="w-4 h-4 text-slate-500 absolute left-3 top-3" />
                        <input
                          type={showRegPin ? 'text' : 'password'}
                          maxLength={8}
                          value={regPin}
                          onChange={(e) => setRegPin(e.target.value)}
                          placeholder="৪-৮ সংখ্যার পিন"
                          className="w-full pl-9 pr-3 py-2.5 rounded-xl bg-slate-800 border border-slate-700 text-white text-xs focus:ring-2 focus:ring-teal-500 outline-none font-mono"
                          required
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-300 mb-1">
                        পিন নিশ্চিত করুন <span className="text-rose-400">*</span>
                      </label>
                      <div className="relative">
                        <Lock className="w-4 h-4 text-slate-500 absolute left-3 top-3" />
                        <input
                          type={showRegPin ? 'text' : 'password'}
                          maxLength={8}
                          value={regConfirmPin}
                          onChange={(e) => setRegConfirmPin(e.target.value)}
                          placeholder="পুনরায় পিন লিখুন"
                          className="w-full pl-9 pr-3 py-2.5 rounded-xl bg-slate-800 border border-slate-700 text-white text-xs focus:ring-2 focus:ring-teal-500 outline-none font-mono"
                          required
                        />
                      </div>
                    </div>
                  </div>

                  {/* Register Submit Button */}
                  <button
                    type="submit"
                    disabled={isSubmittingReg}
                    className="w-full py-3 rounded-2xl bg-teal-600 hover:bg-teal-500 text-white font-bold text-sm shadow-xl shadow-teal-700/30 transition-all active:scale-[0.99] cursor-pointer disabled:opacity-75 flex items-center justify-center gap-2"
                  >
                    <UserPlus className="w-4 h-4" />
                    <span>{isSubmittingReg ? 'অ্যাকাউন্ট তৈরি হচ্ছে...' : 'অ্যাকাউন্ট তৈরি ও লগইন করুন'}</span>
                  </button>

                  <div className="text-center pt-2">
                    <span className="text-xs text-slate-400">ইতিমধ্যে অ্যাকাউন্ট আছে? </span>
                    <button
                      type="button"
                      onClick={() => {
                        setAuthMode('login');
                        setRegError('');
                      }}
                      className="text-xs text-emerald-400 hover:text-emerald-300 font-bold underline cursor-pointer"
                    >
                      সরাসরি লগইন করুন
                    </button>
                  </div>
                </form>
              )}

              {/* Security info footer */}
              <div className="bg-emerald-950/40 border border-emerald-900/60 rounded-xl p-3 text-left space-y-1">
                <div className="flex items-center gap-1.5 text-xs font-bold text-emerald-300">
                  <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0" />
                  <span>আইসোলেটেড ডেটাবেস ও ব্যক্তিগত নিরাপত্তা</span>
                </div>
                <p className="text-[11px] text-slate-400 leading-relaxed">
                  লগইন স্ক্রিনে কোনো ইউজারের তথ্য আগে থেকে সংরক্ষিত বা প্রদর্শিত থাকে না। সঠিক জিমেইল ও সিকিউরিটি পিন মিললেই কেবল উক্ত ইউজারের ডেটাবেসে প্রবেশ করা সম্ভব।
                </p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Forgot PIN / Gmail 5-Minute OTP Modal */}
      <ForgotPinModal
        isOpen={isForgotPinModalOpen}
        onClose={() => setIsForgotPinModalOpen(false)}
        defaultEmail={loginEmail.trim() || ''}
        businessNameBn={settings.businessNameBn}
        onSuccess={handleForgotPinSuccess}
      />

      {/* Required Small Facebook Link at the bottom */}
      <footer className="w-full text-center py-3">
        <a
          href="https://facebook.com/nakshalata"
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1.5 text-xs text-slate-400 hover:text-emerald-400 transition-colors tracking-wide"
        >
          <span>facebook.com/nakshalata</span>
          <ExternalLink className="w-3 h-3" />
        </a>
        <p className="text-[10px] text-slate-600 mt-0.5">
          {settings.businessNameBn} • সর্বস্বত্ব সংরক্ষিত ২০২৬
        </p>
      </footer>
    </div>
  );
};
