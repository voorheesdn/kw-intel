// ─── Natural language location detection ────────────────────────────────────
// Shared between the listings dashboard and the intel API route.

export const US_STATES: Record<string, string> = {
  AL: 'Alabama', AK: 'Alaska', AZ: 'Arizona', AR: 'Arkansas', CA: 'California',
  CO: 'Colorado', CT: 'Connecticut', DE: 'Delaware', FL: 'Florida', GA: 'Georgia',
  HI: 'Hawaii', ID: 'Idaho', IL: 'Illinois', IN: 'Indiana', IA: 'Iowa',
  KS: 'Kansas', KY: 'Kentucky', LA: 'Louisiana', ME: 'Maine', MD: 'Maryland',
  MA: 'Massachusetts', MI: 'Michigan', MN: 'Minnesota', MS: 'Mississippi', MO: 'Missouri',
  MT: 'Montana', NE: 'Nebraska', NV: 'Nevada', NH: 'New Hampshire', NJ: 'New Jersey',
  NM: 'New Mexico', NY: 'New York', NC: 'North Carolina', ND: 'North Dakota', OH: 'Ohio',
  OK: 'Oklahoma', OR: 'Oregon', PA: 'Pennsylvania', RI: 'Rhode Island', SC: 'South Carolina',
  SD: 'South Dakota', TN: 'Tennessee', TX: 'Texas', UT: 'Utah', VT: 'Vermont',
  VA: 'Virginia', WA: 'Washington', WV: 'West Virginia', WI: 'Wisconsin', WY: 'Wyoming',
  DC: 'District of Columbia',
};

export interface DetectedLocation {
  city?: string;
  state?: string;
  area: string;
}

export const METROS: Record<string, { city: string; state: string }> = {
  'austin': { city: 'Austin', state: 'TX' },
  'dallas': { city: 'Dallas', state: 'TX' },
  'houston': { city: 'Houston', state: 'TX' },
  'san antonio': { city: 'San Antonio', state: 'TX' },
  'fort worth': { city: 'Fort Worth', state: 'TX' },
  'phoenix': { city: 'Phoenix', state: 'AZ' },
  'scottsdale': { city: 'Scottsdale', state: 'AZ' },
  'los angeles': { city: 'Los Angeles', state: 'CA' },
  'san francisco': { city: 'San Francisco', state: 'CA' },
  'san diego': { city: 'San Diego', state: 'CA' },
  'san jose': { city: 'San Jose', state: 'CA' },
  'denver': { city: 'Denver', state: 'CO' },
  'miami': { city: 'Miami', state: 'FL' },
  'tampa': { city: 'Tampa', state: 'FL' },
  'orlando': { city: 'Orlando', state: 'FL' },
  'jacksonville': { city: 'Jacksonville', state: 'FL' },
  'atlanta': { city: 'Atlanta', state: 'GA' },
  'chicago': { city: 'Chicago', state: 'IL' },
  'nashville': { city: 'Nashville', state: 'TN' },
  'charlotte': { city: 'Charlotte', state: 'NC' },
  'raleigh': { city: 'Raleigh', state: 'NC' },
  'seattle': { city: 'Seattle', state: 'WA' },
  'portland': { city: 'Portland', state: 'OR' },
  'las vegas': { city: 'Las Vegas', state: 'NV' },
  'new york': { city: 'New York', state: 'NY' },
  'boston': { city: 'Boston', state: 'MA' },
  'minneapolis': { city: 'Minneapolis', state: 'MN' },
  'columbus': { city: 'Columbus', state: 'OH' },
  'indianapolis': { city: 'Indianapolis', state: 'IN' },
  'kansas city': { city: 'Kansas City', state: 'MO' },
  'salt lake city': { city: 'Salt Lake City', state: 'UT' },
  'boise': { city: 'Boise', state: 'ID' },
  'detroit': { city: 'Detroit', state: 'MI' },
  'st louis': { city: 'St Louis', state: 'MO' },
  'philadelphia': { city: 'Philadelphia', state: 'PA' },
  'pittsburgh': { city: 'Pittsburgh', state: 'PA' },
  'baltimore': { city: 'Baltimore', state: 'MD' },
  'washington dc': { city: 'Washington', state: 'DC' },
  'sacramento': { city: 'Sacramento', state: 'CA' },
  'richmond': { city: 'Richmond', state: 'VA' },
  'memphis': { city: 'Memphis', state: 'TN' },
  'new orleans': { city: 'New Orleans', state: 'LA' },
  'oklahoma city': { city: 'Oklahoma City', state: 'OK' },
  'milwaukee': { city: 'Milwaukee', state: 'WI' },
  'albuquerque': { city: 'Albuquerque', state: 'NM' },
  'tucson': { city: 'Tucson', state: 'AZ' },
  'omaha': { city: 'Omaha', state: 'NE' },
  'reno': { city: 'Reno', state: 'NV' },
  'charleston': { city: 'Charleston', state: 'SC' },
  'savannah': { city: 'Savannah', state: 'GA' },
};

export function detectLocation(query: string): DetectedLocation | null {
  const upper = query.toUpperCase();

  // Pattern: "City, ST" or "City, State"
  const cityStateAbbr = query.match(/\b([A-Za-z][A-Za-z .'-]+),\s*([A-Z]{2})\b/);
  if (cityStateAbbr) {
    const stateCode = cityStateAbbr[2].toUpperCase();
    if (US_STATES[stateCode]) {
      return { city: cityStateAbbr[1].trim(), state: stateCode, area: `${cityStateAbbr[1].trim()}, ${stateCode}` };
    }
  }

  // Pattern: "in City" or "of City" followed by state
  const inCity = query.match(/(?:in|of|for|near)\s+([A-Za-z][A-Za-z .'-]+),?\s*([A-Z]{2})\b/i);
  if (inCity) {
    const stateCode = inCity[2].toUpperCase();
    if (US_STATES[stateCode]) {
      return { city: inCity[1].trim(), state: stateCode, area: `${inCity[1].trim()}, ${stateCode}` };
    }
  }

  // Pattern: just "in City" with a full state name
  for (const [code, name] of Object.entries(US_STATES)) {
    if (upper.includes(name.toUpperCase())) {
      const cityBeforeState = query.match(new RegExp(`(?:in|of|for|near)\\s+([A-Za-z][A-Za-z .'\\-]+?)\\s*,?\\s*${name}`, 'i'));
      if (cityBeforeState) {
        return { city: cityBeforeState[1].trim(), state: code, area: `${cityBeforeState[1].trim()}, ${code}` };
      }
      return { state: code, area: name };
    }
  }

  // Pattern: just a state abbreviation like "TX market"
  const stateOnly = upper.match(/\b([A-Z]{2})\s+(?:market|real estate|housing|listings?|homes?)\b/);
  if (stateOnly && US_STATES[stateOnly[1]]) {
    return { state: stateOnly[1], area: US_STATES[stateOnly[1]] };
  }

  // Common metro areas without state
  const lower = query.toLowerCase();
  for (const [name, loc] of Object.entries(METROS)) {
    if (lower.includes(name)) {
      return { city: loc.city, state: loc.state, area: `${loc.city}, ${loc.state}` };
    }
  }

  return null;
}
