(() => {
  "use strict";

  const FIREBASE_VERSION = "12.16.0";
  const MIN_PLAYERS = 2;
  const MAX_PLAYERS = 3;
  const GUEST_ROLES = ["guest", "guest2"];
  const SEND_INTERVAL = 90;
  const WORLD_SEND_INTERVAL = 100;
  const ROOMS_PATH = "battlezone/rooms";
  const ROOM_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  const MAX_PLAYER_NAME_LENGTH = 16;
  const PLAYER_FORMATION_X = -40;
  const PLAYER_FORMATION_Z = Object.freeze({ host: -12, guest: 0, guest2: 12 });
  const subscribers = new Set();

  let firebase = null;
  let auth = null;
  let database = null;
  let playerRef = null;
  let presenceDisconnect = null;
  let hostDisconnect = null;
  let presenceUnsubscribe = null;
  let roomUnsubscribes = [];
  let lastSendAt = 0;
  let pendingState = null;
  let sendTimer = 0;
  let lastWorldSendAt = 0;
  let pendingWorldState = null;
  let worldSendTimer = 0;

  const session = {
    configured: hasFirebaseConfig(),
    phase: hasFirebaseConfig() ? "idle" : "unconfigured",
    roomCode: "",
    role: "",
    uid: "",
    meta: null,
    players: {},
    world: null,
    error: ""
  };

  function hasFirebaseConfig() {
    const config = window.BATTLEZONE_FIREBASE_CONFIG;
    return Boolean(
      config?.apiKey &&
      config?.authDomain &&
      config?.databaseURL &&
      config?.projectId &&
      config?.appId
    );
  }

  function publicState() {
    return {
      ...session,
      meta: session.meta ? { ...session.meta } : null,
      players: { ...session.players },
      world: session.world ? { ...session.world } : null,
      playerCount: activePlayerCount(),
      minPlayers: MIN_PLAYERS,
      maxPlayers: MAX_PLAYERS,
      connected: Boolean(session.roomCode && session.uid)
    };
  }

  function activePlayerCount() {
    return Object.values(session.players).filter(
      (player) => player?.connected !== false
    ).length;
  }

  function emit() {
    const snapshot = publicState();
    for (const subscriber of subscribers) subscriber(snapshot);
  }

  function setPhase(phase, error = "") {
    session.phase = phase;
    session.error = error;
    emit();
  }

  async function loadFirebase() {
    if (!session.configured) {
      throw new Error("Firebase n'est pas encore configuré.");
    }
    if (firebase) return firebase;

    setPhase("connecting");
    const base = `https://www.gstatic.com/firebasejs/${FIREBASE_VERSION}`;
    const [appModule, authModule, databaseModule] = await Promise.all([
      import(`${base}/firebase-app.js`),
      import(`${base}/firebase-auth.js`),
      import(`${base}/firebase-database.js`)
    ]);

    const app = appModule.initializeApp(window.BATTLEZONE_FIREBASE_CONFIG);
    auth = authModule.getAuth(app);
    database = databaseModule.getDatabase(app);
    firebase = { authModule, databaseModule };

    const credential = await authModule.signInAnonymously(auth);
    session.uid = credential.user.uid;
    setPhase("idle");
    return firebase;
  }

  function normalizeRoomCode(value) {
    return String(value ?? "")
      .toUpperCase()
      .replace(/[^A-Z2-9]/g, "")
      .slice(0, 5);
  }

  function normalizePlayerName(value) {
    const source = String(value ?? "");
    const normalized = typeof source.normalize === "function"
      ? source.normalize("NFKC")
      : source;
    return normalized
      .replace(/[\u0000-\u001f\u007f]/g, "")
      .replace(/\s+/g, " ")
      .trim()
      .slice(0, MAX_PLAYER_NAME_LENGTH)
      .replace(/[\ud800-\udbff]$/, "");
  }

  function normalizePlayerTankId(tankId) {
    return ["scout", "bastion", "support"].includes(tankId)
      ? tankId
      : "scout";
  }

  function makeRoomCode() {
    let result = "";
    const randomValues = new Uint32Array(5);
    crypto.getRandomValues(randomValues);
    for (const value of randomValues) {
      result += ROOM_ALPHABET[value % ROOM_ALPHABET.length];
    }
    return result;
  }

  function makeWorldSeed() {
    const values = new Uint32Array(1);
    crypto.getRandomValues(values);
    return values[0] || 1;
  }

  function makePlayer(role, tankId, playerName) {
    tankId = normalizePlayerTankId(tankId);
    return {
      uid: session.uid,
      role,
      name:
        normalizePlayerName(playerName) ||
        (role === "host" ? "HOTE" : role === "guest2" ? "ALLIE 3" : "ALLIE 2"),
      tankId,
      connected: true,
      joinedAt: Date.now(),
      state: {
        tankId,
        x: PLAYER_FORMATION_X,
        z: PLAYER_FORMATION_Z[role] ?? 0,
        altitude: 0,
        heading: Math.PI / 2,
        turretOffset: 0,
        health: 100,
        missionPhase: "idle",
        sequence: 0,
        updatedAt: Date.now()
      }
    };
  }

  function discardPendingMissionState() {
    pendingState = null;
    pendingWorldState = null;
    if (sendTimer) window.clearTimeout(sendTimer);
    if (worldSendTimer) window.clearTimeout(worldSendTimer);
    sendTimer = 0;
    worldSendTimer = 0;
  }

  async function clearRoomListeners() {
    discardPendingMissionState();
    for (const unsubscribe of roomUnsubscribes) unsubscribe();
    roomUnsubscribes = [];
    if (presenceUnsubscribe) presenceUnsubscribe();
    presenceUnsubscribe = null;
    if (presenceDisconnect) {
      try {
        await presenceDisconnect.cancel();
      } catch {
        // La connexion peut déjà être fermée.
      }
    }
    presenceDisconnect = null;
    if (hostDisconnect) {
      try {
        await hostDisconnect.cancel();
      } catch {
        // La connexion peut déjà être fermée.
      }
    }
    hostDisconnect = null;
    playerRef = null;
  }

  function listenToRoom(roomCode) {
    const {
      ref,
      onValue,
      onDisconnect,
      update,
      serverTimestamp
    } = firebase.databaseModule;
    const roomPath = `${ROOMS_PATH}/${roomCode}`;
    playerRef = ref(database, `${roomPath}/players/${session.role}`);

    roomUnsubscribes.push(
      onValue(ref(database, `${roomPath}/meta`), (snapshot) => {
        session.meta = snapshot.val();
        if (!session.meta) {
          session.error = "Ce salon n'existe plus.";
          session.phase = "error";
        }
        emit();
      })
    );

    roomUnsubscribes.push(
      onValue(ref(database, `${roomPath}/players`), (snapshot) => {
        session.players = snapshot.val() ?? {};
        emit();
      })
    );

    roomUnsubscribes.push(
      onValue(ref(database, `${roomPath}/world`), (snapshot) => {
        session.world = snapshot.val();
        emit();
      })
    );

    presenceUnsubscribe = onValue(
      ref(database, ".info/connected"),
      async (snapshot) => {
        if (snapshot.val() !== true || !playerRef) return;
        const activePlayerRef = playerRef;
        const activeRole = session.role;
        const playerDisconnect = onDisconnect(activePlayerRef);
        await playerDisconnect.remove();
        if (playerRef !== activePlayerRef) {
          await playerDisconnect.cancel();
          return;
        }
        presenceDisconnect = playerDisconnect;
        if (activeRole === "host") {
          const metaDisconnect = onDisconnect(ref(database, `${roomPath}/meta`));
          await metaDisconnect.update({
            status: "closed",
            maxPlayers: MAX_PLAYERS,
            closedAt: serverTimestamp()
          });
          if (playerRef !== activePlayerRef) {
            await metaDisconnect.cancel();
            return;
          }
          hostDisconnect = metaDisconnect;
        }
        await update(activePlayerRef, {
          connected: true,
          lastConnectedAt: Date.now()
        });
      }
    );
  }

  async function enterRoom(roomCode, role) {
    await clearRoomListeners();
    session.roomCode = roomCode;
    session.role = role;
    session.phase = "lobby";
    session.error = "";
    listenToRoom(roomCode);
    emit();
  }

  async function createRoom(tankId = "scout", playerName = "") {
    await loadFirebase();
    const { ref, runTransaction } = firebase.databaseModule;
    setPhase("creating");

    for (let attempt = 0; attempt < 8; attempt += 1) {
      const roomCode = makeRoomCode();
      const roomRef = ref(database, `${ROOMS_PATH}/${roomCode}`);
      const room = {
        meta: {
          hostId: session.uid,
          status: "lobby",
          maxPlayers: MAX_PLAYERS,
          version: 2,
          worldSeed: makeWorldSeed(),
          createdAt: Date.now()
        },
        players: {
          host: makePlayer("host", tankId, playerName)
        }
      };
      const result = await runTransaction(
        roomRef,
        (current) => current === null ? room : undefined,
        { applyLocally: false }
      );
      if (result.committed) {
        await enterRoom(roomCode, "host");
        return publicState();
      }
    }

    throw new Error("Impossible de réserver un code de salon. Réessayez.");
  }

  async function joinRoom(rawCode, tankId = "scout", playerName = "") {
    const roomCode = normalizeRoomCode(rawCode);
    if (roomCode.length !== 5) {
      throw new Error("Le code du salon doit contenir 5 caractères.");
    }

    await loadFirebase();
    const { ref, get, remove, runTransaction } = firebase.databaseModule;
    setPhase("joining");
    const roomRef = ref(database, `${ROOMS_PATH}/${roomCode}`);
    const snapshot = await get(roomRef);
    const room = snapshot.val();

    if (!room?.meta) throw new Error("Salon introuvable.");
    if (room.meta.status !== "lobby") {
      throw new Error("La mission de ce salon a déjà commencé.");
    }
    if (room.meta.version !== 2) {
      throw new Error("Ce salon utilise une autre version de Battlezone.");
    }
    const existingRole = GUEST_ROLES.find(
      (role) => room.players?.[role]?.uid === session.uid
    );
    const candidates = existingRole
      ? [existingRole, ...GUEST_ROLES.filter((role) => role !== existingRole)]
      : GUEST_ROLES;
    let joinedRole = "";
    for (const role of candidates) {
      const nextPlayer = makePlayer(role, tankId, playerName);
      const slotRef = ref(database, `${ROOMS_PATH}/${roomCode}/players/${role}`);
      const result = await runTransaction(
        slotRef,
        (current) =>
          current == null || current.uid === session.uid
            ? nextPlayer
            : undefined,
        { applyLocally: false }
      );
      if (result.committed) {
        joinedRole = role;
        break;
      }
    }
    if (!joinedRole) throw new Error("Ce salon est déjà complet.");

    const latestMeta = (
      await get(ref(database, `${ROOMS_PATH}/${roomCode}/meta`))
    ).val();
    if (latestMeta?.status !== "lobby") {
      await remove(ref(database, `${ROOMS_PATH}/${roomCode}/players/${joinedRole}`));
      throw new Error("La mission de ce salon a déjà commencé.");
    }

    await enterRoom(roomCode, joinedRole);
    return publicState();
  }

  async function startMission() {
    if (session.role !== "host" || !session.roomCode) {
      throw new Error("Seul l'hôte peut lancer la mission.");
    }
    if (activePlayerCount() < MIN_PLAYERS) {
      throw new Error("En attente du deuxième joueur.");
    }
    if (session.meta?.status !== "lobby") {
      throw new Error("La mission ne peut pas encore être relancée.");
    }
    const { ref, update, serverTimestamp } = firebase.databaseModule;
    discardPendingMissionState();
    await update(ref(database, `${ROOMS_PATH}/${session.roomCode}`), {
      "meta/status": "playing",
      "meta/maxPlayers": MAX_PLAYERS,
      "meta/worldSeed": makeWorldSeed(),
      "meta/startedAt": serverTimestamp(),
      "meta/defeatedPlayerRole": null,
      "meta/failureReason": null,
      world: null
    });
  }

  async function returnToLobby(finalWorld = null) {
    discardPendingMissionState();
    if (
      session.role !== "host" ||
      !session.roomCode ||
      session.meta?.status === "lobby"
    ) return;
    const { ref, update, serverTimestamp } = firebase.databaseModule;
    const finalDefeatedPlayerRole = String(
      finalWorld?.defeatedPlayerRole ?? ""
    ).slice(0, 16);
    const finalFailureReason = String(finalWorld?.failureReason ?? "").slice(0, 80);
    const updates = {
      "meta/status": "lobby",
      "meta/maxPlayers": MAX_PLAYERS,
      "meta/endedAt": serverTimestamp(),
      "meta/defeatedPlayerRole": finalDefeatedPlayerRole || null,
      "meta/failureReason": finalFailureReason || null,
      world: finalWorld && typeof finalWorld === "object" ? finalWorld : null
    };
    await update(ref(database, `${ROOMS_PATH}/${session.roomCode}`), updates);
  }

  async function setTank(tankId) {
    if (!playerRef || !firebase) return;
    tankId = normalizePlayerTankId(tankId);
    const { update } = firebase.databaseModule;
    await update(playerRef, {
      tankId,
      "state/tankId": tankId
    });
  }

  async function flushPlayerState() {
    sendTimer = 0;
    if (
      !pendingState ||
      !playerRef ||
      !firebase ||
      session.meta?.status !== "playing"
    ) {
      pendingState = null;
      return;
    }
    const nextState = pendingState;
    pendingState = null;
    lastSendAt = performance.now();
    const { update } = firebase.databaseModule;
    try {
      await update(playerRef, { state: nextState });
    } catch (error) {
      session.error = readableError(error);
      emit();
    }
  }

  function sendPlayerState(state) {
    if (!playerRef || session.meta?.status !== "playing") return;
    pendingState = {
      tankId: normalizePlayerTankId(state.tankId),
      x: Number(state.x.toFixed(3)),
      z: Number(state.z.toFixed(3)),
      altitude: Number(state.altitude.toFixed(3)),
      heading: Number(state.heading.toFixed(4)),
      turretOffset: Number(state.turretOffset.toFixed(4)),
      health: Math.max(0, Math.min(100, Math.round(state.health))),
      missionPhase: state.missionPhase,
      sequence: state.sequence,
      shotSequence: state.shotSequence,
      shotX: Number(state.shotX.toFixed(3)),
      shotZ: Number(state.shotZ.toFixed(3)),
      shotYaw: Number(state.shotYaw.toFixed(4)),
      shotTankId: normalizePlayerTankId(state.shotTankId),
      turretDeploySequence: Math.max(
        0,
        Math.floor(Number(state.turretDeploySequence) || 0)
      ),
      turretDeployX: Number(state.turretDeployX.toFixed(3)),
      turretDeployZ: Number(state.turretDeployZ.toFixed(3)),
      turretDeployHeading: Number(state.turretDeployHeading.toFixed(4)),
      armorDropSequence: Math.max(
        0,
        Math.floor(Number(state.armorDropSequence) || 0)
      ),
      armorDropX: Number(state.armorDropX.toFixed(3)),
      armorDropZ: Number(state.armorDropZ.toFixed(3)),
      orbitalSequence: Math.max(
        0,
        Math.floor(Number(state.orbitalSequence) || 0)
      ),
      orbitalX: Number(state.orbitalX.toFixed(3)),
      orbitalZ: Number(state.orbitalZ.toFixed(3)),
      orbitalYaw: Number(state.orbitalYaw.toFixed(4)),
      supportDeployTimer: Math.max(
        0,
        Number((state.supportDeployTimer || 0).toFixed(3))
      ),
      scoutTurboTimer: Math.max(
        0,
        Number((state.scoutTurboTimer || 0).toFixed(3))
      ),
      pulseSequence: state.pulseSequence,
      pulseX: Number(state.pulseX.toFixed(3)),
      pulseZ: Number(state.pulseZ.toFixed(3)),
      upgradeRound: Math.max(0, Math.floor(Number(state.upgradeRound) || 0)),
      upgradeChoice: ["speed", "armor", "range"].includes(state.upgradeChoice)
        ? state.upgradeChoice
        : "",
      upgradeSpeed: Math.max(0, Math.floor(Number(state.upgradeSpeed) || 0)),
      upgradeArmor: Math.max(0, Math.floor(Number(state.upgradeArmor) || 0)),
      upgradeRange: Math.max(0, Math.floor(Number(state.upgradeRange) || 0)),
      updatedAt: Date.now()
    };

    const wait = Math.max(0, SEND_INTERVAL - (performance.now() - lastSendAt));
    if (!sendTimer) sendTimer = window.setTimeout(flushPlayerState, wait);
  }

  async function flushWorldState() {
    worldSendTimer = 0;
    if (
      !pendingWorldState ||
      !firebase ||
      !session.roomCode ||
      session.role !== "host" ||
      session.meta?.status !== "playing"
    ) {
      pendingWorldState = null;
      return;
    }
    const nextWorld = pendingWorldState;
    pendingWorldState = null;
    lastWorldSendAt = performance.now();
    const { ref, set } = firebase.databaseModule;
    try {
      await set(ref(database, `${ROOMS_PATH}/${session.roomCode}/world`), nextWorld);
    } catch (error) {
      session.error = readableError(error);
      emit();
    }
  }

  function sendWorldState(world) {
    if (
      session.role !== "host" ||
      !session.roomCode ||
      session.meta?.status !== "playing"
    ) return;
    pendingWorldState = world;
    const wait = Math.max(
      0,
      WORLD_SEND_INTERVAL - (performance.now() - lastWorldSendAt)
    );
    if (!worldSendTimer) {
      worldSendTimer = window.setTimeout(flushWorldState, wait);
    }
  }

  async function leaveRoom() {
    if (!firebase || !session.roomCode || !session.uid) return;
    const { ref, remove, update } = firebase.databaseModule;
    const leavingCode = session.roomCode;
    const leavingRole = session.role;
    await clearRoomListeners();
    await remove(ref(database, `${ROOMS_PATH}/${leavingCode}/players/${leavingRole}`));
    if (leavingRole === "host") {
      await update(ref(database, `${ROOMS_PATH}/${leavingCode}/meta`), {
        status: "closed",
        maxPlayers: MAX_PLAYERS,
        closedAt: Date.now()
      });
    }
    session.roomCode = "";
    session.role = "";
    session.meta = null;
    session.players = {};
    session.world = null;
    session.phase = "idle";
    session.error = "";
    emit();
  }

  function readableError(error) {
    const code = String(error?.code ?? "");
    if (code.includes("permission-denied")) {
      return "Accès refusé par les règles Firebase. Vérifiez firebase.rules.json.";
    }
    if (code.includes("network-request-failed")) {
      return "Connexion à Firebase impossible.";
    }
    return error?.message || "Erreur réseau inconnue.";
  }

  function subscribe(callback) {
    subscribers.add(callback);
    callback(publicState());
    return () => subscribers.delete(callback);
  }

  window.BattlezoneNetwork = {
    createRoom: async (...args) => {
      try {
        return await createRoom(...args);
      } catch (error) {
        setPhase("error", readableError(error));
        throw error;
      }
    },
    joinRoom: async (...args) => {
      try {
        return await joinRoom(...args);
      } catch (error) {
        setPhase("error", readableError(error));
        throw error;
      }
    },
    startMission,
    returnToLobby,
    setTank,
    sendPlayerState,
    sendWorldState,
    leaveRoom,
    subscribe,
    getState: publicState,
    normalizeRoomCode,
    normalizePlayerName
  };
})();
