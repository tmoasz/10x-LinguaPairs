# E2E Tests Directory

This directory contains end-to-end tests using Playwright.

## ⚠️ Important: Real E2E Tests

These tests are **true end-to-end tests** that hit the actual API and database. They are NOT UI-only tests with mocks.

## Setup

### 1. Create `.env.test` file

Create a `.env.test` file in the project root with your test database credentials:

```env
SUPABASE_URL=your_test_supabase_url
SUPABASE_KEY=your_test_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_test_supabase_service_role_key
```

**Important:**

- Use a **separate test database** (not production!)
- The `SUPABASE_SERVICE_ROLE_KEY` is required for test cleanup (deleting test users)
- You can find the service role key in your Supabase project settings under "API" → "Service Role Key"

### 2. Run tests

```bash
# Build and run E2E tests
bun test:e2e

# Run with UI
bun test:e2e:ui

# Debug mode
bun test:e2e:debug

# Generate tests using codegen
bun test:e2e:codegen
```

## Structure

- `fixtures/` - Test fixtures and setup utilities
- `pages/` - Page Object Model implementations
- `helpers/` - Test utilities (e.g., database cleanup helpers)
- `*.spec.ts` - Test specifications

## Test Cleanup

Tests automatically clean up test users before and after each test using the `helpers/db.helper.ts` utility. This ensures:

- Tests don't interfere with each other
- Test database stays clean
- Tests can be run multiple times safely

## Writing Tests

Follow the Page Object Model pattern for maintainability:

1. Create page objects in `pages/` directory
2. Write test specifications in `*.spec.ts` files
3. Use descriptive test names and organize with `describe` blocks
4. Import cleanup helpers if needed: `import { deleteTestUser } from "./helpers/db.helper"`

For more information, see the [Playwright documentation](https://playwright.dev/).
