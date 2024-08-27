# Automated Testing

## Types of Automated Tests

There are different approaches to testing and depending on the level of the
entry point, we can split tests into following categories.

- **Unit Tests**
- **Integration Tests**
- **E2E Tests**
- **Load/Performance Tests**
- **Visual Tests**

*Note that some people can call these tests by different names, but for Studion
internal purposes, this should be considered the naming convention.*

### Unit Tests

These are the most isolated tests that we can write. They should take a specific
function/service/helper/module and test its functionality. Unit tests will
usually require mocked data, but since we're testing that specific input produces
specific output, the mocked data set should be minimal.

Unit testing is recommended for functions that contain a lot of logic and/or branching.
It is convenient to test a specific function at the lowest level so if the logic
changes, we can make minimal changes to the test suite and/or mocked data.


### Integration Tests (API Tests)

This is the broadest test category. With these tests, we want to make sure our
API contract is valid and the API returns the expected data. That means we write
tests for the publically available endpoints.

**TODO**: do we want to add that we should run full backend for these type of tests?

**TODO**: do we want to write anything about mocking the DB data/seeds?

In these tests we should cover *at least* the following:
- **authorization** - make sure only logged in users with correct role/permissions
can access this endpoint
- **success** - if we send correct data, the endpoint should return response that
contains correct data
- **failure** - if we send incorrect data, the endpoint should handle the exception
and return appropriate error status

If the endpoint contains a lot of logic where we need to mock a lot of different
inputs, it might be a good idea to cover that logic with unit tests. Unit tests
will require less overhead and will provide better performance while at the same
time decoupling logic testing and endpoint testing.

### E2E Tests

These tests are executed within a browser environment (Playwright, Selenium, etc.).
The purpose of these tests is to make sure that interacting with the application UI
produces the expected result.

Usually, these tests will cover a large portion of the codebase with least
amount of code.
Because of that, they can be the first tests to be added to a project that
has no tests or has low test coverage.

These tests should not cover all of the use cases because they are the slowest to
execute. If we need to test edge cases, we should try to implement those at a
lower level, like integration or unit tests.

### Performance Tests

These types of tests will reproduce a usual user scenario and then simulate a group
of concurrent users and measure the server's response.

They are typically used to stress test the infrastructure and measure the throughput
of the application.


### Visual Tests

The type of test where test runner navigates to browser page, takes screenshot
and then compares the future screenshots with the reference screenshot.

These types of tests will cover a lot of ground with the least effort and
can indicate a change in the app. The downside is that they're not very precise
and the engineer needs to spend some time to determine the cause of the error.
