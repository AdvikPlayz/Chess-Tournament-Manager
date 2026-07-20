const STORAGE_KEY = "localChessTournamentState";

export function loadTournament() {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function saveTournament(state) {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    return true;
  } catch {
    return false;
  }
}

export function clearTournament() {
  try {
    window.localStorage.removeItem(STORAGE_KEY);
  } catch {
    return false;
  }

  return true;
}

export function downloadJSON(filename, state) {
  const blob = new Blob([JSON.stringify(state, null, 2)], { type: "application/json" });
  const link = document.createElement("a");
  link.href = URL.createObjectURL(blob);
  link.download = filename;
  link.click();
  URL.revokeObjectURL(link.href);
}

export async function readJSONFile(file) {
  return JSON.parse(await file.text());
}
