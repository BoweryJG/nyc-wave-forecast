import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass';
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass';
import { gsap } from 'gsap';
import { WaveDataService } from './services/WaveDataService';
import { OceanScene } from './components/OceanScene';
import { LocationMarkers } from './components/LocationMarkers';
import { UIController } from './components/UIController';
import { ForecastChart } from './components/ForecastChart';

class WaveForecastApp {
    constructor() {
        this.container = document.getElementById('canvas-container');
        this.loadingElement = document.getElementById('loading');
        
        this.scene = new THREE.Scene();
        this.camera = new THREE.PerspectiveCamera(
            75,
            window.innerWidth / window.innerHeight,
            0.1,
            10000
        );
        
        this.renderer = new THREE.WebGLRenderer({
            antialias: true,
            alpha: true
        });
        
        this.clock = new THREE.Clock();
        this.isPlaying = false;
        this.currentTimeIndex = 0;
        this.forecastData = null;
        
        this.init();
    }

    async init() {
        this.setupRenderer();
        this.setupCamera();
        this.setupLighting();
        this.setupPostProcessing();
        this.setupControls();
        
        this.oceanScene = new OceanScene(this.scene);
        this.locationMarkers = new LocationMarkers(this.scene);
        this.uiController = new UIController(this);
        this.forecastChart = new ForecastChart(this.scene, this);
        
        this.waveDataService = new WaveDataService();
        
        await this.loadInitialData();
        
        this.setupEventListeners();
        this.hideLoading();
        this.animate();
    }

    setupRenderer() {
        this.renderer.setSize(window.innerWidth, window.innerHeight);
        this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
        this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
        this.renderer.toneMappingExposure = 0.5;
        this.renderer.shadowMap.enabled = true;
        this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
        this.container.appendChild(this.renderer.domElement);
    }

    setupCamera() {
        this.camera.position.set(0, 50, 150);
        this.camera.lookAt(0, 0, 0);
    }

    setupLighting() {
        const ambientLight = new THREE.AmbientLight(0x404040, 0.5);
        this.scene.add(ambientLight);
        
        const sunLight = new THREE.DirectionalLight(0xffffff, 1);
        sunLight.position.set(100, 100, 50);
        sunLight.castShadow = true;
        sunLight.shadow.camera.left = -200;
        sunLight.shadow.camera.right = 200;
        sunLight.shadow.camera.top = 200;
        sunLight.shadow.camera.bottom = -200;
        sunLight.shadow.camera.near = 0.5;
        sunLight.shadow.camera.far = 500;
        sunLight.shadow.mapSize.width = 2048;
        sunLight.shadow.mapSize.height = 2048;
        this.scene.add(sunLight);
        
        const moonLight = new THREE.PointLight(0x6699ff, 0.3);
        moonLight.position.set(-100, 80, -50);
        this.scene.add(moonLight);
        
        const rimLight = new THREE.DirectionalLight(0x00ccff, 0.3);
        rimLight.position.set(-50, 20, 100);
        this.scene.add(rimLight);
    }

    setupPostProcessing() {
        this.composer = new EffectComposer(this.renderer);
        this.composer.addPass(new RenderPass(this.scene, this.camera));
        
        const bloomPass = new UnrealBloomPass(
            new THREE.Vector2(window.innerWidth, window.innerHeight),
            0.3,
            0.4,
            0.85
        );
        this.composer.addPass(bloomPass);
    }

    setupControls() {
        this.controls = new OrbitControls(this.camera, this.renderer.domElement);
        this.controls.enableDamping = true;
        this.controls.dampingFactor = 0.05;
        this.controls.minDistance = 50;
        this.controls.maxDistance = 500;
        this.controls.maxPolarAngle = Math.PI * 0.48;
        this.controls.minPolarAngle = Math.PI * 0.1;
    }

    async loadInitialData() {
        try {
            const [smithPointData, brickData] = await Promise.all([
                this.waveDataService.getWaveData(40.5897, -72.8675), // Smith Point coordinates
                this.waveDataService.getWaveData(40.0573, -74.1097)  // Brick coordinates
            ]);
            
            this.forecastData = {
                smithPoint: smithPointData,
                brick: brickData
            };
            
            this.updateVisualization();
            this.uiController.updateLocationData('smith-point', smithPointData.current);
            this.uiController.updateLocationData('brick', brickData.current);
            this.forecastChart.updateForecast(this.forecastData);
        } catch (error) {
            console.error('Error loading wave data:', error);
        }
    }

