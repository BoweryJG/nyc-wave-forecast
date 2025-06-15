import { gsap } from 'gsap';

export class ForecastChart {
    constructor(scene, app) {
        this.scene = scene;
        this.app = app;
        this.container = document.getElementById('forecast-bars');
        this.bars = [];
        
        this.init();
    }

    init() {
        this.createDayBars();
    }

    createDayBars() {
        const days = 7;
        
        for (let i = 0; i < days; i++) {
            const date = new Date();
            date.setDate(date.getDate() + i);
            const dayName = date.toLocaleDateString('en-US', { weekday: 'short' });
            
            const dayElement = document.createElement('div');
            dayElement.className = 'forecast-day';
            
            const barElement = document.createElement('div');
            barElement.className = 'forecast-bar fair';
            barElement.style.height = '10px';
            
            const valueElement = document.createElement('div');
            valueElement.className = 'forecast-value';
            valueElement.textContent = '--';
            barElement.appendChild(valueElement);
            
            const labelElement = document.createElement('div');
            labelElement.className = 'forecast-label';
            labelElement.textContent = dayName;
            
            dayElement.appendChild(barElement);
            dayElement.appendChild(labelElement);
            
            this.bars.push({
                element: barElement,
                valueElement: valueElement,
                dayElement: dayElement
            });
            
            this.container.appendChild(dayElement);
        }
    }

    updateForecast(forecastData) {
        if (!forecastData) return;

        const dailyData = this.processDailyData(forecastData);
        
        dailyData.forEach((day, index) => {
            if (index >= this.bars.length) return;
            
            const bar = this.bars[index];
            const maxBarHeight = 100;
            const normalizedHeight = Math.min(day.maxWaveHeight / 10, 1) * maxBarHeight;
            
            bar.element.className = `forecast-bar ${day.bestQuality}`;
            
            gsap.to(bar.element, {
                height: `${normalizedHeight}px`,
                duration: 1.5,
                ease: "power2.out"
            });
            
            bar.valueElement.textContent = `${day.maxWaveHeight.toFixed(1)}ft`;
            
            if (day.bestQuality === 'excellent') {
                gsap.to(bar.element, {
                    boxShadow: '0 0 20px rgba(255, 204, 0, 0.6)',
                    duration: 1.5
                });
            }
        });
    }

    processDailyData(forecastData) {
        const dailyData = [];
        const forecast = forecastData.smithPoint.forecast;
        
        for (let day = 0; day < 7; day++) {
            const dayStart = day * 24;
            const dayEnd = (day + 1) * 24;
            
            let maxWaveHeight = 0;
            let bestQuality = 'poor';
            
            for (let hour = dayStart; hour < dayEnd && hour < forecast.length; hour++) {
                const hourData = forecast[hour];
                if (hourData.waveHeight > maxWaveHeight) {
                    maxWaveHeight = hourData.waveHeight;
                }
                
                const qualityRank = {
                    'excellent': 4,
                    'good': 3,
                    'fair': 2,
                    'poor': 1
                };
                
                if (qualityRank[hourData.quality.rating] > qualityRank[bestQuality]) {
                    bestQuality = hourData.quality.rating;
                }
            }
            
            dailyData.push({
                maxWaveHeight,
                bestQuality
            });
        }
        
        return dailyData;
    }

    update(elapsedTime) {
        // No 3D updates needed for HTML-based chart
    }
}