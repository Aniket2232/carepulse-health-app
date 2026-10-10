import jwt from 'jsonwebtoken';
import { ENV } from '../config/env.js';

export const tokenService = {
  /**
   * Issue 15-minute Access Token
   */
  generateAccessToken(payload) {
    return jwt.sign(payload, ENV.JWT_SECRET, {
      expiresIn: '15m'
    });
  },

  /**
   * Issue 7-day Refresh Token
   */
  generateRefreshToken(payload) {
    return jwt.sign(payload, ENV.JWT_REFRESH_SECRET, {
      expiresIn: '7d'
    });
  },

  /**
   * Verify Access Token
   */
  verifyAccessToken(token) {
    try {
      return { valid: true, payload: jwt.verify(token, ENV.JWT_SECRET) };
    } catch (err) {
      return { valid: false, error: err.message };
    }
  },

  /**
   * Verify Refresh Token
   */
  verifyRefreshToken(token) {
    try {
      return { valid: true, payload: jwt.verify(token, ENV.JWT_REFRESH_SECRET) };
    } catch (err) {
      return { valid: false, error: err.message };
    }
  }
};
