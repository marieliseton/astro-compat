import {
  Body, MakeTime, GeoVector, Ecliptic,
  type AstroTime,
} from 'astronomy-engine';
import type { BirthData, NatalChart, PlanetPosition, PlanetKey, ZodiacSign } from './types';

const ZODIAC_SIGNS: ZodiacSign[] = [
  'Aries', 'Taurus', 'Gemini', 'Cancer', 'Leo', 'Virgo',
  'Libra', 'Scorpio', 'Sagittarius', 'Capricorn', 'Aquarius', 'Pisces',
];

const PLANET_BODIES: Record<PlanetKey, Body> = {
  sun:     Body.Sun,
  moon:    Body.Moon,
  mercury: Body.Mercury,
  venus:   Body.Venus,
  mars:    Body.Mars,
  jupiter: Body.Jupiter,
  saturn:  Body.Saturn,
  uranus:  Body.Uranus,
  neptune: Body.Neptune,
  pluto:   Body.Pluto,
};

// Convert local datetime + IANA timezone → UTC Date
function localToUtc(
  year: number, month: number, day: number,
  hour: number, minute: number, timezone: string,
): Date {
  try {
    // Probe: assume local time is UTC, then measure the offset
    const probe = new Date(Date.UTC(year, month - 1, day, hour, minute));
    const fmt = new Intl.DateTimeFormat('en-US', {
      timeZone: timezone,
      year: 'numeric', month: '2-digit', day: '2-digit',
      hour: '2-digit', minute: '2-digit', hour12: false,
    });
    const parts: Record<string, number> = {};
    for (const p of fmt.formatToParts(probe)) {
      if (p.type !== 'literal') parts[p.type] = parseInt(p.value, 10);
    }
    const tzMs = Date.UTC(
      parts.year, parts.month - 1, parts.day,
      parts.hour % 24, parts.minute,
    );
    const offsetMs = probe.getTime() - tzMs;
    return new Date(probe.getTime() + offsetMs);
  } catch {
    return new Date(Date.UTC(year, month - 1, day, hour, minute));
  }
}

function eclipticLongitude(body: Body, time: AstroTime): number {
  const eqVec = GeoVector(body, time, true);
  const ecl = Ecliptic(eqVec);
  return ((ecl.elon % 360) + 360) % 360;
}

function isRetrograde(body: Body, time: AstroTime): boolean {
  if (body === Body.Sun || body === Body.Moon) return false;
  const dt = 0.5; // half a day
  const before = eclipticLongitude(body, time.AddDays(-dt));
  const after  = eclipticLongitude(body, time.AddDays(+dt));
  let diff = after - before;
  if (diff > 180) diff -= 360;
  if (diff < -180) diff += 360;
  return diff < 0;
}

// Mean obliquity of ecliptic (degrees), T = Julian centuries from J2000
function obliquity(time: AstroTime): number {
  const T = time.tt / 36525;
  return 23.439291111
    - 0.013004167 * T
    - 1.638889e-7 * T * T
    + 5.036111e-7 * T * T * T;
}

// Greenwich Mean Sidereal Time (hours) — manual formula as fallback
function gmst(time: AstroTime): number {
  const JD = time.tt + 2451545.0;
  const T = time.tt / 36525;
  const theta = 280.46061837
    + 360.98564736629 * time.tt
    + 0.000387933 * T * T
    - (T * T * T) / 38710000;
  return (((theta % 360) + 360) % 360) / 15; // hours
}

function calculateAscendant(time: AstroTime, lat: number, lon: number): number {
  const gstHours = gmst(time);
  const lstHours = ((gstHours + lon / 15) % 24 + 24) % 24;
  const ramc = lstHours * 15; // degrees

  const eps = obliquity(time);
  const ramcRad = ramc * Math.PI / 180;
  const epsRad  = eps  * Math.PI / 180;
  const latRad  = lat  * Math.PI / 180;

  // Guard extreme latitudes where tan(lat) → ∞
  if (Math.abs(lat) >= 66) {
    // Equal-sign fallback: ASC = RAMC converted to ecliptic
    return ((ramc - 90 + 360) % 360);
  }

  const y = Math.cos(ramcRad);
  const x = -(Math.sin(ramcRad) * Math.cos(epsRad) + Math.tan(latRad) * Math.sin(epsRad));
  const asc = Math.atan2(y, x) * 180 / Math.PI;
  return ((asc % 360) + 360) % 360;
}

function longitudeToSign(lon: number): { sign: ZodiacSign; signDegree: number } {
  const norm = ((lon % 360) + 360) % 360;
  return {
    sign: ZODIAC_SIGNS[Math.floor(norm / 30)],
    signDegree: Math.round((norm % 30) * 100) / 100,
  };
}

