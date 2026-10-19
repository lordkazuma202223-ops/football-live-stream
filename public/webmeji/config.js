// ✰ webmeji ✰  (vendored: github.com/lars-rooij/webmeji, Unlicense)
// little creatures that walk around the bottom of the site =w=b
//
// This project's edits vs. upstream:
//   - sprites live under webmeji/miku/
//   - ALLOWANCES restricted to the bottom edge (+ pet / drag), so they stay
//     walking along the bottom of the screen and never climb the page
//   - JUMP_CHANCE 0 : they never jump to the edges
// To swap in your own character, drop shime1.png, shime2.png ... into
// webmeji/miku/ (or a new folder) and update the frame lists below.

window.SPAWNING = [
  { id: 'webmeji-0', config: 'MIKU_CONFIG' },
  { id: 'webmeji-1', config: 'MIKU_CONFIG' }
];

window.MIKU_CONFIG = {
  // bottom = always required. pet = hover animation. drag = click/touch to pick up.
  // no top/left/right -> they stay on the bottom of the screen.
  ALLOWANCES: ['pet', 'drag', 'bottom'],

  // movement and physics (pixels per second/frame)
  walkspeed: 50,
  fallspeed: 150,
  jumpspeed: 200,

  // time in ms before standing back up after falling
  gettingupspeed: 3500,

  // idle and movement animations on the bottom edge ---------
  walk: {
    frames: ["webmeji/miku/shime1.png", "webmeji/miku/shime2.png", "webmeji/miku/shime3.png", "webmeji/miku/shime2.png"],
    interval: 175, loops: 6},

  stand: {
    frames: ["webmeji/miku/shime1.png"],
    interval: 1000, loops: 1},

  sit: {
    frames: ["webmeji/miku/shime11.png"],
    interval: 1000, loops: 1,
    randomizeDuration: true, min: 3000, max: 11000},

  spin: {
    frames: ["webmeji/miku/shime1.png"],
    interval: 150, loops: 3},

  dance: {
    frames: ["webmeji/miku/shime5.png", "webmeji/miku/shime6.png", "webmeji/miku/shime1.png"],
    interval: 200, loops: 2},

  trip: {
    frames: ["webmeji/miku/shime18.png", "webmeji/miku/shime19.png", "webmeji/miku/shime19.png"],
    interval: 250, loops: 1},

  // behavior flow control ------------------------------------------
  forcewalk: {
    loops: 6},

  forcethink: {
    frames: ["webmeji/miku/shime27.png", "webmeji/miku/shime28.png"],
    interval: 500, loops: 2},

  // user interaction animations ------------------------------------
  pet: {
    frames: ["webmeji/miku/shime15.png", "webmeji/miku/shime16.png", "webmeji/miku/shime17.png"],
    interval: 400},

  drag: {
    frames: ["webmeji/miku/shime7.png", "webmeji/miku/shime5.png", "webmeji/miku/shime8.png", "webmeji/miku/shime6.png"],
    interval: 210},

  // falling and recovery animations --------------------------------
  falling: {
    frames: ["webmeji/miku/shime10.png", "webmeji/miku/shime18.png"],
    interval: 200, loops: 2},

  fallen: {
    frames: ["webmeji/miku/shime9.png", "webmeji/miku/shime4.png", "webmeji/miku/shime19.png"],
    interval: 250, loops: 1},

  // action frequency and decision logic ----------------------------
  ORIGINAL_ACTIONS: [
    'walk','walk','walk','walk','walk','walk',
    'spin','spin','spin',
    'sit','sit',
    'dance','dance','dance','dance','dance',
    'trip'
  ],

  EDGE_ACTIONS: [
    'hang','hang',
    'climb','climb','climb','climb','climb',
    'fall'
  ],

  // never jump to the edges (bottom-only companions)
  JUMP_CHANCE: 0,

  // edge-specific animations (unused while bottom-only, kept for safety)
  climbSide: {
    frames: ["webmeji/miku/shime13.png", "webmeji/miku/shime14.png"],
    interval: 200, loops: 2},

  hangstillSide: {
    frames: ["webmeji/miku/shime12.png"],
    interval: 200, loops: 2,
    randomizeDuration: true, min: 3000, max: 11000},

  climbTop: {
    frames: ["webmeji/miku/shime24.png", "webmeji/miku/shime25.png"],
    interval: 200, loops: 8},

  hangstillTop: {
    frames: ["webmeji/miku/shime23.png"],
    interval: 200, loops: 2,
    randomizeDuration: true, min: 3000, max: 11000},

  jump: {
    frames: ["webmeji/miku/shime22.png"],
    interval: 200}
};
