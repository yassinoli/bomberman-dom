import { connect } from "./js/connect.js";
import { frame } from "./js/frame.js";
import { handleKeydown } from "./js/handle-keydown.js";

document.addEventListener("keydown", handleKeydown);

connect();
requestAnimationFrame(frame);
