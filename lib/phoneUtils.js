/**
 * Validate if a phone number is in a recognizable format
 * Returns true if the number can be normalized to a valid format
 */
export function isValidPhoneFormat(phoneNumber) {
  if (!phoneNumber) return false;
  
  const cleaned = phoneNumber.toString().trim().replace(/\D/g, '');
  if (!cleaned) return false;
  
  // Valid formats:
  // - 10 digits starting with 0 (e.g., 0782830524)
  // - 9 digits starting with 7-9 (e.g., 782830524) - will be normalized to 10 digits
  // - 12 digits starting with 254 (e.g., 254782830524) - will be normalized
  // - 13 digits starting with +254 (e.g., +254782830524) - will be normalized
  
  return (
    /^0\d{9}$/.test(cleaned) || // 10 digits starting with 0
    /^[789]\d{8}$/.test(cleaned) || // 9 digits starting with 7-9
    /^254[789]\d{8}$/.test(cleaned) || // 12 digits with country code
    /^\+?254[789]\d{8}$/.test(cleaned.replace(/\+/g, '')) // 13 digits with +254
  );
}

/**
 * Normalize a single phone number to a standard format
 * Handles cases like "782830524" vs "0782830524" (same number)
 * 
 * Rules:
 * - If number starts with 0, keep it
 * - If number starts with 7-9 and is 9 digits (without leading 0), add leading 0
 * - Remove spaces, dashes, parentheses
 * - Keep only digits
 * 
 * Returns: { normalized: string, isValid: boolean, original: string }
 */
export function normalizeSinglePhoneNumber(phoneNumber) {
  if (!phoneNumber) {
    return { normalized: '', isValid: false, original: phoneNumber || '' };
  }
  
  const original = phoneNumber.toString().trim();
  
  // Remove all non-digit characters
  let cleaned = original.replace(/\D/g, '');
  
  if (!cleaned) {
    return { normalized: '', isValid: false, original };
  }
  
  // If number starts with 0 and is 10 digits, it's valid
  if (cleaned.startsWith('0') && cleaned.length === 10) {
    return { normalized: cleaned, isValid: true, original };
  }
  
  // If number starts with 7, 8, or 9 and is 9 digits, add leading 0
  // This handles cases like "782830524" -> "0782830524"
  if (/^[789]\d{8}$/.test(cleaned)) {
    return { normalized: '0' + cleaned, isValid: true, original };
  }
  
  // If number is 12 digits and starts with country code (e.g., 254 for Kenya)
  // Extract the last 9 digits and add leading 0
  // Example: "254782830524" -> "0782830524"
  if (/^254[789]\d{8}$/.test(cleaned)) {
    return { normalized: '0' + cleaned.substring(3), isValid: true, original };
  }
  
  // If number is 13 digits and starts with +254, extract and normalize
  const cleanedPhone = cleaned.replace(/\+/g, '');
  if (/^254[789]\d{8}$/.test(cleanedPhone)) {
    return { normalized: '0' + cleanedPhone.substring(3), isValid: true, original };
  }
  
  // If we can't normalize it, return as is but mark as invalid
  return { normalized: cleaned, isValid: false, original };
}

/**
 * Normalize phone number to a standard format
 * Handles cases like "782830524" vs "0782830524" (same number)
 * Also handles multiple phone numbers separated by "/" or other delimiters
 * 
 * If multiple numbers are provided, returns comma-separated valid numbers
 * Use normalizePhoneNumberWithAll() to get detailed information
 */
export function normalizePhoneNumber(phoneNumber) {
  if (!phoneNumber) return '';
  
  const normalized = normalizePhoneNumberWithAll(phoneNumber);
  return normalized.storage; // Returns comma-separated valid numbers
}

