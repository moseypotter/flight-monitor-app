// API Base URL
const API_URL = '/api';

// State
let monitoredAirports = [];
let currentAirport = null;
let notificationsEnabled = true;

// Popular airports (from backend)
const popularAirports = [
  { code: 'YYZ', name: 'Toronto Pearson International Airport', city: 'Toronto' },
  { code: 'YUL', name: 'Montreal-Trudeau International Airport', city: 'Montreal' },
  { code: 'YVR', name: 'Vancouver International Airport', city: 'Vancouver' },
  { code: 'JFK', name: 'John F. Kennedy International Airport', city: 'New York' },
  { code: 'LAX', name: 'Los Angeles International Airport', city: 'Los Angeles' },
  { code: 'ORD', name: "Chicago O'Hare International Airport", city: 'Chicago' }
];

// DOM Elements
const airportSearchInput = document.getElementById('airportSearch');
const searchBtn = document.getElementById('searchBtn');
const airportResultsDiv = document.getElementById('airportResults');
const popularAirportsDiv = document.getElementById('popularAirports');
const monitoredAirportsDiv = document.getElementById('monitoredAirports');
const flightsContainer = document.getElementById('flightsContainer');
const refreshBtn = document.getElementById('refreshBtn');
const notificationsCheckbox = document.getElementById('notificationsEnabled');
const testNotificationBtn = document.getElementById('testNotificationBtn');
const statusText = document.getElementById('statusText');
const lastUpdateSpan = document.getElementById('lastUpdate');

// Initialize app
async function init() {
  console.log('Initializing Flight Monitor...');
  
  // Request notification permission
  if ('Notification' in window && Notification.permission === 'default') {
    const permission = await Notification.requestPermission();
    console.log('Notification permission:', permission);
  }
  
  // Load monitored airports
  await loadMonitoredAirports();
  
  // Display popular airports
  displayPopularAirports();
  
  // Setup event listeners
  setupEventListeners();
  
  // Auto-refresh every 5 minutes
  setInterval(() => {
    if (currentAirport) {
      loadFlights(currentAirport);
    }
  }, 5 * 60 * 1000);
  
  updateStatus('Ready');
}

// Setup event listeners
function setupEventListeners() {
  searchBtn.addEventListener('click', searchAirports);
  airportSearchInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') searchAirports();
  });
  
  refreshBtn.addEventListener('click', () => {
    if (currentAirport) {
      loadFlights(currentAirport);
    }
  });
  
  notificationsCheckbox.addEventListener('change', (e) => {
    notificationsEnabled = e.target.checked;
    localStorage.setItem('notificationsEnabled', notificationsEnabled);
  });
  
  testNotificationBtn.addEventListener('click', testNotification);
  
  // Load notification preference
  const savedPref = localStorage.getItem('notificationsEnabled');
  if (savedPref !== null) {
    notificationsEnabled = savedPref === 'true';
    notificationsCheckbox.checked = notificationsEnabled;
  }
}

// Display popular airports
function displayPopularAirports() {
  popularAirportsDiv.innerHTML = popularAirports.map(airport => `
    <div class="airport-card" onclick="selectAirport('${airport.code}', '${airport.name}')">
      <div class="airport-code">${airport.code}</div>
      <div class="airport-name">${airport.name}</div>
    </div>
  `).join('');
}

// Search airports
async function searchAirports() {
  const query = airportSearchInput.value.trim();
  if (!query) return;
  
  updateStatus('Searching airports...');
  
  const results = popularAirports.filter(airport =>
    airport.name.toLowerCase().includes(query.toLowerCase()) ||
    airport.code.toLowerCase().includes(query.toLowerCase()) ||
    airport.city.toLowerCase().includes(query.toLowerCase())
  );
  
  if (results.length === 0) {
    airportResultsDiv.innerHTML = '<p class="empty-state">No airports found</p>';
  } else {
    airportResultsDiv.innerHTML = `
      <h3>Search Results</h3>
      <div class="airport-grid">
        ${results.map(airport => `
          <div class="airport-card" onclick="selectAirport('${airport.code}', '${airport.name}')">
            <div class="airport-code">${airport.code}</div>
            <div class="airport-name">${airport.name}</div>
          </div>
        `).join('')}
      </div>
    `;
  }
  
  updateStatus('Ready');
}

