import { LIVE_FEED_MAX } from '../../api-domains';
import type {
  DashboardLive,
  LiveActivity,
  LiveCountry,
  LiveMember,
  LiveMessage,
  LiveSession,
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
import { mockDashboardThreads } from './dashboard-threads';
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
    threads: mockDashboardThreads(),
  };
}
