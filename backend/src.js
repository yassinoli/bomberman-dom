// game 
const levelChars = {
  ".": "empty",
  "#": "wall",
  "+": "break",
  "-": "safe"
};

var Level = class Level {
  /**
   * Converts a map string into a playable level grid.
   */
  constructor(map) {
    let rows = map.trim().split("\n").map((line) => {
      // Splits each map row string into individual tile characters.
      return [...line];
    });
    this.height = rows.length;
    this.width = rows[0].length;
    this.startActors = [];
    this.rows = rows.map((row, y) => {
      // Converts each parsed map row into tile type names.
      return row.map((ch, x) => {
        // Converts a single map character into a tile or actor.
        let type = levelChars[ch];
        if (typeof type === "string") return type;
        if (type && typeof type.create === "function") {
          this.startActors.push(type.create(new Vec(x, y), ch));
        }
        return "empty";
      });
    });
    this.addRandomBreaks()
  }

  /**
   * Adds random breakable blocks while preserving safe spawn zones.
   */
  addRandomBreaks( blockDensity = 0.3) {

    for (let y = 0; y < this.height; y++) {
      for (let x = 0; x < this.width; x++) {
        if (this.rows[y][x] === "safe") {
          this.rows[y][x] = "empty";
          continue
        }
        if (
          this.rows[y][x] === "empty" &&
          Math.random() < blockDensity
        ) {
          this.rows[y][x] = "break";
        }
      }
    }
  }
};

var Player = class Player {
  /**
   * Creates a player actor with position, speed, and collision size.
   */
  constructor(pos, speed) {
    this.pos = pos;
    this.speed = speed;
    this.size = new Vec(0.5, 0.9);
  }

  /**
   * Returns the actor type used by the level engine.
   */
  get type() {
    return "player";
  }

  /**
   * Creates a player actor at the supplied map position.
   */
  static create(pos) {
    return new Player(pos.plus(new Vec(0, 0)), new Vec(0, 0));
  }
};

var Vec = class Vec {
  /**
   * Creates a two-dimensional vector.
   */
  constructor(x, y) {
    this.x = x;
    this.y = y;
  }

  /**
   * Adds another vector and returns the result.
   */
  plus(other) {
    return new Vec(this.x + other.x, this.y + other.y);
  }

  /**
   * Scales the vector by a numeric factor.
   */
  times(factor) {
    return new Vec(this.x * factor, this.y * factor);
  }
};


export { Level }


//maps

export const map =  `
#################
#--...........--#
#-#.#.#.#.#.#.#-#
#...............#
#.#.#.#.#.#.#.#.#
#...............#
#.#.#.#.#.#.#.#.#
#...............#
#-#.#.#.#.#.#.#-#
#--...........--#
#################
`
// export const map = `
// #################
// #1..+.#.#.+..+..#
// #+#.#+.+.#.#.+#.#
// #.+.+.+.+.+.+.+.#
// #.#.+.#.#.#.#.#.#
// #.+.+.+..+.+.+.+#
// #.#.#.#.#.#.+.#.#
// #.+.+.+.+.+.+.+.#
// #+#.#+.+.#.#.+#.#
// #3..+..+.#.+..4.#
// #################
// `;

//players 

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


//utils

const POWER_UPS = ["bombs", "flames", "speed"];
/**
 * Resolves a bomb explosion, including flames, block destruction, and power-up spawns.
 */
function explodeBomb(room, bomb) {
  const directions = [
    { dx: 0, dy: -1 }, // up
    { dx: 0, dy: 1 },  // down
    { dx: -1, dy: 0 }, // left
    { dx: 1, dy: 0 },  // right
  ];

  // Collect all affected positions
  const affected = [{ x: bomb.x, y: bomb.y }];


  // Always affect the bomb's own cell
  affectCell(room, bomb.x, bomb.y);

  for (const dir of directions) {
    for (let i = 1; i <= bomb.flameLength; i++) {
      const nx = bomb.x + dir.dx * i;
      const ny = bomb.y + dir.dy * i;
      const cell = room.map.rows[ny][nx];

      if (cell === "wall") break; // Stop at wall

      affected.push({ x: nx, y: ny });
      affectCell(room, nx, ny);
      if (cell === "break") {
        // Destroy breakable and stop flame
        room.map.rows[ny][nx] = "empty";
        if (Math.random() < 0.3) { // 30% chance, adjust as needed
          const type = POWER_UPS[Math.floor(Math.random() * POWER_UPS.length)];
          room.powerUp.push({ x: nx, y: ny, type });
          room.players.forEach(p => {
            // Notifies every player that a power-up spawned from the broken block.
            p.conn.send(JSON.stringify({
              type: "powerup_spawned",
              powerup: { x: nx, y: ny, type }
            }));
          });
        }
        break;
      }
    }
  }

  // Notify all players about the explosion (for animation)
  room.players.forEach(p => {
    // Sends every player the explosion animation payload.
    p.conn.send(JSON.stringify({
      type: "explosion",
      bomb: { x: bomb.x, y: bomb.y },
      flameLength: bomb.flameLength,
      affected // send all affected positions

    }));
  });
  sendMapToRoom(room);
}

