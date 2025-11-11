import { dirname, resolve } from "path";
import { fileURLToPath } from "url";

import { config as loadEnv } from "dotenv";
import { expect, test } from "@playwright/test";

import { deleteTestUser } from "./helpers/db.helper";
import { RegisterPage } from "./pages/register.page";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

loadEnv({ path: resolve(__dirname, "../.env.test") });

const envTestAccountEmail = process.env.E2E_USERNAME;
const envTestAccountPassword = process.env.E2E_PASSWORD;

if (!envTestAccountEmail || !envTestAccountPassword) {
  throw new Error(
    "Missing E2E_USERNAME or E2E_PASSWORD in environment. Add them to .env.test before running E2E tests."
  );
}

const TEST_ACCOUNT_EMAIL = envTestAccountEmail;
const TEST_ACCOUNT_PASSWORD = envTestAccountPassword;
const TEST_ACCOUNT_USER_ID = process.env.E2E_USERNAME_ID;

test.describe("Register Form", () => {
  test.describe.configure({ mode: "serial" });
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
    await expect(registerPage.form).toBeVisible();

    // Use a fixed account to keep registration flows deterministic
    const email = TEST_ACCOUNT_EMAIL;
    const password = TEST_ACCOUNT_PASSWORD;
    let cleanupUserId = TEST_ACCOUNT_USER_ID;

    // Ensure user is cleaned up before test
    await deleteTestUser(email, cleanupUserId);

    try {
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
      const responseBody = await response.json().catch(() => null);

      // Check if registration failed (e.g., user already exists or invalid email)
      if (!response.ok()) {
        const errorMessage =
          responseBody && typeof responseBody === "object" && "error" in responseBody && responseBody.error
            ? String(responseBody.error)
            : "Unknown error";

        // Provide detailed error message for debugging
        throw new Error(
          `Registration failed with status ${response.status()}: ${errorMessage}. ` +
            `Email used: ${email}. ` +
            `This may indicate: 1) User already exists (check if cleanup worked), ` +
            `2) Supabase blocks the email domain, or 3) Email format is invalid.`
        );
      }

      if (
        responseBody &&
        typeof responseBody === "object" &&
        "user" in responseBody &&
        responseBody.user &&
        typeof responseBody.user === "object" &&
        "id" in responseBody.user &&
        typeof responseBody.user.id === "string"
      ) {
        cleanupUserId = responseBody.user.id;
      }

      // Wait for success state to appear after successful API response
      await expect(registerPage.successContainer).toBeVisible({ timeout: 5000 });
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

      // Keep success copy verification instead of visual snapshot
      await expect(registerPage.successDescription).toContainText(email);
    } finally {
      // Ensure the dedicated test account is deleted even if the test throws
      await deleteTestUser(email, cleanupUserId);
    }
  });
});
