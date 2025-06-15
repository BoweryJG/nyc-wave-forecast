import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass';
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass';
import { gsap } from 'gsap';
import { WaveDataService } from './services/WaveDataService';
import { PhotorealisticOcean } from './components/PhotorealisticOcean';
import { CinematicLocationSystem } from './components/CinematicLocationSystem';
import { InnovativeForecastUI } from './components/InnovativeForecastUI';
import './styles/photorealistic.css';

class WaveForecastApp {
    constructor() {
        this.container = document.getElementById('canvas-container');
        this.loadingElement = document.getElementById('loading');
        
        this.scene = new THREE.Scene();
        this.camera = new THREE.PerspectiveCamera(
            60,
            window.innerWidth / window.innerHeight,
            0.1,
            2000
        );
        
        this.renderer = new THREE.WebGLRenderer({
            antialias: true,
            alpha: false,
            powerPreference: "high-performance"
        });
        
        this.clock = new THREE.Clock();
        this.forecastData = null;
        
        this.init();
    }

    async init() {
        this.setupRenderer();
        this.setupCamera();
        this.setupPostProcessing();
        this.setupControls();
        
        // Initialize photorealistic components
        this.ocean = new PhotorealisticOcean(this.scene);
        this.locationSystem = new CinematicLocationSystem(this.scene);
        this.forecastUI = new InnovativeForecastUI();
        
        this.waveDataService = new WaveDataService();
        
        await this.loadInitialData();
        
        this.setupEventListeners();
        this.hideLoading();
        this.animate();
        
        // Start with cinematic intro
        this.cinematicIntro();
    }

    setupRenderer() {
        this.renderer.setSize(window.innerWidth, window.innerHeight);
        this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
        
        // Photorealistic rendering settings
        this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
        this.renderer.toneMappingExposure = 1.0;
        this.renderer.shadowMap.enabled = true;
        this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
        
        // Enable logarithmic depth buffer for large scenes
        this.renderer.logarithmicDepthBuffer = true;
        
        this.container.appendChild(this.renderer.domElement);
    }

    setupCamera() {
        // Cinematic camera position
        this.camera.position.set(0, 30, 200);
        this.camera.lookAt(0, 0, 0);
        
        // Set appropriate near/far planes
        this.camera.near = 0.1;
        this.camera.far = 2000;
        this.camera.updateProjectionMatrix();
    }

    setupPostProcessing() {
        this.composer = new EffectComposer(this.renderer);
        this.composer.addPass(new RenderPass(this.scene, this.camera));
        
        // Subtle bloom for photorealism
        const bloomPass = new UnrealBloomPass(
            new THREE.Vector2(window.innerWidth, window.innerHeight),
            0.5, // strength
            0.8, // radius
            0.85 // threshold
        );
        this.composer.addPass(bloomPass);
    }

    setupControls() {
        this.controls = new OrbitControls(this.camera, this.renderer.domElement);
        this.controls.enableDamping = true;
        this.controls.dampingFactor = 0.05;
        this.controls.minDistance = 20;
        this.controls.maxDistance = 500;
        
        // Limit vertical rotation for realism
        this.controls.maxPolarAngle = Math.PI * 0.48;
        this.controls.minPolarAngle = Math.PI * 0.02;
        
        // Enable auto-rotation for cinematic effect
        this.controls.autoRotate = true;
        this.controls.autoRotateSpeed = 0.2;
    }

    async loadInitialData() {
        try {
            const [smithPointData, brickData] = await Promise.all([
                this.waveDataService.getWaveData(40.5897, -72.8675), // Smith Point
                this.waveDataService.getWaveData(40.0573, -74.1097)  // Brick
            ]);
            
            this.forecastData = {
                smithPoint: smithPointData,
                brick: brickData
            };
            
            this.updateVisualization();
            this.forecastUI.updateForecast(this.forecastData);
        } catch (error) {
            console.error('Error loading wave data:', error);
        }
    }

