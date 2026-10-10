import crypto from 'crypto';
import { z } from 'zod';
import { otpStorage } from '../config/redis.js';
import { ENV } from '../config/env.js';

// Blocked email typo domains
const TYPO_PATTERNS = [
  /\.con$/i,
  /\.cmo$/i,
  /\.coom$/i,
  /@gmal\.com$/i,
  /@gamil\.com$/i,
  /@gmial\.com$/i,
  /@yaho\.com$/i,
  /@yahho\.com$/i,
  /@hotmial\.com$/i,
  /@hotamil\.com$/i,
  /@outlok\.com$/i
];

// Zod Schema for input validation & sanitization
export const emailSchema = z.string()
  .trim()
  .toLowerCase()
  .min(5, 'Email is too short')
  .max(100, 'Email is too long')
  .email('Invalid email address format')
  .refine(
    (email) => !TYPO_PATTERNS.some(pattern => pattern.test(email)),
    {
      message: 'Invalid email domain typo detected (.con, @gmal.com, etc.). Please enter a valid email address.'
    }
  );

export const otpSchema = z.string()
  .trim()
  .regex(/^\d{6}$/, 'OTP must be exactly 6 numeric digits');

export const otpService = {
  /**
   * Validate and sanitize email using Zod
   */
  validateEmail(email) {
    if (!email || typeof email !== 'string') {
      return { valid: false, error: 'Email address is required' };
    }
    const result = emailSchema.safeParse(email);
    if (!result.success) {
      const msg = result.error.issues?.[0]?.message || 'Invalid email address';
      return { 
        valid: false, 
        error: msg 
      };
    }
    return { valid: true, email: result.data };
  },

  /**
   * Validate OTP format
   */
  validateOtpFormat(otp) {
    if (!otp || typeof otp !== 'string') {
      return { valid: false, error: 'OTP is required' };
    }
    const result = otpSchema.safeParse(otp);
    if (!result.success) {
      const msg = result.error.issues?.[0]?.message || 'Invalid OTP format';
      return { 
        valid: false, 
        error: msg 
      };
    }
    return { valid: true, otp: result.data };
  },

  /**
   * Generate cryptographically secure 6-digit OTP
   */
  generateOtp() {
    return crypto.randomInt(100000, 1000000).toString();
  },

  /**
   * Compute secure SHA-256 hash of OTP with secret salt
   */
  hashOtp(otp, email) {
    const salt = ENV.JWT_SECRET || 'carepulse_salt_2026';
    return crypto
      .createHash('sha256')
      .update(`${email}:${otp}:${salt}`)
      .digest('hex');
  },

  /**
   * Store hashed OTP with 5-minute (300 seconds) expiry in Redis / Memory
   */
  async saveHashedOtp(email, otp) {
    const hashed = this.hashOtp(otp, email);
    const otpKey = `otp:${email}`;
    const attemptsKey = `otp_attempts:${email}`;
    const lockKey = `otp_lock:${email}`;

    // Check if account is currently locked
    const isLocked = await otpStorage.get(lockKey);
    if (isLocked) {
      return { 
        success: false, 
        locked: true, 
        error: 'Too many incorrect attempts. This email is locked for 15 minutes.' 
      };
    }

    // Save hash with 5-minute TTL (300 seconds)
    await otpStorage.setEx(otpKey, 300, hashed);
    // Reset attempt counter
    await otpStorage.setEx(attemptsKey, 300, '0');

    return { success: true };
  },

  /**
   * Save DPDP Act 2023 Consent Audit Record
   */
  async saveDpdpConsent(email, ip) {
    const consentKey = `dpdp_consent:${email}`;
    const record = JSON.stringify({
      email,
      timestamp: new Date().toISOString(),
      consentVersion: 'DPDP_ACT_2023_V1',
      ip: ip || 'unknown',
      purpose: 'Authentication and healthcare platform access'
    });
    // Store consent record (1 year retention)
    await otpStorage.setEx(consentKey, 365 * 24 * 3600, record);
  },

  /**
   * Verify entered OTP against stored hash
   */
  async verifyOtp(email, enteredOtp) {
    const otpKey = `otp:${email}`;
    const attemptsKey = `otp_attempts:${email}`;
    const lockKey = `otp_lock:${email}`;

    // 1. Check if locked
    const isLocked = await otpStorage.get(lockKey);
    if (isLocked) {
      return { 
        valid: false, 
        locked: true, 
        error: 'Account temporarily locked due to excessive failed attempts. Please try again after 15 minutes.' 
      };
    }

    // 2. Retrieve stored hashed OTP
    const storedHash = await otpStorage.get(otpKey);
    if (!storedHash) {
      return { 
        valid: false, 
        expired: true, 
        error: 'OTP has expired or was not requested. Please request a new OTP.' 
      };
    }

    // 3. Constant-time hash comparison
    const computedHash = this.hashOtp(enteredOtp, email);
    const isMatch = crypto.timingSafeEqual(
      Buffer.from(storedHash, 'hex'),
      Buffer.from(computedHash, 'hex')
    );

    if (isMatch) {
      // Delete OTP immediately upon successful verification (single-use)
      await otpStorage.del(otpKey);
      await otpStorage.del(attemptsKey);
      return { valid: true };
    }

    // 4. Increment wrong attempts counter
    const currentAttemptsStr = (await otpStorage.get(attemptsKey)) || '0';
    const attempts = parseInt(currentAttemptsStr, 10) + 1;

    if (attempts >= 5) {
      // Invalidate OTP and lock email for 15 minutes (900 seconds)
      await otpStorage.del(otpKey);
      await otpStorage.del(attemptsKey);
      await otpStorage.setEx(lockKey, 900, 'locked');
      return { 
        valid: false, 
        locked: true, 
        error: 'Maximum 5 invalid attempts exceeded. This email is locked for 15 minutes.' 
      };
    }

    await otpStorage.setEx(attemptsKey, 300, attempts.toString());
    const remaining = 5 - attempts;
    return { 
      valid: false, 
      error: `Invalid OTP code. ${remaining} attempt${remaining === 1 ? '' : 's'} remaining.` 
    };
  }
};
