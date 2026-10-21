# P5 integration with current dev ? IN PROGRESS

Merged origin/dev d158a36d into P5 feature c100f5c9, before promotion to dev.
Remote dev contains23 commits absent from P5 (SSO/mail/tax/deployment work).
Preserve those changes; no reset, overwrite or direct main integration.

Two textual conflicts resolved:
- IntegrationsModule retains dev SSO factory ENV injection AND P5 LLM provider.
- Lockfile retains both workspace shared dependency and jose from dev.
No dependency version changes. Frozen-lockfile online install passes; initial
  offline install failed because pnpm lacked registry metadata for policy checks.

Root551 lint/typecheck/test/depcheck all0;1347 tests passed +2 existing skips,
all6 unit tasks fresh (0 cached). Integration still running;
fresh focused bot integration running on opchub_test5432/Redis2 with fake LLM,
SSO, tax, bank/mail and blank external mail credentials. Native demo unchanged.
No backend/UI process cutover, migration, production call or main push.

Native listeners rechecked:4020/API17272,4021/socket16872,3280/Portal17604,
3282/Admin12568. Runtime binaries remain earlier P5-tested versions, not merged
SSO/tax build. Do not claim post-merge browser acceptance from earlier receipts.

Existing owner PR found: #5 release:21-10, dev?main, open, no auto-merge.
After gates and promotion, add P5 evidence/limitations to that PR rather than
create a duplicate or overwrite its title. Owner alone reviews and merges.
