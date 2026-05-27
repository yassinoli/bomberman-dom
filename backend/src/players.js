import { randomUUID } from "node:crypto";
import { map as mapString } from "./maps.js";
import { Level } from "./game.js";

let roomId = 0


const START_POSITIONS = [
  { x: 1, y: 1 }, // Top-left
  { x: 15, y: 1 }, // Top-right
  { x: 1, y: 9 }, // Bottom-left
  { x: 15, y: 9 }  // Bottom-right
];

/**
 * Broadcasts lobby and countdown state to every player in the room.
 */
function broadcastRoomState(room) {
  const state = {
    type: "room_state",
    playerCount: room.players.length,
    playerNames: room.players.map(p => p.name),
    mainTimeLeft: room.mainTimeLeft,
    readyTimeLeft: room.readyTimeLeft,
    mainTimerStarted: room.mainTimerStarted,
    readyTimerStarted: room.readyTimerStarted,
    gameStarted: room.gameStarted,
  };
  room.players.forEach(p => p.conn.send(JSON.stringify(state)));
}

/**
 * Assigns starting positions and player indexes before the match begins.
 */
function assignPlayerPositionsAndSprites(room) {
  // room.map.addRandomBreaks(START_POSITIONS)
  room.players.forEach((player, idx) => {
    const pos = START_POSITIONS[idx];
    // const sprite = PLAYER_SPRITES[idx];
    player.pos = { x: pos.x, y: pos.y };
    // room.map.rows[pos.y][pos.x] = 'player'
    // player.spriteRow = sprite.spriteRow;
    console.log(idx);

    player.idx = idx;
  });
}

/**
 * Starts the lobby timer that waits for more players before the ready countdown.
 */
function startMainTimer(room) {
  if (room.players.length < 2) {
    return
  }

  if (room.mainTimerStarted) return;
  room.mainTimerStarted = true;
  room.mainTimeLeft = 20;
  // Ticks the lobby timer and starts the ready timer when the lobby is full or time expires.
  room.intervalId = setInterval(() => {
    broadcastRoomState(room);
    room.mainTimeLeft--;
    if (room.players.length === 4 || room.mainTimeLeft <= 0) {
      clearInterval(room.intervalId);
      room.intervalId = null;
      startReadyTimer(room);
    }
  }, 1000);
}

/**
 * Starts the ready countdown and marks the room as started when it ends.
 */
function startReadyTimer(room) {
  if (room.readyTimerStarted) return;
  room.readyTimerStarted = true;
  room.readyTimeLeft = 10;
  // Ticks the ready timer and starts the game when it reaches zero.
  room.intervalId = setInterval(() => {
    room.readyTimeLeft--;
    broadcastRoomState(room);
    if (room.readyTimeLeft <= 0) {
      clearInterval(room.intervalId);
      room.intervalId = null;
      room.gameStarted = true;
      assignPlayerPositionsAndSprites(room);
      broadcastRoomState(room);
    }
  }, 1000);
}


/**
 * Creates a player, assigns them to a room, and starts the room timers.
 */
const handlePlayer = (name, ws, game) => {
  let player = {
    conn: ws,
    player_id: null,
    room_id: roomId,
    name: null,
    bombsAvailable: 1, // Start with 1 bomb
    lives: 3,          // Start with 3 lives
    flameLength: 1,
    speed: 1,
    status: "live"
  };


  player.name = name;
  player.player_id = randomUUID()

  ws.send(JSON.stringify({
    type: "player_added",
    playerId: player.player_id
  }))

  if (game.rooms[roomId].players.length < 4) {
    if (!game.rooms[roomId].readyTimerStarted) {
      ws.player = { name: name, room_id: roomId, playerId: player.player_id };
      game.rooms[roomId].players.push(player);
    } else {
      game.rooms.push(
        {
          players: [],
          createdAt: Date.now(),
          mainTimerStarted: false,
          mainTimeLeft: 20,
          readyTimerStarted: false,
          readyTimeLeft: 10,
          intervalId: null,
          gameStarted: false,
          map: new Level(mapString),
          bombs: [],
          powerUp: []
        }
      )
      roomId++
      ws.player = { name: name, room_id: roomId, playerId: player.player_id };
      game.rooms[roomId].players.push(player);
    }

    startMainTimer(game.rooms[roomId]);

    if (game.rooms[roomId].players.length === 4) {
      game.rooms.push(
        {
          players: [],
          createdAt: Date.now(),
          mainTimerStarted: false,
          mainTimeLeft: 20,
          readyTimerStarted: false,
          readyTimeLeft: 10,
          intervalId: null,
          gameStarted: false,
          map: new Level(mapString),
          bombs: [],
          powerUp: []
        }
      )
      roomId++
    }
  }
};



export { handlePlayer, broadcastRoomState };
