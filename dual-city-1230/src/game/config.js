// Central gameplay configuration. All numbers come from src/config/game-balance.json
// (an editable copy of the handoff config). In-game counts are fictional gameplay
// values, NOT real attendance figures.
import balance from '../config/game-balance.json';

export const BALANCE = balance;

export const DIFFICULTIES = ['easy', 'normal', 'hell'];

export const DIFFICULTY_LABELS = {
  easy: '輕鬆',
  normal: '標準',
  hell: '地獄午休',
};

export const CITIES = ['taoyuan', 'taichung'];
export const CITY_LABELS = { taoyuan: '桃園', taichung: '台中' };

// Extra tuning that the handoff left to the implementer. Kept here so it is easy to tweak.
export const TUNING = {
  startingSun: 20,
  maxPopulationPerCity: 14,
  // spawn interval (seconds) per city, by fraction of act 1 elapsed
  spawnIntervalEarly: 2.4,
  spawnIntervalMid: 1.8,
  spawnIntervalLate: 1.3,
  spawnIntervalSync: 1.5,
  // events
  eventBaseIntervalSync: 7.5,
  eventBaseIntervalGatheringLate: 14,
  maxEventsPerCity: 2,
  queueSeconds: 10,
  queueSpeedFactor: 0.35,
  queueTapsToClear: 2,
  meetingSeconds: 4,
  meetingTapsToClear: 3,
  cloudSeconds: 8,
  cloudSunFactor: 0.5,
  lostChanceFirstOrder: 0.35,
  lostChanceReorder: 0.12,
  volunteerAuraRadius: 46,
  volunteerAuraSeconds: 2,
  arrivedLingerSeconds: 1.6,
  selectRadius: 26,
  // boss
  bossWeakpointRotateSeconds: 5,
  bossShieldSeconds: 2,
  bossFreezeSeconds: 3.2,
  bossFreezeTapsToThaw: 4,
  bossPhase3BodyDps: 0,
  transitionSeconds: 4,
};

export function difficultySettings(difficulty) {
  const d = BALANCE.difficulty[difficulty] || BALANCE.difficulty.normal;
  const s = BALANCE.stages;
  return {
    id: difficulty,
    label: DIFFICULTY_LABELS[difficulty] || difficulty,
    timeMultiplier: d.time_multiplier,
    eventFrequency: d.event_frequency_multiplier,
    gatheringSeconds: Math.round(s.gathering_seconds * d.time_multiplier),
    syncSeconds: Math.round(s.sync_seconds * d.time_multiplier),
    bossSeconds: Math.round(s.boss_seconds * d.time_multiplier),
    bossHp: Math.round(BALANCE.boss.hp * d.boss_hp_multiplier),
    targets: { ...s.targets },
  };
}

/** Map elapsed act-1 seconds to the virtual 12:00 → 12:30 clock. Never uses the system clock. */
export function virtualClock(elapsed, actSeconds, start = BALANCE.stages.virtual_start, end = BALANCE.stages.virtual_end) {
  const toMin = (t) => {
    const [h, m] = t.split(':').map(Number);
    return h * 60 + m;
  };
  const a = toMin(start);
  const b = toMin(end);
  const frac = Math.max(0, Math.min(1, actSeconds > 0 ? elapsed / actSeconds : 1));
  const total = Math.floor(a + (b - a) * frac);
  const h = Math.floor(total / 60);
  const m = total % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}
