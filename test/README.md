# Test Directory

This directory contains setup files and utilities for unit tests using Vitest.

## Structure

- `setup.ts` - Global test setup file (imported before each test file)
- `utils/` - Test utilities and helper functions
- `mocks/` - Mock data and mock implementations

## Running Tests

```bash
# Run all tests
bun test

# Run tests in watch mode
bun test:watch

# Run tests with UI
bun test:ui

# Run tests with coverage
bun test:coverage
```

## Writing Tests

Tests should be colocated with the source files they test:

- `src/lib/services/deck.service.ts` → `src/lib/services/deck.service.test.ts`
- `src/components/Button.tsx` → `src/components/Button.test.tsx`

For more information, see the [Vitest documentation](https://vitest.dev/).
