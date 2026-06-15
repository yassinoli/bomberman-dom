import { appState } from "../state/state.js";

// Determine what result screen (win/lose/hidden) should be shown to the current player
export function getResultState(me) {

  // If game state or player data is missing, hide the result screen
  if (!appState.state || !me) {
    return { visible: false, kind: "", title: "", text: "" };
  }

  // Show victory screen when the game has ended and the current player is the winner
  if (
    appState.state.phase === "ended" &&
    appState.state.winnerId === appState.myPlayerId
  ) {
    return {
      visible: true,
      kind: "win",
      title: "YOU WIN",
      text: "Last player standing."
    };
  }

  // Show defeat screen when the game has ended and another player won
  if (appState.state.phase === "ended") {
    return {
      visible: true,
      kind: "lose",
      title: "GAME OVER",
      text: `${appState.state.winner || "Another player"} wins this round.`
    };
  }

  // Show defeat screen if the player has no lives left,
  // even though the match is still ongoing for other players
  if (me.lives <= 0) {
    return {
      visible: true,
      kind: "lose",
      title: "GAME OVER",
      text: "You are out. The remaining players are still fighting."
    };
  }

  // Hide the result screen while the player is still active and the game is running
  return { visible: false, kind: "", title: "", text: "" };
}