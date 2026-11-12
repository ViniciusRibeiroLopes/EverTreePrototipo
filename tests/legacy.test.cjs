const test = require("node:test");
const assert = require("node:assert/strict");
const E = require("../engine.js");

const now = Date.UTC(2026, 10, 12);
function endowed() {
  const state = E.fresh(now);
  state.meta.seeds = state.meta.totalSeeds = 1000;
  return state;
}

test("existing v2 expeditions keep their learned skills and initialize new branches", () => {
  const old = endowed();
  old.meta.skills = { growth: 2, resilience: 1, biomes: 1 };
  old.biome = "temperada";
  const restored = E.decode(JSON.stringify(old), now);
  assert.deepEqual(restored.meta.skills, { ...E.fresh(now).meta.skills, ...old.meta.skills });
  assert.equal(restored.biome, "temperada");
  restored.meta.skills.machinery = 1;
  assert.throws(() => E.validate(restored, now));
});

test("each branch enforces prerequisites, scaled prices, level caps, and an atomic debit", () => {
  for (const skill of E.SKILLS) {
    const state = endowed();
    if (skill.requires) {
      const before = E.clone(state.meta);
      assert.equal(E.learn(state, skill.id).ok, false);
      assert.deepEqual(state.meta, before);
      state.meta.skills[skill.requires] = 1;
    }
    for (let level = 0; level < skill.max; level++) {
      const balance = state.meta.seeds;
      const cost = skill.base * (level + 1);
      assert.equal(E.skillCost(state, skill.id), cost);
      assert(E.learn(state, skill.id).ok);
      assert.equal(state.meta.seeds, balance - cost);
      assert.equal(state.meta.skills[skill.id], level + 1);
    }
    const maxed = E.clone(state.meta);
    assert.equal(E.learn(state, skill.id).ok, false);
    assert.deepEqual(state.meta, maxed);
  }
  assert.equal(E.learn(E.fresh(now), "growth").ok, false);
});

test("production, restoration, manual harvest and donation bonuses follow the purchased levels", () => {
  const state = endowed();
  const initialRate = E.budget(state).rate;
  assert(E.learn(state, "harvest").ok);
  assert.equal(E.budget(state).rate, initialRate + 0.5);
  assert(E.learn(state, "machinery").ok);
  assert.equal(E.budget(state).rate, initialRate + 1);
  const offline = E.clone(state);
  const plain = E.fresh(now);
  E.advance(offline, now + 10000);
  E.advance(plain, now + 10000);
  assert(Math.abs(offline.leaves - plain.leaves - 10) < 1e-8);
  state.clean = 10;
  const recovered = E.recovery(state);
  assert(E.learn(state, "restoration").ok);
  assert.equal(E.recovery(state), recovered * 1.2);
  state.trees.ipe = 1;
  const diverseRate = E.budget(state).rate - 1;
  assert(E.learn(state, "diversity").ok);
  assert(Math.abs(E.budget(state).rate - (diverseRate * 1.1 + 1)) < 1e-8);
  state.lifetime = 5000;
  state.clean = 100;
  const reward = E.prestigeReward(state);
  const click = E.clickRate(state);
  assert(E.learn(state, "heritage").ok);
  assert(E.learn(state, "practice").ok);
  assert.equal(E.clickRate(state), click * 1.25);
  const next = E.prestige(state, "atlantica", now);
  assert.equal(next.meta.seeds, state.meta.seeds + reward + 1);
  assert.deepEqual(next.meta.skills, state.meta.skills);
  assert.deepEqual(E.decode(E.encode(next), now), next);
});
