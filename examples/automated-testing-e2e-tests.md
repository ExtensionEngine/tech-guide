# E2E Testing Examples

This file provides examples of E2E tests and some good practices using [Playwright](https://playwright.dev/docs/intro) framework.

---

## Example Tests

### Example 1: Basic E2E Test

This test navigates to the homepage and validates the page title.

```javascript
import { test, expect } from '@playwright/test';

test('Homepage title verification', async ({ page }) => {
  await page.goto('/');
  await expect(page).toHaveTitle(/Hompage/);
});
```

### Example 2: User Login Flow

This test covers the login process, ensuring that valid credentials allow access.

```javascript
import { test, expect } from '@playwright/test';

test('User login flow', async ({ page }) => {
  await page.goto('/login');

  // Fill in login form
  await page.getByLabelText('Username').fill('testuser');
  await page.getByLabelText('Password').fill('password');

  // Submit form
  await page.getByRole('button', { name: 'Login' }).click();

  // Verify login success
  await expect(page.locator('.welcome-message')).toContainText(
    'Welcome, testuser!'
  );
});
```

### Example 3: Form Submission

This test ensures that a form submission works correctly and validates input.

```javascript
import { test, expect } from '@playwright/test';

test('Form submission test', async ({ page }) => {
  await page.goto('/form');

  // Fill form fields
  await page.getByLabelText('Full Name').fill('John Doe');
  await page.getByLabelText('Email').fill('john.doe@example.com');

  // Submit the form
  await page.getByRole('button', { name: 'Submit' }).click();

  // Verify submission success
  await expect(page.locator('.success-message')).toContainText(
    'Form submitted successfully!'
  );
});
```

### Example 4: Navigation and Multi-step Workflow

This test navigates through a multi-step user workflow.

```javascript
import { test, expect } from '@playwright/test';

test('Multi-step workflow', async ({ page }) => {
  await page.goto('https://example.com');

  // Navigate to products
  await page.getByRole('link', { name: 'Products' }).click();
  await expect(page).toHaveURL('https://example.com/products');

  // Select a product
  await page.getByText('Product A').click();

  // Proceed to checkout
  await page.getByRole('button', { name: 'Checkout' }).click();
  await expect(page).toHaveURL('https://example.com/checkout');

  // Verify checkout page
  await expect(page.getByRole('heading')).toContainText('Checkout');
});
```

---

## Running Tests

Run the E2E tests using the Playwright test runner:

```bash
npx playwright test
```

You can also run specific tests or test files:

```bash
npx playwright test tests/login.spec.js
```
