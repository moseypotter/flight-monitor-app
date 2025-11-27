// API Base URL
const API_URL = '/api';

// Chart instances
let statusChart, airlineChart, trendChart, hourlyChart, destinationChart;

// Current time filter
let currentTimeFilter = '24h';

// Initialize dashboard
async function init() {
    console.log('Initializing Analytics Dashboard...');
    
    // Setup time filter buttons
    setupTimeFilters();
    
    await loadAnalytics();
    updateStatus('Dashboard loaded');
}

// Setup time filter buttons
function setupTimeFilters() {
    const filterButtons = document.querySelectorAll('.filter-btn');
    
    filterButtons.forEach(button => {
        button.addEventListener('click', async () => {
            // Remove active class from all buttons
            filterButtons.forEach(btn => btn.classList.remove('active'));
            
            // Add active class to clicked button
            button.classList.add('active');
            
            // Update current filter
            currentTimeFilter = button.dataset.filter;
            
            // Reload analytics with new filter
            await loadAnalytics();
        });
    });
}

// Load analytics data
async function loadAnalytics() {
    try {
        updateStatus(`Loading analytics (${getFilterLabel()})...`);
        
        const response = await fetch(`${API_URL}/analytics?timeFilter=${currentTimeFilter}`);
        const data = await response.json();
        
        if (data.success) {
            updateSummaryStats(data.analytics);
            createCharts(data.analytics);
            displayDelaysTable(data.analytics.recentDelays);
            
            document.getElementById('lastUpdate').textContent = 
                `Last updated: ${new Date().toLocaleTimeString()}`;
        } else {
            updateStatus('No analytics data available yet');
        }
    } catch (error) {
        console.error('Error loading analytics:', error);
        updateStatus('Error loading analytics. Make sure to monitor some flights first!');
    }
}

// Update summary statistics
function updateSummaryStats(analytics) {
    document.getElementById('totalFlights').textContent = analytics.totalFlights || 0;
    document.getElementById('avgDelay').textContent = 
        analytics.averageDelay ? analytics.averageDelay.toFixed(1) : '0';
    document.getElementById('onTimePercent').textContent = 
        analytics.onTimePercentage ? `${analytics.onTimePercentage.toFixed(1)}%` : '0%';
    document.getElementById('delayedCount').textContent = analytics.delayedFlights || 0;
}

// Create all charts
function createCharts(analytics) {
    createStatusChart(analytics.statusDistribution);
    createAirlineChart(analytics.airlineDelays);
    createTrendChart(analytics.delayTrends);
    createHourlyChart(analytics.hourlyDistribution);
    createDestinationChart(analytics.topDestinations);
}

// Status Distribution Pie Chart
function createStatusChart(statusData) {
    const ctx = document.getElementById('statusChart').getContext('2d');
    
    if (statusChart) statusChart.destroy();
    
    statusChart = new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels: ['On Time', 'Delayed', 'Cancelled', 'Active'],
            datasets: [{
                data: [
                    statusData.onTime || 0,
                    statusData.delayed || 0,
                    statusData.cancelled || 0,
                    statusData.active || 0
                ],
                backgroundColor: [
                    '#28a745',
                    '#dc3545',
                    '#6c757d',
                    '#17a2b8'
                ]
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: true,
            plugins: {
                legend: {
                    position: 'bottom'
                }
            }
        }
    });
}

// Airline Delays Bar Chart
function createAirlineChart(airlineData) {
    const ctx = document.getElementById('airlineChart').getContext('2d');
    
    if (airlineChart) airlineChart.destroy();
    
    const airlines = Object.keys(airlineData).slice(0, 5);
    const delays = airlines.map(airline => airlineData[airline]);
    
    airlineChart = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: airlines,
            datasets: [{
                label: 'Average Delay (min)',
                data: delays,
                backgroundColor: '#667eea'
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: true,
            plugins: {
                legend: {
                    display: false
                }
            },
            scales: {
                y: {
                    beginAtZero: true
                }
            }
        }
    });
}

