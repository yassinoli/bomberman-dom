const levelChars = {
  ".": "empty",
  "#": "wall",
  "+": "break",
  "-": "safe",
};

const MAP_WIDTH = 17;
const MAP_HEIGHT = 11;
const BREAK_DENSITY = 0.35;
const START_POSITIONS = [
  { x: 1, y: 1 },
  { x: 15, y: 1 },
  { x: 1, y: 9 },
  { x: 15, y: 9 },
];

class Level {
  /**
   * Converts a map string into a playable level grid.
   */
  constructor(map) {
    const rows = map.trim().split("\n").map((line) => [...line]);

    this.height = rows.length;
    this.width = rows[0].length;
    this.startActors = [];
    this.rows = rows.map((row, y) => {
      return row.map((ch, x) => {
        const type = levelChars[ch];
        if (typeof type === "string") return type === "safe" ? "empty" : type;
        if (type && typeof type.create === "function") {
          this.startActors.push(type.create(new Vec(x, y), ch));
        }
        return "empty";
      });
    });
  }
}

class Player {
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
}

class Vec {
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
}

function createRandomMap(width = MAP_WIDTH, height = MAP_HEIGHT, blockDensity = BREAK_DENSITY) {
  const rows = [];

  for (let y = 0; y < height; y += 1) {
    let row = "";

    for (let x = 0; x < width; x += 1) {
      if (isBorder(x, y, width, height) || isFixedWall(x, y)) {
        row += "#";
      } else if (isSafeSpawnTile(x, y, width, height)) {
        row += "-";
      } else {
        row += Math.random() < blockDensity ? "+" : ".";
      }
    }

    rows.push(row);
  }

  return rows.join("\n");
}

function isBorder(x, y, width, height) {
  return x === 0 || y === 0 || x === width - 1 || y === height - 1;
}

function isFixedWall(x, y) {
  return x % 2 === 0 && y % 2 === 0;
}

function isSafeSpawnTile(x, y, width, height) {
  return START_POSITIONS.some((spawn) => {
    if (spawn.x >= width || spawn.y >= height) return false;
    const distance = Math.abs(spawn.x - x) + Math.abs(spawn.y - y);
    return distance <= 1;
  });
}

export const map = createRandomMap();
export { Level, Player, Vec, createRandomMap };
