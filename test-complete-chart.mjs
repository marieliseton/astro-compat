import { Body, MakeTime, GeoVector, Ecliptic } from 'astronomy-engine';

const FR = ['Bélier','Taureau','Gémeaux','Cancer','Lion','Vierge','Balance','Scorpion','Sagittaire','Capricorne','Verseau','Poissons'];
const EN = ['Aries','Taurus','Gemini','Cancer','Leo','Virgo','Libra','Scorpio','Sagittarius','Capricorn','Aquarius','Pisces'];
function sign(lon){ const n=((lon%360)+360)%360; return EN[Math.floor(n/30)]; }
function signFR(lon){ const n=((lon%360)+360)%360; return FR[Math.floor(n/30)]+' '+(n%30).toFixed(1); }

function obliquity(t){const T=t.tt/36525;return 23.439291111-0.013004167*T-1.638889e-7*T*T+5.036111e-7*T*T*T;}
function gmst(t){const T=t.tt/36525;const theta=280.46061837+360.98564736629*t.tt+0.000387933*T*T-(T*T*T)/38710000;return (((theta%360)+360)%360)/15;}

function calculateAscendant(time, lat, lon){
  const gstHours=gmst(time);
  const lstHours=((gstHours+lon/15)%24+24)%24;
  const ramc=lstHours*15;
  const eps=obliquity(time);
  const rr=ramc*Math.PI/180, er=eps*Math.PI/180, lr=lat*Math.PI/180;
  const y=Math.cos(rr);
  const x=-(Math.sin(rr)*Math.cos(er)+Math.tan(lr)*Math.sin(er));
  const asc=Math.atan2(y,x)*180/Math.PI;
  return ((asc%360)+360)%360;
}

function eclipticLongitude(body, time){
  const eqVec=GeoVector(body, time, true);
  const ecl=Ecliptic(eqVec);
  return ((ecl.elon%360)+360)%360;
}

function houseCusps(ascLon){
  return Array.from({length: 12}, (_, i) => ((ascLon + i*30) % 360 + 360) % 360);
}

const lat=48.8566, lon=2.3522;
const utcDate = new Date(Date.UTC(1997, 3, 16, 6, 20)); // 8:20 CEST = 6:20 UTC
const time = MakeTime(utcDate);

const ascLon = calculateAscendant(time, lat, lon);
const cusps = houseCusps(ascLon);

console.log('=== YOUR NATAL CHART (16 April 1997, 08:20 Paris) ===');
console.log('Ascendant:', sign(ascLon), (ascLon%30).toFixed(1)+'°');
console.log('');

const bodies = {
  'Sun': Body.Sun, 'Moon': Body.Moon, 'Mercury': Body.Mercury, 'Venus': Body.Venus,
  'Mars': Body.Mars, 'Jupiter': Body.Jupiter, 'Saturn': Body.Saturn,
  'Uranus': Body.Uranus, 'Neptune': Body.Neptune, 'Pluto': Body.Pluto
};

for(const [name, body] of Object.entries(bodies)){
  const lon = eclipticLongitude(body, time);
  console.log(name.padEnd(9) + ': ' + sign(lon).padEnd(12) + (lon%30).toFixed(1)+'°');
}

console.log('');
console.log('=== EQUAL HOUSES (current system) ===');
for(let i=1; i<=12; i++){
  console.log('House '+i.toString().padStart(2)+': '+sign(cusps[i-1]).padEnd(12)+(cusps[i-1]%30).toFixed(1)+'°');
}
