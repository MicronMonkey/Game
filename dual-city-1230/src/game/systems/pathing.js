// Waypoint-graph pathing (Dijkstra). Characters only walk along roads, so buildings
// are avoided by construction. Edge costs can be raised temporarily (lunch queue)
// so routes divert to alternatives; nothing ever fully blocks the gathering zone.

export function buildGraph(map) {
  const adj = new Map();
  for (const id of Object.keys(map.nodes)) adj.set(id, []);
  for (const [a, b] of map.edges) {
    adj.get(a).push(b);
    adj.get(b).push(a);
  }
  return adj;
}

export function edgeKey(a, b) {
  return a < b ? `${a}|${b}` : `${b}|${a}`;
}

export function dist(p, q) {
  return Math.hypot(p.x - q.x, p.y - q.y);
}

/** costMult: Map edgeKey -> multiplier */
export function shortestPath(map, adj, from, to, costMult = new Map()) {
  const d = new Map();
  const prev = new Map();
  const open = new Set(adj.keys());
  for (const k of open) d.set(k, Infinity);
  d.set(from, 0);
  while (open.size) {
    let u = null;
    let best = Infinity;
    for (const k of open) {
      if (d.get(k) < best) {
        best = d.get(k);
        u = k;
      }
    }
    if (u === null) break;
    open.delete(u);
    if (u === to) break;
    for (const v of adj.get(u)) {
      if (!open.has(v)) continue;
      const w = dist(map.nodes[u], map.nodes[v]) * (costMult.get(edgeKey(u, v)) || 1);
      const alt = d.get(u) + w;
      if (alt < d.get(v)) {
        d.set(v, alt);
        prev.set(v, u);
      }
    }
  }
  if (d.get(to) === Infinity) return null;
  const path = [to];
  let cur = to;
  while (cur !== from) {
    cur = prev.get(cur);
    path.unshift(cur);
  }
  return path;
}

export function nearestNode(map, p, exclude = []) {
  let best = null;
  let bd = Infinity;
  for (const [id, n] of Object.entries(map.nodes)) {
    if (exclude.includes(id)) continue;
    const dd = dist(n, p);
    if (dd < bd) {
      bd = dd;
      best = id;
    }
  }
  return best;
}

/** Distance from point p to segment ab. */
export function distToSegment(p, a, b) {
  const vx = b.x - a.x;
  const vy = b.y - a.y;
  const len2 = vx * vx + vy * vy || 1;
  let t = ((p.x - a.x) * vx + (p.y - a.y) * vy) / len2;
  t = Math.max(0, Math.min(1, t));
  return Math.hypot(p.x - (a.x + t * vx), p.y - (a.y + t * vy));
}
