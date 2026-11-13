// 第一幕「午休集結」— runner stage 1. Virtual clock 12:00 → 12:30 follows the progress.
import { RunnerScene } from './RunnerScene.js';
import { virtualClock, CITY_LABELS } from '../config.js';
import { interstitial } from '../ui/interstitial.js';

export class GatheringScene extends RunnerScene {
  constructor() {
    super('Gathering');
    this.stage = 0;
  }

  clockText(progress) {
    return virtualClock(progress, 1);
  }

  onStageEnd(arrived, met, bonuses) {
    const r = this.run;
    interstitial({
      stars: this.run.stageStars?.[this.stage] ?? 0,
      kicker: '12:30 · 第一幕完成',
      title: met ? `${CITY_LABELS[r.city]}收到！${arrived} 人抵達` : `抵達 ${arrived} 人（目標 ${this.target}）`,
      lines: [
        met ? '集結達標！' : '還差一點，但故事繼續！',
        `${CITY_LABELS[r.allyCity]}夥伴進度：${r.cities[r.allyCity].arrived}/${r.settings.targets[r.allyCity]}`,
        '下一幕：雙城同步。路更長、主管更多，目標提高。',
      ],
      bonuses,
      button: '進入第二幕',
      seconds: 5,
      onDone: () => this.scene.start('Sync'),
    });
    this.hud.root.classList.add('dim');
  }
}
