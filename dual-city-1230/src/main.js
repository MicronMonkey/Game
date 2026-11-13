import Phaser from 'phaser';
import './styles/main.css';
import { App, reducedMotion } from './game/app.js';
import { Audio } from './game/systems/AudioSystem.js';
import { BootScene } from './game/scenes/BootScene.js';
import { IntroScene } from './game/scenes/IntroScene.js';
import { MenuScene } from './game/scenes/MenuScene.js';
import { GatheringScene } from './game/scenes/GatheringScene.js';
import { SyncScene } from './game/scenes/SyncScene.js';
import { BossScene } from './game/scenes/BossScene.js';
import { EndingScene } from './game/scenes/EndingScene.js';

// Render at device resolution (capped at 2× for performance) but lay out in CSS px.
const dpr = Math.min(2, window.devicePixelRatio || 1);
App.dpr = dpr;
Audio.setEnabled(App.save.settings.soundEnabled);
document.documentElement.classList.toggle('reduce-motion', reducedMotion());

const parent = document.getElementById('game');
const game = new Phaser.Game({
  type: Phaser.AUTO,
  parent,
  backgroundColor: '#101216',
  width: window.innerWidth * dpr,
  height: window.innerHeight * dpr,
  scale: { mode: Phaser.Scale.NONE, zoom: 1 / dpr },
  render: { antialias: true, roundPixels: false },
  input: { activePointers: 2 },
  disableContextMenu: true,
  banner: false,
  fps: { target: 60, min: 20 },
  scene: [BootScene, IntroScene, MenuScene, GatheringScene, SyncScene, BossScene, EndingScene],
});
App.game = game;

let rt = null;
function resize() {
  clearTimeout(rt);
  rt = setTimeout(() => {
    game.scale.resize(window.innerWidth * dpr, window.innerHeight * dpr);
    game.scale.setZoom(1 / dpr);
  }, 60);
}
window.addEventListener('resize', resize);
window.addEventListener('orientationchange', resize);

// Unlock audio on the first user gesture anywhere.
const unlock = () => Audio.unlock();
window.addEventListener('pointerdown', unlock, { passive: true });
window.addEventListener('keydown', unlock);

// Test/debug hooks (only with ?test=1)
if (App.testMode) {
  window.__dc = { App, game };
}
