const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const { test } = require("node:test");

const workspace = path.join(__dirname, "..");
const read = (file) => fs.readFileSync(path.join(workspace, file), "utf8");
const rules = JSON.parse(read("firebase.rules.json")).rules;

// Evaluate the shipped validation expressions locally. This does not replace
// testing deployed rules or the Firebase emulator's complete access semantics.
class Snapshot {
  constructor(value) { this.value = value; }
  val() { return this.value ?? null; }
  exists() { return this.value !== null && this.value !== undefined; }
  child(key) {
    return new Snapshot(key.split("/").reduce((value, part) => value?.[part], this.value));
  }
  hasChildren(keys) { return keys.every((key) => this.child(key).exists()); }
  isString() { return typeof this.value === "string"; }
  isNumber() { return typeof this.value === "number" && Number.isFinite(this.value); }
  isBoolean() { return typeof this.value === "boolean"; }
}

function evaluate(expression, { uid, next, previous = null, root = {} }) {
  try {
    return new Function("auth", "newData", "data", "root", "$roomCode",
      `return (${expression});`)(
        uid ? { uid } : null,
        new Snapshot(next), new Snapshot(previous), new Snapshot(root), "ABCDE"
      );
  } catch (error) {
    // Dereferencing auth.uid without authentication fails closed in Firebase.
    if (!uid && error instanceof TypeError) return false;
    throw error;
  }
}

function loadNetwork() {
  const context = vm.createContext({ window: {}, performance, console });
  vm.runInContext(read("config.js"), context);
  const source = read("multiplayer.js");
  assert.match(source, /\}\)\(\);\s*$/);
  vm.runInContext(source.replace(/\}\)\(\);\s*$/, `
    window.testNetwork = {
      makePlayer, readableError, listenToRoom, session,
      setFirebase: (value) => { firebase = value; }
    };
  })();`), context);
  const api = context.window.testNetwork;
  api.session.uid = "pilot";
  return { context, api, tanks: Object.keys(context.window.BattlezoneConfig.PLAYER_TANKS) };
}

test("all playable chassis pass the three slot validations, including lobby tank changes", () => {
  const { api, tanks } = loadNetwork();
  for (const role of ["host", "guest", "guest2"]) {
    const rule = rules.battlezone.rooms.$roomCode.players[role][".validate"];
    for (const tankId of tanks) {
      const record = api.makePlayer(role, tankId, "Pilote");
      assert.equal(record.tankId, tankId);
      assert.equal(record.state.tankId, tankId);
      assert.equal(evaluate(rule, { uid: "pilot", next: record }), true, `${role}/${tankId}`);
      const previous = api.makePlayer(role, "scout", "Pilote");
      assert.equal(evaluate(rule, { uid: "pilot", previous, next: record }), true);
    }
    const bomber = api.makePlayer(role, "bombardier", "Pilote");
    for (const field of ["tankId", "state/tankId"]) {
      const invalid = JSON.parse(JSON.stringify(bomber));
      if (field === "tankId") invalid.tankId = "unknown";
      else invalid.state.tankId = "unknown";
      assert.equal(evaluate(rule, { uid: "pilot", next: invalid }), false, `${role}/${field}`);
    }
    assert.equal(evaluate(rule, { uid: "someone-else", next: bomber }), false);
    assert.equal(evaluate(rule, { uid: null, next: bomber }), false);
    for (const changes of [{ x: 93 }, { health: 101 }, { altitude: -1 }, { missionPhase: "invalid" }]) {
      const invalid = JSON.parse(JSON.stringify(bomber));
      Object.assign(invalid.state, changes);
      assert.equal(evaluate(rule, { uid: "pilot", next: invalid }), false);
    }
  }
});

test("room creation still requires an authenticated matching host", () => {
  const { api } = loadNetwork();
  const room = {
    meta: { hostId: "pilot", status: "lobby", maxPlayers: 3, version: 9, missionId: 0, worldSeed: 1 },
    players: { host: api.makePlayer("host", "bombardier", "Pilote") }
  };
  const rule = rules.battlezone.rooms.$roomCode;
  assert.equal(evaluate(rule[".write"], { uid: "pilot", next: room }), true);
  assert.equal(evaluate(rule[".validate"], { uid: "pilot", next: room }), true);
  assert.equal(evaluate(rule.meta[".validate"], { uid: "pilot", next: room.meta }), true);
  assert.equal(evaluate(rule[".write"], { uid: "intruder", next: room }), false);
  assert.equal(evaluate(rule[".write"], { uid: null, next: room }), false);
  assert.equal(evaluate(rule[".validate"], { uid: "pilot", next: { meta: room.meta } }), false);
});

