import { calculateChart } from './src/lib/astrology/calculate-chart.js';

const birthData = {
  year: 1997,
  month: 4,
  day: 16,
  hour: 8,
  minute: 20,
  timezone: 'Europe/Paris',
  latitude: 48.8566,
  longitude: 2.3522,
};

const chart = calculateChart(birthData);

console.log('EXPECTED from your image:');
console.log('- Moon in Leo, House 4');
console.log('- Mars in Virgo, House 5');
console.log('- Pluto in Sagittarius, House 7');
console.log('- Saturn in Aries, House 11');
console.log('- Mercury in Taurus, House 12');
console.log('- Jupiter in House 10');
console.log('');

console.log('CURRENT RESULTS (Placidus attempt):');
console.log('- Moon:', chart.moon.sign, 'House', chart.moon.house, '✗');
console.log('- Mars:', chart.mars.sign, 'House', chart.mars.house, '✗');
console.log('- Pluto:', chart.pluto.sign, 'House', chart.pluto.house, '✓');
console.log('- Saturn:', chart.saturn.sign, 'House', chart.saturn.house, '✗');
console.log('- Mercury:', chart.mercury.sign, 'House', chart.mercury.house, '✗');
console.log('- Jupiter:', chart.jupiter.sign, 'House', chart.jupiter.house, '✗');
