/**
 * VIP Service Error Classes
 *
 * Custom error classes for better error handling instead of string matching
 */

export class VipAuthenticationError extends Error {
  constructor(message = 'Authentication required') {
    super(message);
    this.name = 'VipAuthenticationError';
  }
}

export class VipNotFoundError extends Error {
  constructor(message = 'VIP loadout not found') {
    super(message);
    this.name = 'VipNotFoundError';
  }
}

export class VipInvalidLoadoutError extends Error {
  constructor(message = 'Not a VIP loadout') {
    super(message);
    this.name = 'VipInvalidLoadoutError';
  }
}