/**
 * Normalize phone number and return all numbers if multiple are provided
 * Returns an object with:
 * - all: array of normalized phone objects { normalized, isValid, original }
 * - validNumbers: array of valid normalized numbers
 * - invalidPhoneNumbers: array of invalid numbers that couldn't be normalized
 * - display: comma-separated string of all valid numbers (for display)
 * - storage: comma-separated string of all valid numbers (for storage)
 * - hasUnrecognized: boolean indicating if any numbers couldn't be normalized
 */
export function normalizePhoneNumberWithAll(phoneNumber) {
  if (!phoneNumber) {
    return {
      all: [],
      validNumbers: [],
      invalidPhoneNumbers: [],
      display: '',
      storage: '',
      hasUnrecognized: false,
    };
  }
  
  const cleaned = phoneNumber.toString().trim();
  if (!cleaned) {
    return {
      all: [],
      validNumbers: [],
      invalidPhoneNumbers: [],
      display: '',
      storage: '',
      hasUnrecognized: false,
    };
  }
  
  // Split by common delimiters: /, comma, semicolon, pipe, or "and"
  const delimiters = [/\s*\/\s*/, /\s*,\s*/, /\s*;\s*/, /\s*\|\s*/, /\s+and\s+/i];
  
  let phoneNumbers = [cleaned];
  
  // Try to split by delimiters
  for (const delimiter of delimiters) {
    if (cleaned.match(delimiter)) {
      phoneNumbers = cleaned.split(delimiter);
      break;
    }
  }
  
  // Normalize all phone numbers
  const normalizedResults = phoneNumbers
    .map(phone => normalizeSinglePhoneNumber(phone))
    .filter(result => result.normalized.length > 0 || result.original.length > 0);
  
  const validNumbers = normalizedResults
    .filter(result => result.isValid)
    .map(result => result.normalized);
  
  const invalidPhoneNumbers = normalizedResults
    .filter(result => !result.isValid)
    .map(result => result.original);
  
  return {
    all: normalizedResults,
    validNumbers, // All valid normalized numbers
    invalidPhoneNumbers, // All invalid numbers that couldn't be normalized
    display: validNumbers.join(', '), // For display
    storage: validNumbers.join(', '), // For storage (comma-separated)
    hasUnrecognized: invalidPhoneNumbers.length > 0, // True if any numbers couldn't be normalized
  };
}

/**
 * Extract all phone numbers from a string that may contain multiple numbers
 * Returns an array of normalized phone numbers (only valid ones)
 */
export function extractAllPhoneNumbers(phoneNumber) {
  const normalized = normalizePhoneNumberWithAll(phoneNumber);
  return normalized.validNumbers;
}

/**
 * Check if two phone numbers are the same (after normalization)
 * Also checks if either number contains the other (for multiple number cases)
 */
export function arePhoneNumbersEqual(phone1, phone2) {
  const normalized1 = normalizePhoneNumber(phone1);
  const normalized2 = normalizePhoneNumber(phone2);
  
  if (normalized1 === normalized2) return true;
  
  // Check if one number is contained in the other (for cases with multiple numbers)
  const allNumbers1 = extractAllPhoneNumbers(phone1);
  const allNumbers2 = extractAllPhoneNumbers(phone2);
  
  // Check if any normalized number from phone1 matches any from phone2
  for (const num1 of allNumbers1) {
    for (const num2 of allNumbers2) {
      if (num1 === num2) return true;
    }
  }
  
  return false;
}

/**
 * Format phone number for display (adds spacing for readability)
 * Example: "0782830524" -> "0782 830 524"
 */
export function formatPhoneNumberForDisplay(phoneNumber) {
  const normalized = normalizePhoneNumber(phoneNumber);
  if (!normalized) return '';
  
  // Format as: 0XXX XXX XXX for 10-digit numbers
  if (normalized.length === 10 && normalized.startsWith('0')) {
    return `${normalized.substring(0, 4)} ${normalized.substring(4, 7)} ${normalized.substring(7)}`;
  }
  
  return normalized;
}

