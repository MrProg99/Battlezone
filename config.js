(() => {
  "use strict";

  const TAU = Math.PI * 2;
  const NEAR = 0.22;
  const WORLD_LIMIT = 92;
  const GRID_STEP = 6;
  const COOP_ROLES = Object.freeze(["host", "guest", "guest2"]);
  const MAX_COOP_PLAYERS = 3;
  const PLAYER_FORMATION_X = -40;
  const PLAYER_FORMATION_Z = Object.freeze({ host: -12, guest: 0, guest2: 12 });
  const COLORS = {
    green: "#78ff9a",
    soft: "#2ea95c",
    dim: "#155e31",
    faint: "rgba(62, 186, 95, 0.18)",
    amber: "#ffd36a",
    red: "#ff695e",
    cyan: "#68d8ff",
    violet: "#c88cff",
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
  const ENEMY_DODGE = Object.freeze({
    LOOK_AHEAD: 0.82,
    MIN_TIME_TO_IMPACT: 0.07,
    COOLDOWN: 1.35,
    LIGHT_CHANCE: 0.88,
    ASSAULT_CHANCE: 0.46,
    TURN_MULTIPLIER: 4.6
  });
  const GUARDIAN_SHIELD_RADIUS = 16;
  const GUARDIAN_SHIELD_RECHARGE = 3.2;
  const GUARDIAN_RADAR_JAM_RADIUS = 64;
  const MINELAYER = Object.freeze({
    STARTING_WAVE: 4,
    DROP_INTERVAL: 3.6,
    MAX_ACTIVE_PER_TANK: 4,
    GLOBAL_MINE_LIMIT: 12,
    ARM_TIME: 1.05,
    LIFETIME: 26,
    TRIGGER_RADIUS: 2.6,
    BLAST_RADIUS: 5.4,
    BLAST_DAMAGE: 34
  });
  const SCRIPTED_MISSION = Object.freeze({
    STANDARD: "standard",
    DEFEND: "defend",
    STEALTH: "stealth",
    DEMOLITION: "demolition",
    TRAIN: "train",
    MINEFIELD: "minefield",
    SURVIVAL: "survival",
    GENERATORS: "generators",
    STARTING_WAVE: 6,
    DEFENSE_X: -18,
    DEFENSE_Z: 0,
    DEFENSE_HEALTH: 180,
    DEFENSE_HEALTH_PER_EXTRA_PLAYER: 30,
    DEFENSE_SHIELD_TIME: 2,
    DEFENSE_TARGET_PRIORITY: -8,
    DEMOLITION_TIME: 55,
    SURVIVAL_TIME: 120,
    SURVIVAL_REINFORCEMENT_DELAY: 10,
    SURVIVAL_DROP_HEIGHT: 18,
    SURVIVAL_DROP_SPEED: 9,
    GENERATOR_X: 74,
    GENERATOR_Z_OFFSET: 25
  });
  const TRAIN_MISSION = Object.freeze({
    RAIL_Z: 22,
    START_X: 82,
    END_X: -82,
    HEADING: -Math.PI / 2,
    SPEED: 2.1,
    BASE_HEALTH: 28,
    HEALTH_PER_CYCLE: 4,
    HEALTH_PER_EXTRA_PLAYER: 8,
    BODY_HALF_LENGTH: 6.4,
    BODY_HALF_WIDTH: 2.35,
    FRONT_CANNON_OFFSET: 2.75,
    REAR_CANNON_OFFSET: -4.65,
    TURRET_TURN_RATE: 1.35,
    FIRE_RANGE: 58,
    FIRE_ALIGNMENT: 0.13,
    RELOAD_BASE: 2.55,
    RELOAD_JITTER: 0.65,
    SHELL_SPEED: 23,
    SHELL_LIFETIME: 3.1,
    SHELL_DAMAGE: 12,
    TRACK_GAUGE: 1.55,
    TRACK_CLEARANCE: 5.5
  });
  const MINEFIELD_MISSION = Object.freeze({
    BASE_MINE_COUNT: 24,
    MINES_PER_EXTRA_PLAYER: 4,
    FIELD_MIN_X: -20,
    FIELD_MAX_X: 34,
    FIELD_Z_LIMIT: 52,
    CLUSTER_COUNT: 6,
    CLUSTER_RADIUS: 8,
    MIN_SPACING: 3.4,
    CORRIDOR_Z: Object.freeze([-16, 0, 16]),
    CORRIDOR_WAVE_AMPLITUDE: 2.4,
    CORRIDOR_WAVE_FREQUENCY: 0.09,
    CORRIDOR_HALF_WIDTH: 4.2,
    LIFETIME: 180,
    ENEMY_SPAWN_MIN_X: 44,
    ENEMY_SPAWN_MAX_X: 82
  });
  const BEHEMOTH_MORTAR = Object.freeze({
    INITIAL_DELAY: 3.8,
    RELOAD: 6,
    ENRAGED_RELOAD: 4,
    SALVO_COUNT: 3,
    SALVO_STAGGER: 0.32,
    FLIGHT_TIME: 1.25,
    LEAD_TIME: 0.72,
    MIN_RANGE: 12,
    MAX_RANGE: 80,
    SCATTER_RADIUS: 1.35,
    SALVO_SPACING: 1.8,
    BLAST_RADIUS: 3.6,
    BLAST_DAMAGE: 14
  });
  const ENVIRONMENT = Object.freeze({
    CLEAR: "clear",
    FOG: "fog",
    RAIN: "rain",
    FOG_STARTING_WAVE: 6,
    FOG_NEAR: 22,
    FOG_FAR: 58,
    RAIN_STARTING_WAVE: 7,
    RAIN_NEAR: 36,
    RAIN_FAR: 88
  });
  const RAMP_SYSTEM = Object.freeze({
    GRAVITY: 12.5,
    MIN_LAUNCH_SPEED: 4.2,
    BASE_LAUNCH_VELOCITY: 3,
    SPEED_TO_LAUNCH_VELOCITY: 0.4,
    AIR_CONTROL: 0.32,
    LAUNCH_PROGRESS: 0.88,
    ENTRY_PROGRESS: 0.2,
    ENTRY_ALIGNMENT: 0.65,
    ENTRY_MIN_SPEED: 0.8,
    LENGTH: 9,
    WIDTH: 6.5,
    HEIGHT: 2.6,
    MAP_EDGE_MARGIN: 5,
    LANDING_CLEARANCE: 20
  });
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
  const SHOCK_PULSE = Object.freeze({
    RADIUS: 11,
    SHELL_RADIUS: 12.5,
    DAMAGE: 1,
    RELOAD_TIME: 7
  });
  const SUPPORT_SYSTEM = Object.freeze({
    DEPLOY_TIME: 2,
    TURRET_LIFETIME: 10,
    TURRET_COOLDOWN: 20,
    TURRET_HEALTH: 3,
    TURRET_RANGE: 36,
    TURRET_RELOAD: 0.62,
    TURRET_SHELL_SPEED: 29,
    TURRET_SHELL_LIFETIME: 1.25,
    ARMOR_COOLDOWN: 36
  });
  const ORBITAL_BARRAGE = Object.freeze({
    BOMB_COUNT: 5,
    FIRST_DISTANCE: 18,
    SPACING: 9,
    BLAST_RADIUS: 5.4,
    BLAST_DAMAGE: 2,
    FLIGHT_TIME: 1.18,
    STAGGER: 0.18,
    START_HEIGHT: 34,
    COOLDOWN: 35
  });
  const VECTOR_TURBO = Object.freeze({
    DURATION: 4,
    COOLDOWN: 18,
    FORWARD_MULTIPLIER: 1.6,
    REVERSE_MULTIPLIER: 1.25,
    ACCELERATION_MULTIPLIER: 2,
    TURN_MULTIPLIER: 1.3
  });
  const HOLOGRAPHIC_DECOY = Object.freeze({
    HEALTH: 4,
    LIFETIME: 16,
    COOLDOWN: 20,
    ATTRACTION_RADIUS: 42,
    TARGET_PRIORITY: 34,
    HIT_RADIUS: 1.35,
    EXPLOSION_RADIUS: 5.5,
    EXPLOSION_DAMAGE: 2
  });
  const PHASE_CLOAK = Object.freeze({
    DURATION: 5,
    COOLDOWN: 22,
    DETECTION_RADIUS: 8,
    AMBUSH_DURATION: 4,
    AMBUSH_DAMAGE: 2,
    AMBUSH_PIERCE: 1
  });
  const TANK_UPGRADES = Object.freeze({
    speed: Object.freeze({
      label: "PROPULSION",
      description: "VITESSE +7 %",
      speedMultiplier: 0.07
    }),
    armor: Object.freeze({
      label: "BLINDAGE",
      description: "DÉGÂTS REÇUS -8 %",
      damageReduction: 0.08
    }),
    range: Object.freeze({
      label: "TRAJECTOIRE",
      description: "PORTÉE +15 %",
      rangeMultiplier: 0.15
    }),
    systems: Object.freeze({
      label: "SYSTÈMES",
      description: "RECHARGE CAPACITÉ -8 %",
      cooldownReduction: 0.08,
      minimumMultiplier: 0.6,
      maxLevel: 5,
      tankLabels: Object.freeze({
        scout: "TURBO VECTORIEL",
        bastion: "BOMBARDEMENT",
        support: "DÉPLOIEMENTS",
        spectre: "CAMOUFLAGE"
      }),
      tankDescriptions: Object.freeze({
        scout: "RECHARGE TURBO + LEURRE -8 %",
        bastion: "RECHARGE ORBITALE -8 %",
        support: "RECHARGE TOURELLE + ARMURE -8 %",
        spectre: "RECHARGE CAMOUFLAGE -8 %"
      })
    }),
    fireRate: Object.freeze({
      label: "CADENCE",
      description: "RECHARGE CANON -4 %",
      reloadReduction: 0.04,
      minimumMultiplier: 0.8,
      maxLevel: 5
    }),
    twinCannon: Object.freeze({
      label: "CANON JUMELÉ",
      description: "DEUX OBUS PAR TIR",
      maxLevel: 1,
      tankId: "bastion",
      unlockRound: 1
    }),
    holographicDecoy: Object.freeze({
      label: "LEURRE HOLOGRAPHIQUE",
      description: "E // FAUX TANK À 4 PV",
      maxLevel: 1,
      tankId: "scout",
      unlockRound: 1
    }),
    spectralAmbush: Object.freeze({
      label: "EMBUSCADE SPECTRALE",
      description: "SORTIE CAMOUFLAGE // TIR 2X PERFORANT",
      maxLevel: 1,
      tankId: "spectre",
      unlockRound: 1
    })
  });
  const UPGRADE_IDS = Object.freeze([
    "speed",
    "armor",
    "range",
    "systems",
    "fireRate",
    "twinCannon",
    "holographicDecoy",
    "spectralAmbush"
  ]);
  const ARMOR_POWERUP = Object.freeze({
    STARTING_WAVE: 3,
    CHARGE: 42,
    MAX_CHARGE: 84,
    PICKUP_RADIUS: 3.8,
    SPAWN_MIN_RANGE: 16,
    SPAWN_MAX_RANGE: 40
  });
  const VOLCANO_EFFECT = Object.freeze({
    EMISSION_DISTANCE: 118,
    RENDER_DISTANCE: 158,
    MAX_PARTICLES: 38
  });
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
    wasp: Object.freeze({
      id: "wasp",
      label: "GUÊPE",
      code: "W",
      health: 1,
      speed: 5.15,
      speedVariance: 0.65,
      preferredRangeMin: 17,
      preferredRangeMax: 24,
      scale: 0.68,
      hitRadius: 0.7,
      chassisTurnRate: 2.15,
      turretTurnRate: 3.25,
      fireRange: 38,
      fireAlignment: 0.2,
      reloadBase: 3.35,
      reloadMin: 2.35,
      reloadJitter: 0.55,
      shellSpeed: 24,
      shellLifetime: 2.2,
      shellDamage: 3,
      score: 260,
      static: false,
      priority: false,
      wasp: true,
      flanker: true,
      startingWave: 8,
      secondStartingWave: 11,
      burstCount: 3,
      burstInterval: 0.13,
      fireRecoveryDuration: 0.72,
      fireRecoveryMultiplier: 0.32,
      dodgeChance: 0.96,
      dodgeLookAhead: 0.95,
      dodgeDuration: 0.5,
      dodgeCooldown: 0.72,
      dodgeWindup: 0.2,
      dodgeSpeedMultiplier: 1.62,
      dodgeTurnMultiplier: 1.18
    }),
    minelayer: Object.freeze({
      id: "minelayer",
      label: "POSEUR DE MINES",
      code: "M",
      health: 2,
      speed: 3.35,
      speedVariance: 0.55,
      preferredRangeMin: 16,
      preferredRangeMax: 23,
      scale: 0.88,
      hitRadius: 0.92,
      turretTurnRate: 2.65,
      fireRange: 38,
      fireAlignment: 0.2,
      reloadBase: 1.05,
      reloadMin: 0.58,
      reloadJitter: 0.32,
      shellSpeed: 23,
      shellLifetime: 2.35,
      shellDamage: 5,
      score: 240,
      static: false,
      priority: false,
      minelayer: true
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
    }),
    behemoth: Object.freeze({
      id: "behemoth",
      label: "BEHEMOTH",
      code: "B",
      health: 32,
      speed: 1.85,
      speedVariance: 0.3,
      preferredRangeMin: 18,
      preferredRangeMax: 25,
      scale: 1.72,
      hitRadius: 1.62,
      chassisTurnRate: 1.35,
      turretTurnRate: 1.22,
      enrageSpeedMultiplier: 1.42,
      enrageTurnMultiplier: 1.22,
      fireRange: 62,
      fireAlignment: 0.12,
      reloadBase: 3.2,
      reloadMin: 1.65,
      reloadJitter: 0.75,
      shellSpeed: 23,
      shellLifetime: 4,
      shellDamage: 15,
      score: 1500,
      static: false,
      priority: true,
      boss: true,
      twinCannon: true,
      mortar: true
    }),
    hangar: Object.freeze({
      id: "hangar",
      label: "HANGAR",
      code: "H",
      health: 5,
      speed: 0,
      speedVariance: 0,
      preferredRangeMin: 0,
      preferredRangeMax: 0,
      scale: 2.25,
      hitRadius: 2.15,
      turretTurnRate: 0,
      fireRange: 0,
      fireAlignment: 0,
      reloadBase: 99,
      reloadMin: 99,
      reloadJitter: 0,
      shellSpeed: 0,
      shellLifetime: 0,
      score: 600,
      static: true,
      priority: true,
      support: true,
      hangar: true,
      productionDelay: 4.5,
      productionInterval: 10,
      productionCap: 3
    }),
    commandCenter: Object.freeze({
      id: "commandCenter",
      label: "CENTRE DE COMMANDE",
      code: "C",
      health: 12,
      speed: 0,
      speedVariance: 0,
      preferredRangeMin: 0,
      preferredRangeMax: 0,
      scale: 2.65,
      hitRadius: 2.55,
      turretTurnRate: 0,
      fireRange: 0,
      fireAlignment: 0,
      reloadBase: 99,
      reloadMin: 99,
      reloadJitter: 0,
      shellSpeed: 0,
      shellLifetime: 0,
      score: 900,
      static: true,
      priority: true,
      support: true,
      objectiveBuilding: true
    }),
    powerGenerator: Object.freeze({
      id: "powerGenerator",
      label: "GÉNÉRATEUR",
      code: "G",
      health: 8,
      speed: 0,
      speedVariance: 0,
      preferredRangeMin: 0,
      preferredRangeMax: 0,
      scale: 1.75,
      hitRadius: 1.85,
      turretTurnRate: 0,
      fireRange: 0,
      fireAlignment: 0,
      reloadBase: 99,
      reloadMin: 99,
      reloadJitter: 0,
      shellSpeed: 0,
      shellLifetime: 0,
      score: 550,
      static: true,
      priority: true,
      support: true,
      objectiveBuilding: true,
      powerGenerator: true
    }),
    armoredTrain: Object.freeze({
      id: "armoredTrain",
      label: "TRAIN BLINDÉ",
      code: "TR",
      health: TRAIN_MISSION.BASE_HEALTH,
      speed: TRAIN_MISSION.SPEED,
      speedVariance: 0,
      preferredRangeMin: 0,
      preferredRangeMax: 0,
      scale: 2.3,
      hitRadius: 3.5,
      turretTurnRate: TRAIN_MISSION.TURRET_TURN_RATE,
      fireRange: TRAIN_MISSION.FIRE_RANGE,
      fireAlignment: TRAIN_MISSION.FIRE_ALIGNMENT,
      reloadBase: TRAIN_MISSION.RELOAD_BASE,
      reloadMin: TRAIN_MISSION.RELOAD_BASE,
      reloadJitter: TRAIN_MISSION.RELOAD_JITTER,
      shellSpeed: TRAIN_MISSION.SHELL_SPEED,
      shellLifetime: TRAIN_MISSION.SHELL_LIFETIME,
      shellDamage: TRAIN_MISSION.SHELL_DAMAGE,
      score: 1800,
      static: true,
      priority: true,
      support: true,
      train: true
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
    }),
    support: Object.freeze({
      id: "support",
      label: "SOUTIEN",
      forwardSpeed: 8.35,
      reverseSpeed: 4.9,
      turnRate: 1.2,
      acceleration: 3.3,
      coastResponse: 5.2,
      shellSpeed: 34,
      shellLifetime: 1.58,
      reloadTime: 0.78
    }),
    spectre: Object.freeze({
      id: "spectre",
      label: "SPECTRE",
      forwardSpeed: 9.4,
      reverseSpeed: 5.6,
      turnRate: 1.34,
      acceleration: 3.7,
      coastResponse: 5.6,
      shellSpeed: 36,
      shellLifetime: 1.72,
      reloadTime: 0.86
    })
  });

  window.BattlezoneConfig = Object.freeze({
    TAU,
    NEAR,
    WORLD_LIMIT,
    GRID_STEP,
    COOP_ROLES,
    MAX_COOP_PLAYERS,
    PLAYER_FORMATION_X,
    PLAYER_FORMATION_Z,
    COLORS,
    ENEMY_STATE,
    ENEMY_AI,
    ENEMY_DODGE,
    GUARDIAN_SHIELD_RADIUS,
    GUARDIAN_SHIELD_RECHARGE,
    GUARDIAN_RADAR_JAM_RADIUS,
    MINELAYER,
    SCRIPTED_MISSION,
    TRAIN_MISSION,
    MINEFIELD_MISSION,
    BEHEMOTH_MORTAR,
    ENVIRONMENT,
    RAMP_SYSTEM,
    KAMIKAZE_TRIGGER_RADIUS,
    KAMIKAZE_BLAST_RADIUS,
    KAMIKAZE_BLAST_DAMAGE,
    KAMIKAZE_FUSE_TIME,
    DRONE_FLIGHT_STATE,
    DRONE_CRUISE_ALTITUDE,
    DRONE_VERTICAL_SPEED,
    DRONE_ATTACK_ALTITUDE,
    DRONE_STRAFE_TIME,
    SHOCK_PULSE,
    SUPPORT_SYSTEM,
    ORBITAL_BARRAGE,
    VECTOR_TURBO,
    HOLOGRAPHIC_DECOY,
    PHASE_CLOAK,
    TANK_UPGRADES,
    UPGRADE_IDS,
    ARMOR_POWERUP,
    VOLCANO_EFFECT,
    MOON_WORLD_AZIMUTH,
    ENEMY_TYPES,
    MISSION_PHASE,
    DROP_SEQUENCE,
    TANK_DEBRIS_SHAPES,
    TANK_DEBRIS_LAYOUT,
    MAX_TANK_DEBRIS,
    PLAYER_TANKS
  });
})();
