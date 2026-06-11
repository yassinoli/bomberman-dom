import { appState } from "./state.js";

export function getResultState(me) {
  if (!appState.state || !me) return { visible: false, kind: "", title: "", text: "" };
  if (appState.state.phase === "ended" && appState.state.winnerId === appState.myPlayerId) {
    return { visible: true, kind: "win", title: "YOU WIN", text: "Last player standing." };
  }
  if (appState.state.phase === "ended") {
    return { visible: true, kind: "lose", title: "GAME OVER", text: `${appState.state.winner || "Another player"} wins this round.` };
  }
  if (me.lives <= 0) {
    return { visible: true, kind: "lose", title: "GAME OVER", text: "You are out. The remaining players are still fighting." };
  }
  return { visible: false, kind: "", title: "", text: "" };
}