    updateVisualization() {
        if (!this.forecastData) return;
        
        // Get current conditions for both locations
        const smithPointCurrent = this.forecastData.smithPoint.current;
        const brickCurrent = this.forecastData.brick.current;
        
        // Use the larger wave height for ocean visualization
        const maxConditions = {
            waveHeight: Math.max(smithPointCurrent.waveHeight, brickCurrent.waveHeight),
            wavePeriod: Math.max(smithPointCurrent.wavePeriod, brickCurrent.wavePeriod),
            windSpeed: Math.max(smithPointCurrent.windSpeed, brickCurrent.windSpeed),
            windDirection: smithPointCurrent.windDirection
        };
        
        this.ocean.updateWaveConditions(maxConditions);
        
        // Update location glows based on conditions
        this.locationSystem.updateConditions('smithPoint', smithPointCurrent);
        this.locationSystem.updateConditions('brick', brickCurrent);
    }

    cinematicIntro() {
        // Disable controls during intro
        this.controls.enabled = false;
        
        // Start from aerial view
        this.camera.position.set(0, 300, 300);
        this.camera.lookAt(0, 0, 0);
        
        // Cinematic camera movement
        const timeline = gsap.timeline({
            onComplete: () => {
                this.controls.enabled = true;
            }
        });
        
        timeline
            .to(this.camera.position, {
                x: 150,
                y: 50,
                z: 200,
                duration: 4,
                ease: "power2.inOut"
            })
            .to(this.camera.position, {
                x: 0,
                y: 30,
                z: 150,
                duration: 3,
                ease: "power2.inOut"
            }, "-=1");
    }

    setupEventListeners() {
        window.addEventListener('resize', () => this.onWindowResize());
        
        // Location change from UI
        window.addEventListener('locationChange', (e) => {
            this.locationSystem.focusLocation(e.detail, this.camera, this.controls);
        });
        
        // Keyboard controls for cinematic views
        window.addEventListener('keypress', (e) => {
            switch(e.key) {
                case '1':
                    this.setCinematicView('overview');
                    break;
                case '2':
                    this.setCinematicView('wave');
                    break;
                case '3':
                    this.setCinematicView('aerial');
                    break;
            }
        });
    }

    setCinematicView(view) {
        this.controls.autoRotate = false;
        
        switch(view) {
            case 'overview':
                gsap.to(this.camera.position, {
                    x: 0,
                    y: 30,
                    z: 150,
                    duration: 2,
                    ease: "power2.inOut",
                    onComplete: () => {
                        this.controls.autoRotate = true;
                    }
                });
                break;
            case 'wave':
                gsap.to(this.camera.position, {
                    x: 50,
                    y: 5,
                    z: 50,
                    duration: 2,
                    ease: "power2.inOut"
                });
                break;
            case 'aerial':
                gsap.to(this.camera.position, {
                    x: 0,
                    y: 200,
                    z: 0,
                    duration: 2,
                    ease: "power2.inOut",
                    onUpdate: () => {
                        this.camera.lookAt(0, 0, 0);
                    }
                });
                break;
        }
    }

    hideLoading() {
        gsap.to(this.loadingElement, {
            opacity: 0,
            duration: 1,
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
        
        // Update ocean with camera position for proper reflections
        if (this.ocean) {
            this.ocean.update(elapsedTime, this.camera);
        }
        
        // Update location system
        if (this.locationSystem) {
            this.locationSystem.update(elapsedTime);
        }
        
        // Render with post-processing
        this.composer.render();
    }
}

// Create cinematic view controls
const createCinematicControls = () => {
    const controls = document.createElement('div');
    controls.className = 'cinematic-controls';
    controls.innerHTML = `
        <button class="view-btn" title="Overview" data-view="overview">🌊</button>
        <button class="view-btn" title="Wave Level" data-view="wave">🏄</button>
        <button class="view-btn" title="Aerial" data-view="aerial">🚁</button>
    `;
    document.getElementById('ui-overlay').appendChild(controls);
    
    controls.querySelectorAll('.view-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const view = e.currentTarget.dataset.view;
            window.dispatchEvent(new KeyboardEvent('keypress', { key: 
                view === 'overview' ? '1' : 
                view === 'wave' ? '2' : '3'
            }));
            
            // Update active state
            controls.querySelectorAll('.view-btn').forEach(b => b.classList.remove('active'));
            e.currentTarget.classList.add('active');
        });
    });
};

// Initialize app
const app = new WaveForecastApp();
createCinematicControls();