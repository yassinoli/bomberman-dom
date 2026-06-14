import { h } from "../utils/h.js";
import { nowTime } from "../utils/now-time.js";

export function messageView(message) {
  return h("div", { class: `message ${message.className || "system"}` }, {}, `[${message.time || nowTime()}] ${message.sender}: ${message.text}`);
}
