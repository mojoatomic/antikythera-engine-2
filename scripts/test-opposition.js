#!/usr/bin/env node

const AntikytheraEngine = require('../engine');
const astronomy = require('astronomy-engine');
const engine = new AntikytheraEngine();

console.log('Testing opposition calculation...\n');

// Test elongations directly
const date = new Date();
console.log(`Current date: ${date.toISOString()}\n`);

const planets = ['Mars', 'Jupiter', 'Saturn'];
const synodicPeriods = { 'Mars': 780, 'Jupiter': 399, 'Saturn': 378 };

const observer = new astronomy.Observer(0, 0, 0);

for (const planet of planets) {
  const sunEq = astronomy.Equator('Sun', date, observer, true, true);
  const sunEcl = astronomy.Ecliptic(sunEq.vec);
  const sunLon = sunEcl.elon;
  
  const planetEq = astronomy.Equator(planet, date, observer, true, true);
  const planetEcl = astronomy.Ecliptic(planetEq.vec);
  const planetLon = planetEcl.elon;
  
  let elongation = Math.abs(planetLon - sunLon);
  if (elongation > 180) elongation = 360 - elongation;
  
  console.log(`${planet}:`);
  console.log(`  Sun longitude: ${sunLon.toFixed(2)}°`);
  console.log(`  Planet longitude: ${planetLon.toFixed(2)}°`);
  console.log(`  Elongation: ${elongation.toFixed(2)}°`);
  console.log(`  Synodic period: ${synodicPeriods[planet]} days\n`);
}

console.time('Opposition calculation');
const opposition = engine.getNextOpposition(date);
console.timeEnd('Opposition calculation');

console.log('\nResult:');
console.log(JSON.stringify(opposition, null, 2));
