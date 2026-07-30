(() => {
  "use strict";

  const {
    MAX_COOP_PLAYERS,
    MINELAYER,
    SCRIPTED_MISSION,
    ENVIRONMENT,
    ENEMY_TYPES
  } = window.BattlezoneConfig;

  const MISSION_ROTATION = Object.freeze([
    SCRIPTED_MISSION.DEFEND,
    SCRIPTED_MISSION.STEALTH,
    SCRIPTED_MISSION.DEMOLITION
  ]);

  function createDefenseState({ cycle, coop, playerCount }) {
    const normalizedPlayerCount = Math.max(
      1,
      Math.min(MAX_COOP_PLAYERS, Math.floor(Number(playerCount) || 1))
    );
    const extraCoopPlayers = coop ? normalizedPlayerCount - 1 : 0;
    const health =
      SCRIPTED_MISSION.DEFENSE_HEALTH +
      cycle * 10 +
      extraCoopPlayers * SCRIPTED_MISSION.DEFENSE_HEALTH_PER_EXTRA_PLAYER;
    return {
      x: SCRIPTED_MISSION.DEFENSE_X,
      z: SCRIPTED_MISSION.DEFENSE_Z,
      health,
      maxHealth: health,
      shieldTimer: SCRIPTED_MISSION.DEFENSE_SHIELD_TIME
    };
  }

  function createDemolitionState() {
    return { timer: SCRIPTED_MISSION.DEMOLITION_TIME };
  }

  const MISSION_CATALOG = Object.freeze({
    [SCRIPTED_MISSION.STANDARD]: Object.freeze({
      id: SCRIPTED_MISSION.STANDARD,
      title: "ASSAUT STANDARD",
      subtitle: "SIGNATURES HOSTILES DÉTECTÉES",
      active: false,
      environment: null
    }),
    [SCRIPTED_MISSION.DEFEND]: Object.freeze({
      id: SCRIPTED_MISSION.DEFEND,
      title: "DÉFENDRE LE RELAIS",
      subtitle: "EMPÊCHER LA DESTRUCTION DU RELAIS",
      active: true,
      environment: Object.freeze({
        type: ENVIRONMENT.FOG,
        startingWave: ENVIRONMENT.FOG_STARTING_WAVE,
        interval: MISSION_ROTATION.length,
        baseIntensity: 0.78,
        intensityStep: 0.05,
        maxIntensity: 1
      }),
      createState: createDefenseState,
      hangarStartingWave: 9
    }),
    [SCRIPTED_MISSION.STEALTH]: Object.freeze({
      id: SCRIPTED_MISSION.STEALTH,
      title: "CHASSE FANTÔME",
      subtitle: "SIGNATURES FANTÔMES // VISIBILITÉ RÉDUITE",
      active: true,
      environment: Object.freeze({
        type: ENVIRONMENT.RAIN,
        startingWave: ENVIRONMENT.RAIN_STARTING_WAVE,
        interval: MISSION_ROTATION.length,
        baseIntensity: 0.68,
        intensityStep: 0.04,
        maxIntensity: 0.92
      }),
      forceEnemyType: "ghost",
      allowHangar: false
    }),
    [SCRIPTED_MISSION.DEMOLITION]: Object.freeze({
      id: SCRIPTED_MISSION.DEMOLITION,
      title: "FRAPPE CHRONOMÉTRÉE",
      subtitle: "DÉTRUIRE LE CENTRE AVANT LA FIN DU DÉLAI",
      active: true,
      environment: null,
      createState: createDemolitionState
    })
  });

  function normalizeWave(wave) {
    return Math.max(0, Math.floor(Number(wave) || 0));
  }

  function getTypeForWave(wave) {
    const normalizedWave = normalizeWave(wave);
    if (normalizedWave < SCRIPTED_MISSION.STARTING_WAVE) {
      return SCRIPTED_MISSION.STANDARD;
    }
    const index =
      (normalizedWave - SCRIPTED_MISSION.STARTING_WAVE) %
      MISSION_ROTATION.length;
    return MISSION_ROTATION[index];
  }

  function normalizeType(type) {
    return Object.prototype.hasOwnProperty.call(MISSION_CATALOG, type)
      ? type
      : SCRIPTED_MISSION.STANDARD;
  }

  function getDefinitionForWave(wave) {
    return MISSION_CATALOG[normalizeType(getTypeForWave(wave))];
  }

  function getMissionCycle(wave) {
    const normalizedWave = normalizeWave(wave);
    if (normalizedWave < SCRIPTED_MISSION.STARTING_WAVE) return 0;
    return Math.floor(
      (normalizedWave - SCRIPTED_MISSION.STARTING_WAVE) /
      MISSION_ROTATION.length
    );
  }

  function createState(wave, options = {}) {
    const normalizedWave = normalizeWave(wave);
    const definition = getDefinitionForWave(normalizedWave);
    const state = {
      type: definition.id,
      active: Boolean(definition.active),
      completed: false,
      x: 0,
      z: 0,
      health: 0,
      maxHealth: 0,
      shieldTimer: 0,
      timer: 0,
      targetEnemyId: 0
    };
    if (!definition.createState) return state;
    return {
      ...state,
      ...definition.createState({
        wave: normalizedWave,
        cycle: getMissionCycle(normalizedWave),
        coop: Boolean(options.coop),
        playerCount: options.playerCount
      })
    };
  }

  function createEnvironmentState(wave) {
    const normalizedWave = normalizeWave(wave);
    const environment = getDefinitionForWave(normalizedWave).environment;
    if (!environment || normalizedWave < environment.startingWave) {
      return { type: ENVIRONMENT.CLEAR, intensity: 0 };
    }
    const cycle = Math.floor(
      (normalizedWave - environment.startingWave) / environment.interval
    );
    return {
      type: environment.type,
      intensity: Math.min(
        environment.maxIntensity,
        environment.baseIntensity + cycle * environment.intensityStep
      )
    };
  }

  function getEnvironmentVisibility(environmentState, range) {
    const intensity = Math.max(
      0,
      Math.min(1, Number(environmentState?.intensity) || 0)
    );
    const normalizedRange = Math.max(0, Number(range) || 0);
    if (environmentState?.type === ENVIRONMENT.RAIN) {
      const progress = Math.max(
        0,
        Math.min(
          1,
          (normalizedRange - ENVIRONMENT.RAIN_NEAR) /
            (ENVIRONMENT.RAIN_FAR - ENVIRONMENT.RAIN_NEAR)
        )
      );
      const smooth = progress * progress * (3 - 2 * progress);
      return 1 - smooth * 0.24 * intensity;
    }
    if (environmentState?.type !== ENVIRONMENT.FOG) return 1;
    const near = ENVIRONMENT.FOG_NEAR + (1 - intensity) * 5;
    const far = ENVIRONMENT.FOG_FAR + (1 - intensity) * 8;
    const progress = Math.max(
      0,
      Math.min(1, (normalizedRange - near) / (far - near))
    );
    const smooth = progress * progress * (3 - 2 * progress);
    return 1 - smooth;
  }

  function getBannerText(wave) {
    const normalizedWave = normalizeWave(wave);
    if (normalizedWave === 5) return "VAGUE 05 // BEHEMOTH";
    const definition = getDefinitionForWave(normalizedWave);
    if (definition.id === SCRIPTED_MISSION.STANDARD) {
      return `VAGUE ${String(normalizedWave).padStart(2, "0")}`;
    }
    const prefix = `V${String(normalizedWave).padStart(2, "0")}`;
    return `${prefix} // ${definition.title}`;
  }

  function getBannerSubtitle(missionState, environmentState) {
    const definition =
      MISSION_CATALOG[missionState?.type] ?? MISSION_CATALOG.standard;
    const subtitle = definition.subtitle;
    if (environmentState?.type === ENVIRONMENT.FOG) {
      return `BROUILLARD DENSE // ${subtitle}`;
    }
    if (environmentState?.type === ENVIRONMENT.RAIN) {
      return `PLUIE BATTANTE // ${subtitle}`;
    }
    return subtitle;
  }

  function getEnemyTypeForWave(wave, index, count) {
    const normalizedWave = normalizeWave(wave);
    const definition = getDefinitionForWave(normalizedWave);
    if (definition.forceEnemyType && ENEMY_TYPES[definition.forceEnemyType]) {
      return ENEMY_TYPES[definition.forceEnemyType];
    }
    if (normalizedWave === 5 && index === count - 1) {
      return ENEMY_TYPES.behemoth;
    }
    if (index === count - 1) return ENEMY_TYPES.artillery;
    if (normalizedWave >= 3 && index === count - 2) return ENEMY_TYPES.guardian;
    if (normalizedWave >= 4 && index === count - 3) return ENEMY_TYPES.ghost;
    if (normalizedWave >= 5 && index === count - 4) return ENEMY_TYPES.kamikaze;
    if (normalizedWave >= 6 && index === count - 5) return ENEMY_TYPES.drone;
    if (normalizedWave >= MINELAYER.STARTING_WAVE && index === 3) {
      return ENEMY_TYPES.minelayer;
    }
    if (index % 3 === 1) return ENEMY_TYPES.light;
    return ENEMY_TYPES.assault;
  }

  function shouldSpawnHangar(wave) {
    const normalizedWave = normalizeWave(wave);
    const definition = getDefinitionForWave(normalizedWave);
    if (definition.allowHangar === false) return false;
    if (
      normalizedWave >= 4 &&
      normalizedWave < SCRIPTED_MISSION.STARTING_WAVE
    ) {
      return (normalizedWave - 4) % 3 === 0;
    }
    return Boolean(
      definition.hangarStartingWave &&
      normalizedWave >= definition.hangarStartingWave
    );
  }

  function createWavePlan(wave, options = {}) {
    const normalizedWave = normalizeWave(wave);
    const definition = getDefinitionForWave(normalizedWave);
    return {
      wave: normalizedWave,
      type: definition.id,
      definition,
      mission: createState(normalizedWave, options),
      environment: createEnvironmentState(normalizedWave),
      bannerText: getBannerText(normalizedWave),
      spawnHangar: shouldSpawnHangar(normalizedWave)
    };
  }

  window.BattlezoneMissions = Object.freeze({
    catalog: MISSION_CATALOG,
    rotation: MISSION_ROTATION,
    normalizeType,
    getTypeForWave,
    getDefinitionForWave,
    getMissionCycle,
    createState,
    createEnvironmentState,
    getEnvironmentVisibility,
    getBannerText,
    getBannerSubtitle,
    getEnemyTypeForWave,
    shouldSpawnHangar,
    createWavePlan
  });
})();
