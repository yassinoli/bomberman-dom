import { send } from "./send.js";
import { appState } from "./state.js";

export function sendChat(event) {
  event.preventDefault();
  const input = document.getElementById("chat-input");
  const text = input.value.trim();
  if (!text) return;
  send({ type: "chat", text });
  input.value = "";
  appState.chatDraft = "";
}
