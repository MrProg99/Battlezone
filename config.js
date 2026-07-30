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
    STARTING_WAVE: 6,
    DEFENSE_X: -18,
    DEFENSE_Z: 0,
    DEFENSE_HEALTH: 120,
    DEMOLITION_TIME: 55
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
  const TANK_UPGRADES = Object.freeze({
    speed: Object.freeze({ label: "PROPULSION", speedMultiplier: 0.07 }),
    armor: Object.freeze({ label: "BLINDAGE", damageReduction: 0.08 }),
    range: Object.freeze({ label: "TRAJECTOIRE", rangeMultiplier: 0.15 })
  });
  const UPGRADE_IDS = Object.freeze(["speed", "armor", "range"]);
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
      speed: 1.05,
      speedVariance: 0.18,
      preferredRangeMin: 25,
      preferredRangeMax: 34,
      scale: 1.72,
      hitRadius: 1.62,
      turretTurnRate: 1.05,
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
      twinCannon: true
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
    ENVIRONMENT,
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
