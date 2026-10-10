import { ENV } from '../config/env.js';
import { otpService } from '../services/otpService.js';
import { emailService } from '../services/emailService.js';
import { tokenService } from '../services/tokenService.js';
import { otpStorage } from '../config/redis.js';

export const authController = {
  /**
   * POST /api/auth/send-otp (and /api/send-otp)
   */
  async sendOtp(req, res) {
    try {
      const { email } = req.body;

      // 1. Validate email and check domain typos (.con, gmal.com, etc.)
      const validation = otpService.validateEmail(email);
      if (!validation.valid) {
        return res.status(400).json({ error: validation.error });
      }

      const targetEmail = validation.email;

      // 2. Generate cryptographically secure 6-digit OTP
      const otpCode = otpService.generateOtp();

      // 3. Save SHA-256 HASH of the OTP (never plain text) with 5-minute TTL
      const saveResult = await otpService.saveHashedOtp(targetEmail, otpCode);
      if (!saveResult.success) {
        return res.status(429).json({ error: saveResult.error });
      }

      // 4. Record DPDP Act 2023 consent
      const clientIp = req.headers['x-forwarded-for'] || req.socket.remoteAddress;
      await otpService.saveDpdpConsent(targetEmail, clientIp);

      // 5. Send OTP via real email provider (SMTP, Resend, or Dev Fallback)
      let mailResult = null;
      try {
        mailResult = await emailService.sendOtpEmail(targetEmail, otpCode);
      } catch (mailError) {
        // If email provider rejected in production, delete stored hash
        await otpStorage.del(`otp:${targetEmail}`);
        return res.status(502).json({
          error: `Email delivery failed: ${mailError.message || 'Unable to connect to email provider.'}`
        });
      }

      // 6. Response
      const isDev = ENV.NODE_ENV !== 'production';
      return res.status(200).json({
        success: true,
        message: 'OTP sent',
        devOtp: (isDev && mailResult?.devOtp) ? mailResult.devOtp : undefined,
        previewUrl: (isDev && mailResult?.previewUrl) ? mailResult.previewUrl : undefined
      });
    } catch {
      return res.status(500).json({
        error: 'Internal server error while processing OTP request'
      });
    }
  },

  /**
   * POST /api/auth/verify-otp (and /api/verify-otp)
   */
  async verifyOtp(req, res) {
    try {
      const { email, otp } = req.body;

      // 1. Validate inputs
      const validation = otpService.validateEmail(email);
      if (!validation.valid) {
        return res.status(400).json({ error: validation.error });
      }

      const otpValidation = otpService.validateOtpFormat(otp);
      if (!otpValidation.valid) {
        return res.status(400).json({ error: otpValidation.error });
      }

      const targetEmail = validation.email;
      const cleanOtp = otpValidation.otp;

      // 2. Verify OTP hash and enforce max 5 attempts lockout
      const result = await otpService.verifyOtp(targetEmail, cleanOtp);

      if (!result.valid) {
        const statusCode = result.locked ? 429 : result.expired ? 410 : 400;
        return res.status(statusCode).json({ error: result.error });
      }

      // 3. Issue JWT 15-minute Access Token & 7-day Refresh Token
      const tokenPayload = {
        email: targetEmail,
        role: 'user',
        platform: 'carepulse-health'
      };

      const accessToken = tokenService.generateAccessToken(tokenPayload);
      const refreshToken = tokenService.generateRefreshToken(tokenPayload);

      // 4. Set httpOnly, secure, sameSite cookies
      const isProduction = ENV.NODE_ENV === 'production';

      res.cookie('accessToken', accessToken, {
        httpOnly: true,
        secure: isProduction,
        sameSite: 'lax',
        maxAge: 15 * 60 * 1000 // 15 minutes
      });

      res.cookie('token', accessToken, {
        httpOnly: true,
        secure: isProduction,
        sameSite: 'lax',
        maxAge: 15 * 60 * 1000 // 15 minutes
      });

      res.cookie('refreshToken', refreshToken, {
        httpOnly: true,
        secure: isProduction,
        sameSite: 'lax',
        maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days
      });

      // 5. Return success JSON (with tokens for mobile apps)
      return res.status(200).json({
        success: true,
        message: 'OTP verified successfully',
        accessToken,
        refreshToken,
        token: accessToken,
        user: {
          email: targetEmail,
          role: 'user'
        }
      });
    } catch {
      return res.status(500).json({
        error: 'Internal server error during OTP verification'
      });
    }
  },

  /**
   * GET /api/auth/me
   */
  async me(req, res) {
    return res.status(200).json({
      success: true,
      user: {
        email: req.user.email,
        role: req.user.role || 'user',
        platform: 'CarePulse Health'
      }
    });
  },

  /**
   * POST /api/auth/logout
   */
  async logout(req, res) {
    const isProduction = ENV.NODE_ENV === 'production';
    const cookieOptions = {
      httpOnly: true,
      secure: isProduction,
      sameSite: 'lax'
    };

    res.clearCookie('accessToken', cookieOptions);
    res.clearCookie('token', cookieOptions);
    res.clearCookie('refreshToken', cookieOptions);

    return res.status(200).json({
      success: true,
      message: 'Logged out successfully'
    });
  }
};