// Delay Trends Line Chart
function createTrendChart(trendData) {
    const ctx = document.getElementById('trendChart').getContext('2d');
    
    if (trendChart) trendChart.destroy();
    
    const labels = trendData.map(d => new Date(d.timestamp).toLocaleTimeString());
    const delays = trendData.map(d => d.averageDelay);
    
    trendChart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: labels,
            datasets: [{
                label: 'Average Delay (min)',
                data: delays,
                borderColor: '#667eea',
                backgroundColor: 'rgba(102, 126, 234, 0.1)',
                tension: 0.4,
                fill: true
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: true,
            plugins: {
                legend: {
                    display: false
                }
            },
            scales: {
                y: {
                    beginAtZero: true
                }
            }
        }
    });
}

// Hourly Distribution Bar Chart
function createHourlyChart(hourlyData) {
    const ctx = document.getElementById('hourlyChart').getContext('2d');
    
    if (hourlyChart) hourlyChart.destroy();
    
    const hours = Object.keys(hourlyData).sort();
    const counts = hours.map(hour => hourlyData[hour]);
    
    hourlyChart = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: hours.map(h => `${h}:00`),
            datasets: [{
                label: 'Number of Flights',
                data: counts,
                backgroundColor: '#764ba2'
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: true,
            plugins: {
                legend: {
                    display: false
                }
            },
            scales: {
                y: {
                    beginAtZero: true
                }
            }
        }
    });
}

// Top Destinations Horizontal Bar Chart
function createDestinationChart(destinationData) {
    const ctx = document.getElementById('destinationChart').getContext('2d');
    
    if (destinationChart) destinationChart.destroy();
    
    const destinations = Object.keys(destinationData).slice(0, 5);
    const counts = destinations.map(dest => destinationData[dest]);
    
    destinationChart = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: destinations,
            datasets: [{
                label: 'Number of Flights',
                data: counts,
                backgroundColor: '#28a745'
            }]
        },
        options: {
            indexAxis: 'y',
            responsive: true,
            maintainAspectRatio: true,
            plugins: {
                legend: {
                    display: false
                }
            },
            scales: {
                x: {
                    beginAtZero: true
                }
            }
        }
    });
}

// Display recent delays table
function displayDelaysTable(delays) {
    const container = document.getElementById('delaysTable');
    
    if (!delays || delays.length === 0) {
        container.innerHTML = '<p class="empty-state">No delayed flights recorded yet</p>';
        return;
    }
    
    const table = `
        <table class="delays-table">
            <thead>
                <tr>
                    <th>Flight</th>
                    <th>Airline</th>
                    <th>Route</th>
                    <th>Delay</th>
                    <th>Time</th>
                </tr>
            </thead>
            <tbody>
                ${delays.map(delay => {
                    const delayClass = delay.delay >= 60 ? 'delay-severe' : 
                                      delay.delay >= 30 ? 'delay-moderate' : 'delay-minor';
                    return `
                        <tr>
                            <td><strong>${delay.flightNumber}</strong></td>
                            <td>${delay.airline}</td>
                            <td>${delay.departure} → ${delay.arrival}</td>
                            <td class="${delayClass}">+${delay.delay} min</td>
                            <td>${new Date(delay.timestamp).toLocaleString()}</td>
                        </tr>
                    `;
                }).join('')}
            </tbody>
        </table>
    `;
    
    container.innerHTML = table;
}

// Update status message
function updateStatus(message) {
    document.getElementById('statusText').textContent = message;
    console.log('Status:', message);
}

// Get filter label
function getFilterLabel() {
    const labels = {
        '24h': 'Last 24 Hours',
        '7d': 'Last 7 Days',
        '30d': 'Last 30 Days',
        '1y': 'Last Year',
        'all': 'All Time'
    };
    return labels[currentTimeFilter] || 'All Time';
}

// Auto-refresh every 5 minutes
setInterval(loadAnalytics, 5 * 60 * 1000);

// Initialize on page load
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
} else {
    init();
}