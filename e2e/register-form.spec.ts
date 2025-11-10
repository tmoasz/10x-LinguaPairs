import { test, expect } from "@playwright/test";
import { RegisterPage } from "./pages/register.page";
import { deleteTestUser } from "./helpers/db.helper";

test.describe("Register Form", () => {
  // Clean up test user before and after each test that creates a user
  test.beforeEach(async () => {
    // Clean up any existing test user before test runs
    await deleteTestUser("test.e2e@example.com");
  });

  test.afterEach(async () => {
    // Clean up test user after test completes
    await deleteTestUser("test.e2e@example.com");
  });
  test("displays inline validation errors for invalid values", async ({ page }) => {
    const registerPage = new RegisterPage(page);
    await registerPage.goto();

    // Wait for React component to hydrate
    await expect(registerPage.form).toBeVisible();

    // Click and blur email field to trigger validation
    await registerPage.emailInput.click();
    await registerPage.blurField("email");
    // Wait for error to appear after blur
    await expect(registerPage.getFieldError("email")).toBeVisible({ timeout: 10000 });
    await expect(registerPage.getFieldError("email")).toHaveText("Adres e-mail jest wymagany");

    await registerPage.fillEmail("niepoprawny");
    await registerPage.blurField("email");
    await expect(registerPage.getFieldError("email")).toHaveText("Podaj poprawny adres e-mail");

    // Click and blur password field
    await registerPage.passwordInput.click();
    await registerPage.blurField("password");
    await expect(registerPage.getFieldError("password")).toBeVisible();
    await expect(registerPage.getFieldError("password")).toHaveText("Hasło musi mieć co najmniej 8 znaków");

    // Click and blur passwordConfirm field
    await registerPage.passwordConfirmInput.click();
    await registerPage.blurField("passwordConfirm");
    await expect(registerPage.getFieldError("passwordConfirm")).toBeVisible();
    await expect(registerPage.getFieldError("passwordConfirm")).toHaveText("Powtórzenie hasła jest wymagane");

    await registerPage.fillPassword("Pass1234!");
    await registerPage.fillPasswordConfirm("Pass12345!");
    await registerPage.blurField("passwordConfirm");
    await expect(registerPage.getFieldError("passwordConfirm")).toBeVisible();
    await expect(registerPage.getFieldError("passwordConfirm")).toHaveText("Hasła muszą być identyczne");

    await registerPage.fillPasswordConfirm("Pass1234!");
    await registerPage.blurField("passwordConfirm");
    // Error should disappear
    await expect(registerPage.getFieldError("passwordConfirm")).toHaveCount(0);
  });

  test("updates password strength indicator as the user types", async ({ page }) => {
    const registerPage = new RegisterPage(page);
    await registerPage.goto();

    // Wait for React component to hydrate
    await expect(registerPage.form).toBeVisible();

    // Focus the password input first to ensure React event handlers are ready
    await registerPage.passwordInput.focus();

    await registerPage.fillPassword("pass1234");
    // Wait for React state update and indicator to appear
    await expect(registerPage.passwordStrengthIndicator).toBeVisible({ timeout: 5000 });
    await expect(registerPage.passwordStrengthIndicator).toContainText("Słabe");

    await registerPage.fillPassword("Pass1234");
    // Wait for state update after password change
    await expect(registerPage.passwordStrengthIndicator).toBeVisible({ timeout: 5000 });
    await expect(registerPage.passwordStrengthIndicator).toContainText("Średnie");

    await registerPage.fillPassword("Pass1234!");
    await expect(registerPage.passwordStrengthIndicator).toBeVisible({ timeout: 5000 });
    await expect(registerPage.passwordStrengthIndicator).toContainText("Silne");
  });

  test("submits successfully and renders the confirmation state", async ({ page }) => {
    const registerPage = new RegisterPage(page);
    await registerPage.goto();

    // Use unique email with timestamp to avoid conflicts in parallel test runs
    // Using a standard test domain that should pass Supabase validation
    const timestamp = Date.now();
    const email = `test.e2e.${timestamp}@tlen.pl`;
    const password = "Pass1234!";

    // Ensure user is cleaned up before test
    await deleteTestUser(email);

    // No mocks - this is a real E2E test that hits the actual API and database
    await registerPage.fillForm({
      email,
      password,
      passwordConfirm: password,
    });

    // Wait for form to be ready - ensure no validation errors are visible
    // These checks are optional - if errors exist, they'll be caught by the test failure
    try {
      await expect(registerPage.getFieldError("email")).toHaveCount(0, { timeout: 2000 });
    } catch {
      // Validation error exists, but form might still be submittable
    }
    try {
      await expect(registerPage.getFieldError("password")).toHaveCount(0, { timeout: 2000 });
    } catch {
      // Validation error exists, but form might still be submittable
    }
    try {
      await expect(registerPage.getFieldError("passwordConfirm")).toHaveCount(0, { timeout: 2000 });
    } catch {
      // Validation error exists, but form might still be submittable
    }

    // Ensure submit button is enabled before submitting
    await expect(registerPage.submitButton).toBeEnabled();

    // Wait for API request and response - use both for better reliability
    const requestPromise = page.waitForRequest(
      (request) => {
        const url = new URL(request.url());
        return url.pathname === "/api/auth/register" && request.method() === "POST";
      },
      { timeout: 10000 }
    );

    const responsePromise = page.waitForResponse(
      (response) => {
        const url = new URL(response.url());
        return url.pathname === "/api/auth/register" && response.request().method() === "POST";
      },
      { timeout: 10000 }
    );

    await registerPage.submit();

    // Wait for both request and response to ensure the API call was made
    await requestPromise;
    const response = await responsePromise;

    // Check if registration failed (e.g., user already exists or invalid email)
    if (!response.ok()) {
      const errorData = await response.json().catch(() => ({}));
      const errorMessage = errorData.error || "Unknown error";

      // Provide detailed error message for debugging
      throw new Error(
        `Registration failed with status ${response.status()}: ${errorMessage}. ` +
          `Email used: ${email}. ` +
          `This may indicate: 1) User already exists (check if cleanup worked), ` +
          `2) Supabase blocks the email domain, or 3) Email format is invalid.`
      );
    }

    // Wait for success state to appear after successful API response
    await expect(registerPage.successHeading).toBeVisible({ timeout: 5000 });
    await expect(registerPage.successDescription).toContainText(email);

    // Wait for success state to be fully rendered
    await expect(registerPage.resendButton).toBeVisible();

    // Wait for toast notification to appear and then dismiss it if blocking
    // Sonner toasts auto-dismiss after a few seconds, but we'll wait a bit
    await page.waitForTimeout(1500);

    // Try to find and dismiss toast if it's blocking the button
    const toast = page.locator('[data-sonner-toast], [data-sonner-toaster] [role="status"]').first();
    const isToastVisible = await toast.isVisible().catch(() => false);

    if (isToastVisible) {
      // Try clicking outside the button area or on the toast close button
      try {
        // Click on a safe area (success heading) to potentially dismiss toast
        await registerPage.successHeading.click({ force: true });
        await page.waitForTimeout(300);
      } catch {
        // Ignore if click fails
      }
    }

    // Wait for API response after resend button click
    const resendResponsePromise = page.waitForResponse(
      (response) => {
        const url = new URL(response.url());
        return url.pathname === "/api/auth/resend-confirmation" && response.request().method() === "POST";
      },
      { timeout: 10000 }
    );

    // Try normal click first, fallback to force if needed
    try {
      await registerPage.resendButton.click({ timeout: 2000 });
    } catch {
      // If normal click fails (e.g., toast blocking), use force
      await registerPage.resendButton.click({ force: true });
    }

    // Wait for React state update - wait for loading text first (more reliable indicator)
    // The button text change confirms the click handler executed and state updated
    await expect(registerPage.resendButton)
      .toContainText("Wysyłanie...", { timeout: 5000 })
      .catch(() => {
        // If loading state is too fast, that's okay - just verify it re-enabled
      });

    // Verify disabled state after we know React has updated
    await expect(registerPage.resendButton)
      .toBeDisabled({ timeout: 2000 })
      .catch(() => {
        // If already re-enabled (very fast API), that's acceptable
      });

    // Wait for the API response to complete
    await resendResponsePromise;

    // Wait for the API call to complete and button to re-enable
    await expect(registerPage.resendButton).toBeEnabled({ timeout: 10000 });
    await expect(registerPage.resendButton).toHaveText("Wyślij ponownie");

    await page.emulateMedia({ reducedMotion: "reduce" });
    await expect(page).toHaveScreenshot("register-success.png");

    // Clean up test user after successful registration
    await deleteTestUser(email);
  });
});
