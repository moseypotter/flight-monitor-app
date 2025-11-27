require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const cron = require('node-cron');
const flightService = require('./flightService');
const notificationService = require('./notificationService');
const database = require('./database');
const analyticsService = require('./analyticsService');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static('public'));

// Store active monitoring airports
let monitoredAirports = [];

// API Routes

// Get flights for a specific airport
app.get('/api/flights/:airportCode', async (req, res) => {
  try {
    const { airportCode } = req.params;
    const { type } = req.query; // NEW: Get type from query params
    const flightType = type || 'departures';
    
    console.log(`Fetching ${flightType} for airport: ${airportCode}`);
    
    const flights = await flightService.getFlights(airportCode, flightType);
    res.json({ success: true, flights });
  } catch (error) {
    console.error('Error fetching flights:', error.message);
    res.status(500).json({ 
      success: false, 
      error: error.message 
    });
  }
});

// Search airports by name or code
app.get('/api/airports/search', async (req, res) => {
  try {
    const { query } = req.query;
    const airports = await flightService.searchAirports(query);
    res.json({ success: true, airports });
  } catch (error) {
    console.error('Error searching airports:', error.message);
    res.status(500).json({ 
      success: false, 
      error: error.message 
    });
  }
});

// Add airport to monitoring list
app.post('/api/monitor/add', (req, res) => {
  try {
    const { airportCode, airportName } = req.body;
    
    if (!monitoredAirports.find(a => a.code === airportCode)) {
      monitoredAirports.push({ code: airportCode, name: airportName });
      database.saveMonitoredAirports(monitoredAirports);
      console.log(`Added ${airportCode} to monitoring`);
    }
    
    res.json({ success: true, airports: monitoredAirports });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Remove airport from monitoring list
app.post('/api/monitor/remove', (req, res) => {
  try {
    const { airportCode } = req.body;
    monitoredAirports = monitoredAirports.filter(a => a.code !== airportCode);
    database.saveMonitoredAirports(monitoredAirports);
    console.log(`Removed ${airportCode} from monitoring`);
    
    res.json({ success: true, airports: monitoredAirports });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Get list of monitored airports
app.get('/api/monitor/list', (req, res) => {
  res.json({ success: true, airports: monitoredAirports });
});

// Get analytics data
app.get('/api/analytics', (req, res) => {
  try {
    const timeFilter = req.query.timeFilter || 'all';
    const analytics = analyticsService.generateAnalytics(timeFilter);
    res.json({ success: true, analytics });
  } catch (error) {
    console.error('Error generating analytics:', error.message);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Background job to check for flight delays
const checkInterval = process.env.CHECK_INTERVAL_MINUTES || 15;
cron.schedule(`*/${checkInterval} * * * *`, async () => {
  console.log(`\n[${new Date().toLocaleString()}] Running scheduled flight check...`);
  
  if (monitoredAirports.length === 0) {
    console.log('No airports being monitored.');
    return;
  }

  for (const airport of monitoredAirports) {
    try {
      console.log(`Checking flights for ${airport.code}...`);
      const flights = await flightService.getFlights(airport.code);
      
      // Check for delays
      const delayedFlights = notificationService.checkForDelays(flights);
      
      if (delayedFlights.length > 0) {
        console.log(`Found ${delayedFlights.length} delayed flight(s) at ${airport.code}`);
        // In a real app, you'd send these to connected clients via WebSocket
        // For now, we just log them
        delayedFlights.forEach(flight => {
          console.log(`  - Flight ${flight.flight.iata}: ${flight.delayMinutes} min delay`);
        });
      }
      
      // Save flight data
      database.saveFlightData(airport.code, flights);
      
    } catch (error) {
      console.error(`Error checking ${airport.code}:`, error.message);
    }
  }
  
  console.log('Scheduled check completed.\n');
});

// Load saved monitored airports on startup
monitoredAirports = database.loadMonitoredAirports();
console.log(`Loaded ${monitoredAirports.length} monitored airport(s) from storage`);

// Start server
app.listen(PORT, () => {
  console.log(`\n✈️  Flight Monitor Server running on http://localhost:${PORT}`);
  console.log(`📋 Monitoring ${monitoredAirports.length} airport(s)`);
  console.log(`🔄 Checking flights every ${checkInterval} minutes\n`);
});