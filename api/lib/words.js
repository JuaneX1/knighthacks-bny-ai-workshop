const WORDS = [
  'copper', 'lantern', 'river', 'stone', 'maple', 'ember', 'harbor', 'falcon', 'meadow', 'granite',
  'willow', 'cinder', 'quartz', 'thistle', 'anchor', 'canyon', 'drift', 'ember', 'frost', 'glacier',
  'hollow', 'ivory', 'jasper', 'kettle', 'lagoon', 'marble', 'nectar', 'orchid', 'pebble', 'quiver',
  'ridge', 'sable', 'timber', 'umber', 'valley', 'walnut', 'yonder', 'zephyr', 'basalt', 'cobalt',
  'dune', 'echo', 'fable', 'grove', 'haven', 'inlet', 'juniper', 'kite', 'lotus', 'moss',
];

export function generatePassword() {
  const a = WORDS[Math.floor(Math.random() * WORDS.length)];
  let b = WORDS[Math.floor(Math.random() * WORDS.length)];
  while (b === a) {
    b = WORDS[Math.floor(Math.random() * WORDS.length)];
  }
  return `${a}-${b}`;
}
