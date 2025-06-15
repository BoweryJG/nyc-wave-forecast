export class InnovativeForecastUI {
    constructor() {
        this.container = null;
        this.forecastData = null;
        this.currentLocation = 'smithPoint';
        
        this.init();
    }

    init() {
        this.createUI();
        this.setupEventListeners();
    }

    createUI() {
        // Create main container
        const container = document.createElement('div');
        container.id = 'innovative-forecast';
        container.innerHTML = `
            <div class="forecast-header">
                <div class="location-switcher">
                    <button class="location-btn active" data-location="smithPoint">Smith Point</button>
                    <button class="location-btn" data-location="brick">Brick</button>
                </div>
                <div class="current-conditions">
                    <div class="condition-card">
                        <div class="condition-value" id="current-height">--</div>
                        <div class="condition-label">Wave Height</div>
                    </div>
                    <div class="condition-card">
                        <div class="condition-value" id="current-period">--</div>
                        <div class="condition-label">Period</div>
                    </div>
                    <div class="condition-card quality">
                        <div class="condition-value" id="current-quality">--</div>
                        <div class="condition-label">Conditions</div>
                    </div>
                </div>
            </div>
            
            <div class="forecast-timeline">
                <canvas id="wave-timeline"></canvas>
                <div class="timeline-labels"></div>
            </div>
            
            <div class="detailed-forecast">
                <div class="forecast-grid" id="forecast-grid">
                    <!-- Dynamic content -->
                </div>
            </div>
        `;
        
        document.getElementById('ui-overlay').appendChild(container);
        this.container = container;
        
        // Initialize canvas
        this.initializeWaveTimeline();
    }

    initializeWaveTimeline() {
        const canvas = document.getElementById('wave-timeline');
        const container = canvas.parentElement;
        canvas.width = container.offsetWidth;
        canvas.height = 120;
        
        this.canvas = canvas;
        this.ctx = canvas.getContext('2d');
    }

    updateForecast(forecastData) {
        this.forecastData = forecastData;
        this.updateCurrentConditions();
        this.drawWaveTimeline();
        this.updateDetailedForecast();
    }

    updateCurrentConditions() {
        if (!this.forecastData) return;
        
        const current = this.forecastData[this.currentLocation].current;
        
        document.getElementById('current-height').textContent = `${current.waveHeight.toFixed(1)}ft`;
        document.getElementById('current-period').textContent = `${current.wavePeriod}s`;
        
        const qualityElement = document.getElementById('current-quality');
        qualityElement.textContent = current.quality.rating.charAt(0).toUpperCase() + 
                                   current.quality.rating.slice(1);
        qualityElement.className = `condition-value quality-${current.quality.rating}`;
    }

    drawWaveTimeline() {
        if (!this.forecastData || !this.ctx) return;
        
        const ctx = this.ctx;
        const canvas = this.canvas;
        const forecast = this.forecastData[this.currentLocation].forecast;
        
        // Clear canvas
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        
        // Draw wave visualization
        const hours = Math.min(forecast.length, 48); // Show 48 hours
        const hourWidth = canvas.width / hours;
        const maxHeight = Math.max(...forecast.slice(0, hours).map(f => f.waveHeight));
        
        // Create gradient for water
        const gradient = ctx.createLinearGradient(0, 0, 0, canvas.height);
        gradient.addColorStop(0, 'rgba(0, 212, 212, 0.2)');
        gradient.addColorStop(1, 'rgba(0, 153, 204, 0.6)');
        
        // Draw wave curve
        ctx.beginPath();
        ctx.moveTo(0, canvas.height);
        
        forecast.slice(0, hours).forEach((hour, index) => {
            const x = index * hourWidth + hourWidth / 2;
            const height = (hour.waveHeight / maxHeight) * (canvas.height - 20);
            const y = canvas.height - height - 10;
            
            if (index === 0) {
                ctx.lineTo(x, y);
            } else {
                const prevX = (index - 1) * hourWidth + hourWidth / 2;
                const prevHeight = (forecast[index - 1].waveHeight / maxHeight) * (canvas.height - 20);
                const prevY = canvas.height - prevHeight - 10;
                
                const cp1x = prevX + hourWidth / 3;
                const cp1y = prevY;
                const cp2x = x - hourWidth / 3;
                const cp2y = y;
                
                ctx.bezierCurveTo(cp1x, cp1y, cp2x, cp2y, x, y);
            }
        });
        
        ctx.lineTo(canvas.width, canvas.height);
        ctx.closePath();
        
        // Fill wave
        ctx.fillStyle = gradient;
        ctx.fill();
        
        // Draw quality indicators
        forecast.slice(0, hours).forEach((hour, index) => {
            const x = index * hourWidth + hourWidth / 2;
            const height = (hour.waveHeight / maxHeight) * (canvas.height - 20);
            const y = canvas.height - height - 10;
            
            // Quality dot
            ctx.beginPath();
            ctx.arc(x, y, 3, 0, Math.PI * 2);
            
            switch(hour.quality.rating) {
                case 'excellent':
                    ctx.fillStyle = '#ffcc00';
                    break;
                case 'good':
                    ctx.fillStyle = '#00ff88';
                    break;
                case 'fair':
                    ctx.fillStyle = '#00aaff';
                    break;
                default:
                    ctx.fillStyle = '#666666';
            }
            
            ctx.fill();
        });
        
        // Add time labels
        this.updateTimelineLabels();
    }

    updateTimelineLabels() {
        const labelsContainer = this.container.querySelector('.timeline-labels');
        labelsContainer.innerHTML = '';
        
        const times = ['Now', '6h', '12h', '18h', '24h', '36h', '48h'];
        times.forEach((time, index) => {
            const label = document.createElement('div');
            label.className = 'timeline-label';
            label.textContent = time;
            label.style.left = `${(index / (times.length - 1)) * 100}%`;
            labelsContainer.appendChild(label);
        });
    }

    updateDetailedForecast() {
        if (!this.forecastData) return;
        
        const grid = document.getElementById('forecast-grid');
        grid.innerHTML = '';
        
        const forecast = this.forecastData[this.currentLocation].forecast;
        
        // Group by day
        for (let day = 0; day < 7; day++) {
            const dayStart = day * 24;
            if (dayStart >= forecast.length) break;
            
            const date = new Date();
            date.setDate(date.getDate() + day);
            
            const dayCard = document.createElement('div');
            dayCard.className = 'forecast-day-card';
            
            // Find best hour of the day
            let bestHour = null;
            let bestScore = -1;
            
            for (let h = dayStart; h < Math.min(dayStart + 24, forecast.length); h++) {
                const hour = forecast[h];
                const score = hour.waveHeight * (hour.quality.rating === 'excellent' ? 3 : 
                                                hour.quality.rating === 'good' ? 2 : 1);
                if (score > bestScore) {
                    bestScore = score;
                    bestHour = hour;
                }
            }
            
            dayCard.innerHTML = `
                <div class="day-header">
                    <div class="day-name">${date.toLocaleDateString('en-US', { weekday: 'short' })}</div>
                    <div class="day-date">${date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</div>
                </div>
                <div class="day-stats">
                    <div class="wave-range">${bestHour ? bestHour.waveHeight.toFixed(1) : '--'}ft</div>
                    <div class="quality-indicator ${bestHour ? bestHour.quality.rating : ''}">
                        ${bestHour ? bestHour.quality.rating : '--'}
                    </div>
                </div>
            `;
            
            grid.appendChild(dayCard);
        }
    }

    setupEventListeners() {
        // Location switcher
        this.container.querySelectorAll('.location-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const location = e.target.dataset.location;
                this.switchLocation(location);
            });
        });
        
        // Window resize
        window.addEventListener('resize', () => {
            this.initializeWaveTimeline();
            this.drawWaveTimeline();
        });
    }

    switchLocation(location) {
        this.currentLocation = location;
        
        // Update button states
        this.container.querySelectorAll('.location-btn').forEach(btn => {
            btn.classList.toggle('active', btn.dataset.location === location);
        });
        
        // Update display
        this.updateCurrentConditions();
        this.drawWaveTimeline();
        this.updateDetailedForecast();
        
        // Emit event for 3D scene
        window.dispatchEvent(new CustomEvent('locationChange', { detail: location }));
    }
}