    updateVisualization() {
        if (!this.forecastData) return;
        
        const timeData = this.getCurrentTimeData();
        
        this.oceanScene.updateWaveConditions({
            waveHeight: Math.max(timeData.smithPoint.waveHeight, timeData.brick.waveHeight),
            wavePeriod: Math.max(timeData.smithPoint.wavePeriod, timeData.brick.wavePeriod),
            windSpeed: Math.max(timeData.smithPoint.windSpeed, timeData.brick.windSpeed),
            windDirection: timeData.smithPoint.windDirection
        });
        
        this.locationMarkers.updateConditions('smithPoint', timeData.smithPoint);
        this.locationMarkers.updateConditions('brick', timeData.brick);
        
        this.uiController.updateLocationData('smith-point', timeData.smithPoint);
        this.uiController.updateLocationData('brick', timeData.brick);
        this.uiController.updateTimeline(this.currentTimeIndex);
    }

    getCurrentTimeData() {
        const smithPointForecast = this.forecastData.smithPoint.forecast[this.currentTimeIndex];
        const brickForecast = this.forecastData.brick.forecast[this.currentTimeIndex];
        
        return {
            smithPoint: smithPointForecast,
            brick: brickForecast
        };
    }

    setupEventListeners() {
        window.addEventListener('resize', () => this.onWindowResize());
        
        document.getElementById('prev-time').addEventListener('click', () => {
            this.currentTimeIndex = Math.max(0, this.currentTimeIndex - 1);
            this.updateVisualization();
        });
        
        document.getElementById('next-time').addEventListener('click', () => {
            const maxIndex = this.forecastData.smithPoint.forecast.length - 1;
            this.currentTimeIndex = Math.min(maxIndex, this.currentTimeIndex + 1);
            this.updateVisualization();
        });
        
        document.getElementById('play-pause').addEventListener('click', (e) => {
            this.isPlaying = !this.isPlaying;
            e.target.textContent = this.isPlaying ? '⏸' : '▶';
            
            if (this.isPlaying) {
                this.startTimelineAnimation();
            }
        });
        
        document.querySelectorAll('.control-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const view = e.target.dataset.view;
                this.switchView(view);
                
                document.querySelectorAll('.control-btn').forEach(b => b.classList.remove('active'));
                e.target.classList.add('active');
            });
        });
    }

    startTimelineAnimation() {
        if (!this.isPlaying) return;
        
        setTimeout(() => {
            const maxIndex = this.forecastData.smithPoint.forecast.length - 1;
            this.currentTimeIndex = (this.currentTimeIndex + 1) % (maxIndex + 1);
            this.updateVisualization();
            this.startTimelineAnimation();
        }, 2000);
    }

    switchView(view) {
        switch(view) {
            case '3d':
                gsap.to(this.camera.position, {
                    x: 0,
                    y: 50,
                    z: 150,
                    duration: 1.5,
                    ease: "power2.inOut"
                });
                break;
            case 'map':
                gsap.to(this.camera.position, {
                    x: 0,
                    y: 200,
                    z: 0,
                    duration: 1.5,
                    ease: "power2.inOut"
                });
                break;
            case 'split':
                gsap.to(this.camera.position, {
                    x: 100,
                    y: 100,
                    z: 100,
                    duration: 1.5,
                    ease: "power2.inOut"
                });
                break;
        }
    }

    hideLoading() {
        gsap.to(this.loadingElement, {
            opacity: 0,
            duration: 0.5,
            onComplete: () => {
                this.loadingElement.style.display = 'none';
            }
        });
    }

    onWindowResize() {
        this.camera.aspect = window.innerWidth / window.innerHeight;
        this.camera.updateProjectionMatrix();
        this.renderer.setSize(window.innerWidth, window.innerHeight);
        this.composer.setSize(window.innerWidth, window.innerHeight);
    }

    animate() {
        requestAnimationFrame(() => this.animate());
        
        const deltaTime = this.clock.getDelta();
        const elapsedTime = this.clock.getElapsedTime();
        
        this.controls.update();
        
        if (this.oceanScene) {
            this.oceanScene.update(elapsedTime);
        }
        
        if (this.locationMarkers) {
            this.locationMarkers.update(elapsedTime);
        }
        
        if (this.forecastChart) {
            this.forecastChart.update(elapsedTime);
        }
        
        this.composer.render();
    }
}

const app = new WaveForecastApp();