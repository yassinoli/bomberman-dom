import { appState } from "./state.js";
import { h } from "./h.js";

export function lobbyView() {
  const players = appState.state?.players || [];
  const count = players.filter((player) => player.connected).length;
  const countdown = appState.state?.countdownEndsAt ? Math.max(0, Math.ceil((appState.state.countdownEndsAt - Date.now()) / 1000)) : null;
  return h(
    "main",
    { class: "screen" },
    {},
    h(
      "section",
      { class: "panel" },
      {},
      h("h2", {}, {}, "Waiting room"),
      h("p", {}, {}, `${count}/${appState.state?.maxPlayers || 4} players joined. Minimum ${appState.state?.minPlayers || 2} players required.`),
      h("p", {}, {}, countdown === null ? "When 2 players join, the match starts after 20 seconds unless the room fills first." : `Match starts in ${countdown}s.`),
      h("div", { class: "lobby-list" }, {}, ...players.map((player) => h("div", { class: "lobby-player" }, {}, h("span", {}, {}, player.nickname), h("span", {}, {}, `P${player.id + 1}`)))),
    ),
  );
}
