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

### Task 3: finish the verified private helper integration

The user supplied the real DEX and expected SHA-256. Preserve Tasks 1–2.

- [x] Verify attached bytes before analysis: 8568 bytes, DEX 038,
  SHA-256 2adefeff7f1cce400996a82d651a3075fe414c4c4dc2db03609f2a87b4619b15.
- [x] Store bytes only in ignored adb/.private/dex_shell_helper.dex; review
  bytecode privately to confirm MonjiShellInstaller <apk> and default flags.
- [x] Add failing tests for production trust policy with actual private bytes,
  corrupt/missing delivery, preparation/environment failure and real helper
  output; keep the existing simulated regression tests.
- [x] Replace the null policy with the verified size/hash and Android runtime
  preparation. The DEX does not reference vendor properties or OTA/VIN codes;
  do not invent persistent vendor mutations. Use per-attempt writable runtime
  storage and preserve Android's inherited boot classpath/library configuration.
- [x] Keep the provider on the authenticated private endpoint, with no static
  fallback or binary in Git. Supply a Node-only local development provider.
- [x] Run both suite commands, syntax/ignore/diff checks, review the change,
  update documentation, commit and leave the result on the requested branch.

### Task 4: physically validated platform preparation and R2 binding

User correction: the external preparation validated on S700 SOP3 is
`setprop persist.sys.sv.isl true`, immediately followed by
`getprop persist.sys.sv.isl`; anything other than exactly true must abort.
The property may be empty after reboot; never rely on a cached value.

- [x] Add the two requested tests and observe both fail before implementation.
- [x] Add set/read/strict comparison in desay-installer.mjs before onInvoking
  and the DEX. Keep DEFAULT_FLAGS internal; no --flags argument.
- [x] Configure DESAY_HELPERS → habro-desay-helpers in wrangler.jsonc.
- [x] Document private bucket creation/binding/object upload, including the
  exact dex_shell_helper.dex key and Wrangler --remote upload option.
- [x] Run full verification, review, commit and push only the feature branch.