// Select airport and add to monitoring
async function selectAirport(code, name) {
  try {
    updateStatus(`Adding ${code} to monitoring...`);
    
    const response = await fetch(`${API_URL}/monitor/add`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ airportCode: code, airportName: name })
    });
    
    const data = await response.json();
    
    if (data.success) {
      monitoredAirports = data.airports;
      displayMonitoredAirports();
      currentAirport = code;
      await loadFlights(code);
      updateStatus(`Now monitoring ${code}`);
    }
  } catch (error) {
    console.error('Error adding airport:', error);
    updateStatus('Error adding airport');
  }
}

// Load monitored airports
async function loadMonitoredAirports() {
  try {
    const response = await fetch(`${API_URL}/monitor/list`);
    const data = await response.json();
    
    if (data.success) {
      monitoredAirports = data.airports;
      displayMonitoredAirports();
      
      if (monitoredAirports.length > 0) {
        currentAirport = monitoredAirports[0].code;
        await loadFlights(currentAirport);
      }
    }
  } catch (error) {
    console.error('Error loading monitored airports:', error);
  }
}

// Display monitored airports
function displayMonitoredAirports() {
  if (monitoredAirports.length === 0) {
    monitoredAirportsDiv.innerHTML = '<p class="empty-state">No airports being monitored yet. Select an airport above.</p>';
    return;
  }
  
  monitoredAirportsDiv.innerHTML = monitoredAirports.map(airport => `
    <div class="monitored-item">
      <span><strong>${airport.code}</strong> - ${airport.name}</span>
      <button class="remove-btn" onclick="removeAirport('${airport.code}')">Remove</button>
    </div>
  `).join('');
}

// Remove airport from monitoring
async function removeAirport(code) {
  try {
    updateStatus(`Removing ${code} from monitoring...`);
    
    const response = await fetch(`${API_URL}/monitor/remove`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ airportCode: code })
    });
    
    const data = await response.json();
    
    if (data.success) {
      monitoredAirports = data.airports;
      displayMonitoredAirports();
      
      if (currentAirport === code) {
        currentAirport = monitoredAirports.length > 0 ? monitoredAirports[0].code : null;
        if (currentAirport) {
          await loadFlights(currentAirport);
        } else {
          flightsContainer.innerHTML = '<p class="empty-state">Select an airport to view flights</p>';
        }
      }
      
      updateStatus('Airport removed');
    }
  } catch (error) {
    console.error('Error removing airport:', error);
    updateStatus('Error removing airport');
  }
}

// Load flights for airport
async function loadFlights(airportCode) {
  try {
    updateStatus(`Loading flights for ${airportCode}...`);
    flightsContainer.innerHTML = '<div class="loading"><div class="spinner"></div><p>Loading flights...</p></div>';
    
    const response = await fetch(`${API_URL}/flights/${airportCode}`);
    const data = await response.json();
    
    if (data.success && data.flights.length > 0) {
      displayFlights(data.flights);
      updateStatus('Flights loaded');
      lastUpdateSpan.textContent = `Last updated: ${new Date().toLocaleTimeString()}`;
      
      // Check for delays and notify
      checkForDelaysAndNotify(data.flights);
    } else {
      flightsContainer.innerHTML = '<p class="empty-state">No flights found for this airport</p>';
      updateStatus('No flights found');
    }
  } catch (error) {
    console.error('Error loading flights:', error);
    flightsContainer.innerHTML = '<p class="empty-state">Error loading flights. Please check your API key in the .env file.</p>';
    updateStatus('Error loading flights');
  }
}

// Current continent filter
let currentContinentFilter = 'all';
let allFlightsData = [];


