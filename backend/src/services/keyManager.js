import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';

/**
 * Multi-API Key Manager & Load Balancer
 * Supports round-robin rotation, automatic failover, rate-limit cooldowns, and retry logic.
 */

export class ApiKeyPool {
  constructor(name, envVarNames = []) {
    this.name = name;
    this.envVarNames = envVarNames;
    this.keys = [];
    this.currentIndex = 0;
    this.keyStats = new Map(); // key -> { uses: 0, errors: 0, cooldownUntil: 0, lastUsed: null }
    this.reloadKeys();
  }

  /**
   * Parse keys from environment variables and .env file.
   * Accepts comma, semicolon, space, or newline separated keys.
   */
  reloadKeys() {
    try {
      dotenv.config({ override: true });
    } catch (_) {}

    const rawKeys = [];

    // 1. Read from process.env
    for (const varName of this.envVarNames) {
      const val = process.env[varName];
      if (val && typeof val === 'string') {
        const splitKeys = val
          .split(/[\r\n,;\s]+/)
          .map(k => k.trim())
          .filter(k => k.length > 5 && !k.startsWith('your_') && !k.includes('api_key_here'));
        rawKeys.push(...splitKeys);
      }
    }

    // 2. Direct regex scan from .env to support multi-line pasting
    try {
      const envPath = path.resolve(process.cwd(), '.env');
      if (fs.existsSync(envPath)) {
        const envContent = fs.readFileSync(envPath, 'utf8');
        // Remove commented lines (# ...)
        const uncommentedContent = envContent
          .split('\n')
          .filter(line => !line.trim().startsWith('#'))
          .join('\n');

        if (this.name === 'Groq') {
          const groqMatches = (uncommentedContent.match(/gsk_[A-Za-z0-9_-]+/g) || [])
            .filter(k => !k.startsWith('gsk_key') && !k.includes('your_') && k.length > 20);
          rawKeys.push(...groqMatches);
        } else if (this.name === 'HuggingFace') {
          const hfMatches = (uncommentedContent.match(/hf_[A-Za-z0-9_-]+/g) || [])
            .filter(k => !k.startsWith('hf_key') && !k.includes('your_') && k.length > 15);
          rawKeys.push(...hfMatches);
        }
      }
    } catch (_) {}

    // Deduplicate and filter out short/placeholder tokens
    const newKeys = Array.from(new Set(rawKeys)).filter(k => 
      !k.includes('your_') && 
      !k.startsWith('gsk_key') && 
      !k.startsWith('hf_key') &&
      k.length > 15
    );

    // Check if keys changed
    const isSame = this.keys.length === newKeys.length && this.keys.every((k, i) => k === newKeys[i]);
    if (!isSame) {
      this.keys = newKeys;
      this.currentIndex = 0;
    } else if (this.keys.length > 0) {
      this.currentIndex = this.currentIndex % this.keys.length;
    }

    // Initialize stats for keys
    for (const key of this.keys) {
      if (!this.keyStats.has(key)) {
        this.keyStats.set(key, { uses: 0, errors: 0, cooldownUntil: 0, lastUsed: null });
      }
    }
  }

  /**
   * Check if any valid keys are configured
   */
  hasKeys() {
    this.reloadKeys();
    return this.keys.length > 0;
  }

  /**
   * Get total number of valid keys
   */
  getKeyCount() {
    this.reloadKeys();
    return this.keys.length;
  }

  /**
   * Get masked representation of a key (e.g. gsk_abc...wxyz)
   */
  static maskKey(key) {
    if (!key || key.length < 8) return '****';
    return `${key.slice(0, 6)}...${key.slice(-4)}`;
  }

  /**
   * Select the next available key using round-robin and respecting cooldowns
   */
  getNextKey() {
    this.reloadKeys();
    if (this.keys.length === 0) return null;

    const now = Date.now();
    const total = this.keys.length;

    // First try: find a key not in cooldown starting from currentIndex
    for (let i = 0; i < total; i++) {
      const idx = (this.currentIndex + i) % total;
      const candidateKey = this.keys[idx];
      const stats = this.keyStats.get(candidateKey) || { cooldownUntil: 0 };

      if (stats.cooldownUntil <= now) {
        this.currentIndex = (idx + 1) % total;
        stats.uses = (stats.uses || 0) + 1;
        stats.lastUsed = new Date().toISOString();
        return { key: candidateKey, index: idx + 1, total };
      }
    }

    // If all keys are in cooldown, pick the one that expires soonest
    let soonestKey = this.keys[0];
    let soonestTime = Infinity;
    let soonestIdx = 0;

    for (let i = 0; i < total; i++) {
      const k = this.keys[i];
      const stats = this.keyStats.get(k) || { cooldownUntil: 0 };
      if (stats.cooldownUntil < soonestTime) {
        soonestTime = stats.cooldownUntil;
        soonestKey = k;
        soonestIdx = i;
      }
    }

    this.currentIndex = (soonestIdx + 1) % total;
    const stats = this.keyStats.get(soonestKey);
    stats.uses = (stats.uses || 0) + 1;
    stats.lastUsed = new Date().toISOString();
    return { key: soonestKey, index: soonestIdx + 1, total };
  }

