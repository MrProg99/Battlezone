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
  let audioContext = null;
  let selectedTankId = "scout";

  const keys = new Set();
  const enemies = [];
  const shells = [];
  const particles = [];
  const rocks = [];

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

  function selectPlayerTank(tankId) {
    if (!PLAYER_TANKS[tankId]) return;
    selectedTankId = tankId;
    if (missionPhase === MISSION_PHASE.IDLE) player.tankId = tankId;
    for (const card of tankCards) {
      const selected = card.dataset.tank === tankId;
      card.classList.toggle("selected", selected);
      card.setAttribute("aria-checked", String(selected));
    }
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
      y: localY,
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
    const edges = [
      [0, 1], [1, 2], [2, 3], [3, 0],
      [4, 5], [5, 6], [6, 7], [7, 4],
      [0, 4], [1, 5], [2, 6], [3, 7]
    ];
    for (const [a, b] of edges) line3d(vertices[a], vertices[b], color, 1.25, alpha);
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

  function drawMobileEnemy(enemy, type, color, fade) {
    const scale = type.scale;
    drawBox(
      enemy,
      [0.95 * scale, 0.42 * scale, 1.25 * scale],
      enemy.heading,
      color,
      fade
    );

    const turretOrigin = orientedPoint(enemy, 0, 0, 0.08 * scale, enemy.heading);
    drawBox(
      turretOrigin,
      [0.58 * scale, 0.75 * scale, 0.62 * scale],
      enemy.turretHeading,
      color,
      fade
    );

    const barrelY = 0.56 * scale;
    const barrelStart = orientedPoint(
      enemy,
      0,
      barrelY,
      0.55 * scale,
      enemy.turretHeading
    );
    const barrelEnd = orientedPoint(
      enemy,
      0,
      barrelY,
      2.05 * scale,
      enemy.turretHeading
    );
    line3d(barrelStart, barrelEnd, color, type.id === "light" ? 1.3 : 2, fade);

    const trackOffset = 1.08 * scale;
    const trackLength = 1.22 * scale;
    const trackY = 0.12 * scale;
    line3d(
      orientedPoint(enemy, -trackOffset, trackY, -trackLength, enemy.heading),
      orientedPoint(enemy, -trackOffset, trackY, trackLength, enemy.heading),
      color,
      2,
      fade
    );
    line3d(
      orientedPoint(enemy, trackOffset, trackY, -trackLength, enemy.heading),
      orientedPoint(enemy, trackOffset, trackY, trackLength, enemy.heading),
      color,
      2,
      fade
    );
  }

  function drawArtilleryEnemy(enemy, color, fade) {
    drawBox(enemy, [1.25, 0.34, 1.18], enemy.heading, color, fade);
    const turretOrigin = orientedPoint(enemy, 0, 0, 0.04, enemy.heading);
    drawBox(turretOrigin, [0.72, 0.88, 0.7], enemy.turretHeading, color, fade);

    const barrelStart = orientedPoint(enemy, 0, 0.7, 0.48, enemy.turretHeading);
    const barrelEnd = orientedPoint(enemy, 0, 1.72, 2.35, enemy.turretHeading);
    line3d(barrelStart, barrelEnd, color, 2.4, fade);

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
  }

  function drawEnemy(enemy) {
    const type = getEnemyType(enemy);
    const centerProjection = project({
      x: enemy.x,
      y: type.id === "artillery" ? 1 : 0.85 * type.scale,
      z: enemy.z
    });
    if (!centerProjection) return;

    const range = distance(player, enemy);
    const fade = Math.max(0.32, Math.min(1, 1.35 - range / 90));
    const baseColor = type.priority ? COLORS.amber : COLORS.red;
    const color = enemy.hitFlash > 0 ? COLORS.white : baseColor;

    if (type.id === "artillery") {
      drawArtilleryEnemy(enemy, color, fade);
    } else {
      drawMobileEnemy(enemy, type, color, fade);
    }

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
      `${type.code}-${String(enemy.id).padStart(2, "0")} ${type.label}  ${Math.round(range * 10)}m`,
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
      shell.owner === "player" || artillery ? COLORS.amber : COLORS.red;
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
      for (let i = 1; i < shell.trail.length; i += 1) {
        line3d(
          shell.trail[i - 1],
          shell.trail[i],
          COLORS.amber,
          1.2,
          i / shell.trail.length * 0.6
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

  function drawReticle() {
    const x = width / 2;
    const y = horizon;
    const chassisAngle = -Math.PI / 2 - player.turretOffset;
    const chassisRadius = 45;
    const chassisX = x + Math.cos(chassisAngle) * chassisRadius;
    const chassisY = y + Math.sin(chassisAngle) * chassisRadius;
    const aligned = Math.abs(player.turretOffset) < 0.025;
    const locked = enemies.some((enemy) => {
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

  function drawCockpit() {
    const baseY = height;
    const midX = width / 2;
    const dark = "rgba(1, 6, 3, 0.93)";

    ctx.save();
    ctx.fillStyle = dark;
    ctx.strokeStyle = COLORS.dim;
    ctx.lineWidth = 1;

    ctx.beginPath();
    ctx.moveTo(0, baseY);
    ctx.lineTo(0, baseY - 104);
    ctx.lineTo(width * 0.19, baseY - 86);
    ctx.lineTo(width * 0.29, baseY);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(width, baseY);
    ctx.lineTo(width, baseY - 104);
    ctx.lineTo(width * 0.81, baseY - 86);
    ctx.lineTo(width * 0.71, baseY);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(midX - 130, baseY);
    ctx.lineTo(midX - 86, baseY - 31);
    ctx.lineTo(midX + 86, baseY - 31);
    ctx.lineTo(midX + 130, baseY);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    ctx.strokeStyle = COLORS.green;
    ctx.globalAlpha = 0.52;
    ctx.beginPath();
    ctx.moveTo(midX - 19, baseY);
    ctx.lineTo(midX - 6, baseY - 55);
    ctx.lineTo(midX + 6, baseY - 55);
    ctx.lineTo(midX + 19, baseY);
    ctx.stroke();
    ctx.globalAlpha = 1;
    ctx.restore();
  }

  function drawRadar() {
    const compact = width < 560;
    const radius = compact ? 44 : 58;
    const x = width - radius - (compact ? 13 : 28);
    const y = radius + (compact ? 13 : 28);
    const range = 48;
    const yaw = player.heading + player.turretOffset;

    ctx.save();
    ctx.translate(x, y);
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

      if (type.priority) {
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
    ctx.restore();

    ctx.fillStyle = COLORS.green;
    ctx.font = "9px Courier New";
    ctx.textAlign = "center";
    ctx.fillText("RADAR // 480m", x, y + radius + 14);
  }

  function drawHud() {
    const margin = width < 560 ? 14 : 28;
    const tank = getPlayerTank();
    const range = Math.round(tank.shellSpeed * tank.shellLifetime * 10);
    ctx.save();
    ctx.font = "11px Courier New";
    ctx.textAlign = "left";
    ctx.fillStyle = COLORS.amber;
    ctx.fillText(`${tank.label} // PORTÉE ${range}m`, margin, 30);
    ctx.fillStyle = COLORS.green;
    ctx.fillText(`SCORE ${String(player.score).padStart(6, "0")}`, margin, 47);
    ctx.fillText(`VAGUE ${String(player.wave).padStart(2, "0")}`, margin, 64);
    ctx.fillStyle = COLORS.red;
    ctx.fillText(`CIBLES ${String(enemies.length).padStart(2, "0")}`, margin, 81);

    const armorWidth = Math.min(180, width * 0.34);
    const armorX = margin;
    const armorY = height - 32;
    ctx.fillStyle = COLORS.green;
    ctx.fillText("BLINDAGE", armorX, armorY - 9);
    ctx.strokeStyle = player.health < 30 ? COLORS.red : COLORS.green;
    ctx.strokeRect(armorX, armorY, armorWidth, 8);
    ctx.fillStyle = player.health < 30 ? COLORS.red : COLORS.green;
    ctx.fillRect(armorX + 2, armorY + 2, (armorWidth - 4) * (player.health / 100), 4);
    ctx.textAlign = "right";
    ctx.fillText(`${Math.ceil(player.health)}%`, armorX + armorWidth, armorY - 9);

    const reloadWidth = Math.min(160, width * 0.3);
    const reloadX = width - margin - reloadWidth;
    const reloadY = height - 32;
    const ready = player.reload <= 0;
    ctx.fillStyle = ready ? COLORS.amber : COLORS.green;
    ctx.textAlign = "left";
    ctx.fillText(ready ? "CANON PRÊT" : "RECHARGE", reloadX, reloadY - 9);
    ctx.strokeStyle = ready ? COLORS.amber : COLORS.green;
    ctx.strokeRect(reloadX, reloadY, reloadWidth, 8);
    ctx.fillStyle = ready ? COLORS.amber : COLORS.green;
    const reloadProgress = ready ? 1 : 1 - player.reload / tank.reloadTime;
    ctx.fillRect(reloadX + 2, reloadY + 2, (reloadWidth - 4) * Math.max(0, reloadProgress), 4);
    ctx.restore();
  }

  function drawIncomingArtilleryWarning() {
    let incoming = null;
    for (const shell of shells) {
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
    const radius = 30 + progress * Math.min(width, height) * 0.5;

    ctx.save();
    ctx.fillStyle = `rgba(220, 255, 228, ${landingPulse * 0.1})`;
    ctx.fillRect(0, 0, width, height);
    ctx.globalAlpha = landingPulse * 0.8;
    ctx.strokeStyle = COLORS.amber;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.ellipse(width / 2, horizon + height * 0.18, radius, radius * 0.24, 0, 0, TAU);
    ctx.stroke();
    ctx.restore();
  }

  function draw() {
    const shakeX = screenShake > 0 ? (Math.random() - 0.5) * screenShake : 0;
    const shakeY = screenShake > 0 ? (Math.random() - 0.5) * screenShake : 0;

    ctx.save();
    ctx.setTransform(dpr, 0, 0, dpr, shakeX * dpr, shakeY * dpr);
    ctx.fillStyle = COLORS.black;
    ctx.fillRect(-20, -20, width + 40, height + 40);

    if (missionPhase !== MISSION_PHASE.DROP || player.altitude < 8) drawMountains();
    drawGround();

    const renderables = [
      ...rocks.map((rock) => ({
        depth: distance(player, rock),
        draw: () => drawRock(rock)
      })),
      ...enemies.map((enemy) => ({
        depth: distance(player, enemy),
        draw: () => drawEnemy(enemy)
      })),
      ...shells.map((shell) => ({
        depth: distance(player, shell),
        draw: () => drawShell(shell)
      })),
      ...particles.map((particle) => ({
        depth: distance(player, particle),
        draw: () => drawParticle(particle)
      }))
    ];
    renderables.sort((a, b) => b.depth - a.depth);
    for (const item of renderables) item.draw();

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
    drawLandingImpact();

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
      state: type.static ? ENEMY_STATE.ENGAGE : ENEMY_STATE.APPROACH,
      stateTimer: Math.random() * 0.4,
      hitFlash: 0
    };
  }

  function spawnWave() {
    player.wave += 1;
    const count = Math.min(3 + player.wave, 9);
    for (let i = 0; i < count; i += 1) {
      const type = getWaveEnemyType(i, count);
      const minimumRange = type.id === "artillery" ? 44 : 30;
      const maximumRange = type.id === "artillery" ? 66 : 58;
      let position = randomSpawn(minimumRange, maximumRange);
      let attempts = 0;
      while (rocks.some((rock) => distance(position, rock) < rock.radius + 3) && attempts < 12) {
        position = randomSpawn(minimumRange, maximumRange);
        attempts += 1;
      }
      enemies.push(createEnemy(type, position));
    }
    waveText = `VAGUE ${String(player.wave).padStart(2, "0")}`;
    waveBanner = 2.8;
    tone(240, 0.08, "square", 0.035);
    setTimeout(() => tone(360, 0.12, "square", 0.03), 110);
  }

  function createRocks() {
    rocks.length = 0;
    for (let i = 0; i < 24; i += 1) {
      const angle = Math.random() * TAU;
      const radiusFromCenter = 12 + Math.random() * 62;
      rocks.push({
        x: Math.sin(angle) * radiusFromCenter,
        z: Math.cos(angle) * radiusFromCenter,
        radius: 0.8 + Math.random() * 1.9,
        height: 1.2 + Math.random() * 3.2,
        seed: Math.random() * TAU
      });
    }
  }

  function resetGame() {
    enemies.length = 0;
    shells.length = 0;
    particles.length = 0;
    enemySerial = 0;
    Object.assign(player, {
      tankId: selectedTankId,
      x: 0,
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
    screenShake = 0;
    flash = 0;
    waveBanner = 0;
    waveText = "";
    missionPhase = MISSION_PHASE.DROP;
    dropElapsed = 0;
    landingPulse = 0;
    cameraPitch = DROP_SEQUENCE.START_PITCH;
    update.nextWaveTimer = 0;
    createRocks();
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

  function burst(x, z, color, count = 14) {
    for (let i = 0; i < count; i += 1) {
      const angle = Math.random() * TAU;
      const speed = 1.8 + Math.random() * 7;
      const life = 0.35 + Math.random() * 0.55;
      particles.push({
        x,
        y: 0.4 + Math.random() * 0.7,
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
      kind: "direct",
      x: player.x + Math.sin(yaw) * 1.8,
      y: 0.86,
      z: player.z + Math.cos(yaw) * 1.8,
      vx: Math.sin(yaw) * tank.shellSpeed,
      vz: Math.cos(yaw) * tank.shellSpeed,
      life: tank.shellLifetime,
      owner: "player"
    });
    createMuzzleSmoke(yaw);
    player.reload = tank.reloadTime;
    screenShake = 5;
    tone(74, 0.12, "sawtooth", 0.07, -28);
    tone(190, 0.05, "square", 0.035, -80);
  }

  function fireEnemy(enemy) {
    const type = getEnemyType(enemy);
    const accuracy = Math.min(0.18, 0.08 + distance(player, enemy) * 0.0015);
    const shotYaw = enemy.turretHeading + (Math.random() - 0.5) * accuracy;
    shells.push({
      kind: "direct",
      x: enemy.x + Math.sin(shotYaw) * 1.7,
      y: 0.72,
      z: enemy.z + Math.cos(shotYaw) * 1.7,
      vx: Math.sin(shotYaw) * type.shellSpeed,
      vz: Math.cos(shotYaw) * type.shellSpeed,
      life: type.shellLifetime,
      owner: "enemy"
    });
    tone(105, 0.08, "square", 0.018, -35);
  }

  function fireArtillery(enemy) {
    const type = getEnemyType(enemy);
    const muzzle = orientedPoint(enemy, 0, 1.45, 1.55, enemy.turretHeading);
    const leadTime = 0.7 + Math.random() * 0.35;
    const targetX = Math.max(
      -WORLD_LIMIT + 2,
      Math.min(
        WORLD_LIMIT - 2,
        player.x +
          Math.sin(player.heading) * player.speed * leadTime +
          (Math.random() - 0.5) * 2.2
      )
    );
    const targetZ = Math.max(
      -WORLD_LIMIT + 2,
      Math.min(
        WORLD_LIMIT - 2,
        player.z +
          Math.cos(player.heading) * player.speed * leadTime +
          (Math.random() - 0.5) * 2.2
      )
    );
    const flightTime = type.shellFlightTime + (Math.random() - 0.5) * 0.3;
    const shotRange = Math.hypot(targetX - muzzle.x, targetZ - muzzle.z);

    shells.push({
      kind: "artillery",
      owner: "enemy",
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

    const nextX = player.x + Math.sin(player.heading) * player.speed * dt;
    const nextZ = player.z + Math.cos(player.heading) * player.speed * dt;
    if (
      Math.abs(nextX) < WORLD_LIMIT - 1 &&
      Math.abs(nextZ) < WORLD_LIMIT - 1 &&
      !circleCollision(nextX, nextZ, 1.05)
    ) {
      player.x = nextX;
      player.z = nextZ;
    } else {
      player.speed *= -0.18;
    }

    player.reload = Math.max(0, player.reload - dt);
    player.invulnerable = Math.max(0, player.invulnerable - dt);
    alignmentPulse = Math.max(0, alignmentPulse - dt);
  }

  function chooseEnemyState(enemy, range) {
    if (range > enemy.preferredRange + ENEMY_AI.APPROACH_MARGIN) {
      enemy.state = ENEMY_STATE.APPROACH;
    } else if (range < enemy.preferredRange - ENEMY_AI.RETREAT_MARGIN) {
      enemy.state = ENEMY_STATE.RETREAT;
    } else {
      enemy.state = ENEMY_STATE.ENGAGE;
      if (Math.random() < 0.22) enemy.strafeDirection *= -1;
    }

    enemy.stateTimer =
      ENEMY_AI.DECISION_MIN +
      Math.random() * (ENEMY_AI.DECISION_MAX - ENEMY_AI.DECISION_MIN);
  }

  function getEnemyMovementPlan(enemy, targetHeading) {
    switch (enemy.state) {
      case ENEMY_STATE.RETREAT:
        return {
          heading: targetHeading + Math.PI + enemy.strafeDirection * 0.22,
          speedScale: 0.86
        };
      case ENEMY_STATE.ENGAGE:
        return {
          heading: targetHeading + enemy.strafeDirection * 1.24,
          speedScale: 0.72
        };
      case ENEMY_STATE.REPOSITION:
        return {
          heading: targetHeading + enemy.strafeDirection * 1.75,
          speedScale: 0.92
        };
      case ENEMY_STATE.APPROACH:
      default:
        return {
          heading: targetHeading + enemy.strafeDirection * 0.18,
          speedScale: 1
        };
    }
  }

  function updateEnemyMovement(enemy, targetHeading, range, dt) {
    const type = getEnemyType(enemy);
    if (type.static) return;

    enemy.stateTimer -= dt;
    if (range < ENEMY_AI.EMERGENCY_RANGE && enemy.state !== ENEMY_STATE.RETREAT) {
      enemy.state = ENEMY_STATE.RETREAT;
      enemy.stateTimer = 0.6;
    } else if (enemy.stateTimer <= 0) {
      chooseEnemyState(enemy, range);
    }

    const plan = getEnemyMovementPlan(enemy, targetHeading);
    enemy.heading = turnTowardAngle(
      enemy.heading,
      plan.heading,
      ENEMY_AI.CHASSIS_TURN_RATE * dt
    );

    const moveSpeed = enemy.speed * plan.speedScale;
    const nextX = enemy.x + Math.sin(enemy.heading) * moveSpeed * dt;
    const nextZ = enemy.z + Math.cos(enemy.heading) * moveSpeed * dt;
    const collisionRadius = 1.12 * type.scale;
    const hitsRock = circleCollision(nextX, nextZ, collisionRadius);
    const hitsEnemy = enemies.some((other) => {
      if (other === enemy) return false;
      const otherRadius = 1.12 * getEnemyType(other).scale;
      return (
        Math.hypot(nextX - other.x, nextZ - other.z) <
        collisionRadius + otherRadius
      );
    });
    const staysInWorld =
      Math.abs(nextX) < WORLD_LIMIT - 1 &&
      Math.abs(nextZ) < WORLD_LIMIT - 1;

    if (!hitsRock && !hitsEnemy && staysInWorld) {
      enemy.x = nextX;
      enemy.z = nextZ;
      return;
    }

    if (enemy.state !== ENEMY_STATE.REPOSITION) enemy.strafeDirection *= -1;
    enemy.state = ENEMY_STATE.REPOSITION;
    enemy.stateTimer = 0.7 + Math.random() * 0.35;
    enemy.heading = normalizeAngle(enemy.heading + enemy.strafeDirection * 0.32);
  }

  function updateEnemyTurret(enemy, targetHeading, range, dt) {
    const type = getEnemyType(enemy);
    enemy.turretHeading = turnTowardAngle(
      enemy.turretHeading,
      targetHeading,
      type.turretTurnRate * dt
    );
    enemy.reload -= dt;

    if (enemy.reload > 0 || range >= type.fireRange) return;

    const facingError = Math.abs(normalizeAngle(targetHeading - enemy.turretHeading));
    if (facingError <= type.fireAlignment) {
      if (type.id === "artillery") fireArtillery(enemy);
      else fireEnemy(enemy);
      enemy.reload =
        Math.max(type.reloadMin, type.reloadBase - player.wave * 0.08) +
        Math.random() * type.reloadJitter;
    }
  }

  function updateEnemies(dt) {
    for (const enemy of enemies) {
      const dx = player.x - enemy.x;
      const dz = player.z - enemy.z;
      const range = Math.hypot(dx, dz);
      const targetHeading = Math.atan2(dx, dz);

      enemy.hitFlash = Math.max(0, enemy.hitFlash - dt);
      updateEnemyMovement(enemy, targetHeading, range, dt);
      updateEnemyTurret(enemy, targetHeading, range, dt);
    }
  }

  function damagePlayer(amount, impactX, impactZ, shake = 12) {
    if (player.invulnerable > 0 || gameOver) return;
    player.health = Math.max(0, player.health - amount);
    player.invulnerable = 0.55;
    flash = 1;
    screenShake = Math.max(screenShake, shake);
    burst(impactX, impactZ, COLORS.red, 18);
    tone(92, 0.25, "sawtooth", 0.08, -45);
    if (player.health <= 0) endGame();
  }

  function explodeArtilleryShell(shell) {
    const blastDistance = Math.hypot(
      shell.targetX - player.x,
      shell.targetZ - player.z
    );
    burst(shell.targetX, shell.targetZ, COLORS.red, 34);
    burst(shell.targetX, shell.targetZ, COLORS.amber, 18);
    createBlastSmoke(shell.targetX, shell.targetZ);
    screenShake = Math.max(screenShake, Math.max(2, 13 - blastDistance * 0.18));
    tone(44, 0.48, "sawtooth", 0.095, -12);

    if (blastDistance <= shell.blastRadius) {
      const falloff = 1 - blastDistance / shell.blastRadius * 0.35;
      damagePlayer(
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

      if (shell.owner === "player") {
        const enemyIndex = enemies.findIndex((enemy) => {
          const hitRadius = 1.45 * getEnemyType(enemy).hitRadius;
          return Math.hypot(shell.x - enemy.x, shell.z - enemy.z) < hitRadius;
        });
        if (enemyIndex !== -1) {
          const enemy = enemies[enemyIndex];
          const type = getEnemyType(enemy);
          enemy.health -= 1;
          enemy.hitFlash = 0.14;
          shells.splice(i, 1);
          burst(shell.x, shell.z, COLORS.amber, 10);
          tone(260, 0.07, "square", 0.035, -120);
          if (enemy.health <= 0) {
            player.score += type.score * player.wave;
            player.kills += 1;
            burst(enemy.x, enemy.z, COLORS.red, 32);
            screenShake = 9;
            tone(58, 0.34, "sawtooth", 0.08, -20);
            enemies.splice(enemyIndex, 1);
          } else {
            player.score += 25;
          }
        }
      } else if (Math.hypot(shell.x - player.x, shell.z - player.z) < 1.2) {
        shells.splice(i, 1);
        damagePlayer(18, shell.x, shell.z, 12);
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

  function finishDropSequence() {
    player.altitude = 0;
    cameraPitch = 0;
    missionPhase = MISSION_PHASE.COMBAT;
    landingPulse = 1;
    screenShake = 24;
    createLandingDust();
    tone(48, 0.42, "sawtooth", 0.1, -16);
    tone(130, 0.16, "square", 0.045, -70);
    spawnWave();
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
      updateScreenEffects(dt);
      return;
    }

    updatePlayer(dt);
    updateEnemies(dt);
    updateShells(dt);
    updateParticles(dt);
    updateScreenEffects(dt);
    waveBanner = Math.max(0, waveBanner - dt);

    if (enemies.length === 0 && !gameOver) {
      waveBanner -= dt;
      if (!update.nextWaveTimer) update.nextWaveTimer = 1.7;
      update.nextWaveTimer -= dt;
      if (update.nextWaveTimer <= 0) {
        update.nextWaveTimer = 0;
        player.health = Math.min(100, player.health + 12);
        spawnWave();
      }
    } else {
      update.nextWaveTimer = 0;
    }
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
  selectPlayerTank(selectedTankId);
  startButton.addEventListener("click", startGame);
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
    if (event.code === "KeyR" && gameOver) startGame();
  });

  document.addEventListener("keyup", (event) => keys.delete(event.code));
  window.addEventListener("blur", () => {
    keys.clear();
    if (running && !gameOver && !paused) togglePause();
  });
  window.addEventListener("resize", resize);

  resize();
  createRocks();
  requestAnimationFrame(loop);
})();
