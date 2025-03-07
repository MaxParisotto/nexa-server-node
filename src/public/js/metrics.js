import Chart from 'https://cdn.jsdelivr.net/npm/chart.js@4.4.0/auto/+esm';

// Initialize socket connection when document is ready
let socket;
let networkChart, llmChart, systemChart;
const statusIndicator = document.querySelector('.status-indicator');
const statusText = document.querySelector('.status-text');
const loadingOverlay = document.querySelector('.loading-overlay');

// Anomaly detection configuration
const anomalyConfig = {
  network: {
    threshold: 2.5, // Standard deviations
    windowSize: 30, // Data points to analyze
    cooldown: 5000 // Milliseconds between alerts
  },
  llm: {
    threshold: 2.5,
    windowSize: 30,
    cooldown: 5000
  },
  system: {
    threshold: 2.5,
    windowSize: 30,
    cooldown: 5000
  }
};

// Anomaly detection state
const anomalyState = {
  network: {
    lastAlert: 0,
    dataBuffer: []
  },
  llm: {
    lastAlert: 0,
    dataBuffer: []
  },
  system: {
    lastAlert: 0,
    dataBuffer: []
  }
};

// Anomaly detection methods
function detectAnomalies(chartType, newValue) {
  const config = anomalyConfig[chartType];
  const state = anomalyState[chartType];
  
  // Add new value to buffer
  state.dataBuffer.push(newValue);
  if (state.dataBuffer.length > config.windowSize) {
    state.dataBuffer.shift();
  }
  
  // Calculate statistics
  const mean = state.dataBuffer.reduce((a, b) => a + b, 0) / state.dataBuffer.length;
  const variance = state.dataBuffer.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / state.dataBuffer.length;
  const stdDev = Math.sqrt(variance);
  
  // Check for anomaly
  const currentTime = Date.now();
  if (Math.abs(newValue - mean) > config.threshold * stdDev && 
      currentTime - state.lastAlert > config.cooldown) {
    state.lastAlert = currentTime;
    triggerAnomalyAlert(chartType, newValue, mean, stdDev);
  }
}

function triggerAnomalyAlert(chartType, value, mean, stdDev) {
  const alertMessage = `Anomaly detected in ${chartType} metrics:
    Current value: ${value.toFixed(2)}
    Mean: ${mean.toFixed(2)}
    Standard deviation: ${stdDev.toFixed(2)}`;
  
  // Add visual indicator to chart
  const chart = chartType === 'network' ? networkChart :
                chartType === 'llm' ? llmChart : systemChart;
  
  chart.data.datasets.push({
    label: 'Anomaly',
    data: Array(chart.data.labels.length).fill(null),
    pointRadius: chart.data.labels.map((_, i) => 
      i === chart.data.labels.length - 1 ? 5 : 0),
    pointBackgroundColor: '#ff0000',
    borderWidth: 0
  });
  
  // Add to log
  addLogEntry('warn', alertMessage);
  
  // Trigger notification
  showNotification(alertMessage);
}

function showNotification(message) {
  if (Notification.permission === 'granted') {
    new Notification('Metrics Anomaly Detected', {
      body: message,
      icon: '/img/warning.png'
    });
  } else if (Notification.permission !== 'denied') {
    Notification.requestPermission().then(permission => {
      if (permission === 'granted') {
        new Notification('Metrics Anomaly Detected', {
          body: message,
          icon: '/img/warning.png'
        });
      }
    });
  }
}

// Wait for DOM to be fully loaded
document.addEventListener('DOMContentLoaded', () => {
  // Initialize socket.io connection
  if (typeof io !== 'undefined') {
    socket = io();
    setupSocketListeners();
  } else {
    console.error('Socket.IO not loaded. Check if the script is included correctly.');
    statusText.textContent = 'Connection Error';
  }
  
  // Set up dashboard components
  setupDashboard();
});

function setupDashboard() {
  setupCharts();
  setupLogControls();
}

