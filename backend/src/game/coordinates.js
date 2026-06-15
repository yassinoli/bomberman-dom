export function toIndex(room, pos) {
  return pos.y * room.width + pos.x;
}

export function fromIndex(room, pos) {
  return { x: pos % room.width, y: Math.floor(pos / room.width) };
}
