-- Rollback drops only new reply-run metadata; actual chat messages remain intact.
DROP TABLE IF EXISTS bot_reply_runs;
