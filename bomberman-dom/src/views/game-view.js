import { appState, MAX_LIVES } from "../state/state.js";
import { h } from "../utils/h.js";
import { sendChat } from "../network/send-chat.js";
import { getResultState } from "../game/get-result-state.js";
import { playerRow } from "../components/player-row.js";
import { messageView } from "../components/message-view.js";

export function gameView() {
  const me = appState.state?.players?.find((player) => player.id === appState.myPlayerId);
  const result = getResultState(me);
  return h(
    "main",
    { class: "app" },
    {},
    h(
      "section",
      { class: "arena-shell" },
      {},
      h(
        "div",
        { class: "hud" },
        {},
        h("div", { id: "lives-readout", class: "hud-stat" }, {}, `Lives: ${me ? `${me.lives}/${MAX_LIVES}` : "-"}`),
        h("div", { id: "match-title", class: "hud-title" }, {}, appState.state?.phase === "ended" ? `${appState.state.winner} wins` : "BOMBERMAN DOM"),
        h("div", { id: "fps-readout", class: "hud-stat" }, {}, `FPS: ${appState.fps}`),
      ),
      h("div", { class: "arena-wrap" }, {}, h("div", { id: "map-game", class: "map-game" }, {}, "")),
      h(
        "div",
        { id: "result-banner", class: `result-banner ${result.kind}${result.visible ? " visible" : ""}` },
        {},
        h("div", { class: "result-box" }, {}, h("h2", { id: "result-title", class: "result-title" }, {}, result.title), h("p", { id: "result-text", class: "result-text" }, {}, result.text)),
      ),
    ),
    h(
      "aside",
      { class: "sidebar" },
      {},
      h(
        "div",
        { class: "side-section" },
        {},
        h("h2", {}, {}, "Players"),
        h("div", { id: "player-list", class: "player-list" }, {}, ...(appState.state?.players || []).map(playerRow)),
        h("div", { class: "perf", id: "perf-readout" }, {}, `Render: ${appState.fps}fps, DOM board uses requestAnimationFrame`),
      ),
      h("div", { id: "chat-log", class: "chat-log" }, {}, ...appState.chatMessages.map(messageView)),
      h(
        "form",
        { class: "chat-row" },
        { submit: sendChat },
        h("input", { id: "chat-input", maxlength: "120", placeholder: "Chat...", autocomplete: "off", value: appState.chatDraft }, { input: (e) => { appState.chatDraft = e.target.value;}}, ""),
        h("button", { type: "submit" }, {}, "Send"),
      ),
    ),
  );
}
