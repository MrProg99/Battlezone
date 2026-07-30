(() => {
  "use strict";

  const elements = Object.freeze({
    canvas: document.querySelector("#game"),
    startScreen: document.querySelector("#start-screen"),
    startButton: document.querySelector("#start-button"),
    messagePanel: document.querySelector("#message-panel"),
    messageKicker: document.querySelector("#message-kicker"),
    messageTitle: document.querySelector("#message-title"),
    messageCopy: document.querySelector("#message-copy"),
    restartButton: document.querySelector("#restart-button"),
    pauseLabel: document.querySelector("#pause-label"),
    upgradePanel: document.querySelector("#upgrade-panel"),
    upgradeKicker: document.querySelector("#upgrade-kicker"),
    upgradeCopy: document.querySelector("#upgrade-copy"),
    upgradeStatus: document.querySelector("#upgrade-status"),
    coopScoreboard: document.querySelector("#coop-scoreboard"),
    scoreboardRows: document.querySelector("#scoreboard-rows"),
    upgradeButtons: [...document.querySelectorAll(".upgrade-button")],
    tankCards: [...document.querySelectorAll(".tank-card")],
    modeButtons: [...document.querySelectorAll(".mode-button")],
    onlinePanel: document.querySelector("#online-panel"),
    playerNameField: document.querySelector("#player-name-field"),
    playerNameInput: document.querySelector("#player-name-input"),
    joinFields: document.querySelector("#join-fields"),
    roomCodeInput: document.querySelector("#room-code-input"),
    roomReadout: document.querySelector("#room-readout"),
    roomCodeLabel: document.querySelector("#room-code"),
    roomPlayerCount: document.querySelector("#room-player-count"),
    networkStatus: document.querySelector("#network-status"),
    onlineActionButton: document.querySelector("#online-action-button"),
    leaveRoomButton: document.querySelector("#leave-room-button"),
    startButtonLabel: document.querySelector("#start-button-label"),
    startButtonHelp: document.querySelector("#start-button-help")
  });

  function setSelectedTank(tankId) {
    for (const card of elements.tankCards) {
      const selected = card.dataset.tank === tankId;
      card.classList.toggle("selected", selected);
      card.setAttribute("aria-checked", String(selected));
    }
  }

  function setSelectedMode(playMode) {
    for (const button of elements.modeButtons) {
      const selected = button.dataset.mode === playMode;
      button.classList.toggle("selected", selected);
      button.setAttribute("aria-checked", String(selected));
    }
  }

  function renderLobby({
    playMode,
    snapshot,
    maxCoopPlayers,
    normalizePlayerName,
    getDefaultPlayerName
  }) {
    setSelectedMode(playMode);
    const online = playMode !== "solo";
    elements.onlinePanel.classList.toggle("hidden", !online);
    if (!online) {
      elements.startButton.disabled = false;
      elements.startButtonLabel.textContent = "Lancer la mission";
      elements.startButtonHelp.textContent = "Cliquer pour verrouiller la souris";
      return;
    }

    const connected = snapshot.connected;
    const busy = ["connecting", "creating", "joining"].includes(snapshot.phase);
    const isHost = snapshot.role === "host";
    const maxPlayers = snapshot.maxPlayers ?? maxCoopPlayers;
    const roomReady = connected && snapshot.playerCount >= 2;
    const roomFull = snapshot.playerCount >= maxPlayers;
    const playerName = normalizePlayerName(elements.playerNameInput.value) ?? "";
    elements.playerNameField.classList.toggle("hidden", connected);
    elements.joinFields.classList.toggle("hidden", playMode !== "join" || connected);
    elements.roomReadout.classList.toggle("hidden", !connected);
    elements.onlineActionButton.classList.toggle("hidden", connected);
    elements.leaveRoomButton.classList.toggle("hidden", !connected);
    elements.onlineActionButton.disabled = busy || !snapshot.configured || !playerName;
    elements.onlineActionButton.textContent =
      playMode === "host" ? "Créer le salon" : "Rejoindre le salon";

    if (connected) {
      elements.roomCodeLabel.textContent = snapshot.roomCode;
      const localName =
        snapshot.players?.[snapshot.role]?.name ||
        playerName ||
        getDefaultPlayerName(snapshot.role);
      elements.roomPlayerCount.textContent =
        `${snapshot.playerCount} / ${maxPlayers} chars connectés // ${localName}`;
      elements.networkStatus.classList.remove("error");
      if (snapshot.meta?.status === "closed") {
        elements.networkStatus.textContent = "L’hôte a fermé ce salon.";
      } else if (roomReady) {
        if (roomFull) {
          elements.networkStatus.textContent = isHost
            ? "Escouade complète. Mission prête."
            : "Escouade complète. En attente du lancement.";
        } else {
          elements.networkStatus.textContent = isHost
            ? "Mission prête. Un troisième char peut encore rejoindre."
            : "Liaison établie. L’hôte peut partir ou attendre un troisième char.";
        }
      } else {
        elements.networkStatus.textContent = "En attente du deuxième joueur…";
      }

      elements.startButton.disabled =
        !isHost || !roomReady || snapshot.meta?.status !== "lobby";
      elements.startButtonLabel.textContent = isHost
        ? snapshot.meta?.startedAt
          ? "Relancer la mission coop"
          : "Lancer la mission coop"
        : "En attente de l’hôte";
      elements.startButtonHelp.textContent = isHost
        ? roomFull
          ? "Le largage commencera sur les trois ordinateurs"
          : "Lancer à deux ou attendre le troisième joueur"
        : "L’hôte contrôle le départ";
      return;
    }

    elements.startButton.disabled = true;
    elements.startButtonLabel.textContent =
      playMode === "host" ? "Créez d’abord un salon" : "Rejoignez d’abord un salon";
    elements.startButtonHelp.textContent =
      "La mission démarrera dès qu’au moins deux chars seront prêts";
    elements.networkStatus.classList.toggle("error", Boolean(snapshot.error));

    if (!snapshot.configured) {
      elements.networkStatus.textContent =
        "Firebase doit être configuré dans firebase-config.js.";
    } else if (snapshot.error) {
      elements.networkStatus.textContent = snapshot.error;
    } else if (!playerName) {
      elements.networkStatus.textContent = "Entrez votre nom de pilote pour continuer.";
    } else if (busy) {
      elements.networkStatus.textContent = "Établissement de la liaison Firebase…";
    } else {
      elements.networkStatus.textContent = playMode === "host"
        ? "Créez un canal et partagez son code."
        : "Entrez le code affiché chez votre coéquipier.";
    }
  }

  function renderScoreboard({ visible, ranking, localRole }) {
    elements.coopScoreboard.classList.toggle("hidden", !visible);
    if (!visible) {
      elements.scoreboardRows.replaceChildren();
      return;
    }
    const rows = ranking.map((entry, index) => {
      const row = document.createElement("div");
      row.className = "scoreboard-row";
      row.classList.toggle("local", entry.role === localRole);
      row.classList.toggle("leader", index === 0 && entry.kills > 0);

      const rank = document.createElement("span");
      rank.className = "scoreboard-rank";
      rank.textContent = `#${String(index + 1).padStart(2, "0")}`;
      const name = document.createElement("strong");
      name.className = "scoreboard-name";
      name.textContent = entry.name;
      const kills = document.createElement("span");
      kills.className = "scoreboard-kills";
      kills.textContent = String(entry.kills).padStart(2, "0");
      row.append(rank, name, kills);
      return row;
    });
    elements.scoreboardRows.replaceChildren(...rows);
  }

  function renderUpgradePanel({
    visible,
    round,
    stats,
    choice,
    readyCount,
    roleCount,
    coop,
    upgradeLabels
  }) {
    elements.upgradePanel.classList.toggle("hidden", !visible);
    if (!visible) return;
    elements.upgradeKicker.textContent =
      `VAGUE ${String(round).padStart(2, "0")} // SECTEUR SÉCURISÉ`;
    elements.upgradeCopy.textContent =
      "ALLOUEZ VOTRE POINT AVANT LA PROCHAINE VAGUE.";

    for (const button of elements.upgradeButtons) {
      const id = button.dataset.upgrade;
      const level = stats[id] ?? 0;
      const selected = choice === id;
      button.classList.toggle("selected", selected);
      button.disabled = Boolean(choice);
      button.querySelector("small").textContent = selected
        ? `NIVEAU ${level} ACQUIS`
        : `NIVEAU ${level} → ${level + 1}`;
    }

    if (choice) {
      const label = upgradeLabels[choice];
      elements.upgradeStatus.textContent = coop
        ? `${label} CONFIRMÉ // ESCOUADE ${readyCount}/${roleCount}`
        : `${label} CONFIRMÉ // DÉPLOIEMENT EN COURS`;
    } else {
      elements.upgradeStatus.textContent = coop
        ? `EN ATTENTE DE VOTRE CHOIX // ESCOUADE ${readyCount}/${roleCount}`
        : "SÉLECTIONNEZ UN MODULE";
    }
  }

  function showEndScreen({
    failureReason,
    defeatedPlayerName,
    score,
    kills,
    wave,
    coop
  }) {
    elements.messageKicker.textContent = failureReason
      ? "OBJECTIF PRIORITAIRE PERDU"
      : defeatedPlayerName
        ? `JOUEUR ÉLIMINÉ : ${defeatedPlayerName.toUpperCase()}`
        : "SIGNAL DU CHAR PERDU";
    elements.messageTitle.textContent = failureReason
      ? "MISSION ÉCHOUÉE"
      : "MISSION TERMINÉE";
    const coopReplayMessage = coop
      ? " Le salon reste connecté pour lancer une nouvelle mission."
      : "";
    const failureCopy = failureReason ? `${failureReason}. ` : "";
    const playerDefeatCopy = defeatedPlayerName
      ? `Le char piloté par ${defeatedPlayerName} a été détruit. `
      : "";
    elements.messageCopy.textContent =
      `${failureCopy}${playerDefeatCopy}Score ${String(score).padStart(6, "0")} · ${kills} tanks neutralisés · vague ${wave} atteinte.${coopReplayMessage}`;
    elements.messagePanel.classList.remove("hidden");
  }

  function showGame() {
    elements.startScreen.classList.add("hidden");
  }

  function showHangar() {
    elements.startScreen.classList.remove("hidden");
  }

  function hideMessage() {
    elements.messagePanel.classList.add("hidden");
  }

  function setPaused(paused) {
    elements.pauseLabel.classList.toggle("hidden", !paused);
  }

  function requestPointerLock() {
    try {
      const request = elements.canvas.requestPointerLock?.();
      request?.catch?.(() => {});
    } catch {
      // Le verrouillage peut être refusé hors d'un geste utilisateur.
    }
  }

  window.BattlezoneUi = Object.freeze({
    elements,
    setSelectedTank,
    renderLobby,
    renderScoreboard,
    renderUpgradePanel,
    showEndScreen,
    showGame,
    showHangar,
    hideMessage,
    setPaused,
    requestPointerLock
  });
})();
