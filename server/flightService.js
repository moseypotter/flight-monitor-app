const axios = require('axios');

const API_KEY = process.env.FLIGHT_API_KEY;
const BASE_URL = process.env.FLIGHT_API_BASE_URL;

// Common airport codes for quick reference
const POPULAR_AIRPORTS = [
  { code: 'YYZ', name: 'Toronto Pearson International Airport', city: 'Toronto' },
  { code: 'YUL', name: 'Montreal-Trudeau International Airport', city: 'Montreal' },
  { code: 'YVR', name: 'Vancouver International Airport', city: 'Vancouver' },
  { code: 'JFK', name: 'John F. Kennedy International Airport', city: 'New York' },
  { code: 'LAX', name: 'Los Angeles International Airport', city: 'Los Angeles' },
  { code: 'ORD', name: "Chicago O'Hare International Airport", city: 'Chicago' },
  { code: 'LHR', name: 'London Heathrow Airport', city: 'London' },
  { code: 'CDG', name: 'Charles de Gaulle Airport', city: 'Paris' },
];

async function getFlights(airportCode) {
  try {
    if (!API_KEY || API_KEY === 'your_api_key_here') {
      throw new Error('Please set your FLIGHT_API_KEY in the .env file');
    }

    async function getFlights(airportCode, type = 'departures') {
  try {
    if (!API_KEY || API_KEY === 'your_api_key_here') {
      throw new Error('Please set your FLIGHT_API_KEY in the .env file');
    }

    // Set parameter based on type
    const params = {
      access_key: API_KEY,
      limit: 20
    };
    
    if (type === 'departures') {
      params.dep_iata = airportCode;
    } else {
      params.arr_iata = airportCode;
    }

    const response = await axios.get(`${BASE_URL}/flights`, { params });

    
    if (!response.data || !response.data.data) {
      throw new Error('Invalid API response');
    }

    const flights = response.data.data.map(flight => ({
      flightNumber: flight.flight?.iata || 'N/A',
      airline: flight.airline?.name || 'Unknown',
      departure: {
        airport: flight.departure?.airport || 'Unknown',
        iata: flight.departure?.iata || airportCode,
        scheduledTime: flight.departure?.scheduled || null,
        estimatedTime: flight.departure?.estimated || null,
        actualTime: flight.departure?.actual || null,
        delay: flight.departure?.delay || 0,
        terminal: flight.departure?.terminal || 'N/A',
        gate: flight.departure?.gate || 'N/A'
      },
      arrival: {
        airport: flight.arrival?.airport || 'Unknown',
        iata: flight.arrival?.iata || 'N/A',
        scheduledTime: flight.arrival?.scheduled || null,
        estimatedTime: flight.arrival?.estimated || null,
        actualTime: flight.arrival?.actual || null,
        terminal: flight.arrival?.terminal || 'N/A',
        gate: flight.arrival?.gate || 'N/A'
      },
      status: flight.flight_status || 'unknown',
      aircraft: flight.aircraft?.registration || 'N/A'
    }));

    return flights;
  } catch (error) {
    if (error.response?.status === 401) {
      throw new Error('Invalid API key. Please check your FLIGHT_API_KEY in .env file');
    }
    if (error.response?.status === 429) {
      throw new Error('API rate limit exceeded. Please try again later');
    }
    throw new Error(`Failed to fetch flights: ${error.message}`);
  }
}

async function searchAirports(query) {
  try {
    // For simplicity, search through popular airports
    // In production, you'd use the airports API endpoint
    const filtered = POPULAR_AIRPORTS.filter(airport =>
      airport.name.toLowerCase().includes(query.toLowerCase()) ||
      airport.code.toLowerCase().includes(query.toLowerCase()) ||
      airport.city.toLowerCase().includes(query.toLowerCase())
    );

    return filtered;
  } catch (error) {
    throw new Error(`Failed to search airports: ${error.message}`);
  }
}

function getPopularAirports() {
  return POPULAR_AIRPORTS;
}

module.exports = {
  getFlights,
  searchAirports,
  getPopularAirports
};