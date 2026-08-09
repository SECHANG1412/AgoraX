# Backend Integration Tests

## Purpose

This suite verifies the current backend API contract end to end with the FastAPI app, dependency overrides, and a dedicated test database.

The integration tests currently cover:

- topics list and detail contracts
- vote creation and vote stats contracts
- auth-required and forbidden access behavior
- CSRF and OAuth login/callback security flows
- Redis-backed rate limit behavior
- comments and nested replies behavior
- topic/comment/reply likes behavior
- regression guards for pagination, sorting, and full-period vote aggregation

## Test Structure

- `tests/conftest.py`
  - sets required environment variables for app startup
  - creates a session-scoped test engine and schema
  - overrides `get_db`
  - cleans all tables before each test
  - uses a per-session SQLite file by default
- `tests/factories.py`
  - shared helpers for users, topics, votes, comments, replies, and likes
- `tests/integration/test_topics_api.py`
  - topics list filters, sorting, validation, detail success, not-found
- `tests/integration/test_votes_api.py`
  - vote create success, business errors, payload validation, vote stats errors
- `tests/integration/test_auth_required_api.py`
  - no-auth `401`, forbidden delete `403`
- `tests/integration/test_security_auth_api.py`
  - CSRF blocking/allow rules, OAuth state cookie checks, provider callback error handling
- `tests/integration/test_comments_replies_api.py`
  - comment create/list/update/delete
  - soft delete vs hard delete behavior
  - nested reply create/update/delete
  - parent reply existence and same-comment integrity checks
- `tests/integration/test_likes_api.py`
  - topic/comment/reply like toggles
  - auth-required and not-found behavior
  - duplicate-like race fallback behavior
- `tests/integration/test_rate_limit_api.py`
  - login request limit, authenticated topic creation limit, health endpoint exclusion
- `tests/integration/test_regressions.py`
  - pagination offset contract
  - allowed topic sort contract
  - `time_range=all` full-period aggregation contract
- `tests/integration/test_read_api_perf_baseline.py`
  - request-level query count, query time, and response time capture for read APIs
  - baseline capture for `/topics`, `/topics/{topic_id}`, `/comments/by-topic/{topic_id}`, `/votes/topic/{topic_id}`
  - EXPLAIN output capture and markdown baseline table output for before/after comparison

## Prerequisites

1. Move to the backend directory.
   - `cd backend`
2. Install test dependencies.
   - `pip install -r requirements-dev.txt`
3. Optional: set `TEST_DATABASE_URL` if you want to run against a custom test database.
   - Windows PowerShell: `$env:TEST_DATABASE_URL="mysql+asyncmy://user:pass@127.0.0.1:3306/dbname"`

## Default Test Database Behavior

- If `TEST_DATABASE_URL` is not set, the suite creates a temporary SQLite database file for the test session.
- The schema is recreated at session start and dropped at session end.
- Each test starts from a clean database because all tables are truncated by the `clean_db` fixture.
- The temporary SQLite file is removed during teardown when possible.

## Run

- Run all integration tests from `backend/`:
  - `pytest -q tests/integration`
- Run backend lint from `backend/`:
  - `ruff check app main.py tests`
- Run one file:
  - `pytest -q tests/integration/test_comments_replies_api.py`
- Run read baseline with printed metrics:
  - `pytest -q -s tests/integration/test_read_api_perf_baseline.py`
- Run one test:
  - `pytest -q tests/integration/test_security_auth_api.py -k oauth`

## Failure Triage

- `422` on `/topics`
  - Check limit/offset validation and allowed sort values: `created_at|like_count`.
- vote stats mismatch for `time_range=all`
  - Check that the full-period query does not apply a recent-time filter.
- unexpected `401/403`
  - Check auth cookie setup and CSRF header/cookie pairing in fixtures.
- OAuth callback redirect mismatch
  - Check provider-specific exception handling and `oauth_state` cookie cleanup.
- replies fail with parent-related errors
  - Check parent reply existence and same-`comment_id` validation.
- teardown or SQLite file lock issues
  - Check whether another process still holds the test database file.

## CI Merge Gate

GitHub Actions workflow: `.github/workflows/ci.yml`

- Trigger: pull request targeting `main`
- CI jobs:
  - `Backend Lint`
  - `Backend Integration Tests`
  - `Frontend Lint`
  - `Frontend Typecheck`
  - `Frontend Build`
- Merge policy:
  - Do not merge when a required status check fails.

## Local Closeout Commands

Run these from the repository root before opening a PR when the change touches backend code or tests:

```bash
cd backend
ruff check app main.py tests
pytest -q tests/integration
```

Frontend checks are documented in `frontend/package.json` and run in CI as `npm run lint`, `npm run typecheck`, and `npm run build`.

## PR Closeout Checklist

- [ ] `pytest -q tests/integration` passes locally
- [ ] `ruff check app main.py tests` passes locally when backend code changed
- [ ] `npm run lint`, `npm run typecheck`, and `npm run build` pass locally when frontend code changed
- [ ] test docs still match the actual suite scope and run instructions
- [ ] CI required checks are green on the PR
- [ ] docs updated if API contract or test coverage changed
