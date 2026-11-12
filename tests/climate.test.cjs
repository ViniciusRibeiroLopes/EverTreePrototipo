const test = require("node:test");
const assert = require("node:assert/strict");
const E = require("../engine.js");
const start = 1793988000000;

test("climate slots change actual production and resource replenishment", () => {
  const s = E.fresh(start);
  s.clean = 100;
  for (const [slot, kind, income, yieldFactor] of [
    [0, "chuva", [2.2, 1.1, .6], 1.25],
    [1, "seca", [.2, .75, 1.5], .6],
    [2, "migracao", [1, 1.5, 1], 1.15],
    [5, "sol", [1, 1, 1.2], 1],
    [6, "tempestade", [2.8, 1, .45], .9],
    [7, "mutirao", [1, 1, 1], 1.55],
  ]) {
    s.age = slot * 60 + 59;
    const c = E.climate(s);
    const b = E.budget(s);
    assert.equal(c.weather, kind);
    assert.equal(c.remaining, 1);
    assert.equal(b.rate, E.SPECIES[0].rate * yieldFactor);
    assert.deepEqual(b.income, E.BIOMES[0].income.map((base, i) => base * income[i]));
  }
  s.clean = 0;
  for (const slot of [2, 7]) {
    s.age = slot * 60;
    assert.equal(E.climate(s).weather, "sol");
  }
});

test("offline replay crosses ecological events and matches uninterrupted production", () => {
  const live = E.fresh(start);
  live.clean = 100;
  live.nextEvent = 3000;
  const away = E.clone(live);
  for (let t = 1; t <= 500; t++) E.advance(live, start + t * 1000, true);
  E.advance(away, start + 500000, false);
  assert.equal(away.leaves, live.leaves);
  assert.deepEqual(away.resources, live.resources);
  assert.deepEqual(away.history, live.history);
});
