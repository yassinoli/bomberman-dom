import { appState } from "./state.js";

export function updateFps(now) {
  appState.frames += 1;
  if (now - appState.lastFpsAt >= 1000) {
    appState.fps = appState.frames;
    appState.frames = 0;
    appState.lastFpsAt = now;
  }
}
