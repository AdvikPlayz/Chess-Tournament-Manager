import { downloadJSON, readJSONFile, clearTournament } from "./storage.js";
import { addPlayer, findPlayer, removePlayer, resetPlayerScores } from "./players.js";
import { createSwissPairings, enterResult, getCompletedGameCount, getCurrentRound } from "./pairings.js";
import { getLeaderboard, getLeaderName } from "./leaderboard.js";
import {
  clearPublicHostingConfig,
  getActivePublicHostingConfig,
  getShareURL,
  isPublicHostingConfigured,
  loadPublicTournament,
  publishPublicTournament,
  savePublicHostingConfig,
  unpublishPublicTournament
} from "./publicHosting.js";

export function createDefaultTournament() {
  return {
    name: "Chess Tournament",
    maxRounds: 4,
    players: [],
    rounds: []
  };
}

export function wireTournamentControls(state, commit) {
  document.querySelector("[data-action='toggle-projector']").addEventListener("click", () => {
    document.body.classList.toggle("projector-mode");
  });

  document.querySelector("[data-action='export']").addEventListener("click", () => {
    downloadJSON(`${state.name.replace(/[^a-z0-9]+/gi, "-").toLowerCase()}-export.json`, state);
  });

  document.getElementById("hosting-setup-form").addEventListener("submit", (event) => {
    event.preventDefault();
    try {
      savePublicHostingConfig(getHostingConfigFromForm());
      setMessage("Public hosting setup saved in this browser.");
      commit();
    } catch (error) {
      setMessage(error.message);
    }
  });

  document.querySelector("[data-action='clear-hosting-setup']").addEventListener("click", () => {
    clearPublicHostingConfig();
    fillHostingSetupForm(null);
    setMessage("Public hosting setup cleared from this browser.");
    commit();
  });

  document.querySelector("[data-action='publish-public']").addEventListener("click", async () => {
    try {
      const shareURL = await publishPublicTournament(state);
      document.getElementById("public-link").value = shareURL;
      setMessage("Published. Use the viewer link to share this tournament.");
      commit();
    } catch (error) {
      setMessage(error.message);
    }
  });

  document.querySelector("[data-action='load-public']").addEventListener("click", async () => {
    try {
      const loaded = await loadPublicTournament(state.publicId);
      if (!loaded) {
        setMessage("No public tournament was found for this link.");
        return;
      }
      Object.assign(state, normalizeImportedTournament(loaded), { publicId: loaded.publicId || state.publicId });
      resetPlayerScores(state);
      replayResults(state);
      setMessage("Loaded public tournament into this browser.");
      commit();
    } catch (error) {
      setMessage(error.message);
    }
  });

  document.querySelector("[data-action='copy-public-link']").addEventListener("click", async () => {
    const link = getCurrentPublicLink(state);
    if (!link) {
      setMessage("Publish first to create a viewer link.");
      return;
    }

    try {
      await navigator.clipboard.writeText(link);
      setMessage("Viewer link copied.");
    } catch {
      document.getElementById("public-link").select();
      setMessage("Copy failed. The viewer link is selected so you can copy it manually.");
    }
  });

  document.querySelector("[data-action='open-public-link']").addEventListener("click", () => {
    const link = getCurrentPublicLink(state);
    if (!link) {
      setMessage("Publish first to create a viewer link.");
      return;
    }

    window.open(link, "_blank", "noopener");
  });

  document.querySelector("[data-action='clear-public-link']").addEventListener("click", () => {
    state.publicId = "";
    setMessage("Public link cleared from this browser. This does not delete a published tournament.");
    commit();
  });

  document.querySelector("[data-action='unpublish-public']").addEventListener("click", async () => {
    try {
      await unpublishPublicTournament(state.publicId);
      state.publicId = "";
      setMessage("Public tournament unpublished.");
      commit();
    } catch (error) {
      setMessage(error.message);
    }
  });

  document.querySelector("[data-action='reset-event']").addEventListener("click", () => {
    if (!state.resetArmed) {
      state.resetArmed = true;
      setMessage("Click Reset Tournament again to confirm.");
      commit();
      return;
    }
    Object.assign(state, createDefaultTournament());
    clearTournament();
    setMessage("Tournament reset.");
    commit();
  });

  document.querySelector("[data-action='pair-round']").addEventListener("click", () => {
    if (state.rounds.length >= state.maxRounds) {
      setMessage("Maximum rounds reached.");
      commit();
      return;
    }
    const result = createSwissPairings(state);
    setMessage(result.message);
    commit();
  });

  document.getElementById("settings-form").addEventListener("submit", (event) => {
    event.preventDefault();
    state.name = document.getElementById("tournament-name").value.trim() || "Chess Tournament";
    state.maxRounds = Math.max(1, Number(document.getElementById("max-rounds").value) || 4);
    setMessage("Settings saved.");
    commit();
  });

  document.getElementById("player-form").addEventListener("submit", (event) => {
    event.preventDefault();
    const message = addPlayer(
      state,
      document.getElementById("player-name").value,
      document.getElementById("player-rating").value
    );
    document.getElementById("player-name").value = "";
    document.getElementById("player-rating").value = "";
    setMessage(message);
    commit();
  });

  document.getElementById("players-body").addEventListener("click", (event) => {
    const button = event.target.closest("[data-remove-player]");
    if (!button) return;
    setMessage(removePlayer(state, button.dataset.removePlayer));
    commit();
  });

  document.getElementById("pairings-list").addEventListener("change", (event) => {
    const select = event.target.closest("[data-result-pairing]");
    if (!select) return;
    setMessage(enterResult(state, select.dataset.resultPairing, select.value));
    commit();
  });

  document.getElementById("import-file").addEventListener("change", async (event) => {
    const file = event.target.files[0];
    if (!file) return;
    try {
      const imported = await readJSONFile(file);
      Object.assign(state, normalizeImportedTournament(imported));
      resetPlayerScores(state);
      replayResults(state);
      setMessage("Tournament imported.");
      commit();
    } catch {
      setMessage("Import failed. Use a valid tournament JSON file.");
    }
    event.target.value = "";
  });
}

