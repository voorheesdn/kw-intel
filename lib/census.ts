// ─── U.S. Census Bureau API Client ──────────────────────────────────────────
// Demographics, migration, and income data for real estate market intelligence.
// Free, no API key required.

const CENSUS_BASE = 'https://api.census.gov/data';
const ACS_YEAR = '2023'; // Latest 5-year ACS available

// ─── FIPS lookup for major metros ───────────────────────────────────────────

interface FipsCode {
  state: string;
  place: string;
  countyFips?: string;
}

// State FIPS codes
const STATE_FIPS: Record<string, string> = {
  AL: '01', AK: '02', AZ: '04', AR: '05', CA: '06', CO: '08', CT: '09',
  DE: '10', FL: '12', GA: '13', HI: '15', ID: '16', IL: '17', IN: '18',
  IA: '19', KS: '20', KY: '21', LA: '22', ME: '23', MD: '24', MA: '25',
  MI: '26', MN: '27', MS: '28', MO: '29', MT: '30', NE: '31', NV: '32',
  NH: '33', NJ: '34', NM: '35', NY: '36', NC: '37', ND: '38', OH: '39',
  OK: '40', OR: '41', PA: '42', RI: '44', SC: '45', SD: '46', TN: '47',
  TX: '48', UT: '49', VT: '50', VA: '51', WA: '53', WV: '54', WI: '55',
  WY: '56', DC: '11',
};

// City Place FIPS codes for major metros
const CITY_FIPS: Record<string, FipsCode> = {
  'austin,tx': { state: '48', place: '05000' },
  'dallas,tx': { state: '48', place: '19000' },
  'houston,tx': { state: '48', place: '35000' },
  'san antonio,tx': { state: '48', place: '65000' },
  'fort worth,tx': { state: '48', place: '27000' },
  'phoenix,az': { state: '04', place: '55000' },
  'scottsdale,az': { state: '04', place: '65000' },
  'los angeles,ca': { state: '06', place: '44000' },
  'san francisco,ca': { state: '06', place: '67000' },
  'san diego,ca': { state: '06', place: '66000' },
  'san jose,ca': { state: '06', place: '68000' },
  'sacramento,ca': { state: '06', place: '64000' },
  'denver,co': { state: '08', place: '20000' },
  'miami,fl': { state: '12', place: '45000' },
  'tampa,fl': { state: '12', place: '71000' },
  'orlando,fl': { state: '12', place: '53000' },
  'jacksonville,fl': { state: '12', place: '35000' },
  'atlanta,ga': { state: '13', place: '04000' },
  'chicago,il': { state: '17', place: '14000' },
  'indianapolis,in': { state: '18', place: '36003' },
  'nashville,tn': { state: '47', place: '52006' },
  'memphis,tn': { state: '47', place: '48000' },
  'charlotte,nc': { state: '37', place: '12000' },
  'raleigh,nc': { state: '37', place: '55000' },
  'seattle,wa': { state: '53', place: '63000' },
  'portland,or': { state: '41', place: '59000' },
  'las vegas,nv': { state: '32', place: '40000' },
  'new york,ny': { state: '36', place: '51000' },
  'boston,ma': { state: '25', place: '07000' },
  'minneapolis,mn': { state: '27', place: '43000' },
  'columbus,oh': { state: '39', place: '18000' },
  'kansas city,mo': { state: '29', place: '38000' },
  'salt lake city,ut': { state: '49', place: '67000' },
  'boise,id': { state: '16', place: '08830' },
  'detroit,mi': { state: '26', place: '22000' },
  'philadelphia,pa': { state: '42', place: '60000' },
  'pittsburgh,pa': { state: '42', place: '61000' },
  'baltimore,md': { state: '24', place: '04000' },
  'washington,dc': { state: '11', place: '50000' },
  'richmond,va': { state: '51', place: '67000' },
  'new orleans,la': { state: '22', place: '55000' },
  'oklahoma city,ok': { state: '40', place: '55000' },
  'milwaukee,wi': { state: '55', place: '53000' },
  'albuquerque,nm': { state: '35', place: '02000' },
  'tucson,az': { state: '04', place: '77000' },
  'omaha,ne': { state: '31', place: '37000' },
  'reno,nv': { state: '32', place: '60600' },
  'charleston,sc': { state: '45', place: '13330' },
  'savannah,ga': { state: '13', place: '69000' },
};

function lookupFips(city?: string, state?: string): FipsCode | null {
  if (!city || !state) return null;
  const key = `${city.toLowerCase()},${state.toLowerCase()}`;
  return CITY_FIPS[key] || null;
}

// ─── Census data types ──────────────────────────────────────────────────────

