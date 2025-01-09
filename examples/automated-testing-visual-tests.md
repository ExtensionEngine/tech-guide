# Visual Testing Examples

This file provides examples of visual tests and some good practices using [Playwright](https://playwright.dev/docs/intro) as a test runner and [Percy](https://www.browserstack.com/docs/percy/overview/visual-testing-basics) as a visual testing framework.

---

## Example Tests

### Example 1: Capturing a Basic Snapshot

This test navigates to a page and captures a visual snapshot.

```javascript
import { test } from '@playwright/test';
import percySnapshot from '@percy/playwright/index.js';

test('Visual snapshot of homepage', async ({ page }) => {
  await page.goto('/'); // Navigate to the homepage
  await percySnapshot(page, 'Homepage Snapshot');
});
```

### Example 2: Testing Dynamic Content

Use deterministic seeds or mock data to handle dynamic content effectively.

```javascript
import { test } from '@playwright/test';
import percySnapshot from '@percy/playwright/index.js';

test('Visual snapshot with mocked content', async ({ page }) => {
  await page.route('**/api/data', (route) =>
    route.fulfill({ path: 'mock_data.json' })
  );

  await page.goto('/dynamic-page');
  await percySnapshot(page, 'Dynamic Page Snapshot');
});
```

### Example 3: Responsive Visual Testing

Capture snapshots at multiple viewport sizes to test responsiveness.

```javascript
import { test } from '@playwright/test';
import percySnapshot from '@percy/playwright/index.js';

const viewports = [
  { width: 375, height: 667 }, // Mobile
  { width: 768, height: 1024 }, // Tablet
  { width: 1280, height: 720 }, // Desktop
];

test.describe('Responsive visual testing', () => {
  for (const viewport of viewports) {
    test(`Snapshot at ${viewport.width}x${viewport.height}`, async ({
      page,
    }) => {
      await page.setViewportSize(viewport);
      await page.goto('/responsive-page');
      await percySnapshot(
        page,
        `Responsive Snapshot - ${viewport.width}x${viewport.height}`
      );
    });
  }
});
```

### Example 4: Scope the given snapshot to a specific element

Capture a snapshot of a specific element on the page, for example, a dialog in this example. Snapshot is scoped to the element with the class `.selector` and scrolls to capture the full element.

```javascript
import { test } from '@playwright/test';
import percySnapshot from '@percy/playwright/index.js';

test('Visual snapshot of a specific element', async ({ page }) => {
  await page.goto('/');
  await percySnapshot(page, 'Specific Element Snapshot', {
    scope: '.selector',
    scopeOptions: { scroll: true },
  });
});
```

---

## Running Tests

Run the visual tests using Percy and Playwright:

```bash
npx percy exec -- npx playwright test
```

This will execute the tests and upload the snapshots to Percy for comparison.
