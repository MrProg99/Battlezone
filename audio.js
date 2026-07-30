(() => {
  "use strict";

  const cannonFireSound = new Audio("Son/CanonFire.mp3");
  const empShockSound = new Audio("Son/EmpShock.mp3");
  const tankExplosionSounds = [
    new Audio("Son/TankExplosion.mp3"),
    new Audio("Son/TankExplosion2.mp3"),
    new Audio("Son/TankExplosion3.mp3")
  ];
  const metalImpactSound = new Audio("Son/MetalImpact.mp3");
  const motorSound = new Audio("Son/MotorSound.mp3");
  const turboSound = new Audio("Son/Turbo.mp3");
  const orbitalSirenSound = new Audio("Son/Siren.mp3");

  const sounds = [
    cannonFireSound,
    empShockSound,
    ...tankExplosionSounds,
    metalImpactSound,
    motorSound,
    turboSound,
    orbitalSirenSound
  ];
  for (const sound of sounds) sound.preload = "auto";
  motorSound.loop = true;
  motorSound.volume = 0;

  let audioContext = null;
  let motorSoundStarted = false;
  let motorSoundStarting = false;

  function play(sound) {
    sound.play().catch(() => {
      // Le navigateur peut bloquer le tout premier son hors geste utilisateur.
    });
  }

  function startMotor() {
    if (motorSoundStarted || motorSoundStarting) return;
    motorSoundStarting = true;
    motorSound.play().then(
      () => {
        motorSoundStarted = true;
        motorSoundStarting = false;
      },
      () => {
        motorSoundStarting = false;
      }
    );
  }

  function init() {
    if (!audioContext) {
      const AudioCtor = window.AudioContext || window.webkitAudioContext;
      if (AudioCtor) audioContext = new AudioCtor();
    }
    if (audioContext?.state === "suspended") audioContext.resume();
    startMotor();
  }

  function muteMotor() {
    motorSound.volume = 0;
  }

  function updateMotor(state, dt) {
    if (!state.active) {
      muteMotor();
      return;
    }
    const speedRatio = Math.min(
      1,
      Math.abs(Number(state.speed) || 0) / Math.max(0.01, Number(state.forwardSpeed) || 0)
    );
    const baseRate = state.tankId === "bastion" ? 0.72 : 0.82;
    const targetRate = baseRate + speedRatio * 0.47 + (state.turboActive ? 0.34 : 0);
    const targetVolume = 0.035 + speedRatio * 0.19 + (state.turboActive ? 0.045 : 0);
    const smoothing = 1 - Math.exp(-dt * 7);
    motorSound.volume += (targetVolume - motorSound.volume) * smoothing;
    motorSound.playbackRate += (targetRate - motorSound.playbackRate) * smoothing;
  }

  function playCannonFire() {
    const sound = cannonFireSound.cloneNode();
    sound.volume = 0.72;
    play(sound);
  }

  function playVectorTurbo() {
    const sound = turboSound.cloneNode();
    sound.volume = 0.68;
    play(sound);
  }

  function playOrbitalSiren() {
    const sound = orbitalSirenSound.cloneNode();
    sound.volume = 0.72;
    play(sound);
  }

  function getProximity(sourceX, sourceZ, listenerX, listenerZ, hearingRange) {
    const sourceDistance = Math.hypot(sourceX - listenerX, sourceZ - listenerZ);
    return sourceDistance < hearingRange ? 1 - sourceDistance / hearingRange : 0;
  }

  function playShockPulse(sourceX, sourceZ, listenerX, listenerZ) {
    const proximity = getProximity(sourceX, sourceZ, listenerX, listenerZ, 52);
    if (proximity <= 0) return;
    const sound = empShockSound.cloneNode();
    sound.volume = Math.min(1, 0.12 + proximity ** 1.35 * 0.78);
    sound.playbackRate = 0.98 + Math.random() * 0.04;
    play(sound);
  }

  function playTankExplosion(sourceX, sourceZ, listenerX, listenerZ, intensity = 1) {
    const proximity = getProximity(sourceX, sourceZ, listenerX, listenerZ, 70);
    if (proximity <= 0) return;
    const source = tankExplosionSounds[
      Math.floor(Math.random() * tankExplosionSounds.length)
    ];
    const sound = source.cloneNode();
    sound.volume = Math.min(1, (0.06 + proximity ** 1.45 * 0.88) * intensity);
    sound.playbackRate = 0.96 + Math.random() * 0.08;
    play(sound);
  }

  function playMetalImpact(sourceX, sourceZ, listenerX, listenerZ, intensity = 1) {
    const proximity = getProximity(sourceX, sourceZ, listenerX, listenerZ, 56);
    if (proximity <= 0) return;
    const sound = metalImpactSound.cloneNode();
    sound.volume = Math.min(1, (0.04 + proximity ** 1.6 * 0.68) * intensity);
    sound.playbackRate = 0.98 + Math.random() * 0.06;
    play(sound);
  }

  function tone(frequency, duration, type = "square", volume = 0.025, slide = 0) {
    if (!audioContext) return;
    const oscillator = audioContext.createOscillator();
    const gain = audioContext.createGain();
    const now = audioContext.currentTime;
    oscillator.type = type;
    oscillator.frequency.setValueAtTime(frequency, now);
    oscillator.frequency.linearRampToValueAtTime(
      Math.max(35, frequency + slide),
      now + duration
    );
    gain.gain.setValueAtTime(volume, now);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + duration);
    oscillator.connect(gain);
    gain.connect(audioContext.destination);
    oscillator.start(now);
    oscillator.stop(now + duration);
  }

  window.BattlezoneAudio = Object.freeze({
    init,
    muteMotor,
    updateMotor,
    playCannonFire,
    playVectorTurbo,
    playOrbitalSiren,
    playShockPulse,
    playTankExplosion,
    playMetalImpact,
    tone
  });
})();
