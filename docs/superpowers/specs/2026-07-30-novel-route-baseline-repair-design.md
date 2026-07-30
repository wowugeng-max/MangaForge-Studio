# Novel Route Baseline Repair Design

**Date:** 2026-07-30

## Goal

Restore the existing novel server suite from 173 passing and 15 failing tests to 188 passing tests without undoing the route modularization or weakening prose-error privacy.

## Root Causes

The failures have two independent causes:

1. Fourteen source-contract assertions still concatenate only each package's `builders.ts` and thin `register.ts`. Route implementations moved into leaf modules during the generation and planning route splits, so the assertions no longer inspect the code they are intended to protect.
2. `buildStandaloneProseServiceErrorPayload` recovers residual prose for every error. This unintentionally exposes candidate prose for ordinary quality-gate and generation errors, although residual prose is only required when an invalid draft reaches the terminal `blocked_invalid` admission state.

## Selected Design

### Ordered route source bundles

Each affected test file will define one ordered, package-local source bundle and reuse it for its source-contract assertions.

The generation bundle will include `builders.ts`, the thin package registrar, chapter-group registrars in registration order, and the chapter-pipeline registrar. The planning bundle will include `builders.ts`, the thin package registrar, and its review, A/B, and planning-operations registrars.

The order is explicit rather than filesystem-recursive because several assertions locate a route start and then slice until the next route marker. A stable order preserves the actual registration sequence and avoids accidental matches from unrelated test files.

No production implementation will be copied back into the thin registrar merely to satisfy source-text assertions.

### Error payload privacy boundary

Residual candidate prose may be returned only when `admission_status` is exactly `blocked_invalid`. In that state, the existing chapter identity and residual prose fields remain available for Zhuque export and explicit recovery.

All other errors, including `PROSE_QUALITY_GATE_BLOCKED`, will return only the existing bounded diagnostics, quality-loop summary, pipeline state, configuration snapshot, and other safe metadata. They will not include candidate text, prompts, messages, raw provider payloads, or debug objects.

## Test Strategy

The existing fifteen failures are the initial RED evidence.

Before changing the payload implementation, the blocked-invalid test will be strengthened to characterize the approved recovery behavior. The already-failing ordinary quality-gate test remains the regression test for the privacy fix.

Verification proceeds in increasing scope:

1. Run the two affected route test files.
2. Run `bun run test:novel-server` and require 188/188 passing.
3. Re-run the MCP backend and frontend suites.
4. Re-run the backend bundle check and frontend production build.
5. Run `git diff --check` and the existing branch credential/user-data scans.

## Non-Goals

- Rewriting all source-contract assertions as HTTP integration tests.
- Changing route registration order or package boundaries.
- Changing prose admission policy or quality thresholds.
- Returning residual prose for recoverable or ordinary generation errors.
- Modifying MCP generation-source behavior.

## Success Criteria

- The novel server suite reports 188 passing and zero failing tests.
- Ordinary prose errors remain bounded and do not expose candidate prose or request internals.
- `blocked_invalid` errors preserve the residual draft and chapter identity needed for explicit recovery.
- The MCP-specific suites and production builds remain green.
