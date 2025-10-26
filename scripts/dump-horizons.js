// Usage: node scripts/dump-horizons.js [body_code] [observer_lat] [observer_lon]
const fetch = require('node-fetch');

const bodyCode = process.argv[2] || '301'; // Default to Moon
const lat = process.argv[3] || '37.751';
const lon = process.argv[4] || '-97.822';

console.log(`Querying HORIZONS for body ${bodyCode} from ${lat}°N, ${lon}°E`);

(async () => {
  const date = new Date();
  const stop = new Date(date.getTime() + 60*1000);
  const params = new URLSearchParams({
    format: 'text',
    COMMAND: `'${bodyCode}'`,
    MAKE_EPHEM: 'YES',
    EPHEM_TYPE: 'OBSERVER',
    CENTER: "'coord@399'",
    COORD_TYPE: 'GEODETIC',
    SITE_COORD: `'${lon},${lat},0'`,
    START_TIME: `'${date.toISOString().slice(0,16).replace('T',' ')}'`,
    STOP_TIME: `'${stop.toISOString().slice(0,16).replace('T',' ')}'`,
    STEP_SIZE: "'1 m'",
    QUANTITIES: "'31'",
    REF_SYSTEM: 'J2000',
    REF_PLANE: 'ECLIPTIC',
    ANG_FORMAT: 'DEG',
    CSV_FORMAT: 'YES'
  });
  const url = 'https://ssd.jpl.nasa.gov/api/horizons.api?' + params.toString();
  console.log('URL:', url);
  const res = await fetch(url);
  const text = await res.text();
  const lines = text.split('\n');
  const soe = lines.findIndex(l => l.includes('$$SOE'));
  const eoe = lines.findIndex(l => l.includes('$$EOE'));
  console.log('\n--- Header lines ---');
  console.log(lines.slice(Math.max(0, soe-5), soe).join('\n'));
  console.log('\n--- First data line ---');
  console.log(lines[soe+1]);
  console.log('\n--- Full block ---');
  console.log(lines.slice(soe-2, Math.min(lines.length, eoe+2)).join('\n'));
})();
