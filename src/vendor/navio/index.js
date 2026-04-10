export { default as navioPatched } from "../navio-patched/index.js";
export { default as navioUnpatched } from "../navio-unpatched/index.js";

// Default implementation used by the app.
// navioUnpatched points directly to node_modules/navio.
// To switch globally to original navio, change this line to:
// export { default } from "../navio-unpatched/index.js";
export { default } from "../navio-patched/index.js";
