(() => {
  "use strict";

  const canvas = document.querySelector("#game");
  const ctx = canvas.getContext("2d");
  const startScreen = document.querySelector("#start-screen");
  const startButton = document.querySelector("#start-button");
  const messagePanel = document.querySelector("#message-panel");
  const messageKicker = document.querySelector("#message-kicker");
  const messageTitle = document.querySelector("#message-title");
  const messageCopy = document.querySelector("#message-copy");
  const restartButton = document.querySelector("#restart-button");
  const pauseLabel = document.querySelector("#pause-label");
  const tankCards = [...document.querySelectorAll(".tank-card")];
  const modeButtons = [...document.querySelectorAll(".mode-button")];
  const onlinePanel = document.querySelector("#online-panel");
  const joinFields = document.querySelector("#join-fields");
  const roomCodeInput = document.querySelector("#room-code-input");
  const roomReadout = document.querySelector("#room-readout");
  const roomCodeLabel = document.querySelector("#room-code");
  const roomPlayerCount = document.querySelector("#room-player-count");
  const networkStatus = document.querySelector("#network-status");
  const onlineActionButton = document.querySelector("#online-action-button");
  const leaveRoomButton = document.querySelector("#leave-room-button");
  const startButtonLabel = document.querySelector("#start-button-label");
  const startButtonHelp = document.querySelector("#start-button-help");
  const network = window.BattlezoneNetwork;

  const TAU = Math.PI * 2;
  const NEAR = 0.22;
  const WORLD_LIMIT = 76;
  const GRID_STEP = 6;
  const COLORS = {
    green: "#78ff9a",
    soft: "#2ea95c",
    dim: "#155e31",
    faint: "rgba(62, 186, 95, 0.18)",
    amber: "#ffd36a",
    red: "#ff695e",
    cyan: "#68d8ff",
    white: "#dcffe4",
    black: "#020504"
  };
  const ENEMY_STATE = Object.freeze({
    APPROACH: "approach",
    ENGAGE: "engage",
    RETREAT: "retreat",
    REPOSITION: "reposition"
  });
  const ENEMY_AI = Object.freeze({
    DECISION_MIN: 0.35,
    DECISION_MAX: 0.85,
    EMERGENCY_RANGE: 10,
    APPROACH_MARGIN: 6,
    RETREAT_MARGIN: 5,
    CHASSIS_TURN_RATE: 1.05
  });
  const GUARDIAN_SHIELD_RADIUS = 16;
  const GUARDIAN_SHIELD_RECHARGE = 3.2;
  const KAMIKAZE_TRIGGER_RADIUS = 3.2;
  const KAMIKAZE_BLAST_RADIUS = 7;
  const KAMIKAZE_BLAST_DAMAGE = 52;
  const KAMIKAZE_FUSE_TIME = 0.8;
  const DRONE_FLIGHT_STATE = Object.freeze({
    CRUISING: "cruising",
    DIVING: "diving",
    STRAFING: "strafing",
    CLIMBING: "climbing"
  });
  const DRONE_CRUISE_ALTITUDE = 5.2;
  const DRONE_VERTICAL_SPEED = 3.35;
  const DRONE_ATTACK_ALTITUDE = 0.95;
  const DRONE_STRAFE_TIME = 1.15;
  const MOON_WORLD_AZIMUTH = 0.48;
  const ENEMY_TYPES = Object.freeze({
    assault: Object.freeze({
      id: "assault",
      label: "ASSAUT",
      code: "T",
      health: 2,
      speed: 2.1,
      speedVariance: 0.7,
      preferredRangeMin: 20,
      preferredRangeMax: 28,
      scale: 1,
      hitRadius: 1,
      turretTurnRate: 1.7,
      fireRange: 48,
      fireAlignment: 0.14,
      reloadBase: 2.8,
      reloadMin: 1.25,
      reloadJitter: 1.4,
      shellSpeed: 21,
      shellLifetime: 3.2,
      score: 100,
      static: false,
      priority: false
    }),
    light: Object.freeze({
      id: "light",
      label: "CHASSEUR",
      code: "L",
      health: 1,
      speed: 3.8,
      speedVariance: 0.8,
      preferredRangeMin: 13,
      preferredRangeMax: 19,
      scale: 0.72,
      hitRadius: 0.78,
      turretTurnRate: 2.35,
      fireRange: 34,
      fireAlignment: 0.18,
      reloadBase: 2.15,
      reloadMin: 1.05,
      reloadJitter: 1,
      shellSpeed: 19,
      shellLifetime: 2.3,
      score: 140,
      static: false,
      priority: false
    }),
    guardian: Object.freeze({
      id: "guardian",
      label: "GARDIEN",
      code: "G",
      health: 2,
      speed: 1.75,
      speedVariance: 0.35,
      preferredRangeMin: 9,
      preferredRangeMax: 11,
      scale: 1.05,
      hitRadius: 1.08,
      turretTurnRate: 1.35,
      fireRange: 0,
      fireAlignment: 0.2,
      reloadBase: 99,
      reloadMin: 99,
      reloadJitter: 0,
      shellSpeed: 0,
      shellLifetime: 0,
      score: 260,
      static: false,
      priority: true,
      support: true
    }),
    ghost: Object.freeze({
      id: "ghost",
      label: "FANTÔME",
      code: "F",
      health: 1,
      speed: 3.15,
      speedVariance: 0.55,
      preferredRangeMin: 25,
      preferredRangeMax: 34,
      scale: 0.82,
      hitRadius: 0.86,
      turretTurnRate: 2.15,
      fireRange: 54,
      fireAlignment: 0.13,
      reloadBase: 3.65,
      reloadMin: 2.55,
      reloadJitter: 1.25,
      shellSpeed: 20,
      shellLifetime: 3.1,
      score: 220,
      static: false,
      priority: false,
      stealth: true
    }),
    kamikaze: Object.freeze({
      id: "kamikaze",
      label: "KAMIKAZE",
      code: "K",
      health: 1,
      speed: 5.25,
      speedVariance: 0.55,
      preferredRangeMin: 0,
      preferredRangeMax: 0,
      scale: 0.74,
      hitRadius: 0.8,
      chassisTurnRate: 1.9,
      turretTurnRate: 0,
      fireRange: 0,
      fireAlignment: 0,
      reloadBase: 99,
      reloadMin: 99,
      reloadJitter: 0,
      shellSpeed: 0,
      shellLifetime: 0,
      score: 190,
      static: false,
      priority: false,
      support: true,
      kamikaze: true
    }),
    drone: Object.freeze({
      id: "drone",
      label: "DRONE",
      code: "D",
      health: 1,
      speed: 4.8,
      speedVariance: 0.55,
      preferredRangeMin: 18,
      preferredRangeMax: 27,
      scale: 0.82,
      hitRadius: 0.9,
      chassisTurnRate: 1.75,
      turretTurnRate: 2.6,
      fireRange: 43,
      fireAlignment: 0.15,
      reloadBase: 3.4,
      reloadMin: 2.5,
      reloadJitter: 0.7,
      shellSpeed: 22,
      shellLifetime: 2.7,
      score: 240,
      static: false,
      priority: false,
      airborne: true
    }),
    artillery: Object.freeze({
      id: "artillery",
      label: "ARTILLERIE",
      code: "A",
      health: 2,
      speed: 0,
      speedVariance: 0,
      preferredRangeMin: 44,
      preferredRangeMax: 62,
      scale: 1.16,
      hitRadius: 1.2,
      turretTurnRate: 0.82,
      fireRange: 72,
      fireAlignment: 0.2,
      reloadBase: 5.4,
      reloadMin: 3.8,
      reloadJitter: 1.2,
      shellFlightTime: 2.75,
      blastRadius: 4.8,
      blastDamage: 38,
      score: 300,
      static: true,
      priority: true
    })
  });
  const MISSION_PHASE = Object.freeze({
    IDLE: "idle",
    DROP: "drop",
    COMBAT: "combat"
  });
  const DROP_SEQUENCE = Object.freeze({
    DURATION: 3.4,
    START_HEIGHT: 38,
    START_PITCH: 0.72
  });
  const TANK_DEBRIS_SHAPES = Object.freeze({
    turret: {
      vertices: [
        [-0.48, -0.18, -0.34], [0.48, -0.18, -0.34],
        [0.58, -0.18, 0.3], [-0.58, -0.18, 0.3],
        [-0.34, 0.2, -0.22], [0.34, 0.2, -0.22],
        [0.4, 0.2, 0.22], [-0.4, 0.2, 0.22]
      ],
      edges: [
        [0, 1], [1, 2], [2, 3], [3, 0],
        [4, 5], [5, 6], [6, 7], [7, 4],
        [0, 4], [1, 5], [2, 6], [3, 7]
      ]
    },
    cannon: {
      vertices: [
        [-0.05, -0.05, -0.82], [0.05, -0.05, -0.82],
        [0.05, -0.05, 0.82], [-0.05, -0.05, 0.82],
        [-0.05, 0.05, -0.82], [0.05, 0.05, -0.82],
        [0.05, 0.05, 0.82], [-0.05, 0.05, 0.82]
      ],
      edges: [
        [0, 1], [1, 2], [2, 3], [3, 0],
        [4, 5], [5, 6], [6, 7], [7, 4],
        [0, 4], [1, 5], [2, 6], [3, 7]
      ]
    },
    track: {
      vertices: [
        [-0.62, -0.12, -0.24], [0.62, -0.12, -0.24],
        [0.62, -0.12, 0.24], [-0.62, -0.12, 0.24],
        [-0.52, 0.12, -0.2], [0.52, 0.12, -0.2],
        [0.52, 0.12, 0.2], [-0.52, 0.12, 0.2]
      ],
      edges: [
        [0, 1], [1, 2], [2, 3], [3, 0],
        [4, 5], [5, 6], [6, 7], [7, 4],
        [0, 4], [1, 5], [2, 6], [3, 7],
        [0, 2], [1, 3]
      ]
    },
    plate: {
      vertices: [
        [-0.58, -0.08, -0.34],
        [0.58, -0.08, -0.28],
        [0.12, 0.08, 0.48],
        [-0.18, 0.05, 0.34]
      ],
      edges: [[0, 1], [1, 2], [2, 3], [3, 0], [0, 2]]
    },
    optic: {
      vertices: [
        [-0.16, -0.12, -0.13], [0.16, -0.12, -0.13],
        [0.16, -0.12, 0.13], [-0.16, -0.12, 0.13],
        [-0.13, 0.12, -0.1], [0.13, 0.12, -0.1],
        [0.13, 0.12, 0.1], [-0.13, 0.12, 0.1]
      ],
      edges: [
        [0, 1], [1, 2], [2, 3], [3, 0],
        [4, 5], [5, 6], [6, 7], [7, 4],
        [0, 4], [1, 5], [2, 6], [3, 7]
      ]
    }
  });
  const TANK_DEBRIS_LAYOUT = Object.freeze([
    { shape: "turret", x: 0, y: 0.92, z: 0.08, lift: 1.5 },
    { shape: "cannon", x: 0, y: 1.02, z: 1.05, lift: 1.1 },
    { shape: "track", x: -1.08, y: 0.24, z: 0, lift: 0 },
    { shape: "track", x: 1.08, y: 0.24, z: 0, lift: 0.15 },
    { shape: "plate", x: -0.48, y: 0.55, z: 0.52, lift: 0.4 },
    { shape: "plate", x: 0.48, y: 0.55, z: 0.52, lift: 0.55 },
    { shape: "plate", x: 0, y: 0.42, z: -0.72, lift: 0.25 },
    { shape: "optic", x: 0, y: 1.2, z: -0.08, lift: 1.8 }
  ]);
  const MAX_TANK_DEBRIS = 80;
  const PLAYER_TANKS = Object.freeze({
    scout: Object.freeze({
      id: "scout",
      label: "ÉCLAIREUR",
      forwardSpeed: 10.8,
      reverseSpeed: 6.3,
      turnRate: 1.5,
      acceleration: 4.1,
      coastResponse: 6,
      shellSpeed: 34,
      shellLifetime: 1.08,
      reloadTime: 0.72
    }),
    bastion: Object.freeze({
      id: "bastion",
      label: "BASTION",
      forwardSpeed: 6.4,
      reverseSpeed: 3.9,
      turnRate: 0.95,
      acceleration: 2.6,
      coastResponse: 4.5,
      shellSpeed: 34,
      shellLifetime: 2.35,
      reloadTime: 0.72
    })
  });

  let width = 0;
  let height = 0;
  let dpr = 1;
  let focal = 700;
  let horizon = 0;
  let cameraPitch = 0;
  let lastTime = performance.now();
  let running = false;
  let paused = false;
  let gameOver = false;
  let pointerLocked = false;
  let screenShake = 0;
  let flash = 0;
  let waveBanner = 0;
  let waveText = "";
  let recenteringTurret = false;
  let turretWasAligned = true;
  let alignmentPulse = 0;
  let missionPhase = MISSION_PHASE.IDLE;
  let dropElapsed = 0;
  let landingPulse = 0;
  let enemySerial = 0;
  let shellSerial = 0;
  let audioContext = null;
  let selectedTankId = "scout";
  let playMode = "solo";
  let networkSnapshot = network?.getState() ?? {
    configured: false,
    connected: false,
    players: {},
    playerCount: 0
  };
  let localStateSequence = 0;
  let localShotSequence = 0;
  let sharedWorldSequence = 0;
  let appliedWorldSequence = -1;
  let sharedGameOver = false;
  let lastLocalShot = {
    x: 0,
    z: 4,
    yaw: 0,
    tankId: "scout"
  };

  const keys = new Set();
  const enemies = [];
  const shells = [];
  const particles = [];
  const tankDebris = [];
  const rocks = [];
  const remotePlayers = new Map();
  const remoteWorldShells = [];
  const coopHealth = {
    host: 100,
    guest: 100
  };
  const coopInvulnerability = {
    host: 0,
    guest: 0
  };
  let kamikazeWarningTimer = 0;

  const player = {
    tankId: selectedTankId,
    x: 0,
    altitude: 0,
    z: 4,
    heading: 0,
    turretOffset: 0,
    speed: 0,
    health: 100,
    reload: 0,
    score: 0,
    wave: 0,
    kills: 0,
    invulnerable: 0
  };

  function getPlayerTank() {
    return PLAYER_TANKS[player.tankId] ?? PLAYER_TANKS.scout;
  }

  function getEnemyType(enemy) {
    return ENEMY_TYPES[enemy.typeId] ?? ENEMY_TYPES.assault;
  }

  function isCoopGame() {
    return playMode !== "solo" && networkSnapshot.connected;
  }

  function isWorldAuthority() {
    return !isCoopGame() || networkSnapshot.role === "host";
  }

  function selectPlayerTank(tankId) {
    if (!PLAYER_TANKS[tankId]) return;
    selectedTankId = tankId;
    if (missionPhase === MISSION_PHASE.IDLE) player.tankId = tankId;
    for (const card of tankCards) {
      const selected = card.dataset.tank === tankId;
      card.classList.toggle("selected", selected);
      card.setAttribute("aria-checked", String(selected));
    }
    network?.setTank(tankId).catch(() => {});
  }

  function updateLobbyUi() {
    for (const button of modeButtons) {
      const selected = button.dataset.mode === playMode;
      button.classList.toggle("selected", selected);
      button.setAttribute("aria-checked", String(selected));
    }

    const online = playMode !== "solo";
    onlinePanel.classList.toggle("hidden", !online);
    if (!online) {
      startButton.disabled = false;
      startButtonLabel.textContent = "Lancer la mission";
      startButtonHelp.textContent = "Cliquer pour verrouiller la souris";
      return;
    }

    const connected = networkSnapshot.connected;
    const busy = ["connecting", "creating", "joining"].includes(networkSnapshot.phase);
    const isHost = networkSnapshot.role === "host";
    const roomReady = connected && networkSnapshot.playerCount >= 2;
    joinFields.classList.toggle("hidden", playMode !== "join" || connected);
    roomReadout.classList.toggle("hidden", !connected);
    onlineActionButton.classList.toggle("hidden", connected);
    leaveRoomButton.classList.toggle("hidden", !connected);
    onlineActionButton.disabled = busy || !networkSnapshot.configured;
    onlineActionButton.textContent = playMode === "host" ? "Créer le salon" : "Rejoindre le salon";

    if (connected) {
      roomCodeLabel.textContent = networkSnapshot.roomCode;
      roomPlayerCount.textContent =
        `${networkSnapshot.playerCount} / 2 chars connectés`;
      networkStatus.classList.remove("error");
      if (networkSnapshot.meta?.status === "closed") {
        networkStatus.textContent = "L’hôte a fermé ce salon.";
      } else if (roomReady) {
        networkStatus.textContent = isHost
          ? "Coéquipier connecté. Mission prête."
          : "Liaison établie. En attente du lancement.";
      } else {
        networkStatus.textContent = "En attente du deuxième joueur…";
      }

      startButton.disabled = !isHost || !roomReady || networkSnapshot.meta?.status !== "lobby";
      startButtonLabel.textContent = isHost ? "Lancer la mission coop" : "En attente de l’hôte";
      startButtonHelp.textContent = isHost
        ? "Le largage commencera sur les deux ordinateurs"
        : "L’hôte contrôle le départ";
      return;
    }

    startButton.disabled = true;
    startButtonLabel.textContent =
      playMode === "host" ? "Créez d’abord un salon" : "Rejoignez d’abord un salon";
    startButtonHelp.textContent = "La mission démarrera quand les deux chars seront prêts";
    networkStatus.classList.toggle("error", Boolean(networkSnapshot.error));

    if (!networkSnapshot.configured) {
      networkStatus.textContent = "Firebase doit être configuré dans firebase-config.js.";
    } else if (networkSnapshot.error) {
      networkStatus.textContent = networkSnapshot.error;
    } else if (busy) {
      networkStatus.textContent = "Établissement de la liaison Firebase…";
    } else {
      networkStatus.textContent =
        playMode === "host"
          ? "Créez un canal et partagez son code."
          : "Entrez le code affiché chez votre coéquipier.";
    }
  }

  async function selectPlayMode(mode) {
    if (!["solo", "host", "join"].includes(mode) || mode === playMode) return;
    if (networkSnapshot.connected) {
      try {
        await network.leaveRoom();
      } catch {
        // L'interface revient quand même au hangar local.
      }
    }
    playMode = mode;
    remotePlayers.clear();
    updateLobbyUi();
    if (mode === "join") roomCodeInput.focus();
  }

  function reconcileRemotePlayers(snapshot) {
    if (!snapshot.connected) {
      remotePlayers.clear();
      return;
    }

    const seen = new Set();
    for (const [slot, record] of Object.entries(snapshot.players)) {
      if (record?.uid === snapshot.uid || !record?.state) continue;
      const uid = record.uid ?? slot;
      const state = record.state;
      seen.add(uid);
      const target = {
        uid,
        role: record.role ?? slot,
        tankId: state.tankId === "bastion" ? "bastion" : "scout",
        x: Number(state.x) || 0,
        z: Number(state.z) || 0,
        altitude: Number(state.altitude) || 0,
        heading: Number(state.heading) || 0,
        turretOffset: Number(state.turretOffset) || 0,
        health: Number.isFinite(Number(state.health)) ? Number(state.health) : 100,
        missionPhase: state.missionPhase ?? MISSION_PHASE.IDLE,
        shotSequence: Number(state.shotSequence) || 0,
        shotX: Number(state.shotX) || Number(state.x) || 0,
        shotZ: Number(state.shotZ) || Number(state.z) || 0,
        shotYaw: Number(state.shotYaw) || 0,
        shotTankId: state.shotTankId === "bastion" ? "bastion" : "scout"
      };
      const remote = remotePlayers.get(uid);
      if (remote) {
        if (
          isWorldAuthority() &&
          target.role === "guest" &&
          target.shotSequence > (remote.lastShotSequence ?? 0)
        ) {
          spawnRemotePlayerShot(target);
        }
        remote.lastShotSequence = Math.max(
          remote.lastShotSequence ?? 0,
          target.shotSequence
        );
        remote.target = target;
      } else {
        remotePlayers.set(uid, {
          ...target,
          target,
          lastShotSequence: target.shotSequence
        });
      }
    }

    for (const uid of remotePlayers.keys()) {
      if (!seen.has(uid)) remotePlayers.delete(uid);
    }
  }

  function handleNetworkSnapshot(snapshot) {
    const previousStatus = networkSnapshot.meta?.status;
    networkSnapshot = snapshot;
    reconcileRemotePlayers(snapshot);
    if (snapshot.role === "guest" && snapshot.world) {
      applySharedWorld(snapshot.world);
    }
    updateLobbyUi();

    if (
      snapshot.connected &&
      snapshot.meta?.status === "playing" &&
      previousStatus !== "playing" &&
      !running
    ) {
      startGame();
    }
  }

  async function createOrJoinRoom() {
    if (!network?.getState().configured) {
      updateLobbyUi();
      return;
    }
    onlineActionButton.disabled = true;
    try {
      if (playMode === "host") {
        await network.createRoom(selectedTankId);
      } else {
        await network.joinRoom(roomCodeInput.value, selectedTankId);
      }
    } catch {
      // Le module réseau fournit le message détaillé à l'interface.
    }
  }

  function updateRemotePlayers(dt) {
    const blend = 1 - Math.exp(-dt * 13);
    for (const remote of remotePlayers.values()) {
      remote.x += (remote.target.x - remote.x) * blend;
      remote.z += (remote.target.z - remote.z) * blend;
      remote.altitude += (remote.target.altitude - remote.altitude) * blend;
      remote.heading = normalizeAngle(
        remote.heading + normalizeAngle(remote.target.heading - remote.heading) * blend
      );
      remote.turretOffset = normalizeAngle(
        remote.turretOffset +
        normalizeAngle(remote.target.turretOffset - remote.turretOffset) * blend
      );
      remote.health += (remote.target.health - remote.health) * blend;
      remote.role = remote.target.role;
      remote.tankId = remote.target.tankId;
      remote.missionPhase = remote.target.missionPhase;
    }
  }

  function publishLocalPlayerState() {
    if (playMode === "solo" || !networkSnapshot.connected || !running) return;
    localStateSequence += 1;
    network.sendPlayerState({
      tankId: player.tankId,
      x: player.x,
      z: player.z,
      altitude: player.altitude,
      heading: player.heading,
      turretOffset: player.turretOffset,
      health: player.health,
      missionPhase,
      sequence: localStateSequence,
      shotSequence: localShotSequence,
      shotX: lastLocalShot.x,
      shotZ: lastLocalShot.z,
      shotYaw: lastLocalShot.yaw,
      shotTankId: lastLocalShot.tankId
    });
  }

  function firebaseValues(collection) {
    if (!collection) return [];
    return Array.isArray(collection)
      ? collection.filter(Boolean)
      : Object.values(collection);
  }

  function applySharedWorld(world) {
    const sequence = Number(world.sequence) || 0;
    if (sequence <= appliedWorldSequence) return;
    appliedWorldSequence = sequence;

    const previousWave = player.wave;
    const previousHealth = player.health;
    player.wave = Number(world.wave) || 0;
    player.score = Number(world.score) || 0;
    player.kills = Number(world.kills) || 0;
    coopHealth.host = Number(world.health?.host ?? coopHealth.host);
    coopHealth.guest = Number(world.health?.guest ?? coopHealth.guest);
    player.health = Math.max(0, Math.min(100, coopHealth.guest));
    sharedGameOver = Boolean(world.gameOver);

    if (player.health < previousHealth) {
      flash = 1;
      screenShake = Math.max(screenShake, 12);
      tone(92, 0.25, "sawtooth", 0.08, -45);
    }

    if (player.wave > previousWave && player.wave > 0) {
      waveText = `VAGUE ${String(player.wave).padStart(2, "0")}`;
      waveBanner = 2.8;
      tone(240, 0.08, "square", 0.035);
    }

    const incomingEnemies = firebaseValues(world.enemies);
    const incomingEnemyIds = new Set(incomingEnemies.map((enemy) => Number(enemy.id)));
    for (let i = enemies.length - 1; i >= 0; i -= 1) {
      if (!incomingEnemyIds.has(Number(enemies[i].id))) {
        if (missionPhase === MISSION_PHASE.COMBAT) {
          const removedType = getEnemyType(enemies[i]);
          if (removedType.kamikaze) {
            createKamikazeExplosionEffects(enemies[i]);
          } else {
            createTankDebris(enemies[i]);
            burst(
              enemies[i].x,
              enemies[i].z,
              removedType.priority ? COLORS.amber : COLORS.red,
              24,
              0.4 + (enemies[i].elevation ?? 0)
            );
          }
        }
        enemies.splice(i, 1);
      }
    }

    for (const snapshot of incomingEnemies) {
      const id = Number(snapshot.id);
      let enemy = enemies.find((candidate) => Number(candidate.id) === id);
      const target = {
        id,
        typeId: snapshot.typeId,
        x: Number(snapshot.x),
        z: Number(snapshot.z),
        heading: Number(snapshot.heading),
        turretHeading: Number(snapshot.turretHeading),
        health: Number(snapshot.health),
        maxHealth: Number(snapshot.maxHealth),
        hitFlash: Number(snapshot.hitFlash) || 0,
        shieldSourceId: Number(snapshot.shieldSourceId) || 0,
        shieldCharge: Number(snapshot.shieldCharge) || 0,
        shieldCooldown: Number(snapshot.shieldCooldown) || 0,
        revealTimer: Number(snapshot.revealTimer) || 0,
        revealDuration: Number(snapshot.revealDuration) || 2.4,
        kamikazeArmed: Boolean(snapshot.kamikazeArmed),
        fuseTimer: Math.max(0, Number(snapshot.fuseTimer) || 0),
        fuseDuration: Number(snapshot.fuseDuration) || KAMIKAZE_FUSE_TIME,
        elevation: Math.max(0, Number(snapshot.elevation) || 0),
        flightState: snapshot.flightState || null,
        flightTimer: Math.max(0, Number(snapshot.flightTimer) || 0),
        attackCooldown: Math.max(0, Number(snapshot.attackCooldown) || 0)
      };
      if (!enemy) {
        enemy = {
          ...target,
          shieldFlash: target.shieldCharge > 0 ? 0.16 : 0,
          revealFlash: target.revealTimer > 0 ? 0.13 : 0,
          networkTarget: target
        };
        enemies.push(enemy);
      } else {
        if (target.health < enemy.health) enemy.hitFlash = 0.14;
        if (target.shieldCharge < (enemy.shieldCharge ?? 0)) {
          enemy.shieldFlash = 0.3;
        } else if (target.shieldCharge > (enemy.shieldCharge ?? 0)) {
          enemy.shieldFlash = 0.16;
        }
        if (target.revealTimer > (enemy.revealTimer ?? 0) + 0.08) {
          enemy.revealTimer = target.revealTimer;
          enemy.revealDuration = target.revealDuration;
          enemy.revealFlash = 0.13;
        }
        if (target.kamikazeArmed && !enemy.kamikazeArmed) {
          enemy.kamikazeArmed = true;
          enemy.fuseTimer = target.fuseTimer;
          enemy.fuseDuration = target.fuseDuration;
        }
        enemy.networkTarget = target;
      }
    }

    const incomingShells = firebaseValues(world.shells);
    const incomingShellIds = new Set(incomingShells.map((shell) => Number(shell.id)));
    for (let i = remoteWorldShells.length - 1; i >= 0; i -= 1) {
      const shell = remoteWorldShells[i];
      if (incomingShellIds.has(Number(shell.id))) continue;
      if (shell.kind === "artillery" && shell.life < 0.45) {
        burst(shell.targetX, shell.targetZ, COLORS.red, 28);
        burst(shell.targetX, shell.targetZ, COLORS.amber, 14);
        createBlastSmoke(shell.targetX, shell.targetZ);
        const blastDistance = Math.hypot(
          shell.targetX - player.x,
          shell.targetZ - player.z
        );
        screenShake = Math.max(screenShake, Math.max(2, 13 - blastDistance * 0.18));
        tone(44, 0.48, "sawtooth", 0.095, -12);
      }
      remoteWorldShells.splice(i, 1);
    }

    for (const snapshot of incomingShells) {
      const id = Number(snapshot.id);
      let shell = remoteWorldShells.find((candidate) => Number(candidate.id) === id);
      const target = {
        ...snapshot,
        id,
        x: Number(snapshot.x),
        y: Number(snapshot.y),
        z: Number(snapshot.z),
        vx: Number(snapshot.vx) || 0,
        vz: Number(snapshot.vz) || 0,
        life: Number(snapshot.life) || 0,
        trail: []
      };
      if (!shell) {
        shell = { ...target, networkTarget: target };
        remoteWorldShells.push(shell);
      } else {
        shell.networkTarget = target;
      }
    }

    if (sharedGameOver && !gameOver) endGame();
  }

  function updateReplicatedWorld(dt) {
    if (!isCoopGame() || networkSnapshot.role !== "guest") return;
    const blend = 1 - Math.exp(-dt * 14);
    for (const enemy of enemies) {
      if (!enemy.networkTarget) continue;
      const target = enemy.networkTarget;
      enemy.x += (target.x - enemy.x) * blend;
      enemy.z += (target.z - enemy.z) * blend;
      enemy.elevation =
        (enemy.elevation ?? 0) +
        (target.elevation - (enemy.elevation ?? 0)) * blend;
      enemy.heading = normalizeAngle(
        enemy.heading + normalizeAngle(target.heading - enemy.heading) * blend
      );
      enemy.turretHeading = normalizeAngle(
        enemy.turretHeading +
        normalizeAngle(target.turretHeading - enemy.turretHeading) * blend
      );
      enemy.health = target.health;
      enemy.maxHealth = target.maxHealth;
      enemy.hitFlash = Math.max(0, enemy.hitFlash - dt);
      enemy.shieldSourceId = target.shieldSourceId;
      enemy.shieldCharge = target.shieldCharge;
      enemy.shieldCooldown = target.shieldCooldown;
      enemy.shieldFlash = Math.max(0, (enemy.shieldFlash ?? 0) - dt);
      enemy.revealTimer = Math.max(0, (enemy.revealTimer ?? 0) - dt);
      enemy.revealFlash = Math.max(0, (enemy.revealFlash ?? 0) - dt);
      enemy.kamikazeArmed = Boolean(target.kamikazeArmed);
      enemy.flightState = target.flightState;
      enemy.flightTimer = target.flightTimer;
      enemy.attackCooldown = target.attackCooldown;
      enemy.fuseDuration = target.fuseDuration || KAMIKAZE_FUSE_TIME;
      enemy.fuseTimer = enemy.kamikazeArmed
        ? Math.max(
            0,
            Math.min(
              Number.isFinite(enemy.fuseTimer)
                ? enemy.fuseTimer
                : target.fuseTimer,
              target.fuseTimer
            ) - dt
          )
        : 0;
    }
    for (const shell of remoteWorldShells) {
      const target = shell.networkTarget;
      if (!target) continue;
      shell.x += (target.x - shell.x) * blend;
      shell.y += (target.y - shell.y) * blend;
      shell.z += (target.z - shell.z) * blend;
      shell.life = target.life;
      Object.assign(shell, {
        targetX: target.targetX,
        targetZ: target.targetZ,
        flightTime: target.flightTime,
        elapsed: target.elapsed,
        blastRadius: target.blastRadius,
        blastDamage: target.blastDamage
      });
    }
  }

  function buildSharedWorld() {
    coopHealth.host = player.health;
    const enemyStates = {};
    for (const enemy of enemies) {
      enemyStates[`e${enemy.id}`] = {
        id: enemy.id,
        typeId: enemy.typeId,
        x: Number(enemy.x.toFixed(3)),
        z: Number(enemy.z.toFixed(3)),
        heading: Number(enemy.heading.toFixed(4)),
        turretHeading: Number(enemy.turretHeading.toFixed(4)),
        health: enemy.health,
        maxHealth: enemy.maxHealth,
        hitFlash: Number(enemy.hitFlash.toFixed(3)),
        shieldSourceId: Number(enemy.shieldSourceId) || 0,
        shieldCharge: Number(enemy.shieldCharge) || 0,
        shieldCooldown: Number((enemy.shieldCooldown ?? 0).toFixed(3)),
        revealTimer: Number((enemy.revealTimer ?? 0).toFixed(3)),
        revealDuration: Number((enemy.revealDuration ?? 2.4).toFixed(3)),
        kamikazeArmed: Boolean(enemy.kamikazeArmed),
        fuseTimer: Number((enemy.fuseTimer ?? 0).toFixed(3)),
        fuseDuration: Number(
          (enemy.fuseDuration ?? KAMIKAZE_FUSE_TIME).toFixed(3)
        ),
        elevation: Number((enemy.elevation ?? 0).toFixed(3)),
        flightState: enemy.flightState ?? "",
        flightTimer: Number((enemy.flightTimer ?? 0).toFixed(3)),
        attackCooldown: Number((enemy.attackCooldown ?? 0).toFixed(3))
      };
    }

    const shellStates = {};
    for (const shell of shells) {
      if (shell.owner === "ally") continue;
      const state = {
        id: shell.id,
        kind: shell.kind,
        owner: shell.owner,
        x: Number(shell.x.toFixed(3)),
        y: Number(shell.y.toFixed(3)),
        z: Number(shell.z.toFixed(3)),
        vx: Number((shell.vx ?? 0).toFixed(3)),
        vz: Number((shell.vz ?? 0).toFixed(3)),
        life: Number(shell.life.toFixed(3))
      };
      if (shell.kind === "artillery") {
        Object.assign(state, {
          targetX: Number(shell.targetX.toFixed(3)),
          targetZ: Number(shell.targetZ.toFixed(3)),
          flightTime: Number(shell.flightTime.toFixed(3)),
          elapsed: Number(shell.elapsed.toFixed(3)),
          blastRadius: shell.blastRadius,
          blastDamage: shell.blastDamage
        });
      }
      shellStates[`s${shell.id}`] = state;
    }

    return {
      sequence: ++sharedWorldSequence,
      wave: player.wave,
      score: player.score,
      kills: player.kills,
      health: {
        host: Math.round(coopHealth.host),
        guest: Math.round(coopHealth.guest)
      },
      gameOver: sharedGameOver,
      enemies: enemyStates,
      shells: shellStates,
      updatedAt: Date.now()
    };
  }

  function publishSharedWorld() {
    if (!isCoopGame() || networkSnapshot.role !== "host") return;
    network.sendWorldState(buildSharedWorld());
  }

  function resize() {
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    width = window.innerWidth;
    height = window.innerHeight;
    canvas.width = Math.round(width * dpr);
    canvas.height = Math.round(height * dpr);
    canvas.style.width = `${width}px`;
    canvas.style.height = `${height}px`;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    focal = Math.min(width * 0.82, height * 1.2);
    horizon = height * 0.43;
  }

  function normalizeAngle(value) {
    while (value > Math.PI) value -= TAU;
    while (value < -Math.PI) value += TAU;
    return value;
  }

  function turnTowardAngle(current, target, maxStep) {
    const difference = normalizeAngle(target - current);
    return normalizeAngle(current + Math.max(-maxStep, Math.min(maxStep, difference)));
  }

  function distance(a, b) {
    return Math.hypot(a.x - b.x, a.z - b.z);
  }

  function worldToCamera(point) {
    const yaw = player.heading + player.turretOffset;
    const dx = point.x - player.x;
    const dz = point.z - player.z;
    const flatX = dx * Math.cos(yaw) - dz * Math.sin(yaw);
    const flatZ = dx * Math.sin(yaw) + dz * Math.cos(yaw);
    const relativeY = point.y - (1.48 + player.altitude);
    const pitchCos = Math.cos(cameraPitch);
    const pitchSin = Math.sin(cameraPitch);
    return {
      x: flatX,
      y: relativeY * pitchCos + flatZ * pitchSin,
      z: -relativeY * pitchSin + flatZ * pitchCos
    };
  }

  function cameraToScreen(point) {
    return {
      x: width * 0.5 + (point.x / point.z) * focal,
      y: horizon - (point.y / point.z) * focal,
      depth: point.z
    };
  }

  function project(point) {
    const cameraPoint = worldToCamera(point);
    if (cameraPoint.z <= NEAR) return null;
    return cameraToScreen(cameraPoint);
  }

  function clipSegment(a, b) {
    let ca = worldToCamera(a);
    let cb = worldToCamera(b);
    if (ca.z <= NEAR && cb.z <= NEAR) return null;

    if (ca.z <= NEAR) {
      const t = (NEAR - ca.z) / (cb.z - ca.z);
      ca = {
        x: ca.x + (cb.x - ca.x) * t,
        y: ca.y + (cb.y - ca.y) * t,
        z: NEAR
      };
    }
    if (cb.z <= NEAR) {
      const t = (NEAR - cb.z) / (ca.z - cb.z);
      cb = {
        x: cb.x + (ca.x - cb.x) * t,
        y: cb.y + (ca.y - cb.y) * t,
        z: NEAR
      };
    }
    return [cameraToScreen(ca), cameraToScreen(cb)];
  }

  function line3d(a, b, color = COLORS.soft, lineWidth = 1, alpha = 1) {
    const segment = clipSegment(a, b);
    if (!segment) return;
    const [pa, pb] = segment;
    const margin = Math.max(width, height) * 3;
    if (
      (pa.x < -margin && pb.x < -margin) ||
      (pa.x > width + margin && pb.x > width + margin) ||
      (pa.y < -margin && pb.y < -margin) ||
      (pa.y > height + margin && pb.y > height + margin)
    ) return;

    ctx.globalAlpha = alpha;
    ctx.strokeStyle = color;
    ctx.lineWidth = lineWidth;
    ctx.beginPath();
    ctx.moveTo(pa.x, pa.y);
    ctx.lineTo(pb.x, pb.y);
    ctx.stroke();
    ctx.globalAlpha = 1;
  }

  function orientedPoint(origin, localX, localY, localZ, angle) {
    return {
      x: origin.x + localX * Math.cos(angle) + localZ * Math.sin(angle),
      y: (Number(origin.elevation) || 0) + localY,
      z: origin.z - localX * Math.sin(angle) + localZ * Math.cos(angle)
    };
  }

  function drawBox(origin, size, angle, color, alpha = 1) {
    const [sx, sy, sz] = size;
    const vertices = [
      orientedPoint(origin, -sx, 0, -sz, angle),
      orientedPoint(origin, sx, 0, -sz, angle),
      orientedPoint(origin, sx, 0, sz, angle),
      orientedPoint(origin, -sx, 0, sz, angle),
      orientedPoint(origin, -sx, sy, -sz, angle),
      orientedPoint(origin, sx, sy, -sz, angle),
      orientedPoint(origin, sx, sy, sz, angle),
      orientedPoint(origin, -sx, sy, sz, angle)
    ];
    drawTankFaces([
      {
        points: vertices,
        faces: [
          [0, 1, 2, 3],
          [4, 7, 6, 5],
          [0, 4, 5, 1],
          [1, 5, 6, 2],
          [2, 6, 7, 3],
          [3, 7, 4, 0]
        ],
        lineWidth: 1.25
      }
    ], color, alpha);
  }

  function drawGround() {
    const minGrid = -WORLD_LIMIT;
    const maxGrid = WORLD_LIMIT;
    for (let value = minGrid; value <= maxGrid; value += GRID_STEP) {
      const major = value % (GRID_STEP * 4) === 0;
      const color = major ? COLORS.dim : COLORS.faint;
      const alpha = major ? 0.58 : 0.7;
      line3d(
        { x: value, y: 0, z: minGrid },
        { x: value, y: 0, z: maxGrid },
        color,
        major ? 1.15 : 0.75,
        alpha
      );
      line3d(
        { x: minGrid, y: 0, z: value },
        { x: maxGrid, y: 0, z: value },
        color,
        major ? 1.15 : 0.75,
        alpha
      );
    }

    if (missionPhase !== MISSION_PHASE.DROP || player.altitude < 4) {
      ctx.strokeStyle = "rgba(120, 255, 154, 0.14)";
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(0, horizon);
      ctx.lineTo(width, horizon);
      ctx.stroke();
    }
  }

  function drawMoon() {
    const cameraYaw = player.heading + player.turretOffset;
    const relativeAzimuth = normalizeAngle(MOON_WORLD_AZIMUTH - cameraYaw);
    if (Math.abs(relativeAzimuth) > 1.18) return;

    const moonX = width * 0.5 + Math.tan(relativeAzimuth) * focal;
    const moonY = horizon - Math.max(105, Math.min(190, height * 0.21));
    const radius = Math.max(25, Math.min(46, Math.min(width, height) * 0.052));
    if (moonX < -radius * 1.5 || moonX > width + radius * 1.5) return;

    ctx.save();
    ctx.translate(moonX, moonY);
    ctx.strokeStyle = COLORS.soft;
    ctx.fillStyle = "rgba(120, 255, 154, 0.025)";
    ctx.shadowColor = "rgba(120, 255, 154, 0.45)";
    ctx.shadowBlur = 10;
    ctx.lineWidth = 1.15;
    ctx.globalAlpha = 0.56;
    ctx.beginPath();
    ctx.arc(0, 0, radius, 0, TAU);
    ctx.fill();
    ctx.stroke();

    ctx.shadowBlur = 0;
    ctx.beginPath();
    ctx.arc(0, 0, radius - 1, 0, TAU);
    ctx.clip();

    // Relief lunaire réduit à quelques cratères et facettes vectorielles.
    ctx.strokeStyle = COLORS.dim;
    ctx.lineWidth = 0.9;
    ctx.globalAlpha = 0.42;
    const craters = [
      [-0.34, -0.24, 0.2, 0.12, -0.25],
      [0.22, -0.08, 0.14, 0.09, 0.18],
      [-0.04, 0.28, 0.18, 0.1, -0.12],
      [0.42, 0.32, 0.09, 0.06, 0.35]
    ];
    for (const [x, y, rx, ry, rotation] of craters) {
      ctx.beginPath();
      ctx.ellipse(
        x * radius,
        y * radius,
        rx * radius,
        ry * radius,
        rotation,
        0,
        TAU
      );
      ctx.stroke();
    }

    ctx.globalAlpha = 0.25;
    ctx.beginPath();
    ctx.moveTo(-radius * 0.88, radius * 0.08);
    ctx.lineTo(-radius * 0.28, -radius * 0.02);
    ctx.lineTo(radius * 0.08, radius * 0.18);
    ctx.lineTo(radius * 0.82, radius * 0.04);
    ctx.moveTo(-radius * 0.62, -radius * 0.62);
    ctx.lineTo(-radius * 0.12, -radius * 0.34);
    ctx.lineTo(radius * 0.54, -radius * 0.5);
    ctx.stroke();

    // Un arc intérieur rappelle le croissant très graphique du jeu original.
    ctx.strokeStyle = COLORS.green;
    ctx.lineWidth = 1.45;
    ctx.globalAlpha = 0.52;
    ctx.beginPath();
    ctx.ellipse(
      radius * 0.17,
      0,
      radius * 0.63,
      radius * 0.91,
      0,
      Math.PI * 0.56,
      Math.PI * 1.44
    );
    ctx.stroke();
    ctx.restore();
  }

  function drawMountains() {
    const time = performance.now() * 0.00001;
    ctx.save();
    ctx.strokeStyle = "rgba(46, 169, 92, 0.28)";
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(0, horizon + 1);
    const offset = normalizeAngle(player.heading + player.turretOffset) * 130;
    for (let x = -40; x <= width + 40; x += 28) {
      const sample = x + offset;
      const ridge =
        Math.sin(sample * 0.012 + time) * 18 +
        Math.sin(sample * 0.027 + 1.8) * 11 +
        Math.sin(sample * 0.006 + 4.1) * 22;
      ctx.lineTo(x, horizon - 34 - Math.abs(ridge));
    }
    ctx.lineTo(width, horizon);
    ctx.stroke();
    ctx.restore();
  }

  function drawRock(rock) {
    const base = [];
    const top = {
      x: rock.x + Math.sin(rock.seed) * rock.radius * 0.25,
      y: rock.height,
      z: rock.z + Math.cos(rock.seed) * rock.radius * 0.25
    };
    for (let i = 0; i < 7; i += 1) {
      const angle = (i / 7) * TAU + rock.seed;
      base.push({
        x: rock.x + Math.cos(angle) * rock.radius * (0.82 + (i % 2) * 0.18),
        y: 0,
        z: rock.z + Math.sin(angle) * rock.radius * (0.82 + ((i + 1) % 2) * 0.18)
      });
    }
    for (let i = 0; i < base.length; i += 1) {
      line3d(base[i], base[(i + 1) % base.length], COLORS.dim, 1, 0.62);
      line3d(base[i], top, COLORS.dim, 1, 0.62);
    }
  }

  function drawTankEdge(a, b, color, fade, lineWidth = 1.25) {
    line3d(a, b, color, lineWidth + 2.2, fade * 0.12);
    line3d(a, b, color, lineWidth, fade);
  }

  function buildTankVertices(origin, angle, scale, vertices) {
    return vertices.map(([x, y, z]) =>
      orientedPoint(origin, x * scale, y * scale, z * scale, angle)
    );
  }

  function drawTankEdges(points, edges, color, fade, lineWidth = 1.25) {
    for (const [a, b] of edges) {
      drawTankEdge(points[a], points[b], color, fade, lineWidth);
    }
  }

  function drawTankFaces(groups, color, fade, maskAlpha = 0.99) {
    const orderedFaces = [];
    for (const group of groups) {
      for (const face of group.faces) {
        const worldPoints = face.map((index) => group.points[index]);
        const cameraPoints = worldPoints.map(worldToCamera);
        if (cameraPoints.some((point) => point.z <= NEAR)) continue;
        const screenPoints = cameraPoints.map(cameraToScreen);
        const depth =
          cameraPoints.reduce((sum, point) => sum + point.z, 0) /
          cameraPoints.length;
        orderedFaces.push({
          worldPoints,
          screenPoints,
          depth,
          lineWidth: group.lineWidth ?? 1.25
        });
      }
    }

    orderedFaces.sort((a, b) => b.depth - a.depth);
    ctx.save();
    for (const face of orderedFaces) {
      ctx.globalAlpha = maskAlpha;
      ctx.fillStyle = COLORS.black;
      ctx.beginPath();
      ctx.moveTo(face.screenPoints[0].x, face.screenPoints[0].y);
      for (let i = 1; i < face.screenPoints.length; i += 1) {
        ctx.lineTo(face.screenPoints[i].x, face.screenPoints[i].y);
      }
      ctx.closePath();
      ctx.fill();
      ctx.globalAlpha = 1;

      for (let i = 0; i < face.worldPoints.length; i += 1) {
        drawTankEdge(
          face.worldPoints[i],
          face.worldPoints[(i + 1) % face.worldPoints.length],
          color,
          fade,
          face.lineWidth
        );
      }
    }
    ctx.restore();
  }

  function drawMobileEnemy(enemy, type, color, fade) {
    const scale = type.scale;
    const light =
      type.id === "light" || type.id === "ghost" || type.kamikaze;
    const hull = buildTankVertices(enemy, enemy.heading, scale, [
      [-1.03, 0.08, -1.18],
      [1.03, 0.08, -1.18],
      [1.14, 0.08, 1.16],
      [-1.14, 0.08, 1.16],
      [-1.38, 0.34, -0.78],
      [1.38, 0.34, -0.78],
      [1.02, 0.46, 1.34],
      [-1.02, 0.46, 1.34],
      [-0.72, 0.77, -0.5],
      [0.72, 0.77, -0.5],
      [0.58, 0.73, 0.62],
      [-0.58, 0.73, 0.62]
    ]);
    const hullFaces = [
      [0, 1, 2, 3],
      [0, 4, 5, 1],
      [1, 5, 6, 2],
      [2, 6, 7, 3],
      [3, 7, 4, 0],
      [4, 8, 9, 5],
      [5, 9, 10, 6],
      [6, 10, 11, 7],
      [7, 11, 8, 4],
      [8, 11, 10, 9]
    ];

    const leftTrack = buildTankVertices(enemy, enemy.heading, scale, [
      [-1.31, 0.08, -1.05],
      [-1.43, 0.18, -0.68],
      [-1.34, 0.28, 0.98],
      [-1.08, 0.09, 1.29],
      [-0.92, 0.03, 0.88],
      [-0.94, 0.03, -0.88]
    ]);
    const rightTrack = buildTankVertices(enemy, enemy.heading, scale, [
      [1.31, 0.08, -1.05],
      [1.43, 0.18, -0.68],
      [1.34, 0.28, 0.98],
      [1.08, 0.09, 1.29],
      [0.92, 0.03, 0.88],
      [0.94, 0.03, -0.88]
    ]);
    const trackFaces = [[0, 1, 2, 3, 4, 5]];

    const turretHeight = light ? 0.98 : 1.08;
    const turret = buildTankVertices(enemy, enemy.turretHeading, scale, [
      [-0.62, 0.72, -0.42],
      [0.62, 0.72, -0.42],
      [0.74, 0.72, 0.28],
      [0.42, 0.72, 0.68],
      [-0.42, 0.72, 0.68],
      [-0.74, 0.72, 0.28],
      [-0.43, turretHeight, -0.25],
      [0.43, turretHeight, -0.25],
      [0.5, turretHeight, 0.3],
      [0.3, turretHeight, 0.5],
      [-0.3, turretHeight, 0.5],
      [-0.5, turretHeight, 0.3]
    ]);
    const turretFaces = [
      [0, 1, 2, 3, 4, 5],
      [6, 11, 10, 9, 8, 7],
      [0, 6, 7, 1],
      [1, 7, 8, 2],
      [2, 8, 9, 3],
      [3, 9, 10, 4],
      [4, 10, 11, 5],
      [5, 11, 6, 0]
    ];
    const bodyFaceGroups = [
      { points: hull, faces: hullFaces, lineWidth: 1.25 },
      { points: leftTrack, faces: trackFaces, lineWidth: 1.4 },
      { points: rightTrack, faces: trackFaces, lineWidth: 1.4 },
      { points: turret, faces: turretFaces, lineWidth: 1.25 }
    ];
    const bodyMaskAlpha = type.stealth ? Math.min(0.99, fade) : 0.99;
    drawTankFaces(bodyFaceGroups, color, fade, bodyMaskAlpha);

    if (!type.support) {
      const barrelY = (light ? 0.88 : 0.96) * scale;
      const barrelWidth = (light ? 0.045 : 0.065) * scale;
      const barrelLength = (light ? 2.3 : 2.65) * scale;
      const barrelStartLeft = orientedPoint(
        enemy,
        -barrelWidth,
        barrelY,
        0.5 * scale,
        enemy.turretHeading
      );
      const barrelStartRight = orientedPoint(
        enemy,
        barrelWidth,
        barrelY,
        0.5 * scale,
        enemy.turretHeading
      );
      const barrelEndLeft = orientedPoint(
        enemy,
        -barrelWidth,
        barrelY,
        barrelLength,
        enemy.turretHeading
      );
      const barrelEndRight = orientedPoint(
        enemy,
        barrelWidth,
        barrelY,
        barrelLength,
        enemy.turretHeading
      );
      drawTankEdge(
        barrelStartLeft,
        barrelEndLeft,
        color,
        fade,
        light ? 1 : 1.45
      );
      drawTankEdge(
        barrelStartRight,
        barrelEndRight,
        color,
        fade,
        light ? 1 : 1.45
      );
      drawTankEdge(barrelEndLeft, barrelEndRight, color, fade, 1);
      if (
        worldToCamera(barrelEndLeft).z >
        worldToCamera(barrelStartLeft).z
      ) {
        drawTankFaces(bodyFaceGroups, color, fade, bodyMaskAlpha);
      }
    }

    const opticBottom = turretHeight + 0.03;
    const opticTop = opticBottom + (light ? 0.15 : 0.19);
    const optic = buildTankVertices(enemy, enemy.turretHeading, scale, [
      [-0.18, opticBottom, -0.17],
      [0.18, opticBottom, -0.17],
      [0.18, opticBottom, 0.09],
      [-0.18, opticBottom, 0.09],
      [-0.16, opticTop, -0.15],
      [0.16, opticTop, -0.15],
      [0.16, opticTop, 0.07],
      [-0.16, opticTop, 0.07]
    ]);
    drawTankFaces([
      {
        points: optic,
        faces: [
          [0, 1, 2, 3],
          [4, 7, 6, 5],
          [0, 4, 5, 1],
          [1, 5, 6, 2],
          [2, 6, 7, 3],
          [3, 7, 4, 0]
        ],
        lineWidth: 1
      }
    ], color, fade, bodyMaskAlpha);
  }

  function drawKamikazeEnemy(enemy, type, color, fade) {
    drawMobileEnemy(enemy, type, color, fade);

    const scale = type.scale;
    const armed = Boolean(enemy.kamikazeArmed);
    const fuseProgress = armed
      ? Math.max(
          0,
          Math.min(
            1,
            enemy.fuseTimer /
              (enemy.fuseDuration || KAMIKAZE_FUSE_TIME)
          )
        )
      : 1;
    const pulseSpeed = armed ? 0.018 + (1 - fuseProgress) * 0.035 : 0.008;
    const pulse =
      0.7 + Math.sin(performance.now() * pulseSpeed + enemy.id) * 0.28;
    const warningColor = armed ? COLORS.amber : COLORS.red;

    const core = buildTankVertices(enemy, enemy.heading, scale, [
      [-0.5, 1.02, -0.1],
      [0, 1.02, 0.4],
      [0.5, 1.02, -0.1],
      [0, 1.02, -0.6],
      [0, 1.5, -0.1],
      [0, 0.69, -0.1]
    ]);
    for (let i = 0; i < 4; i += 1) {
      drawTankEdge(core[i], core[(i + 1) % 4], warningColor, fade * pulse, 1.4);
      drawTankEdge(core[i], core[4], warningColor, fade * pulse, 1.25);
      drawTankEdge(core[i], core[5], warningColor, fade * pulse, 1.1);
    }

    const ram = buildTankVertices(enemy, enemy.heading, scale, [
      [-0.92, 0.28, 0.78],
      [-0.48, 0.2, 2.08],
      [0, 0.36, 1.38],
      [0.92, 0.28, 0.78],
      [0.48, 0.2, 2.08]
    ]);
    drawTankEdges(ram, [
      [0, 1], [1, 2], [2, 0],
      [2, 3], [3, 4], [4, 2],
      [1, 4]
    ], warningColor, fade * (0.75 + pulse * 0.25), 1.25);

    if (!armed) return;
    const ringRadius = (1.55 + (1 - fuseProgress) * 0.65) * scale;
    const segments = 16;
    for (let i = 0; i < segments; i += 2) {
      const angleA = i / segments * TAU;
      const angleB = (i + 1) / segments * TAU;
      line3d(
        {
          x: enemy.x + Math.sin(angleA) * ringRadius,
          y: 0.035,
          z: enemy.z + Math.cos(angleA) * ringRadius
        },
        {
          x: enemy.x + Math.sin(angleB) * ringRadius,
          y: 0.035,
          z: enemy.z + Math.cos(angleB) * ringRadius
        },
        COLORS.amber,
        1.3,
        fade * pulse
      );
    }
  }

  function drawDroneEnemy(enemy, type, color, fade) {
    const scale = type.scale;
    const diving = enemy.flightState === DRONE_FLIGHT_STATE.DIVING;
    const strafing = enemy.flightState === DRONE_FLIGHT_STATE.STRAFING;
    const attacking = diving || strafing;
    const flightFade = fade;
    const rotorPhase = performance.now() * 0.018 + enemy.id * 0.7;
    const rotorCenters = [
      [-1.48, -0.68],
      [1.48, -0.68],
      [-1.48, 0.72],
      [1.48, 0.72]
    ];
    const armRoot = orientedPoint(enemy, 0, 0.43 * scale, 0, enemy.heading);

    // Les bras passent derrière le fuselage opaque.
    for (const [localX, localZ] of rotorCenters) {
      const hub = orientedPoint(
        enemy,
        localX * scale,
        0.43 * scale,
        localZ * scale,
        enemy.heading
      );
      drawTankEdge(armRoot, hub, color, flightFade * 0.8, 1.1);

      const rotorRadius = 0.52 * scale;
      const rotorPoints = [];
      for (let i = 0; i < 8; i += 1) {
        const angle = rotorPhase + i / 8 * TAU;
        rotorPoints.push({
          x: hub.x + Math.cos(angle) * rotorRadius,
          y: hub.y,
          z: hub.z + Math.sin(angle) * rotorRadius
        });
      }
      for (let i = 0; i < rotorPoints.length; i += 1) {
        drawTankEdge(
          rotorPoints[i],
          rotorPoints[(i + 1) % rotorPoints.length],
          color,
          flightFade * 0.62,
          0.85
        );
      }
      drawTankEdge(rotorPoints[0], rotorPoints[4], color, flightFade, 1.05);
      drawTankEdge(rotorPoints[2], rotorPoints[6], color, flightFade, 1.05);
    }

    const body = buildTankVertices(enemy, enemy.heading, scale, [
      [-0.72, 0.2, -0.62],
      [0.72, 0.2, -0.62],
      [1.02, 0.2, 0.08],
      [0.48, 0.2, 0.82],
      [-0.48, 0.2, 0.82],
      [-1.02, 0.2, 0.08],
      [-0.46, 0.68, -0.38],
      [0.46, 0.68, -0.38],
      [0.66, 0.68, 0.04],
      [0.32, 0.68, 0.48],
      [-0.32, 0.68, 0.48],
      [-0.66, 0.68, 0.04]
    ]);
    drawTankFaces([{
      points: body,
      faces: [
        [0, 1, 2, 3, 4, 5],
        [6, 11, 10, 9, 8, 7],
        [0, 6, 7, 1],
        [1, 7, 8, 2],
        [2, 8, 9, 3],
        [3, 9, 10, 4],
        [4, 10, 11, 5],
        [5, 11, 6, 0]
      ],
      lineWidth: 1.25
    }], color, flightFade, 0.99);

    const skids = buildTankVertices(enemy, enemy.heading, scale, [
      [-0.62, 0.21, -0.42], [-0.78, 0.02, -0.58], [-0.78, 0.02, 0.6],
      [0.62, 0.21, -0.42], [0.78, 0.02, -0.58], [0.78, 0.02, 0.6]
    ]);
    drawTankEdges(skids, [[0, 1], [1, 2], [3, 4], [4, 5]], color, flightFade, 1.05);

    if (attacking) {
      const deploy = strafing
        ? 1
        : Math.max(0.25, 1 - (enemy.elevation ?? 0) / DRONE_CRUISE_ALTITUDE);
      const barrelStart = orientedPoint(
        enemy,
        0,
        0.34 * scale,
        0.44 * scale,
        enemy.turretHeading
      );
      const barrelEnd = orientedPoint(
        enemy,
        0,
        0.34 * scale,
        (0.44 + 1.75 * deploy) * scale,
        enemy.turretHeading
      );
      drawTankEdge(barrelStart, barrelEnd, color, flightFade, 1.45);

      const groundOrigin = { x: enemy.x, z: enemy.z, elevation: 0 };
      for (const lane of [-0.82, 0.82]) {
        for (let segment = -1; segment < 4; segment += 2) {
          const guideStart = orientedPoint(
            groundOrigin,
            lane * scale,
            0.025,
            segment * 1.7 * scale,
            enemy.heading
          );
          const guideEnd = orientedPoint(
            groundOrigin,
            lane * scale,
            0.025,
            (segment + 1) * 1.7 * scale,
            enemy.heading
          );
          line3d(
            guideStart,
            guideEnd,
            COLORS.amber,
            1,
            fade * (strafing ? 0.78 : 0.38)
          );
        }
      }

      const ringRadius = (1.25 + Math.sin(performance.now() * 0.009) * 0.12) * scale;
      for (let i = 0; i < 16; i += 2) {
        const angleA = i / 16 * TAU;
        const angleB = (i + 1) / 16 * TAU;
        line3d(
          { x: enemy.x + Math.sin(angleA) * ringRadius, y: 0.025, z: enemy.z + Math.cos(angleA) * ringRadius },
          { x: enemy.x + Math.sin(angleB) * ringRadius, y: 0.025, z: enemy.z + Math.cos(angleB) * ringRadius },
          COLORS.amber,
          1,
          fade * (strafing ? 0.72 : 0.42)
        );
      }
    }

    if ((enemy.elevation ?? 0) > 0.35) {
      line3d(
        { x: enemy.x, y: 0.03, z: enemy.z },
        { x: enemy.x, y: enemy.elevation, z: enemy.z },
        color,
        0.8,
        fade * (attacking ? 0.38 : 0.14)
      );
    }
  }

  function drawArtilleryEnemy(enemy, color, fade) {
    for (let i = 0; i < 4; i += 1) {
      const angle = enemy.heading + Math.PI / 4 + i * Math.PI / 2;
      const near = {
        x: enemy.x + Math.sin(angle) * 0.72,
        y: 0.16,
        z: enemy.z + Math.cos(angle) * 0.72
      };
      const far = {
        x: enemy.x + Math.sin(angle) * 1.9,
        y: 0.02,
        z: enemy.z + Math.cos(angle) * 1.9
      };
      const footLeft = {
        x: far.x + Math.sin(angle + Math.PI / 2) * 0.28,
        y: 0.02,
        z: far.z + Math.cos(angle + Math.PI / 2) * 0.28
      };
      const footRight = {
        x: far.x + Math.sin(angle - Math.PI / 2) * 0.28,
        y: 0.02,
        z: far.z + Math.cos(angle - Math.PI / 2) * 0.28
      };
      line3d(near, far, color, 1.4, fade);
      line3d(footLeft, footRight, color, 1.2, fade);
    }

    drawBox(enemy, [1.25, 0.34, 1.18], enemy.heading, color, fade);
    const turretOrigin = orientedPoint(enemy, 0, 0, 0.04, enemy.heading);
    drawBox(turretOrigin, [0.72, 0.88, 0.7], enemy.turretHeading, color, fade);

    const barrelStart = orientedPoint(enemy, 0, 0.7, 0.48, enemy.turretHeading);
    const barrelEnd = orientedPoint(enemy, 0, 1.72, 2.35, enemy.turretHeading);
    line3d(barrelStart, barrelEnd, color, 2.4, fade);
  }

  function drawGuardianAura(enemy, fade) {
    const pulse =
      GUARDIAN_SHIELD_RADIUS +
      Math.sin(performance.now() * 0.0045 + enemy.id) * 0.35;
    const segments = 32;
    for (let i = 0; i < segments; i += 2) {
      const angleA = i / segments * TAU;
      const angleB = (i + 1) / segments * TAU;
      line3d(
        {
          x: enemy.x + Math.sin(angleA) * pulse,
          y: 0.025,
          z: enemy.z + Math.cos(angleA) * pulse
        },
        {
          x: enemy.x + Math.sin(angleB) * pulse,
          y: 0.025,
          z: enemy.z + Math.cos(angleB) * pulse
        },
        COLORS.cyan,
        1,
        fade * 0.22
      );
    }
  }

  function drawGuardianEnemy(enemy, type, color, fade) {
    drawMobileEnemy(enemy, type, color, fade);

    const scale = type.scale;
    const mastBase = orientedPoint(
      enemy,
      0,
      1.02 * scale,
      -0.2 * scale,
      enemy.heading
    );
    const generatorCenter = orientedPoint(
      enemy,
      0,
      1.58 * scale,
      -0.2 * scale,
      enemy.heading
    );
    const generatorTop = {
      ...generatorCenter,
      y: generatorCenter.y + 0.42 * scale
    };
    const generatorBottom = {
      ...generatorCenter,
      y: generatorCenter.y - 0.34 * scale
    };
    const ring = [
      orientedPoint(enemy, -0.34 * scale, 1.58 * scale, -0.2 * scale, enemy.heading),
      orientedPoint(enemy, 0, 1.58 * scale, 0.14 * scale, enemy.heading),
      orientedPoint(enemy, 0.34 * scale, 1.58 * scale, -0.2 * scale, enemy.heading),
      orientedPoint(enemy, 0, 1.58 * scale, -0.54 * scale, enemy.heading)
    ];
    const generatorFade =
      fade * (0.72 + Math.sin(performance.now() * 0.01) * 0.18);

    drawTankEdge(mastBase, generatorBottom, COLORS.cyan, generatorFade, 1.2);
    for (let i = 0; i < ring.length; i += 1) {
      drawTankEdge(
        ring[i],
        ring[(i + 1) % ring.length],
        COLORS.cyan,
        generatorFade,
        1.15
      );
      drawTankEdge(ring[i], generatorTop, COLORS.cyan, generatorFade, 1.1);
      drawTankEdge(ring[i], generatorBottom, COLORS.cyan, generatorFade, 1.1);
    }
  }

  function drawEnemyShield(enemy, fade) {
    const source = enemies.find(
      (candidate) =>
        Number(candidate.id) === Number(enemy.shieldSourceId) &&
        getEnemyType(candidate).id === "guardian"
    );
    if (!source) return;

    const type = getEnemyType(enemy);
    const shielded = (enemy.shieldCharge ?? 0) > 0;
    const linkAlpha = fade * (shielded ? 0.26 : 0.08);
    drawTankEdge(
      { x: source.x, y: 1.62 * getEnemyType(source).scale, z: source.z },
      { x: enemy.x, y: 0.92 * type.scale, z: enemy.z },
      COLORS.cyan,
      linkAlpha,
      0.9
    );
    if (!shielded) return;

    const pulse =
      1 +
      Math.sin(performance.now() * 0.012 + enemy.id) * 0.045;
    const radius = 1.55 * type.scale * pulse;
    const centerY = 0.82 * type.scale;
    const top = {
      x: enemy.x,
      y: centerY + 1.02 * type.scale,
      z: enemy.z
    };
    const bottom = {
      x: enemy.x,
      y: 0.04,
      z: enemy.z
    };
    const ring = [];
    const segments = 6;
    for (let i = 0; i < segments; i += 1) {
      const angle = i / segments * TAU;
      ring.push({
        x: enemy.x + Math.sin(angle) * radius,
        y: centerY,
        z: enemy.z + Math.cos(angle) * radius
      });
    }

    const flashBoost = Math.min(0.55, (enemy.shieldFlash ?? 0) * 1.8);
    const shieldAlpha = fade * (0.34 + flashBoost);
    for (let i = 0; i < segments; i += 1) {
      drawTankEdge(
        ring[i],
        ring[(i + 1) % segments],
        COLORS.cyan,
        shieldAlpha,
        1.05
      );
      drawTankEdge(ring[i], top, COLORS.cyan, shieldAlpha, 0.9);
      drawTankEdge(ring[i], bottom, COLORS.cyan, shieldAlpha, 0.9);
    }
  }

  function getEnemyVisibility(enemy) {
    if (getEnemyType(enemy).id !== "ghost") return 1;
    const revealTimer = Math.max(0, enemy.revealTimer ?? 0);
    if (revealTimer <= 0) return 0;
    const fadeProgress = Math.min(1, revealTimer / 1.65);
    return Math.pow(fadeProgress, 1.45);
  }

  function getEnemyLinePulse(enemy, type) {
    let period = 1300;
    let minimum = 0.65;
    let maximum = 1.12;
    if (type.priority) {
      period = 1050;
      minimum = 0.58;
      maximum = 1.18;
    }
    if (type.id === "ghost" && (enemy.revealTimer ?? 0) > 0) {
      period = 760;
      minimum = 0.5;
      maximum = 1.2;
    }
    if (type.kamikaze && enemy.kamikazeArmed) {
      period = 300;
      minimum = 0.35;
      maximum = 1.28;
    }
    if (
      type.airborne &&
      (enemy.flightState === DRONE_FLIGHT_STATE.DIVING ||
        enemy.flightState === DRONE_FLIGHT_STATE.STRAFING)
    ) {
      period = 520;
      minimum = 0.48;
      maximum = 1.24;
    }

    const phase = (Number(enemy.id) || 0) * 1.73;
    const wave =
      0.5 +
      Math.sin(performance.now() * TAU / period + phase) * 0.5;
    return minimum + (maximum - minimum) * wave;
  }

  function modulateLineColor(color, intensity) {
    if (!/^#[0-9a-f]{6}$/i.test(color)) return color;
    const value = Number.parseInt(color.slice(1), 16);
    const brighten = (channel) =>
      intensity <= 1
        ? channel * intensity
        : channel +
          (255 - channel) * Math.min(1, (intensity - 1) * 1.5);
    const red = Math.round(brighten((value >> 16) & 255));
    const green = Math.round(brighten((value >> 8) & 255));
    const blue = Math.round(brighten(value & 255));
    return `rgb(${red}, ${green}, ${blue})`;
  }

  function drawEnemy(enemy) {
    const type = getEnemyType(enemy);
    const centerProjection = project({
      x: enemy.x,
      y:
        (enemy.elevation ?? 0) +
        (type.id === "artillery"
          ? 1
          : type.id === "guardian"
            ? 1.18 * type.scale
            : 0.85 * type.scale),
      z: enemy.z
    });
    if (!centerProjection) return;

    const range = distance(player, enemy);
    const visibility = getEnemyVisibility(enemy);
    if (visibility <= 0.01) return;
    const fade =
      Math.max(0.32, Math.min(1, 1.35 - range / 90)) * visibility;
    const baseColor =
      type.priority || (type.kamikaze && enemy.kamikazeArmed)
        ? COLORS.amber
        : COLORS.red;
    const color =
      enemy.hitFlash > 0 || (enemy.revealFlash ?? 0) > 0
        ? COLORS.white
        : baseColor;
    const modelColor =
      color === COLORS.white
        ? color
        : modulateLineColor(color, getEnemyLinePulse(enemy, type));

    if (type.id === "guardian") {
      drawGuardianAura(enemy, fade);
      drawGuardianEnemy(enemy, type, modelColor, fade);
    } else if (type.kamikaze) {
      drawKamikazeEnemy(enemy, type, modelColor, fade);
    } else if (type.id === "drone") {
      drawDroneEnemy(enemy, type, modelColor, fade);
    } else if (type.id === "artillery") {
      drawArtilleryEnemy(enemy, modelColor, fade);
    } else {
      drawMobileEnemy(enemy, type, modelColor, fade);
    }
    drawEnemyShield(enemy, fade);

    const labelRange = type.priority ? 60 : 42;
    if (centerProjection.depth >= labelRange) return;

    const labelY =
      centerProjection.y - Math.min(88, 48 / centerProjection.depth * 18);
    ctx.save();
    ctx.font = "9px Courier New";
    ctx.textAlign = "center";
    ctx.fillStyle = color;
    ctx.globalAlpha = fade * 0.88;
    ctx.fillText(
      `${type.code}-${String(enemy.id).padStart(2, "0")} ${type.label}  ${Math.round(range * 10)}m${type.airborne && (enemy.elevation ?? 0) > 0.2 ? `  ALT ${Math.round(enemy.elevation * 10)}m` : ""}`,
      centerProjection.x,
      labelY
    );

    if (type.priority) {
      const pulse = 3 + Math.sin(performance.now() * 0.009) * 2;
      ctx.fillStyle = COLORS.amber;
      ctx.fillText("▲ PRIORITÉ ▲", centerProjection.x, labelY - 13);
      ctx.strokeStyle = COLORS.amber;
      ctx.strokeRect(
        centerProjection.x - 28 - pulse,
        centerProjection.y - 20 - pulse,
        56 + pulse * 2,
        40 + pulse * 2
      );
    }

    const barWidth = Math.min(42, 220 / centerProjection.depth);
    ctx.strokeStyle = color;
    ctx.strokeRect(centerProjection.x - barWidth / 2, labelY + 5, barWidth, 3);
    ctx.fillRect(
      centerProjection.x - barWidth / 2,
      labelY + 5,
      barWidth * (enemy.health / enemy.maxHealth),
      3
    );
    ctx.restore();
  }

  function drawRemotePlayer(remote) {
    if (
      remote.missionPhase !== MISSION_PHASE.COMBAT ||
      remote.altitude > 0.4
    ) return;

    const tank = PLAYER_TANKS[remote.tankId] ?? PLAYER_TANKS.scout;
    const scale = remote.tankId === "bastion" ? 1.08 : 0.84;
    const model = {
      ...remote,
      turretHeading: remote.heading + remote.turretOffset
    };
    drawMobileEnemy(
      model,
      { id: remote.tankId === "scout" ? "light" : "assault", scale },
      COLORS.cyan,
      0.92
    );

    const center = project({ x: remote.x, y: 1.05 * scale, z: remote.z });
    if (!center || center.depth > 52) return;
    const range = Math.round(distance(player, remote) * 10);
    const labelY = center.y - Math.min(82, 48 / center.depth * 18);
    ctx.save();
    ctx.fillStyle = COLORS.cyan;
    ctx.strokeStyle = COLORS.cyan;
    ctx.textAlign = "center";
    ctx.font = "9px Courier New";
    ctx.fillText(`◆ COÉQUIPIER // ${tank.label} // ${range}m`, center.x, labelY);
    const barWidth = Math.min(42, 220 / center.depth);
    ctx.strokeRect(center.x - barWidth / 2, labelY + 5, barWidth, 3);
    ctx.fillRect(
      center.x - barWidth / 2,
      labelY + 5,
      barWidth * Math.max(0, Math.min(1, remote.health / 100)),
      3
    );
    ctx.restore();
  }

  function drawArtilleryTarget(shell) {
    const timeLeft = Math.max(0, shell.flightTime - shell.elapsed);
    const urgent = timeLeft < 0.7;
    const color = urgent ? COLORS.red : COLORS.amber;
    const pulse = 1 + Math.sin(performance.now() * 0.014) * 0.08;
    const radius = shell.blastRadius * pulse;
    const segments = 24;

    for (let i = 0; i < segments; i += 1) {
      const angleA = i / segments * TAU;
      const angleB = (i + 1) / segments * TAU;
      line3d(
        {
          x: shell.targetX + Math.sin(angleA) * radius,
          y: 0.04,
          z: shell.targetZ + Math.cos(angleA) * radius
        },
        {
          x: shell.targetX + Math.sin(angleB) * radius,
          y: 0.04,
          z: shell.targetZ + Math.cos(angleB) * radius
        },
        color,
        urgent ? 2 : 1.2,
        urgent ? 0.95 : 0.65
      );
    }

    line3d(
      { x: shell.targetX - radius, y: 0.04, z: shell.targetZ },
      { x: shell.targetX + radius, y: 0.04, z: shell.targetZ },
      color,
      1,
      0.55
    );
    line3d(
      { x: shell.targetX, y: 0.04, z: shell.targetZ - radius },
      { x: shell.targetX, y: 0.04, z: shell.targetZ + radius },
      color,
      1,
      0.55
    );

    const center = project({ x: shell.targetX, y: 0.06, z: shell.targetZ });
    if (!center) return;
    ctx.save();
    ctx.fillStyle = color;
    ctx.font = "9px Courier New";
    ctx.textAlign = "center";
    ctx.globalAlpha = urgent ? 1 : 0.75;
    ctx.fillText(`IMPACT ${timeLeft.toFixed(1)}s`, center.x, center.y - 9);
    ctx.restore();
  }

  function drawShell(shell) {
    const artillery = shell.kind === "artillery";
    if (artillery) drawArtilleryTarget(shell);

    const p = project({ x: shell.x, y: shell.y, z: shell.z });
    if (!p) return;
    const radius = Math.max(
      artillery ? 2.4 : 1.4,
      Math.min(artillery ? 10 : 7, (artillery ? 26 : 18) / p.depth)
    );
    const color =
      shell.owner !== "enemy" || artillery ? COLORS.amber : COLORS.red;
    ctx.save();
    ctx.globalCompositeOperation = "lighter";
    ctx.fillStyle = color;
    ctx.shadowBlur = 13;
    ctx.shadowColor = color;
    ctx.beginPath();
    ctx.arc(p.x, p.y, radius, 0, TAU);
    ctx.fill();
    ctx.restore();

    if (artillery) {
      const trail = shell.trail ?? [];
      for (let i = 1; i < trail.length; i += 1) {
        line3d(
          trail[i - 1],
          trail[i],
          COLORS.amber,
          1.2,
          i / trail.length * 0.6
        );
      }
      return;
    }

    const tail = {
      x: shell.x - shell.vx * 0.045,
      y: shell.y,
      z: shell.z - shell.vz * 0.045
    };
    line3d(tail, shell, color, 1.5, 0.7);
  }

  function drawParticle(particle) {
    const p = project(particle);
    if (!p) return;
    const alpha = Math.max(0, particle.life / particle.maxLife);

    if (particle.kind === "shockwave") {
      const progress = 1 - alpha;
      const radius =
        particle.maxRadius * (1 - Math.pow(1 - progress, 2));
      const segments = 28;
      for (let i = 0; i < segments; i += 2) {
        const angleA = i / segments * TAU;
        const angleB = (i + 1) / segments * TAU;
        line3d(
          {
            x: particle.x + Math.sin(angleA) * radius,
            y: 0.04,
            z: particle.z + Math.cos(angleA) * radius
          },
          {
            x: particle.x + Math.sin(angleB) * radius,
            y: 0.04,
            z: particle.z + Math.cos(angleB) * radius
          },
          particle.color,
          1.7,
          alpha * 0.85
        );
      }
      return;
    }

    if (particle.kind === "smoke") {
      const fadeIn = Math.min(1, (1 - alpha) * 8);
      const radius = Math.max(2, Math.min(18, particle.size / p.depth));
      ctx.globalAlpha = alpha * fadeIn * 0.26;
      ctx.fillStyle = particle.color;
      ctx.beginPath();
      ctx.arc(p.x, p.y, radius, 0, TAU);
      ctx.fill();
      ctx.globalAlpha = alpha * fadeIn * 0.18;
      ctx.strokeStyle = COLORS.soft;
      ctx.lineWidth = 0.75;
      ctx.stroke();
      ctx.globalAlpha = 1;
      return;
    }

    const radius = Math.max(0.8, Math.min(5, particle.size / p.depth));
    ctx.globalAlpha = alpha;
    ctx.fillStyle = particle.color;
    ctx.fillRect(p.x - radius / 2, p.y - radius / 2, radius, radius);
    ctx.globalAlpha = 1;
  }

  function transformDebrisVertex(piece, vertex, rotation) {
    let x = vertex[0] * piece.scale;
    let y = vertex[1] * piece.scale;
    let z = vertex[2] * piece.scale;

    const yawX = x * rotation.yawCos + z * rotation.yawSin;
    const yawZ = -x * rotation.yawSin + z * rotation.yawCos;
    x = yawX;
    z = yawZ;

    const pitchY =
      y * rotation.pitchCos - z * rotation.pitchSin;
    const pitchZ =
      y * rotation.pitchSin + z * rotation.pitchCos;
    y = pitchY;
    z = pitchZ;

    const rollX = x * rotation.rollCos - y * rotation.rollSin;
    const rollY = x * rotation.rollSin + y * rotation.rollCos;

    return {
      x: piece.x + rollX,
      y: piece.y + rollY,
      z: piece.z + z
    };
  }

  function drawTankDebris(piece) {
    const lifeAlpha = Math.max(0, piece.life / piece.maxLife);
    const appearAlpha = Math.min(1, piece.age / 0.035);
    const alpha = appearAlpha * Math.pow(lifeAlpha, 0.72);
    const color = piece.age < 0.075 ? COLORS.white : piece.color;
    const rotation = {
      yawCos: Math.cos(piece.yaw),
      yawSin: Math.sin(piece.yaw),
      pitchCos: Math.cos(piece.pitch),
      pitchSin: Math.sin(piece.pitch),
      rollCos: Math.cos(piece.roll),
      rollSin: Math.sin(piece.roll)
    };
    const vertices = piece.shape.vertices.map((vertex) =>
      transformDebrisVertex(piece, vertex, rotation)
    );

    for (const [start, end] of piece.shape.edges) {
      drawTankEdge(vertices[start], vertices[end], color, alpha, 1.05);
    }
  }

  function drawReticle() {
    const x = width / 2;
    const y = horizon;
    const chassisAngle = -Math.PI / 2 - player.turretOffset;
    const chassisRadius = 45;
    const chassisX = x + Math.cos(chassisAngle) * chassisRadius;
    const chassisY = y + Math.sin(chassisAngle) * chassisRadius;
    const aligned = Math.abs(player.turretOffset) < 0.025;
    const locked = enemies.some((enemy) => {
      if (getEnemyVisibility(enemy) < 0.12) return false;
      const p = project({ x: enemy.x, y: 0.7, z: enemy.z });
      return p && p.depth < 55 && Math.hypot(p.x - x, p.y - y) < Math.max(18, 120 / p.depth);
    });
    const color = locked ? COLORS.red : COLORS.green;
    const pulse = locked ? Math.sin(performance.now() * 0.012) * 2 : 0;

    ctx.save();
    ctx.strokeStyle = color;
    ctx.fillStyle = color;
    ctx.lineWidth = 1;
    ctx.globalAlpha = 0.9;
    ctx.beginPath();
    ctx.arc(x, y, 17 + pulse, 0, TAU);
    ctx.moveTo(x - 29, y);
    ctx.lineTo(x - 9, y);
    ctx.moveTo(x + 9, y);
    ctx.lineTo(x + 29, y);
    ctx.moveTo(x, y - 29);
    ctx.lineTo(x, y - 9);
    ctx.moveTo(x, y + 9);
    ctx.lineTo(x, y + 29);
    ctx.stroke();
    ctx.fillRect(x - 1, y - 1, 2, 2);

    ctx.globalAlpha = aligned ? 0.75 : 0.32;
    ctx.strokeStyle = aligned ? COLORS.amber : COLORS.green;
    ctx.setLineDash([2, 5]);
    ctx.beginPath();
    ctx.arc(x, y, chassisRadius, 0, TAU);
    ctx.stroke();
    ctx.setLineDash([]);

    ctx.globalAlpha = 1;
    ctx.fillStyle = aligned ? COLORS.amber : COLORS.green;
    ctx.save();
    ctx.translate(chassisX, chassisY);
    ctx.rotate(chassisAngle + Math.PI / 2);
    ctx.beginPath();
    ctx.moveTo(0, -7);
    ctx.lineTo(-5, 4);
    ctx.lineTo(0, 2);
    ctx.lineTo(5, 4);
    ctx.closePath();
    ctx.fill();
    ctx.restore();

    if (alignmentPulse > 0) {
      ctx.globalAlpha = Math.min(1, alignmentPulse * 2);
      ctx.strokeStyle = COLORS.amber;
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.arc(x, y, chassisRadius + (1 - alignmentPulse) * 12, 0, TAU);
      ctx.stroke();
      ctx.globalAlpha = 1;
    }

    if (locked) {
      ctx.font = "9px Courier New";
      ctx.textAlign = "center";
      ctx.fillStyle = color;
      ctx.fillText("CIBLE", x, y + 45);
    }
    if (!aligned) {
      ctx.font = "8px Courier New";
      ctx.textAlign = "center";
      ctx.fillStyle = recenteringTurret ? COLORS.amber : COLORS.green;
      ctx.globalAlpha = 0.78;
      ctx.fillText(recenteringTurret ? "ALIGNEMENT..." : "C  RECENTRER", x, y + 68);
      ctx.globalAlpha = 1;
    }
    ctx.restore();
  }

  function getCockpitLayout() {
    const compact = width < 700 || height < 560;
    const bottomHeight = Math.max(
      compact ? 100 : 92,
      Math.min(compact ? 112 : 132, height * 0.17)
    );
    const sideWidth = Math.max(
      compact ? 22 : 48,
      Math.min(compact ? 34 : 82, width * (compact ? 0.065 : 0.065))
    );
    const radarRadius = Math.max(
      28,
      Math.min(compact ? 34 : 45, bottomHeight * 0.35)
    );
    return {
      compact,
      bottomHeight,
      consoleTop: height - bottomHeight,
      sideWidth,
      topRail: compact ? 16 : 21,
      radarRadius,
      radarX: width - sideWidth - radarRadius - (compact ? 7 : 14),
      radarY: height - bottomHeight * 0.52
    };
  }

  function drawCockpitFrame(layout) {
    const {
      compact,
      consoleTop,
      sideWidth,
      topRail,
      bottomHeight
    } = layout;
    const damaged = player.health < 30;
    const warningPulse = 0.55 + Math.sin(performance.now() * 0.012) * 0.2;
    const edgeColor = damaged ? COLORS.red : COLORS.dim;
    const drawPanel = (points, fill = "rgba(1, 6, 3, 0.965)") => {
      ctx.fillStyle = fill;
      ctx.beginPath();
      ctx.moveTo(points[0][0], points[0][1]);
      for (let i = 1; i < points.length; i += 1) {
        ctx.lineTo(points[i][0], points[i][1]);
      }
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
    };

    ctx.save();
    ctx.strokeStyle = edgeColor;
    ctx.lineWidth = damaged ? 1.35 : 1;
    ctx.globalAlpha = 1;

    drawPanel([
      [0, 0],
      [width, 0],
      [width, topRail],
      [width * 0.7, topRail],
      [width * 0.67, topRail * 0.58],
      [width * 0.33, topRail * 0.58],
      [width * 0.3, topRail],
      [0, topRail]
    ]);

    drawPanel([
      [0, topRail],
      [sideWidth + (compact ? 8 : 18), topRail],
      [sideWidth, height * 0.32],
      [sideWidth * 0.72, consoleTop - 36],
      [sideWidth + 10, consoleTop + 12],
      [0, consoleTop + 22]
    ]);
    drawPanel([
      [width, topRail],
      [width - sideWidth - (compact ? 8 : 18), topRail],
      [width - sideWidth, height * 0.32],
      [width - sideWidth * 0.72, consoleTop - 36],
      [width - sideWidth - 10, consoleTop + 12],
      [width, consoleTop + 22]
    ]);

    drawPanel([
      [0, consoleTop + 14],
      [width * 0.3, consoleTop],
      [width * 0.38, consoleTop + 20],
      [width * 0.62, consoleTop + 20],
      [width * 0.7, consoleTop],
      [width, consoleTop + 14],
      [width, height],
      [0, height]
    ], "rgba(1, 7, 4, 0.975)");

    ctx.globalAlpha = 0.25;
    ctx.strokeStyle = COLORS.green;
    ctx.beginPath();
    ctx.moveTo(sideWidth + 7, topRail + 4);
    ctx.lineTo(sideWidth * 0.83, consoleTop - 34);
    ctx.lineTo(sideWidth + 17, consoleTop + 17);
    ctx.moveTo(width - sideWidth - 7, topRail + 4);
    ctx.lineTo(width - sideWidth * 0.83, consoleTop - 34);
    ctx.lineTo(width - sideWidth - 17, consoleTop + 17);
    ctx.moveTo(0, consoleTop + 22);
    ctx.lineTo(width * 0.3, consoleTop + 8);
    ctx.moveTo(width * 0.7, consoleTop + 8);
    ctx.lineTo(width, consoleTop + 22);
    ctx.stroke();

    ctx.fillStyle = damaged ? COLORS.red : COLORS.green;
    ctx.globalAlpha = damaged ? warningPulse : 0.38;
    const bolts = [
      [sideWidth * 0.46, topRail + 18],
      [width - sideWidth * 0.46, topRail + 18],
      [sideWidth * 0.48, consoleTop - 18],
      [width - sideWidth * 0.48, consoleTop - 18],
      [width * 0.3, consoleTop + 12],
      [width * 0.7, consoleTop + 12]
    ];
    for (const [x, y] of bolts) {
      ctx.beginPath();
      ctx.arc(x, y, compact ? 1.5 : 2, 0, TAU);
      ctx.fill();
    }

    ctx.globalAlpha = 0.16;
    ctx.strokeStyle = COLORS.green;
    for (let y = consoleTop + 30; y < height; y += 13) {
      ctx.beginPath();
      ctx.moveTo(sideWidth * 0.55, y);
      ctx.lineTo(width * 0.28, y - bottomHeight * 0.04);
      ctx.moveTo(width * 0.72, y - bottomHeight * 0.04);
      ctx.lineTo(width - sideWidth * 0.55, y);
      ctx.stroke();
    }
    ctx.restore();
  }

  function drawCockpit() {
    const tank = getPlayerTank();
    const light = tank.id === "scout";
    const midX = width / 2;
    const movement = Math.min(1, Math.abs(player.speed) / tank.forwardSpeed);
    const suspension =
      missionPhase === MISSION_PHASE.COMBAT
        ? Math.sin(performance.now() * 0.018) * movement * 1.5
        : 0;
    const recoilProgress = Math.max(
      0,
      Math.min(1, (player.reload - (tank.reloadTime - 0.12)) / 0.12)
    );
    const baseY = height + suspension + recoilProgress * 5;
    const dark = "rgba(1, 6, 3, 0.93)";
    const hullNearHalf = Math.min(
      light ? 178 : 218,
      width * (light ? 0.31 : 0.35)
    );
    const hullFarHalf = Math.min(
      light ? 78 : 102,
      width * (light ? 0.14 : 0.17)
    );
    const hullHeight = Math.min(
      light ? 72 : 88,
      height * (light ? 0.1 : 0.12)
    );
    const shoulderY = baseY - hullHeight;
    const trackNearInner = hullNearHalf + 8;
    const trackNearOuter = Math.min(
      midX - 5,
      trackNearInner + (light ? 58 : 72)
    );
    const trackFarInner = hullFarHalf + 9;
    const trackFarOuter = trackFarInner + (light ? 34 : 45);
    const grilleHalf = light ? 20 : 30;
    const chassisYaw = -player.turretOffset;
    const chassisCos = Math.cos(chassisYaw);
    const chassisSin = Math.sin(chassisYaw);
    const depthScale = light ? 0.31 : 0.34;
    const hullShoulderDepth = hullHeight / depthScale;
    const hullNoseDepth =
      (hullHeight + (light ? 13 : 10)) / depthScale;
    const trackFrontDepth =
      (hullHeight - (light ? 8 : 5)) / depthScale;
    const chassisPoint = (localX, localDepth) => {
      const rotatedX =
        localX * chassisCos + localDepth * chassisSin;
      const rotatedDepth =
        -localX * chassisSin + localDepth * chassisCos;
      return {
        x: midX + rotatedX,
        y: baseY - rotatedDepth * depthScale
      };
    };
    const drawChassisPolygon = (points) => {
      ctx.beginPath();
      ctx.moveTo(points[0].x, points[0].y);
      for (let i = 1; i < points.length; i += 1) {
        ctx.lineTo(points[i].x, points[i].y);
      }
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
    };

    drawCockpitFrame(getCockpitLayout());

    ctx.save();
    ctx.fillStyle = dark;
    ctx.strokeStyle = COLORS.dim;
    ctx.lineWidth = 1;

    // Dessus des chenilles, vues en forte perspective.
    drawChassisPolygon([
      chassisPoint(-trackFarInner, trackFrontDepth),
      chassisPoint(-trackFarOuter, trackFrontDepth),
      chassisPoint(-trackNearOuter, 0),
      chassisPoint(-trackNearInner, 0)
    ]);
    drawChassisPolygon([
      chassisPoint(trackFarInner, trackFrontDepth),
      chassisPoint(trackFarOuter, trackFrontDepth),
      chassisPoint(trackNearOuter, 0),
      chassisPoint(trackNearInner, 0)
    ]);

    ctx.globalAlpha = 0.36;
    for (let i = 1; i <= 3; i += 1) {
      const ratio = i / 4;
      const treadDepth = trackFrontDepth * (1 - ratio);
      const leftInner = chassisPoint(
        -trackFarInner +
          (-trackNearInner + trackFarInner) * ratio,
        treadDepth
      );
      const leftOuter = chassisPoint(
        -trackFarOuter +
          (-trackNearOuter + trackFarOuter) * ratio,
        treadDepth
      );
      const rightInner = chassisPoint(
        trackFarInner +
          (trackNearInner - trackFarInner) * ratio,
        treadDepth
      );
      const rightOuter = chassisPoint(
        trackFarOuter +
          (trackNearOuter - trackFarOuter) * ratio,
        treadDepth
      );

      ctx.beginPath();
      ctx.moveTo(leftOuter.x, leftOuter.y);
      ctx.lineTo(leftInner.x, leftInner.y);
      ctx.moveTo(rightInner.x, rightInner.y);
      ctx.lineTo(rightOuter.x, rightOuter.y);
      ctx.stroke();
    }
    ctx.globalAlpha = 1;

    // Glacis en V : un nez pointu et deux grandes plaques inclinées.
    const hullNose = chassisPoint(0, hullNoseDepth);
    const hullRightShoulder = chassisPoint(
      hullFarHalf,
      hullShoulderDepth
    );
    const hullRightRear = chassisPoint(hullNearHalf, 0);
    const hullLeftRear = chassisPoint(-hullNearHalf, 0);
    const hullLeftShoulder = chassisPoint(
      -hullFarHalf,
      hullShoulderDepth
    );
    const hullRearCenter = chassisPoint(0, 0);
    drawChassisPolygon([
      hullNose,
      hullRightShoulder,
      hullRightRear,
      hullLeftRear,
      hullLeftShoulder
    ]);

    ctx.strokeStyle = COLORS.green;
    ctx.globalAlpha = 0.5;
    ctx.beginPath();
    ctx.moveTo(hullNose.x, hullNose.y);
    ctx.lineTo(hullRearCenter.x, hullRearCenter.y);
    ctx.moveTo(hullLeftShoulder.x, hullLeftShoulder.y);
    ctx.lineTo(hullRearCenter.x, hullRearCenter.y);
    ctx.moveTo(hullRightShoulder.x, hullRightShoulder.y);
    ctx.lineTo(hullRearCenter.x, hullRearCenter.y);
    ctx.stroke();

    // Canon vu dans l'axe : le tube converge vers une petite bouche carrée.
    const barrelBaseY = baseY - (light ? 13 : 16);
    const barrelEndY = shoulderY - (light ? 72 : 94);
    const barrelBaseHalf = light ? 8 : 11;
    const barrelEndHalf = light ? 2.5 : 3.5;

    ctx.fillStyle = dark;
    ctx.globalAlpha = 1;
    ctx.beginPath();
    ctx.moveTo(midX - barrelBaseHalf, barrelBaseY);
    ctx.lineTo(midX - barrelEndHalf, barrelEndY);
    ctx.lineTo(midX + barrelEndHalf, barrelEndY);
    ctx.lineTo(midX + barrelBaseHalf, barrelBaseY);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    ctx.globalAlpha = 0.72;
    ctx.strokeRect(
      midX - barrelEndHalf - 2,
      barrelEndY - 3,
      barrelEndHalf * 2 + 4,
      5
    );

    // Mantelet technique à la base du canon.
    const grilleTop = baseY - (light ? 31 : 39);
    ctx.globalAlpha = 0.62;
    ctx.beginPath();
    ctx.moveTo(midX - grilleHalf * 0.62, grilleTop);
    ctx.lineTo(midX + grilleHalf * 0.62, grilleTop);
    ctx.lineTo(midX + grilleHalf, baseY - 7);
    ctx.lineTo(midX - grilleHalf, baseY - 7);
    ctx.closePath();
    ctx.stroke();
    ctx.globalAlpha = 0.28;
    for (let i = 1; i <= 3; i += 1) {
      const grilleY = grilleTop + (baseY - 7 - grilleTop) * (i / 4);
      const grilleWidth =
        grilleHalf * (0.62 + 0.38 * (i / 4));
      ctx.beginPath();
      ctx.moveTo(midX - grilleWidth, grilleY);
      ctx.lineTo(midX + grilleWidth, grilleY);
      ctx.stroke();
    }

    ctx.globalAlpha = 1;
    ctx.restore();
  }

  function drawRadar() {
    const layout = getCockpitLayout();
    const { compact, radarRadius: radius, radarX: x, radarY: y } = layout;
    const range = 48;
    const yaw = player.heading + player.turretOffset;

    ctx.save();
    ctx.translate(x, y);
    ctx.fillStyle = "rgba(1, 5, 3, 0.98)";
    ctx.strokeStyle = COLORS.dim;
    ctx.lineWidth = 1.15;
    ctx.beginPath();
    for (let i = 0; i < 8; i += 1) {
      const angle = Math.PI / 8 + i / 8 * TAU;
      const bezelRadius = radius + (compact ? 7 : 10);
      const px = Math.cos(angle) * bezelRadius;
      const py = Math.sin(angle) * bezelRadius;
      if (i === 0) ctx.moveTo(px, py);
      else ctx.lineTo(px, py);
    }
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    ctx.strokeStyle = "rgba(120, 255, 154, 0.5)";
    ctx.fillStyle = "rgba(2, 12, 6, 0.74)";
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.arc(0, 0, radius, 0, TAU);
    ctx.fill();
    ctx.stroke();
    ctx.globalAlpha = 0.35;
    ctx.beginPath();
    ctx.arc(0, 0, radius * 0.5, 0, TAU);
    ctx.moveTo(-radius, 0);
    ctx.lineTo(radius, 0);
    ctx.moveTo(0, -radius);
    ctx.lineTo(0, radius);
    ctx.stroke();
    ctx.globalAlpha = 1;

    ctx.fillStyle = COLORS.green;
    ctx.beginPath();
    ctx.moveTo(0, -6);
    ctx.lineTo(-4, 5);
    ctx.lineTo(4, 5);
    ctx.closePath();
    ctx.fill();

    for (const enemy of enemies) {
      const type = getEnemyType(enemy);
      const dx = enemy.x - player.x;
      const dz = enemy.z - player.z;
      const right = dx * Math.cos(yaw) - dz * Math.sin(yaw);
      const forward = dx * Math.sin(yaw) + dz * Math.cos(yaw);
      const px = (right / range) * radius;
      const py = (-forward / range) * radius;
      const length = Math.hypot(px, py);
      const scale = length > radius - 4 ? (radius - 4) / length : 1;
      const markerX = px * scale;
      const markerY = py * scale;
      ctx.fillStyle = type.priority ? COLORS.amber : COLORS.red;

      if (type.kamikaze) {
        const armed = Boolean(enemy.kamikazeArmed);
        const warningColor = armed ? COLORS.amber : COLORS.red;
        const pulse = 5 + Math.sin(performance.now() * (armed ? 0.028 : 0.012)) * 1.4;
        ctx.strokeStyle = warningColor;
        ctx.fillStyle = warningColor;
        ctx.globalAlpha = armed ? 0.9 : 0.68;
        ctx.beginPath();
        ctx.arc(markerX, markerY, pulse, 0, TAU);
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(markerX, markerY - 4);
        ctx.lineTo(markerX + 4, markerY + 3);
        ctx.lineTo(markerX - 4, markerY + 3);
        ctx.closePath();
        ctx.fill();
        ctx.globalAlpha = 1;
      } else if (type.airborne) {
        const attackRun =
          enemy.flightState === DRONE_FLIGHT_STATE.DIVING ||
          enemy.flightState === DRONE_FLIGHT_STATE.STRAFING;
        const pulse =
          4.5 +
          Math.sin(performance.now() * (attackRun ? 0.026 : 0.014) + enemy.id) * 0.8;
        ctx.save();
        ctx.translate(markerX, markerY);
        ctx.rotate(performance.now() * 0.0018 + enemy.id);
        ctx.strokeStyle = attackRun ? COLORS.amber : COLORS.red;
        ctx.globalAlpha = attackRun ? 1 : 0.82;
        ctx.beginPath();
        ctx.arc(0, 0, pulse, 0, TAU);
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(-5, 0);
        ctx.lineTo(5, 0);
        ctx.moveTo(0, -5);
        ctx.lineTo(0, 5);
        ctx.stroke();
        ctx.restore();
      } else if (type.id === "ghost") {
        const pulse = 4.5 + Math.sin(performance.now() * 0.012) * 1.2;
        ctx.strokeStyle = COLORS.red;
        ctx.globalAlpha = 0.58 + Math.sin(performance.now() * 0.009) * 0.18;
        ctx.beginPath();
        ctx.arc(markerX, markerY, pulse, 0, TAU);
        ctx.stroke();
        ctx.save();
        ctx.translate(markerX, markerY);
        ctx.rotate(Math.PI / 4);
        ctx.strokeRect(-3, -3, 6, 6);
        ctx.restore();
        ctx.globalAlpha = 1;
      } else if (type.priority) {
        const pulse = 5 + Math.sin(performance.now() * 0.01) * 1.5;
        ctx.strokeStyle = COLORS.amber;
        ctx.globalAlpha = 0.55;
        ctx.beginPath();
        ctx.arc(markerX, markerY, pulse, 0, TAU);
        ctx.stroke();
        ctx.globalAlpha = 1;
        ctx.save();
        ctx.translate(markerX, markerY);
        ctx.rotate(Math.PI / 4);
        ctx.fillRect(-3, -3, 6, 6);
        ctx.restore();
      } else {
        const markerSize = type.id === "light" ? 3 : 4;
        ctx.fillRect(
          markerX - markerSize / 2,
          markerY - markerSize / 2,
          markerSize,
          markerSize
        );
      }
    }

    for (const remote of remotePlayers.values()) {
      if (remote.missionPhase !== MISSION_PHASE.COMBAT) continue;
      const dx = remote.x - player.x;
      const dz = remote.z - player.z;
      const right = dx * Math.cos(yaw) - dz * Math.sin(yaw);
      const forward = dx * Math.sin(yaw) + dz * Math.cos(yaw);
      const px = (right / range) * radius;
      const py = (-forward / range) * radius;
      const length = Math.hypot(px, py);
      const scale = length > radius - 4 ? (radius - 4) / length : 1;
      ctx.fillStyle = COLORS.cyan;
      ctx.strokeStyle = COLORS.cyan;
      ctx.beginPath();
      ctx.arc(px * scale, py * scale, 3.2, 0, TAU);
      ctx.stroke();
      ctx.fillRect(px * scale - 1, py * scale - 1, 2, 2);
    }
    ctx.restore();

    ctx.fillStyle = COLORS.green;
    ctx.font = `${compact ? 7 : 9}px Courier New`;
    ctx.textAlign = "center";
    ctx.fillText("RADAR // 480m", x, y + radius + (compact ? 10 : 14));
  }

  function drawLinearCockpitGauge(
    x,
    y,
    gaugeWidth,
    gaugeHeight,
    label,
    valueText,
    progress,
    color,
    compact
  ) {
    const segments = compact ? 8 : 10;
    const innerX = x + 5;
    const innerWidth = gaugeWidth - 10;
    const gap = compact ? 1.5 : 2;
    const segmentWidth = (innerWidth - gap * (segments - 1)) / segments;
    const barY = y + gaugeHeight - (compact ? 7 : 9);
    const barHeight = compact ? 3 : 4;
    const activeSegments = Math.ceil(Math.max(0, Math.min(1, progress)) * segments);

    ctx.save();
    ctx.fillStyle = "rgba(1, 5, 3, 0.96)";
    ctx.strokeStyle = "rgba(46, 169, 92, 0.48)";
    ctx.lineWidth = 1;
    ctx.fillRect(x, y, gaugeWidth, gaugeHeight);
    ctx.strokeRect(x, y, gaugeWidth, gaugeHeight);
    ctx.font = `${compact ? 7 : 8}px Courier New`;
    ctx.textAlign = "left";
    ctx.fillStyle = color;
    ctx.fillText(label, x + 5, y + (compact ? 9 : 11));
    ctx.textAlign = "right";
    ctx.fillText(valueText, x + gaugeWidth - 5, y + (compact ? 9 : 11));
    for (let i = 0; i < segments; i += 1) {
      ctx.globalAlpha = i < activeSegments ? 0.92 : 0.14;
      ctx.fillRect(
        innerX + i * (segmentWidth + gap),
        barY,
        segmentWidth,
        barHeight
      );
    }
    ctx.restore();
  }

  function drawTurretCockpitGauge(layout, tank) {
    const { compact } = layout;
    const centerX = width * 0.5;
    const centerY = height - (compact ? 8 : 10);
    const radius = compact ? 43 : 63;
    const normalizedOffset = Math.max(-1, Math.min(1, player.turretOffset / Math.PI));
    const needleAngle = Math.PI * 1.5 + normalizedOffset * Math.PI * 0.5;
    const aligned = Math.abs(player.turretOffset) < 0.04;
    const ready = player.reload <= 0;
    const reloadProgress = ready
      ? 1
      : Math.max(0, 1 - player.reload / tank.reloadTime);
    const needleColor = aligned ? COLORS.amber : COLORS.green;

    ctx.save();
    ctx.fillStyle = "rgba(1, 5, 3, 0.96)";
    ctx.strokeStyle = "rgba(46, 169, 92, 0.55)";
    ctx.lineWidth = 1.1;
    ctx.beginPath();
    ctx.arc(centerX, centerY, radius + 8, Math.PI, TAU);
    ctx.lineTo(centerX + radius + 8, centerY);
    ctx.lineTo(centerX - radius - 8, centerY);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    ctx.globalAlpha = 0.55;
    ctx.beginPath();
    ctx.arc(centerX, centerY, radius, Math.PI, TAU);
    ctx.stroke();
    for (let i = 0; i <= 10; i += 1) {
      const angle = Math.PI + i / 10 * Math.PI;
      const inner = radius - (i === 5 ? 8 : 4);
      ctx.beginPath();
      ctx.moveTo(centerX + Math.cos(angle) * inner, centerY + Math.sin(angle) * inner);
      ctx.lineTo(centerX + Math.cos(angle) * radius, centerY + Math.sin(angle) * radius);
      ctx.stroke();
    }

    ctx.strokeStyle = ready ? COLORS.amber : COLORS.green;
    ctx.globalAlpha = 0.85;
    ctx.lineWidth = compact ? 2 : 2.5;
    ctx.beginPath();
    ctx.arc(
      centerX,
      centerY,
      radius - 9,
      Math.PI,
      Math.PI + Math.PI * reloadProgress
    );
    ctx.stroke();

    ctx.strokeStyle = needleColor;
    ctx.globalAlpha = 1;
    ctx.lineWidth = 1.6;
    ctx.beginPath();
    ctx.moveTo(centerX, centerY);
    ctx.lineTo(
      centerX + Math.cos(needleAngle) * (radius - 13),
      centerY + Math.sin(needleAngle) * (radius - 13)
    );
    ctx.stroke();
    ctx.fillStyle = needleColor;
    ctx.beginPath();
    ctx.arc(centerX, centerY, compact ? 2.5 : 3.5, 0, TAU);
    ctx.fill();

    if (alignmentPulse > 0) {
      ctx.globalAlpha = Math.min(1, alignmentPulse * 1.8);
      ctx.strokeStyle = COLORS.amber;
      ctx.beginPath();
      ctx.arc(centerX, centerY, radius + alignmentPulse * 10, Math.PI, TAU);
      ctx.stroke();
    }

    ctx.globalAlpha = 1;
    ctx.textAlign = "center";
    ctx.font = `${compact ? 7 : 8}px Courier New`;
    ctx.fillStyle = needleColor;
    ctx.fillText("TOURELLE", centerX, centerY - (compact ? 17 : 23));
    ctx.fillStyle = ready ? COLORS.amber : COLORS.green;
    ctx.fillText(
      ready ? "CANON PRET" : `CHARGE ${Math.round(reloadProgress * 100)}%`,
      centerX,
      centerY - (compact ? 7 : 11)
    );
    ctx.restore();
  }

  function drawHud() {
    const layout = getCockpitLayout();
    const { compact, consoleTop, sideWidth, radarX, radarRadius } = layout;
    const tank = getPlayerTank();
    const range = Math.round(tank.shellSpeed * tank.shellLifetime * 10);
    const coop = playMode !== "solo" && networkSnapshot.connected;
    const allyHealth = networkSnapshot.role === "host"
      ? coopHealth.guest
      : coopHealth.host;

    ctx.save();
    ctx.font = `${compact ? 7 : 9}px Courier New`;
    ctx.fillStyle = COLORS.amber;
    ctx.textAlign = "left";
    ctx.fillText(
      compact ? `${tank.label} ${range}m` : `${tank.label} // PORTEE ${range}m`,
      sideWidth + (compact ? 5 : 12),
      compact ? 12 : 15
    );
    ctx.fillStyle = COLORS.green;
    ctx.textAlign = "center";
    ctx.fillText(
      compact
        ? `S${String(player.score).padStart(5, "0")} V${String(player.wave).padStart(2, "0")} C${String(enemies.length).padStart(2, "0")}`
        : `SCORE ${String(player.score).padStart(6, "0")} // VAGUE ${String(player.wave).padStart(2, "0")} // CIBLES ${String(enemies.length).padStart(2, "0")}`,
      width * 0.5,
      compact ? 12 : 15
    );
    ctx.textAlign = "right";
    ctx.fillStyle = coop ? COLORS.cyan : COLORS.green;
    ctx.fillText(
      coop
        ? compact
          ? `COOP ${networkSnapshot.playerCount}/2`
          : `COOP ${networkSnapshot.playerCount}/2 // ${networkSnapshot.roomCode}`
        : compact
          ? "SYS OK"
          : "SYSTEMES NOMINAUX",
      width - sideWidth - (compact ? 5 : 12),
      compact ? 12 : 15
    );

    const gaugeHeight = compact ? 22 : 28;
    const gaugeGap = compact ? 3 : 5;
    const leftX = sideWidth + (compact ? 5 : 14);
    const leftWidth = compact
      ? Math.min(104, width * 0.27)
      : Math.min(190, width * 0.2);
    const gaugeTop = consoleTop + (compact ? 22 : 27);
    const speedProgress = Math.min(1, Math.abs(player.speed) / tank.forwardSpeed);
    drawLinearCockpitGauge(
      leftX,
      gaugeTop,
      leftWidth,
      gaugeHeight,
      "VITESSE",
      `${Math.round(player.speed * 10)}`,
      speedProgress,
      COLORS.green,
      compact
    );
    drawLinearCockpitGauge(
      leftX,
      gaugeTop + gaugeHeight + gaugeGap,
      leftWidth,
      gaugeHeight,
      "BLINDAGE",
      `${Math.ceil(player.health)}%`,
      player.health / 100,
      player.health < 30 ? COLORS.red : COLORS.green,
      compact
    );
    if (coop) {
      drawLinearCockpitGauge(
        leftX,
        gaugeTop + (gaugeHeight + gaugeGap) * 2,
        leftWidth,
        gaugeHeight,
        "COEQUIPIER",
        `${Math.ceil(allyHealth)}%`,
        allyHealth / 100,
        COLORS.cyan,
        compact
      );
    }

    if (!compact) {
      const reloadWidth = Math.min(158, width * 0.145);
      const reloadX = radarX - radarRadius - 18 - reloadWidth;
      const ready = player.reload <= 0;
      const reloadProgress = ready
        ? 1
        : Math.max(0, 1 - player.reload / tank.reloadTime);
      drawLinearCockpitGauge(
        reloadX,
        consoleTop + 36,
        reloadWidth,
        31,
        ready ? "CANON PRET" : "RECHARGE",
        ready ? "FEU" : `${Math.round(reloadProgress * 100)}%`,
        reloadProgress,
        ready ? COLORS.amber : COLORS.green,
        false
      );
    }

    drawTurretCockpitGauge(layout, tank);
    ctx.restore();
  }

  function drawIncomingArtilleryWarning() {
    let incoming = null;
    for (const shell of [...shells, ...remoteWorldShells]) {
      if (shell.kind !== "artillery") continue;
      const dangerDistance = Math.hypot(
        shell.targetX - player.x,
        shell.targetZ - player.z
      );
      if (dangerDistance > shell.blastRadius + 2.5) continue;
      if (!incoming || shell.life < incoming.life) incoming = shell;
    }
    if (!incoming) return;

    const urgent = incoming.life < 0.75;
    const visible = !urgent || Math.floor(performance.now() / 90) % 2 === 0;
    if (!visible) return;

    ctx.save();
    ctx.textAlign = "center";
    ctx.fillStyle = urgent ? COLORS.red : COLORS.amber;
    ctx.font = "700 11px Courier New";
    ctx.fillText(
      `⚠ IMPACT ARTILLERIE ${Math.max(0, incoming.life).toFixed(1)}s ⚠`,
      width / 2,
      88
    );
    ctx.restore();
  }

  function drawWaveBanner() {
    if (waveBanner <= 0) return;
    const alpha = Math.min(1, waveBanner, 2.8 - waveBanner);
    ctx.save();
    ctx.globalAlpha = Math.max(0, alpha);
    ctx.fillStyle = "rgba(2, 8, 5, 0.78)";
    ctx.fillRect(0, height * 0.23, width, 76);
    ctx.strokeStyle = COLORS.green;
    ctx.beginPath();
    ctx.moveTo(0, height * 0.23);
    ctx.lineTo(width, height * 0.23);
    ctx.moveTo(0, height * 0.23 + 76);
    ctx.lineTo(width, height * 0.23 + 76);
    ctx.stroke();
    ctx.textAlign = "center";
    ctx.fillStyle = COLORS.green;
    ctx.font = `900 ${Math.min(32, width * 0.075)}px Impact, sans-serif`;
    ctx.fillText(waveText, width / 2, height * 0.23 + 43);
    ctx.font = "9px Courier New";
    ctx.fillStyle = COLORS.amber;
    ctx.fillText("SIGNATURES HOSTILES DÉTECTÉES", width / 2, height * 0.23 + 61);
    ctx.restore();
  }

  function drawDropHud() {
    const tank = getPlayerTank();
    const progress = Math.min(1, dropElapsed / DROP_SEQUENCE.DURATION);
    const remaining = Math.max(0, DROP_SEQUENCE.DURATION - dropElapsed);
    const descentSpeed =
      (2 * DROP_SEQUENCE.START_HEIGHT * progress / DROP_SEQUENCE.DURATION) * 10;
    const centerX = width / 2;

    ctx.save();
    ctx.textAlign = "center";
    ctx.fillStyle = COLORS.amber;
    ctx.font = "10px Courier New";
    ctx.fillText(`LARGAGE TACTIQUE // ${tank.label}`, centerX, 32);
    ctx.fillStyle = COLORS.green;
    ctx.font = "12px Courier New";
    ctx.fillText(
      `ALT ${String(Math.ceil(player.altitude * 10)).padStart(4, "0")}m   V ${String(Math.round(descentSpeed)).padStart(3, "0")}m/s`,
      centerX,
      52
    );

    const gaugeHeight = Math.min(260, height * 0.34);
    const gaugeTop = height * 0.5 - gaugeHeight / 2;
    const gaugeX = width < 600 ? 18 : 30;
    ctx.strokeStyle = "rgba(120, 255, 154, 0.45)";
    ctx.strokeRect(gaugeX, gaugeTop, 6, gaugeHeight);
    ctx.fillStyle = COLORS.green;
    ctx.fillRect(
      gaugeX + 2,
      gaugeTop + 2 + (gaugeHeight - 4) * progress,
      2,
      (gaugeHeight - 4) * (1 - progress)
    );
    ctx.font = "8px Courier New";
    ctx.textAlign = "left";
    ctx.fillText("SOL", gaugeX + 13, gaugeTop + gaugeHeight);

    ctx.setLineDash([4, 6]);
    ctx.strokeStyle = "rgba(255, 211, 106, 0.45)";
    ctx.beginPath();
    ctx.moveTo(centerX - 82, horizon);
    ctx.lineTo(centerX - 34, horizon);
    ctx.moveTo(centerX + 34, horizon);
    ctx.lineTo(centerX + 82, horizon);
    ctx.stroke();
    ctx.setLineDash([]);

    ctx.textAlign = "center";
    if (remaining < 0.72) {
      const visible = Math.floor(performance.now() / 100) % 2 === 0;
      if (visible) {
        ctx.fillStyle = COLORS.amber;
        ctx.font = "700 12px Courier New";
        ctx.fillText("PRÉPAREZ L’IMPACT", centerX, height * 0.72);
      }
    } else {
      ctx.fillStyle = "rgba(120, 255, 154, 0.65)";
      ctx.font = "9px Courier New";
      ctx.fillText(`IMPACT ${remaining.toFixed(1)}s`, centerX, height * 0.72);
    }
    ctx.restore();
  }

  function drawLandingImpact() {
    if (landingPulse <= 0) return;
    const progress = 1 - landingPulse;
    const radius = 0.7 + progress * 14;
    const segments = 48;

    ctx.save();
    ctx.fillStyle = `rgba(220, 255, 228, ${landingPulse * 0.1})`;
    ctx.fillRect(0, 0, width, height);
    ctx.restore();

    for (let i = 0; i < segments; i += 1) {
      const angleA = i / segments * TAU;
      const angleB = (i + 1) / segments * TAU;
      const start = {
        x: player.x + Math.sin(angleA) * radius,
        y: 0.035,
        z: player.z + Math.cos(angleA) * radius
      };
      const end = {
        x: player.x + Math.sin(angleB) * radius,
        y: 0.035,
        z: player.z + Math.cos(angleB) * radius
      };
      line3d(start, end, COLORS.amber, 4, landingPulse * 0.08);
      line3d(start, end, COLORS.amber, 1.5, landingPulse * 0.78);
    }
  }

  function draw() {
    const shakeX = screenShake > 0 ? (Math.random() - 0.5) * screenShake : 0;
    const shakeY = screenShake > 0 ? (Math.random() - 0.5) * screenShake : 0;

    ctx.save();
    ctx.setTransform(dpr, 0, 0, dpr, shakeX * dpr, shakeY * dpr);
    ctx.fillStyle = COLORS.black;
    ctx.fillRect(-20, -20, width + 40, height + 40);

    if (missionPhase !== MISSION_PHASE.DROP || player.altitude < 8) {
      drawMoon();
      drawMountains();
    }
    drawGround();

    const renderables = [
      ...rocks.map((rock) => ({
        depth: distance(player, rock),
        draw: () => drawRock(rock)
      })),
      ...[...remotePlayers.values()].map((remote) => ({
        depth: distance(player, remote),
        draw: () => drawRemotePlayer(remote)
      })),
      ...enemies.map((enemy) => ({
        depth: distance(player, enemy),
        draw: () => drawEnemy(enemy)
      })),
      ...shells.map((shell) => ({
        depth: distance(player, shell),
        draw: () => drawShell(shell)
      })),
      ...remoteWorldShells.map((shell) => ({
        depth: distance(player, shell),
        draw: () => drawShell(shell)
      })),
      ...tankDebris.map((piece) => ({
        depth: distance(player, piece),
        draw: () => drawTankDebris(piece)
      })),
      ...particles.map((particle) => ({
        depth: distance(player, particle),
        draw: () => drawParticle(particle)
      }))
    ];
    renderables.sort((a, b) => b.depth - a.depth);
    for (const item of renderables) item.draw();

    drawLandingImpact();
    drawCockpit();
    if (missionPhase === MISSION_PHASE.DROP) {
      drawDropHud();
    } else {
      drawReticle();
      drawRadar();
      drawHud();
      drawWaveBanner();
      drawIncomingArtilleryWarning();
    }
    if (!pointerLocked && running && !paused && !gameOver) {
      ctx.fillStyle = "rgba(2, 8, 5, 0.72)";
      ctx.fillRect(width / 2 - 128, height - 92, 256, 27);
      ctx.strokeStyle = "rgba(120, 255, 154, 0.35)";
      ctx.strokeRect(width / 2 - 128, height - 92, 256, 27);
      ctx.fillStyle = COLORS.green;
      ctx.textAlign = "center";
      ctx.font = "9px Courier New";
      ctx.fillText("CLIQUER POUR ACTIVER LA TOURELLE", width / 2, height - 75);
    }

    if (flash > 0) {
      ctx.fillStyle = `rgba(255, 105, 94, ${flash * 0.17})`;
      ctx.fillRect(0, 0, width, height);
    }
    ctx.restore();
  }

  function randomSpawn(minDistance = 28, maxDistance = 54) {
    const angle = Math.random() * TAU;
    const range = minDistance + Math.random() * (maxDistance - minDistance);
    return {
      x: Math.max(-WORLD_LIMIT + 5, Math.min(WORLD_LIMIT - 5, player.x + Math.sin(angle) * range)),
      z: Math.max(-WORLD_LIMIT + 5, Math.min(WORLD_LIMIT - 5, player.z + Math.cos(angle) * range))
    };
  }

  function getWaveEnemyType(index, count) {
    if (index === count - 1) return ENEMY_TYPES.artillery;
    if (player.wave >= 3 && index === count - 2) {
      return ENEMY_TYPES.guardian;
    }
    if (player.wave >= 4 && index === count - 3) {
      return ENEMY_TYPES.ghost;
    }
    if (player.wave >= 5 && index === count - 4) {
      return ENEMY_TYPES.kamikaze;
    }
    if (player.wave >= 6 && index === count - 5) {
      return ENEMY_TYPES.drone;
    }
    if (index % 3 === 1) return ENEMY_TYPES.light;
    return ENEMY_TYPES.assault;
  }

  function createEnemy(type, position) {
    const initialHeading = Math.atan2(
      player.x - position.x,
      player.z - position.z
    );
    const assaultBonus = type.id === "assault" && player.wave >= 4 ? 1 : 0;
    const artilleryBonus = type.id === "artillery" && player.wave >= 6 ? 1 : 0;
    const health = type.health + assaultBonus + artilleryBonus;

    return {
      id: ++enemySerial,
      typeId: type.id,
      x: position.x,
      z: position.z,
      heading: initialHeading,
      turretHeading: initialHeading,
      speed:
        type.speed +
        Math.random() * type.speedVariance +
        (type.static ? 0 : player.wave * 0.08),
      health,
      maxHealth: health,
      reload:
        type.id === "artillery"
          ? 3 + Math.random() * 1.2
          : 1.2 + Math.random() * 2,
      preferredRange:
        type.preferredRangeMin +
        Math.random() * (type.preferredRangeMax - type.preferredRangeMin),
      strafeDirection: Math.random() < 0.5 ? -1 : 1,
      flankSide: 0,
      flankTimer: 0,
      targetRole: null,
      targetLockTimer: 0,
      blockedSightTimer: 0,
      state: type.static ? ENEMY_STATE.ENGAGE : ENEMY_STATE.APPROACH,
      stateTimer: Math.random() * 0.4,
      hitFlash: 0,
      shieldSourceId: 0,
      shieldCharge: 0,
      shieldCooldown: 0,
      shieldFlash: 0,
      revealTimer: 0,
      revealDuration: 2.4,
      revealFlash: 0,
      kamikazeArmed: false,
      fuseTimer: 0,
      fuseDuration: KAMIKAZE_FUSE_TIME,
      elevation: type.airborne ? DRONE_CRUISE_ALTITUDE : 0,
      flightState: type.airborne ? DRONE_FLIGHT_STATE.CRUISING : null,
      flightTimer: 0,
      attackCooldown: type.airborne ? 1.5 + Math.random() * 2.2 : 0,
      attackFired: false
    };
  }

  function isEnemySpawnClear(position, type) {
    const radius = 1.25 * type.scale;
    const hitsRock = rocks.some((rock) =>
      distance(position, rock) < radius + rock.radius + 1.5
    );
    if (hitsRock) return false;

    return enemies.every((enemy) => {
      const otherRadius = 1.25 * getEnemyType(enemy).scale;
      return distance(position, enemy) >= radius + otherRadius + 2.2;
    });
  }

  function findEnemySpawn(type, minimumRange, maximumRange, index) {
    for (let attempt = 0; attempt < 36; attempt += 1) {
      const position = randomSpawn(minimumRange, maximumRange);
      if (isEnemySpawnClear(position, type)) return position;
    }

    const slices = 24;
    const rings = 4;
    for (let ring = 0; ring < rings; ring += 1) {
      const range =
        minimumRange +
        (maximumRange - minimumRange) * ((ring + 0.5) / rings);
      for (let slice = 0; slice < slices; slice += 1) {
        const angle =
          (slice / slices) * TAU +
          index * 0.73 +
          player.wave * 0.31;
        const position = {
          x: Math.max(
            -WORLD_LIMIT + 5,
            Math.min(WORLD_LIMIT - 5, player.x + Math.sin(angle) * range)
          ),
          z: Math.max(
            -WORLD_LIMIT + 5,
            Math.min(WORLD_LIMIT - 5, player.z + Math.cos(angle) * range)
          )
        };
        if (isEnemySpawnClear(position, type)) return position;
      }
    }

    const fallbackAngle = index / Math.max(1, enemies.length + 1) * TAU;
    return {
      x: Math.max(
        -WORLD_LIMIT + 5,
        Math.min(WORLD_LIMIT - 5, player.x + Math.sin(fallbackAngle) * maximumRange)
      ),
      z: Math.max(
        -WORLD_LIMIT + 5,
        Math.min(WORLD_LIMIT - 5, player.z + Math.cos(fallbackAngle) * maximumRange)
      )
    };
  }

  function spawnWave() {
    player.wave += 1;
    const count = Math.min(3 + player.wave, 9);
    for (let i = 0; i < count; i += 1) {
      const type = getWaveEnemyType(i, count);
      const minimumRange =
        type.id === "artillery"
          ? 44
          : type.id === "drone"
            ? 36
          : type.id === "kamikaze"
            ? 38
            : 30;
      const maximumRange =
        type.id === "artillery"
          ? 66
          : type.id === "drone"
            ? 62
          : type.id === "guardian"
            ? 52
            : type.id === "ghost"
              ? 62
              : 58;
      const position = findEnemySpawn(type, minimumRange, maximumRange, i);
      enemies.push(createEnemy(type, position));
    }
    waveText = `VAGUE ${String(player.wave).padStart(2, "0")}`;
    waveBanner = 2.8;
    tone(240, 0.08, "square", 0.035);
    setTimeout(() => tone(360, 0.12, "square", 0.03), 110);
  }

  function seededRandom(seed) {
    let value = seed >>> 0;
    return () => {
      value += 0x6d2b79f5;
      let mixed = value;
      mixed = Math.imul(mixed ^ mixed >>> 15, mixed | 1);
      mixed ^= mixed + Math.imul(mixed ^ mixed >>> 7, mixed | 61);
      return ((mixed ^ mixed >>> 14) >>> 0) / 4294967296;
    };
  }

  function createRocks(seed = Math.floor(Math.random() * 0xffffffff)) {
    const random = seededRandom(seed);
    rocks.length = 0;
    for (let i = 0; i < 24; i += 1) {
      const angle = random() * TAU;
      const radiusFromCenter = 12 + random() * 62;
      rocks.push({
        x: Math.sin(angle) * radiusFromCenter,
        z: Math.cos(angle) * radiusFromCenter,
        radius: 0.8 + random() * 1.9,
        height: 1.2 + random() * 3.2,
        seed: random() * TAU
      });
    }
  }

  function resetGame() {
    enemies.length = 0;
    shells.length = 0;
    remoteWorldShells.length = 0;
    particles.length = 0;
    tankDebris.length = 0;
    enemySerial = 0;
    shellSerial = 0;
    const coopSpawnX =
      playMode === "solo"
        ? 0
        : networkSnapshot.role === "host"
          ? -2.2
          : 2.2;
    Object.assign(player, {
      tankId: selectedTankId,
      x: coopSpawnX,
      altitude: DROP_SEQUENCE.START_HEIGHT,
      z: 4,
      heading: 0,
      turretOffset: 0,
      speed: 0,
      health: 100,
      reload: 0,
      score: 0,
      wave: 0,
      kills: 0,
      invulnerable: 0
    });
    recenteringTurret = false;
    turretWasAligned = true;
    alignmentPulse = 0;
    kamikazeWarningTimer = 0;
    screenShake = 0;
    flash = 0;
    waveBanner = 0;
    waveText = "";
    missionPhase = MISSION_PHASE.DROP;
    dropElapsed = 0;
    landingPulse = 0;
    localStateSequence = 0;
    localShotSequence = 0;
    sharedWorldSequence = 0;
    appliedWorldSequence = -1;
    sharedGameOver = false;
    coopHealth.host = 100;
    coopHealth.guest = 100;
    coopInvulnerability.host = 0;
    coopInvulnerability.guest = 0;
    lastLocalShot = {
      x: coopSpawnX,
      z: 4,
      yaw: 0,
      tankId: selectedTankId
    };
    cameraPitch = DROP_SEQUENCE.START_PITCH;
    update.nextWaveTimer = 0;
    createRocks(
      playMode === "solo"
        ? Math.floor(Math.random() * 0xffffffff)
        : Number(networkSnapshot.meta?.worldSeed) || 1
    );
    gameOver = false;
    paused = false;
    pauseLabel.classList.add("hidden");
    messagePanel.classList.add("hidden");
  }

  function startGame() {
    initAudio();
    resetGame();
    running = true;
    startScreen.classList.add("hidden");
    canvas.requestPointerLock?.();
    lastTime = performance.now();
  }

  function returnToHangar() {
    resetGame();
    running = false;
    missionPhase = MISSION_PHASE.IDLE;
    player.altitude = 0;
    cameraPitch = 0;
    remotePlayers.clear();
    if (playMode !== "solo" && networkSnapshot.connected) {
      network.leaveRoom().catch(() => {});
    }
    startScreen.classList.remove("hidden");
    document.exitPointerLock?.();
  }

  function endGame() {
    gameOver = true;
    running = false;
    document.exitPointerLock?.();
    messageKicker.textContent = "SIGNAL DU CHAR PERDU";
    messageTitle.textContent = "MISSION TERMINÉE";
    messageCopy.textContent =
      `Score ${String(player.score).padStart(6, "0")} · ${player.kills} tanks neutralisés · vague ${player.wave} atteinte.`;
    messagePanel.classList.remove("hidden");
    tone(130, 0.5, "sawtooth", 0.05);
  }

  function togglePause() {
    if (!running || gameOver) return;
    paused = !paused;
    pauseLabel.classList.toggle("hidden", !paused);
    if (paused) document.exitPointerLock?.();
    lastTime = performance.now();
  }

  function initAudio() {
    if (!audioContext) {
      const AudioCtor = window.AudioContext || window.webkitAudioContext;
      if (AudioCtor) audioContext = new AudioCtor();
    }
    if (audioContext?.state === "suspended") audioContext.resume();
  }

  function tone(frequency, duration, type = "square", volume = 0.025, slide = 0) {
    if (!audioContext) return;
    const oscillator = audioContext.createOscillator();
    const gain = audioContext.createGain();
    const now = audioContext.currentTime;
    oscillator.type = type;
    oscillator.frequency.setValueAtTime(frequency, now);
    oscillator.frequency.linearRampToValueAtTime(Math.max(35, frequency + slide), now + duration);
    gain.gain.setValueAtTime(volume, now);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + duration);
    oscillator.connect(gain);
    gain.connect(audioContext.destination);
    oscillator.start(now);
    oscillator.stop(now + duration);
  }

  function burst(x, z, color, count = 14, baseY = 0.4) {
    for (let i = 0; i < count; i += 1) {
      const angle = Math.random() * TAU;
      const speed = 1.8 + Math.random() * 7;
      const life = 0.35 + Math.random() * 0.55;
      particles.push({
        x,
        y: baseY + Math.random() * 0.7,
        z,
        vx: Math.cos(angle) * speed,
        vy: 1.8 + Math.random() * 5,
        vz: Math.sin(angle) * speed,
        life,
        maxLife: life,
        size: 18 + Math.random() * 35,
        color
      });
    }
  }

  function createTankDebris(enemy) {
    const type = getEnemyType(enemy);
    const typeSeed =
      type.id === "artillery"
        ? 0x7f4a7c15
        : type.id === "light"
          ? 0x4cf5ad43
          : 0x2c9277b5;
    const seed =
      ((Number(enemy.id) || 1) * 0x9e3779b1 ^ typeSeed) >>> 0;
    const random = seededRandom(seed || 1);
    const headingCos = Math.cos(enemy.heading);
    const headingSin = Math.sin(enemy.heading);
    const color = type.priority ? COLORS.amber : COLORS.red;

    for (const layout of TANK_DEBRIS_LAYOUT) {
      const scale = type.scale * (0.9 + random() * 0.22);
      const localX = layout.x * type.scale;
      const localZ = layout.z * type.scale;
      const launchAngle = random() * TAU;
      const launchSpeed = 1.6 + random() * 2.8;
      const velocityX =
        layout.x * 1.35 + Math.sin(launchAngle) * launchSpeed;
      const velocityZ =
        layout.z * 1.35 + Math.cos(launchAngle) * launchSpeed;
      const life = 1.3 + random() * 0.55;

      tankDebris.push({
        x: enemy.x + localX * headingCos + localZ * headingSin,
        y: (enemy.elevation ?? 0) + layout.y * type.scale,
        z: enemy.z - localX * headingSin + localZ * headingCos,
        vx: velocityX * headingCos + velocityZ * headingSin,
        vy: 3.1 + layout.lift + random() * 3.4,
        vz: -velocityX * headingSin + velocityZ * headingCos,
        yaw: enemy.heading + (random() - 0.5) * 0.5,
        pitch: (random() - 0.5) * 0.8,
        roll: (random() - 0.5) * 0.8,
        spinYaw: (random() - 0.5) * 6.5,
        spinPitch: (random() - 0.5) * 7.5,
        spinRoll: (random() - 0.5) * 7.5,
        shape: TANK_DEBRIS_SHAPES[layout.shape],
        scale,
        color,
        age: 0,
        life,
        maxLife: life,
        bounced: false
      });
    }

    if (tankDebris.length > MAX_TANK_DEBRIS) {
      tankDebris.splice(0, tankDebris.length - MAX_TANK_DEBRIS);
    }
  }

  function createMuzzleSmoke(yaw) {
    const originX = player.x + Math.sin(yaw) * 2.05;
    const originZ = player.z + Math.cos(yaw) * 2.05;

    for (let i = 0; i < 8; i += 1) {
      const spread = (Math.random() - 0.5) * 0.7;
      const smokeHeading = yaw + spread;
      const speed = 0.45 + Math.random() * 1.1;
      const life = 0.48 + Math.random() * 0.42;
      const lateralOffset = (Math.random() - 0.5) * 0.28;
      particles.push({
        kind: "smoke",
        x: originX + Math.cos(yaw) * lateralOffset,
        y: 0.82 + Math.random() * 0.16,
        z: originZ - Math.sin(yaw) * lateralOffset,
        vx: Math.sin(smokeHeading) * speed,
        vy: 0.18 + Math.random() * 0.5,
        vz: Math.cos(smokeHeading) * speed,
        gravity: -0.12,
        drag: 2.2,
        growth: 18 + Math.random() * 14,
        life,
        maxLife: life,
        size: 11 + Math.random() * 8,
        color: i % 2 === 0 ? "#9ab89f" : "#6f8f76"
      });
    }
  }

  function createLandingDust() {
    for (let i = 0; i < 30; i += 1) {
      const angle = Math.random() * TAU;
      const speed = 3.5 + Math.random() * 6.5;
      const life = 0.65 + Math.random() * 0.55;
      const startRadius = 1.2 + Math.random() * 1.2;
      particles.push({
        kind: "smoke",
        x: player.x + Math.sin(angle) * startRadius,
        y: 0.12 + Math.random() * 0.25,
        z: player.z + Math.cos(angle) * startRadius,
        vx: Math.sin(angle) * speed,
        vy: 0.4 + Math.random() * 1.2,
        vz: Math.cos(angle) * speed,
        gravity: 0.7,
        drag: 1.35,
        growth: 22 + Math.random() * 18,
        life,
        maxLife: life,
        size: 13 + Math.random() * 12,
        color: i % 2 === 0 ? "#98aa8b" : "#63765f"
      });
    }
  }

  function createBlastSmoke(x, z) {
    for (let i = 0; i < 18; i += 1) {
      const angle = Math.random() * TAU;
      const speed = 0.8 + Math.random() * 3.4;
      const life = 0.8 + Math.random() * 0.75;
      particles.push({
        kind: "smoke",
        x: x + (Math.random() - 0.5) * 1.4,
        y: 0.18 + Math.random() * 0.45,
        z: z + (Math.random() - 0.5) * 1.4,
        vx: Math.sin(angle) * speed,
        vy: 1 + Math.random() * 2.2,
        vz: Math.cos(angle) * speed,
        gravity: -0.08,
        drag: 1.25,
        growth: 24 + Math.random() * 22,
        life,
        maxLife: life,
        size: 16 + Math.random() * 14,
        color: i % 2 === 0 ? "#9a9d83" : "#666f62"
      });
    }
  }

  function firePlayer() {
    if (
      !running ||
      paused ||
      gameOver ||
      missionPhase !== MISSION_PHASE.COMBAT ||
      player.reload > 0
    ) return;
    const tank = getPlayerTank();
    const yaw = player.heading + player.turretOffset;
    shells.push({
      id: ++shellSerial,
      kind: "direct",
      x: player.x + Math.sin(yaw) * 1.8,
      y: 0.86,
      z: player.z + Math.cos(yaw) * 1.8,
      vx: Math.sin(yaw) * tank.shellSpeed,
      vz: Math.cos(yaw) * tank.shellSpeed,
      life: tank.shellLifetime,
      owner: "player"
    });
    localShotSequence += 1;
    lastLocalShot = {
      x: player.x,
      z: player.z,
      yaw,
      tankId: player.tankId
    };
    createMuzzleSmoke(yaw);
    player.reload = tank.reloadTime;
    screenShake = 5;
    tone(74, 0.12, "sawtooth", 0.07, -28);
    tone(190, 0.05, "square", 0.035, -80);
  }

  function spawnRemotePlayerShot(shot) {
    if (!running || missionPhase !== MISSION_PHASE.COMBAT) return;
    const tank = PLAYER_TANKS[shot.shotTankId] ?? PLAYER_TANKS.scout;
    shells.push({
      id: ++shellSerial,
      kind: "direct",
      x: shot.shotX + Math.sin(shot.shotYaw) * 1.8,
      y: 0.86,
      z: shot.shotZ + Math.cos(shot.shotYaw) * 1.8,
      vx: Math.sin(shot.shotYaw) * tank.shellSpeed,
      vz: Math.cos(shot.shotYaw) * tank.shellSpeed,
      life: tank.shellLifetime,
      owner: "ally"
    });
    tone(92, 0.08, "square", 0.012, -30);
  }

  function createGhostMuzzleSmoke(enemy, shotYaw) {
    const originX = enemy.x + Math.sin(shotYaw) * 2.05;
    const originZ = enemy.z + Math.cos(shotYaw) * 2.05;
    for (let i = 0; i < 6; i += 1) {
      const smokeYaw = shotYaw + (Math.random() - 0.5) * 0.55;
      const speed = 0.5 + Math.random() * 1.15;
      const life = 0.42 + Math.random() * 0.38;
      particles.push({
        kind: "smoke",
        x: originX + (Math.random() - 0.5) * 0.22,
        y: 0.72 + Math.random() * 0.16,
        z: originZ + (Math.random() - 0.5) * 0.22,
        vx: Math.sin(smokeYaw) * speed,
        vy: 0.2 + Math.random() * 0.42,
        vz: Math.cos(smokeYaw) * speed,
        gravity: -0.08,
        drag: 1.9,
        growth: 15 + Math.random() * 11,
        life,
        maxLife: life,
        size: 12 + Math.random() * 10,
        color: "#83998b"
      });
    }
  }

  function revealGhost(enemy, duration, flash = 0.1) {
    if (getEnemyType(enemy).id !== "ghost") return;
    enemy.revealTimer = Math.max(enemy.revealTimer ?? 0, duration);
    enemy.revealDuration = Math.max(enemy.revealDuration ?? 0, duration);
    enemy.revealFlash = Math.max(enemy.revealFlash ?? 0, flash);
  }

  function fireEnemy(enemy, target) {
    const type = getEnemyType(enemy);
    const accuracy = Math.min(0.18, 0.08 + distance(target, enemy) * 0.0015);
    const shotYaw = enemy.turretHeading + (Math.random() - 0.5) * accuracy;
    const muzzleY = type.airborne
      ? (enemy.elevation ?? 0) + 0.34 * type.scale
      : 0.72;
    shells.push({
      id: ++shellSerial,
      kind: "direct",
      x: enemy.x + Math.sin(shotYaw) * 1.7,
      y: muzzleY,
      z: enemy.z + Math.cos(shotYaw) * 1.7,
      vx: Math.sin(shotYaw) * type.shellSpeed,
      vz: Math.cos(shotYaw) * type.shellSpeed,
      life: type.shellLifetime,
      owner: "enemy",
      targetRole: target.role
    });
    if (type.id === "ghost") {
      revealGhost(enemy, 2.4, 0.13);
      createGhostMuzzleSmoke(enemy, shotYaw);
    }
    tone(105, 0.08, "square", 0.018, -35);
  }

  function fireArtillery(enemy, target) {
    const type = getEnemyType(enemy);
    const muzzle = orientedPoint(enemy, 0, 1.45, 1.55, enemy.turretHeading);
    const leadTime = 0.7 + Math.random() * 0.35;
    const targetX = Math.max(
      -WORLD_LIMIT + 2,
      Math.min(
        WORLD_LIMIT - 2,
        target.x +
          Math.sin(target.heading) * (target.speed ?? 0) * leadTime +
          (Math.random() - 0.5) * 2.2
      )
    );
    const targetZ = Math.max(
      -WORLD_LIMIT + 2,
      Math.min(
        WORLD_LIMIT - 2,
        target.z +
          Math.cos(target.heading) * (target.speed ?? 0) * leadTime +
          (Math.random() - 0.5) * 2.2
      )
    );
    const flightTime = type.shellFlightTime + (Math.random() - 0.5) * 0.3;
    const shotRange = Math.hypot(targetX - muzzle.x, targetZ - muzzle.z);

    shells.push({
      id: ++shellSerial,
      kind: "artillery",
      owner: "enemy",
      targetRole: target.role,
      x: muzzle.x,
      y: muzzle.y,
      z: muzzle.z,
      startX: muzzle.x,
      startY: muzzle.y,
      startZ: muzzle.z,
      targetX,
      targetZ,
      elapsed: 0,
      flightTime,
      life: flightTime,
      arcHeight: 4.5 + shotRange * 0.045,
      blastRadius: type.blastRadius,
      blastDamage: type.blastDamage,
      trail: []
    });
    tone(66, 0.2, "sawtooth", 0.045, -20);
  }

  function circleCollision(x, z, radius, obstacles = rocks) {
    return obstacles.some((obstacle) =>
      Math.hypot(x - obstacle.x, z - obstacle.z) < radius + obstacle.radius * 0.78
    );
  }

  function resolveSlidingMovement(
    x,
    z,
    moveX,
    moveZ,
    radius,
    movingObstacles = null,
    ignoredObstacle = null
  ) {
    const requestedDistance = Math.hypot(moveX, moveZ);
    const worldEdge = WORLD_LIMIT - Math.max(1, radius);
    let nextX = x + moveX;
    let nextZ = z + moveZ;
    let collided = false;
    let collisionSeverity = 0;

    const recordContact = (normalX, normalZ) => {
      collided = true;
      if (requestedDistance <= 0.0001) return;
      const inwardSpeed =
        -(moveX * normalX + moveZ * normalZ) / requestedDistance;
      collisionSeverity = Math.max(
        collisionSeverity,
        Math.max(0, Math.min(1, inwardSpeed))
      );
    };

    if (nextX > worldEdge) {
      nextX = worldEdge;
      recordContact(-1, 0);
    } else if (nextX < -worldEdge) {
      nextX = -worldEdge;
      recordContact(1, 0);
    }
    if (nextZ > worldEdge) {
      nextZ = worldEdge;
      recordContact(0, -1);
    } else if (nextZ < -worldEdge) {
      nextZ = -worldEdge;
      recordContact(0, 1);
    }

    const pushOutside = (obstacle, obstacleRadius) => {
      const minimumDistance = radius + obstacleRadius;
      let offsetX = nextX - obstacle.x;
      let offsetZ = nextZ - obstacle.z;
      const obstacleDistance = Math.hypot(offsetX, offsetZ);
      if (obstacleDistance >= minimumDistance) return false;
      let normalDistance = obstacleDistance;

      if (normalDistance < 0.0001) {
        offsetX = x - obstacle.x;
        offsetZ = z - obstacle.z;
        normalDistance = Math.hypot(offsetX, offsetZ);
      }
      if (normalDistance < 0.0001 && requestedDistance > 0.0001) {
        offsetX = -moveX;
        offsetZ = -moveZ;
        normalDistance = requestedDistance;
      }
      if (normalDistance < 0.0001) {
        offsetX = 1;
        offsetZ = 0;
        normalDistance = 1;
      }

      const normalX = offsetX / normalDistance;
      const normalZ = offsetZ / normalDistance;
      const correction = minimumDistance - obstacleDistance + 0.001;
      nextX += normalX * correction;
      nextZ += normalZ * correction;
      recordContact(normalX, normalZ);
      return true;
    };

    // Quelques passes suffisent pour les coins formés par plusieurs obstacles.
    for (let pass = 0; pass < 4; pass += 1) {
      let corrected = false;
      for (const rock of rocks) {
        corrected =
          pushOutside(rock, rock.radius * 0.78) || corrected;
      }
      if (movingObstacles) {
        for (const obstacle of movingObstacles) {
          if (obstacle === ignoredObstacle) continue;
          if ((obstacle.elevation ?? 0) > 0.45) continue;
          const obstacleType = getEnemyType(obstacle);
          corrected =
            pushOutside(obstacle, 1.12 * obstacleType.scale) ||
            corrected;
        }
      }

      const clampedX = Math.max(-worldEdge, Math.min(worldEdge, nextX));
      const clampedZ = Math.max(-worldEdge, Math.min(worldEdge, nextZ));
      corrected =
        corrected || clampedX !== nextX || clampedZ !== nextZ;
      nextX = clampedX;
      nextZ = clampedZ;
      if (!corrected) break;
    }

    const travelledDistance = Math.hypot(nextX - x, nextZ - z);
    return {
      x: nextX,
      z: nextZ,
      collided,
      collisionSeverity,
      travelRatio:
        requestedDistance > 0.0001
          ? Math.min(1, travelledDistance / requestedDistance)
          : 0
    };
  }

  function updatePlayer(dt) {
    const tank = getPlayerTank();
    const forward = keys.has("KeyW") || keys.has("ArrowUp");
    const backward = keys.has("KeyS") || keys.has("ArrowDown");
    const left = keys.has("KeyA") || keys.has("ArrowLeft");
    const right = keys.has("KeyD") || keys.has("ArrowRight");
    const targetSpeed = forward ? tank.forwardSpeed : backward ? -tank.reverseSpeed : 0;
    const response = targetSpeed === 0 ? tank.coastResponse : tank.acceleration;
    player.speed += (targetSpeed - player.speed) * Math.min(1, dt * response);

    if (left || right) {
      const speedPenalty = Math.min(Math.abs(player.speed), tank.forwardSpeed) * 0.025;
      const turn = (right ? 1 : -1) * dt * (tank.turnRate - speedPenalty);
      player.heading = normalizeAngle(player.heading + turn);
    }

    if (recenteringTurret) {
      const maxStep = 2.8 * dt;
      if (Math.abs(player.turretOffset) <= maxStep) {
        player.turretOffset = 0;
        recenteringTurret = false;
      } else {
        player.turretOffset -= Math.sign(player.turretOffset) * maxStep;
      }
    }

    const turretAligned = Math.abs(player.turretOffset) < 0.025;
    if (turretAligned && !turretWasAligned) {
      player.turretOffset = 0;
      alignmentPulse = 0.65;
      tone(520, 0.055, "square", 0.018, 80);
    }
    turretWasAligned = turretAligned;

    const movement = resolveSlidingMovement(
      player.x,
      player.z,
      Math.sin(player.heading) * player.speed * dt,
      Math.cos(player.heading) * player.speed * dt,
      1.05
    );
    player.x = movement.x;
    player.z = movement.z;
    if (movement.collided) {
      const surfaceFriction =
        0.985 - 0.235 * movement.collisionSeverity ** 2;
      player.speed *= surfaceFriction;
    }

    player.reload = Math.max(0, player.reload - dt);
    player.invulnerable = Math.max(0, player.invulnerable - dt);
    alignmentPulse = Math.max(0, alignmentPulse - dt);
  }

  function chooseEnemyState(enemy, range) {
    const type = getEnemyType(enemy);
    if (range > enemy.preferredRange + ENEMY_AI.APPROACH_MARGIN) {
      enemy.state = ENEMY_STATE.APPROACH;
    } else if (range < enemy.preferredRange - ENEMY_AI.RETREAT_MARGIN) {
      enemy.state = ENEMY_STATE.RETREAT;
    } else {
      enemy.state = ENEMY_STATE.ENGAGE;
      if (type.id !== "light" && Math.random() < 0.22) {
        enemy.strafeDirection *= -1;
      }
    }

    enemy.stateTimer =
      ENEMY_AI.DECISION_MIN +
        Math.random() * (ENEMY_AI.DECISION_MAX - ENEMY_AI.DECISION_MIN);
  }

  function updateLightFlankIntent(enemy, target, dt) {
    enemy.flankTimer = Math.max(0, (enemy.flankTimer ?? 0) - dt);
    if (enemy.flankTimer > 0) return;

    const angleFromTarget = Math.atan2(
      enemy.x - target.x,
      enemy.z - target.z
    );
    const relativeSide = Math.sin(
      normalizeAngle(angleFromTarget - target.heading)
    );
    let flankSide = enemy.flankSide || (relativeSide >= 0 ? 1 : -1);
    if (Math.abs(relativeSide) < 0.22 && !enemy.flankSide) {
      flankSide = enemy.id % 2 === 0 ? 1 : -1;
    }
    if ((enemy.blockedSightTimer ?? 0) > 0.28) {
      flankSide *= -1;
    } else if (enemy.flankSide && Math.random() < 0.18) {
      flankSide *= -1;
    }

    enemy.flankSide = flankSide;
    enemy.strafeDirection = flankSide;
    enemy.flankTimer = 3.2 + Math.random() * 2.4;
  }

  function getEnemyMovementPlan(enemy, targetHeading) {
    const type = getEnemyType(enemy);
    if (type.kamikaze) {
      return {
        heading: targetHeading,
        speedScale: enemy.kamikazeArmed ? 0.42 : 1
      };
    }
    const ghost = type.id === "ghost";
    const flanker = type.id === "light";
    switch (enemy.state) {
      case ENEMY_STATE.RETREAT:
        return {
          heading:
            targetHeading +
            Math.PI +
            enemy.strafeDirection * (ghost ? 0.42 : flanker ? 0.34 : 0.22),
          speedScale: ghost || flanker ? 1 : 0.86
        };
      case ENEMY_STATE.ENGAGE:
        return {
          heading:
            targetHeading +
            enemy.strafeDirection * (ghost ? 1.42 : flanker ? 1.52 : 1.24),
          speedScale: ghost ? 0.9 : flanker ? 0.86 : 0.72
        };
      case ENEMY_STATE.REPOSITION:
        return {
          heading:
            targetHeading +
            enemy.strafeDirection * (ghost ? 1.95 : flanker ? 2.05 : 1.75),
          speedScale: ghost || flanker ? 1 : 0.92
        };
      case ENEMY_STATE.APPROACH:
      default:
        return {
          heading:
            targetHeading +
            enemy.strafeDirection * (ghost ? 0.48 : flanker ? 0.38 : 0.18),
          speedScale: 1
        };
    }
  }

  function updateEnemyMovement(
    enemy,
    targetHeading,
    range,
    dt,
    lineOfFireClear = true
  ) {
    const type = getEnemyType(enemy);
    if (type.static) return;

    if (type.kamikaze) {
      enemy.state = ENEMY_STATE.APPROACH;
    } else {
      enemy.stateTimer -= dt;
      const needsFiringLane =
        type.fireRange > 0 &&
        range < type.fireRange &&
        !lineOfFireClear;
      enemy.blockedSightTimer = needsFiringLane
        ? (enemy.blockedSightTimer ?? 0) + dt
        : Math.max(0, (enemy.blockedSightTimer ?? 0) - dt * 2);

      if (needsFiringLane && enemy.blockedSightTimer > 0.16) {
        if (
          enemy.state !== ENEMY_STATE.REPOSITION ||
          enemy.stateTimer <= 0
        ) {
          if (type.id !== "light" && Math.random() < 0.35) {
            enemy.strafeDirection *= -1;
          }
          enemy.state = ENEMY_STATE.REPOSITION;
          enemy.stateTimer = 0.75 + Math.random() * 0.45;
        }
      } else if (
        range < ENEMY_AI.EMERGENCY_RANGE &&
        enemy.state !== ENEMY_STATE.RETREAT
      ) {
        enemy.state = ENEMY_STATE.RETREAT;
        enemy.stateTimer = 0.6;
      } else if (enemy.stateTimer <= 0) {
        chooseEnemyState(enemy, range);
      }
    }

    const plan = getEnemyMovementPlan(enemy, targetHeading);
    enemy.heading = turnTowardAngle(
      enemy.heading,
      plan.heading,
      (type.chassisTurnRate ?? ENEMY_AI.CHASSIS_TURN_RATE) * dt
    );

    const moveSpeed = enemy.speed * plan.speedScale;
    const collisionRadius = 1.12 * type.scale;
    const startX = enemy.x;
    const startZ = enemy.z;
    const movement = resolveSlidingMovement(
      enemy.x,
      enemy.z,
      Math.sin(enemy.heading) * moveSpeed * dt,
      Math.cos(enemy.heading) * moveSpeed * dt,
      collisionRadius,
      enemies,
      enemy
    );
    enemy.x = movement.x;
    enemy.z = movement.z;

    if (!movement.collided) {
      return;
    }

    const slideX = enemy.x - startX;
    const slideZ = enemy.z - startZ;
    if (Math.hypot(slideX, slideZ) > 0.0001) {
      const slideHeading = Math.atan2(slideX, slideZ);
      enemy.heading = turnTowardAngle(
        enemy.heading,
        slideHeading,
        (type.chassisTurnRate ?? ENEMY_AI.CHASSIS_TURN_RATE) * dt * 1.35
      );
    }

    // Un contact oblique continue naturellement; un choc frontal déclenche
    // une nouvelle décision afin que l'ennemi ne pousse pas sur place.
    if (
      movement.collisionSeverity < 0.32 &&
      movement.travelRatio > 0.55
    ) return;

    if (enemy.state !== ENEMY_STATE.REPOSITION) enemy.strafeDirection *= -1;
    enemy.state = ENEMY_STATE.REPOSITION;
    enemy.stateTimer = 0.7 + Math.random() * 0.35;
    enemy.heading = normalizeAngle(enemy.heading + enemy.strafeDirection * 0.32);
  }

  function isDroneAttackPathClear(enemy, heading, lookAhead = 9) {
    const type = getEnemyType(enemy);
    const radius = 1.05 * type.scale;
    for (let step = 1.5; step <= lookAhead; step += 1.5) {
      const sampleX = enemy.x + Math.sin(heading) * step;
      const sampleZ = enemy.z + Math.cos(heading) * step;
      if (circleCollision(sampleX, sampleZ, radius)) return false;
    }
    return true;
  }

  function moveDroneForward(
    enemy,
    desiredHeading,
    dt,
    speedScale = 1,
    turnScale = 1
  ) {
    const type = getEnemyType(enemy);
    enemy.heading = turnTowardAngle(
      enemy.heading,
      desiredHeading,
      (type.chassisTurnRate ?? ENEMY_AI.CHASSIS_TURN_RATE) * turnScale * dt
    );
    const moveSpeed = enemy.speed * speedScale;
    const worldEdge = WORLD_LIMIT - 2;
    const nextX = enemy.x + Math.sin(enemy.heading) * moveSpeed * dt;
    const nextZ = enemy.z + Math.cos(enemy.heading) * moveSpeed * dt;
    const clampedX = Math.max(-worldEdge, Math.min(worldEdge, nextX));
    const clampedZ = Math.max(-worldEdge, Math.min(worldEdge, nextZ));
    if (clampedX !== nextX || clampedZ !== nextZ) {
      enemy.strafeDirection *= -1;
      enemy.heading = normalizeAngle(enemy.heading + enemy.strafeDirection * 0.5);
    }
    enemy.x = clampedX;
    enemy.z = clampedZ;
  }

  function updateDroneCruiseMovement(enemy, targetHeading, range, dt) {
    let flightHeading;
    if (range > enemy.preferredRange + 4) {
      flightHeading = targetHeading + enemy.strafeDirection * 0.28;
    } else if (range < Math.max(10, enemy.preferredRange - 6)) {
      flightHeading = targetHeading + Math.PI + enemy.strafeDirection * 0.42;
    } else {
      flightHeading = targetHeading + enemy.strafeDirection * 1.18;
    }
    moveDroneForward(enemy, flightHeading, dt);
  }

  function updateDrone(enemy, targetHeading, range, target, dt) {
    const type = getEnemyType(enemy);
    enemy.flightState ||= DRONE_FLIGHT_STATE.CRUISING;
    enemy.elevation = Math.max(0, Number(enemy.elevation) || 0);
    enemy.attackCooldown = Math.max(0, (enemy.attackCooldown ?? 0) - dt);
    enemy.turretHeading = turnTowardAngle(
      enemy.turretHeading,
      targetHeading,
      type.turretTurnRate * dt
    );

    switch (enemy.flightState) {
      case DRONE_FLIGHT_STATE.DIVING:
        moveDroneForward(enemy, targetHeading, dt, 0.94, 0.65);
        if (
          enemy.elevation < 2 &&
          !isDroneAttackPathClear(enemy, enemy.heading, 6)
        ) {
          enemy.flightState = DRONE_FLIGHT_STATE.CLIMBING;
          enemy.attackCooldown = 1.4;
          break;
        }
        enemy.elevation = Math.max(
          DRONE_ATTACK_ALTITUDE,
          enemy.elevation - DRONE_VERTICAL_SPEED * dt
        );
        if (enemy.elevation <= DRONE_ATTACK_ALTITUDE) {
          enemy.flightState = DRONE_FLIGHT_STATE.STRAFING;
          enemy.flightTimer = DRONE_STRAFE_TIME;
          enemy.reload = Math.min(enemy.reload, 0.18);
          enemy.attackFired = false;
          tone(185, 0.08, "square", 0.018, 45);
        }
        break;

      case DRONE_FLIGHT_STATE.STRAFING: {
        enemy.elevation = DRONE_ATTACK_ALTITUDE;
        moveDroneForward(enemy, targetHeading, dt, 1.12, 0.48);
        enemy.flightTimer = Math.max(0, (enemy.flightTimer ?? 0) - dt);
        if (!enemy.attackFired) {
          enemy.attackFired = updateEnemyTurret(
            enemy,
            targetHeading,
            range,
            target,
            dt
          );
          if (enemy.attackFired) {
            enemy.flightTimer = Math.min(enemy.flightTimer, 0.42);
          }
        }
        if (
          enemy.flightTimer <= 0 ||
          range < 4.5 ||
          !isDroneAttackPathClear(enemy, enemy.heading, 3.5)
        ) {
          enemy.flightState = DRONE_FLIGHT_STATE.CLIMBING;
          enemy.attackCooldown = 2.2 + Math.random() * 1.2;
        }
        break;
      }

      case DRONE_FLIGHT_STATE.CLIMBING:
        moveDroneForward(
          enemy,
          enemy.heading + enemy.strafeDirection * 0.16,
          dt,
          1,
          0.45
        );
        enemy.elevation = Math.min(
          DRONE_CRUISE_ALTITUDE,
          enemy.elevation + DRONE_VERTICAL_SPEED * dt
        );
        if (enemy.elevation >= DRONE_CRUISE_ALTITUDE) {
          enemy.flightState = DRONE_FLIGHT_STATE.CRUISING;
          enemy.flightTimer = 0;
          enemy.attackFired = false;
        }
        break;

      case DRONE_FLIGHT_STATE.CRUISING:
      default:
        updateDroneCruiseMovement(enemy, targetHeading, range, dt);
        enemy.elevation = Math.min(
          DRONE_CRUISE_ALTITUDE,
          enemy.elevation + DRONE_VERTICAL_SPEED * dt
        );
        if (
          enemy.attackCooldown <= 0 &&
          range > 11 &&
          range < type.fireRange - 2 &&
          isDroneAttackPathClear(enemy, targetHeading, 10)
        ) {
          enemy.flightState = DRONE_FLIGHT_STATE.DIVING;
          enemy.flightTimer = 0;
          enemy.attackFired = false;
          tone(310, 0.1, "sawtooth", 0.016, -90);
        }
        break;
    }
  }

  function separateEnemy(enemy, pushX, pushZ) {
    const type = getEnemyType(enemy);
    if (type.static) return false;
    const nextX = Math.max(
      -WORLD_LIMIT + 1.5,
      Math.min(WORLD_LIMIT - 1.5, enemy.x + pushX)
    );
    const nextZ = Math.max(
      -WORLD_LIMIT + 1.5,
      Math.min(WORLD_LIMIT - 1.5, enemy.z + pushZ)
    );
    if (circleCollision(nextX, nextZ, 1.12 * type.scale)) return false;
    enemy.x = nextX;
    enemy.z = nextZ;
    enemy.state = ENEMY_STATE.REPOSITION;
    enemy.stateTimer = 0.55 + Math.random() * 0.3;
    return true;
  }

  function resolveEnemyOverlaps() {
    for (let a = 0; a < enemies.length; a += 1) {
      for (let b = a + 1; b < enemies.length; b += 1) {
        const first = enemies[a];
        const second = enemies[b];
        const firstType = getEnemyType(first);
        const secondType = getEnemyType(second);
        if ((first.elevation ?? 0) > 0.45 || (second.elevation ?? 0) > 0.45) {
          continue;
        }
        const minimumDistance =
          1.12 * firstType.scale +
          1.12 * secondType.scale +
          0.32;
        let dx = second.x - first.x;
        let dz = second.z - first.z;
        let currentDistance = Math.hypot(dx, dz);
        if (currentDistance >= minimumDistance) continue;

        if (currentDistance < 0.001) {
          const escapeAngle =
            ((first.id * 37 + second.id * 53) % 360) * Math.PI / 180;
          dx = Math.sin(escapeAngle);
          dz = Math.cos(escapeAngle);
          currentDistance = 0;
        } else {
          dx /= currentDistance;
          dz /= currentDistance;
        }

        const overlap = minimumDistance - Math.min(currentDistance, minimumDistance);
        const firstStatic = firstType.static;
        const secondStatic = secondType.static;
        const firstShare = firstStatic ? 0 : secondStatic ? 1 : 0.5;
        const secondShare = secondStatic ? 0 : firstStatic ? 1 : 0.5;
        const firstMoved = separateEnemy(
          first,
          -dx * overlap * firstShare,
          -dz * overlap * firstShare
        );
        const secondMoved = separateEnemy(
          second,
          dx * overlap * secondShare,
          dz * overlap * secondShare
        );

        if (!firstMoved && !firstStatic && secondMoved) {
          separateEnemy(first, dz * overlap, -dx * overlap);
        }
        if (!secondMoved && !secondStatic && firstMoved) {
          separateEnemy(second, -dz * overlap, dx * overlap);
        }
        first.strafeDirection = -1;
        second.strafeDirection = 1;
      }
    }
  }

  function getCombatTargets() {
    const localRole = isCoopGame() ? networkSnapshot.role : "player";
    const targets = [{
      role: localRole,
      x: player.x,
      z: player.z,
      heading: player.heading,
      speed: player.speed,
      health: player.health
    }];
    if (isCoopGame() && networkSnapshot.role === "host") {
      for (const remote of remotePlayers.values()) {
        if (
          remote.role !== "guest" ||
          remote.missionPhase !== MISSION_PHASE.COMBAT ||
          coopHealth.guest <= 0
        ) continue;
        targets.push({
          role: "guest",
          x: remote.x,
          z: remote.z,
          heading: remote.heading,
          speed: 0,
          health: coopHealth.guest
        });
      }
    }
    return targets.filter((target) => target.health > 0);
  }

  function getTargetByRole(role) {
    return getCombatTargets().find((target) => target.role === role) ?? null;
  }

  function getSegmentProximity(start, end, point) {
    const segmentX = end.x - start.x;
    const segmentZ = end.z - start.z;
    const lengthSquared = segmentX * segmentX + segmentZ * segmentZ;
    if (lengthSquared <= 0.0001) {
      return {
        t: 0,
        distanceSquared:
          (point.x - start.x) ** 2 + (point.z - start.z) ** 2
      };
    }
    const t = Math.max(
      0,
      Math.min(
        1,
        ((point.x - start.x) * segmentX +
          (point.z - start.z) * segmentZ) /
          lengthSquared
      )
    );
    const closestX = start.x + segmentX * t;
    const closestZ = start.z + segmentZ * t;
    return {
      t,
      distanceSquared:
        (point.x - closestX) ** 2 + (point.z - closestZ) ** 2
    };
  }

  function hasClearLineOfFire(enemy, target) {
    for (const rock of rocks) {
      const proximity = getSegmentProximity(enemy, target, rock);
      const blockingRadius = rock.radius * 0.78 + 0.28;
      if (
        proximity.t > 0.035 &&
        proximity.t < 0.98 &&
        proximity.distanceSquared < blockingRadius * blockingRadius
      ) {
        return false;
      }
    }

    for (const other of enemies) {
      if (other === enemy || getEnemyType(other).airborne) continue;
      const proximity = getSegmentProximity(enemy, target, other);
      const blockingRadius = 0.92 * getEnemyType(other).scale;
      if (
        proximity.t > 0.075 &&
        proximity.t < 0.93 &&
        proximity.distanceSquared < blockingRadius * blockingRadius
      ) {
        return false;
      }
    }
    return true;
  }

  function chooseEnemyTarget(enemy, combatTargets, targetLoads, dt) {
    enemy.targetLockTimer = Math.max(0, (enemy.targetLockTimer ?? 0) - dt);
    const type = getEnemyType(enemy);
    const countsTowardLoad = type.id !== "guardian";
    const lockedTarget = combatTargets.find(
      (target) => target.role === enemy.targetRole
    );
    if (lockedTarget && enemy.targetLockTimer > 0) {
      if (countsTowardLoad) {
        targetLoads.set(
          lockedTarget.role,
          (targetLoads.get(lockedTarget.role) ?? 0) + 1
        );
      }
      return { target: lockedTarget, range: distance(enemy, lockedTarget) };
    }

    let chosen = null;
    let chosenRange = Infinity;
    let chosenScore = Infinity;
    for (const target of combatTargets) {
      const range = distance(enemy, target);
      const assignedEnemies = targetLoads.get(target.role) ?? 0;
      let score = range + assignedEnemies * (countsTowardLoad ? 8 : 0);
      if (type.kamikaze) score += target.health * 0.075;
      if (target.role === enemy.targetRole) score -= 2.5;
      if (score < chosenScore) {
        chosen = target;
        chosenRange = range;
        chosenScore = score;
      }
    }
    if (!chosen) return null;

    enemy.targetRole = chosen.role;
    enemy.targetLockTimer =
      type.kamikaze
        ? 0.85 + Math.random() * 0.35
        : type.id === "artillery"
          ? 2 + Math.random() * 0.8
          : 1.35 + Math.random() * 0.65;
    if (countsTowardLoad) {
      targetLoads.set(
        chosen.role,
        (targetLoads.get(chosen.role) ?? 0) + 1
      );
    }
    return { target: chosen, range: chosenRange };
  }

  function updateEnemyTurret(enemy, targetHeading, range, target, dt) {
    const type = getEnemyType(enemy);
    enemy.turretHeading = turnTowardAngle(
      enemy.turretHeading,
      targetHeading,
      type.turretTurnRate * dt
    );
    enemy.reload -= dt;

    if (enemy.reload > 0 || range >= type.fireRange) return false;
    if (type.id !== "artillery" && !hasClearLineOfFire(enemy, target)) {
      return false;
    }

    const facingError = Math.abs(normalizeAngle(targetHeading - enemy.turretHeading));
    if (facingError <= type.fireAlignment) {
      if (type.id === "artillery") fireArtillery(enemy, target);
      else fireEnemy(enemy, target);
      enemy.reload =
        Math.max(type.reloadMin, type.reloadBase - player.wave * 0.08) +
        Math.random() * type.reloadJitter;
      return true;
    }
    return false;
  }

  function chooseGuardianAnchor(guardian) {
    const candidates = enemies.filter((enemy) =>
      enemy !== guardian &&
      getEnemyType(enemy).id !== "guardian" &&
      getEnemyType(enemy).id !== "ghost" &&
      getEnemyType(enemy).id !== "kamikaze" &&
      getEnemyType(enemy).id !== "drone"
    );
    if (candidates.length === 0) return null;

    let best = null;
    let bestScore = Infinity;
    for (const candidate of candidates) {
      let score = distance(guardian, candidate) * 0.2;
      for (const other of candidates) {
        score += distance(candidate, other);
      }
      if (getEnemyType(candidate).id === "artillery") score -= 8;
      if (score < bestScore) {
        best = candidate;
        bestScore = score;
      }
    }
    return best;
  }

  function updateEnemyShields(dt) {
    const guardians = enemies.filter(
      (enemy) => getEnemyType(enemy).id === "guardian"
    );

    for (const enemy of enemies) {
      const enemyType = getEnemyType(enemy);
      enemy.shieldFlash = Math.max(0, (enemy.shieldFlash ?? 0) - dt);
      enemy.shieldCooldown = Math.max(
        0,
        (enemy.shieldCooldown ?? 0) - dt
      );
      if (enemyType.id !== "guardian") {
        enemy.shieldSourceId = 0;
      }
      if (enemyType.id === "guardian" || enemyType.id === "ghost") {
        enemy.shieldCharge = 0;
        enemy.shieldCooldown = 0;
      }
      if (enemyType.airborne) {
        enemy.shieldSourceId = 0;
        enemy.shieldCharge = 0;
        enemy.shieldCooldown = 0;
      }
    }

    for (const target of enemies) {
      const targetType = getEnemyType(target);
      if (targetType.id === "guardian" || targetType.id === "ghost") {
        continue;
      }
      if (targetType.airborne) {
        continue;
      }
      let closestGuardian = null;
      let closestRange = GUARDIAN_SHIELD_RADIUS;
      for (const guardian of guardians) {
        const range = distance(target, guardian);
        if (range <= closestRange) {
          closestGuardian = guardian;
          closestRange = range;
        }
      }

      if (!closestGuardian) {
        target.shieldCharge = 0;
        continue;
      }

      target.shieldSourceId = closestGuardian.id;
      if (
        (target.shieldCharge ?? 0) <= 0 &&
        target.shieldCooldown <= 0
      ) {
        target.shieldCharge = 1;
        target.shieldFlash = Math.max(target.shieldFlash, 0.16);
      }
    }
  }

  function clearGuardianShields(sourceId) {
    for (const enemy of enemies) {
      if (Number(enemy.shieldSourceId) !== Number(sourceId)) continue;
      enemy.shieldSourceId = 0;
      enemy.shieldCharge = 0;
    }
  }

  function updateEnemies(dt) {
    const pendingDetonations = [];
    const combatTargets = getCombatTargets();
    const targetLoads = new Map(
      combatTargets.map((target) => [target.role, 0])
    );
    for (const enemy of enemies) {
      enemy.revealTimer = Math.max(0, (enemy.revealTimer ?? 0) - dt);
      enemy.revealFlash = Math.max(0, (enemy.revealFlash ?? 0) - dt);
      const targetChoice = chooseEnemyTarget(
        enemy,
        combatTargets,
        targetLoads,
        dt
      );
      if (!targetChoice) continue;
      const { target, range } = targetChoice;
      const targetHeading = Math.atan2(
        target.x - enemy.x,
        target.z - enemy.z
      );
      const type = getEnemyType(enemy);
      enemy.hitFlash = Math.max(0, enemy.hitFlash - dt);

      if (type.id === "light") {
        updateLightFlankIntent(enemy, target, dt);
      }

      if (type.airborne) {
        updateDrone(enemy, targetHeading, range, target, dt);
        continue;
      }

      if (type.kamikaze) {
        if (
          !enemy.kamikazeArmed &&
          range <= KAMIKAZE_TRIGGER_RADIUS
        ) {
          enemy.kamikazeArmed = true;
          enemy.fuseTimer = KAMIKAZE_FUSE_TIME;
          enemy.fuseDuration = KAMIKAZE_FUSE_TIME;
          enemy.state = ENEMY_STATE.APPROACH;
        }
        if (enemy.kamikazeArmed) {
          enemy.fuseTimer = Math.max(0, enemy.fuseTimer - dt);
          if (enemy.fuseTimer <= 0) {
            pendingDetonations.push(enemy);
            continue;
          }
        }
        updateEnemyMovement(enemy, targetHeading, range, dt);
        enemy.turretHeading = enemy.heading;
        continue;
      }

      const guardianAnchor =
        type.id === "guardian" ? chooseGuardianAnchor(enemy) : null;
      const movementTarget = guardianAnchor ?? target;
      const movementRange = distance(enemy, movementTarget);
      const movementHeading = Math.atan2(
        movementTarget.x - enemy.x,
        movementTarget.z - enemy.z
      );
      const lineOfFireClear =
        type.id === "artillery" ||
        type.fireRange <= 0 ||
        hasClearLineOfFire(enemy, target);

      updateEnemyMovement(
        enemy,
        movementHeading,
        movementRange,
        dt,
        lineOfFireClear
      );
      updateEnemyTurret(enemy, targetHeading, range, target, dt);
    }
    for (const enemy of pendingDetonations) {
      detonateKamikaze(enemy, false);
    }
    resolveEnemyOverlaps();
    updateEnemyShields(dt);
  }

  function updateKamikazeWarning(dt) {
    let nearest = null;
    let nearestDistance = 28;
    for (const enemy of enemies) {
      if (!getEnemyType(enemy).kamikaze) continue;
      const range = Math.hypot(enemy.x - player.x, enemy.z - player.z);
      if (range >= nearestDistance) continue;
      nearest = enemy;
      nearestDistance = range;
    }

    if (!nearest || missionPhase !== MISSION_PHASE.COMBAT) {
      kamikazeWarningTimer = 0;
      return;
    }

    kamikazeWarningTimer -= dt;
    if (kamikazeWarningTimer > 0) return;

    const armed = Boolean(nearest.kamikazeArmed);
    const fuseProgress = armed
      ? Math.max(
          0,
          Math.min(
            1,
            nearest.fuseTimer /
              (nearest.fuseDuration || KAMIKAZE_FUSE_TIME)
          )
        )
      : 1;
    const proximity = 1 - nearestDistance / 28;
    kamikazeWarningTimer = armed
      ? 0.09 + fuseProgress * 0.13
      : 0.18 + (1 - proximity) * 0.5;
    const frequency = armed
      ? 560 + (1 - fuseProgress) * 320
      : 290 + proximity * 230;
    tone(
      frequency,
      0.055,
      "square",
      armed ? 0.027 : 0.018,
      armed ? 120 : 45
    );
  }

  function damagePlayer(amount, impactX, impactZ, shake = 12) {
    if (player.invulnerable > 0 || gameOver) return;
    player.health = Math.max(0, player.health - amount);
    if (isCoopGame() && networkSnapshot.role === "host") {
      coopHealth.host = player.health;
    }
    player.invulnerable = 0.55;
    flash = 1;
    screenShake = Math.max(screenShake, shake);
    burst(impactX, impactZ, COLORS.red, 18);
    tone(92, 0.25, "sawtooth", 0.08, -45);
    if (player.health <= 0) {
      if (isCoopGame() && networkSnapshot.role === "host") {
        sharedGameOver = true;
        publishSharedWorld();
      }
      endGame();
    }
  }

  function damageCombatTarget(role, amount, impactX, impactZ, shake = 12) {
    if (!isCoopGame() || role === networkSnapshot.role || role === "player") {
      damagePlayer(amount, impactX, impactZ, shake);
      return;
    }
    if (
      networkSnapshot.role !== "host" ||
      role !== "guest" ||
      coopInvulnerability.guest > 0 ||
      sharedGameOver
    ) return;
    coopHealth.guest = Math.max(0, coopHealth.guest - amount);
    coopInvulnerability.guest = 0.55;
    burst(impactX, impactZ, COLORS.red, 18);
    tone(82, 0.18, "sawtooth", 0.025, -35);
    if (coopHealth.guest <= 0) {
      sharedGameOver = true;
      publishSharedWorld();
      endGame();
    }
  }

  function awardEnemyDestruction(enemy) {
    const type = getEnemyType(enemy);
    player.score += type.score * player.wave;
    player.kills += 1;
  }

  function createKamikazeExplosionEffects(enemy) {
    createTankDebris(enemy);
    burst(enemy.x, enemy.z, COLORS.red, 44);
    burst(enemy.x, enemy.z, COLORS.amber, 24);
    createBlastSmoke(enemy.x, enemy.z);
    particles.push({
      kind: "shockwave",
      x: enemy.x,
      y: 0.04,
      z: enemy.z,
      vx: 0,
      vy: 0,
      vz: 0,
      gravity: 0,
      drag: 0,
      growth: 0,
      size: 0,
      color: COLORS.amber,
      maxRadius: KAMIKAZE_BLAST_RADIUS,
      life: 0.58,
      maxLife: 0.58
    });
    const localDistance = Math.hypot(enemy.x - player.x, enemy.z - player.z);
    screenShake = Math.max(screenShake, Math.max(0, 20 - localDistance * 1.2));
    tone(42, 0.5, "sawtooth", 0.1, -10);
    tone(118, 0.18, "square", 0.045, -75);
  }

  function destroyEnemy(enemy, creditPlayer = true) {
    const enemyIndex = enemies.indexOf(enemy);
    if (enemyIndex === -1) return false;
    const type = getEnemyType(enemy);
    if (type.kamikaze) return detonateKamikaze(enemy, creditPlayer);

    enemies.splice(enemyIndex, 1);
    if (creditPlayer) awardEnemyDestruction(enemy);
    if (type.id === "guardian") clearGuardianShields(enemy.id);
    createTankDebris(enemy);
    burst(
      enemy.x,
      enemy.z,
      type.priority ? COLORS.amber : COLORS.red,
      32,
      0.4 + (enemy.elevation ?? 0)
    );
    screenShake = Math.max(screenShake, 9);
    tone(58, 0.34, "sawtooth", 0.08, -20);
    return true;
  }

  function detonateKamikaze(enemy, creditPlayer = false) {
    const enemyIndex = enemies.indexOf(enemy);
    if (enemyIndex === -1) return false;

    enemies.splice(enemyIndex, 1);
    if (creditPlayer) awardEnemyDestruction(enemy);
    createKamikazeExplosionEffects(enemy);

    for (const target of getCombatTargets()) {
      const blastDistance = Math.hypot(
        enemy.x - target.x,
        enemy.z - target.z
      );
      if (blastDistance > KAMIKAZE_BLAST_RADIUS) continue;
      const falloff = 1 - blastDistance / KAMIKAZE_BLAST_RADIUS;
      const damage = Math.round(
        KAMIKAZE_BLAST_DAMAGE * (0.25 + falloff * 0.75)
      );
      damageCombatTarget(
        target.role,
        damage,
        enemy.x,
        enemy.z,
        20
      );
    }

    for (const nearbyEnemy of [...enemies]) {
      const blastDistance = Math.hypot(
        enemy.x - nearbyEnemy.x,
        enemy.z - nearbyEnemy.z,
        nearbyEnemy.elevation ?? 0
      );
      if (blastDistance > KAMIKAZE_BLAST_RADIUS) continue;
      if (absorbEnemyShield(nearbyEnemy, enemy.x, enemy.z)) continue;

      const falloff = 1 - blastDistance / KAMIKAZE_BLAST_RADIUS;
      nearbyEnemy.health -= Math.max(1, Math.ceil(falloff * 3));
      nearbyEnemy.hitFlash = 0.18;
      if (nearbyEnemy.health <= 0) {
        destroyEnemy(nearbyEnemy, creditPlayer);
      }
    }
    return true;
  }

  function explodeArtilleryShell(shell) {
    const localBlastDistance = Math.hypot(
      shell.targetX - player.x,
      shell.targetZ - player.z
    );
    burst(shell.targetX, shell.targetZ, COLORS.red, 34);
    burst(shell.targetX, shell.targetZ, COLORS.amber, 18);
    createBlastSmoke(shell.targetX, shell.targetZ);
    screenShake = Math.max(screenShake, Math.max(2, 13 - localBlastDistance * 0.18));
    tone(44, 0.48, "sawtooth", 0.095, -12);

    for (const target of getCombatTargets()) {
      const blastDistance = Math.hypot(
        shell.targetX - target.x,
        shell.targetZ - target.z
      );
      if (blastDistance > shell.blastRadius) continue;
      const falloff = 1 - blastDistance / shell.blastRadius * 0.35;
      damageCombatTarget(
        target.role,
        Math.round(shell.blastDamage * falloff),
        shell.targetX,
        shell.targetZ,
        18
      );
    }
  }

  function updateArtilleryShell(shell, dt) {
    shell.trailTimer = (shell.trailTimer ?? 0) - dt;
    if (shell.trailTimer <= 0) {
      shell.trail.push({ x: shell.x, y: shell.y, z: shell.z });
      if (shell.trail.length > 14) shell.trail.shift();
      shell.trailTimer = 0.065;
    }

    shell.elapsed = Math.min(shell.flightTime, shell.elapsed + dt);
    shell.life = shell.flightTime - shell.elapsed;
    const progress = shell.elapsed / shell.flightTime;
    shell.x = shell.startX + (shell.targetX - shell.startX) * progress;
    shell.z = shell.startZ + (shell.targetZ - shell.startZ) * progress;
    shell.y =
      shell.startY * (1 - progress) +
      Math.sin(progress * Math.PI) * shell.arcHeight;

    if (progress < 1) return false;
    explodeArtilleryShell(shell);
    return true;
  }

  function absorbEnemyShield(enemy, impactX, impactZ) {
    if ((enemy.shieldCharge ?? 0) <= 0) return false;
    const source = enemies.find(
      (candidate) =>
        Number(candidate.id) === Number(enemy.shieldSourceId) &&
        getEnemyType(candidate).id === "guardian"
    );
    if (!source) {
      enemy.shieldCharge = 0;
      enemy.shieldSourceId = 0;
      return false;
    }

    enemy.shieldCharge = 0;
    enemy.shieldCooldown = GUARDIAN_SHIELD_RECHARGE;
    enemy.shieldFlash = 0.32;
    burst(impactX, impactZ, COLORS.cyan, 18);
    screenShake = Math.max(screenShake, 4);
    tone(430, 0.11, "square", 0.045, 180);
    return true;
  }

  function shellHitsEnemy(shell, enemy) {
    const type = getEnemyType(enemy);
    const hitRadius = 1.45 * type.hitRadius;
    if (Math.hypot(shell.x - enemy.x, shell.z - enemy.z) >= hitRadius) {
      return false;
    }
    if (!type.airborne) return true;
    const centerY = (enemy.elevation ?? 0) + 0.48 * type.scale;
    const verticalRadius = 0.76 * type.scale;
    return Math.abs((shell.y ?? 0.86) - centerY) < verticalRadius;
  }

  function updateShells(dt) {
    for (let i = shells.length - 1; i >= 0; i -= 1) {
      const shell = shells[i];

      if (shell.kind === "artillery") {
        if (updateArtilleryShell(shell, dt)) shells.splice(i, 1);
        continue;
      }

      shell.x += shell.vx * dt;
      shell.z += shell.vz * dt;
      shell.life -= dt;

      if (
        shell.life <= 0 ||
        Math.abs(shell.x) > WORLD_LIMIT + 5 ||
        Math.abs(shell.z) > WORLD_LIMIT + 5 ||
        circleCollision(shell.x, shell.z, 0.2)
      ) {
        if (shell.life > 0) burst(shell.x, shell.z, COLORS.amber, 5);
        shells.splice(i, 1);
        continue;
      }

      if (shell.owner === "player" || shell.owner === "ally") {
        const enemyIndex = enemies.findIndex((enemy) =>
          shellHitsEnemy(shell, enemy)
        );
        if (enemyIndex !== -1) {
          const enemy = enemies[enemyIndex];
          const type = getEnemyType(enemy);
          if (!isWorldAuthority()) {
            shells.splice(i, 1);
            if (type.id === "ghost") revealGhost(enemy, 3, 0.16);
            const shielded = (enemy.shieldCharge ?? 0) > 0;
            if (shielded) {
              enemy.shieldCharge = 0;
              enemy.shieldFlash = 0.28;
            }
            burst(
              shell.x,
              shell.z,
              shielded ? COLORS.cyan : COLORS.amber,
              shielded ? 14 : 7
            );
            continue;
          }
          shells.splice(i, 1);
          if (type.id === "ghost") revealGhost(enemy, 3, 0.16);
          if (absorbEnemyShield(enemy, shell.x, shell.z)) {
            player.score += 10;
            continue;
          }
          enemy.health -= 1;
          enemy.hitFlash = 0.14;
          burst(shell.x, shell.z, COLORS.amber, 10);
          tone(260, 0.07, "square", 0.035, -120);
          if (enemy.health <= 0) {
            destroyEnemy(enemy, true);
          } else {
            player.score += 25;
          }
        }
      } else {
        const target =
          getTargetByRole(shell.targetRole) ??
          getCombatTargets()[0];
        if (target && Math.hypot(shell.x - target.x, shell.z - target.z) < 1.2) {
          shells.splice(i, 1);
          damageCombatTarget(target.role, 18, shell.x, shell.z, 12);
        }
      }
    }
  }

  function updateParticles(dt) {
    for (let i = particles.length - 1; i >= 0; i -= 1) {
      const particle = particles[i];
      particle.x += particle.vx * dt;
      particle.y += particle.vy * dt;
      particle.z += particle.vz * dt;
      particle.vy -= (particle.gravity ?? 8.5) * dt;
      const damping = Math.exp(-(particle.drag ?? 0) * dt);
      particle.vx *= damping;
      particle.vy *= damping;
      particle.vz *= damping;
      particle.size += (particle.growth ?? 0) * dt;
      particle.life -= dt;
      if (particle.kind !== "smoke" && particle.y < 0) {
        particle.y = 0;
        particle.vy *= -0.25;
        particle.vx *= 0.72;
        particle.vz *= 0.72;
      }
      if (particle.life <= 0) particles.splice(i, 1);
    }
  }

  function updateTankDebris(dt) {
    for (let i = tankDebris.length - 1; i >= 0; i -= 1) {
      const piece = tankDebris[i];
      piece.age += dt;
      piece.life -= dt;
      piece.x += piece.vx * dt;
      piece.y += piece.vy * dt;
      piece.z += piece.vz * dt;
      piece.vy -= 8.8 * dt;
      piece.yaw += piece.spinYaw * dt;
      piece.pitch += piece.spinPitch * dt;
      piece.roll += piece.spinRoll * dt;

      const airDamping = Math.exp(-0.12 * dt);
      piece.vx *= airDamping;
      piece.vz *= airDamping;

      const groundHeight = 0.13 * piece.scale;
      if (piece.y <= groundHeight && piece.vy < 0) {
        piece.y = groundHeight;
        if (!piece.bounced) {
          piece.bounced = true;
          piece.vy *= -0.28;
          piece.vx *= 0.68;
          piece.vz *= 0.68;
          piece.spinYaw *= 0.7;
          piece.spinPitch *= 0.7;
          piece.spinRoll *= 0.7;
        } else {
          piece.vy = 0;
          const groundDamping = Math.exp(-5.5 * dt);
          piece.vx *= groundDamping;
          piece.vz *= groundDamping;
          piece.spinYaw *= groundDamping;
          piece.spinPitch *= groundDamping;
          piece.spinRoll *= groundDamping;
        }
      }

      if (piece.life <= 0) tankDebris.splice(i, 1);
    }
  }

  function finishDropSequence() {
    player.altitude = 0;
    cameraPitch = 0;
    missionPhase = MISSION_PHASE.COMBAT;
    landingPulse = 1;
    screenShake = 24;
    createLandingDust();
    tone(48, 0.42, "sawtooth", 0.1, -16);
    tone(130, 0.16, "square", 0.045, -70);
    if (isWorldAuthority()) spawnWave();
  }

  function updateDropSequence(dt) {
    dropElapsed = Math.min(DROP_SEQUENCE.DURATION, dropElapsed + dt);
    const progress = dropElapsed / DROP_SEQUENCE.DURATION;
    player.altitude = DROP_SEQUENCE.START_HEIGHT * (1 - progress * progress);

    const leveling = Math.max(0, Math.min(1, (progress - 0.56) / 0.44));
    const smoothLeveling = leveling * leveling * (3 - 2 * leveling);
    cameraPitch = DROP_SEQUENCE.START_PITCH * (1 - smoothLeveling);
    screenShake = Math.max(screenShake, 0.4 + progress * 1.8);

    if (progress >= 1) finishDropSequence();
  }

  function updateScreenEffects(dt) {
    screenShake = Math.max(0, screenShake - dt * 24);
    flash = Math.max(0, flash - dt * 3.8);
    landingPulse = Math.max(0, landingPulse - dt * 1.65);
  }

  function update(dt) {
    if (missionPhase === MISSION_PHASE.DROP) {
      updateDropSequence(dt);
      updateParticles(dt);
      updateTankDebris(dt);
      updateScreenEffects(dt);
      updateRemotePlayers(dt);
      updateReplicatedWorld(dt);
      publishLocalPlayerState();
      publishSharedWorld();
      return;
    }

    updatePlayer(dt);
    updateRemotePlayers(dt);
    updateReplicatedWorld(dt);
    if (isWorldAuthority()) updateEnemies(dt);
    updateKamikazeWarning(dt);
    updateShells(dt);
    updateParticles(dt);
    updateTankDebris(dt);
    updateScreenEffects(dt);
    waveBanner = Math.max(0, waveBanner - dt);

    coopInvulnerability.guest = Math.max(0, coopInvulnerability.guest - dt);

    if (isWorldAuthority() && enemies.length === 0 && !gameOver) {
      waveBanner -= dt;
      if (!update.nextWaveTimer) update.nextWaveTimer = 1.7;
      update.nextWaveTimer -= dt;
      if (update.nextWaveTimer <= 0) {
        update.nextWaveTimer = 0;
        player.health = Math.min(100, player.health + 12);
        if (isCoopGame() && networkSnapshot.role === "host") {
          coopHealth.host = player.health;
          coopHealth.guest = Math.min(100, coopHealth.guest + 12);
        }
        spawnWave();
      }
    } else {
      update.nextWaveTimer = 0;
    }
    publishLocalPlayerState();
    publishSharedWorld();
  }

  function loop(now) {
    const dt = Math.min(0.035, (now - lastTime) / 1000);
    lastTime = now;
    if (running && !paused && !gameOver) update(dt);
    draw();
    requestAnimationFrame(loop);
  }

  for (const card of tankCards) {
    card.addEventListener("click", () => selectPlayerTank(card.dataset.tank));
  }
  for (const button of modeButtons) {
    button.addEventListener("click", () => selectPlayMode(button.dataset.mode));
  }
  selectPlayerTank(selectedTankId);
  startButton.addEventListener("click", async () => {
    if (playMode === "solo") {
      startGame();
      return;
    }
    if (networkSnapshot.role !== "host") return;
    try {
      await network.startMission();
    } catch (error) {
      networkStatus.textContent = error.message;
      networkStatus.classList.add("error");
    }
  });
  onlineActionButton.addEventListener("click", createOrJoinRoom);
  leaveRoomButton.addEventListener("click", async () => {
    try {
      await network.leaveRoom();
    } catch {
      // Le message détaillé vient du module réseau.
    }
  });
  roomCodeInput.addEventListener("input", () => {
    roomCodeInput.value = network.normalizeRoomCode(roomCodeInput.value);
  });
  roomCodeInput.addEventListener("keydown", (event) => {
    if (event.code === "Enter") createOrJoinRoom();
  });
  restartButton.addEventListener("click", returnToHangar);
  canvas.addEventListener("click", () => {
    if (!running || paused || gameOver) return;
    initAudio();
    if (!pointerLocked) canvas.requestPointerLock?.();
    else firePlayer();
  });

  document.addEventListener("pointerlockchange", () => {
    pointerLocked = document.pointerLockElement === canvas;
  });

  document.addEventListener("mousemove", (event) => {
    if (
      !pointerLocked ||
      paused ||
      gameOver ||
      missionPhase !== MISSION_PHASE.COMBAT
    ) return;
    recenteringTurret = false;
    player.turretOffset = normalizeAngle(player.turretOffset + event.movementX * 0.0025);
  });

  document.addEventListener("mousedown", (event) => {
    if (event.button === 0 && pointerLocked) firePlayer();
  });

  document.addEventListener("keydown", (event) => {
    keys.add(event.code);
    if (["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight", "Space"].includes(event.code)) {
      event.preventDefault();
    }
    if (event.code === "Space") firePlayer();
    if (
      event.code === "KeyC" &&
      running &&
      !paused &&
      !gameOver &&
      missionPhase === MISSION_PHASE.COMBAT
    ) recenteringTurret = true;
    if (event.code === "KeyP" && !event.repeat) togglePause();
    if (event.code === "KeyR" && gameOver && playMode === "solo") startGame();
  });

  document.addEventListener("keyup", (event) => keys.delete(event.code));
  window.addEventListener("blur", () => {
    keys.clear();
    if (running && !gameOver && !paused) togglePause();
  });
  window.addEventListener("resize", resize);

  resize();
  createRocks();
  network?.subscribe(handleNetworkSnapshot);
  updateLobbyUi();
  requestAnimationFrame(loop);
})();
