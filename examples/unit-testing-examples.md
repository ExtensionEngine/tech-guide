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
const MIN_LENGTH = 10;
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

## Writing tests

Let's write some tests for the `validatePassword` function to make sure it works
as described.

```javascript
describe('validatePassword', function() {
  describe('successfully validates password when it', function() {
    it('is "Testing12!?"', function() {
      const { isValid } = validatePassword('Testing12!?');
      expect(isValid).to.be(true);
    });
  });

  describe('fails to validate password when it', function() {
    it('is not the correct length', function() {
      const { isValid } = validatePassword('Test12!?');
      expect(isValid).to.be(false);
    });

    it('does not contain uppercase letter', function() {
      const { isValid } = validatePassword('test12!?');
      expect(isValid).to.be(false);
    });
  });
});
```

## Antipatterns

### Antipattern 1

Unit testing handle request function. We don't want to unit test the `handleRequest`
function which handles routing and HTTP request/response. We can test that with API
and/or integration tests.

### Antipattern 2

We write single unit test for each scenario. While this example is overly simple
and maybe we don't need 20 unit tests to cover this function, it is a good idea
to split testing for each criteria. For example, one test to cover password min
length, one to cover uppercase letter, one to cover min number of required digits
etc. When tests are written like this, it is easier to pinpoint which criteria
caused the code to fail and how to fix it.

```javascript
// WARNING: this is an example of an antipattern, do not write tests like this

describe('validatePassword', function() {
  describe('successfully validates password when it', function() {
    it('is valid', function() {
      const { isValid } = validatePassword('Testing12!?');
      expect(isValid).to.be(true);
    });
  });

  describe('fails to validate password when it', function() {
    it('is invalid', function() {
      const { isValid } = validatePassword(' ');
      expect(isValid).to.be(false);
    });
  });
});
```



