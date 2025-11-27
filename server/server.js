require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const cron = require('node-cron');
const flightService = require('./flightService');
const notificationService = require('./notificationService');
const database = require('./database');
const analyticsService = require('./analyticsService');
const smsService = require('./smsService');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static('public'));

// Initialize Twilio
smsService.initializeTwilio();

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

// Save user phone number for SMS notifications
app.post('/api/user/phone', (req, res) => {
  try {
    const { phoneNumber } = req.body;
    
    if (!phoneNumber) {
      return res.status(400).json({ success: false, error: 'Phone number required' });
    }
    
    // Basic phone validation
    const cleanPhone = phoneNumber.replace(/\D/g, '');
    if (cleanPhone.length < 10) {
      return res.status(400).json({ success: false, error: 'Invalid phone number format' });
    }
    
    database.saveUserPhone(phoneNumber);
    
    res.json({ success: true, message: 'Phone number saved successfully' });
  } catch (error) {
    console.error('Error saving phone:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Send test SMS
app.post('/api/user/test-sms', async (req, res) => {
  try {
    const { phoneNumber } = req.body;
    
    if (!phoneNumber) {
      return res.status(400).json({ success: false, error: 'Phone number required' });
    }
    
    const result = await smsService.sendSMS(
      phoneNumber, 
      '✈️ Test from Flight Monitor! You\'ll receive delay alerts at this number.'
    );
    
    res.json(result);
  } catch (error) {
    console.error('Error sending test SMS:', error);
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
        
        // Get all registered phone numbers
        const userPhones = database.getAllUserPhones();
        const phoneNumbers = userPhones.map(p => p.number);
        
        // Log each delayed flight
        delayedFlights.forEach(delayedFlight => {
          console.log(`  - Flight ${delayedFlight.flight.flightNumber}: ${delayedFlight.delayMinutes} min delay`);
        });
        
        // Send SMS to all registered users
        if (phoneNumbers.length > 0) {
          console.log(`📱 Sending SMS to ${phoneNumbers.length} user(s)...`);
          
          for (const delayedFlight of delayedFlights) {
            await smsService.sendDelayNotificationToAll(
              delayedFlight.flight,
              delayedFlight.delayMinutes,
              phoneNumbers
            );
          }
        } else {
          console.log('No phone numbers registered for SMS notifications.');
        }
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