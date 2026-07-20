const PUBLIC_HOSTING_CONFIG_KEY = "localChessTournamentPublicHostingConfig";
const PUBLIC_PATH_PREFIX = "publicTournaments";
const CONFIG_QUERY_KEYS = ["apiKey", "authDomain", "databaseURL", "projectId", "appId"];
let firebaseServices = null;
let firebaseConfigSignature = "";

export function getSavedPublicHostingConfig() {
  try {
    const raw = window.localStorage.getItem(PUBLIC_HOSTING_CONFIG_KEY);
    return raw ? normalizeFirebaseConfig(JSON.parse(raw)) : null;
  } catch {
    return null;
  }
}

export function savePublicHostingConfig(config) {
  const normalized = normalizeFirebaseConfig(config);

  if (!isCompleteFirebaseConfig(normalized)) {
    throw new Error("Fill in every Firebase setup field before saving.");
  }

  window.localStorage.setItem(PUBLIC_HOSTING_CONFIG_KEY, JSON.stringify(normalized));
  resetFirebaseServices();
  return normalized;
}

export function clearPublicHostingConfig() {
  window.localStorage.removeItem(PUBLIC_HOSTING_CONFIG_KEY);
  resetFirebaseServices();
}

export function getActivePublicHostingConfig() {
  return getURLFirebaseConfig() || getSavedPublicHostingConfig();
}

export function isPublicHostingConfigured() {
  return isCompleteFirebaseConfig(getActivePublicHostingConfig()) && Boolean(window.firebase);
}

export function getPublicTournamentId() {
  const params = new URLSearchParams(window.location.search);
  return params.get("tournament") || "";
}

export function getShareURL(tournamentId) {
  const config = getActivePublicHostingConfig();
  const url = new URL(window.location.href);
  url.search = "";
  url.searchParams.set("tournament", tournamentId);
  url.searchParams.set("view", "public");

  if (config) {
    CONFIG_QUERY_KEYS.forEach((key) => {
      url.searchParams.set(key, config[key]);
    });
  }

  return url.toString();
}

export async function publishPublicTournament(state) {
  const database = getFirebaseDatabase();
  const tournamentId = state.publicId || crypto.randomUUID();
  const publicState = {
    ...state,
    publicId: tournamentId,
    publishedAt: new Date().toISOString()
  };

  await database.ref(`${PUBLIC_PATH_PREFIX}/${tournamentId}`).set(publicState);
  state.publicId = tournamentId;
  return getShareURL(tournamentId);
}

export async function loadPublicTournament(tournamentId = getPublicTournamentId()) {
  if (!tournamentId) {
    return null;
  }

  const database = getFirebaseDatabase();
  const snapshot = await database.ref(`${PUBLIC_PATH_PREFIX}/${tournamentId}`).once("value");
  return snapshot.val();
}

export async function unpublishPublicTournament(tournamentId) {
  if (!tournamentId) {
    throw new Error("There is no public tournament link to unpublish.");
  }

  const database = getFirebaseDatabase();
  await database.ref(`${PUBLIC_PATH_PREFIX}/${tournamentId}`).remove();
}

function getFirebaseDatabase() {
  const config = getActivePublicHostingConfig();

  if (!isCompleteFirebaseConfig(config) || !window.firebase) {
    throw new Error("Public hosting is not configured. Fill in the Firebase setup fields on this page.");
  }

  const signature = JSON.stringify(config);
  if (!firebaseServices || firebaseConfigSignature !== signature) {
    const appName = `public-hosting-${config.projectId}`;
    const existingApp = firebase.apps.find((app) => app.name === appName);
    const app = existingApp || firebase.initializeApp(config, appName);
    firebaseServices = {
      app,
      database: firebase.database(app)
    };
    firebaseConfigSignature = signature;
  }

  return firebaseServices.database;
}

function getURLFirebaseConfig() {
  const params = new URLSearchParams(window.location.search);
  const config = Object.fromEntries(CONFIG_QUERY_KEYS.map((key) => [key, params.get(key) || ""]));
  return isCompleteFirebaseConfig(config) ? normalizeFirebaseConfig(config) : null;
}

function normalizeFirebaseConfig(config = {}) {
  return {
    apiKey: String(config.apiKey || "").trim(),
    authDomain: String(config.authDomain || "").trim(),
    databaseURL: String(config.databaseURL || "").trim(),
    projectId: String(config.projectId || "").trim(),
    appId: String(config.appId || "").trim()
  };
}

function isCompleteFirebaseConfig(config) {
  return Boolean(config
    && config.apiKey
    && config.authDomain
    && config.databaseURL
    && config.projectId
    && config.appId);
}

function resetFirebaseServices() {
  firebaseServices = null;
  firebaseConfigSignature = "";
}