/**
 * Applies explosion damage to players standing on a specific cell.
 */
function affectCell(room, x, y) {
  const deadPlayers = [];
  room.players.forEach(player => {
    // Checks whether this player is standing on the affected cell.
    console.log("player", player.pos.x, player.pos.y);
    console.log(x, y);
    if (player.pos.x === x && player.pos.y === y && player.lives > 0) {
      player.lives--;
      if (player.lives <= 0) {
        player.status = "dead";
        room.map.rows[y][x] = "empty";
        deadPlayers.push(player);
      }
    }
  });
  // Notify about deaths
  deadPlayers.forEach(deadPlayer => {
    // Notifies the defeated player and the remaining players about the death.
    deadPlayer.conn.send(JSON.stringify({
      type: "you_dead",
      id: deadPlayer.player_id,
      name: deadPlayer.name,
      x,
      y
    }));

    room.players.forEach(p => {
      // Sends the death notification to every other player.
      if (p !== deadPlayer) {
        p.conn.send(JSON.stringify({
          type: "player_died",
          id: deadPlayer.player_id,
          name: deadPlayer.name,
          x,
          y
        }));
      }
    });
  });

  // Remove dead players from the room
  room.players = room.players.filter(p => p.lives > 0 && p.status !== "dead");

  if (room.players.length === 1) {
    const winner = room.players[0];
    winner.conn.send(JSON.stringify({
      type: "winner",
      id: winner.player_id,
      name: winner.name
    }));
    // Closes the winning player's connection after sending the win message.
    setTimeout(() => {
      winner.conn.close();
    }, 100);
  }
}

/**
 * Places a bomb for a player and schedules its explosion.
 */
function handleBombPlacement(room, p) {
  if (p.bombsAvailable > 0) {
    p.bombsAvailable--;
    const bomb = {
      x: p.pos.x,
      y: p.pos.y,
      owner: p.player_id,
      flameLength: p.flameLength// or get from power-up
    };
    room.bombs.push(bomb);
    // Notify all players about the new bomb
    room.players.forEach(player => {
      // Notifies every player that the bomb was placed.
      player.conn.send(JSON.stringify({
        type: "bomb_placed",
        bomb: { x: bomb.x, y: bomb.y, placedAt: Date.now() }
      }));
    });
    sendMapToRoom(room);

    // Explodes the bomb after its fuse and restores the owner's bomb count.
    setTimeout(() => {
      explodeBomb(room, bomb);
      p.bombsAvailable++;
      // Remove bomb from room.bombs
      room.bombs = room.bombs.filter(b => b !== bomb);
    }, 3000);
  }
}

/**
 * Sends the current map state to every player in the room.
 */
function sendMapToRoom(room) {
  if (!room) return;
  room.players.forEach(p => {
    // Sends the latest map to this player.
    p.conn.send(JSON.stringify({
      type: "map",
      level: room.map
    }));
  });
}

/**
 * Sends player stats and status information to every player in the room.
 */
function sendPlayersInfo(room) {
  const players_info = room.players.map((pl) => ({
    lives: pl.lives,
    username: pl.name,
    status: pl.status,
    bombs: pl.bombsAvailable,
    index: pl.idx,
    speed: pl.speed,
    flames: pl.flameLength,
  }));

  room.players.forEach((pl) =>
    pl.conn.send(
      JSON.stringify({ type: "players_info", info: players_info })
    )
  );
}
export { explodeBomb, affectCell, handleBombPlacement, sendMapToRoom , sendPlayersInfo}
