import * as THREE from 'three';
import { gsap } from 'gsap';

export class ForecastChart {
    constructor(scene, app) {
        this.scene = scene;
        this.app = app;
        this.chartGroup = new THREE.Group();
        this.bars = [];
        this.labels = [];
        
        this.chartPosition = new THREE.Vector3(0, 5, 100);
        this.chartWidth = 200;
        this.chartHeight = 60;
        this.barWidth = 25;
        
        this.init();
    }

    init() {
        this.createChartBase();
        this.createDayBars();
        this.chartGroup.position.copy(this.chartPosition);
        this.scene.add(this.chartGroup);
    }

    createChartBase() {
        // Create glass-like base panel
        const baseGeometry = new THREE.BoxGeometry(this.chartWidth + 20, this.chartHeight + 10, 2);
        const baseMaterial = new THREE.MeshPhysicalMaterial({
            color: 0x000033,
            metalness: 0.1,
            roughness: 0.1,
            transmission: 0.9,
            thickness: 1,
            transparent: true,
            opacity: 0.3
        });
        const base = new THREE.Mesh(baseGeometry, baseMaterial);
        base.position.z = -5;
        this.chartGroup.add(base);

        // Add glowing border
        const borderGeometry = new THREE.EdgesGeometry(baseGeometry);
        const borderMaterial = new THREE.LineBasicMaterial({ 
            color: 0x00ffff,
            linewidth: 2
        });
        const border = new THREE.LineSegments(borderGeometry, borderMaterial);
        border.position.z = -5;
        this.chartGroup.add(border);

        // Title
        const titleCanvas = this.createTextCanvas('7-Day Wave Forecast', 48, 'bold');
        const titleTexture = new THREE.CanvasTexture(titleCanvas);
        const titleSprite = new THREE.Sprite(new THREE.SpriteMaterial({ 
            map: titleTexture, 
            transparent: true 
        }));
        titleSprite.scale.set(60, 15, 1);
        titleSprite.position.y = this.chartHeight / 2 + 10;
        this.chartGroup.add(titleSprite);
    }

    createDayBars() {
        const days = 7;
        const spacing = this.chartWidth / days;
        const startX = -this.chartWidth / 2 + spacing / 2;

        for (let i = 0; i < days; i++) {
            const barGroup = new THREE.Group();
            
            // Create bar
            const barGeometry = new THREE.CylinderGeometry(
                this.barWidth / 2, 
                this.barWidth / 2, 
                1, 
                8
            );
            const barMaterial = new THREE.MeshPhysicalMaterial({
                color: 0x00aaff,
                emissive: 0x0066ff,
                emissiveIntensity: 0.3,
                metalness: 0.5,
                roughness: 0.2,
                clearcoat: 1,
                clearcoatRoughness: 0
            });
            const bar = new THREE.Mesh(barGeometry, barMaterial);
            barGroup.add(bar);

            // Add glow effect
            const glowGeometry = new THREE.CylinderGeometry(
                this.barWidth / 2 + 2, 
                this.barWidth / 2 + 2, 
                1, 
                8
            );
            const glowMaterial = new THREE.MeshBasicMaterial({
                color: 0x00aaff,
                transparent: true,
                opacity: 0.3
            });
            const glow = new THREE.Mesh(glowGeometry, glowMaterial);
            barGroup.add(glow);

            // Add light
            const light = new THREE.PointLight(0x00aaff, 0.5, 20);
            light.position.y = 10;
            barGroup.add(light);

            // Position bar
            barGroup.position.x = startX + i * spacing;
            barGroup.position.y = -this.chartHeight / 2;
            
            this.bars.push({
                group: barGroup,
                bar: bar,
                glow: glow,
                light: light,
                material: barMaterial,
                targetHeight: 1,
                currentHeight: 1
            });
            
            this.chartGroup.add(barGroup);

            // Add day label
            const date = new Date();
            date.setDate(date.getDate() + i);
            const dayName = date.toLocaleDateString('en-US', { weekday: 'short' });
            
            const labelCanvas = this.createTextCanvas(dayName, 24);
            const labelTexture = new THREE.CanvasTexture(labelCanvas);
            const labelSprite = new THREE.Sprite(new THREE.SpriteMaterial({ 
                map: labelTexture, 
                transparent: true 
            }));
            labelSprite.scale.set(15, 5, 1);
            labelSprite.position.x = startX + i * spacing;
            labelSprite.position.y = -this.chartHeight / 2 - 10;
            
            this.labels.push(labelSprite);
            this.chartGroup.add(labelSprite);
        }
    }

