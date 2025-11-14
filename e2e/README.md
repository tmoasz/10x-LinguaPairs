# E2E Testing Guide

## Overview

This directory contains end-to-end tests for 10x-LinguaPairs using Playwright.

## Test Strategy

We use a **hybrid approach** for E2E testing:

### 1. Registration Tests

- **Email**: `temp.{timestamp}.{random}@go2.pl` (generated dynamically)
- **Password**: `E2E_PASSWORD` (from environment)
- **Purpose**: Test the full registration flow with a fresh user each time
- **Cleanup**: User is deleted after test completion

### 2. Login & Action Tests (Future)

- **Email**: `E2E_USERNAME` (from environment)
- **Password**: `E2E_PASSWORD` (from environment)
- **Purpose**: Test login, logout, and authenticated user actions
- **Cleanup**: User persists between test runs

## Environment Variables

### Required for All Tests

```bash
E2E_PASSWORD=YourStrongPassword123!
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
```

**Note:** 
- **Local E2E tests**: Use local Supabase (http://127.0.0.1:54321). The `preview:test` script automatically loads `.env.test` if it exists.
- **CI/CD (GitHub Actions)**: Uses cloud Supabase from GitHub Secrets. The script detects CI environment and uses environment variables directly.

### Required for Login/Action Tests (Future)

```bash
E2E_USERNAME=your-test-user@example.com
E2E_USERNAME_ID=uuid-of-the-user  # Optional, improves cleanup performance
```

## Setup

### Local Development

1. **Start local Supabase** (if not already running):
   ```bash
   ./node_modules/.bin/supabase start
   ```
   This will start Supabase on `http://127.0.0.1:54321` and provide you with the service role key.

2. Create `.env.test` in the project root:

```bash
# Registration tests (required)
E2E_PASSWORD=YourStrongPassword123!

# Login tests (add when implementing login tests)
# E2E_USERNAME=test@example.com
# E2E_USERNAME_ID=00000000-0000-0000-0000-000000000000

# Supabase - Local Development (for local E2E tests)
SUPABASE_URL=http://127.0.0.1:54321
SUPABASE_KEY=your-key
# Get the service role key from: ./node_modules/.bin/supabase status
SUPABASE_SERVICE_ROLE_KEY=your-local-service-role-key

# Optional: For cloud Supabase (uncomment if you want to test against cloud)
# SUPABASE_URL=https://your-project.supabase.co
# SUPABASE_KEY=your-cloud-anon-key
# SUPABASE_SERVICE_ROLE_KEY=your-cloud-service-role-key
```

3. Install dependencies:

```bash
bun install
```

3. Run tests:

```bash
bun run test:e2e
```

### CI/CD (GitHub Actions)

Configure secrets in your GitHub repository:

- `E2E_PASSWORD`
- `E2E_USERNAME` (when login tests are added)
- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`

## Creating the Persistent E2E User

When you implement login tests, you'll need to create a persistent test user manually:

### Option 1: Via Supabase Dashboard

1. Go to Authentication → Users
2. Create a new user with email matching `E2E_USERNAME`
3. Copy the user ID and set it as `E2E_USERNAME_ID`

### Option 2: Via CLI (Recommended)

```bash
# Coming soon: setup script to create E2E user
bun run test:e2e:setup
```

## Test Structure

```
e2e/
├── helpers/
│   ├── db.helper.ts       # Database cleanup utilities
│   └── email.helper.ts    # Email generation for registration tests
├── pages/
│   └── register.page.ts   # Page Object Models
├── register-form.spec.ts  # Registration flow tests
└── README.md             # This file
```

## Writing New Tests

### Registration Tests

Use temporary emails for each test:

```typescript
import { generateTempEmail } from "./helpers/email.helper";

test("test registration flow", async ({ page }) => {
  const email = generateTempEmail();
  const password = process.env.E2E_PASSWORD;

  try {
    // ... test logic
  } finally {
    // Cleanup
    await deleteTestUser(email);
  }
});
```

### Login/Action Tests (Future)

Use the persistent E2E user:

```typescript
test("test login flow", async ({ page }) => {
  const email = process.env.E2E_USERNAME;
  const password = process.env.E2E_PASSWORD;

  // ... test logic
  // No cleanup needed - user persists
});
```

## Troubleshooting

### Registration Tests Fail with "User already exists"

- Check if cleanup is working (requires `SUPABASE_SERVICE_ROLE_KEY`)
- Temporary emails should be unique, but check for clock issues

### Login Tests Fail (Future)

- Ensure `E2E_USERNAME` user exists in the database
- Verify email is confirmed (check Supabase dashboard)
- Check password matches `E2E_PASSWORD`

### Cleanup Fails

- Verify `SUPABASE_SERVICE_ROLE_KEY` is set correctly
- Check Supabase project has admin API access enabled
- Service role key should have full admin privileges

## Benefits of This Approach

✅ **Registration tests** always test with fresh users (realistic)
✅ **Parallel execution** possible for registration tests
✅ **Fast login tests** (no need to create/delete user each time)
✅ **Clear separation** between test types
✅ **Easy debugging** (persistent user for login tests)

## Future Improvements

- [ ] Add setup script to create persistent E2E user
- [ ] Add login tests using `E2E_USERNAME`
- [ ] Add logout tests
- [ ] Add authenticated action tests
- [ ] Add flow tests (serial) testing full user lifecycle
