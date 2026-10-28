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
