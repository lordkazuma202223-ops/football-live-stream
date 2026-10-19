// ✰ webmeji ✰  (vendored: github.com/lars-rooij/webmeji, Unlicense)
// companions walk, jump and cling around the site. they hang/climb at the
// bottom of the header (never behind the nav bar):
//   webmeji-0  Miku                (webmeji/miku/)
//   webmeji-1  Miku (alt)          (webmeji/miku-alt/)
//   webmeji-2  Erling Haaland      (webmeji/haaland/)
//   webmeji-3  Erling Haaland Chibi (webmeji/haaland-chibi/)
//
// FULL behaviour: bottom walk/idle/dance/trip + pet + drag, jumping to the
// top/left/right edges, and clinging/climbing on them.
//
// Haaland's frames were mapped from its animation.json (124-frame sequence):
//   stand 0 | bounce 1-20 | fall 21 | drag 22-41 | fling 42-61 | idle 62-81
//   climb 82-102 | walk 103-121 | ceiling-walk 122-123

function frameSeq(base, from, to, ext) {
  var a = [];
  for (var i = from; i <= to; i++) a.push(base + ('0000' + i).slice(-4) + ext);
  return a;
}

var MIKU = 'webmeji/miku/';
var MIKU_ALT = 'webmeji/miku-alt/';
var HAALAND = 'webmeji/haaland/';
var HAALAND_CHIBI = 'webmeji/haaland-chibi/';

window.SPAWNING = [
  { id: 'webmeji-0', config: 'MIKU_CONFIG' },
  { id: 'webmeji-1', config: 'MIKU_ALT_CONFIG' },
  { id: 'webmeji-2', config: 'HAALAND_CONFIG' },
  { id: 'webmeji-3', config: 'HAALAND_CHIBI_CONFIG' }
];

// ── Miku ─────────────────────────────────────────────────────────────
window.MIKU_CONFIG = {
  ALLOWANCES: ['pet', 'drag', 'bottom', 'top', 'left', 'right'],

  walkspeed: 50, fallspeed: 150, jumpspeed: 200, gettingupspeed: 3500,

  walk: { frames: [MIKU + 'shime1.png', MIKU + 'shime2.png', MIKU + 'shime3.png', MIKU + 'shime2.png'], interval: 175, loops: 6 },
  stand: { frames: [MIKU + 'shime1.png'], interval: 1000, loops: 1 },
  sit: { frames: [MIKU + 'shime11.png'], interval: 1000, loops: 1, randomizeDuration: true, min: 3000, max: 11000 },
  spin: { frames: [MIKU + 'shime1.png'], interval: 150, loops: 3 },
  dance: { frames: [MIKU + 'shime5.png', MIKU + 'shime6.png', MIKU + 'shime1.png'], interval: 200, loops: 2 },
  trip: { frames: [MIKU + 'shime18.png', MIKU + 'shime19.png', MIKU + 'shime19.png'], interval: 250, loops: 1 },

  forcewalk: { loops: 6 },
  forcethink: { frames: [MIKU + 'shime27.png', MIKU + 'shime28.png'], interval: 500, loops: 2 },

  pet: { frames: [MIKU + 'shime15.png', MIKU + 'shime16.png', MIKU + 'shime17.png'], interval: 400 },
  drag: { frames: [MIKU + 'shime7.png', MIKU + 'shime5.png', MIKU + 'shime8.png', MIKU + 'shime6.png'], interval: 210 },

  falling: { frames: [MIKU + 'shime10.png', MIKU + 'shime18.png'], interval: 200, loops: 2 },
  fallen: { frames: [MIKU + 'shime9.png', MIKU + 'shime4.png', MIKU + 'shime19.png'], interval: 250, loops: 1 },

  ORIGINAL_ACTIONS: ['walk', 'walk', 'walk', 'walk', 'walk', 'walk', 'spin', 'spin', 'spin', 'sit', 'sit', 'dance', 'dance', 'dance', 'dance', 'dance', 'trip'],
  EDGE_ACTIONS: ['hang', 'hang', 'climb', 'climb', 'climb', 'climb', 'climb', 'fall'],
  JUMP_CHANCE: 0.1,

  climbSide: { frames: [MIKU + 'shime13.png', MIKU + 'shime14.png'], interval: 200, loops: 2 },
  hangstillSide: { frames: [MIKU + 'shime12.png'], interval: 200, loops: 2, randomizeDuration: true, min: 3000, max: 11000 },
  climbTop: { frames: [MIKU + 'shime24.png', MIKU + 'shime25.png'], interval: 200, loops: 8 },
  hangstillTop: { frames: [MIKU + 'shime23.png'], interval: 200, loops: 2, randomizeDuration: true, min: 3000, max: 11000 },
  jump: { frames: [MIKU + 'shime22.png'], interval: 200 }
};

