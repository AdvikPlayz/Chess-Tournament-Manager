export function addPlayer(state, name, rating) {
  const cleanName = name.trim();
  if (!cleanName) {
    return "Enter a player name.";
  }

  if (state.players.some((player) => player.name.toLowerCase() === cleanName.toLowerCase())) {
    return "That player is already registered.";
  }

  state.players.push({
    id: crypto.randomUUID(),
    name: cleanName,
    rating: Number(rating) || 0,
    score: 0,
    byes: 0,
    opponents: [],
    active: true
  });

  return `${cleanName} added.`;
}

export function removePlayer(state, playerId) {
  const player = state.players.find((item) => item.id === playerId);
  if (!player) {
    return "Player not found.";
  }

  if (state.rounds.some((round) => round.pairings.some((pairing) => pairing.whiteId === playerId || pairing.blackId === playerId))) {
    player.active = false;
    return `${player.name} marked inactive because games already exist.`;
  }

  state.players = state.players.filter((item) => item.id !== playerId);
  return `${player.name} removed.`;
}

export function getActivePlayers(state) {
  return state.players.filter((player) => player.active);
}

export function findPlayer(state, playerId) {
  return state.players.find((player) => player.id === playerId) || null;
}

export function resetPlayerScores(state) {
  state.players.forEach((player) => {
    player.score = 0;
    player.byes = 0;
    player.opponents = [];
    player.active = true;
  });
}
