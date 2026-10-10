import rateLimit from 'express-rate-limit';
import { otpStorage } from '../config/redis.js';

/**
 * IP-based rate limiting (Max 10 requests per hour per IP)
 */
export const ipLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 10, // 10 requests per IP per hour
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    error: 'Too many requests from this IP. Maximum 10 requests allowed per hour.'
  }
});

/**
 * Email-based rate limiting (Max 3 OTP requests per email per hour)
 */
export const emailRateLimiter = async (req, res, next) => {
  const { email } = req.body;
  if (!email) {
    return res.status(400).json({ error: 'Email is required' });
  }

  const normalizedEmail = email.trim().toLowerCase();
  const rateKey = `rate_limit_email:${normalizedEmail}`;

  try {
    const currentCountStr = await otpStorage.get(rateKey);
    const count = currentCountStr ? parseInt(currentCountStr, 10) : 0;

    if (count >= 3) {
      return res.status(429).json({
        error: 'Too many OTP requests for this email. Maximum 3 requests allowed per hour. Please wait before requesting another OTP.'
      });
    }

    // Increment count with 1 hour (3600 seconds) window
    await otpStorage.setEx(rateKey, 3600, (count + 1).toString());
    next();
  } catch (err) {
    // If rate limit check encounters store error, allow request to proceed safely
    next();
  }
};
