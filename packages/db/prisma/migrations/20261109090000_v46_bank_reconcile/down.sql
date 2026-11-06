-- Stop 806 writers first; preserve short notes in raw before removing columns.
UPDATE payment_transactions SET raw=raw||jsonb_build_object('_shortNote',short_note,'_shortBy',short_by),
 match_status='unmatched' WHERE match_status::text='short';
DROP INDEX payment_transactions_bank_recent;
DROP TABLE bank_webhook_keys;
ALTER TABLE payment_transactions DROP COLUMN short_note, DROP COLUMN short_by;
-- PostgreSQL cannot DROP one enum label non-destructively; retain unused 'short'.
-- Retain operator bank setting and audit history. Old code never writes 'short'.
