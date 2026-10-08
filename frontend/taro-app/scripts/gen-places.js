/**
 * 生成 src/data/places.json（地点搜索用）：城市 / 火车站 / 机场 + 逐字拼音。
 * 拼音由 pinyin-pro（devDependency）在本地预生成，运行时不依赖拼音库。
 *   npm run gen:places
 */
const fs = require('fs');
const path = require('path');
const { pinyin } = require('pinyin-pro');

const src = JSON.parse(fs.readFileSync(path.join(__dirname, 'places.source.json'), 'utf8'));
const py = (s) => pinyin(s, { toneType: 'none', type: 'array' }).map((x) => x.toLowerCase());

const places = [];
for (const c of src.cities) {
  places.push({
    id: `city:${c.city}`,
    type: 'city',
    name: c.city,
    city: c.city,
    py: py(c.city),
    stations: c.stations.length,
    airports: c.airports.length,
    lat: c.lat,
    lng: c.lng
  });
  for (const s of c.stations) {
    places.push({ id: `station:${s}`, type: 'station', name: s, city: c.city, py: py(s) });
  }
  for (const [name, code] of c.airports) {
    // 简称：去掉城市前缀与「国际」，如 徐州观音国际机场 → 观音机场
    const alias = name.replace(c.city, '').replace('国际', '');
    places.push({ id: `airport:${code}`, type: 'airport', name, city: c.city, code, alias, aliasPy: py(alias), py: py(name) });
  }
}

const out = { hot: src.hot, places };
const file = path.join(__dirname, '..', 'src', 'data', 'places.json');
fs.writeFileSync(file, JSON.stringify(out) + '\n');
console.log(`places.json: ${places.length} places`);
