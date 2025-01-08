# Automated Testing
## Glossary
**Confidence** - describes a degree to which passing tests guarantee that the app is working.  
**Determinism** - describes how easy it is to determine where the problem is based on the failing test.  
**Use Case** - a potential scenario in which a system receives external input and responds to it. It defines the interactions between a role (user or another system) and a system to achieve a goal.  
**Combinatiorial Explosion** - the fast growth in the number of combinations that need to be tested when multiple business rules are involved.  

## Testing best practices

### Quality over quantity
Don't focus on achieving a specific code coverage percentage.
While code coverage can help us identify uncovered parts of the codebase, it doesn't guarantee high confidence.

Instead, focus on identifying important paths of the application, especially from user's perspective.
User can be a developer using a shared function, a user interacting with the UI, or a client using server app's JSON API.
Write tests to cover those paths in a way that gives confidence that each path, and each separate part of the path works as expected.

---

Flaky tests that produce inconsistent results ruin confidence in the test suite, mask real issues, and are the source of frustration. The refactoring process to address the flakiness is crucial and should be a priority.
To adequately deal with flaky tests it is important to know how to identify, fix, and prevent them:
- Common characteristics of flaky tests include inconsistency, false positives and negatives, and sensitivity to dependency, timing, ordering, and environment.
- Typical causes of the stated characteristics are concurrency, timing/ordering problems, external dependencies, non-deterministic assertions, test environment instability, and poorly written test logic.
- Detecting flaky tests can be achieved by rerunning, running tests in parallel, executing in different environments, and analyzing test results.
- To fix and prevent further occurrences of flaky tests the following steps can be taken, isolate tests, employ setup and cleanup routines, handle concurrency, configure a stable test environment, improve error handling, simplify testing logic, and proactively deal with typical causes of the flaky tests.

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

With these tests, we test how multiple components of the system behave together.

#### Infrastructure

Running the tests on test infrastructure should be preferred to mocking, unlike in unit tests. Ideally, a full application instance would be run, to mimic real application behavior as close as possible.
This usually includes running the application connected to a test database, inserting fake data into it during the test setup, and doing assertions on the current state of the database. This also means integration test code should have full access to the test infrastructure for querying. 
> [!NOTE]
> Regardless of whether using raw queries or the ORM, simple queries should be used to avoid introducing business logic within tests.

However, mocking can still be used when needed, for example when expecting side-effects that call third party services.

#### Entry points

Integration test entry points can vary depending on the application use cases. These include services, controllers, or the API. These are not set in stone and should be taken into account when making a decision. For example:
- A use case that can be invoked through multiple different protocols can be tested separately from them, to avoid duplication. A tradeoff in this case is the need to write some basic tests for each of the protocols.
- A use case that will always be invokeable through a single protocol might benefit enough from only being tested using that protocol. E.g. a HTTP API route test might eliminate the need for a lower level, controller/service level test. This would also enable testing the auth layer integration within these tests, which might not have been possible otherwise depending on the technology used.

Multiple approaches can be used within the same application depending on the requirements, to provide sufficient coverage.

#### Testing surface

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
- To verify the basic business logic is handled correctly, both in expected success and failure cases.
- To verify infrastructure related side-effects, e.g. database changes or calls to third party services.

#### When **not** to use
- For extensive testing of business logic permutations beyond fundamental scenarios. Integration tests contain more overhead to write compared to unit tests and can easily lead to a combinatorial explosion. Instead, unit tests should be used for thorough coverage of these permutations.
- For testing third party services. We should assume they work as expected.

#### Best practices
- Test basic functionality and keep the tests simple.
- Prefer test infrastructure over mocking.
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

> [!NOTE]
> As mentioned in the Integration Tests section, API can be the entry point to the integration tests, meaning API tests are a subtype of integration tests. However, when we talk about API tests here, we are specifically referring to the public API contract tests, which don't have access to the internals of the application.

In the cases where API routes are covered extensively with integration tests, API tests might not be needed, leaving more time for QA to focus on E2E tests.
However, in more complex architectures (e.g. integration tested microservices behind an API gateway), API tests can be very useful.

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

Performance tests replicate typical user scenarios and then scale up to simulate
concurrent users. They measure key performance metrics such as response time,
throughput, error rate, and resource utilization. These tests help uncover
bottlenecks and identify specific endpoints or processes that require 
optimization.

Performance tests are supposed to be run on a production-like environment since
they test the performance of code **and** infrastructure. It's essential to
consider real user behavior when designing and running these tests. The best 
practice is to create a clone of the production environment for testing
purposes, avoiding potential disruption to actual users.

#### When to use
- To stress test application's infrastructure.
- To evaluate the app’s behavior and performance under increasing traffic.
- To identify and address bottlenecks or resource limitations in the
application.
- To ensure the application can handle anticipated peak traffic or usage
patterns.

#### When **not** to use
- To verify functional requirements or application features.
- To test a specific user scenario.

#### Best practices
- Ensure the tests mimic actual user behavior, including realistic click
frequency, page navigation patterns, and input actions.
- Include diverse scenarios that represent different user journeys across the
system, not just a single performance test.
- Use a clone of the production environment to ensure the infrastructure matches
real-world conditions, including hardware, network, and database configurations.
- Schedule performance tests periodically or before major releases to catch
regressions early.
- Record and analyze test outcomes to understand trends over time, identify weak
points, and track improvements.
- Performance testing should not be a one-time task; it should be an ongoing
process integrated into the development lifecycle.

#### Antipatterns
- Running these tests locally or on an environment that doesn't match production
in terms of infrastructure performance. (tests should be developed on a local
instance, but the actual measurements should be performed live)
- Ensure the test data mirrors real-world conditions, including varying user
inputs and dataset sizes.

### Visual Tests

The type of test where test runner navigates to browser page, takes snapshot and
then compares the snapshots with the reference snapshot.

Visual tests allow you to quickly cover large portions of the application,
ensuring that changes in the UI are detected without writing complex test cases.
The downside is that they're requiring engineers to invest time in identifying
the root cause of errors.

#### When to use
- When we want to make sure there are no changes in the UI.
- When we want to increase test coverage with least effort.
- During the early stages of a project, while e2e tests are still under
development.

#### When **not** to use
- To test a specific feature or business logic.
- To test a specific user scenario.

#### Best practices
- Ensure the UI consistently renders the same output by controlling randomness
(e.g., setting seeds for random data or controlling API responses).
- Add as many pages as possible but keep the tests simple.
- Consider running visual tests at the component level to isolate and detect
issues earlier.
- Define acceptable thresholds for minor visual differences (e.g., pixel
tolerance) to reduce noise while detecting significant regressions.

#### Antipatterns
- Avoid creating overly complicated visual tests that try to simulate user
behavior. These are better suited for e2e testing.
- Visual tests should complement, not replace other types of tests like e2e
tests. Over-relying on them can leave functional gaps in coverage.
- Blindly updating snapshots without investigating failures undermines the
purpose of visual testing and risks missing real issues.