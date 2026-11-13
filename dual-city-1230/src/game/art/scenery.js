// Stylised city backdrops drawn with Phaser Graphics (fictional, not site-accurate).

const C = {
  ground: 0x1a1d24,
  ground2: 0x20242d,
  road: 0x3a404d,
  roadEdge: 0x4b5263,
  roadLine: 0x6b7385,
  fab: 0x2c3240,
  fabTop: 0x3a4254,
  window: 0xffd447,
  parking: 0x262a33,
  green: 0x1f3a2c,
  food: 0x3b2f2a,
  office: 0x2a2f3b,
};

export function drawCity(scene, container, map) {
  const FIELD_W = map.w;
  const FIELD_H = map.h;
  const g = scene.add.graphics();
  container.add(g);
  // ground with subtle tiles
  g.fillStyle(C.ground, 1);
  g.fillRoundedRect(0, 0, FIELD_W, FIELD_H, 10);
  g.fillStyle(C.ground2, 1);
  for (let x = 0; x < FIELD_W; x += 40) {
    for (let y = (x / 40) % 2 ? 0 : 20; y < FIELD_H; y += 40) g.fillRect(x, y, 20, 20);
  }
  // buildings
  for (const b of map.buildings) {
    if (b.kind === 'fab' || b.kind === 'office') {
      g.fillStyle(C.fab, 1);
      g.fillRoundedRect(b.x, b.y, b.w, b.h, 4);
      g.fillStyle(C.fabTop, 1);
      g.fillRect(b.x, b.y, b.w, 8);
      // sawtooth roof
      g.fillStyle(0x4a5368, 1);
      for (let x = b.x + 2; x < b.x + b.w - 8; x += 12) g.fillTriangle(x, b.y + 8, x + 10, b.y + 8, x + 10, b.y + 1);
      // lit windows
      g.fillStyle(C.window, 0.5);
      for (let x = b.x + 6; x < b.x + b.w - 6; x += 10) {
        for (let y = b.y + 14; y < b.y + b.h - 6; y += 10) if ((x + y) % 3 !== 0) g.fillRect(x, y, 5, 4);
      }
    } else if (b.kind === 'parking') {
      g.fillStyle(C.parking, 1);
      g.fillRoundedRect(b.x, b.y, b.w, b.h, 4);
      g.lineStyle(1, 0x5a6275, 1);
      for (let x = b.x + 8; x < b.x + b.w; x += 12) g.lineBetween(x, b.y + 4, x, b.y + 18);
      const cars = [0xe83b3b, 0x64748b, 0xf5f5f5, 0x5b8def];
      cars.slice(0, Math.max(1, Math.floor((b.w - 4) / 16))).forEach((c, i) => {
        g.fillStyle(c, 0.85);
        g.fillRoundedRect(b.x + 4 + i * 16, b.y + 26 + (i % 2) * 8, 10, 14, 3);
      });
    } else if (b.kind === 'green') {
      g.fillStyle(C.green, 1);
      g.fillRoundedRect(b.x, b.y, b.w, b.h, 10);
      g.fillStyle(0x2f6b45, 1);
      [[14, 14], [40, 22], [22, 40], [50, 44]].forEach(([dx, dy]) => g.fillCircle(b.x + dx, b.y + dy, 7));
    } else if (b.kind === 'food') {
      g.fillStyle(C.food, 1);
      g.fillRoundedRect(b.x, b.y, b.w, b.h, 4);
      // stall awnings
      for (let i = 0; i < Math.min(3, Math.floor((b.w - 4) / 18)); i++) {
        g.fillStyle(i % 2 ? 0xff9f1c : 0xe83b3b, 1);
        g.fillRect(b.x + 4 + i * 18, b.y + 6, 16, 6);
        g.fillStyle(0xf5f5f5, 0.8);
        g.fillRect(b.x + 6 + i * 18, b.y + 16, 12, 8);
      }
    }
  }
  // roads
  for (const [a, b] of map.edges) {
    const p = map.nodes[a];
    const q = map.nodes[b];
    g.lineStyle(16, C.roadEdge, 1);
    g.lineBetween(p.x, p.y, q.x, q.y);
  }
  for (const [a, b] of map.edges) {
    const p = map.nodes[a];
    const q = map.nodes[b];
    g.lineStyle(12, C.road, 1);
    g.lineBetween(p.x, p.y, q.x, q.y);
  }
  for (const n of Object.values(map.nodes)) {
    g.fillStyle(C.road, 1);
    g.fillCircle(n.x, n.y, 8);
  }
  // dashed centre lines
  g.lineStyle(1, C.roadLine, 0.8);
  for (const [a, b] of map.edges) {
    const p = map.nodes[a];
    const q = map.nodes[b];
    const len = Math.hypot(q.x - p.x, q.y - p.y);
    for (let t = 0; t < len; t += 10) {
      const t2 = Math.min(len, t + 5);
      g.lineBetween(p.x + ((q.x - p.x) * t) / len, p.y + ((q.y - p.y) * t) / len, p.x + ((q.x - p.x) * t2) / len, p.y + ((q.y - p.y) * t2) / len);
    }
  }
  // spawn doors
  for (const s of map.spawns) {
    const n = map.nodes[s];
    g.fillStyle(0x64748b, 1);
    g.fillRoundedRect(n.x - 9, n.y - 9, 18, 18, 4);
    g.fillStyle(0xffd447, 0.9);
    g.fillRect(n.x - 5, n.y - 6, 10, 2);
  }
  // gathering zone
  const z = map.zone;
  const glow = scene.add.image(z.x, z.y, 'glow').setDisplaySize(z.r * 3.2, z.r * 3.2).setAlpha(0.8);
  container.add(glow);
  const zg = scene.add.graphics();
  container.add(zg);
  zg.fillStyle(0x3a2f12, 0.9);
  zg.fillCircle(z.x, z.y, z.r);
  zg.lineStyle(3, 0xffd447, 1);
  zg.strokeCircle(z.x, z.y, z.r);
  zg.lineStyle(1, 0xff9f1c, 0.7);
  zg.strokeCircle(z.x, z.y, z.r - 7);
  if (map.id === 'taichung') {
    // stylised "flying" sculpture: abstract wing arcs (artistic, not a photo of the real piece)
    zg.lineStyle(4, 0xf5f5f5, 0.9);
    zg.beginPath();
    zg.arc(z.x - 6, z.y - 4, 22, Math.PI * 1.1, Math.PI * 1.75);
    zg.strokePath();
    zg.beginPath();
    zg.arc(z.x + 8, z.y - 2, 18, Math.PI * 1.25, Math.PI * 1.95);
    zg.strokePath();
    zg.fillStyle(0xffd447, 1);
    zg.fillCircle(z.x + 1, z.y - 24, 3);
  } else {
    // plaza flag pole + banner
    zg.lineStyle(2, 0xf5f5f5, 1);
    zg.lineBetween(z.x + 18, z.y - 30, z.x + 18, z.y - 6);
    zg.fillStyle(0xffd447, 1);
    zg.fillTriangle(z.x + 18, z.y - 30, z.x + 34, z.y - 25, z.x + 18, z.y - 20);
  }
  const zl = scene.add.text(z.x, z.y + z.r + 2, z.label, {
    fontFamily: 'system-ui, "Noto Sans TC", sans-serif',
    fontSize: '11px',
    color: '#FFD447',
    fontStyle: 'bold',
    resolution: 2,
  }).setOrigin(0.5, 0);
  container.add(zl);
  // building labels
  for (const b of map.buildings) {
    if (!b.label) continue;
    const t = scene.add.text(b.x + b.w / 2, b.y + b.h - 2, b.label, {
      fontFamily: 'system-ui, "Noto Sans TC", sans-serif',
      fontSize: '9px',
      color: '#cbd2df',
      resolution: 2,
    }).setOrigin(0.5, 1).setAlpha(0.8);
    container.add(t);
  }
  return { glow };
}