function setupSocketListeners() {
  socket.on('connect', () => {
    console.log('Socket connected');
    statusIndicator.classList.add('connected');
    statusText.textContent = 'Connected';
    loadingOverlay.style.display = 'none';
  });
  
  socket.on('disconnect', () => {
    console.log('Socket disconnected');
    statusIndicator.classList.remove('connected');
    statusText.textContent = 'Disconnected';
    loadingOverlay.style.display = 'flex';
  });
  
  socket.on('error', (error) => {
    console.error('Socket error:', error);
    statusIndicator.classList.remove('connected');
    statusText.textContent = 'Error';
    loadingOverlay.style.display = 'flex';
  });
  
  // Listen for data updates
  socket.on('metrics', updateMetrics);
  socket.on('routes', updateRoutes);
  socket.on('functions', updateFunctions);
  
  // Additional socket event listeners
  socket.on('log:stream', handleLogStream);
}

// Log streaming visualization
const logTableHeader = document.createElement('thead');
const logTableBody = document.createElement('tbody');
const logContainer = document.getElementById('log-stream');
const logTable = document.createElement('table');

// Configure table structure
logTable.className = 'log-table';
logTable.innerHTML = `
  <thead>
    <tr>
      <th class="sortable" data-column="timestamp">Timestamp</th>
      <th class="sortable" data-column="level">Level</th>
      <th class="sortable" data-column="module">Module</th>
      <th>Message</th>
      <th>Context</th>
    </tr>
  </thead>
`;
logTable.appendChild(logTableBody);
logContainer.innerHTML = '';
logContainer.appendChild(logTable);

// Log table state
let sortColumn = 'timestamp';
let sortDirection = 'desc';
// Removed duplicate maxLogLines declaration here
let logDataBuffer = [];

// Enhanced log processing
function processLogEntry(rawData) {
  try {
    const entry = JSON.parse(rawData);
    return {
      timestamp: entry.timestamp || Date.now(),
      level: entry.level || 'info',
      message: entry.message,
      module: entry.module,
      context: entry.context,
      source: entry.source
    };
  } catch (error) {
    return {
      timestamp: Date.now(),
      level: 'error',
      message: 'Invalid log format',
      context: { raw: rawData }
    };
  }
}

function createTableRow(entry) {
  const row = document.createElement('tr');
  row.className = `log-entry log-${entry.level}`;
  row.innerHTML = `
    <td>${new Date(entry.timestamp).toLocaleTimeString()}</td>
    <td style="color: ${logLevels[entry.level].color}">
      ${logLevels[entry.level].icon} ${entry.level.toUpperCase()}
    </td>
    <td>${entry.module || 'N/A'}</td>
    <td>${entry.message}</td>
    <td>${entry.context ? JSON.stringify(entry.context) : ''}</td>
  `;
  return row;
}

// Preserve existing log level configuration
const logLevels = {
  info: { color: '#2962ff', icon: 'ℹ️' },
  warn: { color: '#ffa726', icon: '⚠️' },
  error: { color: '#d50000', icon: '⛔' },
  debug: { color: '#9e9e9e', icon: '🐛' }
};

// Enhanced log filtering and management
const logFilters = {
  levels: new Set(['info', 'warn', 'error', 'debug']),
  searchTerm: ''
};

function addLogEntry(level, message) {
  const entry = {
    timestamp: Date.now(),
    level,
    message,
    module: message.match(/\[(.*?)\]/)?.[1] || 'global',
    context: null
  };

  // Add to buffer and table
  logDataBuffer.push(entry);
  const row = createTableRow(entry);
  
  // Buffer management
  if (logDataBuffer.length > logConfig.maxLines) {
    logDataBuffer.shift();
    logTableBody.removeChild(logTableBody.firstElementChild);
  }

  logTableBody.appendChild(row);
  applyLogFilters();

  // Preserve existing auto-scroll functionality
  if (logConfig.autoScroll) {
    logContainer.scrollTop = logContainer.scrollHeight;
  }
}

function applyLogFilters() {
  const entries = logContainer.querySelectorAll('.log-entry');
  entries.forEach(entry => {
    const level = entry.dataset.level;
    const message = entry.dataset.message;
    const matchesLevel = logFilters.levels.has(level);
    const matchesSearch = logFilters.searchTerm === '' || 
                          message.includes(logFilters.searchTerm.toLowerCase());
    
    entry.style.display = (matchesLevel && matchesSearch) ? 'block' : 'none';
  });
}

