document.addEventListener('DOMContentLoaded', function() {
  const systemMetricsContainer = document.getElementById('system-metrics');
  const logListContainer = document.getElementById('log-list');
  
  // Chart instances
  let cpuChart, memoryChart, networkChart;
  
  // Initialize charts
  initializeCharts();
  
  // Make refresh function globally available
  window.refreshMetrics = fetchMetrics;

  function initializeCharts() {
    if (typeof Chart === 'undefined') return;
    
    // CPU Usage Chart
    const cpuCtx = document.getElementById('cpu-chart').getContext('2d');
    cpuChart = new Chart(cpuCtx, {
      type: 'line',
      data: {
        labels: [],
        datasets: [{
          label: 'CPU Usage (%)',
          data: [],
          backgroundColor: 'rgba(54, 162, 235, 0.2)',
          borderColor: 'rgba(54, 162, 235, 1)',
          borderWidth: 1
        }]
      },
      options: {
        scales: {
          y: {
            beginAtZero: true,
            max: 100
          }
        }
      }
    });

    // Memory Usage Chart
    const memoryCtx = document.getElementById('memory-chart').getContext('2d');
    memoryChart = new Chart(memoryCtx, {
      type: 'bar',
      data: {
        labels: ['Used', 'Free'],
        datasets: [{
          label: 'Memory (MB)',
          data: [0, 0],
          backgroundColor: [
            'rgba(255, 99, 132, 0.2)',
            'rgba(75, 192, 192, 0.2)'
          ],
          borderColor: [
            'rgba(255, 99, 132, 1)',
            'rgba(75, 192, 192, 1)'
          ],
          borderWidth: 1
        }]
      },
      options: {
        scales: {
          y: {
            beginAtZero: true
          }
        }
      }
    });

    // Network Traffic Chart
    const networkCtx = document.getElementById('network-chart').getContext('2d');
    networkChart = new Chart(networkCtx, {
      type: 'line',
      data: {
        labels: [],
        datasets: [
          {
            label: 'Incoming (KB/s)',
            data: [],
            backgroundColor: 'rgba(255, 206, 86, 0.2)',
            borderColor: 'rgba(255, 206, 86, 1)',
            borderWidth: 1
          },
          {
            label: 'Outgoing (KB/s)',
            data: [],
            backgroundColor: 'rgba(153, 102, 255, 0.2)',
            borderColor: 'rgba(153, 102, 255, 1)',
            borderWidth: 1
          }
        ]
      },
      options: {
        scales: {
          y: {
            beginAtZero: true
          }
        }
      }
    });
  }

  function fetchMetrics() {
    fetch('/api/metrics')
      .then(response => response.json())
      .then(data => {
        if (data.success) {
          updateMetrics(data.metrics);
          updateCharts(data.metrics);
          
          if (document.getElementById('logs-content').classList.contains('expanded')) {
            fetchLogs();
          }
        }
      })
      .catch(error => {
        console.error('Error fetching metrics:', error);
        systemMetricsContainer.innerHTML = '<p class="error">Error loading metrics</p>';
      });
      
    socket.emit('get_metrics');
  }

  function updateMetrics(metrics) {
    // Update detailed metrics display
    systemMetricsContainer.innerHTML = `
      <div class="metrics-grid">
        <div class="metric-card">
          <h3>CPU Usage</h3>
          <div class="chart-container">
            <canvas id="cpu-chart"></canvas>
          </div>
          <p>Current: ${metrics.cpu || 0}%</p>
          <p>Load Average: ${metrics.loadAverage ? metrics.loadAverage.join(', ') : 'N/A'}</p>
        </div>
        
        <div class="metric-card">
          <h3>Memory Usage</h3>
          <div class="chart-container">
            <canvas id="memory-chart"></canvas>
          </div>
          <p>Used: ${metrics.memory ? (metrics.memory.used / 1024 / 1024).toFixed(2) : 0} MB</p>
          <p>Free: ${metrics.memory ? (metrics.memory.free / 1024 / 1024).toFixed(2) : 0} MB</p>
        </div>
        
        <div class="metric-card">
          <h3>Network</h3>
          <div class="chart-container">
            <canvas id="network-chart"></canvas>
          </div>
          <div class="network-details">
            ${metrics.networkInterfaces ? Object.entries(metrics.networkInterfaces).map(([name, iface]) => `
              <div class="network-interface">
                <h4>${name}</h4>
                <p>RX: ${(iface[0]?.rx_bytes || 0 / 1024).toFixed(2)} KB/s</p>
                <p>TX: ${(iface[0]?.tx_bytes || 0 / 1024).toFixed(2)} KB/s</p>
              </div>
            `).join('') : '<p>No network interfaces found</p>'}
          </div>
        </div>
        
        <div class="metric-card">
          <h3>Disk Usage</h3>
          <div class="disk-usage">
            ${metrics.disks ? metrics.disks.map(disk => `
              <div class="disk">
                <h4>${disk.mount}</h4>
                <p>Used: ${(disk.used / 1024 / 1024 / 1024).toFixed(2)} GB</p>
                <p>Free: ${(disk.free / 1024 / 1024 / 1024).toFixed(2)} GB</p>
                <progress value="${disk.used}" max="${disk.size}"></progress>
              </div>
            `).join('') : '<p>No disk information available</p>'}
          </div>
        </div>
        
        <div class="metric-card">
          <h3>System Info</h3>
          <p>Hostname: ${metrics.hostname || 'N/A'}</p>
          <p>Platform: ${metrics.platform || 'N/A'}</p>
          <p>Uptime: ${formatUptime(metrics.uptime || 0)}</p>
        </div>
      </div>
    `;
    
    // Update summary metrics
    document.getElementById('cpu-usage').textContent = `${metrics.cpu}%`;
    document.getElementById('memory-usage').textContent = `${(metrics.memory.used / 1024 / 1024).toFixed(2)} MB`;
    document.getElementById('system-uptime').textContent = formatUptime(metrics.uptime);
  }

  function updateCharts(metrics) {
    if (!cpuChart || !memoryChart || !networkChart) return;
    
    // Update CPU chart
    const now = new Date().toLocaleTimeString();
    cpuChart.data.labels.push(now);
    cpuChart.data.datasets[0].data.push(metrics.cpu);
    if (cpuChart.data.labels.length > 20) {
      cpuChart.data.labels.shift();
      cpuChart.data.datasets[0].data.shift();
    }
    cpuChart.update();
    
    // Update Memory chart
    memoryChart.data.datasets[0].data = [
      metrics.memory.used / 1024 / 1024,
      metrics.memory.free / 1024 / 1024
    ];
    memoryChart.update();
    
    // Update Network chart
    const totalIn = Object.values(metrics.networkInterfaces).reduce((sum, iface) => 
      sum + iface.reduce((s, i) => s + (i.rx_bytes || 0), 0), 0);
    const totalOut = Object.values(metrics.networkInterfaces).reduce((sum, iface) => 
      sum + iface.reduce((s, i) => s + (i.tx_bytes || 0), 0), 0);
    
    networkChart.data.labels.push(now);
    networkChart.data.datasets[0].data.push(totalIn / 1024);
    networkChart.data.datasets[1].data.push(totalOut / 1024);
    if (networkChart.data.labels.length > 20) {
      networkChart.data.labels.shift();
      networkChart.data.datasets[0].data.shift();
      networkChart.data.datasets[1].data.shift();
    }
    networkChart.update();
  }

  function formatUptime(seconds) {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    return `${hours}h ${minutes}m`;
  }

  // Initial fetch
  fetchMetrics();
  
  // Update metrics every 2 seconds
  setInterval(fetchMetrics, 2000);
});
