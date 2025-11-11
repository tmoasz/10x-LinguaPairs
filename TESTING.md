# Testing Guide - 10x-LinguaPairs

This document provides comprehensive information about testing in the 10x-LinguaPairs project.

## Table of Contents

- [Overview](#overview)
- [Unit Testing with Vitest](#unit-testing-with-vitest)
- [E2E Testing with Playwright](#e2e-testing-with-playwright)
- [Running Tests](#running-tests)
- [Writing Tests](#writing-tests)
- [Best Practices](#best-practices)

---

## Overview

The project uses two testing frameworks:

- **Vitest** - Fast unit and integration tests for TypeScript/React code
- **Playwright** - End-to-end testing for user flows and browser interactions

---

## Unit Testing with Vitest

### Configuration

The Vitest configuration is defined in `vitest.config.ts` with the following features:

- **Environment**: jsdom (for DOM testing)
- **Globals**: Enabled (no need to import `describe`, `it`, `expect`)
- **Setup**: Runs `test/setup.ts` before each test file
- **Coverage**: V8 provider with HTML, text, and LCOV reporters

### Directory Structure

```
test/
├── setup.ts          # Global test setup
├── utils/            # Test utility functions
├── mocks/            # Mock data and implementations
└── README.md         # Test documentation

src/
├── lib/
│   └── utils/
│       ├── string.utils.ts       # Source code
│       └── string.utils.test.ts  # Colocated tests
└── components/
    └── ui/
        ├── button.tsx            # Component
        └── Button.test.tsx       # Component tests
```

### Running Unit Tests

```bash
# Run all tests
bun test

# Run tests in watch mode (recommended during development)
bun test:watch

# Run tests with UI
bun test:ui

# Run tests with coverage
bun test:coverage
```

### Writing Unit Tests

#### Testing Utilities

```typescript
import { describe, it, expect } from "vitest";
import { myFunction } from "./myFunction";

describe("myFunction", () => {
  it("should do something", () => {
    const result = myFunction("input");
    expect(result).toBe("expected output");
  });
});
```

#### Testing React Components

```typescript
import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MyComponent } from "./MyComponent";

describe("MyComponent", () => {
  it("should render correctly", () => {
    render(<MyComponent />);
    expect(screen.getByText("Hello")).toBeInTheDocument();
  });

  it("should handle user interactions", async () => {
    const handleClick = vi.fn();
    const user = userEvent.setup();

    render(<MyComponent onClick={handleClick} />);

    await user.click(screen.getByRole("button"));
    expect(handleClick).toHaveBeenCalled();
  });
});
```

#### Mocking

```typescript
import { vi } from "vitest";

// Mock a function
const mockFn = vi.fn();

// Mock a module
vi.mock("@/lib/api", () => ({
  fetchData: vi.fn(() => Promise.resolve({ data: "mocked" })),
}));

// Spy on a method
const spy = vi.spyOn(object, "method");
```

---

## E2E Testing with Playwright

### Configuration

The Playwright configuration is defined in `playwright.config.ts`:

- **Browser**: Chromium (Desktop Chrome)
- **Base URL**: `http://localhost:4321`
- **Parallel Execution**: Enabled
- **Retries**: 2 on CI, 0 locally
- **Screenshots**: On failure
- **Video**: Retained on failure
- **Traces**: On first retry

### Directory Structure

```
e2e/
├── pages/              # Page Object Models
│   └── home.page.ts
├── fixtures/           # Test fixtures
├── example.spec.ts     # Test specifications
└── README.md           # E2E documentation
```

### Running E2E Tests

```bash
# Build the project first
bun run build

# Run all E2E tests
bun test:e2e

# Run E2E tests with UI mode
bun test:e2e:ui

# Run E2E tests in debug mode
bun test:e2e:debug

# Generate tests using codegen
bun test:e2e:codegen
```

### Writing E2E Tests

#### Page Object Model Pattern

```typescript
// e2e/pages/login.page.ts
import { Page, Locator } from "@playwright/test";

export class LoginPage {
  readonly page: Page;
  readonly emailInput: Locator;
  readonly passwordInput: Locator;
  readonly submitButton: Locator;

  constructor(page: Page) {
    this.page = page;
    this.emailInput = page.getByLabel("Email");
    this.passwordInput = page.getByLabel("Password");
    this.submitButton = page.getByRole("button", { name: "Sign in" });
  }

  async goto() {
    await this.page.goto("/login");
  }

  async login(email: string, password: string) {
    await this.emailInput.fill(email);
    await this.passwordInput.fill(password);
    await this.submitButton.click();
  }
}
```

#### Test Specification

```typescript
// e2e/auth.spec.ts
import { test, expect } from "@playwright/test";
import { LoginPage } from "./pages/login.page";

test.describe("Authentication", () => {
  test("should login successfully", async ({ page }) => {
    const loginPage = new LoginPage(page);
    await loginPage.goto();

    await loginPage.login("user@example.com", "password123");

    await expect(page).toHaveURL("/dashboard");
    await expect(page.getByText("Welcome")).toBeVisible();
  });
});
```

#### Visual Testing

```typescript
test("should match screenshot", async ({ page }) => {
  await page.goto("/");
  await expect(page).toHaveScreenshot("home.png", {
    fullPage: true,
  });
});
```

#### API Testing

```typescript
test("should validate API response", async ({ request }) => {
  const response = await request.get("/api/users");

  expect(response.status()).toBe(200);

  const data = await response.json();
  expect(data).toHaveProperty("users");
});
```

---

## Best Practices

### General

1. **Write tests first** (TDD) when building new features
2. **Keep tests independent** - each test should be able to run in isolation
3. **Use descriptive names** - test names should clearly describe what they test
4. **Follow AAA pattern** - Arrange, Act, Assert
5. **Don't test implementation details** - test behavior, not implementation

### Unit Tests

1. **Colocate tests** with source files (`*.test.ts` next to `*.ts`)
2. **Use inline snapshots** for readable assertions
3. **Mock external dependencies** (API calls, database, etc.)
4. **Test edge cases** and error conditions
5. **Keep tests fast** - unit tests should run in milliseconds

### E2E Tests

1. **Use Page Object Model** for maintainability
2. **Use semantic locators** (`getByRole`, `getByLabel`) over CSS selectors
3. **Wait for elements** properly - use `waitFor` methods
4. **Isolate test data** - use test-specific data or cleanup after tests
5. **Test critical user flows** - focus on important features first

### Coverage

- Focus on **meaningful tests** rather than coverage percentages
- Aim for **high coverage of critical paths** (business logic, API routes)
- Use coverage reports to **identify untested code**, not as a goal

---

## Troubleshooting

### Vitest

**Problem**: Tests are slow

- Solution: Check if you're running too many tests or have slow setup code

**Problem**: Module not found errors

- Solution: Verify path aliases in `vitest.config.ts` match `tsconfig.json`

**Problem**: DOM tests failing

- Solution: Ensure `environment: 'jsdom'` is set and `test/setup.ts` is loaded

### Playwright

**Problem**: Tests timing out

- Solution: Increase timeout in `playwright.config.ts` or use `test.setTimeout()`

**Problem**: Flaky tests

- Solution: Use `waitForLoadState()`, avoid `waitForTimeout()`, ensure proper element waiting

**Problem**: Visual tests failing

- Solution: Update screenshots with `bun test:e2e --update-snapshots`

---

## CI/CD Integration

### GitHub Actions Example

```yaml
name: Tests

on: [push, pull_request]

jobs:
  unit-tests:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: oven-sh/setup-bun@v1
      - run: bun install
      - run: bun test

  e2e-tests:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: oven-sh/setup-bun@v1
      - run: bun install
      - run: bunx playwright install --with-deps chromium
      - run: bun run build
      - run: bun test:e2e
      - uses: actions/upload-artifact@v3
        if: always()
        with:
          name: playwright-report
          path: playwright-report/
```

---

## Resources

- [Vitest Documentation](https://vitest.dev/)
- [Playwright Documentation](https://playwright.dev/)
- [Testing Library Documentation](https://testing-library.com/)
- [React Testing Best Practices](https://kentcdodds.com/blog/common-mistakes-with-react-testing-library)

---

_Last updated: 2025-11-10_
