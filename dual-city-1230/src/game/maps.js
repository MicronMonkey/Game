// Stylised, fictional city layouts in a 400×300 logical field.
// These are artistic interpretations — NOT accurate site plans.

export const FIELD_W = 400;
export const FIELD_H = 300;

export const MAPS = {
  taoyuan: {
    id: 'taoyuan',
    name: '桃園',
    subtitle: '廠區 · 停車場 · 集結廣場',
    zone: { x: 330, y: 158, r: 44, node: 'Z', label: '集結廣場' },
    nodes: {
      A: { x: 34, y: 62 },
      B: { x: 34, y: 246 },
      C: { x: 128, y: 62 },
      D: { x: 128, y: 158 },
      E: { x: 128, y: 246 },
      F: { x: 236, y: 62 },
      G: { x: 236, y: 158 },
      H: { x: 236, y: 246 },
      Z: { x: 330, y: 158 },
    },
    edges: [
      ['A', 'C'], ['C', 'F'], ['C', 'D'], ['D', 'E'], ['B', 'E'], ['E', 'H'],
      ['D', 'G'], ['F', 'G'], ['G', 'H'], ['G', 'Z'], ['H', 'Z'], ['F', 'Z'],
    ],
    spawns: ['A', 'B', 'C'],
    // idle milling spots on the open roads near the doors (rest / food area side)
    idleSpots: [
      { x: 80, y: 62 },
      { x: 80, y: 246 },
      { x: 128, y: 108 },
      { x: 128, y: 204 },
      { x: 180, y: 158 },
    ],
    buildings: [
      { x: 52, y: 84, w: 60, h: 56, kind: 'fab', label: '廠房' },
      { x: 150, y: 84, w: 70, h: 56, kind: 'fab', label: '廠房' },
      { x: 150, y: 180, w: 70, h: 50, kind: 'parking', label: '停車場' },
      { x: 52, y: 170, w: 60, h: 60, kind: 'food', label: '餐點區' },
      { x: 258, y: 10, w: 120, h: 36, kind: 'office', label: '' },
    ],
  },
  taichung: {
    id: 'taichung',
    name: '台中',
    subtitle: '工廠剪影 · 綠地 · 裝置藝術廣場',
    zone: { x: 72, y: 150, r: 44, node: 'Z', label: '裝置藝術前' },
    nodes: {
      A: { x: 366, y: 56 },
      B: { x: 366, y: 250 },
      C: { x: 270, y: 56 },
      D: { x: 270, y: 150 },
      E: { x: 270, y: 250 },
      F: { x: 166, y: 56 },
      G: { x: 166, y: 150 },
      H: { x: 166, y: 250 },
      Z: { x: 72, y: 150 },
    },
    edges: [
      ['A', 'C'], ['C', 'F'], ['C', 'D'], ['D', 'E'], ['B', 'E'], ['E', 'H'],
      ['D', 'G'], ['F', 'G'], ['G', 'H'], ['G', 'Z'], ['H', 'Z'], ['F', 'Z'],
      ['A', 'D'],
    ],
    spawns: ['A', 'B', 'E'],
    idleSpots: [
      { x: 318, y: 56 },
      { x: 318, y: 250 },
      { x: 270, y: 104 },
      { x: 270, y: 202 },
      { x: 218, y: 150 },
    ],
    buildings: [
      { x: 288, y: 76, w: 56, h: 54, kind: 'fab', label: '工廠' },
      { x: 186, y: 76, w: 64, h: 54, kind: 'fab', label: '工廠' },
      { x: 186, y: 172, w: 64, h: 58, kind: 'green', label: '綠地' },
      { x: 288, y: 172, w: 56, h: 58, kind: 'fab', label: '' },
      { x: 20, y: 8, w: 120, h: 34, kind: 'office', label: '' },
    ],
  },
};

/**
 * Return a map oriented for the screen. Portrait screens get the layout transposed
 * (x↔y) into a 300×400 field so the single city fills a phone screen.
 */
export function orientedMap(id, portrait) {
  const m = MAPS[id];
  if (!portrait) return { ...m, w: FIELD_W, h: FIELD_H, portrait: false };
  const t = (p) => ({ ...p, x: p.y, y: p.x });
  return {
    ...m,
    w: FIELD_H,
    h: FIELD_W,
    portrait: true,
    zone: t(m.zone),
    nodes: Object.fromEntries(Object.entries(m.nodes).map(([k, p]) => [k, t(p)])),
    idleSpots: m.idleSpots.map(t),
    buildings: m.buildings.map((b) => ({ ...b, x: b.y, y: b.x, w: b.h, h: b.w })),
  };
}
