/**
 * Generate a unique temporary email for E2E registration tests.
 * Format: temp.{timestamp}.{random}@go2.pl
 *
 * @returns A unique email address for testing
 */
export function generateTempEmail(): string {
  const timestamp = Date.now();
  const random = Math.random().toString(36).substring(2, 8); // 6 random characters
  return `temp.${timestamp}.${random}@go2.pl`;
}

/**
 * Check if an email is a temporary test email.
 *
 * @param email - The email to check
 * @returns True if the email matches the temporary email pattern
 */
export function isTempEmail(email: string): boolean {
  return /^temp\.\d+\.[a-z0-9]+@go2\.pl$/i.test(email);
}
