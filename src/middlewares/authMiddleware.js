import { tokenService } from '../services/tokenService.js';

/**
 * Middleware to verify JWT Access Token from cookies or Authorization header
 */
export const authenticateToken = (req, res, next) => {
  // Extract token from cookie or Authorization header
  let token = req.cookies?.accessToken || req.cookies?.token;

  if (!token && req.headers.authorization) {
    const parts = req.headers.authorization.split(' ');
    if (parts.length === 2 && parts[0] === 'Bearer') {
      token = parts[1];
    }
  }

  if (!token) {
    return res.status(401).json({
      error: 'Authentication required. No access token provided.'
    });
  }

  const verification = tokenService.verifyAccessToken(token);

  if (!verification.valid) {
    return res.status(401).json({
      error: 'Invalid or expired access token. Please re-authenticate.'
    });
  }

  req.user = verification.payload;
  next();
};
