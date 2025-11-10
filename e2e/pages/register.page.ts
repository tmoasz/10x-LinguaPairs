import type { Locator, Page } from "@playwright/test";

type RegisterField = "email" | "password" | "passwordConfirm";

interface RegisterFormValues {
  email: string;
  password: string;
  passwordConfirm: string;
}

/**
 * Page Object Model for the registration form.
 */
export class RegisterPage {
  readonly page: Page;
  readonly form: Locator;
  readonly emailInput: Locator;
  readonly passwordInput: Locator;
  readonly passwordConfirmInput: Locator;
  readonly submitButton: Locator;
  readonly passwordStrengthIndicator: Locator;
  readonly successHeading: Locator;
  readonly successContainer: Locator;
  readonly successDescription: Locator;
  readonly resendButton: Locator;

  constructor(page: Page) {
    this.page = page;
    // Use data-testid as primary selectors for stability
    // These are more resilient to UI changes than semantic selectors
    this.emailInput = page.getByTestId("register-email-input");
    this.passwordInput = page.getByTestId("register-password-input");
    this.passwordConfirmInput = page.getByTestId("register-password-confirm-input");
    this.submitButton = page.getByTestId("register-submit-button");
    this.passwordStrengthIndicator = page.getByTestId("register-password-strength");
    this.successHeading = page.getByTestId("register-success-heading");
    this.successDescription = page.getByTestId("register-success-description");
    this.successContainer = page.getByTestId("register-success");
    this.resendButton = page.getByTestId("register-resend-button");
    this.form = page.getByTestId("register-form");
  }

  async goto() {
    await this.page.goto("/auth/register");
  }

  getFieldError(field: RegisterField): Locator {
    // Use data-testid as primary selector for stability
    const testIdMap: Record<RegisterField, string> = {
      email: "register-email-error",
      password: "register-password-error",
      passwordConfirm: "register-password-confirm-error",
    };
    return this.page.getByTestId(testIdMap[field]);
  }

  async fillEmail(email: string) {
    await this.emailInput.fill(email);
  }

  async fillPassword(password: string) {
    // Use pressSequentially() instead of fill() to properly trigger React onChange events
    // This ensures the password strength indicator updates correctly
    // Clear first to ensure clean state, then type to trigger onChange
    await this.passwordInput.clear();
    await this.passwordInput.pressSequentially(password, { delay: 0 });
  }

  async fillPasswordConfirm(passwordConfirm: string) {
    await this.passwordConfirmInput.fill(passwordConfirm);
  }

  async fillForm(values: RegisterFormValues) {
    await this.fillEmail(values.email);
    await this.fillPassword(values.password);
    await this.fillPasswordConfirm(values.passwordConfirm);
  }

  async blurField(field: RegisterField) {
    await this.getFieldInput(field).blur();
  }

  async submit() {
    await this.submitButton.click();
  }

  private getFieldInput(field: RegisterField): Locator {
    switch (field) {
      case "email":
        return this.emailInput;
      case "password":
        return this.passwordInput;
      case "passwordConfirm":
        return this.passwordConfirmInput;
      default:
        return this.emailInput;
    }
  }
}
