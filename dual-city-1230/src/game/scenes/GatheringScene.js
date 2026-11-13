// 第一幕「午休集結」— virtual clock 12:00 → 12:30 mapped onto the act's game seconds.
import { CityFieldScene } from './CityFieldScene.js';
import { virtualClock, CITY_LABELS, CITIES } from '../config.js';
import { interstitial } from '../ui/interstitial.js';

export class GatheringScene extends CityFieldScene {
  constructor() {
    super('Gathering');
    this.act = 1;
  }

  onCreateAct() {
    this.hud.hint('點人物 → 點集結區，把夥伴帶到廣場！');
  }

  clockText() {
    return virtualClock(this.elapsed, this.actSeconds);
  }

  checkEnd() {
    if (this.ended) return;
    const early = this.bothReached() && this.remaining > 0;
    if (!early && this.remaining > 0) return;
    const before = this.run.bonuses.length;
    if (early) this.grantRemainingBonus('第一幕提前雙城達標・剩餘秒數');
    const bonuses = this.run.bonuses.slice(before);
    this.ended = true;
    const lines = CITIES.map((c) => `${CITY_LABELS[c]}：${this.run.cities[c].arrived}/${this.run.settings.targets[c]}`);
    const ui = interstitial({
      kicker: '12:30 · 第一幕完成',
      title: '桃園收到！台中也收到了！',
      lines: [...lines, '下一幕：雙城同步，處理突發事件、打通連線。已集結人數會保留。'],
      bonuses,
      button: '進入第二幕',
      seconds: 4,
      onDone: () => this.scene.start('Sync'),
    });
    this.hud.root.classList.add('dim');
    this.skipInter = ui;
  }
}
