// Random events (symbolic jokes — NOT claims about what happened on the day).
// Lifecycle: spawn (weighted, capped per city) → active (timer / player fix) → cleared.
import { TUNING } from '../config.js';
import { edgeKey } from './pathing.js';

export const EVENT_DEFS = {
  queue: { name: '午餐排隊', hint: '紅色道路變慢🐢！點「🍱排隊」標誌 2 下分流', weight: 3 },
  lost: { name: '工程師迷路', hint: '紅光❓的人迷路了！點他，再點集結區重新指引', weight: 3 },
  meeting: { name: '突然開會', hint: '紅光📢的人被叫去開會！點「📢開會」標誌 3 下解散', weight: 2 },
  cloud: { name: '陰天烏雲', hint: '陽光收集 -50%！用技能「☀️陽光照耀」掃開', weight: 2 },
  signal: { name: '雙城訊號中斷', hint: '雙城共鳴無法施放！依序點 1→2→3', weight: 1 },
};

export class EventsSystem {
  /**
   * host must provide: fields{city→CityField}, skills, rng, onEventStart(type, city), onEventEnd(type, city), hud
   */
  constructor(host, { interval, frequency }) {
    this.host = host;
    this.interval = interval / frequency;
    this.timer = this.interval * 0.6;
    this.signal = null; // {time, next}
    this.enabled = true;
    this.history = [];
  }

  cities() {
    return Object.keys(this.host.fields);
  }

  activeCount(city) {
    const f = this.host.fields[city];
    return f.queues.size + (f.cloud ? 1 : 0) + f.meetings.length + (f.lostEvent > 0 ? 1 : 0);
  }

  tick(dt) {
    const fields = this.host.fields;
    // advance active events
    for (const c of this.cities()) {
      const f = fields[c];
      for (const [k, q] of f.queues) {
        q.time -= dt;
        if (q.time <= 0) this.clearQueue(c, k, false);
      }
      if (f.cloud) {
        f.cloud.time -= dt;
        if (f.cloud.time <= 0) this.clearCloud(c, false);
      }
      for (const m of [...f.meetings]) {
        m.time -= dt;
        if (m.time <= 0) this.clearMeeting(c, m, false);
      }
      if (f.lostEvent > 0) {
        f.lostEvent -= dt;
        if (f.lostEvent <= 0 || !f.chars.some((ch) => ch.state === 'lost')) f.lostEvent = 0;
      }
    }
    if (this.signal) {
      this.signal.time -= dt;
      if (this.signal.time <= 0) this.clearSignal(false);
    }
    if (!this.enabled) return;
    this.timer -= dt;
    if (this.timer <= 0) {
      this.timer = this.interval * (0.75 + this.host.rng() * 0.5);
      this.spawnRandom();
    }
  }

  spawnRandom() {
    const rng = this.host.rng;
    const cities = this.cities().filter((c) => this.activeCount(c) < TUNING.maxEventsPerCity);
    if (!cities.length) return null;
    const city = cities[Math.floor(rng() * cities.length)];
    const f = this.host.fields[city];
    const pool = Object.entries(EVENT_DEFS).filter(([type]) => {
      if (type === 'signal') return !this.signal;
      if (type === 'cloud') return !f.cloud;
      if (type === 'meeting') return f.chars.filter((ch) => ch.active && ch.state !== 'lost').length >= 2;
      if (type === 'lost') return f.chars.some((ch) => ch.active);
      if (type === 'queue') return f.queues.size < 1;
      return true;
    });
    if (!pool.length) return null;
    const total = pool.reduce((s, [, d]) => s + d.weight, 0);
    let r = rng() * total;
    let pick = pool[0][0];
    for (const [type, d] of pool) {
      r -= d.weight;
      if (r <= 0) {
        pick = type;
        break;
      }
    }
    this.start(pick, city);
    return { type: pick, city };
  }