// ── Miku (alt version) ───────────────────────────────────────────────
window.MIKU_ALT_CONFIG = {
  ALLOWANCES: ['pet', 'drag', 'bottom', 'top', 'left', 'right'],

  walkspeed: 50, fallspeed: 150, jumpspeed: 200, gettingupspeed: 3500,

  walk: { frames: [MIKU_ALT + 'shime1.png', MIKU_ALT + 'shime2.png', MIKU_ALT + 'shime3.png', MIKU_ALT + 'shime2.png'], interval: 175, loops: 6 },
  stand: { frames: [MIKU_ALT + 'shime1.png'], interval: 1000, loops: 1 },
  sit: { frames: [MIKU_ALT + 'shime11.png'], interval: 1000, loops: 1, randomizeDuration: true, min: 3000, max: 11000 },
  spin: { frames: [MIKU_ALT + 'shime1.png'], interval: 150, loops: 3 },
  dance: { frames: [MIKU_ALT + 'shime5.png', MIKU_ALT + 'shime6.png', MIKU_ALT + 'shime1.png'], interval: 200, loops: 2 },
  trip: { frames: [MIKU_ALT + 'shime18.png', MIKU_ALT + 'shime19.png', MIKU_ALT + 'shime19.png'], interval: 250, loops: 1 },

  forcewalk: { loops: 6 },
  forcethink: { frames: [MIKU_ALT + 'shime27.png', MIKU_ALT + 'shime28.png'], interval: 500, loops: 2 },

  pet: { frames: [MIKU_ALT + 'shime15.png', MIKU_ALT + 'shime16.png', MIKU_ALT + 'shime17.png'], interval: 400 },
  drag: { frames: [MIKU_ALT + 'shime7.png', MIKU_ALT + 'shime5.png', MIKU_ALT + 'shime8.png', MIKU_ALT + 'shime6.png'], interval: 210 },

  falling: { frames: [MIKU_ALT + 'shime10.png', MIKU_ALT + 'shime18.png'], interval: 200, loops: 2 },
  fallen: { frames: [MIKU_ALT + 'shime9.png', MIKU_ALT + 'shime4.png', MIKU_ALT + 'shime19.png'], interval: 250, loops: 1 },

  ORIGINAL_ACTIONS: ['walk', 'walk', 'walk', 'walk', 'walk', 'walk', 'spin', 'spin', 'spin', 'sit', 'sit', 'dance', 'dance', 'dance', 'dance', 'dance', 'trip'],
  EDGE_ACTIONS: ['hang', 'hang', 'climb', 'climb', 'climb', 'climb', 'climb', 'fall'],
  JUMP_CHANCE: 0.1,

  climbSide: { frames: [MIKU_ALT + 'shime13.png', MIKU_ALT + 'shime14.png'], interval: 200, loops: 2 },
  hangstillSide: { frames: [MIKU_ALT + 'shime12.png'], interval: 200, loops: 2, randomizeDuration: true, min: 3000, max: 11000 },
  climbTop: { frames: [MIKU_ALT + 'shime24.png', MIKU_ALT + 'shime25.png'], interval: 200, loops: 8 },
  hangstillTop: { frames: [MIKU_ALT + 'shime23.png'], interval: 200, loops: 2, randomizeDuration: true, min: 3000, max: 11000 },
  jump: { frames: [MIKU_ALT + 'shime22.png'], interval: 200 }
};

