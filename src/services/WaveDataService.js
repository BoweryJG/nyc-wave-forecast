import axios from 'axios';

export class WaveDataService {
    constructor() {
        this.openMeteoBaseUrl = 'https://marine-api.open-meteo.com/v1/marine';
        this.noaaStations = {
            smithPoint: '44025', // 30 NM South of Islip, NY
            brick: '44091'       // Barnegat, NJ (closest to Brick)
        };
    }

    async getWaveData(latitude, longitude) {
        try {
            const forecast = await this.getOpenMeteoForecast(latitude, longitude);
            const currentConditions = this.parseCurrentConditions(forecast);
            const forecastData = this.parseForecastData(forecast);
            
            return {
                location: { latitude, longitude },
                current: currentConditions,
                forecast: forecastData
            };
        } catch (error) {
            console.error('Error fetching wave data:', error);
            return this.getMockData();
        }
    }

    async getOpenMeteoForecast(latitude, longitude) {
        const params = new URLSearchParams({
            latitude: latitude.toString(),
            longitude: longitude.toString(),
            hourly: [
                'wave_height',
                'wave_period',
                'wave_direction',
                'wind_wave_height',
                'wind_wave_period',
                'wind_wave_direction',
                'swell_wave_height',
                'swell_wave_period',
                'swell_wave_direction'
            ].join(','),
            timezone: 'America/New_York'
        });

        const response = await axios.get(`${this.openMeteoBaseUrl}?${params}`);
        return response.data;
    }

    parseCurrentConditions(data) {
        const hourly = data.hourly || {};
        const currentIndex = this.getCurrentHourIndex(hourly.time);
        
        const waveHeight = hourly.wave_height?.[currentIndex] || 0;
        const wavePeriod = hourly.wave_period?.[currentIndex] || 0;
        const windSpeed = hourly.wind_wave_height?.[currentIndex] || 0;
        const windDirection = hourly.wind_wave_direction?.[currentIndex] || 0;
        
        const quality = this.calculateSurfQuality(waveHeight, wavePeriod, windSpeed, windDirection);
        
        return {
            waveHeight: this.metersToFeet(waveHeight),
            wavePeriod: wavePeriod,
            windSpeed: windSpeed * 1.94384, // m/s to knots
            windDirection: this.degreesToCompass(windDirection),
            swellHeight: this.metersToFeet(hourly.swell_wave_height?.[currentIndex] || 0),
            swellPeriod: hourly.swell_wave_period?.[currentIndex] || 0,
            swellDirection: this.degreesToCompass(hourly.swell_wave_direction?.[currentIndex] || 0),
            quality: quality,
            timestamp: new Date()
        };
    }

    parseForecastData(data) {
        const hourly = data.hourly || {};
        const forecast = [];
        
        for (let i = 0; i < hourly.time.length; i++) {
            const waveHeight = hourly.wave_height?.[i] || 0;
            const wavePeriod = hourly.wave_period?.[i] || 0;
            const windSpeed = hourly.wind_wave_height?.[i] || 0;
            const windDirection = hourly.wind_wave_direction?.[i] || 0;
            
            forecast.push({
                time: new Date(hourly.time[i]),
                waveHeight: this.metersToFeet(waveHeight),
                wavePeriod: wavePeriod,
                windSpeed: windSpeed * 1.94384,
                windDirection: this.degreesToCompass(windDirection),
                swellHeight: this.metersToFeet(hourly.swell_wave_height?.[i] || 0),
                swellPeriod: hourly.swell_wave_period?.[i] || 0,
                swellDirection: this.degreesToCompass(hourly.swell_wave_direction?.[i] || 0),
                quality: this.calculateSurfQuality(waveHeight, wavePeriod, windSpeed, windDirection)
            });
        }
        
        return forecast;
    }