  /**
   * Mark a key as temporarily cooling down (e.g. hit 429 rate limit or 401 error)
   */
  markCooldown(key, cooldownMs = 60000) {
    const stats = this.keyStats.get(key);
    if (stats) {
      stats.cooldownUntil = Date.now() + cooldownMs;
      stats.errors = (stats.errors || 0) + 1;
      console.warn(`⏳ [${this.name}] Key ${ApiKeyPool.maskKey(key)} put on cooldown for ${cooldownMs / 1000}s`);
    }
  }

  /**
   * Execute an async API call with automatic key rotation and retry on failures
   * @param {Function} taskFn - Function receiving the current API key: async (apiKey) => result
   * @param {number} maxRetries - Maximum number of retries across keys
   */
  async executeWithRotation(taskFn, maxRetries = null) {
    this.reloadKeys();

    if (this.keys.length === 0) {
      return null; // Signals caller to use fallback mode
    }

    const retriesLimit = maxRetries !== null ? maxRetries : this.keys.length;
    let lastError = null;

    for (let attempt = 0; attempt < retriesLimit; attempt++) {
      const keyInfo = this.getNextKey();
      if (!keyInfo) break;

      const { key, index, total } = keyInfo;
      const masked = ApiKeyPool.maskKey(key);

      try {
        const result = await taskFn(key);
        return result;
      } catch (err) {
        lastError = err;
        const errMsg = (err.message || '').toLowerCase();
        const statusCode = err.status || err.statusCode || (err.response && err.response.status);

        console.warn(`⚠️ [${this.name}] Request failed with key [${index}/${total}: ${masked}]: ${err.message}`);

        // Rate limit (429) -> 60s cooldown
        if (statusCode === 429 || errMsg.includes('rate limit') || errMsg.includes('quota')) {
          this.markCooldown(key, 60000);
        }
        // Authentication error (401/403) -> 5m cooldown
        else if (statusCode === 401 || statusCode === 403 || errMsg.includes('unauthorized') || errMsg.includes('invalid api key')) {
          this.markCooldown(key, 300000);
        }
        // Other errors -> short 10s cooldown
        else {
          this.markCooldown(key, 10000);
        }

        // If we have more than 1 key, continue to next key in pool
        if (total > 1 && attempt < retriesLimit - 1) {
          console.log(`🔄 [${this.name}] Automatically rotating to next available API key (Attempt ${attempt + 2}/${retriesLimit})...`);
        }
      }
    }

    throw lastError || new Error(`All ${this.name} API keys in pool failed.`);
  }

  /**
   * Return health & pool statistics
   */
  getStatus() {
    this.reloadKeys();
    const now = Date.now();
    const activeCount = this.keys.filter(k => {
      const s = this.keyStats.get(k);
      return !s || s.cooldownUntil <= now;
    }).length;

    return {
      name: this.name,
      totalKeys: this.keys.length,
      activeKeys: activeCount,
      configured: this.keys.length > 0,
      keys: this.keys.map((k, i) => {
        const s = this.keyStats.get(k) || {};
        return {
          index: i + 1,
          keyMasked: ApiKeyPool.maskKey(k),
          isAvailable: (s.cooldownUntil || 0) <= now,
          uses: s.uses || 0,
          errors: s.errors || 0
        };
      })
    };
  }
}

// Global Key Pool Singletons
export const groqKeyPool = new ApiKeyPool('Groq', ['GROQ_API_KEYS', 'GROQ_API_KEY']);
export const hfKeyPool = new ApiKeyPool('HuggingFace', ['HUGGINGFACE_API_KEYS', 'HUGGINGFACE_API_KEY']);

export default {
  ApiKeyPool,
  groqKeyPool,
  hfKeyPool
};
