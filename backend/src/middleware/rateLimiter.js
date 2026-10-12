import rateLimit from 'express-rate-limit';

/**
 * Standard API Rate Limiter
 * 120 requests per minute per IP
 */
export const apiLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 120,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    error: 'Too Many Requests',
    message: 'Too many requests from this IP. Please try again shortly.',
    retryAfter: 60
  }
});

/**
 * Strict Auth Rate Limiter
 * Protects login and register against brute force attacks
 * 25 attempts per 15 minutes per IP
 */
export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 25,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    error: 'Too Many Auth Attempts',
    message: 'Too many authentication attempts. Please try again after 15 minutes.',
    retryAfter: 900
  }
});

/**
 * AI Chat & Voice Rate Limiter
 * 45 AI generation requests per minute
 */
export const chatLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 45,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    error: 'Rate Limit Exceeded',
    message: 'You are sending messages too quickly. Please wait a moment.',
    retryAfter: 30
  }
});

export default {
  apiLimiter,
  authLimiter,
  chatLimiter
};
