import { gsap } from 'gsap';

export class UIController {
    constructor(app) {
        this.app = app;
        this.elements = {
            smithPoint: {
                card: document.querySelector('.location-card.smith-point'),
                waveHeight: document.querySelector('.smith-point .wave-height'),
                period: document.querySelector('.smith-point .period'),
                wind: document.querySelector('.smith-point .wind'),
                quality: document.querySelector('.smith-point .surf-quality')
            },
            brick: {
                card: document.querySelector('.location-card.brick'),
                waveHeight: document.querySelector('.brick .wave-height'),
                period: document.querySelector('.brick .period'),
                wind: document.querySelector('.brick .wind'),
                quality: document.querySelector('.brick .surf-quality')
            },
            timeline: {
                date: document.querySelector('.timeline-date'),
                time: document.querySelector('.timeline-time')
            }
        };
        
        this.setupAlerts();
    }

    updateLocationData(locationKey, data) {
        const elements = locationKey === 'smith-point' ? this.elements.smithPoint : this.elements.brick;
        
        if (!elements || !data) return;
        
        // Animate values
        this.animateValue(elements.waveHeight, `${data.waveHeight} ft`);
        this.animateValue(elements.period, `${data.wavePeriod}s`);
        this.animateValue(elements.wind, `${Math.round(data.windSpeed)} kts ${data.windDirection}`);
        
        // Update quality indicator
        this.updateQualityIndicator(elements.quality, data.quality);
        
        // Pulse card if conditions are excellent
        if (data.quality.rating === 'excellent') {
            this.pulseCard(elements.card);
        }
    }

    animateValue(element, newValue) {
        if (!element) return;
        
        if (element.textContent !== newValue) {
            gsap.to(element, {
                opacity: 0,
                duration: 0.2,
                onComplete: () => {
                    element.textContent = newValue;
                    gsap.to(element, { opacity: 1, duration: 0.2 });
                }
            });
        }
    }

    updateQualityIndicator(element, quality) {
        if (!element || !quality) return;
        
        // Remove all quality classes
        element.classList.remove('excellent', 'good', 'fair', 'poor');
        
        // Add new quality class
        element.classList.add(quality.rating);
        
        // Update text
        element.textContent = quality.description;
        
        // Add animation for excellent conditions
        if (quality.rating === 'excellent') {
            gsap.fromTo(element, 
                { scale: 1 },
                { 
                    scale: 1.05,
                    duration: 0.5,
                    ease: "power2.inOut",
                    repeat: -1,
                    yoyo: true
                }
            );
        } else {
            gsap.killTweensOf(element);
            gsap.set(element, { scale: 1 });
        }
    }

    pulseCard(card) {
        gsap.fromTo(card, 
            { boxShadow: '0 10px 30px rgba(0, 0, 0, 0.5)' },
            { 
                boxShadow: '0 10px 50px rgba(255, 204, 0, 0.5)',
                duration: 1,
                ease: "power2.inOut",
                repeat: 2,
                yoyo: true
            }
        );
    }

    updateTimeline(timeIndex) {
        if (!this.app.forecastData) return;
        
        const forecast = this.app.forecastData.smithPoint.forecast[timeIndex];
        if (!forecast) return;
        
        const date = new Date(forecast.time);
        const dateOptions = { weekday: 'short', month: 'short', day: 'numeric' };
        const timeOptions = { hour: 'numeric', minute: '2-digit' };
        
        this.elements.timeline.date.textContent = date.toLocaleDateString('en-US', dateOptions);
        this.elements.timeline.time.textContent = date.toLocaleTimeString('en-US', timeOptions);
        
        // Highlight if showing current time
        const now = new Date();
        const isCurrentHour = Math.abs(date - now) < 3600000; // Within 1 hour
        
        if (isCurrentHour) {
            this.elements.timeline.date.style.color = '#00ff88';
            this.elements.timeline.time.style.color = '#00ff88';
        } else {
            this.elements.timeline.date.style.color = '#ffffff';
            this.elements.timeline.time.style.color = '#888888';
        }
    }

    setupAlerts() {
        // Check for excellent conditions periodically
        setInterval(() => {
            if (!this.app.forecastData) return;
            
            const now = new Date();
            const next24Hours = now.getTime() + 24 * 60 * 60 * 1000;
            
            // Check Smith Point
            const smithPointExcellent = this.app.forecastData.smithPoint.forecast.find(f => {
                const time = new Date(f.time).getTime();
                return time > now.getTime() && 
                       time < next24Hours && 
                       f.quality.rating === 'excellent';
            });
            
            // Check Brick
            const brickExcellent = this.app.forecastData.brick.forecast.find(f => {
                const time = new Date(f.time).getTime();
                return time > now.getTime() && 
                       time < next24Hours && 
                       f.quality.rating === 'excellent';
            });
            
            if (smithPointExcellent || brickExcellent) {
                this.showAlert(smithPointExcellent, brickExcellent);
            }
        }, 60000); // Check every minute
    }

    showAlert(smithPoint, brick) {
        // Create alert element if it doesn't exist
        let alertElement = document.getElementById('surf-alert');
        if (!alertElement) {
            alertElement = document.createElement('div');
            alertElement.id = 'surf-alert';
            alertElement.style.cssText = `
                position: fixed;
                top: 20px;
                left: 50%;
                transform: translateX(-50%);
                background: linear-gradient(135deg, #00ff88, #00a8ff);
                color: white;
                padding: 20px 40px;
                border-radius: 50px;
                font-size: 18px;
                font-weight: 600;
                box-shadow: 0 10px 40px rgba(0, 255, 136, 0.5);
                z-index: 1000;
                display: none;
                cursor: pointer;
            `;
            document.body.appendChild(alertElement);
            
            alertElement.addEventListener('click', () => {
                gsap.to(alertElement, {
                    opacity: 0,
                    y: -20,
                    duration: 0.3,
                    onComplete: () => {
                        alertElement.style.display = 'none';
                    }
                });
            });
        }
        
        // Update alert content
        let locations = [];
        if (smithPoint) locations.push('Smith Point');
        if (brick) locations.push('Brick');
        
        alertElement.textContent = `🔥 Epic surf coming to ${locations.join(' and ')}!`;
        alertElement.style.display = 'block';
        
        // Animate in
        gsap.fromTo(alertElement, 
            { opacity: 0, y: -20 },
            { 
                opacity: 1, 
                y: 0,
                duration: 0.5,
                ease: "back.out(1.7)"
            }
        );
        
        // Auto-hide after 10 seconds
        setTimeout(() => {
            gsap.to(alertElement, {
                opacity: 0,
                y: -20,
                duration: 0.3,
                onComplete: () => {
                    alertElement.style.display = 'none';
                }
            });
        }, 10000);
    }

    showLoading(show = true) {
        const loadingElement = document.getElementById('loading');
        if (show) {
            loadingElement.style.display = 'block';
            gsap.to(loadingElement, { opacity: 1, duration: 0.3 });
        } else {
            gsap.to(loadingElement, {
                opacity: 0,
                duration: 0.3,
                onComplete: () => {
                    loadingElement.style.display = 'none';
                }
            });
        }
    }
}