import { appState } from "../state/state.js";
import { h } from "../utils/h.js";
import { sendChat } from "../network/send-chat.js";
import { messageView } from "../components/message-view.js";

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
      { class: "panel lobby-panel" },
      {},
      h("h2", {}, {}, "Waiting room"),
      h("p", {}, {}, `${count}/${appState.state?.maxPlayers || 4} players joined. Minimum ${appState.state?.minPlayers || 2} players required.`),
      h("p", { id: "lobby-countdown" }, {}, countdown === null ? "When 2 players join, the match starts after 20 seconds unless the room fills first." : `Match starts in ${countdown}s.`),
      h(
        "div",
        { class: "lobby-layout" },
        {},
        h(
          "div",
          { class: "lobby-main" },
          {},
          h("h3", {}, {}, "Players"),
          h("div", { class: "lobby-list" }, {}, ...players.map((player) => h("div", { class: "lobby-player" }, {}, h("span", {}, {}, player.nickname), h("span", {}, {}, `P${player.id + 1}`)))),
        ),
        h(
          "div",
          { class: "lobby-chat" },
          {},
          h("h3", {}, {}, "Chat"),
          h("div", { id: "lobby-chat-log", class: "chat-log" }, {}, ...appState.chatMessages.map(messageView)),
          h(
            "form",
            { class: "chat-row" },
            { submit: sendChat },
            h("input", { id: "chat-input", maxlength: "120", placeholder: "Say hi...", autocomplete: "off", value: appState.chatDraft }, { input: (e) => { appState.chatDraft = e.target.value; } }, ""),
            h("button", { type: "submit" }, {}, "Send"),
          ),
        ),
      ),
    ),
  );
}
