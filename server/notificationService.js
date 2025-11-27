const database = require('./database');

// Minimum delay (in minutes) to trigger notification
const DELAY_THRESHOLD = 15;

function checkForDelays(currentFlights) {
  const delayedFlights = [];
  const previousFlights = database.loadPreviousFlights();

  currentFlights.forEach(flight => {
    const delayMinutes = flight.departure.delay || 0;
    
    // Check if flight is significantly delayed
    if (delayMinutes >= DELAY_THRESHOLD) {
      const flightKey = flight.flightNumber;
      const previousFlight = previousFlights[flightKey];
      
      // Only notify if:
      // 1. This is a new delay (not previously recorded), OR
      // 2. The delay has increased significantly (by 10+ minutes)
      if (!previousFlight || 
          (previousFlight.delay < DELAY_THRESHOLD && delayMinutes >= DELAY_THRESHOLD) ||
          (delayMinutes - previousFlight.delay >= 10)) {
        
        delayedFlights.push({
          flight,
          delayMinutes,
          previousDelay: previousFlight?.delay || 0,
          isNew: !previousFlight
        });
      }
    }
  });

  // Update database with current flight statuses
  const flightStatusMap = {};
  currentFlights.forEach(flight => {
    flightStatusMap[flight.flightNumber] = {
      delay: flight.departure.delay || 0,
      status: flight.status,
      lastChecked: new Date().toISOString()
    };
  });
  database.savePreviousFlights(flightStatusMap);

  return delayedFlights;
}

function formatDelayMessage(delayedFlight) {
  const { flight, delayMinutes, isNew } = delayedFlight;
  
  const status = isNew ? 'NEW DELAY' : 'DELAY UPDATE';
  const message = `${status}: Flight ${flight.flightNumber} (${flight.airline}) ` +
                  `to ${flight.arrival.airport} is delayed by ${delayMinutes} minutes. ` +
                  `New departure: ${flight.departure.estimatedTime || 'TBA'}`;
  
  return message;
}

module.exports = {
  checkForDelays,
  formatDelayMessage,
  DELAY_THRESHOLD
};