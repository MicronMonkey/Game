import Phaser from 'phaser';
import { App } from '../app.js';
import { generateTextures } from '../art/textures.js';

export class BootScene extends Phaser.Scene {
  constructor() {
    super('Boot');
  }

  create() {
    generateTextures(this);
    document.getElementById('boot-loading')?.remove();
    this.scene.start(App.save.introSeen ? 'Menu' : 'Intro');
  }
}