    createTextCanvas(text, size = 32, weight = 'normal') {
        const canvas = document.createElement('canvas');
        const context = canvas.getContext('2d');
        canvas.width = 512;
        canvas.height = 128;
        
        context.fillStyle = 'white';
        context.font = `${weight} ${size}px Arial`;
        context.textAlign = 'center';
        context.textBaseline = 'middle';
        context.fillText(text, 256, 64);
        
        return canvas;
    }

    updateForecast(forecastData) {
        if (!forecastData) return;

        // Get daily max wave heights
        const dailyData = this.processDailyData(forecastData);
        
        dailyData.forEach((day, index) => {
            if (index >= this.bars.length) return;
            
            const bar = this.bars[index];
            const maxHeight = 40; // Max bar height
            const normalizedHeight = Math.min(day.maxWaveHeight / 10, 1) * maxHeight;
            
            // Update bar color based on quality
            let color, emissive;
            switch (day.bestQuality) {
                case 'excellent':
                    color = 0xffcc00; // Gold
                    emissive = 0xff9900;
                    break;
                case 'good':
                    color = 0x00ff88; // Green
                    emissive = 0x00cc66;
                    break;
                case 'fair':
                    color = 0x00aaff; // Blue
                    emissive = 0x0066ff;
                    break;
                default:
                    color = 0x666666; // Gray
                    emissive = 0x333333;
                    break;
            }
            
            // Animate bar height and color
            gsap.to(bar, {
                targetHeight: normalizedHeight,
                duration: 2,
                ease: "power2.out",
                onUpdate: () => {
                    const scale = bar.targetHeight;
                    bar.bar.scale.y = scale;
                    bar.glow.scale.y = scale;
                    bar.bar.position.y = scale / 2;
                    bar.glow.position.y = scale / 2;
                    bar.light.position.y = scale;
                }
            });
            
            // Animate color change
            gsap.to(bar.material.color, {
                r: new THREE.Color(color).r,
                g: new THREE.Color(color).g,
                b: new THREE.Color(color).b,
                duration: 1.5
            });
            
            gsap.to(bar.material.emissive, {
                r: new THREE.Color(emissive).r,
                g: new THREE.Color(emissive).g,
                b: new THREE.Color(emissive).b,
                duration: 1.5
            });
            
            // Update light
            bar.light.color.setHex(color);
            gsap.to(bar.light, {
                intensity: day.bestQuality === 'excellent' ? 2 : 0.5,
                duration: 1.5
            });

            // Add wave height label
            if (!bar.heightLabel) {
                const heightCanvas = this.createTextCanvas('', 20);
                const heightTexture = new THREE.CanvasTexture(heightCanvas);
                const heightSprite = new THREE.Sprite(new THREE.SpriteMaterial({ 
                    map: heightTexture, 
                    transparent: true 
                }));
                heightSprite.scale.set(12, 4, 1);
                bar.heightLabel = heightSprite;
                bar.group.add(heightSprite);
            }
            
            // Update height label
            const heightText = `${day.maxWaveHeight.toFixed(1)}ft`;
            const canvas = this.createTextCanvas(heightText, 20, 'bold');
            bar.heightLabel.material.map = new THREE.CanvasTexture(canvas);
            bar.heightLabel.material.map.needsUpdate = true;
            bar.heightLabel.position.y = normalizedHeight + 5;
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
                
                // Track best quality of the day
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
        // Animate bars with gentle floating
        this.bars.forEach((bar, index) => {
            bar.group.position.y = -this.chartHeight / 2 + Math.sin(elapsedTime + index) * 2;
            bar.glow.material.opacity = 0.3 + Math.sin(elapsedTime * 2 + index) * 0.1;
        });
        
        // Rotate the entire chart slightly
        this.chartGroup.rotation.y = Math.sin(elapsedTime * 0.3) * 0.05;
    }
}