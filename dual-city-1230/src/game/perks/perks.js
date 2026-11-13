// 夥伴裝備 (perks): five helpers/buffs unlocked by achievements, max 2 equipped.
// Pure functions over the save object so they're unit-testable.
export const MAX_EQUIPPED = 2;

export const PERKS = [
  {
    id: 'bento_station',
    icon: '🍱',
    name: '便當補給站',
    effect: '跑酷兩幕開場就帶著 5 位夥伴',
    where: '第一、二幕',
    condition: '累計號召 100 位夥伴',
    progress: (s) => [Math.min(100, s.stats.lunchArrivals || 0), 100],
    unlocked: (s) => (s.stats.lunchArrivals || 0) >= 100,
  },
  {
    id: 'radio_truck',
    icon: '📣',
    name: '志工廣播車',
    effect: '基礎號召力 +12（黃圈一開始就比較大）',
    where: '第一、二幕',
    condition: '單局遊戲分數達 60,000',
    progress: (s) => [Math.min(60000, bestScore(s)), 60000],
    unlocked: (s) => bestScore(s) >= 60000,
  },
  {
    id: 'sweeper',
    icon: '🧹',
    name: '掃黑幕小幫手',
    effect: 'Boss 關有小幫手：黑幕落到下方時速度減半，每 8 秒幫你燒掉最低的一片',
    where: 'Boss',
    condition: '擊敗黑箱 Boss 1 次',
    progress: (s) => [Math.min(1, s.stats.bossWins || 0), 1],
    unlocked: (s) => (s.stats.bossWins || 0) >= 1,
  },
  {
    id: 'flashlight',
    icon: '🔦',
    name: '手電筒夥伴',
    effect: '光束 +15%，弱點暴擊只要 2.4 秒（原 3 秒）',
    where: 'Boss',
    condition: '取得成就「雙城英雄」（單局兩城都達標）',
    progress: (s) => [s.achievements.includes('dual_hero') ? 1 : 0, 1],
    unlocked: (s) => s.achievements.includes('dual_hero'),
  },
  {
    id: 'lunch_extension',
    icon: '⏱️',
    name: '午休延長',
    effect: 'Boss 戰時間 +8 秒',
    where: 'Boss',
    condition: '取得成就「陽光使者」（累計使用技能 10 次）',
    progress: (s) => [Math.min(10, s.stats.skillsUsed || 0), 10],
    unlocked: (s) => s.achievements.includes('sun_envoy') || (s.stats.skillsUsed || 0) >= 10,
  },
];

export function bestScore(save) {
  return Math.max(0, ...Object.values(save.scores || {}).map((x) => x.highest || 0));
}

export function perkById(id) {
  return PERKS.find((p) => p.id === id) || null;
}

export function unlockedPerks(save) {
  return PERKS.filter((p) => p.unlocked(save)).map((p) => p.id);
}

/** Equipped perks that are still unlocked (never more than MAX_EQUIPPED). */
export function equippedPerks(save) {
  const ok = new Set(unlockedPerks(save));
  return (save.perksEquipped || []).filter((id) => ok.has(id)).slice(0, MAX_EQUIPPED);
}

/** Toggle a perk. Returns { ok, reason }. Mutates save.perksEquipped. */
export function togglePerk(save, id) {
  const p = perkById(id);
  if (!p) return { ok: false, reason: '未知裝備' };
  if (!p.unlocked(save)) return { ok: false, reason: `尚未解鎖：${p.condition}` };
  const eq = equippedPerks(save);
  if (eq.includes(id)) {
    save.perksEquipped = eq.filter((x) => x !== id);
    return { ok: true, equipped: false };
  }
  if (eq.length >= MAX_EQUIPPED) return { ok: false, reason: `最多同時裝備 ${MAX_EQUIPPED} 個，請先卸下一個` };
  save.perksEquipped = [...eq, id];
  return { ok: true, equipped: true };
}

export function hasPerk(run, id) {
  return !!run?.perks?.includes(id);
}

/** Perks that became unlocked between two snapshots of unlocked ids. */
export function newlyUnlocked(before, after) {
  return after.filter((id) => !before.includes(id)).map(perkById);
}
