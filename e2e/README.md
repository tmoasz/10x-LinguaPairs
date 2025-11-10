# E2E Tests Directory

This directory contains end-to-end tests using Playwright.

## Structure

- `fixtures/` - Test fixtures and setup utilities
- `pages/` - Page Object Model implementations
- `*.spec.ts` - Test specifications

## Running Tests

```bash
# Run all E2E tests
bun test:e2e

# Run E2E tests in UI mode
bun test:e2e:ui

# Run E2E tests with debug mode
bun test:e2e:debug

# Generate tests using codegen
bun test:e2e:codegen
```

## Writing Tests

Follow the Page Object Model pattern for maintainability:

1. Create page objects in `pages/` directory
2. Write test specifications in `*.spec.ts` files
3. Use descriptive test names and organize with `describe` blocks

For more information, see the [Playwright documentation](https://playwright.dev/).
