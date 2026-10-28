-- D-112: ordered IDs from the partial covering index before loading the final 100 bodies.
CREATE INDEX messages_bot_reply_history_idx
  ON messages (created_at DESC, id DESC)
  INCLUDE (room_id, persona_id, reply_to_id)
  WHERE is_simulated AND reply_to_id IS NOT NULL;