// Display flights grouped by continent
function displayFlights(flights) {
  if (flights.length === 0) {
    flightsContainer.innerHTML = '<p class="empty-state">No flights found</p>';
    return;
  }
  
  // Group flights by continent
  const flightsByContinent = {};
  
  flights.forEach(flight => {
    const continent = getContinent(flight.arrival.iata);
    if (!flightsByContinent[continent]) {
      flightsByContinent[continent] = [];
    }
    flightsByContinent[continent].push(flight);
  });
  
  // Sort continents alphabetically
  const sortedContinents = Object.keys(flightsByContinent).sort();
  
  // Build HTML with continent sections
  const html = sortedContinents.map(continent => {
    const continentFlights = flightsByContinent[continent];
    const continentColor = getContinentColor(continent);
    
    return `
      <div class="continent-section">
        <div class="continent-header" style="background: ${continentColor};">
          <h3>${continent}</h3>
          <span class="continent-count">${continentFlights.length} flight${continentFlights.length !== 1 ? 's' : ''}</span>
        </div>
        <div class="continent-flights">
          ${continentFlights.map(flight => {
            const isDelayed = flight.departure.delay > 0;
            const statusClass = flight.status.toLowerCase().replace(' ', '-');
            
            return `
              <div class="flight-card ${isDelayed ? 'delayed' : ''}">
                <div style="min-width: 120px;">
                  <div class="flight-number">${flight.flightNumber}</div>
                  <div class="flight-airline">${flight.airline}</div>
                </div>
                
                <div class="flight-route">
                  <div class="flight-location">
                    <div class="airport-code-large">${flight.departure.iata}</div>
                    <div class="flight-time">${formatTime(flight.departure.scheduledTime)}</div>
                  </div>
                  
                  <div class="flight-arrow">→</div>
                  
                  <div class="flight-location">
                    <div class="airport-code-large">${flight.arrival.iata}</div>
                    <div class="flight-time">${formatTime(flight.arrival.scheduledTime)}</div>
                  </div>
                </div>
                
                <div class="flight-details-compact">
                  <span>Gate: ${flight.departure.gate}</span>
                  <span>Terminal: ${flight.departure.terminal}</span>
                </div>
                
                ${isDelayed ? `<span class="delay-badge">+${flight.departure.delay} min</span>` : ''}
                
                <span class="flight-status status-${statusClass}">${flight.status}</span>
              </div>
            `;
          }).join('')}
        </div>
      </div>
    `;
  }).join('');
  
  flightsContainer.innerHTML = html;
}

// Filter flights by continent
function filterByContinent(continent) {
  currentContinentFilter = continent;
  displayFlights(allFlightsData);
}

// Check for delays and send notifications
function checkForDelaysAndNotify(flights) {
  if (!notificationsEnabled || Notification.permission !== 'granted') return;
  
  flights.forEach(flight => {
    if (flight.departure.delay >= 15) {
      showNotification(
        `Flight ${flight.flightNumber} Delayed`,
        `${flight.airline} to ${flight.arrival.airport} is delayed by ${flight.departure.delay} minutes.`
      );
    }
  });
}

// Show browser notification
function showNotification(title, body) {
  if (Notification.permission === 'granted') {
    new Notification(title, {
      body,
      icon: '✈️',
      tag: 'flight-delay'
    });
  }
}

// Test notification
function testNotification() {
  if (Notification.permission === 'granted') {
    showNotification(
      'Test Notification',
      'If you see this, notifications are working correctly!'
    );
  } else if (Notification.permission === 'default') {
    Notification.requestPermission().then(permission => {
      if (permission === 'granted') {
        showNotification('Notifications Enabled', 'You will now receive flight delay alerts!');
      }
    });
  } else {
    alert('Notifications are blocked. Please enable them in your browser settings.');
  }
}

// Format time
function formatTime(timeString) {
  if (!timeString) return 'N/A';
  const date = new Date(timeString);
  return date.toLocaleTimeString('en-US', { 
    hour: '2-digit', 
    minute: '2-digit',
    hour12: true 
  });
}

// Update status message
function updateStatus(message) {
  statusText.textContent = message;
  console.log('Status:', message);
}

// Initialize app when page loads
window.addEventListener('load', init);
