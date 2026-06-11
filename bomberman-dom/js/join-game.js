import { appState } from "./state.js";
import { send } from "./send.js";

export function joinGame(event) {
  event.preventDefault();
  const input = document.getElementById("nickname");
  appState.nickname = input.value.trim().slice(0, 16);
  if (appState.nickname.length < 2) return;
  sessionStorage.setItem("bomberman-nickname", appState.nickname);
  localStorage.setItem("bomberman-nickname", appState.nickname);
  send({ type: "join", nickname: appState.nickname });
}
