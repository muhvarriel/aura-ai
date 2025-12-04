import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";
import { AI_CONFIG } from "@/core/constants/ai-config";

export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs));
}

export function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

export function isNonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

export function isValidNumber(value: unknown): value is number {
  return typeof value === "number" && !isNaN(value) && isFinite(value);
}

export function safeJsonParse<T>(
  json: string,
  validator?: (value: unknown) => value is T,
): T | null {
  try {
    const parsed: unknown = JSON.parse(json);

    if (validator && !validator(parsed)) {
      console.error("JSON parsed but failed validation");
      return null;
    }

    return parsed as T;
  } catch (error) {
    console.error("JSON parse error:", error);
    return null;
  }
}

export function debounce<T extends (...args: Parameters<T>) => ReturnType<T>>(
  func: T,
  wait: number,
): (...args: Parameters<T>) => void {
  let timeout: NodeJS.Timeout | null = null;

  return function executedFunction(...args: Parameters<T>) {
    const later = () => {
      timeout = null;
      func(...args);
    };

    if (timeout) {
      clearTimeout(timeout);
    }
    timeout = setTimeout(later, wait);
  };
}

export function throttle<T extends (...args: Parameters<T>) => ReturnType<T>>(
  func: T,
  limit: number,
): (...args: Parameters<T>) => void {
  let inThrottle: boolean = false;

  return function executedFunction(...args: Parameters<T>) {
    if (!inThrottle) {
      func(...args);
      inThrottle = true;
      setTimeout(() => {
        inThrottle = false;
      }, limit);
    }
  };
}

interface RateLimitWindow {
  timestamps: number[];
}

interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  resetTime: number;
  limit: number;
}

type EndpointKey = "GENERATE" | "CONTENT";

class RateLimiter {
  private store: Map<string, RateLimitWindow>;
  private cleanupInterval: NodeJS.Timeout;

  constructor() {
    this.store = new Map();
    this.cleanupInterval = setInterval(() => this.cleanup(), 600000);
  }

  private cleanup(): void {
    const now = Date.now();
    const hourAgo = now - 3600000;

    for (const [key, window] of this.store.entries()) {
      window.timestamps = window.timestamps.filter((ts) => ts > hourAgo);
      if (window.timestamps.length === 0) {
        this.store.delete(key);
      }
    }
  }

  private getWindow(identifier: string): RateLimitWindow {
    let window = this.store.get(identifier);
    if (!window) {
      window = { timestamps: [] };
      this.store.set(identifier, window);
    }
    return window;
  }

  check(identifier: string, endpoint: EndpointKey): RateLimitResult {
    const now = Date.now();
    const minuteAgo = now - 60000;
    const hourAgo = now - 3600000;

    const config = AI_CONFIG.RATE_LIMITS[endpoint];
    const window = this.getWindow(`${identifier}:${endpoint}`);

    window.timestamps = window.timestamps.filter((ts) => ts > hourAgo);

    const recentMinute = window.timestamps.filter((ts) => ts > minuteAgo);
    const recentHour = window.timestamps;

    const perMinuteExceeded = recentMinute.length >= config.PER_MINUTE;
    const perHourExceeded = recentHour.length >= config.PER_HOUR;

    if (perMinuteExceeded || perHourExceeded) {
      const oldestRelevant = perMinuteExceeded
        ? recentMinute[0]
        : recentHour[0];
      const resetTime = perMinuteExceeded
        ? oldestRelevant + 60000
        : oldestRelevant + 3600000;

      const limit = perMinuteExceeded ? config.PER_MINUTE : config.PER_HOUR;

      return {
        allowed: false,
        remaining: 0,
        resetTime,
        limit,
      };
    }

    window.timestamps.push(now);

    const remainingMinute = config.PER_MINUTE - (recentMinute.length + 1);
    const remainingHour = config.PER_HOUR - (recentHour.length + 1);

    return {
      allowed: true,
      remaining: Math.min(remainingMinute, remainingHour),
      resetTime: now + 60000,
      limit: config.PER_MINUTE,
    };
  }

  destroy(): void {
    clearInterval(this.cleanupInterval);
    this.store.clear();
  }
}

export const rateLimiter = new RateLimiter();

export function checkRateLimit(
  identifier: string,
  endpoint: EndpointKey,
): RateLimitResult {
  return rateLimiter.check(identifier, endpoint);
}
