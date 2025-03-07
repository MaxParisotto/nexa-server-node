class LogViewer {
    constructor(containerId) {
        this.container = document.getElementById(containerId);
        this.logTypes = ['error', 'api', 'performance', 'security'];
        this.currentType = 'error';
        this.pageSize = 50;
        this.currentPage = 1;
        this.filters = {
            level: 'all',
            service: 'all',
            search: ''
        };
        
        this.initialize();
    }

    initialize() {
        this.render();
        this.attachEventListeners();
        this.loadLogs();
    }

    updateUI() {
        // Update active state of type selector buttons
        this.container.querySelectorAll('.log-type-selector button').forEach(btn => {
            const isActive = btn.dataset.type === this.currentType;
            btn.classList.toggle('active', isActive);
        });
    }

    render() {
        this.container.innerHTML = `
            <div class="log-viewer container mt-4 p-3 bg-light rounded shadow-sm">
                <div class="log-controls">
                    <button class="btn btn-primary me-2" onclick="window.logViewer.initializeLogs()">
                    Initialize Test Logs
                </button>
                <div class="log-type-selector d-flex gap-2">
                        Initialize Test Logs
                    </button>
                    <div class="log-type-selector">
                        ${this.logTypes.map(type => `
                            <button class="btn btn-outline-secondary ${type === this.currentType ? 'active' : ''}"
                                    data-type="${type}">
                                ${type.charAt(0).toUpperCase() + type.slice(1)} Logs
                            </button>
                        `).join('')}
                    </div>
                    <div class="log-filters mt-3">
                        <div class="mb-3">
                            <label for="levelFilter" class="form-label">Log Level:</label>
                            <select id="levelFilter" class="form-select">
                                <option value="all">All Levels</option>
                                <option value="error">Error</option>
                                <option value="warn">Warning</option>
                                <option value="info">Info</option>
                                <option value="debug">Debug</option>
                            </select>
                        </div>
                        <select id="serviceFilter">
                            <option value="all">All Services</option>
                        </select>
                        <div class="mb-3">
                        <label for="searchFilter" class="form-label">Search:</label>
                        <input type="text" id="searchFilter" class="form-control" placeholder="Search logs..." />
                    </div>
                    </div>
                </div>
                <div class="log-table-container">
                    <table class="log-table">
                        <thead>
                            <tr>
                                <th>Timestamp</th>
                                <th>Level</th>
                                <th>Service</th>
                                <th>Message</th>
                                <th>Metadata</th>
                            </tr>
                        </thead>
                        <tbody id="logTableBody">
                            <tr><td colspan="5">Loading logs...</td></tr>
                        </tbody>
                    </table>
                </div>
                <nav aria-label="Log pagination" class="mt-3">
                    <ul class="pagination justify-content-center">
                        <li class="page-item ${this.currentPage === 1 ? 'disabled' : ''}">
                            <button class="page-link" id="prevPage">Previous</button>
                        </li>
                        <li class="page-item disabled"><span class="page-link" id="pageInfo">Page 1</span></li>
                        <li class="page-item">
                            <button class="page-link" id="nextPage">Next</button>
                        </li>
                    </ul>
                </nav>
                <div class="log-stats">
                    <div id="logStats"></div>
                </div>
            </div>
        `;
    }

    attachEventListeners() {
        // Type selector
        this.container.querySelectorAll('.log-type-selector button').forEach(btn => {
            btn.addEventListener('click', () => {
                this.currentType = btn.dataset.type;
                this.currentPage = 1;
                this.loadLogs();
                this.updateUI();
            });
        });

        // Filters
        const levelFilter = document.getElementById('levelFilter');
        const searchFilter = document.getElementById('searchFilter');

        if (levelFilter) {
            levelFilter.addEventListener('change', (e) => {
                this.filters.level = e.target.value;
                this.loadLogs();
            });
        }

        if (searchFilter) {
            searchFilter.addEventListener('input', (e) => {
                this.filters.search = e.target.value;
                this.debounce(() => this.loadLogs(), 300);
            });
        }

        // Pagination
        const prevPage = document.getElementById('prevPage');
        const nextPage = document.getElementById('nextPage');

        if (prevPage) {
            prevPage.addEventListener('click', () => {
                if (this.currentPage > 1) {
                    this.currentPage--;
                    this.loadLogs();
                }
            });
        }

        if (nextPage) {
            nextPage.addEventListener('click', () => {
                this.currentPage++;
                this.loadLogs();
            });
        }
    }

    async loadLogs() {
        try {
            const response = await fetch(`/api/logs/${this.currentType}?` + new URLSearchParams({
                page: this.currentPage,
                pageSize: this.pageSize,
                level: this.filters.level,
                service: this.filters.service,
                search: this.filters.search
            }));

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const data = await response.json();
            this.renderLogs(data.logs);
            this.updateStats(data.stats);
            this.updatePagination(data.total);
        } catch (error) {
            console.error('Error loading logs:', error);
            const tbody = document.getElementById('logTableBody');
            if (tbody) {
                tbody.innerHTML = '<tr><td colspan="5">Error loading logs</td></tr>';
            }
        }
    }

    async initializeLogs() {
        try {
            const response = await fetch('/api/logs/init');
            if (!response.ok) {
                throw new Error('Failed to initialize logs');
            }
            await this.loadLogs(); // Reload logs after initialization
        } catch (error) {
            console.error('Error initializing logs:', error);
            alert('Failed to initialize logs');
        }
    }

    renderLogs(logs) {
        const tbody = document.getElementById('logTableBody');
        if (!tbody) return;

        tbody.innerHTML = logs.map(log => `
            <tr class="log-entry ${log.level.toLowerCase()}">
                <td>${this.formatDate(log.timestamp)}</td>
                <td>${log.level}</td>
                <td>${log.service}</td>
                <td>${this.escapeHtml(log.message)}</td>
                <td>
                    <button class="btn-small" onclick='${this.toggleMetadata.bind(this, log.metadata)}'>
                        View
                    </button>
                </td>
            </tr>
        `).join('');
    }

    updateStats(stats) {
        const statsElement = document.getElementById('logStats');
        if (!statsElement) return;

        statsElement.innerHTML = `
            <div>Total Logs: ${stats.total}</div>
            <div>Error Rate: ${stats.errorRate}%</div>
            <div>Avg Response Time: ${stats.avgResponseTime}ms</div>
        `;
    }

    updatePagination(total) {
        const pageInfo = document.getElementById('pageInfo');
        const prevButton = document.getElementById('prevPage');
        const nextButton = document.getElementById('nextPage');

        if (!pageInfo || !prevButton || !nextButton) return;

        const totalPages = Math.ceil(total / this.pageSize);
        pageInfo.textContent = `Page ${this.currentPage} of ${totalPages}`;
        prevButton.disabled = this.currentPage === 1;
        nextButton.disabled = this.currentPage === totalPages;
    }

            toggleMetadata(metadata) {
                const modal = document.createElement('div');
                modal.className = 'modal';
                modal.innerHTML = `
                    <div class="modal-dialog">
                        <div class="modal-content">
                            <div class="modal-header">
                                <h5 class="modal-title">Log Metadata</h5>
                                <button type="button" class="btn-close" onclick="this.closest('.modal').remove()"></button>
                            </div>
                            <div class="modal-body">
                                <pre>${JSON.stringify(metadata, null, 2)}</pre>
                            </div>
                        </div>
                    </div>
                `;
                document.body.appendChild(modal);
            }

    formatDate(timestamp) {
        return new Date(timestamp).toLocaleString();
    }

    escapeHtml(str) {
        const div = document.createElement('div');
        div.textContent = str;
        return div.innerHTML;
    }

    debounce(func, wait) {
        if (this.debounceTimer) clearTimeout(this.debounceTimer);
        this.debounceTimer = setTimeout(func, wait);
    }
}

// Initialize log viewer when document is ready
document.addEventListener('DOMContentLoaded', () => {
    if (document.getElementById('logViewerContainer')) {
        window.logViewer = new LogViewer('logViewerContainer');
    }
});
