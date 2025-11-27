const database = require('./database');

function generateAnalytics(timeFilter = 'all') {
  let allFlights = database.loadAllFlightRecords();
  
  // Apply time filter
  const now = new Date();
  let cutoffDate;
  
  switch(timeFilter) {
    case '24h':
      cutoffDate = new Date(now - 24 * 60 * 60 * 1000);
      break;
    case '7d':
      cutoffDate = new Date(now - 7 * 24 * 60 * 60 * 1000);
      break;
    case '30d':
      cutoffDate = new Date(now - 30 * 24 * 60 * 60 * 1000);
      break;
    case '1y':
      cutoffDate = new Date(now - 365 * 24 * 60 * 60 * 1000);
      break;
    case 'all':
    default:
      cutoffDate = null;
      break;
  }
  
  if (cutoffDate) {
    allFlights = allFlights.filter(f => new Date(f.timestamp) >= cutoffDate);
  }
  
  if (!allFlights || allFlights.length === 0) {
    return {
      totalFlights: 0,
      delayedFlights: 0,
      averageDelay: 0,
      onTimePercentage: 100,
      statusDistribution: { onTime: 0, delayed: 0, cancelled: 0, active: 0 },
      airlineDelays: {},
      delayTrends: [],
      hourlyDistribution: {},
      topDestinations: {},
      recentDelays: []
    };
  }

  const totalFlights = allFlights.length;
  const delayedFlights = allFlights.filter(f => f.delay > 0);
  const onTimeFlights = totalFlights - delayedFlights.length;
  
  // Average delay
  const totalDelay = delayedFlights.reduce((sum, f) => sum + f.delay, 0);
  const averageDelay = delayedFlights.length > 0 ? totalDelay / delayedFlights.length : 0;
  
  // On-time percentage
  const onTimePercentage = (onTimeFlights / totalFlights) * 100;
  
  // Status distribution
  const statusDistribution = {
    onTime: 0,
    delayed: 0,
    cancelled: 0,
    active: 0
  };
  
  allFlights.forEach(flight => {
    if (flight.status === 'cancelled') statusDistribution.cancelled++;
    else if (flight.status === 'active') statusDistribution.active++;
    else if (flight.delay > 0) statusDistribution.delayed++;
    else statusDistribution.onTime++;
  });
  
  // Airline delays
  const airlineDelays = {};
  const airlineCounts = {};
  
  delayedFlights.forEach(flight => {
    if (!airlineDelays[flight.airline]) {
      airlineDelays[flight.airline] = 0;
      airlineCounts[flight.airline] = 0;
    }
    airlineDelays[flight.airline] += flight.delay;
    airlineCounts[flight.airline]++;
  });
  
  // Calculate average delay per airline
  Object.keys(airlineDelays).forEach(airline => {
    airlineDelays[airline] = Math.round(airlineDelays[airline] / airlineCounts[airline]);
  });
  
  // Sort by delay and get top 5
  const sortedAirlines = Object.entries(airlineDelays)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5);
  const topAirlineDelays = Object.fromEntries(sortedAirlines);
  
  // Delay trends (last 24 hours)
  const delayTrends = database.loadDelayTrends();
  
  // Hourly distribution
  const hourlyDistribution = {};
  allFlights.forEach(flight => {
    if (flight.scheduledTime) {
      const hour = new Date(flight.scheduledTime).getHours();
      hourlyDistribution[hour] = (hourlyDistribution[hour] || 0) + 1;
    }
  });
  
  // Top destinations
  const topDestinations = {};
  allFlights.forEach(flight => {
    const dest = flight.arrival;
    topDestinations[dest] = (topDestinations[dest] || 0) + 1;
  });
  
  // Sort and get top 5 destinations
  const sortedDestinations = Object.entries(topDestinations)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5);
  const topDests = Object.fromEntries(sortedDestinations);
  
  // Recent delays (last 20)
  const recentDelays = delayedFlights
    .filter(f => f.delay >= 15)
    .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
    .slice(0, 20)
    .map(f => ({
      flightNumber: f.flightNumber,
      airline: f.airline,
      departure: f.departure,
      arrival: f.arrival,
      delay: f.delay,
      timestamp: f.timestamp
    }));
  
  return {
    totalFlights,
    delayedFlights: delayedFlights.length,
    averageDelay: Math.round(averageDelay * 10) / 10,
    onTimePercentage: Math.round(onTimePercentage * 10) / 10,
    statusDistribution,
    airlineDelays: topAirlineDelays,
    delayTrends,
    hourlyDistribution,
    topDestinations: topDests,
    recentDelays
  };
}

module.exports = {
  generateAnalytics
};