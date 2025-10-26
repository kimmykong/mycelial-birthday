/**
 * Sanitize user input to prevent XSS attacks
 * Removes HTML tags, script tags, and other potentially dangerous content
 */
export function sanitizeInput(input: string): string {
  if (!input) return '';

  let sanitized = input;

  // Remove any HTML tags
  sanitized = sanitized.replace(/<[^>]*>/g, '');

  // Remove script tags and their content
  sanitized = sanitized.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '');

  // Remove event handlers (onclick, onerror, etc.)
  sanitized = sanitized.replace(/on\w+\s*=\s*["'][^"']*["']/gi, '');
  sanitized = sanitized.replace(/on\w+\s*=\s*[^\s>]*/gi, '');

  // Remove javascript: protocol
  sanitized = sanitized.replace(/javascript:/gi, '');

  // Remove data: protocol (can be used for XSS)
  sanitized = sanitized.replace(/data:/gi, '');

  // Trim whitespace
  sanitized = sanitized.trim();

  return sanitized;
}

/**
 * Validate that input contains only allowed characters for adjectives
 * Allows letters, spaces, hyphens, apostrophes
 */
export function isValidAdjective(input: string): boolean {
  // Allow letters (including accented characters), spaces, hyphens, and apostrophes
  const pattern = /^[\p{L}\s'-]+$/u;
  return pattern.test(input);
}

/**
 * Sanitize and validate adjective input
 */
export function sanitizeAdjective(input: string): {
  sanitized: string;
  isValid: boolean;
  error?: string;
} {
  const sanitized = sanitizeInput(input);

  if (!sanitized) {
    return {
      sanitized: '',
      isValid: false,
      error: 'Input cannot be empty'
    };
  }

  if (sanitized.length > 50) {
    return {
      sanitized: sanitized.substring(0, 50),
      isValid: false,
      error: 'Input is too long (max 50 characters)'
    };
  }

  if (!isValidAdjective(sanitized)) {
    return {
      sanitized,
      isValid: false,
      error: 'Only letters, spaces, hyphens, and apostrophes are allowed'
    };
  }

  return {
    sanitized,
    isValid: true
  };
}
