import { LIVE_FEED_MAX } from '../../api-domains';
import type {
  DashboardLive,
  LiveActivity,
  LiveCountry,
  LiveMember,
  LiveMessage,
  LiveSession,
  LiveThread,
} from '../../api-domains';
import { communities, events, seed, tones } from '../../fixtures';
import type { ToneKey } from '../../fixtures';
import {
  LIVE_ACTIVITY_PATTERN,
  LIVE_COUNTRY_TOTALS,
  LIVE_EVENT_JOINS,
  LIVE_MESSAGES_TODAY,
  LIVE_ONLINE,
  LIVE_PROVINCE_WEIGHTS,
  LIVE_SESSION_CYCLE_SEC,
  LIVE_SESSIONS,
  LIVE_STATUS_PATTERN,
  LIVE_TEXTS,
} from './dashboard-seed';
import { BOT_THREAD_SEED } from './extras';
import { liveFeed } from './live-feed';
import { avatarUrl, iso } from './util';

/**
 * `GET /dashboard/live` (mock). DV-05: số liệu tĩnh tại thời điểm gọi — bộ mô phỏng 3 giây/lần
 * của prototype không chạy trong component; khi có backend, socket đẩy thay đổi.
 */

type MemberRow = [string, string, string, string, string, string, string];
const MEMBERS = seed.D_P as MemberRow[];
const COUNTRY_NAMES = seed.D_CTRY as Record<string, string>;
const TONE_KEYS: ToneKey[] = ['blue', 'rose', 'green', 'amber', 'violet'];

interface PersonaSeed {
  id: string;
  name: string;
  role: string;
  col: string;
}
interface ScriptSeed {
  id: string;
  gids: string[];
  lines: { pid: string; text: string }[];
}

const comm = (k: number) => communities[k % 6] ?? communities[0];
const toneOf = (k: number) => tones[TONE_KEYS[(k % 6) % TONE_KEYS.length] ?? 'blue'];
const flagUrl = (cc: string) => `https://flagcdn.com/w80/${cc.toLowerCase()}.png`;

function buildMembers(now: number): LiveMember[] {
  const pts = MEMBERS.map((_, i) => 420 + ((i * 137) % 560));
  const max = Math.max(...pts);
  return MEMBERS.map(([org, cc, , type, name, title, ph], i) => ({
    id: `lm${i}`,
    name,
    org: type === 'cn' ? 'Freelancer' : org,
    title,
    countryCode: cc,
    avatarUrl: avatarUrl(ph),
    status: LIVE_STATUS_PATTERN[i] ?? 'off',
    roomName: comm(i % 6)?.name ?? '',
    lastActiveAt: iso(now - (i + 1) * 41_000),
    scorePct: Math.round(((pts[i] ?? 0) / max) * 100),
  }));
}

function buildActivities(now: number): LiveActivity[] {
  return LIVE_ACTIVITY_PATTERN.map((kind, k) => {
    const idx = (k * 5 + 1) % MEMBERS.length;
    const row = MEMBERS[idx];
    const target =
      kind === 'event'
        ? (events[idx % events.length]?.title ?? '')
        : kind === 'login'
          ? ''
          : (comm(k)?.name ?? '');
    return {
      id: `a${k}`,
      memberName: row?.[4] ?? '',
      avatarUrl: avatarUrl(row?.[6]),
      kind,
      target,
      at: iso(now - (k + 1) * 33_000),
    };
  });
}

function buildCountries(): LiveCountry[] {
  return Object.entries(LIVE_COUNTRY_TOTALS).map(([code, total]) => {
    const weights = LIVE_PROVINCE_WEIGHTS[code] ?? [];
    const sum = weights.reduce((a, [, w]) => a + w, 0) || 1;
    return {
      code,
      name: COUNTRY_NAMES[code] ?? code,
      flagUrl: flagUrl(code),
      total,
      provinces: weights.map(([name, w]) => ({ name, count: Math.round((total * w) / sum) })),
    };
  });
}

function buildMessages(now: number): LiveMessage[] {
  return [0, 1, 2, 3, 4, 5].map((k) => {
    const row = MEMBERS[(k * 7 + 3) % MEMBERS.length];
    const tone = toneOf(k);
    return {
      id: `m${k}`,
      memberName: row?.[4] ?? '',
      avatarUrl: avatarUrl(row?.[6]),
      roomName: comm(k)?.name ?? '',
      tone: { bg: tone.bg, fg: tone.fg },
      body: LIVE_TEXTS[(k * 5) % LIVE_TEXTS.length] ?? '',
      at: iso(now - (k + 1) * 37_000),
    };
  });
}

function buildSessions(now: number, eventCount: number): LiveSession[] {
  const pct = (((now / 1000) % LIVE_SESSION_CYCLE_SEC) / LIVE_SESSION_CYCLE_SEC) * 100;
  return LIVE_SESSIONS.map(([name, time, state]) => ({
    name,
    time,
    state,
    progressPct: Math.round(pct * 10) / 10,
    attendees: eventCount * 7,
  }));
}

/** Hội thoại bot đã đăng (BOT_THREAD_SEED, st = posted), mới nhất trước, tối đa 3 */
function buildThreads(now: number): LiveThread[] {
  const scripts = seed.SCRIPT_SEED as ScriptSeed[];
  const personas = seed.PERSONA_SEED as PersonaSeed[];
  const pOf = (id: string) => personas.find((p) => p.id === id);
  const cName = (g: string) => communities.find((c) => c.id === g)?.name ?? g;
  return BOT_THREAD_SEED.filter((t) => t.st === 'done')
    .slice(0, 3)
    .flatMap((t) => {
      const sc = scripts.find((s) => s.id === t.sid);
      const first = sc?.lines[0];
      const author = first ? pOf(first.pid) : undefined;
      if (!sc || !first || !author) return [];
      const second = sc.lines[1];
      const replier = second ? pOf(second.pid) : undefined;
      return [
        {
          id: t.id,
          groupId: sc.gids[0] ?? 'c1',
          groupNames: sc.gids.map(cName),
          at: iso(now - t.ago),
          author: { name: author.name, role: author.role, color: author.col },
          body: first.text,
          reply: second && replier ? { name: replier.name, body: second.text } : null,
          replyCount: Math.max(0, sc.lines.length - 1),
        },
      ];
    });
}

export function dashboardLive(now: number = Date.now()): DashboardLive {
  const members = buildMembers(now);
  const eventCount = members.filter((m) => m.status === 'event').length;
  return {
    generatedAt: iso(now),
    communityCount: communities.length,
    countryCount: Object.keys(LIVE_COUNTRY_TOTALS).length,
    stats: {
      online: LIVE_ONLINE,
      totalMembers: Object.values(LIVE_COUNTRY_TOTALS).reduce((a, b) => a + b, 0),
      joinsLastMinute: 0,
      messagesToday: LIVE_MESSAGES_TODAY + liveFeed().filter((a) => a.kind === 'msg').length,
      messagesLastMinute: 1,
      eventJoins: LIVE_EVENT_JOINS,
    },
    members,
    activities: [...liveFeed(), ...buildActivities(now)].slice(0, LIVE_FEED_MAX),
    countries: buildCountries(),
    messages: buildMessages(now),
    sessions: buildSessions(now, eventCount),
    threads: buildThreads(now),
  };
}
