/**
 * Field validators ported from the Cred2Tech WebApp (DSARegisterPage / LoginPage).
 * Each returns an error message string, or '' when the value is valid.
 */

const EMAIL_RE = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;

const SPAM_EMAIL_PATTERNS = [
  /^(test|demo|sample|example|abc|xyz|temp|fake|spam)@/i,
  /@(test|demo|sample|example|temp|fake)\./i,
  /^(admin|user|email|mail|info)@/i,
];

export function validateName(value: string, label = 'Name'): string {
  if (!value.trim()) return `${label} is required`;
  if (value.trim().length < 2) return `${label} must be at least 2 characters`;
  return '';
}

export function validateEmail(value: string, { allowSpam = false } = {}): string {
  if (!value.trim()) return 'Email is required';
  if (!allowSpam && SPAM_EMAIL_PATTERNS.some((p) => p.test(value))) {
    return 'Please enter a valid business email address';
  }
  if (!EMAIL_RE.test(value)) return 'Invalid email format (e.g. abc@xyz.com)';
  return '';
}

export function validateRequired(value: string, label = 'This field'): string {
  return value.trim() ? '' : `${label} is required`;
}

/**
 * Validate a 10-digit national mobile number against the selected dial code.
 * `number` should be the digits only (no country code).
 */
export function validateMobile(number: string, dialCode = '+91'): string {
  const digits = (number || '').replace(/\D/g, '');
  if (!digits) return 'Mobile number is required';
  if (digits.length !== 10) return 'Mobile number must be exactly 10 digits';
  if (/^(.)\1{9}$/.test(digits)) return 'Please enter a valid mobile number';
  if (/^0123456789$|^9876543210$|^1234567890$/.test(digits)) return 'Please enter a valid mobile number';
  if (dialCode === '+91' && !/^[6-9]\d{9}$/.test(digits)) return 'Indian mobile numbers must start with 6-9';
  const full = `${dialCode}${digits}`;
  if (!/^\+[1-9]\d{1,3}[1-9]\d{4,12}$/.test(full)) return 'Invalid mobile format';
  return '';
}

export function validatePincode(value: string): string {
  if (!value.trim()) return 'Pincode is required';
  if (value.length !== 6) return 'Pincode must be exactly 6 digits';
  if (!/^[1-9][0-9]{5}$/.test(value)) return 'Invalid pincode format';
  return '';
}

export function getPasswordRequirements(pwd = '') {
  return {
    length: pwd.length >= 8,
    upper: /[A-Z]/.test(pwd),
    lower: /[a-z]/.test(pwd),
    number: /[0-9]/.test(pwd),
    special: /[!@#$%^&*(),.?":{}|<>]/.test(pwd),
  };
}

export const PASSWORD_RULES: { key: keyof ReturnType<typeof getPasswordRequirements>; label: string }[] = [
  { key: 'length', label: 'At least 8 characters' },
  { key: 'upper', label: 'One uppercase letter' },
  { key: 'lower', label: 'One lowercase letter' },
  { key: 'number', label: 'One number' },
  { key: 'special', label: 'One special character' },
];

export const allPasswordRequirementsMet = (pwd: string): boolean =>
  Object.values(getPasswordRequirements(pwd)).every(Boolean);

export function validatePassword(value: string): string {
  if (!value) return 'Password is required';
  if (!allPasswordRequirementsMet(value)) {
    return 'Password must include uppercase, lowercase, number and special char';
  }
  return '';
}
