import { Router } from 'express';
import { authController } from '../controllers/authController.js';
import { ipLimiter, emailRateLimiter } from '../middlewares/rateLimiter.js';
import { authenticateToken } from '../middlewares/authMiddleware.js';

const router = Router();

// 1. Send OTP (with IP rate limiting and email rate limiting)
router.post('/send-otp', ipLimiter, emailRateLimiter, authController.sendOtp);

// 2. Verify OTP (with IP rate limiting)
router.post('/verify-otp', ipLimiter, authController.verifyOtp);

// 3. Current authenticated user profile
router.get('/me', authenticateToken, authController.me);

// 4. Logout (clears cookies)
router.post('/logout', authController.logout);

export default router;
