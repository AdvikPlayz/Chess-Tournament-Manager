import { createDefaultTournament, renderTournament, wireTournamentControls } from "./js/tournament.js";
import { loadTournament, saveTournament } from "./js/storage.js";
import { getPublicTournamentId, loadPublicTournament } from "./js/publicHosting.js";

const publicTournamentId = getPublicTournamentId();
const savedTournament = publicTournamentId ? await loadSharedTournament(publicTournamentId) : loadTournament();
const state = savedTournament || createDefaultTournament();
const isPublicViewer = new URLSearchParams(window.location.search).get("view") === "public";

document.body.classList.toggle("public-viewer", isPublicViewer);

renderTournament(state);
if (!isPublicViewer) {
  wireTournamentControls(state, () => {
    saveTournament(state);
    renderTournament(state);
  });

  saveTournament(state);
}

async function loadSharedTournament(publicTournamentId) {
  try {
    return await loadPublicTournament(publicTournamentId);
  } catch {
    return loadTournament();
  }
}