// ── Erling Haaland ───────────────────────────────────────────────────
window.HAALAND_CONFIG = {
  ALLOWANCES: ['pet', 'drag', 'bottom', 'top', 'left', 'right'],

  walkspeed: 45, fallspeed: 160, jumpspeed: 220, gettingupspeed: 1500,

  walk: { frames: frameSeq(HAALAND, 103, 121, '.webp'), interval: 100, loops: 3 },
  stand: { frames: [HAALAND + '0000.webp'], interval: 200, loops: 1 },
  sit: { frames: [HAALAND + '0062.webp'], interval: 1000, loops: 1, randomizeDuration: true, min: 3000, max: 11000 },
  spin: { frames: frameSeq(HAALAND, 1, 20, '.webp'), interval: 60, loops: 1 },
  dance: { frames: frameSeq(HAALAND, 62, 81, '.webp'), interval: 100, loops: 2 },
  trip: { frames: frameSeq(HAALAND, 42, 61, '.webp'), interval: 90, loops: 1 },

  forcewalk: { loops: 6 },
  forcethink: { frames: [HAALAND + '0063.webp', HAALAND + '0064.webp'], interval: 500, loops: 2 },

  pet: { frames: [HAALAND + '0062.webp', HAALAND + '0063.webp', HAALAND + '0064.webp'], interval: 150 },
  drag: { frames: frameSeq(HAALAND, 22, 41, '.webp'), interval: 70 },

  falling: { frames: [HAALAND + '0021.webp'], interval: 200, loops: 2 },
  fallen: { frames: [HAALAND + '0000.webp'], interval: 250, loops: 1 },

  ORIGINAL_ACTIONS: ['walk', 'walk', 'walk', 'walk', 'walk', 'walk', 'spin', 'spin', 'sit', 'sit', 'dance', 'dance', 'trip'],
  EDGE_ACTIONS: ['hang', 'hang', 'climb', 'climb', 'climb', 'climb', 'fall', 'fall'],
  JUMP_CHANCE: 0.12,

  climbSide: { frames: frameSeq(HAALAND, 82, 102, '.webp'), interval: 100, loops: 2 },
  hangstillSide: { frames: [HAALAND + '0082.webp'], interval: 200, loops: 2, randomizeDuration: true, min: 3000, max: 11000 },
  climbTop: { frames: [HAALAND + '0122.webp', HAALAND + '0123.webp'], interval: 200, loops: 6 },
  hangstillTop: { frames: [HAALAND + '0123.webp'], interval: 200, loops: 2, randomizeDuration: true, min: 3000, max: 11000 },
  jump: { frames: [HAALAND + '0021.webp'], interval: 200 }
};

// ── Erling Haaland Chibi ─────────────────────────────────────────────
// mapped from its animation.json (101-frame sequence):
//   stand 0 | walk 1-7 | ceiling-hang 8-14 | climb 15-23 | descend 24-32
//   idle 33-39 | fall 40 | motion 41-60 | fling 61-80 | drag 81-100
window.HAALAND_CHIBI_CONFIG = {
  ALLOWANCES: ['pet', 'drag', 'bottom', 'top', 'left', 'right'],

  walkspeed: 45, fallspeed: 160, jumpspeed: 220, gettingupspeed: 1500,

  walk: { frames: frameSeq(HAALAND_CHIBI, 1, 7, '.webp'), interval: 110, loops: 3 },
  stand: { frames: [HAALAND_CHIBI + '0000.webp'], interval: 200, loops: 1 },
  sit: { frames: [HAALAND_CHIBI + '0033.webp'], interval: 1000, loops: 1, randomizeDuration: true, min: 3000, max: 11000 },
  spin: { frames: frameSeq(HAALAND_CHIBI, 41, 60, '.webp'), interval: 70, loops: 1 },
  dance: { frames: frameSeq(HAALAND_CHIBI, 33, 39, '.webp'), interval: 120, loops: 2 },
  trip: { frames: frameSeq(HAALAND_CHIBI, 61, 80, '.webp'), interval: 80, loops: 1 },

  forcewalk: { loops: 6 },
  forcethink: { frames: [HAALAND_CHIBI + '0034.webp', HAALAND_CHIBI + '0035.webp'], interval: 500, loops: 2 },

  pet: { frames: [HAALAND_CHIBI + '0033.webp', HAALAND_CHIBI + '0034.webp', HAALAND_CHIBI + '0035.webp'], interval: 150 },
  drag: { frames: frameSeq(HAALAND_CHIBI, 81, 100, '.webp'), interval: 70 },

  falling: { frames: [HAALAND_CHIBI + '0040.webp'], interval: 200, loops: 2 },
  fallen: { frames: [HAALAND_CHIBI + '0000.webp'], interval: 250, loops: 1 },

  ORIGINAL_ACTIONS: ['walk', 'walk', 'walk', 'walk', 'walk', 'walk', 'spin', 'spin', 'sit', 'sit', 'dance', 'dance', 'trip'],
  EDGE_ACTIONS: ['hang', 'hang', 'climb', 'climb', 'climb', 'climb', 'fall', 'fall'],
  JUMP_CHANCE: 0.12,

  climbSide: { frames: frameSeq(HAALAND_CHIBI, 15, 23, '.webp'), interval: 110, loops: 2 },
  hangstillSide: { frames: [HAALAND_CHIBI + '0015.webp'], interval: 200, loops: 2, randomizeDuration: true, min: 3000, max: 11000 },
  climbTop: { frames: frameSeq(HAALAND_CHIBI, 8, 14, '.webp'), interval: 110, loops: 4 },
  hangstillTop: { frames: [HAALAND_CHIBI + '0008.webp'], interval: 200, loops: 2, randomizeDuration: true, min: 3000, max: 11000 },
  jump: { frames: [HAALAND_CHIBI + '0040.webp'], interval: 200 }
};