function setupLogControls() {
  // Level filter checkboxes
  const levelFilters = document.querySelectorAll('.log-level-filter');
  levelFilters.forEach(filter => {
    filter.addEventListener('change', (e) => {
      const level = e.target.value;
      if (e.target.checked) {
        logFilters.levels.add(level);
      } else {
        logFilters.levels.delete(level);
      }
      applyLogFilters();
    });
  });

  // Search input
  const searchInput = document.getElementById('log-search');
  searchInput.addEventListener('input', (e) => {
    logFilters.searchTerm = e.target.value.trim();
    applyLogFilters();
  });

  // Export logs
  const exportBtn = document.getElementById('export-logs');
  exportBtn.addEventListener('click', () => {
    const logs = [];
    logContainer.querySelectorAll('.log-entry').forEach(entry => {
      if (entry.style.display !== 'none') {
        logs.push({
          timestamp: entry.querySelector('.log-timestamp').textContent,
          level: entry.dataset.level,
          message: entry.querySelector('.log-message').textContent
        });
      }
    });

    const blob = new Blob([JSON.stringify(logs, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.download = `logs-${new Date().toISOString()}.json`;
    link.href = url;
    link.click();
  });
}

// Chart instances

// DOM Elements
const statsGrid = document.getElementById('metrics-stats');

// Enhanced chart configurations
const chartConfig = {
  responsive: true,
  maintainAspectRatio: false,
  animation: {
    duration: 300,
    easing: 'easeInOutQuad'
  },
  plugins: {
    legend: {
      position: 'top',
      labels: {
        font: {
          size: 14
        }
      }
    },
    tooltip: {
      enabled: true,
      mode: 'index',
      intersect: false,
      callbacks: {
        label: function(context) {
          let label = context.dataset.label || '';
          if (label) {
            label += ': ';
          }
          if (context.parsed.y !== null) {
            label += context.parsed.y.toLocaleString();
          }
          return label;
        },
        afterLabel: function(context) {
          const dataset = context.dataset;
          const index = context.dataIndex;
          const total = dataset.data.reduce((a, b) => a + b, 0);
          const percentage = Math.round((dataset.data[index] / total) * 100);
          return `Percentage: ${percentage}%`;
        }
      },
      backgroundColor: 'rgba(0, 0, 0, 0.8)',
      titleFont: { size: 14 },
      bodyFont: { size: 12 },
      footerFont: { size: 12 },
      padding: 10,
      caretSize: 8,
      displayColors: true
    },
    annotation: {
      annotations: {
        line1: {
          type: 'line',
          mode: 'horizontal',
          scaleID: 'y',
          value: 0,
          borderColor: 'rgba(255, 99, 132, 0.5)',
          borderWidth: 2,
          borderDash: [5, 5],
          label: {
            enabled: true,
            content: 'Threshold',
            position: 'center'
          }
        }
      }
    },
    zoom: {
      zoom: {
        wheel: {
          enabled: true,
        },
        pinch: {
          enabled: true
        },
        mode: 'xy',
      },
      pan: {
        enabled: true,
        mode: 'xy',
      }
    }
  },
  scales: {
    x: {
      grid: {
        display: false
      },
      title: {
        display: true,
        text: 'Time'
      }
    },
    y: {
      beginAtZero: true,
      grid: {
        color: '#e0e0e0'
      },
      title: {
        display: true,
        text: 'Value'
      }
    }
  },
  interaction: {
    mode: 'nearest',
    axis: 'x',
    intersect: false
  }
};

// Log streaming configuration
const logConfig = {
  maxLines: 1000,
  autoScroll: true,
  timestampFormat: 'HH:mm:ss',
  levelColors: {
    info: '#2962ff',
    warn: '#ffa726',
    error: '#d50000',
    debug: '#9e9e9e'
  }
};

// Initialize charts
function initCharts() {
  const ctxNetwork = document.getElementById('network-chart').getContext('2d');
  const ctxLLM = document.getElementById('llm-chart').getContext('2d');
  const ctxSystem = document.getElementById('system-chart').getContext('2d');

  networkChart = new Chart(ctxNetwork, {
    type: 'line',
    data: {
      labels: [],
      datasets: [{
        label: 'Network Throughput (Mbps)',
        data: [],
        borderColor: '#2962ff',
        fill: false
      }]
    },
    options: chartConfig
  });

  llmChart = new Chart(ctxLLM, {
    type: 'bar',
    data: {
      labels: [],
      datasets: [{
        label: 'LLM Requests',
        data: [],
        backgroundColor: '#00c853',
        borderColor: '#00c853',
        borderWidth: 1
      }]
    },
    options: chartConfig
  });

  systemChart = new Chart(ctxSystem, {
    type: 'line',
    data: {
      labels: [],
      datasets: [
        {
          label: 'CPU Usage (%)',
          data: [],
          borderColor: '#d50000',
          fill: false
        },
        {
          label: 'Memory Usage (%)',
          data: [],
          borderColor: '#aa00ff',
          fill: false
        }
      ]
    },
    options: chartConfig
  });
}

// Update charts with new data
function updateChart(chart, label, data) {
  try {
    // Add data to appropriate buffer
    const bufferKey = chart === networkChart ? 'network' :
                      chart === llmChart ? 'llm' : 'system';
    dataBuffers[bufferKey].push(data);
    
    // Aggregate data if buffer is full
    const aggregatedValue = aggregateData(dataBuffers[bufferKey]);
    if (aggregatedValue !== null) {
      if (chart.data.labels.length > 100) {
        chart.data.labels.shift();
        chart.data.datasets.forEach(dataset => dataset.data.shift());
      }
      chart.data.labels.push(label);
      chart.data.datasets.forEach(dataset => dataset.data.push(aggregatedValue));
      
      // Throttle updates to improve performance
      if (!chart.updateThrottle) {
        chart.updateThrottle = setTimeout(() => {
          chart.update('none'); // 'none' prevents animation for better performance
          chart.updateThrottle = null;
        }, 100);
      }
    }
  } catch (error) {
    console.error('Error updating chart:', error);
    addLogEntry('error', `Chart update failed: ${error.message}`);
  }
}

// Reset all charts
function resetCharts() {
  [networkChart, llmChart, systemChart].forEach(chart => {
    if (chart) {
      chart.data.labels = [];
      chart.data.datasets.forEach(dataset => dataset.data = []);
      chart.update();
    }
  });
}

// Data aggregation buffers
const dataBuffers = {
  network: [],
  llm: [],
  system: []
};

// Aggregate data points for better performance
function aggregateData(buffer, maxPoints = 100) {
  if (buffer.length >= maxPoints) {
    const avg = buffer.reduce((sum, val) => sum + val, 0) / buffer.length;
    buffer.length = 0; // Clear buffer
    return avg;
  }
  return null;
}

// Handle log streaming
function handleLogStream(logData) {
  try {
    const { level, message } = JSON.parse(logData);
    if (logLevels[level]) {
      addLogEntry(level, message);
    }
  } catch (error) {
    console.error('Error processing log:', error);
    addLogEntry('error', 'Failed to process log entry');
  }
}

// Handle socket events
socket.on('connect', () => {
  statusIndicator.classList.add('connected');
  statusText.textContent = 'Connected';
  loadingOverlay.style.display = 'none';
  initCharts();
  
  // Clear buffers on reconnect
  Object.values(dataBuffers).forEach(buffer => buffer.length = 0);
});

socket.on('log:stream', (logData) => {
  try {
    const { level, message } = JSON.parse(logData);
    if (logLevels[level]) {
      addLogEntry(level, message);
    }
  } catch (error) {
    console.error('Error processing log:', error);
    addLogEntry('error', 'Failed to process log entry');
  }
});

socket.on('disconnect', () => {
  statusIndicator.classList.remove('connected');
  statusText.textContent = 'Disconnected';
  loadingOverlay.style.display = 'flex';
});

socket.on('metrics:network', (data) => {
  const timestamp = new Date().toLocaleTimeString();
  updateChart(networkChart, timestamp, data.throughput);
});

socket.on('metrics:llm', (data) => {
  const timestamp = new Date().toLocaleTimeString();
  updateChart(llmChart, timestamp, data.requests);
});

socket.on('metrics:system', (data) => {
  const timestamp = new Date().toLocaleTimeString();
  updateChart(systemChart, timestamp, data.cpu);
  updateChart(systemChart, timestamp, data.memory);
});

socket.on('error', (error) => {
  console.error('Socket error:', error);
  statusIndicator.classList.remove('connected');
  statusText.textContent = 'Error';
  loadingOverlay.style.display = 'flex';
});

  // Add export functionality
  function setupChartExports() {
    const exportContainer = document.createElement('div');
    exportContainer.className = 'export-container';
    exportContainer.innerHTML = `
      <button class="export-btn" data-chart="network" data-format="png">Export Network Chart (PNG)</button>
      <button class="export-btn" data-chart="network" data-format="csv">Export Network Data (CSV)</button>
      <button class="export-btn" data-chart="network" data-format="json">Export Network Data (JSON)</button>
      <button class="export-btn" data-chart="llm" data-format="png">Export LLM Chart (PNG)</button>
      <button class="export-btn" data-chart="llm" data-format="csv">Export LLM Data (CSV)</button>
      <button class="export-btn" data-chart="llm" data-format="json">Export LLM Data (JSON)</button>
      <button class="export-btn" data-chart="system" data-format="png">Export System Chart (PNG)</button>
      <button class="export-btn" data-chart="system" data-format="csv">Export System Data (CSV)</button>
      <button class="export-btn" data-chart="system" data-format="json">Export System Data (JSON)</button>
    `;
    
    document.querySelector('.dashboard-controls').appendChild(exportContainer);
    
    const exportButtons = document.querySelectorAll('.export-btn');
    exportButtons.forEach(btn => {
      btn.addEventListener('click', (e) => {
        const chartType = e.target.dataset.chart;
        const format = e.target.dataset.format;
        const chart = chartType === 'network' ? networkChart :
                      chartType === 'llm' ? llmChart : systemChart;
        
        if (format === 'png') {
          const link = document.createElement('a');
          link.download = `${chartType}-chart.png`;
          link.href = chart.toBase64Image();
          link.click();
        } else if (format === 'csv') {
          const csvContent = chart.data.labels.map((label, i) => {
            return chart.data.datasets.map(dataset => {
              return `${label},${dataset.label},${dataset.data[i]}`;
            }).join('\n');
          }).join('\n');
          
          const blob = new Blob([csvContent], { type: 'text/csv' });
          const url = URL.createObjectURL(blob);
          const link = document.createElement('a');
          link.download = `${chartType}-data.csv`;
          link.href = url;
          link.click();
        } else if (format === 'json') {
          const jsonContent = JSON.stringify({
            labels: chart.data.labels,
            datasets: chart.data.datasets
          }, null, 2);
          
          const blob = new Blob([jsonContent], { type: 'application/json' });
          const url = URL.createObjectURL(blob);
          const link = document.createElement('a');
          link.download = `${chartType}-data.json`;
          link.href = url;
          link.click();
        }
      });
    });
  }

// Add data point highlighting
function setupDataPointInteractions() {
  const charts = [networkChart, llmChart, systemChart];
  charts.forEach(chart => {
    chart.options.onHover = (event, elements) => {
      if (elements.length > 0) {
        event.native.target.style.cursor = 'pointer';
      } else {
        event.native.target.style.cursor = 'default';
      }
    };
    
    chart.options.onClick = (event, elements) => {
      if (elements.length > 0) {
        const element = elements[0];
        const dataset = chart.data.datasets[element.datasetIndex];
        const value = dataset.data[element.index];
        const label = chart.data.labels[element.index];
        
        const detailWindow = document.getElementById('data-detail');
        detailWindow.innerHTML = `
          <h3>Data Point Details</h3>
          <p><strong>Dataset:</strong> ${dataset.label}</p>
          <p><strong>Timestamp:</strong> ${label}</p>
          <p><strong>Value:</strong> ${value}</p>
        `;
        detailWindow.style.display = 'block';
      }
    };
  });
}

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
  initCharts();
  setupChartExports();
  setupDataPointInteractions();
  setupLogControls();
  loadingOverlay.style.display = 'flex';
});

// Initialize dashboard
initDashboard();

function initDashboard() {
  // Set up charts
  setupCharts();
  
  // Socket connection events
  socket.on('connect', () => {
    statusIndicator.classList.add('connected');
    statusText.textContent = 'Connected';
    loadingOverlay.style.display = 'none';
  });
  
  socket.on('disconnect', () => {
    statusIndicator.classList.remove('connected');
    statusText.textContent = 'Disconnected';
    loadingOverlay.style.display = 'flex';
  });
  
  // Listen for metrics updates
  socket.on('metrics', updateMetrics);
  
  // Listen for routes updates
  socket.on('routes', updateRoutes);
  
  // Listen for functions updates
  socket.on('functions', updateFunctions);
}

function setupCharts() {
  // Network chart
  const networkCtx = document.getElementById('networkChart').getContext('2d');
  networkChart = new Chart(networkCtx, {
    type: 'line',
    data: {
      labels: [],
      datasets: [{
        label: 'Network Throughput',
        data: [],
        borderColor: '#3e95cd',
        backgroundColor: 'rgba(62, 149, 205, 0.2)',
        borderWidth: 2,
        pointRadius: 2,
        fill: true,
        tension: 0.4
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      animation: {
        duration: 200,
        easing: 'linear'
      },
      interaction: {
        mode: 'index',
        intersect: false
      },
      plugins: {
        zoom: {
          limits: {
            x: {min: 'original', max: 'original'},
            y: {min: 'original', max: 'original'}
          },
          zoom: {
            wheel: {
              enabled: true,
              speed: 0.1,
              modifierKey: 'ctrl'
            },
            pinch: {
              enabled: true
            },
            drag: {
              enabled: true,
              backgroundColor: 'rgba(225,225,225,0.3)',
              borderColor: 'rgba(225,225,225)',
              borderWidth: 1,
              threshold: 10
            },
            mode: 'xy'
          },
          pan: {
            enabled: true,
            mode: 'xy',
            threshold: 10
          }
        },
        tooltip: {
          enabled: true,
          mode: 'index',
          intersect: false,
          callbacks: {
            label: function(context) {
              let label = context.dataset.label || '';
              if (label) {
                label += ': ';
              }
              if (context.parsed.y !== null) {
                label += context.parsed.y.toFixed(2) + ' Mbps';
              }
              return label;
            },
            afterLabel: function(context) {
              const dataset = context.dataset;
              const index = context.dataIndex;
              const total = dataset.data.reduce((a, b) => a + b, 0);
              const percentage = Math.round((dataset.data[index] / total) * 100);
              return `Percentage: ${percentage}%`;
            }
          },
          backgroundColor: 'rgba(0, 0, 0, 0.8)',
          titleFont: { size: 14 },
          bodyFont: { size: 12 },
          footerFont: { size: 12 },
          padding: 10,
          caretSize: 8,
          displayColors: true
        },
        export: {
          enabled: true,
          formatters: {
            csv: function(data) {
              return data.labels.map((label, i) => {
                return data.datasets.map(dataset => {
                  return `${label},${dataset.label},${dataset.data[i]}`;
                }).join('\n');
              }).join('\n');
            },
            json: function(data) {
              return JSON.stringify({
                labels: data.labels,
                datasets: data.datasets
              }, null, 2);
            }
          }
        }
      },
      scales: {
        x: {
          type: 'realtime',
          realtime: {
            duration: 60000,
            refresh: 1000,
            delay: 200,
            onRefresh: function(chart) {
              chart.data.datasets.forEach(function(dataset) {
                dataset.data.push({
                  x: Date.now(),
                  y: Math.random() * 100
                });
              });
            }
          },
          grid: {
            color: 'rgba(200, 200, 200, 0.1)'
          }
        },
        y: {
          beginAtZero: true,
          max: 100,
          title: {
            display: true,
            text: 'Mbps'
          },
          grid: {
            color: 'rgba(200, 200, 200, 0.1)'
          }
        }
      }
    }
  });
  
  // LLM chart
  const llmCtx = document.getElementById('llmChart').getContext('2d');
  llmChart = new Chart(llmCtx, {
    type: 'line',
    data: {
      labels: Array(10).fill(''),
      datasets: [{
        label: 'Latency (ms)',
        data: Array(10).fill(0),
        borderColor: '#2196F3',
        tension: 0.3,
        fill: false
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      scales: {
        y: {
          beginAtZero: true
        }
      }
    }
  });
  
  // System resources chart
  const systemCtx = document.getElementById('systemChart').getContext('2d');
  systemChart = new Chart(systemCtx, {
    type: 'bar',
    data: {
      labels: ['CPU', 'Memory'],
      datasets: [{
        label: 'Usage %',
        data: [0, 0],
        backgroundColor: ['#FF9800', '#9C27B0']
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      scales: {
        y: {
          beginAtZero: true,
          max: 100
        }
      }
    }
  });
}

function updateMetrics(data) {
  // Update stats grid
  const statsGrid = document.getElementById('metrics-stats');
  statsGrid.innerHTML = `
    <div class="stat-card">
      <h3>CPU Usage</h3>
      <p>${data.cpu.toFixed(1)}%</p>
    </div>
    <div class="stat-card">
      <h3>Memory Usage</h3>
      <p>${data.memory.toFixed(1)}%</p>
    </div>
    <div class="stat-card">
      <h3>Requests</h3>
      <p>${data.requests}/min</p>
    </div>
    <div class="stat-card">
      <h3>LLM Latency</h3>
      <p>${data.llmLatency.toFixed(0)} ms</p>
    </div>
    <div class="stat-card">
      <h3>API Calls</h3>
      <p>${data.apiCalls}</p>
    </div>
  `;
  
  // Update charts
  updateNetworkChart(data.requests);
  updateLLMChart(data.llmLatency);
  updateSystemChart(data.cpu, data.memory);
}

function updateNetworkChart(requests) {
  networkChart.data.datasets[0].data.shift();
  networkChart.data.datasets[0].data.push(requests);
  networkChart.update();
}

function updateLLMChart(latency) {
  llmChart.data.datasets[0].data.shift();
  llmChart.data.datasets[0].data.push(latency);
  llmChart.update();
}

function updateSystemChart(cpu, memory) {
  systemChart.data.datasets[0].data = [cpu, memory];
  systemChart.update();
}

function updateRoutes(routes) {
  try {
    console.log('Received routes:', routes);
    const routesContainer = document.getElementById('routes-visual');
    if (!routesContainer) {
      console.error('Routes container element not found');
      return;
    }
    
    // Create visual representation of routes
    let routesHTML = '<div class="routes-list">';
    
    if (Array.isArray(routes) && routes.length > 0) {
      routes.forEach(route => {
        if (route && route.method && route.path) {
          const methodClass = route.method.toLowerCase();
          routesHTML += `
            <div class="route-item">
              <span class="route-method ${methodClass}">${route.method}</span>
              <span class="route-path">${route.path}</span>
            </div>
          `;
        }
      });
    } else {
      routesHTML += '<div class="no-routes">No routes available</div>';
    }
    
    routesHTML += '</div>';
    routesContainer.innerHTML = routesHTML;
  } catch (error) {
    console.error('Error updating routes:', error);
  }
}

function updateFunctions(functions) {
  const functionsContainer = document.getElementById('functions-list');
  
  // Create visual representation of functions
  let functionsHTML = '<div class="functions-grid">';
  
  functions.forEach(func => {
    functionsHTML += `
      <div class="function-card">
        <h3>${func.name}</h3>
        <div class="function-stats">
          <div class="function-stat">
            <span>Calls:</span>
            <span>${func.calls}</span>
          </div>
          <div class="function-stat">
            <span>Avg Time:</span>
            <span>${func.avgTime.toFixed(1)} ms</span>
          </div>
        </div>
      </div>
    `;
  });
  
  functionsHTML += '</div>';
  functionsContainer.innerHTML = functionsHTML;
}
