const test = require("node:test");
const assert = require("node:assert/strict");
const E = require("../engine.js");

for (const [type, id, key] of [["tree", "muda", "trees"], ["upgrade", "cisterna", "upgrades"]]) {
  for (const quantity of E.PURCHASE_QUANTITIES) {
    test(`${type}: ${quantity} units match consecutive single purchases`, () => {
      const state = E.fresh();
      state[key][id] = 3;
      state.leaves = state.lifetime = 1e15;
      const singles = E.clone(state);
      let price = 0;
      for (let i = 0; i < quantity; i++) {
        price += E.cost(singles, type, id);
        assert.ok(E.buy(singles, type, id).ok);
      }
      assert.equal(E.cost(state, type, id, quantity), price);
      assert.ok(E.buy(state, type, id, quantity).ok);
      assert.equal(state[key][id], 3 + quantity);
      assert.deepEqual(state, singles);
    });
  }
}

test("insufficient funds, undiscovered species and invalid quantities preserve the entire state", () => {
  const state = E.fresh();
  const price = E.cost(state, "tree", "muda", 10);
  state.leaves = price - 0.25;
  const before = E.clone(state);
  for (const [type, id, n] of [
    ["tree", "muda", 10], ["tree", "ipe", 1], ["upgrade", "luz", 0],
    ["upgrade", "luz", -1], ["upgrade", "luz", 2.5], ["bad", "luvas", 1]
  ]) {
    assert.equal(E.buy(state, type, id, n).ok, false);
    assert.deepEqual(state, before);
  }
  state.leaves = price;
  assert.ok(E.buy(state, "tree", "muda", 10).ok);
  assert.equal(state.leaves, 0);
});

test("a batch may fill the last slot and cannot cross the inventory limit", () => {
  const state = E.fresh();
  state.leaves = state.lifetime = 1e15;
  state.trees.muda = 91;
  const before = E.clone(state);
  assert.equal(E.buy(state, "tree", "muda", 10).ok, false);
  assert.deepEqual(state, before);
  state.trees.muda = 90;
  assert.ok(E.buy(state, "tree", "muda", 10).ok);
  assert.equal(state.trees.muda, 100);
  assert.equal(E.buy(state, "tree", "muda").ok, false);
});