export interface CensusSnapshot {
  area: string;
  population: number;
  medianHouseholdIncome: number;
  movedFromDifferentState: number;    // people who moved in from another state
  movedFromAbroad: number;            // people who moved in from abroad
  totalMobility: number;             // total population 1yr+ (denominator)
  medianAge: number;
  totalHousingUnits: number;
  ownerOccupied: number;
  renterOccupied: number;
}

// ─── Fetch census data for a city ───────────────────────────────────────────

export async function fetchCensusData(city?: string, state?: string): Promise<CensusSnapshot | null> {
  const fips = lookupFips(city, state);
  if (!fips) return null;

  // Two API calls: detailed table for pop/income/age/housing, profile table for mobility
  // Profile table (DP02) has clean mobility variables:
  //   DP02_0082E = Same house 1 year ago
  //   DP02_0083E = Moved within same county
  //   DP02_0084E = Moved from different county, same state
  //   DP02_0085E = Moved from different state
  //   DP02_0086E = Moved from abroad

  const detailedVars = 'NAME,B01003_001E,B19013_001E,B01002_001E,B25001_001E,B25003_002E,B25003_003E';
  const profileVars = 'DP02_0085E,DP02_0086E';

  try {
    const [detailedRes, profileRes] = await Promise.all([
      fetch(`${CENSUS_BASE}/${ACS_YEAR}/acs/acs5?get=${detailedVars}&for=place:${fips.place}&in=state:${fips.state}`),
      fetch(`${CENSUS_BASE}/${ACS_YEAR}/acs/acs5/profile?get=${profileVars}&for=place:${fips.place}&in=state:${fips.state}`),
    ]);

    if (!detailedRes.ok || !profileRes.ok) {
      console.error(`Census API error: detailed=${detailedRes.status}, profile=${profileRes.status}`);
      return null;
    }

    const [detailedData, profileData] = await Promise.all([detailedRes.json(), profileRes.json()]);
    if (!detailedData?.[1] || !profileData?.[1]) return null;

    const d = detailedData[1];
    const p = profileData[1];

    return {
      area: d[0],
      population: parseInt(d[1]) || 0,
      medianHouseholdIncome: parseInt(d[2]) || 0,
      movedFromDifferentState: parseInt(p[0]) || 0,
      movedFromAbroad: parseInt(p[1]) || 0,
      totalMobility: parseInt(d[1]) || 0, // use total pop as denominator
      medianAge: parseFloat(d[3]) || 0,
      totalHousingUnits: parseInt(d[4]) || 0,
      ownerOccupied: parseInt(d[5]) || 0,
      renterOccupied: parseInt(d[6]) || 0,
    };
  } catch (err) {
    console.error('Census API error:', err);
    return null;
  }
}

// ─── Format for AI prompt injection ─────────────────────────────────────────

export function formatCensusForAI(snapshot: CensusSnapshot): string {
  const inMigrationRate = snapshot.totalMobility > 0
    ? ((snapshot.movedFromDifferentState / snapshot.totalMobility) * 100).toFixed(1)
    : '0';

  const ownerRate = snapshot.totalHousingUnits > 0
    ? ((snapshot.ownerOccupied / snapshot.totalHousingUnits) * 100).toFixed(1)
    : '0';

  const renterRate = snapshot.totalHousingUnits > 0
    ? ((snapshot.renterOccupied / snapshot.totalHousingUnits) * 100).toFixed(1)
    : '0';

  return [
    `DEMOGRAPHIC DATA for ${snapshot.area} (from U.S. Census Bureau, ACS ${ACS_YEAR}):`,
    `  - Population: ${snapshot.population.toLocaleString()}`,
    `  - Median Household Income: $${snapshot.medianHouseholdIncome.toLocaleString()}`,
    `  - Median Age: ${snapshot.medianAge}`,
    `  - In-Migration from other states: ${snapshot.movedFromDifferentState.toLocaleString()} people/year (${inMigrationRate}% of population)`,
    `  - In-Migration from abroad: ${snapshot.movedFromAbroad.toLocaleString()} people/year`,
    `  - Total Housing Units: ${snapshot.totalHousingUnits.toLocaleString()}`,
    `  - Owner-Occupied: ${snapshot.ownerOccupied.toLocaleString()} (${ownerRate}%)`,
    `  - Renter-Occupied: ${snapshot.renterOccupied.toLocaleString()} (${renterRate}%)`,
  ].join('\n');
}

// ─── Main enrichment function ───────────────────────────────────────────────

export async function fetchCensusContext(city?: string, state?: string): Promise<string | null> {
  const snapshot = await fetchCensusData(city, state);
  if (!snapshot) return null;
  return formatCensusForAI(snapshot);
}
