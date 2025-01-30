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
  console.log('Incoming request', new Date().toISOString(), req.url);
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
