import { findPlayer, getActivePlayers } from "./players.js";

export function createSwissPairings(state) {
  const activePlayers = getActivePlayers(state);
  if (activePlayers.length < 2) {
    return { ok: false, message: "Add at least two active players before pairing a round." };
  }

  const currentRound = state.rounds[state.rounds.length - 1];
  if (currentRound && currentRound.pairings.some((pairing) => !pairing.result)) {
    return { ok: false, message: "Enter all current round results before creating the next round." };
  }

  const sorted = [...activePlayers].sort((a, b) => (
    b.score - a.score || b.rating - a.rating || a.name.localeCompare(b.name)
  ));
  const pairings = [];
  let byePlayer = null;

  if (sorted.length % 2 === 1) {
    byePlayer = [...sorted].reverse().find((player) => player.byes === 0) || sorted[sorted.length - 1];
    sorted.splice(sorted.findIndex((player) => player.id === byePlayer.id), 1);
    byePlayer.score += 1;
    byePlayer.byes += 1;
  }

  while (sorted.length) {
    const white = sorted.shift();
    let opponentIndex = sorted.findIndex((candidate) => !white.opponents.includes(candidate.id));
    if (opponentIndex === -1) {
      opponentIndex = 0;
    }
    const black = sorted.splice(opponentIndex, 1)[0];

    white.opponents.push(black.id);
    black.opponents.push(white.id);

    pairings.push({
      id: crypto.randomUUID(),
      board: pairings.length + 1,
      whiteId: white.id,
      blackId: black.id,
      result: ""
    });
  }

  if (byePlayer) {
    pairings.push({
      id: crypto.randomUUID(),
      board: pairings.length + 1,
      whiteId: byePlayer.id,
      blackId: "",
      result: "bye"
    });
  }

  state.rounds.push({
    number: state.rounds.length + 1,
    pairings
  });

  return { ok: true, message: `Round ${state.rounds.length} pairings created.` };
}

export function enterResult(state, pairingId, result) {
  const round = state.rounds.find((item) => item.pairings.some((pairing) => pairing.id === pairingId));
  if (!round) {
    return "Pairing not found.";
  }

  const pairing = round.pairings.find((item) => item.id === pairingId);
  removeExistingResult(state, pairing);
  pairing.result = result;
  applyResult(state, pairing);
  return "Result saved.";
}

export function getCurrentRound(state) {
  return state.rounds[state.rounds.length - 1] || null;
}

export function getCompletedGameCount(state) {
  return state.rounds.reduce((total, round) => (
    total + round.pairings.filter((pairing) => pairing.result && pairing.result !== "bye").length
  ), 0);
}

function removeExistingResult(state, pairing) {
  if (!pairing.result) {
    return;
  }

  const white = findPlayer(state, pairing.whiteId);
  const black = findPlayer(state, pairing.blackId);

  if (pairing.result === "1-0" && white) white.score -= 1;
  if (pairing.result === "0-1" && black) black.score -= 1;
  if (pairing.result === "0.5-0.5") {
    if (white) white.score -= 0.5;
    if (black) black.score -= 0.5;
  }
}

function applyResult(state, pairing) {
  const white = findPlayer(state, pairing.whiteId);
  const black = findPlayer(state, pairing.blackId);

  if (pairing.result === "1-0" && white) white.score += 1;
  if (pairing.result === "0-1" && black) black.score += 1;
  if (pairing.result === "0.5-0.5") {
    if (white) white.score += 0.5;
    if (black) black.score += 0.5;
  }
}
