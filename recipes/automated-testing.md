# Automated Testing
## Glossary
**Confidence** - describes a degree to which passing tests guarantee that the app is working
**Determinism** - describes how easy it is to determine where the problem is based on the failing test

## Testing best practices

### Quality over quantity
Don't focus on achieving a specific code coverage percentage.
While code coverage can help us identify uncovered parts of the codebase, it doesn't guarantee high confidence.

Instead, focus on identifying important paths of the application, especially from user's perspective.
User can be a developer using a shared function, a user interacting with the UI, or a client using server app's JSON API.
Write tests to cover those paths in a way that gives confidence that each path, and each separate part of the path works as expected.

---

Deal with flaky tests immediately. Flaky tests ruin test suite confidence. A failed
test should raise alarm immediately. If the test suite contains flaky tests, disable
them and refactor as soon as possible.

---

Be careful with tests that alter database state. We want to be able to run tests
in parallel so do not write tests that depend on each other. Each test should be
independent of the test suite.

---

Test for behavior and not implementation. Rather focus on writing tests that
follow the business logic instead of programming logic. Avoid writing parts of
the function implementation in the actual test assertion. This will lead to tight
coupling of tests with internal implementation and the tests will have to be fixed
each time the logic changes.

---

Writing quality tests is hard and it's easy to fall into common pitfalls of testing
that the database update function actually updates the database. Start off simple
and as the application grows in complexity, it will be easier to determine what
should be tested more thoroughly. It is perfectly fine to have a small test suite
that covers the critical code and the essentials. Small suites will run faster
which means they will be run more often.

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
- To test unit that integrates different application layers, such as persistence layer (database) or HTTP layer (see "Integration Tests") or performs disk I/O or communicates with external system

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
- For testing third party services. We should assume they work as expected.

#### Best practices
- Test basic API functionality and keep the tests simple.
- If the tested endpoint makes database changes, verify that the changes were
actually made.
- Assert that output data is correct.

#### Antipatterns
- Aiming for code coverage percentage number. An app with 100% code coverage can
have bugs. Instead, focus on writing meaningful, quality tests.

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
- Flaky tests should be immediately disabled and refactored. Flaky tests will
cause the team to ignore or bypass the tests and these should be dealt with immediately.

#### Antipatterns

### Performance Tests

These types of tests will reproduce a typical user scenario and then simulate a
group of concurrent users and then measure the server's response time and overall
performance.

They are typically used to stress test the infrastructure and measure the throughput
of the application. They can expose bottlenecks and identify endpoints that need
optimization.

Performance tests are supposed to be run on actual production environment since
they test the performance of code **and** infrastructure. Keep in mind actual
users when running performance tests. Best approach is to spin up a production
clone and run tests against that environment.

#### When to use
- To stress test infrastructure.
- To measure how increased traffic affects load speeds and overall app performance.

#### When **not** to use
- To test if the application works according to specs.
- To test a specific user scenario.

#### Best practices
- These tests should mimic actual human user in terms of click frequency and page
navigation.
- There should be multiple tests that test different paths in the system, not a
single performance test.

#### Antipatterns
- Running these tests locally or on an environment that doesn't match production
in terms of infrastructure performance. (tests should be developed on a local
instance, but the actual measurements should be performed live)


### Visual Tests

The type of test where test runner navigates to browser page, takes screenshot
and then compares the future screenshots with the reference screenshot.

These types of tests will cover a lot of ground with the least effort and can
easily indicate a change in the app. The downside is that they're not very precise
and the engineer needs to spend some time to determine the cause of the error.

#### When to use
- When we want to cover broad range of features.
- When we want to increase test coverage with least effort.
- When we want to make sure there are no changes in the UI.

#### When **not** to use
- To test a specific feature or business logic.
- To test a specific user scenario.

#### Best practices
- Have deterministic seeds so the UI always renders the same output.
- Add as many pages as possible but keep the tests simple.

#### Antipatterns
