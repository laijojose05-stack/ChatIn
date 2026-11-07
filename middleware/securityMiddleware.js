const rateLimit = require('express-rate-limit');

// 1. General API Rate Limiter
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 300,
  message: {
    success: false,
    message: 'Too many requests from this IP. Please try again later.',
  },
  standardHeaders: true,
  legacyHeaders: false,
});

// 2. Registration Anti-Spam Limiter (Max 5 account registrations per hour per IP)
const registerLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 6,
  message: {
    success: false,
    message: 'Too many accounts created from this network. Please wait an hour before trying again.',
  },
  standardHeaders: true,
  legacyHeaders: false,
});

// 3. Login Brute-Force Protection Limiter (Max 12 attempts per 15 mins per IP)
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 12,
  message: {
    success: false,
    message: 'Too many login attempts from this IP. Account access paused for 15 minutes for your security.',
  },
  standardHeaders: true,
  legacyHeaders: false,
});

// 4. Message Flooding Limiter (Max 45 messages per minute)
const messageLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 45,
  message: {
    success: false,
    message: 'You are sending messages too rapidly. Please slow down to prevent spam.',
  },
  standardHeaders: true,
  legacyHeaders: false,
});

// 5. Bot Honeypot & Submission Speed Middleware
const botHoneypot = (req, res, next) => {
  // If the hidden honeypot fields are filled by an automated bot script
  const honeypotField = req.body._hp_website || req.body.website_trap || req.body.company;
  if (honeypotField && honeypotField.trim().length > 0) {
    console.warn(`🛡️ Bot detected and blocked via Honeypot from IP: ${req.ip}`);
    // Return a delayed artificial success to silently drop the bot without tipping off the bot author
    return setTimeout(() => {
      res.status(200).json({ success: true, message: 'Account processed' });
    }, 1200);
  }

  // Fast-submit bot check: if loaded timestamp was sent and submitted under 600ms
  if (req.body._form_init) {
    const elapsed = Date.now() - parseInt(req.body._form_init, 10);
    if (!isNaN(elapsed) && elapsed < 600) {
      console.warn(`🛡️ Ultra-fast automated bot submission blocked (${elapsed}ms) from IP: ${req.ip}`);
      return res.status(400).json({
        success: false,
        message: 'Submission failed security verification. Please try again.',
      });
    }
  }

  next();
};

// 6. Text Sanitizer & Size Cap Middleware
const sanitizeMessage = (req, res, next) => {
  if (req.body && req.body.content) {
    let content = String(req.body.content).trim();

    // Prevent giant payload DOS
    if (content.length > 4000) {
      return res.status(400).json({
        success: false,
        message: 'Message exceeds maximum allowed length of 4,000 characters.',
      });
    }

    // Strip risky script tags or javascript protocols
    content = content
      .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
      .replace(/javascript:/gi, '');

    req.body.content = content;
  }
  next();
};

module.exports = {
  apiLimiter,
  registerLimiter,
  loginLimiter,
  messageLimiter,
  botHoneypot,
  sanitizeMessage,
};
