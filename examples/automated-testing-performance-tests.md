# Performance Testing Examples

This file provides examples of performance tests and some good practices using [k6](https://grafana.com/docs/k6/latest/) framework.

---

## Example Tests

### Example 1: Basic Load Test

This test simulates multiple virtual users (VUs) sending requests to an endpoint to measure response times and error rates.

```javascript
import http from 'k6/http';
import { sleep } from 'k6';

export const options = {
  stages: [
    { duration: '30s', target: 10 }, // Ramp up to 10 users
    { duration: '1m', target: 10 }, // Stay at 10 users
    { duration: '30s', target: 0 }, // Ramp down
  ],
};

export default function () {
  const res = http.get('https://test-api.example.com/endpoint');
  console.log(`Response time: ${res.timings.duration}ms`);
  sleep(1);
}
```

### Example 2: Stress Test

This test evaluates how the system performs under heavy load, identifying bottlenecks and breaking points.

```javascript
import http from 'k6/http';
import { check } from 'k6';

export const options = {
  stages: [
    { duration: '1m', target: 50 }, // Ramp up to 50 users
    { duration: '2m', target: 100 }, // Increase to 100 users
    { duration: '1m', target: 0 }, // Ramp down
  ],
};

export default function () {
  const res = http.get('https://test-api.example.com/endpoint');
  check(res, {
    'status is 200': (r) => r.status === 200,
    'response time is below 500ms': (r) => r.timings.duration < 500,
  });
}
```

### Example 3: Testing API with Dynamic Parameters

Simulate API requests with dynamic query parameters to test different scenarios.

```javascript
import http from 'k6/http';
import { sleep } from 'k6';

export const options = {
  vus: 10, // Number of virtual users
  duration: '30s',
};

export default function () {
  const userId = Math.floor(Math.random() * 1000); // Random user ID
  const res = http.get(`https://test-api.example.com/users/${userId}`);
  console.log(`Checked user ID: ${userId}, Status: ${res.status}`);
  sleep(1);
}
```

### Example 4: Concurrent POST Requests

This test simulates multiple users sending POST requests simultaneously to evaluate server handling of write operations.

```javascript
import http from 'k6/http';

export const options = {
  vus: 50,
  duration: '1m',
};

export default function () {
  const payload = JSON.stringify({
    username: `user_${__VU}`,
    email: `user_${__VU}@example.com`,
    password: 'securePassword123',
  });

  const params = {
    headers: {
      'Content-Type': 'application/json',
    },
  };

  http.post('https://test-api.example.com/register', payload, params);
}
```

### Example 5: End-to-End Workflow Simulation

Test a multi-step workflow by simulating user actions across multiple endpoints.

```javascript
import http from 'k6/http';
import { sleep, check } from 'k6';

export const options = {
  vus: 10,
  duration: '1m',
};

export default function () {
  // Step 1: User login
  const loginRes = http.post('https://test-api.example.com/login', {
    username: 'testuser',
    password: 'password123',
  });
  check(loginRes, { 'login successful': (res) => res.status === 200 });

  sleep(1);

  // Step 2: Fetch user data
  const userData = http.get('https://test-api.example.com/user/data');
  check(userData, { 'user data fetched': (res) => res.status === 200 });

  sleep(1);

  // Step 3: Perform a transaction
  const transactionRes = http.post('https://test-api.example.com/transaction', {
    amount: 100,
    currency: 'USD',
  });
  check(transactionRes, {
    'transaction completed': (res) => res.status === 200,
  });
}
```

---

## Running Tests

Run the performance tests using the k6 CLI:

```bash
k6 run test-script.js
```

Replace `test-script.js` with the file name of your test script.
