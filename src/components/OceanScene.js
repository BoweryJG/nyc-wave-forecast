import * as THREE from 'three';
import { gsap } from 'gsap';

export class OceanScene {
    constructor(scene) {
        this.scene = scene;
        this.oceanMesh = null;
        this.waveParams = {
            height: 2,
            period: 8,
            windSpeed: 10,
            windDirection: 0
        };
        
        this.init();
    }

    init() {
        this.createOcean();
        this.createSky();
        this.addFog();
        this.addParticles();
    }

    createOcean() {
        // Create a large plane for the ocean with high tessellation
        const geometry = new THREE.PlaneGeometry(800, 800, 256, 256);
        
        // Create stunning ocean shader with Gerstner waves
        const material = new THREE.ShaderMaterial({
            uniforms: {
                time: { value: 0 },
                waveHeight: { value: 2.0 },
                waterColor: { value: new THREE.Color(0x006994) },
                waterDeep: { value: new THREE.Color(0x001122) },
                sunColor: { value: new THREE.Color(0xffffff) },
                sunDirection: { value: new THREE.Vector3(0.70707, 0.70707, 0).normalize() },
                foamThreshold: { value: 0.8 }
            },
            vertexShader: `
                uniform float time;
                uniform float waveHeight;
                
                varying vec3 vNormal;
                varying vec3 vPosition;
                varying float vElevation;
                varying vec2 vUv;
                varying vec3 vWorldPos;
                
                // Improved wave function
                vec3 getWaveHeight(vec2 pos, float t) {
                    vec3 wavePos = vec3(0.0);
                    
                    // Large rolling waves
                    float wave1 = sin(pos.x * 0.02 + t * 0.8) * cos(pos.y * 0.02 + t * 0.6);
                    float wave2 = sin(pos.x * 0.03 - t * 1.1) * cos(pos.y * 0.04 + t * 0.9);
                    float wave3 = sin(pos.x * 0.01 + pos.y * 0.01 + t * 0.5) * 1.5;
                    
                    // Medium waves
                    float wave4 = sin(pos.x * 0.06 + t * 1.8) * cos(pos.y * 0.08 - t * 1.6) * 0.6;
                    float wave5 = sin(pos.x * 0.1 - pos.y * 0.1 + t * 2.4) * 0.4;
                    
                    // Small detail waves
                    float wave6 = sin(pos.x * 0.3 + t * 3.0) * sin(pos.y * 0.3 + t * 2.5) * 0.2;
                    float wave7 = sin(pos.x * 0.5 - t * 4.0) * sin(pos.y * 0.4 + t * 3.5) * 0.1;
                    
                    float height = (wave1 + wave2 + wave3 + wave4 + wave5 + wave6 + wave7) * waveHeight;
                    
                    // Add some displacement for more realistic waves
                    float xDisplace = cos(pos.x * 0.05 + t) * sin(pos.y * 0.05 + t * 0.8) * waveHeight * 0.3;
                    float yDisplace = sin(pos.x * 0.05 - t * 0.9) * cos(pos.y * 0.05 + t) * waveHeight * 0.3;
                    
                    return vec3(xDisplace, yDisplace, height);
                }
                
                void main() {
                    vUv = uv;
                    
                    vec3 wave = getWaveHeight(position.xy, time);
                    vec3 pos = position + wave;
                    vWorldPos = pos;
                    vElevation = wave.z;
                    vPosition = pos;
                    
                    // Calculate normal
                    float delta = 1.0;
                    vec3 waveLeft = getWaveHeight(position.xy + vec2(-delta, 0.0), time);
                    vec3 waveRight = getWaveHeight(position.xy + vec2(delta, 0.0), time);
                    vec3 waveUp = getWaveHeight(position.xy + vec2(0.0, delta), time);
                    vec3 waveDown = getWaveHeight(position.xy + vec2(0.0, -delta), time);
                    
                    vec3 tangent = normalize(vec3(2.0 * delta, 0.0, waveRight.z - waveLeft.z));
                    vec3 binormal = normalize(vec3(0.0, 2.0 * delta, waveUp.z - waveDown.z));
                    vNormal = normalize(cross(binormal, tangent));
                    
                    gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
                }
            `,
            fragmentShader: `
                uniform vec3 waterColor;
                uniform vec3 waterDeep;
                uniform vec3 sunColor;
                uniform vec3 sunDirection;
                uniform float time;
                uniform float foamThreshold;
                
                varying vec3 vNormal;
                varying vec3 vPosition;
                varying float vElevation;
                varying vec2 vUv;
                varying vec3 vWorldPos;
                
                void main() {
                    // Deep to shallow water gradient
                    float depth = smoothstep(-5.0, 5.0, vElevation);
                    vec3 color = mix(waterDeep, waterColor, depth);
                    
                    // Fresnel effect
                    vec3 viewDirection = normalize(cameraPosition - vWorldPos);
                    float fresnel = pow(1.0 - dot(viewDirection, vNormal), 2.0);
                    color = mix(color, waterColor * 1.5, fresnel * 0.5);
                    
                    // Foam on wave crests
                    float foam = smoothstep(foamThreshold * 2.0, foamThreshold * 3.0, vElevation);
                    
                    // Animated foam texture
                    float foamPattern = sin(vWorldPos.x * 0.1 + time * 2.0) * 
                                       sin(vWorldPos.y * 0.1 - time * 1.5);
                    foam *= 0.5 + 0.5 * foamPattern;
                    
                    // Secondary foam at wave intersection
                    float secondaryFoam = smoothstep(0.4, 0.6, abs(sin(vWorldPos.x * 0.05 + time)) * 
                                                              abs(sin(vWorldPos.y * 0.05 - time * 0.8)));
                    foam = max(foam, secondaryFoam * 0.3);
                    
                    color = mix(color, vec3(1.0), foam);
                    
                    // Lighting
                    float diffuse = max(dot(vNormal, sunDirection), 0.0);
                    color *= 0.6 + 0.4 * diffuse;
                    
                    // Specular highlights
                    vec3 reflectDir = reflect(-sunDirection, vNormal);
                    float spec = pow(max(dot(viewDirection, reflectDir), 0.0), 64.0);
                    color += sunColor * spec * 0.8;
                    
                    // Subsurface scattering effect
                    float subsurface = max(dot(viewDirection, -sunDirection), 0.0);
                    color += waterColor * 0.2 * pow(subsurface, 3.0);
                    
                    // Add slight transparency
                    float alpha = 0.95 - fresnel * 0.1;
                    
                    gl_FragColor = vec4(color, alpha);
                }
            `,
            transparent: true,
            side: THREE.DoubleSide
        });
        
        this.oceanMesh = new THREE.Mesh(geometry, material);
        this.oceanMesh.rotation.x = -Math.PI / 2;
        this.scene.add(this.oceanMesh);
        
        // Add a darker base plane underneath for depth
        const baseGeometry = new THREE.PlaneGeometry(1000, 1000);
        const baseMaterial = new THREE.MeshBasicMaterial({ 
            color: 0x000511,
            side: THREE.DoubleSide
        });
        const basePlane = new THREE.Mesh(baseGeometry, baseMaterial);
        basePlane.rotation.x = -Math.PI / 2;
        basePlane.position.y = -15;
        this.scene.add(basePlane);
    }