// Placidus house cusps - based on Swiss Ephemeris swehouse.c algorithm
function houseCusps(ascLon: number, time: AstroTime, lat: number, lon: number): number[] {
  const eps = obliquity(time);
  const epsRad = eps * Math.PI / 180;
  const latRad = lat * Math.PI / 180;

  // Get RAMC
  const gstHours = gmst(time);
  const lstHours = ((gstHours + lon / 15) % 24 + 24) % 24;
  const ramc = lstHours * 15; // in degrees

  const deg2rad = (deg: number) => deg * Math.PI / 180;
  const rad2deg = (rad: number) => rad * 180 / Math.PI;
  const normalize = (angle: number) => {
    let a = angle % 360;
    return a < 0 ? a + 360 : a;
  };

  // Swiss Ephemeris Placidus algorithm from swehouse.c
  // Based on: a = asind(tand(lat) * tand(obliquity))
  const tanLat = Math.tan(latRad);
  const tanEps = Math.tan(epsRad);
  const a = rad2deg(Math.asin(Math.tan(latRad) * tanEps)); // auxiliary angle

  // Compute intermediate RA values for Placidus division
  // These represent 1/3 and 2/3 divisions of each semi-arc
  const computeRa = (fraction: number): number => {
    const numerator = Math.sin(deg2rad(a * fraction));
    return rad2deg(Math.atan(numerator / tanEps));
  };

  const fh1 = computeRa(1/3); // 1/3 of auxiliary arc
  const fh2 = computeRa(2/3); // 2/3 of auxiliary arc

  const cusps: number[] = [];

  // Convert RA to ecliptic longitude
  const raToLon = (ra: number): number => {
    const raRad = deg2rad(ra);
    const lonResult = rad2deg(Math.atan2(Math.sin(raRad), Math.cos(raRad) * Math.cos(epsRad)));
    return normalize(lonResult);
  };

  // Cardinal cusps
  cusps[0] = ascLon; // H1: Ascendant
  cusps[9] = raToLon(ramc); // H10: MC
  cusps[6] = normalize(ascLon + 180); // H7: Descendant
  cusps[3] = normalize(raToLon(ramc + 180)); // H4: IC

  // Placidus houses based on RA divisions
  cusps[1] = raToLon(ramc + 120 + fh1);
  cusps[2] = raToLon(ramc + 150 + fh2);
  cusps[4] = raToLon(ramc + 300 + fh1);
  cusps[5] = raToLon(ramc + 330 + fh2);
  cusps[7] = raToLon(ramc + 60 + fh1);
  cusps[8] = raToLon(ramc + 30 + fh2);
  cusps[10] = raToLon(ramc + 30 + fh1);
  cusps[11] = raToLon(ramc + 60 + fh2);

  return cusps;
}

function planetHouse(planetLon: number, cusps: number[]): number {
  for (let i = 0; i < 12; i++) {
    const cusp = cusps[i];
    const next = cusps[(i + 1) % 12];
    const rel = ((planetLon - cusp + 360) % 360);
    const size = ((next - cusp + 360) % 360);
    if (rel < size) return i + 1;
  }
  return 1;
}

export function calculateChart(data: BirthData): NatalChart {
  const utcDate = localToUtc(
    data.year, data.month, data.day,
    data.hour, data.minute, data.timezone,
  );
  const time = MakeTime(utcDate);

  const ascLon  = calculateAscendant(time, data.latitude, data.longitude);
  const { sign: ascSign, signDegree: ascDeg } = longitudeToSign(ascLon);
  const cusps   = houseCusps(ascLon, time, data.latitude, data.longitude);

  const chart: Partial<NatalChart> & { ascendant: NatalChart['ascendant']; houses: number[] } = {
    ascendant: { longitude: ascLon, sign: ascSign, signDegree: ascDeg },
    houses: cusps,
  };

  const planets: PlanetKey[] = [
    'sun', 'moon', 'mercury', 'venus', 'mars',
    'jupiter', 'saturn', 'uranus', 'neptune', 'pluto',
  ];

  for (const key of planets) {
    const body = PLANET_BODIES[key];
    const lon  = eclipticLongitude(body, time);
    const { sign, signDegree } = longitudeToSign(lon);
    const position: PlanetPosition = {
      longitude: Math.round(lon * 100) / 100,
      sign,
      signDegree,
      house: planetHouse(lon, cusps),
      retrograde: isRetrograde(body, time),
    };
    (chart as Record<string, unknown>)[key] = position;
  }

  return chart as NatalChart;
}
