// 第二幕「雙城同步」— runner stage 2 (longer, more managers, higher target).
import { RunnerScene } from './RunnerScene.js';
import { BALANCE, CITY_LABELS } from '../config.js';
import { addBonus } from '../systems/GameState.js';
import { bossInitialDamage } from '../systems/scoring.js';
import { interstitial } from '../ui/interstitial.js';

export class SyncScene extends RunnerScene {
  constructor() {
    super('Sync');
    this.stage = 1;
  }

  clockText() {
    return '12:30';
  }

  onStageEnd(arrived, met, stageBonuses) {
    const r = this.run;
    const allyMet = r.cities[r.allyCity].arrived >= r.settings.targets[r.allyCity];
    const reached = (met ? 1 : 0) + (allyMet ? 1 : 0);
    r.citiesReachedFinal = reached;
    const before = r.bonuses.length;
    if (reached === 2) addBonus(r, '完美雙城', BALANCE.scoring.both_cities_bonus);
    r.bossInitialDamage = bossInitialDamage(reached);
    const bonuses = [...stageBonuses, ...r.bonuses.slice(before)];
    interstitial({
      kicker: '第二幕結算',
      title: reached === 2 ? '完美雙城！' : met ? '你的廠達標！' : `抵達 ${arrived} 人（目標 ${this.target}）`,
      lines: [
        `${CITY_LABELS[r.city]}廠：${arrived}/${this.target}　${CITY_LABELS[r.allyCity]}夥伴：${r.cities[r.allyCity].arrived}/${r.settings.targets[r.allyCity]}`,
        r.bossInitialDamage > 0 ? `雙城的光先削弱黑箱 ${r.bossInitialDamage} HP！` : '黑箱全血登場，但陽光不會停止。',
        `帶到終點的人越多，Boss 戰光束越強（夥伴之光）。`,
      ],
      bonuses,
      button: 'FINAL BOSS',
      seconds: 5,
      onDone: () => this.scene.start('Boss'),
    });
    this.hud.root.classList.add('dim');
  }
}
