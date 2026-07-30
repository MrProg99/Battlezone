(() => {
  "use strict";

  const {
    TAU,
    WORLD_LIMIT,
    COOP_ROLES,
    PLAYER_FORMATION_X,
    PLAYER_FORMATION_Z,
    SCRIPTED_MISSION,
    RAMP_SYSTEM
  } = window.BattlezoneConfig;

  const rocks = [];
  const ramps = [];
  const volcanoes = [];

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

  function distance(a, b) {
    return Math.hypot(a.x - b.x, a.z - b.z);
  }

  function orientedPosition(origin, localX, localZ, angle) {
    const angleCos = Math.cos(angle);
    const angleSin = Math.sin(angle);
    return {
      x: origin.x + localX * angleCos + localZ * angleSin,
      z: origin.z - localX * angleSin + localZ * angleCos
    };
  }

  function getRampCoordinates(ramp, x, z) {
    const offsetX = x - ramp.x;
    const offsetZ = z - ramp.z;
    const headingSin = ramp.headingSin;
    const headingCos = ramp.headingCos;
    const forwardX = headingSin;
    const forwardZ = headingCos;
    const rightX = headingCos;
    const rightZ = -headingSin;
    return {
      side: offsetX * rightX + offsetZ * rightZ,
      forward: offsetX * forwardX + offsetZ * forwardZ
    };
  }

  function getRampSurface(x, z) {
    for (const ramp of ramps) {
      const local = getRampCoordinates(ramp, x, z);
      const progress = local.forward / ramp.length + 0.5;
      if (
        Math.abs(local.side) > ramp.width * 0.5 ||
        progress < 0 ||
        progress > 1
      ) continue;
      return {
        ramp,
        progress,
        height: ramp.height * progress,
        side: local.side,
        forward: local.forward
      };
    }
    return null;
  }

  function createRamp(rampRandom, formationPoints) {
    for (let attempt = 0; attempt < 180; attempt += 1) {
      const x = (rampRandom() * 2 - 1) * (WORLD_LIMIT - 10);
      const z = (rampRandom() * 2 - 1) * (WORLD_LIMIT - 10);
      const heading = rampRandom() * TAU;
      const ramp = {
        id: "ramp-1",
        label: "RAMPE",
        x,
        z,
        heading,
        headingSin: Math.sin(heading),
        headingCos: Math.cos(heading),
        length: RAMP_SYSTEM.LENGTH,
        width: RAMP_SYSTEM.WIDTH,
        height: RAMP_SYSTEM.HEIGHT
      };
      const lowApproach = orientedPosition(
        ramp,
        0,
        -ramp.length * 0.5 - 4,
        ramp.heading
      );
      const landingEnd = orientedPosition(
        ramp,
        0,
        ramp.length * 0.5 + RAMP_SYSTEM.LANDING_CLEARANCE,
        ramp.heading
      );
      const insideWorld = [lowApproach, landingEnd].every(
        (point) =>
          Math.abs(point.x) <= WORLD_LIMIT - RAMP_SYSTEM.MAP_EDGE_MARGIN &&
          Math.abs(point.z) <= WORLD_LIMIT - RAMP_SYSTEM.MAP_EDGE_MARGIN
      );
      const pathIsClearOf = (point, sidePadding) => {
        const local = getRampCoordinates(ramp, point.x, point.z);
        return (
          Math.abs(local.side) > ramp.width * 0.5 + sidePadding ||
          local.forward < -ramp.length * 0.5 - 5 ||
          local.forward > ramp.length * 0.5 + RAMP_SYSTEM.LANDING_CLEARANCE
        );
      };
      const clearOfFormation = formationPoints.every((formation) =>
        pathIsClearOf(formation, 7)
      );
      const clearOfDefenseRelay = pathIsClearOf(
        { x: SCRIPTED_MISSION.DEFENSE_X, z: SCRIPTED_MISSION.DEFENSE_Z },
        6
      );
      if (insideWorld && clearOfFormation && clearOfDefenseRelay) return ramp;
    }

    return {
      id: "ramp-1",
      label: "RAMPE",
      x: 0,
      z: -24,
      heading: 0,
      headingSin: 0,
      headingCos: 1,
      length: RAMP_SYSTEM.LENGTH,
      width: RAMP_SYSTEM.WIDTH,
      height: RAMP_SYSTEM.HEIGHT
    };
  }

  function createRock(random, formationPoints) {
    const angle = random() * TAU;
    const radiusFromCenter = 12 + random() * (WORLD_LIMIT - 18);
    const rock = {
      x: Math.sin(angle) * radiusFromCenter,
      z: Math.cos(angle) * radiusFromCenter,
      radius: 0.8 + random() * 1.9,
      height: 1.2 + random() * 3.2,
      seed: random() * TAU
    };
    const blocksFormation = formationPoints.some(
      (formation) => distance(formation, rock) < rock.radius + 7
    );
    const blocksDefenseRelay =
      distance(
        { x: SCRIPTED_MISSION.DEFENSE_X, z: SCRIPTED_MISSION.DEFENSE_Z },
        rock
      ) < rock.radius + 6;
    const blocksRamp = ramps.some((ramp) => {
      const local = getRampCoordinates(ramp, rock.x, rock.z);
      const sideClearance = ramp.width * 0.5 + rock.radius + 2.5;
      const rearClearance = ramp.length * 0.5 + rock.radius + 3;
      const landingClearance =
        ramp.length * 0.5 + rock.radius + RAMP_SYSTEM.LANDING_CLEARANCE;
      return (
        Math.abs(local.side) < sideClearance &&
        local.forward > -rearClearance &&
        local.forward < landingClearance
      );
    });
    return blocksFormation || blocksDefenseRelay || blocksRamp ? null : rock;
  }

  function createVolcano(volcanoRandom) {
    const angle = volcanoRandom() * TAU;
    const range = WORLD_LIMIT + 12 + volcanoRandom() * 8;
    return {
      x: Math.sin(angle) * range,
      z: Math.cos(angle) * range,
      radius: 9.5 + volcanoRandom() * 2.4,
      craterRadius: 2.15 + volcanoRandom() * 0.55,
      height: 8.2 + volcanoRandom() * 1.8,
      rotation: volcanoRandom() * TAU,
      profile: Array.from(
        { length: 12 },
        () => 0.82 + volcanoRandom() * 0.3
      ),
      emissionTimer: 0.08,
      eruptionTimer: 1.8 + volcanoRandom() * 1.5
    };
  }

  function generate(seed = Math.floor(Math.random() * 0xffffffff)) {
    const normalizedSeed = Number(seed) >>> 0;
    const random = seededRandom(normalizedSeed);
    const volcanoRandom = seededRandom((normalizedSeed ^ 0x51f15e7d) >>> 0);
    const rampRandom = seededRandom((normalizedSeed ^ 0xa53c91e7) >>> 0);
    const formationPoints = COOP_ROLES.map((role) => ({
      x: PLAYER_FORMATION_X,
      z: PLAYER_FORMATION_Z[role]
    }));

    rocks.length = 0;
    ramps.length = 0;
    volcanoes.length = 0;
    ramps.push(createRamp(rampRandom, formationPoints));

    for (let attempt = 0; rocks.length < 28 && attempt < 180; attempt += 1) {
      const rock = createRock(random, formationPoints);
      if (rock) rocks.push(rock);
    }
    volcanoes.push(createVolcano(volcanoRandom));

    return { seed: normalizedSeed, rocks, ramps, volcanoes };
  }

  window.BattlezoneTerrain = Object.freeze({
    rocks,
    ramps,
    volcanoes,
    generate,
    seededRandom,
    getRampCoordinates,
    getRampSurface
  });
})();
