# Automated Testing

## Types of Automated Tests

There are different approaches to testing, and depending on boundaries of the
test, we can split them into following categories:

- **Unit Tests**
- **Integration Tests**
- **API Tests**
- **E2E Tests**
- **Load/Performance Tests**
- **Visual Tests**

*Note that some people can call these tests by different names, but for Studion
internal purposes, this should be considered the naming convention.*

### Unit Tests

These are the most isolated tests that we can write. They should take a specific
function/service/helper/module and test its functionality. Unit tests will
usually require mocked data, but since we're testing the case when specific
input produces specific output, the mocked data set should be minimal.

Unit testing is recommended for functions that contain a lot of logic and/or branching.
It is convenient to test a specific function at the lowest level so if the logic
changes, we can make minimal changes to the test suite and/or mocked data.

#### When to use
- Test a unit that implements the business logic, that's isolated from side effects such as database interaction or HTTP request processing
- Test function or class method with multiple input-output permutations

#### When **not** to use
- To test unit that integrates different application layers, such as persistence layer (database) or HTTP layer (see "Integration Tests")

#### Best practices
- Unit tests should execute fast (<50ms)
- Use mocks and stubs through dependency injection (method or constructor injection)

#### Antipatterns
- Mocking infrastructure parts such as database I/O - instead, revert the control by using the `AppService`, `Command` or `Query` to integrate unit implementing business logic with the infrastructure layer of the application
- Monkey-patching dependencies used by the unit - instead, pass the dependencies through the constructor or method, so that you can pass the mocks or stubs in the test


### Integration Tests

With these tests, we test the application API endpoints and assert that they are
actually working as expected.

**TODO**: do we want to add that we should run full backend for these type of tests?

**TODO**: do we want to write anything about mocking the DB data/seeds?

In these tests we should cover **at least** the following:
- **authorization** - make sure only logged in users with correct role/permissions
can access this endpoint
- **success** - if we send correct data, the endpoint should return response that
contains correct data
- **failure** - if we send incorrect data, the endpoint should handle the exception
and return appropriate error status
- **successful change** - successful request should make the appropriate change

If the endpoint contains a lot of logic where we need to mock a lot of different
inputs, it might be a good idea to cover that logic with unit tests. Unit tests
will require less overhead and will provide better performance while at the same
time decoupling logic testing and endpoint testing.

#### When to use
- To verify the API endpoint performs authentication and authorization.
- To verify user permissions for that endpoint.
- To verify that invalid input is correctly handled.

#### When **not** to use
- For testing of specific function logic. We should use unit tests for those.

#### Best practices
- Test basic API functionality and keep the tests simple.
- If the tested endpoint makes database changes, verify that the changes were
actually made.

#### Antipatterns

### API Tests

With these tests, we want to make sure our API contract is valid and the API
returns the expected data. That means we write tests for the publically
available endpoints.

Depending on the project setup, API tests can be covered with integration tests.
For example, if the application only has public APIs and more devs than QAs, it
might be a better option to add API testing in integration tests.

#### When to use
- To make sure the API signature is valid.

#### When **not** to use
- To test application logic.

#### Best practices
- Write these tests with the tools which allow us to reuse the tests to write
performance tests (K6).

#### Antipatterns


### E2E Tests

These tests are executed within a browser environment (Playwright, Selenium, etc.).
The purpose of these tests is to make sure that interacting with the application UI
produces the expected result.

Usually, these tests will cover a large portion of the codebase with least
amount of code.
Because of that, they can be the first tests to be added to existing project that
has no tests or has low test coverage.

These tests should not cover all of the use cases because they are the slowest to
run. If we need to test edge cases, we should try to implement those at a lower
level (integration or unit tests).

#### When to use
- Test user interaction with the application UI.

#### When **not** to use
- For data validation.

#### Best practices
- Performance is key in these tests. We want to run tests as often as possible
and good performance will allow that.

#### Antipatterns

### Performance Tests

These types of tests will reproduce a typical user scenario and then simulate a
group of concurrent users and then measure the server's response time and overall
performance.

They are typically used to stress test the infrastructure and measure the throughput
of the application. They can expose bottlenecks and identify endpoints that need
optimization.

#### When to use
- To stress test infrastructure.
- To measure how increased traffic affects load speeds and overall app performance.

#### When **not** to use

#### Best practices

#### Antipatterns


### Visual Tests

The type of test where test runner navigates to browser page, takes screenshot
and then compares the future screenshots with the reference screenshot.

These types of tests will cover a lot of ground with the least effort and can
easily indicate a change in the app. The downside is that they're not very precise
and the engineer needs to spend some time to determine the cause of the error.

#### When to use

#### When **not** to use

#### Best practices

#### Antipatterns
