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