    calculateSurfQuality(waveHeightMeters, period, windSpeed, windDirection) {
        const waveHeight = this.metersToFeet(waveHeightMeters);
        
        // Check if waves meet minimum threshold (2+ feet)
        if (waveHeight < 2) {
            return { rating: 'poor', score: 1, description: 'Too small' };
        }
        
        // Calculate base score from wave height and period
        let score = 0;
        
        // Wave height scoring (2-8 feet ideal range)
        if (waveHeight >= 2 && waveHeight <= 3) {
            score += 20;
        } else if (waveHeight > 3 && waveHeight <= 5) {
            score += 40;
        } else if (waveHeight > 5 && waveHeight <= 8) {
            score += 35;
        } else if (waveHeight > 8) {
            score += 25; // Getting too big for average surfer
        }
        
        // Period scoring (longer is generally better)
        if (period >= 8 && period <= 10) {
            score += 20;
        } else if (period > 10 && period <= 14) {
            score += 30;
        } else if (period > 14) {
            score += 25;
        } else {
            score += 10;
        }
        
        // Wind conditions (offshore/light is best)
        // For NYC: Offshore is generally W-NW (270-315 degrees)
        const isOffshore = (windDirection >= 270 && windDirection <= 315) || 
                          (windDirection >= 225 && windDirection <= 270);
        
        if (isOffshore && windSpeed < 10) {
            score += 30; // Perfect conditions
        } else if (isOffshore && windSpeed < 15) {
            score += 20; // Good conditions
        } else if (windSpeed < 10) {
            score += 15; // Light winds but not offshore
        } else if (windSpeed < 20) {
            score += 5; // Moderate winds
        } else {
            score -= 10; // Strong winds (bad)
        }
        
        // Convert score to rating
        let rating, description;
        if (score >= 80) {
            rating = 'excellent';
            description = 'Epic conditions! 🔥';
        } else if (score >= 60) {
            rating = 'good';
            description = 'Great surf day! 🏄';
        } else if (score >= 40) {
            rating = 'fair';
            description = 'Surfable conditions';
        } else {
            rating = 'poor';
            description = 'Not recommended';
        }
        
        return { rating, score, description };
    }

    getCurrentHourIndex(times) {
        if (!times || times.length === 0) return 0;
        
        const now = new Date();
        const nowTime = now.getTime();
        
        for (let i = 0; i < times.length; i++) {
            const time = new Date(times[i]).getTime();
            if (time >= nowTime) {
                return Math.max(0, i - 1);
            }
        }
        
        return times.length - 1;
    }

    metersToFeet(meters) {
        return Math.round(meters * 3.28084 * 10) / 10;
    }

    degreesToCompass(degrees) {
        const directions = ['N', 'NNE', 'NE', 'ENE', 'E', 'ESE', 'SE', 'SSE', 
                          'S', 'SSW', 'SW', 'WSW', 'W', 'WNW', 'NW', 'NNW'];
        const index = Math.round(degrees / 22.5) % 16;
        return directions[index];
    }

    getMockData() {
        // Fallback mock data for development/testing
        const currentTime = new Date();
        const forecast = [];
        
        for (let i = 0; i < 168; i++) { // 7 days of hourly data
            const time = new Date(currentTime.getTime() + i * 3600000);
            const baseHeight = 2 + Math.sin(i / 24) * 1.5 + Math.random() * 0.5;
            const period = 8 + Math.sin(i / 48) * 3 + Math.random() * 2;
            const windSpeed = 5 + Math.sin(i / 12) * 5 + Math.random() * 3;
            const windDirection = 270 + Math.sin(i / 36) * 45; // Mostly W-NW
            
            forecast.push({
                time,
                waveHeight: Math.round(baseHeight * 10) / 10,
                wavePeriod: Math.round(period * 10) / 10,
                windSpeed: Math.round(windSpeed * 10) / 10,
                windDirection: this.degreesToCompass(windDirection),
                swellHeight: Math.round((baseHeight * 0.8) * 10) / 10,
                swellPeriod: Math.round((period * 1.1) * 10) / 10,
                swellDirection: this.degreesToCompass(windDirection + 20),
                quality: this.calculateSurfQuality(baseHeight / 3.28084, period, windSpeed, windDirection)
            });
        }
        
        return {
            location: { latitude: 40.5897, longitude: -72.8675 },
            current: forecast[0],
            forecast
        };
    }
}