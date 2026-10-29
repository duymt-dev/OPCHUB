ALTER TABLE app_settings DROP CONSTRAINT app_settings_bot_delay_minutes_check;
ALTER TABLE bot_scripts DROP CONSTRAINT bot_scripts_delay_minutes_check;
-- Historical normalization/deadline extensions are intentionally not reversed: no new early posts.
