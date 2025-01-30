# Unit Testing Examples

## Code we will be testing

In this example, we will set up an API endpoint which checks if the password is
valid according to business logic rules. The rules are that password needs to be
between 5 and 255 characters with at least one uppercase letter, at least one
lowercase letter, at least 2 numbers and at least 2 special characters.


```javascript
const http = require('http');
const PasswordValidator = require('password-validator');

const PORT = 8000;
const MIN_LENGTH = 5;
const MAX_LENGTH = 255;

function validatePassword(password) {
  const passwordValidator = new PasswordValidator()
    .is().min(MIN_LENGTH)
    .is().max(MAX_LENGTH)
    .has().uppercase()
    .has().lowercase()
    .has().digits(2)
    .has().symbols(2);
  const result = passwordValidator.validate(password, { details: true });
  return { isValid: result.length === 0, details: result };
}

async function handleRequest(req, res) {
  try {
    const { isValid, details } = validatePassword(req.body?.password);
    const statusCode = isValid ? 200 : 400;
    res.writeHead(statusCode, { 'Content-Type': 'application/json' });
    if (statusCode === 400) res.write(JSON.stringify(details));
  } catch {
    res.writeHead(500);
  }
  res.end();
}

http
  .createServer(handleRequest)
  .listen(PORT, () => console.log('App running on port', PORT));
```

## Antipatterns

### Antipattern 1

Unit testing handle request function. We don't want to unit test the `handleRequest`
function which handles routing and HTTP request/response. We can test that with API
and/or integration tests.



