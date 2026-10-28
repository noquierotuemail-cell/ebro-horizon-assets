# Execution record — 2026-10-28-adb-auto-desay.md

Worktree: dedicated checkout /workspace/ebro-horizon-assets, exclusively
feature/adb-auto-desay-v2. Starting commit: 24d4536. No main checkout or merge.

Task 1: complete. RED: missing automatic routing and module; 24 failures.
GREEN: module tests pass; production trust policy remains unavailable.

Task 2: complete; final commit recorded in Git history.
RED: protected resource delivery, helper endpoint, cleanup recovery and
automatic UI. GREEN: protected delivery and real UI handlers pass.

Ruling: no real DEX is accessible. Leave production policy unavailable and
document its exact provisioning contract; do not guess a hash or Desay
preparation. Cost: physical installation remains blocked until supplied.

Ruling: execute in the existing dedicated branch checkout, without another
branch/worktree, to honor the user's exclusive branch constraint.

Ruling: Node 24's default isolated runner in this environment reports only
file-level results. Also use --test-isolation=none to execute and inspect
individual cases; the original CI command is preserved.

Independent whole-change review found four important recovery issues;
all were reproduced before fixes:

- Completed rejection could permanently block retry. Fixed: recovery proves
  process termination, checks installed version and resolves a failed result.
- Same-version installed app could trigger cleanup of an active helper.
  Fixed: attempt-specific PID/exit evidence gates verification and cleanup.
- Apps installation bypassed pending attempt. Fixed: both managed entry
  points check the same unresolved state.
- Pagehide/reload lost tracking. Fixed: minimal serial-bound metadata is
  persisted before invocation; reload restores the pending block.

Additional boundary correction: any one positive DesaySV/G7PH indicator is
sufficient even if other properties are empty. Unknown incomplete profiles
fail closed instead of choosing standard silently.

Final expanded suite: 92 tests, 92 pass, no failures/skips. Existing suite
unchanged apart from additional route coverage. No private DEX is tracked
or added. No physical vehicle validation possible without the actual helper.

Final original runner: 7 test files passed. Syntax checks: 9 modified/new
runtime modules passed. git diff --check passed. Private helper ignore rules
verified with git check-ignore; git ls-files found no dex_shell_helper.dex.

## Continuation with the verified attachment

Task 3: complete. User supplied 8568-byte Dalvik DEX 038 with expected
SHA-256 2adefeff7f1cce400996a82d651a3075fe414c4c4dc2db03609f2a87b4619b15.
Verified exact size/hash/magic plus internal Adler-32 checksum and SHA-1
signature before private bytecode inspection or local provisioning.

Replaced the unavailable policy with the independently pinned size/hash.
The reviewed helper accepts the APK path and uses PackageInstaller;
no vendor-property preparation or OTA/VIN algorithms occur in the DEX.
Preparation checks the Android runtime/files, creates a private per-attempt
runtime/dalvik-cache, and returns ANDROID_ROOT/ANDROID_DATA for the invocation
shell. Boot classpath and native library environment remain inherited.

The DEX is stored only at ignored adb/.private/dex_shell_helper.dex (0600).
The Node-only local adapter validates against the same pinned production
policy. Tools are excluded from assets/deployments. No private bytecode,
decompiled source or binary encoding is committed. No R2 upload/deploy.

RED: seven production-policy/preparation/local-provider tests failed against
the provisional implementation. GREEN: those cases pass with the actual
private dependency. Existing synthetic security/regression cases still pass.
An additional integration test executes the real generated shell with a
local external-executable substitute; verifies runtime assignments,
inherited variables, positional arguments, numeric PID/exit and umask.

Independent review: no critical/important findings. Minor checklist status
was updated. Physical ART startup with the private data directory is not
tested without a connected vehicle; documented in the delivery notes.

Validation: expanded suite 100/100 with local DEX; clean public-copy suite
95 passed and 5 explicitly optional private-binary tests skipped. Original
test command also passes. Runtime module syntax and diff/ignore checks pass.

## User correction: platform property and deployed binding

The user supplied physical S700 SOP3 validation for the external platform
preparation: setprop persist.sys.sv.isl true, immediately followed by getprop.
The installer now requires exactly true before recording invocation or
executing the DEX. No cached value is trusted after a reboot. No extra
--flags argument is added; DEFAULT_FLAGS remains internal to the helper.

RED: both requested platform-property tests failed before implementation.
GREEN: empty initial value proceeds after set/read; empty, false, uppercase,
extra or multi-line output and failed setprop all abort before DEX execution.
Pre-invocation failure still cleans only this attempt's temporary directory.

wrangler.jsonc now declares DESAY_HELPERS with bucket_name
habro-desay-helpers. Delivery documentation gives exact Dashboard/CLI
setup and object upload instructions. No Cloudflare resources were created,
no upload/deployment was run and no private binary was added to Git/Assets.

Independent review: no issues. Final suite with local private DEX: 102 passed,
0 failed, 0 skipped. Original runner: 7 files passed. Public-copy suite:
97 passed, 0 failed, 5 optional private-binary cases skipped. Wrangler JSON
and binding target validated; runtime/test syntax and diff checks pass.
