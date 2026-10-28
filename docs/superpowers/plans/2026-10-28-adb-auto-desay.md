# HABRO automatic installer implementation plan

**Goal:** Add automatic routing and an independently verified Desay installer using existing WebADB.
**Architecture:** Existing installerTransport supplies shell, Sync push and size. Reuse command completion and package verification from SessionWriter; keep its installer unchanged. Separate the private helper provider from orchestration.
**Tech Stack:** Browser ES modules, Web Crypto, Node test runner.
**Spec:** ../specs/2026-10-28-adb-auto-desay-design.md (approved).

## Constraints

Work only on feature/adb-auto-desay-v2; no merge. No private DEX in Git or static assets. No invented hash or environment preparation. Unknown helper configuration fails closed. Keep WebUSB/RSA and existing tools.

## Review focus

Missing detection properties must not silently select standard. Disconnect must retain uncertain state. Manual method changes must clear diagnostics without clearing pending verification. Private helper fetch must never fall back to public assets. Cleanup must not remove another attempt's files.

### Task 1: profile and trusted helper orchestration

- [x] Write tests in tests/desay-installer.test.mjs for routing, user/identity, integrity, downgrade, remote transfer, final identity/version, disconnection and cleanup; run them and observe missing feature failure.
- [x] Add adb/install-method.mjs exports readDeviceProfile(transport, options), selectInstallMethod(format, profile, method).
- [x] Export the existing command completion primitive from sessionwriter.mjs without changing its behavior.
- [x] Add adb/desay-installer.mjs exporting installWithDesay with the existing file/metadata/transport/signal/onStage/onLog interface and a trusted helper provider. Require a verified preparation contract; leave production unavailable until actual DEX and environment are supplied.
- [x] Add adb/desay-helper.mjs: fixed deployment policy, authenticated same-origin fetch; no binary or guessed hash. Verify both local and remote SHA-256 plus sizes.
- [x] Run new tests and full suite.

### Task 2: guided installation and private delivery boundary

- [x] Add UI integration assertions before edits; run and observe failure.
- [x] Update app.js profile collection, automatic default and dispatch, neutral copy, pending result handling and diagnostic reset. Keep pending attempt lock on method changes.
- [x] Update index.html advanced methods, automatic default and advanced-only technical profile.
- [x] Ignore private development helpers in Git, asset and deployment config; reserve authenticated API delivery, with no public static fallback.
- [x] Document local helper provisioning and its blocked production status.
- [x] Run full suite, syntax checks, diff checks and DEX exclusion checks. Review whole diff and commit on the requested branch.
