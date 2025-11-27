// Airport code to continent mapping
const airportContinents = {
  // North America
  'YYZ': 'North America', 'YUL': 'North America', 'YVR': 'North America',
  'JFK': 'North America', 'LAX': 'North America', 'ORD': 'North America',
  'ATL': 'North America', 'DFW': 'North America', 'DEN': 'North America',
  'SFO': 'North America', 'SEA': 'North America', 'LAS': 'North America',
  'MIA': 'North America', 'MCO': 'North America', 'PHX': 'North America',
  'IAH': 'North America', 'BOS': 'North America', 'MSP': 'North America',
  'DTW': 'North America', 'PHL': 'North America', 'LGA': 'North America',
  'EWR': 'North America', 'CLT': 'North America', 'SAN': 'North America',
  
  // Europe
  'LHR': 'Europe', 'CDG': 'Europe', 'AMS': 'Europe', 'FRA': 'Europe',
  'MAD': 'Europe', 'BCN': 'Europe', 'FCO': 'Europe', 'MXP': 'Europe',
  'MUC': 'Europe', 'LGW': 'Europe', 'ORY': 'Europe', 'ZRH': 'Europe',
  'VIE': 'Europe', 'CPH': 'Europe', 'ARN': 'Europe', 'OSL': 'Europe',
  'BRU': 'Europe', 'DUB': 'Europe', 'LIS': 'Europe', 'ATH': 'Europe',
  
  // Asia
  'HKG': 'Asia', 'SIN': 'Asia', 'NRT': 'Asia', 'ICN': 'Asia',
  'PVG': 'Asia', 'PEK': 'Asia', 'BKK': 'Asia', 'KUL': 'Asia',
  'DEL': 'Asia', 'BOM': 'Asia', 'DXB': 'Asia', 'DOH': 'Asia',
  'HND': 'Asia', 'CAN': 'Asia', 'TPE': 'Asia', 'MNL': 'Asia',
  
  // South America
  'GRU': 'South America', 'GIG': 'South America', 'EZE': 'South America',
  'BOG': 'South America', 'LIM': 'South America', 'SCL': 'South America',
  
  // Africa
  'JNB': 'Africa', 'CAI': 'Africa', 'CPT': 'Africa', 'LOS': 'Africa',
  'NBO': 'Africa', 'ADD': 'Africa',
  
  // Oceania
  'SYD': 'Oceania', 'MEL': 'Oceania', 'AKL': 'Oceania', 'BNE': 'Oceania'
};

function getContinent(airportCode) {
  return airportContinents[airportCode] || 'Other';
}

function getContinentColor(continent) {
  const colors = {
    'North America': '#28a745',
    'Europe': '#007bff',
    'Asia': '#fd7e14',
    'South America': '#6f42c1',
    'Africa': '#dc3545',
    'Oceania': '#17a2b8',
    'Other': '#6c757d'
  };
  return colors[continent] || '#6c757d';
}