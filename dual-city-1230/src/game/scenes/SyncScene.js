// 第二幕「雙城同步」— events in both cities, link the two. Targets are the SAME 30/30
// as act 1 (no hidden increase); arrivals beyond the target still score as bonus.
import { CityFieldScene } from './CityFieldScene.js';
import { BALANCE, CITY_LABELS } from '../config.js';
import { addBonus, citiesReached } from '../systems/GameState.js';
import { bossInitialDamage } from '../systems/scoring.js';
import { interstitial } from '../ui/interstitial.js';
import { toast } from '../ui/dom.js';

export class SyncScene extends CityFieldScene {
  constructor() {
    super('Sync');
    this.act = 2;
  }

  onCreateAct() {
    this.hud.hint(this.myCityReached() ? '已達標！繼續集結仍可加分，並排除紅色干擾' : '干擾變多了！紅光的人需要你處理，目標仍是 30 人');
    this.banner('第二幕 雙城同步', '紅光 = 被干擾', '#FF9F1C');
  }

  onCityGoal() {
    if (citiesReached(this.run) === 2) toast('金色連線！雙城都達標', 'good');
  }

  clockText() {
    return '12:30';
  }

  checkEnd() {
    if (this.ended || this.remaining > 0) return;
    this.ended = true;
    const reached = citiesReached(this.run);
    const before = this.run.bonuses.length;
    if (reached === 2) addBonus(this.run, '完美雙城', BALANCE.scoring.both_cities_bonus);
    this.run.bossInitialDamage = bossInitialDamage(reached);
    const bonuses = this.run.bonuses.slice(before);
    const verdict = reached === 2 ? '完美雙城！' : reached === 1 ? '部分成功：一城達標' : '兩城尚未達標——故事繼續！';
    const lines = [
      `${CITY_LABELS[this.run.city]}廠：${this.run.cities[this.run.city].arrived}/${this.run.settings.targets[this.run.city]}　${CITY_LABELS[this.run.allyCity]}夥伴：${this.run.cities[this.run.allyCity].arrived}/${this.run.settings.targets[this.run.allyCity]}`,
      this.run.bossInitialDamage > 0 ? `雙城的光先削弱黑箱 ${this.run.bossInitialDamage} HP！` : '黑箱全血登場，但陽光不會停止。',
    ];
    interstitial({
      kicker: '第二幕結算',
      title: verdict,
      lines,
      bonuses,
      button: 'FINAL BOSS',
      seconds: 4,
      onDone: () => this.scene.start('Boss'),
    });
    this.hud.root.classList.add('dim');
  }
}
