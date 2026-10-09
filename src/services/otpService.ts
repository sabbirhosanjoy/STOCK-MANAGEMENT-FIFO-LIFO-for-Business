// Service to handle 5-minute OTP generation, verification, and email dispatch for PIN reset

export interface OtpRecord {
  email: string;
  otp: string;
  createdAt: number;
  expiresAt: number; // Exactly 5 minutes from creation
  verified: boolean;
}

const OTP_EXPIRY_MS = 5 * 60 * 1000; // 5 minutes = 300,000 ms

function getOtpStorageKey(email: string): string {
  const cleanEmail = email.trim().toLowerCase().replace(/[^a-z0-9_]/g, '_');
  return `nl_otp_${cleanEmail}`;
}

/**
 * Generates a secure 6-digit OTP with a strict 5-minute lifetime
 */
export function generateOtp(email: string): OtpRecord {
  const cleanEmail = email.trim().toLowerCase();
  // 6-digit cryptographically secure or pseudo-random code
  const code = Math.floor(100000 + Math.random() * 900000).toString();
  const now = Date.now();
  const expiresAt = now + OTP_EXPIRY_MS;

  const record: OtpRecord = {
    email: cleanEmail,
    otp: code,
    createdAt: now,
    expiresAt,
    verified: false,
  };

  try {
    localStorage.setItem(getOtpStorageKey(cleanEmail), JSON.stringify(record));
  } catch (err) {
    console.warn('Failed to store OTP in localStorage:', err);
  }

  return record;
}

/**
 * Retrieves the currently active OTP record for an email
 */
export function getActiveOtp(email: string): OtpRecord | null {
  try {
    const cleanEmail = email.trim().toLowerCase();
    const raw = localStorage.getItem(getOtpStorageKey(cleanEmail));
    if (!raw) return null;
    const record: OtpRecord = JSON.parse(raw);
    return record;
  } catch {
    return null;
  }
}

/**
 * Returns remaining seconds until expiration. 0 if already expired.
 */
export function getRemainingOtpSeconds(email: string): number {
  const record = getActiveOtp(email);
  if (!record) return 0;
  const diff = record.expiresAt - Date.now();
  return diff > 0 ? Math.floor(diff / 1000) : 0;
}

/**
 * Checks whether the current OTP is expired
 */
export function isOtpExpired(email: string): boolean {
  return getRemainingOtpSeconds(email) <= 0;
}

/**
 * Verifies the user-entered OTP. Checks strict 5-minute expiry.
 */
export function verifyOtp(
  email: string,
  enteredOtp: string
): { success: boolean; message: string } {
  const cleanEmail = email.trim().toLowerCase();
  const cleanEnteredOtp = enteredOtp.trim();

  const record = getActiveOtp(cleanEmail);
  if (!record) {
    return {
      success: false,
      message: 'কোনো সক্রিয় ওটিপি (OTP) পাওয়া যায়নি! অনুগ্রহ করে প্রথমে ওটিপি পাঠান।',
    };
  }

  const remaining = getRemainingOtpSeconds(cleanEmail);
  if (remaining <= 0) {
    return {
      success: false,
      message: 'ওটিপি এর মেয়াদ শেষ (৫ মিনিট অতিক্রান্ত)! নিরাপত্তা সুরক্ষায় এই ওটিপি আর কাজ করবে না। অনুগ্রহ করে পুনরায় ওটিপি প্রেরণ করুন।',
    };
  }

  if (record.otp !== cleanEnteredOtp) {
    return {
      success: false,
      message: 'ভুল ওটিপি কোড! অনুগ্রহ করে আপনার জিমেইলে প্রেরিত সঠিক ৬-সংখ্যার কোডটি প্রবেশ করান।',
    };
  }

  return {
    success: true,
    message: 'ওটিপি সফলভাবে যাচাই করা হয়েছে।',
  };
}

/**
 * Clears the OTP once successfully used or cancelled
 */
export function clearOtp(email: string): void {
  try {
    const cleanEmail = email.trim().toLowerCase();
    localStorage.removeItem(getOtpStorageKey(cleanEmail));
  } catch {
    // ignore
  }
}

/**
 * Prepares Gmail URLs and pre-formatted email content
 */
export function buildGmailDispatch(
  email: string,
  otp: string,
  businessNameBn: string = 'নকশালতা'
) {
  const cleanEmail = email.trim();
  const subject = `[${businessNameBn}] পিন রিসেট ওয়ান-টাইম পাসওয়ার্ড (OTP): ${otp}`;
  const body = `প্রিয় ব্যবহারকারী,

${businessNameBn} সিস্টেমে আপনার অ্যাকাউন্ট (${cleanEmail})-এর সিকিউরিটি পিন রিসেট করার অনুরোধ গ্রহণ করা হয়েছে।

গোপনীয় ওটিপি (OTP) কোড:
==============================
${otp}
==============================

⏱️ মেয়াদ: এই ওটিপি কোডটি পরবর্তী ৫ মিনিট (5 Minutes) পর্যন্ত কার্যকর থাকবে। ৫ মিনিট অতিক্রান্ত হলে কোডটি স্বয়ংক্রিয়ভাবে বাতিল হয়ে যাবে।

⚠️ নিরাপত্তা নির্দেশনা:
- এই ওটিপি কোডটি কারো সাথে শেয়ার করবেন না।
- আপনি এই অনুরোধ না করে থাকলে অনুগ্রহ করে আপনার অ্যাকাউন্টের নিরাপত্তা নিশ্চিত করুন।

ধন্যবাদ,
${businessNameBn} সিকিউরিটি টিম`;

  const encodedSubject = encodeURIComponent(subject);
  const encodedBody = encodeURIComponent(body);

  const gmailWebUrl = `https://mail.google.com/mail/?view=cm&fs=1&to=${encodeURIComponent(
    cleanEmail
  )}&su=${encodedSubject}&body=${encodedBody}`;

  const mailtoUrl = `mailto:${encodeURIComponent(
    cleanEmail
  )}?subject=${encodedSubject}&body=${encodedBody}`;

  return {
    subject,
    body,
    gmailWebUrl,
    mailtoUrl,
  };
}
