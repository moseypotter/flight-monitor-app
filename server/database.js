const fs = require('fs');
const path = require('path');

const DATA_FILE = path.join(__dirname, '..', 'flights-data.json');

// Initialize data structure
let dataStore = {
  monitoredAirports: [],
  previousFlights: {},
  flightHistory: {}
};

// Load data from file on startup
function loadData() {
  try {
    if (fs.existsSync(DATA_FILE)) {
      const data = fs.readFileSync(DATA_FILE, 'utf8');
      dataStore = JSON.parse(data);
      console.log('Loaded existing data from file');
    }
  } catch (error) {
    console.error('Error loading data:', error.message);
  }
}

// Save data to file
function saveData() {
  try {
    fs.writeFileSync(DATA_FILE, JSON.stringify(dataStore, null, 2));
  } catch (error) {
    console.error('Error saving data:', error.message);
  }
}

// Monitored airports functions
function saveMonitoredAirports(airports) {
  dataStore.monitoredAirports = airports;
  saveData();
}

function loadMonitoredAirports() {
  return dataStore.monitoredAirports || [];
}

// Previous flights functions (for delay detection)
function savePreviousFlights(flights) {
  dataStore.previousFlights = flights;
  saveData();
}

function loadPreviousFlights() {
  return dataStore.previousFlights || {};
}

// Flight history functions (for analytics)
function saveFlightData(airportCode, flights) {
  if (!dataStore.flightHistory[airportCode]) {
    dataStore.flightHistory[airportCode] = [];
  }
  
  // Store detailed flight records
  if (!dataStore.flightRecords) {
    dataStore.flightRecords = [];
  }
  
  const timestamp = new Date().toISOString();
  
  flights.forEach(flight => {
    dataStore.flightRecords.push({
      timestamp,
      airportCode,
      flightNumber: flight.flightNumber,
      airline: flight.airline,
      departure: flight.departure.iata,
      arrival: flight.arrival.iata,
      scheduledTime: flight.departure.scheduledTime,
      delay: flight.departure.delay || 0,
      status: flight.status
    });
  });
  
  // Keep last 10,000 flight records (approximately 1 year of data)
  if (dataStore.flightRecords.length > 10000) {
    dataStore.flightRecords = dataStore.flightRecords.slice(-10000);
  }
  
  // Track delay trends
  if (!dataStore.delayTrends) {
    dataStore.delayTrends = [];
  }
  
  const delayedFlights = flights.filter(f => f.departure.delay > 0);
  if (delayedFlights.length > 0) {
    const avgDelay = delayedFlights.reduce((sum, f) => sum + f.departure.delay, 0) / delayedFlights.length;
    dataStore.delayTrends.push({
      timestamp,
      averageDelay: Math.round(avgDelay * 10) / 10
    });
  }
  
  // Keep last 365 trend points (1 year if checking daily)
  if (dataStore.delayTrends.length > 365) {
    dataStore.delayTrends = dataStore.delayTrends.slice(-365);
  }
  
  dataStore.flightHistory[airportCode].push({
    timestamp,
    flightCount: flights.length
  });
  
  // Keep only last 100 entries per airport
  if (dataStore.flightHistory[airportCode].length > 100) {
    dataStore.flightHistory[airportCode].shift();
  }
  
  saveData();
}

function loadAllFlightRecords() {
  return dataStore.flightRecords || [];
}

function loadDelayTrends() {
  return dataStore.delayTrends || [];
}

// Initialize on module load
loadData();

module.exports = {
  saveMonitoredAirports,
  loadMonitoredAirports,
  savePreviousFlights,
  loadPreviousFlights,
  saveFlightData,
  loadAllFlightRecords,
  loadDelayTrends
};