export function renderTournament(state) {
  document.getElementById("tournament-name").value = state.name;
  document.getElementById("max-rounds").value = state.maxRounds;
  fillHostingSetupForm(getActivePublicHostingConfig());

  const currentRound = getCurrentRound(state);
  document.getElementById("stat-players").textContent = String(state.players.length);
  document.getElementById("stat-round").textContent = String(currentRound?.number || 1);
  document.getElementById("stat-games").textContent = String(getCompletedGameCount(state));
  document.getElementById("stat-leader").textContent = getLeaderName(state);
  document.getElementById("hero-round").textContent = `Round ${currentRound?.number || 1}`;
  document.getElementById("hero-count").textContent = `${state.players.length} players registered`;
  document.getElementById("pairing-round").textContent = `Round ${currentRound?.number || 1}`;
  document.getElementById("public-link").value = state.publicId ? getShareURL(state.publicId) : "";
  updatePublicHostingButtons(state);

  renderPlayers(state);
  renderPairings(state);
  renderLeaderboard(state);
}

function updatePublicHostingButtons(state) {
  const configured = isPublicHostingConfigured();
  const hasLink = Boolean(state.publicId);

  document.querySelector("[data-action='publish-public']").disabled = !configured;
  document.querySelector("[data-action='load-public']").disabled = !configured || !hasLink;
  document.querySelector("[data-action='unpublish-public']").disabled = !configured || !hasLink;
  document.querySelector("[data-action='copy-public-link']").disabled = !hasLink;
  document.querySelector("[data-action='open-public-link']").disabled = !hasLink;
  document.querySelector("[data-action='clear-public-link']").disabled = !hasLink;
}

function getHostingConfigFromForm() {
  return {
    apiKey: document.getElementById("firebase-api-key").value,
    authDomain: document.getElementById("firebase-auth-domain").value,
    databaseURL: document.getElementById("firebase-database-url").value,
    projectId: document.getElementById("firebase-project-id").value,
    appId: document.getElementById("firebase-app-id").value
  };
}

