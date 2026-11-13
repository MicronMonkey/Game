// Local-only achievements (docs/02).
export const ACHIEVEMENTS = [
  { id: 'bento_guardian', name: '便當守護者', desc: '累計引導 20 名午餐戰士' },
  { id: 'dual_hero', name: '雙城英雄', desc: '單局兩城都達標' },
  { id: 'sun_envoy', name: '陽光使者', desc: '累計使用技能 10 次' },
  { id: 'lunch_legend', name: '午休傳奇', desc: '地獄午休模式擊敗 Boss' },
  { id: 'never_give_up', name: '不放棄的人', desc: 'Boss 失敗後重新挑戰成功' },
  { id: 'witness', name: '歷史見證者', desc: '瀏覽過桃園與台中兩地相簿' },
];

/** Mutates save; returns list of newly unlocked achievement objects. */
export function evaluateAchievements(save, run = null) {
  const has = new Set(save.achievements);
  const unlock = [];
  const give = (id) => {
    if (!has.has(id)) {
      has.add(id);
      unlock.push(ACHIEVEMENTS.find((a) => a.id === id));
    }
  };
  if (save.stats.lunchArrivals >= 20) give('bento_guardian');
  if (save.stats.skillsUsed >= 10) give('sun_envoy');
  if (save.galleryViewed.taoyuan && save.galleryViewed.taichung) give('witness');
  if (run) {
    if (run.citiesReached >= 2) give('dual_hero');
    if (run.bossWin && run.difficulty === 'hell') give('lunch_legend');
    if (run.bossWin && run.bossFailedBefore) give('never_give_up');
  }
  save.achievements = [...has];
  return unlock;
}
