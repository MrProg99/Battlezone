(() => {
  "use strict";

  const FIREBASE_VERSION = "12.16.0";
  const MAX_PLAYERS = 2;
  const SEND_INTERVAL = 90;
  const WORLD_SEND_INTERVAL = 100;
  const ROOMS_PATH = "battlezone/rooms";
  const ROOM_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
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
      playerCount: Object.keys(session.players).length,
      connected: Boolean(session.roomCode && session.uid)
    };
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

  function makePlayer(role, tankId) {
    return {
      uid: session.uid,
      role,
      tankId,
      connected: true,
      joinedAt: Date.now(),
      state: {
        tankId,
        x: role === "host" ? -2.2 : 2.2,
        z: 4,
        altitude: 0,
        heading: 0,
        turretOffset: 0,
        health: 100,
        missionPhase: "idle",
        sequence: 0,
        updatedAt: Date.now()
      }
    };
  }

  async function clearRoomListeners() {
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

  async function createRoom(tankId = "scout") {
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
          host: makePlayer("host", tankId)
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

  async function joinRoom(rawCode, tankId = "scout") {
    const roomCode = normalizeRoomCode(rawCode);
    if (roomCode.length !== 5) {
      throw new Error("Le code du salon doit contenir 5 caractères.");
    }

    await loadFirebase();
    const { ref, get, set } = firebase.databaseModule;
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
    const existingGuest = room.players?.guest;
    if (existingGuest?.uid && existingGuest.uid !== session.uid) {
      throw new Error("Ce salon est déjà complet.");
    }

    await set(
      ref(database, `${ROOMS_PATH}/${roomCode}/players/guest`),
      makePlayer("guest", tankId)
    );
    await enterRoom(roomCode, "guest");
    return publicState();
  }

  async function startMission() {
    if (session.role !== "host" || !session.roomCode) {
      throw new Error("Seul l'hôte peut lancer la mission.");
    }
    if (Object.keys(session.players).length < MAX_PLAYERS) {
      throw new Error("En attente du deuxième joueur.");
    }
    const { ref, update, serverTimestamp } = firebase.databaseModule;
    await update(ref(database, `${ROOMS_PATH}/${session.roomCode}/meta`), {
      status: "playing",
      startedAt: serverTimestamp()
    });
  }

  async function setTank(tankId) {
    if (!playerRef || !firebase) return;
    const { update } = firebase.databaseModule;
    await update(playerRef, {
      tankId,
      "state/tankId": tankId
    });
  }

  async function flushPlayerState() {
    sendTimer = 0;
    if (!pendingState || !playerRef || !firebase) return;
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
      tankId: state.tankId === "bastion" ? "bastion" : "scout",
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
      shotTankId: state.shotTankId === "bastion" ? "bastion" : "scout",
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
      session.role !== "host"
    ) return;
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
    setTank,
    sendPlayerState,
    sendWorldState,
    leaveRoom,
    subscribe,
    getState: publicState,
    normalizeRoomCode
  };
})();