  start(type, city) {
    const f = this.host.fields[city];
    const rng = this.host.rng;
    this.history.push({ type, city });
    if (type === 'queue') {
      // never pick an edge that touches the zone — the zone always keeps 3 open approaches
      const edges = f.map.edges.filter(([a, b]) => a !== f.map.zone.node && b !== f.map.zone.node);
      const [a, b] = edges[Math.floor(rng() * edges.length)];
      const k = edgeKey(a, b);
      f.addQueue(k, { time: TUNING.queueSeconds, taps: 0, a, b });
    } else if (type === 'lost') {
      const cands = f.chars.filter((ch) => ch.active && (ch.state === 'moving' || ch.state === 'idle'));
      cands.sort((x, y) => (y.type === 'lost') - (x.type === 'lost'));
      const n = Math.min(cands.length, 1 + Math.floor(rng() * 3));
      for (let i = 0; i < n; i++) cands[i].getLost(i === 0 ? '導航又帶我繞路！' : '');
      f.lostEvent = 12;
    } else if (type === 'meeting') {
      const cands = f.chars.filter((ch) => ch.active && ch.state !== 'lost' && ch.pausedFor <= 0);
      const group = cands.slice(0, Math.min(4, cands.length));
      group.forEach((ch) => (ch.pausedFor = TUNING.meetingSeconds));
      f.addMeeting({ time: TUNING.meetingSeconds, taps: 0, group });
    } else if (type === 'cloud') {
      f.setCloud({ time: TUNING.cloudSeconds });
    } else if (type === 'signal') {
      this.signal = { time: 15, next: 1, city };
      this.host.skills.blocked.city_resonance = '訊號中斷';
    }
    this.host.onEventStart(type, city);
  }

  tapQueue(city, k) {
    const q = this.host.fields[city].queues.get(k);
    if (!q) return false;
    q.taps += 1;
    if (q.taps >= TUNING.queueTapsToClear) this.clearQueue(city, k, true);
    return true;
  }

  tapMeeting(city, m) {
    m.taps += 1;
    if (m.taps >= TUNING.meetingTapsToClear) this.clearMeeting(city, m, true);
    return true;
  }

  /** Accessible alternative: one button press resolves the oldest meeting in a city. */
  resolveMeeting(city) {
    const m = this.host.fields[city].meetings[0];
    if (m) this.clearMeeting(city, m, true);
  }

  tapSignal(n) {
    if (!this.signal) return 'none';
    if (n === this.signal.next) {
      this.signal.next += 1;
      if (this.signal.next > 3) {
        this.clearSignal(true);
        return 'fixed';
      }
      return 'ok';
    }
    this.signal.next = 1;
    return 'reset';
  }

  clearQueue(city, k, byPlayer) {
    this.host.fields[city].removeQueue(k);
    this.host.onEventEnd('queue', city, byPlayer);
  }

  clearMeeting(city, m, byPlayer) {
    m.group.forEach((ch) => (ch.pausedFor = 0));
    this.host.fields[city].removeMeeting(m);
    this.host.onEventEnd('meeting', city, byPlayer);
  }

  clearCloud(city, byPlayer) {
    this.host.fields[city].setCloud(null);
    this.host.onEventEnd('cloud', city, byPlayer);
  }

  /** Sunlight skill: remove one cloud (longest remaining). Returns city or null. */
  removeOneCloud() {
    let best = null;
    for (const c of this.cities()) {
      const cl = this.host.fields[c].cloud;
      if (cl && (!best || cl.time > this.host.fields[best].cloud.time)) best = c;
    }
    if (best) this.clearCloud(best, true);
    return best;
  }

  clearSignal(byPlayer) {
    if (!this.signal) return;
    const city = this.signal.city;
    this.signal = null;
    delete this.host.skills.blocked.city_resonance;
    this.host.onEventEnd('signal', city, byPlayer);
  }

  summary(city) {
    const f = this.host.fields[city];
    const parts = [];
    if (f.queues.size) parts.push('🍱排隊');
    if (f.cloud) parts.push('☁️烏雲');
    if (f.meetings.length) parts.push('📢開會');
    if (f.chars.some((ch) => ch.state === 'lost')) parts.push('❓迷路');
    if (this.signal) parts.push('📡斷訊');
    return parts.join(' ');
  }
}