test("disconnecting the last player can leave the existing room empty", () => {
  const { api } = loadNetwork();
  const rule = rules.battlezone.rooms.$roomCode;
  for (const role of ["host", "guest", "guest2"]) {
    const record = api.makePlayer(role, "bombardier", "Pilote");
    const previous = {
      meta: { hostId: "pilot", status: "lobby" },
      players: { [role]: record }
    };
    const next = { meta: previous.meta };
    const root = { battlezone: { rooms: { ABCDE: previous } } };
    assert.equal(evaluate(rule.players[role][".write"], {
      uid: "pilot", previous: record, next: null, root
    }), true);
    assert.equal(evaluate(rule[".validate"], { uid: "pilot", previous, next }), true);
    assert.equal(evaluate(rule.players[role][".write"], {
      uid: "intruder", previous: record, next: null, root
    }), false);
  }
});

test("the owner alone can update a player slot and guests cannot write the world", () => {
  const { api } = loadNetwork();
  const roomRule = rules.battlezone.rooms.$roomCode;
  for (const role of ["host", "guest", "guest2"]) {
    const record = api.makePlayer(role, "bombardier", "Pilote");
    const root = { battlezone: { rooms: { ABCDE: { meta: { hostId: "pilot" } } } } };
    const expression = roomRule.players[role][".write"];
    assert.equal(evaluate(expression, { uid: "pilot", previous: record, next: record, root }), true);
    assert.equal(evaluate(expression, { uid: "intruder", previous: record, next: record, root }), false);
    assert.equal(evaluate(expression, { uid: null, previous: record, next: record, root }), false);
    assert.equal(evaluate(roomRule.world[".write"], { uid: "guest-pilot", root }), false);
  }
});

function presenceHarness(failureStage) {
  const { api } = loadNetwork();
  const listeners = [];
  const denied = () => {
    throw Object.assign(new Error("PERMISSION_DENIED: Permission denied"), { code: "PERMISSION_DENIED" });
  };
  api.setFirebase({ databaseModule: {
    ref: (_, location) => ({ location }),
    onValue: (ref, next, error) => { listeners.push({ location: ref.location, next, error }); return () => {}; },
    onDisconnect: () => ({
      remove: async () => { if (failureStage === "remove") denied(); },
      update: async () => { if (failureStage === "host-disconnect") denied(); },
      cancel: async () => {}
    }),
    update: async () => { if (failureStage === "presence-update") denied(); },
    serverTimestamp: () => 1
  } });
  api.session.role = "host";
  api.listenToRoom("ABCDE");
  return { api, listeners };
}

for (const stage of ["remove", "host-disconnect", "presence-update"]) {
  test(`presence failure at ${stage} is handled and shown in the session`, async () => {
    const { api, listeners } = presenceHarness(stage);
    const presence = listeners.find((listener) => listener.location === ".info/connected");
    await assert.doesNotReject(() => presence.next(new Snapshot(true)));
    assert.equal(api.session.phase, "error");
    assert.match(api.session.error, /Publiez les règles/);
  });
}

test("all room listeners report cancelled reads; stale room errors are ignored", () => {
  const { api, listeners } = presenceHarness();
  for (const listener of listeners) {
    assert.equal(typeof listener.error, "function");
    listener.error(new Error("PERMISSION_DENIED: Permission denied"));
    assert.match(api.session.error, /Publiez les règles/);
    api.session.error = "";
  }
  api.listenToRoom("FGHJK");
  listeners[0].error(new Error("PERMISSION_DENIED"));
  assert.equal(api.session.error, "");
});

test("permission errors are recognized with all SDK code spellings", () => {
  const { api } = loadNetwork();
  for (const error of [
    { code: "PERMISSION_DENIED" },
    { code: "database/permission-denied" },
    new Error("PERMISSION_DENIED: Permission denied")
  ]) assert.match(api.readableError(error), /Publiez les règles/);
});

test("a Firebase error stays visible even after a room is connected", () => {
  const elements = new Map();
  const getElement = (selector) => {
    if (!elements.has(selector)) {
      const classes = new Set();
      elements.set(selector, {
        value: "Pilote", textContent: "", disabled: false,
        classList: {
          toggle: (name, enabled) => enabled ? classes.add(name) : classes.delete(name),
          contains: (name) => classes.has(name)
        }
      });
    }
    return elements.get(selector);
  };
  const context = vm.createContext({ window: {}, document: {
    querySelector: getElement, querySelectorAll: () => []
  } });
  vm.runInContext(read("ui.js"), context);
  context.window.BattlezoneUi.renderLobby({
    playMode: "host", maxCoopPlayers: 3,
    normalizePlayerName: (name) => name, getDefaultPlayerName: () => "Pilote",
    snapshot: {
      connected: true, configured: true, role: "host", playerCount: 2,
      players: {}, meta: { status: "lobby" }, error: "Accès refusé par Firebase."
    }
  });
  assert.equal(getElement("#network-status").textContent, "Accès refusé par Firebase.");
  assert.equal(getElement("#network-status").classList.contains("error"), true);
  assert.equal(getElement("#start-button").disabled, true);
});
