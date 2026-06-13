export const DEFAULT_GRID_COLS = 17;
export const DEFAULT_GRID_ROWS = 11;
export const MAX_LIVES = 3;
export const COLORS = ["#38bdf8", "#fb7185", "#facc15", "#34d399"];
export const KEYS = { ArrowLeft: "left", ArrowRight: "right", ArrowUp: "up", ArrowDown: "down" };

const params = new URLSearchParams(location.search);
const testPlayer = Number(params.get("testPlayer"));

export const appState = {
  root: document.getElementById("root"),
  autoJoinNickname: params.get("nickname") || (Number.isInteger(testPlayer) && testPlayer >= 1 && testPlayer <= 4 ? `Test ${testPlayer}` : ""),
  ws: null,
  myPlayerId: null,
  nickname: "",
  state: null,
  view: "login",
  boardBuilt: false,
  dirtyBoard: true,
  dirtyShell: true,
  chatMessages: [],
  lastMoveSent: 0,
  frames: 0,
  fps: 60,
  lastFpsAt: performance.now(),
  chatDraft: "",
};

appState.nickname = appState.autoJoinNickname || sessionStorage.getItem("bomberman-nickname") || localStorage.getItem("bomberman-nickname") || "";
