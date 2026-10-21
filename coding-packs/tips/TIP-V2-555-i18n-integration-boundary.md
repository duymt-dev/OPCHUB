# TIP-V2-555 ? Preserve owner-merged i18n while integrating P5

Remote dev advanced26 commits to d2e984f6 during final P5 browser verification.
Merge without deleting/reverting i18n. Backend/shared/db/integrations source is
unchanged from99100691, retaining108 focused integration evidence. Check root
gates and UI boundary: original4 Admin bot cases + member reply live/F5 on both
lanes, same assertions, SKIP_SEED=0. Preserve native ports and providers.

Root555 parallel test hit Windows shared Vitest cache ENOTEMPTY startup race;
retain failure, run same root tests serially (no deletion or skipped assertions).
Root555b exposed9 genuine locale key-set failures: P5 branch's existing
register.settingsUnavailable lacks translations in incoming9 locales. Add that
one key per locale; do not weaken109 message contract tests, alter registration
behavior or expand older-phase acceptance. Dedicated message test passes109.

Rebuild Portal after translation repair (556), retain built Admin555. Native
backend byte-identical to99100691. Finish gates/affected browser tests, document
accepted UI deviations, commit/push, promote dev and update existing PR5 for
owner review. No direct main modification or auto-merge.
