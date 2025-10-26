#!/usr/bin/env node

const astronomy = require('astronomy-engine');

const date = new Date('2025-10-26T06:23:19.116Z');

// Test 1: Different observer longitudes
const observers = [
  { name: 'Greenwich', lon: 0, lat: 51.5 },
  { name: 'Athens', lon: 23.0, lat: 37.5 },
  { name: 'New York', lon: -74.0, lat: 40.7 }
];

console.log('Testing coordinate offset with different observer longitudes\n');
console.log('Date:', date.toISOString());
console.log('='.repeat(80));

observers.forEach(obs => {
  const observer = new astronomy.Observer(obs.lat, obs.lon, 0);
  
  const sunEq = astronomy.Equator('Sun', date, observer, true, true);
  const sunEcl = astronomy.Ecliptic(sunEq.vec);
  
  const moonEq = astronomy.Equator('Moon', date, observer, true, true);
  const moonEcl = astronomy.Ecliptic(moonEq.vec);
  
  console.log(`\n${obs.name} (${obs.lon}°E, ${obs.lat}°N):`);
  console.log(`  Sun  ecliptic: ${sunEcl.elon.toFixed(6)}° lon, ${sunEcl.elat.toFixed(6)}° lat`);
  console.log(`  Moon ecliptic: ${moonEcl.elon.toFixed(6)}° lon, ${moonEcl.elat.toFixed(6)}° lat`);
});

console.log('\n' + '='.repeat(80));
console.log('\nHypothesis: If offset is ~0.36° for all bodies at Athens,');
console.log('it suggests the observer longitude is being incorrectly applied.');
