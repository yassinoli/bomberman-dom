import { resolve } from "node:path";
import { fileURLToPath } from "node:url";

export const backendRoot = resolve(fileURLToPath(new URL("..", import.meta.url)));
export const projectRoot = resolve(backendRoot, "..");
export const frontendRoot = resolve(projectRoot, "bomberman-dom");
export const frameworkRoot = resolve(projectRoot, "fw");
