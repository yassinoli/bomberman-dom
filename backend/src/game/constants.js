export const MIN_PLAYERS = 2;
export const MAX_PLAYERS = 4;
export const JOIN_WINDOW_MS = 20000;
export const READY_WINDOW_MS = 10000;
export const BOMB_TIME_MS = 3000;
export const EXPLOSION_TIME_MS = 650;
export const RESPAWN_TIME_MS = 1200;
export const MAP_WIDTH = 17;
export const MAP_HEIGHT = 11;
export const BREAK_DENSITY = 0.35;
export const POWER_UPS = ["bombs", "flames", "speed"];

export const START_POSITIONS = [
  { x: 1, y: 1 },
  { x: 15, y: 1 },
  { x: 1, y: 9 },
  { x: 15, y: 9 },
];

export const DIRECTIONS = {
  up: { x: 0, y: -1 },
  down: { x: 0, y: 1 },
  left: { x: -1, y: 0 },
  right: { x: 1, y: 0 },
};