function fillHostingSetupForm(config) {
  const fields = {
    "firebase-api-key": config?.apiKey || "",
    "firebase-auth-domain": config?.authDomain || "",
    "firebase-database-url": config?.databaseURL || "",
    "firebase-project-id": config?.projectId || "",
    "firebase-app-id": config?.appId || ""
  };

  Object.entries(fields).forEach(([id, value]) => {
    const input = document.getElementById(id);
    if (input && document.activeElement !== input) {
      input.value = value;
    }
  });
}

function getCurrentPublicLink(state) {
  return state.publicId ? getShareURL(state.publicId) : "";
}

function renderPlayers(state) {
  const body = document.getElementById("players-body");
  if (!state.players.length) {
    body.innerHTML = document.getElementById("empty-row-template").innerHTML;
    return;
  }

  body.innerHTML = state.players.map((player) => `
    <tr>
      <td><strong>${escapeHTML(player.name)}</strong></td>
      <td>${player.rating || "-"}</td>
      <td>${formatScore(player.score)}</td>
      <td>${player.active ? "Active" : "Inactive"}</td>
      <td><button type="button" class="ghost danger" data-remove-player="${player.id}">Remove</button></td>
    </tr>
  `).join("");
}

function renderPairings(state) {
  const list = document.getElementById("pairings-list");
  const currentRound = getCurrentRound(state);

  if (!currentRound) {
    list.innerHTML = `<p class="note">Create pairings when players are registered.</p>`;
    return;
  }

  list.innerHTML = currentRound.pairings.map((pairing) => {
    const white = findPlayer(state, pairing.whiteId);
    const black = findPlayer(state, pairing.blackId);
    const isBye = pairing.result === "bye";

    return `
      <article class="pairing-card">
        <div>
          <span class="board-number">Board ${pairing.board}</span>
          <div class="matchup">
            <span><b>White</b>${escapeHTML(white?.name || "Unknown")}</span>
            <span><b>Black</b>${isBye ? "BYE" : escapeHTML(black?.name || "Unknown")}</span>
          </div>
        </div>
        ${isBye ? "<strong>1 point bye</strong>" : resultSelect(pairing)}
      </article>
    `;
  }).join("");
}

function renderLeaderboard(state) {
  const list = document.getElementById("leaderboard-list");
  const rows = getLeaderboard(state);

  if (!rows.length) {
    list.innerHTML = `<li><span class="rank">-</span><span>No players yet</span><span class="score">0</span></li>`;
    return;
  }

  list.innerHTML = rows.map((player, index) => `
    <li>
      <span class="rank">${index + 1}</span>
      <span><strong>${escapeHTML(player.name)}</strong><br><small>${player.rating || "Unrated"}</small></span>
      <span class="score">${formatScore(player.score)}</span>
    </li>
  `).join("");
}

function resultSelect(pairing) {
  const options = [
    ["", "Result"],
    ["1-0", "White wins"],
    ["0-1", "Black wins"],
    ["0.5-0.5", "Draw"]
  ];

  return `
    <select data-result-pairing="${pairing.id}" aria-label="Game result">
      ${options.map(([value, label]) => `
        <option value="${value}" ${pairing.result === value ? "selected" : ""}>${label}</option>
      `).join("")}
    </select>
  `;
}

function normalizeImportedTournament(imported) {
  return {
    name: imported.name || "Chess Tournament",
    maxRounds: Number(imported.maxRounds) || 4,
    publicId: imported.publicId || "",
    players: Array.isArray(imported.players) ? imported.players : [],
    rounds: Array.isArray(imported.rounds) ? imported.rounds : []
  };
}

function replayResults(state) {
  const savedRounds = JSON.parse(JSON.stringify(state.rounds));
  state.rounds = [];
  savedRounds.forEach((round) => {
    state.rounds.push({ ...round, pairings: round.pairings.map((pairing) => ({ ...pairing, result: "" })) });
    round.pairings.forEach((pairing) => {
      if (pairing.result && pairing.result !== "bye") {
        enterResult(state, pairing.id, pairing.result);
      }
    });
  });
}

function setMessage(message) {
  document.getElementById("app-message").textContent = message;
}

function escapeHTML(value) {
  return String(value).replace(/[&<>"']/g, (char) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    "\"": "&quot;",
    "'": "&#39;"
  }[char]));
}

function formatScore(score) {
  return Number.isInteger(score) ? String(score) : score.toFixed(1);
}
