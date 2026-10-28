-- D-112 replaces the legacy 1–120 UI range and five-minute runtime cap.
-- Normalize historical values into the approved range before enabling strict runtime parsing.
UPDATE bot_scripts SET delay_minutes = LEAST(60, GREATEST(1, delay_minutes))
WHERE delay_minutes NOT BETWEEN 1 AND 60;

UPDATE app_settings SET value = jsonb_set(value, '{delayMinutes}', '60'::jsonb)
WHERE key = 'bot' AND jsonb_typeof(value->'delayMinutes') = 'number'
  AND (value->>'delayMinutes')::numeric > 60;

-- Preserve first-turn admission and reply seconds. Extend existing non-reply deadlines,
-- never shorten them; updated_at is the last cursor/draft update, not the first posted_at.
UPDATE bot_threads t
SET next_at = GREATEST(t.next_at, t.updated_at + make_interval(mins => d.minutes))
FROM (
  SELECT current.id, COALESCE(s.delay_minutes, (a.value->>'delayMinutes')::integer) AS minutes
  FROM bot_threads current
  LEFT JOIN bot_scripts s ON s.id = current.script_id
  JOIN app_settings a ON a.key = 'bot'
  WHERE current.kind IN ('script', 'auto') AND current.status IN ('scheduled', 'running')
    AND current.cursor > 0 AND current.next_at IS NOT NULL
) d
WHERE t.id = d.id;

ALTER TABLE bot_scripts ADD CONSTRAINT bot_scripts_delay_minutes_check
  CHECK (delay_minutes BETWEEN 1 AND 60);

ALTER TABLE app_settings ADD CONSTRAINT app_settings_bot_delay_minutes_check
  CHECK (CASE WHEN key = 'bot' THEN
    CASE WHEN jsonb_typeof(value->'delayMinutes') = 'number' THEN
      (value->>'delayMinutes')::numeric BETWEEN 1 AND 60
      AND mod((value->>'delayMinutes')::numeric, 1) = 0
    ELSE false END
  ELSE true END);