    createSky() {
        // Create beautiful gradient sky
        const skyGeo = new THREE.SphereGeometry(500, 32, 32);
        const skyMat = new THREE.ShaderMaterial({
            uniforms: {
                topColor: { value: new THREE.Color(0x0077be) },
                bottomColor: { value: new THREE.Color(0xffffff) },
                offset: { value: 33 },
                exponent: { value: 0.6 },
                time: { value: 0 }
            },
            vertexShader: `
                varying vec3 vWorldPosition;
                void main() {
                    vec4 worldPosition = modelMatrix * vec4(position, 1.0);
                    vWorldPosition = worldPosition.xyz;
                    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
                }
            `,
            fragmentShader: `
                uniform vec3 topColor;
                uniform vec3 bottomColor;
                uniform float offset;
                uniform float exponent;
                uniform float time;
                varying vec3 vWorldPosition;
                
                void main() {
                    float h = normalize(vWorldPosition + offset).y;
                    float mixStrength = pow(max(h, 0.0), exponent);
                    
                    vec3 color = mix(bottomColor, topColor, mixStrength);
                    
                    // Add subtle cloud effect
                    float cloud = smoothstep(0.4, 0.6, h) * 0.1;
                    cloud *= sin(vWorldPosition.x * 0.005 + time * 0.1) * 
                             sin(vWorldPosition.z * 0.005 + time * 0.05);
                    color = mix(color, vec3(1.0), cloud);
                    
                    gl_FragColor = vec4(color, 1.0);
                }
            `,
            side: THREE.BackSide
        });
        
        const sky = new THREE.Mesh(skyGeo, skyMat);
        this.scene.add(sky);
        this.skyMaterial = skyMat;
    }

