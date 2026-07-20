export function getLeaderboard(state) {
  return [...state.players]
    .sort((a, b) => (
      b.score - a.score
      || b.rating - a.rating
      || a.name.localeCompare(b.name)
    ));
}

export function getLeaderName(state) {
  const leader = getLeaderboard(state)[0];
  return leader ? leader.name : "None";
}
