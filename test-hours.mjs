import { Body, MakeTime, GeoVector, Ecliptic } from 'astronomy-engine';

const FR = ['Bélier','Taureau','Gémeaux','Cancer','Lion','Vierge','Balance','Scorpion','Sagittaire','Capricorne','Verseau','Poissons'];
function sign(lon){ const n=((lon%360)+360)%360; return (FR[Math.floor(n/30)]+' '+(n%30).toFixed(1)).padEnd(16)+'('+n.toFixed(1)+')'; }

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

const lat=48.8566, lon=2.3522;

console.log('Testing birth hours for 16 April 1997 Paris:');
console.log('RAMC should give ASC in Taurus range (0-60°)');
console.log('');

for(let hour=7; hour<=9.5; hour+=0.25){
  const min = Math.round((hour%1)*60);
  const h = Math.floor(hour);
  const utc = new Date(Date.UTC(1997,3,16, 6+Math.floor((h+min/60-8)*1), (min+(hour%1)*60)%60));
  const time = MakeTime(utc);
  const asc = calculateAscendant(time, lat, lon);
  console.log(`${h}:${min.toString().padStart(2,'0')} local -> ASC: ${sign(asc)}`);
}
