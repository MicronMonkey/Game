// 第一幕「午休集結」— virtual clock 12:00 → 12:30 mapped onto the act's game seconds.
import { CityFieldScene } from './CityFieldScene.js';
import { virtualClock, CITY_LABELS } from '../config.js';
import { interstitial } from '../ui/interstitial.js';

export class GatheringScene extends CityFieldScene {
  constructor() {
    super('Gathering');
    this.act = 1;
  }

  onCreateAct() {
    this.hud.hint('點一位人物 → 點金色集結區，帶夥伴到廣場！');
    this.banner(`${CITY_LABELS[this.city]}廠 午休集結`, `目標 ${this.run.settings.targets[this.city]} 人`);
  }

  clockText() {
    return virtualClock(this.elapsed, this.actSeconds);
  }

  checkEnd() {
    if (this.ended) return;
    const early = this.myCityReached() && this.remaining > 0;
    if (!early && this.remaining > 0) return;
    const before = this.run.bonuses.length;
    if (early) this.grantRemainingBonus('第一幕提前達標・剩餘秒數');
    const bonuses = this.run.bonuses.slice(before);
    this.ended = true;
    const r = this.run;
    interstitial({
      kicker: '12:30 · 第一幕完成',
      title: `${CITY_LABELS[r.city]}收到！${CITY_LABELS[r.allyCity]}也在路上！`,
      lines: [
        `${CITY_LABELS[r.city]}廠：${r.cities[r.city].arrived}/${r.settings.targets[r.city]}　${CITY_LABELS[r.allyCity]}夥伴：${r.cities[r.allyCity].arrived}/${r.settings.targets[r.allyCity]}`,
        '下一幕：雙城同步。干擾變多，已集結人數會保留。',
      ],
      bonuses,
      button: '進入第二幕',
      seconds: 4,
      onDone: () => this.scene.start('Sync'),
    });
    this.hud.root.classList.add('dim');
  }
}