    addFog() {
        // Add atmospheric fog
        this.scene.fog = new THREE.FogExp2(0xaabbcc, 0.0015);
    }

    addParticles() {
        // Add spray particles
        const particleCount = 2000;
        const geometry = new THREE.BufferGeometry();
        const positions = new Float32Array(particleCount * 3);
        const velocities = new Float32Array(particleCount * 3);
        
        for (let i = 0; i < particleCount * 3; i += 3) {
            positions[i] = (Math.random() - 0.5) * 400;
            positions[i + 1] = Math.random() * 10;
            positions[i + 2] = (Math.random() - 0.5) * 400;
            
            velocities[i] = (Math.random() - 0.5) * 0.2;
            velocities[i + 1] = Math.random() * 0.5;
            velocities[i + 2] = (Math.random() - 0.5) * 0.2;
        }
        
        geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
        geometry.setAttribute('velocity', new THREE.BufferAttribute(velocities, 3));
        
        const material = new THREE.PointsMaterial({
            color: 0xffffff,
            size: 2,
            transparent: true,
            opacity: 0.6,
            blending: THREE.AdditiveBlending,
            depthWrite: false,
            map: this.createSprayTexture()
        });
        
        this.particleSystem = new THREE.Points(geometry, material);
        this.scene.add(this.particleSystem);
    }

    createSprayTexture() {
        const canvas = document.createElement('canvas');
        canvas.width = 32;
        canvas.height = 32;
        const ctx = canvas.getContext('2d');
        
        const gradient = ctx.createRadialGradient(16, 16, 0, 16, 16, 16);
        gradient.addColorStop(0, 'rgba(255, 255, 255, 1)');
        gradient.addColorStop(0.5, 'rgba(255, 255, 255, 0.5)');
        gradient.addColorStop(1, 'rgba(255, 255, 255, 0)');
        
        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, 32, 32);
        
        return new THREE.CanvasTexture(canvas);
    }

    updateWaveConditions(conditions) {
        // Update wave parameters based on conditions
        gsap.to(this.waveParams, {
            height: conditions.waveHeight / 3.28084, // Convert feet to meters
            period: conditions.wavePeriod,
            windSpeed: conditions.windSpeed,
            duration: 2,
            ease: "power2.inOut",
            onUpdate: () => {
                if (this.oceanMesh) {
                    this.oceanMesh.material.uniforms.waveHeight.value = this.waveParams.height;
                }
            }
        });
    }

    update(elapsedTime) {
        if (this.oceanMesh && this.oceanMesh.material.uniforms) {
            this.oceanMesh.material.uniforms.time.value = elapsedTime;
        }
        
        if (this.skyMaterial && this.skyMaterial.uniforms) {
            this.skyMaterial.uniforms.time.value = elapsedTime;
        }
        
        // Update particles
        if (this.particleSystem) {
            const positions = this.particleSystem.geometry.attributes.position.array;
            const velocities = this.particleSystem.geometry.attributes.velocity.array;
            
            for (let i = 0; i < positions.length; i += 3) {
                positions[i] += velocities[i];
                positions[i + 1] += velocities[i + 1];
                positions[i + 2] += velocities[i + 2];
                
                // Reset particles that fall too low
                if (positions[i + 1] < 0) {
                    positions[i] = (Math.random() - 0.5) * 400;
                    positions[i + 1] = Math.random() * 5 + 5;
                    positions[i + 2] = (Math.random() - 0.5) * 400;
                }
            }
            
            this.particleSystem.geometry.attributes.position.needsUpdate = true;
            this.particleSystem.rotation.y = elapsedTime * 0.05;
        }
    }
}