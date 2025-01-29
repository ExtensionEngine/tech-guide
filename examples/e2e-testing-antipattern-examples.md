# E2E Testing - Antipattern Examples

## Antipattern 1: Not using accessible locators

Locating elements by text is a common approach in functional testing, but it is not always the best practice, as it can result in flaky tests. In this example, the test identifies an `<a>` element based on specific text, which can lead to issues such as multiple `<a>` elements containing the same text but serving different roles or an element appearing visible while being hidden due to an `aria-hidden="true"` attribute set by another element.

```javascript
await page.locator('a').filter({ hasText: 'More info' });
```

### Solution

Give priority to role-based locators when identifying elements, as they most accurately reflect how users and assistive technologies interact with the page. In this case, the test locates the same `<a>` element, but in this case by its role as a link and its accessible name.

```javascript
await page.getByRole('link', { name: 'More info' });
```

## Glossary

### **Locators**

- Locators are a key component of Playwright's auto-waiting and retry mechanisms. Essentially, they provide a reliable way to identify elements on the page at any given time.

### **Role Locators, Role Based Locators, Accessible Locators**

- A type of locator that aligns with how users and assistive technologies interpret the page, such as recognizing whether an element functions as a button or a checkbox. When using role locators, it's generally recommended to include the accessible name to precisely identify the intended element.
