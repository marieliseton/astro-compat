import { calculateChart } from './src/lib/astrology/calculate-chart';

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
console.log('=== NATAL CHART WITH PLACIDUS HOUSES ===');
console.log('');
console.log('Angles:');
console.log('ASC (H1):', chart.ascendant.sign, chart.ascendant.signDegree + '°');
console.log('MC (H10):', chart.houses[9].toFixed(2), '°');
console.log('DSC (H7):', chart.houses[6].toFixed(2), '°');
console.log('IC (H4):', chart.houses[3].toFixed(2), '°');
console.log('');
console.log('Planets:');
console.log('Sun:', chart.sun.sign, chart.sun.signDegree + '° (House ' + chart.sun.house + ')');
console.log('Moon:', chart.moon.sign, chart.moon.signDegree + '° (House ' + chart.moon.house + ')');
console.log('Mercury:', chart.mercury.sign, chart.mercury.signDegree + '° (House ' + chart.mercury.house + ')');
console.log('Venus:', chart.venus.sign, chart.venus.signDegree + '° (House ' + chart.venus.house + ')');
console.log('Mars:', chart.mars.sign, chart.mars.signDegree + '° (House ' + chart.mars.house + ')');
console.log('Jupiter:', chart.jupiter.sign, chart.jupiter.signDegree + '° (House ' + chart.jupiter.house + ')');
console.log('Saturn:', chart.saturn.sign, chart.saturn.signDegree + '° (House ' + chart.saturn.house + ')');
console.log('Uranus:', chart.uranus.sign, chart.uranus.signDegree + '° (House ' + chart.uranus.house + ')');
console.log('Neptune:', chart.neptune.sign, chart.neptune.signDegree + '° (House ' + chart.neptune.house + ')');
console.log('Pluto:', chart.pluto.sign, chart.pluto.signDegree + '° (House ' + chart.pluto.house + ')');
console.log('');
console.log('House Cusps (Placidus):');
for(let i = 0; i < 12; i++){
  const lon = chart.houses[i];
  const sign = ['Aries','Taurus','Gemini','Cancer','Leo','Virgo','Libra','Scorpio','Sagittarius','Capricorn','Aquarius','Pisces'][Math.floor(lon/30)];
  const deg = (lon%30).toFixed(1);
  console.log('House ' + (i+1).toString().padStart(2) + ':', sign.padEnd(12), deg + '°');
}
