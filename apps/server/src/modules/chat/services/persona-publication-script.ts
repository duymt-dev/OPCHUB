/** Redis script is atomic across delivery marker, unread/live counters and socket events.
 * Markers retain the same newest 120 timestamp/id entries as the DB's simulated-message cap.
 * Older/pruned messages are rejected by the publisher before reaching this script.
 */
export const PERSONA_PUBLICATION_SCRIPT = `
local expected = {'hash', 'zset', 'list', 'zset', 'string'}
for i, kind in ipairs(expected) do
  local actual = redis.call('TYPE', KEYS[i]).ok
  if actual ~= 'none' and actual ~= kind then
    return redis.error_reply('Invalid persona publication cache type')
  end
end
if redis.call('ZSCORE', KEYS[2], ARGV[1]) then return 0 end
redis.call('HINCRBY', KEYS[1], ARGV[2], 1)
redis.call('LPUSH', KEYS[3], ARGV[4])
redis.call('LTRIM', KEYS[3], 0, tonumber(ARGV[5]) - 1)
redis.call('ZADD', KEYS[4], ARGV[3], 'msg:' .. ARGV[1])
redis.call('ZREMRANGEBYSCORE', KEYS[4], 0, tonumber(ARGV[3]) - tonumber(ARGV[6]))
redis.call('INCR', KEYS[5])
redis.call('EXPIRE', KEYS[5], tonumber(ARGV[7]))
redis.call('ZADD', KEYS[2], ARGV[3], ARGV[1])
redis.call('ZREMRANGEBYRANK', KEYS[2], 0, -121)
redis.call('PUBLISH', ARGV[8], ARGV[9])
redis.call('PUBLISH', ARGV[8], ARGV[10])
return 1
`;

export const personaDeliveredKey = (roomId: string) => `chat:persona-delivered:${roomId}`;
