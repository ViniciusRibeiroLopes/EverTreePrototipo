const test = require("node:test");
const assert = require("node:assert/strict");
const E = require("../engine.js");
const NOW = 1793988000000;
const funded = () => {
  const s = E.fresh(NOW);
  s.leaves = s.lifetime = 9000;
  s.clean = 100;
  E.unlock(s);
  return s;
};
test("fresh game progresses without clicks and remains within resource bounds", () => {
  const s = E.fresh(NOW);
  E.advance(s, NOW + 3600000, false);
  assert(s.leaves > 1000);
  const cap = E.capacities(s);
  for (const k in s.resources)
    assert(s.resources[k] >= 0 && s.resources[k] <= cap[k]);
  assert(s.history.length === 120);
  assert(s.cans === 20);
  E.validate(s, NOW + 3600000);
});
test("offline replay matches 1-second updates including fractions, weather and shortages", () => {
  const base = funded();
  base.trees.ipe = 9;
  base.trees.jacaranda = 6;
  base.resources.water = 2;
  base.resources.soil = 1;
  base.upgrades.cisterna = 1;
  const a = E.clone(base),
    b = E.clone(base);
  E.advance(a, NOW + 7200456, false);
  for (let t = 250; t <= 7200250; t += 250) E.advance(b, NOW + t, false);
  E.advance(b, NOW + 7200456, false);
  assert.deepEqual(a, b);
});
test("online and offline production agree when hazard schedule is inactive", () => {
  const a = funded();
  a.nextEvent = 100000;
  const b = E.clone(a);
  E.advance(a, NOW + 600000, true);
  E.advance(b, NOW + 600000, false);
  assert.equal(a.leaves, b.leaves);
  assert.deepEqual(a.resources, b.resources);
  assert.equal(b.eventClock, 0);
});
test("offline limit is explicit and consumed timestamps cannot be credited twice", () => {
  const s = E.fresh(NOW),
    r = E.advance(s, NOW + 10 * 86400000, false);
  assert.equal(r.seconds, E.MAX_OFFLINE);
  assert.equal(r.skipped, 3 * 86400);
  const leaves = s.leaves;
  assert.equal(E.advance(s, NOW + 10 * 86400000, false).gained, 0);
  assert.equal(s.leaves, leaves);
  assert.equal(E.advance(s, NOW - 1000, false).gained, 0);
});
test("purchases enforce balances, regional species, inventory and escalating cost", () => {
  const s = E.fresh(NOW);
  assert.equal(E.buy(s, "tree", "ipe").ok, false);
  s.leaves = s.lifetime = 9000;
  E.unlock(s);
  assert.equal(E.buy(s, "tree", "sequoia").ok, false);
  const price = E.cost(s, "tree", "ipe");
  assert.equal(E.buy(s, "tree", "ipe").ok, true);
  assert.equal(s.leaves, 9000 - price);
  assert(E.cost(s, "tree", "ipe") > price);
  assert.equal(s.trees.ipe, 1);
});
test("drought watering consumes a can and restores water without exceeding capacity", () => {
  const s = funded();
  while (E.climate(s).weather !== "seca") s.age += 60;
  const old = E.budget(s).potential;
  s.resources.water = 110;
  assert(E.water(s).ok);
  assert.equal(s.resources.water, 120);
  assert.equal(s.cans, 2);
  assert(E.budget(s).potential > old);
  s.cans = 0;
  assert.equal(E.water(s).ok, false);
});
test("resource shortages limit production and manual replenishment recovers it", () => {
  const s = funded();
  s.trees.ipe = 90;
  s.resources = { water: 0, soil: 0, sun: 0 };
  const b = E.budget(s);
  assert(b.efficiency < 1);
  E.tend(s, "water");
  E.tend(s, "soil");
  E.tend(s, "sun");
  assert(E.budget(s).efficiency > b.efficiency);
  E.advance(s, NOW + 60000, false);
  for (const k in s.resources) assert(s.resources[k] >= 0);
});
test("event victory rewards once; failure has temporary production damage", () => {
  const s = funded();
  s.event = { type: "fire", hits: 0, target: 8, left: 30 };
  const old = s.leaves;
  for (let i = 0; i < 8; i++) E.rescue(s);
  assert.equal(s.event, null);
  assert.equal(s.leaves, old + 35);
  assert.equal(s.rescues, 1);
  E.rescue(s);
  assert.equal(s.leaves, old + 35);
  s.event = { type: "pests", hits: 0, target: 8, left: 1 };
  E.advance(s, NOW + 1000, true);
  assert.equal(s.event, null);
  assert.equal(s.damageUntil, s.age + 90);
  E.advance(s, NOW + 92000, false);
  assert(s.damageUntil <= s.age);
});
test("offline emergencies remain paused rather than silently expiring", () => {
  const s = funded();
  s.event = { type: "fire", hits: 3, target: 8, left: 17 };
  E.advance(s, NOW + 3600000, false);
  assert.equal(s.event.left, 17);
  assert.equal(s.damageUntil, 0);
});
test("hybrid rejects invalid parents/cost and guarantees compatible third attempt", () => {
  const s = funded();
  assert.equal(E.cross(s, "ipe", "jacaranda").ok, false);
  s.trees.ipe = s.trees.jacaranda = 1;
  assert.equal(E.cross(s, "ipe", "ipe").ok, false);
  s.hybridAttempts = 2;
  const result = E.cross(s, "ipe", "jacaranda");
  assert.equal(result.discovery, "aurora");
  assert.equal(s.trees.aurora, 1);
  assert(s.discovered.includes("aurora"));
  assert.equal(s.trees.ipe, 1);
  assert.equal(s.resources.water, 45);
  assert.equal(s.leaves, 8820);
});
test("prestige resets expedition, preserves collection and grants permanent skills", () => {
  const s = funded();
  s.trees.ipe = 4;
  assert.equal(E.prestige(E.fresh(NOW), "atlantica", NOW), null);
  const n = E.prestige(s, "atlantica", NOW);
  assert.equal(n.leaves, 0);
  assert.equal(n.trees.ipe, 0);
  assert.equal(n.trees.muda, 1);
  assert.equal(n.meta.seeds, E.prestigeReward(s));
  assert(n.discovered.includes("ipe"));
  assert.equal(n.meta.archives[0].trees, 5);
  assert.equal(E.learn(n, "resilience").ok, false);
  assert(E.learn(n, "growth").ok);
  assert.equal(E.clickRate(n), 3);
  assert(E.learn(n, "resilience").ok);
  n.meta.seeds += 2;
  n.meta.totalSeeds += 2;
  assert(E.learn(n, "biomes").ok);
  n.leaves = n.lifetime = 5000;
  n.clean = 100;
  const next = E.prestige(n, "temperada", NOW);
  assert.equal(next.biome, "temperada");
  assert(next.meta.skills.growth === 1);
  E.validate(next, NOW);
});
test("JSON and transfer-code round trip; hostile/inconsistent imports are rejected", () => {
  const s = funded();
  assert.deepEqual(E.decode(E.encode(s), NOW), s);
  assert.deepEqual(E.decode(JSON.stringify(s), NOW), s);
  assert.throws(() => E.decode("<script>", NOW));
  for (const change of [
    (x) => (x.leaves = -1),
    (x) => (x.resources.water = 999),
    (x) => (x.activeSpecies = "<img>"),
    (x) => (x.meta.skills.growth = 1000),
    (x) => (x.trees.ipe = 1.5),
    (x) => (x.lastSaved = NOW + 1e9),
    (x) => (x.trees.aurora = 1),
    (x) => (x.biome = "temperada"),
  ]) {
    const corrupt = E.clone(s);
    change(corrupt);
    assert.throws(() => E.validate(corrupt, NOW));
  }
});
test("v1 save migration preserves balances and converts legacy upgrades", () => {
  const s = E.migrate(
    {
      leaves: 780,
      lifetime: 1280,
      clicks: 80,
      owned: { agua: 2, adubo: 1, regador: 2, jardineiro: 1 },
    },
    NOW,
  );
  assert.equal(s.leaves, 780);
  assert.equal(s.lifetime, 1280);
  assert.equal(s.upgrades.luvas, 5);
  assert.equal(s.trees.muda, 15);
  assert(s.discovered.includes("ipe"));
  E.validate(s, NOW);
});
test("trimmed history retains per-interval clicks and survives JSON round trip", () => {
  const s = E.fresh(NOW);
  for (let t = 1; t <= 7500; t++) {
    if (t % 30 === 0) E.collect(s);
    E.advance(s, NOW + t * 1000, false);
  }
  assert.equal(s.history.length, 240);
  assert.equal(s.history[0].clickDelta, 1);
  assert.deepEqual(E.decode(E.encode(s), NOW + 7500000), s);
});
