const asEnabled = (value, fallback = '0') =>
  ['1', 'true', 'yes', 'on'].includes(String(value ?? fallback).trim().toLowerCase());

// Temporary open mode defaults ON for local product work.
export const AUTH_DISABLED = asEnabled(import.meta.env.VITE_AUTH_DISABLED, '1');
export const PAYMENTS_DISABLED = asEnabled(import.meta.env.VITE_PAYMENTS_DISABLED, '1');
export const OPEN_MODE = AUTH_DISABLED || PAYMENTS_DISABLED;
