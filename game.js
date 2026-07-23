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

  let width = 0;
  let height = 0;
  let dpr = 1;
  let focal = 700;
  let horizon = 0;
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
  let enemySerial = 0;
  let audioContext = null;

  const keys = new Set();
  const enemies = [];
  const shells = [];
  const particles = [];
  const rocks = [];

  const player = {
    x: 0,
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

  function distance(a, b) {
    return Math.hypot(a.x - b.x, a.z - b.z);
  }

  function worldToCamera(point) {
    const yaw = player.heading + player.turretOffset;
    const dx = point.x - player.x;
    const dz = point.z - player.z;
    return {
      x: dx * Math.cos(yaw) - dz * Math.sin(yaw),
      y: point.y - 1.48,
      z: dx * Math.sin(yaw) + dz * Math.cos(yaw)
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

    ctx.strokeStyle = "rgba(120, 255, 154, 0.14)";
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(0, horizon);
    ctx.lineTo(width, horizon);
    ctx.stroke();
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

  function drawEnemy(enemy) {
    const centerProjection = project({ x: enemy.x, y: 0.85, z: enemy.z });
    if (!centerProjection) return;
    const range = distance(player, enemy);
    const fade = Math.max(0.32, Math.min(1, 1.35 - range / 90));
    const hitFlash = enemy.hitFlash > 0;
    const color = hitFlash ? COLORS.white : COLORS.red;

    drawBox(enemy, [0.95, 0.42, 1.25], enemy.heading, color, fade);

    const turretOrigin = orientedPoint(enemy, 0, 0, 0.08, enemy.heading);
    drawBox(turretOrigin, [0.58, 0.75, 0.62], enemy.heading, color, fade);

    const barrelStart = orientedPoint(enemy, 0, 0.56, 0.55, enemy.heading);
    const barrelEnd = orientedPoint(enemy, 0, 0.56, 2.05, enemy.heading);
    line3d(barrelStart, barrelEnd, color, 2, fade);

    const trackLeftA = orientedPoint(enemy, -1.08, 0.12, -1.22, enemy.heading);
    const trackLeftB = orientedPoint(enemy, -1.08, 0.12, 1.22, enemy.heading);
    const trackRightA = orientedPoint(enemy, 1.08, 0.12, -1.22, enemy.heading);
    const trackRightB = orientedPoint(enemy, 1.08, 0.12, 1.22, enemy.heading);
    line3d(trackLeftA, trackLeftB, color, 2, fade);
    line3d(trackRightA, trackRightB, color, 2, fade);

    if (centerProjection.depth < 42) {
      const labelY = centerProjection.y - Math.min(80, 45 / centerProjection.depth * 18);
      ctx.font = "9px Courier New";
      ctx.textAlign = "center";
      ctx.fillStyle = color;
      ctx.globalAlpha = fade * 0.8;
      ctx.fillText(`T-${String(enemy.id).padStart(2, "0")}  ${Math.round(range * 10)}m`, centerProjection.x, labelY);
      const barWidth = Math.min(34, 180 / centerProjection.depth);
      ctx.strokeRect(centerProjection.x - barWidth / 2, labelY + 5, barWidth, 3);
      ctx.fillRect(centerProjection.x - barWidth / 2, labelY + 5, barWidth * (enemy.health / enemy.maxHealth), 3);
      ctx.globalAlpha = 1;
    }
  }

  function drawShell(shell) {
    const p = project({ x: shell.x, y: shell.y, z: shell.z });
    if (!p) return;
    const radius = Math.max(1.4, Math.min(7, 18 / p.depth));
    const color = shell.owner === "player" ? COLORS.amber : COLORS.red;
    ctx.save();
    ctx.globalCompositeOperation = "lighter";
    ctx.fillStyle = color;
    ctx.shadowBlur = 13;
    ctx.shadowColor = color;
    ctx.beginPath();
    ctx.arc(p.x, p.y, radius, 0, TAU);
    ctx.fill();
    ctx.restore();

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
      const dx = enemy.x - player.x;
      const dz = enemy.z - player.z;
      const right = dx * Math.cos(yaw) - dz * Math.sin(yaw);
      const forward = dx * Math.sin(yaw) + dz * Math.cos(yaw);
      const px = (right / range) * radius;
      const py = (-forward / range) * radius;
      const length = Math.hypot(px, py);
      const scale = length > radius - 4 ? (radius - 4) / length : 1;
      ctx.fillStyle = COLORS.red;
      ctx.fillRect(px * scale - 2, py * scale - 2, 4, 4);
    }
    ctx.restore();

    ctx.fillStyle = COLORS.green;
    ctx.font = "9px Courier New";
    ctx.textAlign = "center";
    ctx.fillText("RADAR // 480m", x, y + radius + 14);
  }

  function drawHud() {
    const margin = width < 560 ? 14 : 28;
    ctx.save();
    ctx.font = "11px Courier New";
    ctx.textAlign = "left";
    ctx.fillStyle = COLORS.green;
    ctx.fillText(`SCORE ${String(player.score).padStart(6, "0")}`, margin, 30);
    ctx.fillText(`VAGUE ${String(player.wave).padStart(2, "0")}`, margin, 47);
    ctx.fillStyle = COLORS.red;
    ctx.fillText(`CIBLES ${String(enemies.length).padStart(2, "0")}`, margin, 64);

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
    const reloadProgress = ready ? 1 : 1 - player.reload / 0.72;
    ctx.fillRect(reloadX + 2, reloadY + 2, (reloadWidth - 4) * Math.max(0, reloadProgress), 4);
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

  function draw() {
    const shakeX = screenShake > 0 ? (Math.random() - 0.5) * screenShake : 0;
    const shakeY = screenShake > 0 ? (Math.random() - 0.5) * screenShake : 0;

    ctx.save();
    ctx.setTransform(dpr, 0, 0, dpr, shakeX * dpr, shakeY * dpr);
    ctx.fillStyle = COLORS.black;
    ctx.fillRect(-20, -20, width + 40, height + 40);

    drawMountains();
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

    drawReticle();
    drawCockpit();
    drawRadar();
    drawHud();
    drawWaveBanner();

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

  function spawnWave() {
    player.wave += 1;
    const count = Math.min(3 + player.wave, 9);
    for (let i = 0; i < count; i += 1) {
      let position = randomSpawn(30, 58);
      let attempts = 0;
      while (rocks.some((rock) => distance(position, rock) < rock.radius + 3) && attempts < 12) {
        position = randomSpawn(30, 58);
        attempts += 1;
      }
      const health = player.wave >= 4 && i % 3 === 0 ? 3 : 2;
      enemies.push({
        id: ++enemySerial,
        x: position.x,
        z: position.z,
        heading: Math.atan2(player.x - position.x, player.z - position.z),
        speed: 2.1 + Math.random() * 0.7 + player.wave * 0.08,
        health,
        maxHealth: health,
        reload: 1.2 + Math.random() * 2,
        strafe: Math.random() < 0.5 ? -1 : 1,
        hitFlash: 0,
        think: Math.random()
      });
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
      x: 0,
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
    createRocks();
    gameOver = false;
    paused = false;
    pauseLabel.classList.add("hidden");
    messagePanel.classList.add("hidden");
    spawnWave();
  }

  function startGame() {
    initAudio();
    resetGame();
    running = true;
    startScreen.classList.add("hidden");
    canvas.requestPointerLock?.();
    lastTime = performance.now();
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

  function firePlayer() {
    if (!running || paused || gameOver || player.reload > 0) return;
    const yaw = player.heading + player.turretOffset;
    shells.push({
      x: player.x + Math.sin(yaw) * 1.8,
      y: 0.86,
      z: player.z + Math.cos(yaw) * 1.8,
      vx: Math.sin(yaw) * 37,
      vz: Math.cos(yaw) * 37,
      life: 2.25,
      owner: "player"
    });
    player.reload = 0.72;
    screenShake = 5;
    tone(74, 0.12, "sawtooth", 0.07, -28);
    tone(190, 0.05, "square", 0.035, -80);
  }

  function fireEnemy(enemy) {
    const yaw = Math.atan2(player.x - enemy.x, player.z - enemy.z);
    const accuracy = Math.min(0.18, 0.08 + distance(player, enemy) * 0.0015);
    const shotYaw = yaw + (Math.random() - 0.5) * accuracy;
    shells.push({
      x: enemy.x + Math.sin(shotYaw) * 1.7,
      y: 0.72,
      z: enemy.z + Math.cos(shotYaw) * 1.7,
      vx: Math.sin(shotYaw) * 21,
      vz: Math.cos(shotYaw) * 21,
      life: 3.2,
      owner: "enemy"
    });
    tone(105, 0.08, "square", 0.018, -35);
  }

  function circleCollision(x, z, radius, obstacles = rocks) {
    return obstacles.some((obstacle) =>
      Math.hypot(x - obstacle.x, z - obstacle.z) < radius + obstacle.radius * 0.78
    );
  }

  function updatePlayer(dt) {
    const forward = keys.has("KeyW") || keys.has("ArrowUp");
    const backward = keys.has("KeyS") || keys.has("ArrowDown");
    const left = keys.has("KeyA") || keys.has("ArrowLeft");
    const right = keys.has("KeyD") || keys.has("ArrowRight");
    const targetSpeed = forward ? 8.6 : backward ? -5.2 : 0;
    const response = targetSpeed === 0 ? 5.5 : 3.4;
    player.speed += (targetSpeed - player.speed) * Math.min(1, dt * response);

    if (left || right) {
      const turn = (right ? 1 : -1) * dt * (1.25 - Math.min(Math.abs(player.speed), 7) * 0.035);
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

  function updateEnemies(dt) {
    for (let i = enemies.length - 1; i >= 0; i -= 1) {
      const enemy = enemies[i];
      const dx = player.x - enemy.x;
      const dz = player.z - enemy.z;
      const range = Math.hypot(dx, dz);
      const targetHeading = Math.atan2(dx, dz);
      enemy.think -= dt;
      enemy.hitFlash = Math.max(0, enemy.hitFlash - dt);
      enemy.reload -= dt;

      if (enemy.think <= 0) {
        if (Math.random() < 0.3) enemy.strafe *= -1;
        enemy.think = 0.7 + Math.random() * 1.4;
      }

      let desired = targetHeading;
      if (range < 14) desired += Math.PI;
      else if (range < 28) desired += enemy.strafe * 0.7;
      else desired += enemy.strafe * 0.15;

      const turnDifference = normalizeAngle(desired - enemy.heading);
      enemy.heading = normalizeAngle(enemy.heading + Math.max(-1, Math.min(1, turnDifference)) * dt * 0.85);

      const moveSpeed = range > 13 ? enemy.speed : enemy.speed * 0.55;
      const nextX = enemy.x + Math.sin(enemy.heading) * moveSpeed * dt;
      const nextZ = enemy.z + Math.cos(enemy.heading) * moveSpeed * dt;
      const hitsRock = circleCollision(nextX, nextZ, 1.12);
      const hitsEnemy = enemies.some((other) =>
        other !== enemy && Math.hypot(nextX - other.x, nextZ - other.z) < 2.25
      );
      if (!hitsRock && !hitsEnemy && Math.abs(nextX) < WORLD_LIMIT && Math.abs(nextZ) < WORLD_LIMIT) {
        enemy.x = nextX;
        enemy.z = nextZ;
      } else {
        enemy.heading = normalizeAngle(enemy.heading + enemy.strafe * 1.3 * dt);
      }

      enemy.heading = normalizeAngle(enemy.heading);

      if (enemy.reload <= 0 && range < 48) {
        const facingError = Math.abs(normalizeAngle(targetHeading - enemy.heading));
        if (facingError < 0.85) {
          fireEnemy(enemy);
          enemy.reload = Math.max(1.25, 2.8 - player.wave * 0.08) + Math.random() * 1.4;
        }
      }
    }
  }

  function updateShells(dt) {
    for (let i = shells.length - 1; i >= 0; i -= 1) {
      const shell = shells[i];
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
        const enemyIndex = enemies.findIndex((enemy) => Math.hypot(shell.x - enemy.x, shell.z - enemy.z) < 1.45);
        if (enemyIndex !== -1) {
          const enemy = enemies[enemyIndex];
          enemy.health -= 1;
          enemy.hitFlash = 0.14;
          shells.splice(i, 1);
          burst(shell.x, shell.z, COLORS.amber, 10);
          tone(260, 0.07, "square", 0.035, -120);
          if (enemy.health <= 0) {
            player.score += 100 * player.wave;
            player.kills += 1;
            burst(enemy.x, enemy.z, COLORS.red, 32);
            screenShake = 9;
            tone(58, 0.34, "sawtooth", 0.08, -20);
            enemies.splice(enemyIndex, 1);
          } else {
            player.score += 25;
          }
        }
      } else if (player.invulnerable <= 0 && Math.hypot(shell.x - player.x, shell.z - player.z) < 1.2) {
        shells.splice(i, 1);
        player.health = Math.max(0, player.health - 18);
        player.invulnerable = 0.55;
        flash = 1;
        screenShake = 12;
        burst(player.x, player.z, COLORS.red, 18);
        tone(92, 0.25, "sawtooth", 0.08, -45);
        if (player.health <= 0) endGame();
      }
    }
  }

  function updateParticles(dt) {
    for (let i = particles.length - 1; i >= 0; i -= 1) {
      const particle = particles[i];
      particle.x += particle.vx * dt;
      particle.y += particle.vy * dt;
      particle.z += particle.vz * dt;
      particle.vy -= 8.5 * dt;
      particle.life -= dt;
      if (particle.y < 0) {
        particle.y = 0;
        particle.vy *= -0.25;
        particle.vx *= 0.72;
        particle.vz *= 0.72;
      }
      if (particle.life <= 0) particles.splice(i, 1);
    }
  }

  function update(dt) {
    updatePlayer(dt);
    updateEnemies(dt);
    updateShells(dt);
    updateParticles(dt);
    screenShake = Math.max(0, screenShake - dt * 24);
    flash = Math.max(0, flash - dt * 3.8);
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

  startButton.addEventListener("click", startGame);
  restartButton.addEventListener("click", startGame);
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
    if (!pointerLocked || paused || gameOver) return;
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
    if (event.code === "KeyC" && running && !paused && !gameOver) recenteringTurret = true;
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
