import { verifyAccessToken } from '../services/authService.js';

/**
 * Optional Authentication:
 * Attaches user to req.user if a valid token is present,
 * but allows guest users without token to proceed uninterrupted.
 */
export const optionalAuth = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  if (authHeader && authHeader.startsWith('Bearer ')) {
    const token = authHeader.split(' ')[1];
    const decoded = verifyAccessToken(token);
    if (decoded) {
      req.user = decoded;
    }
  }
  next();
};

/**
 * Required Authentication:
 * Enforces valid JWT token for protected routes.
 */
export const requireAuth = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({
      error: 'Unauthorized',
      message: 'Access token is required. Please sign in.'
    });
  }

  const token = authHeader.split(' ')[1];
  const decoded = verifyAccessToken(token);

  if (!decoded) {
    return res.status(401).json({
      error: 'Unauthorized',
      message: 'Access token is invalid or expired.'
    });
  }

  req.user = decoded;
  next();
};

export default {
  optionalAuth,
  requireAuth
};
