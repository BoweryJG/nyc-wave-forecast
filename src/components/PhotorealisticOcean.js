import * as THREE from 'three';
import { gsap } from 'gsap';

export class PhotorealisticOcean {
    constructor(scene) {
        this.scene = scene;
        this.oceanMesh = null;
        this.time = 0;
        
        this.waveParams = {
            height: 2,
            period: 8,
            windSpeed: 10,
            windDirection: 0
        };
        
        this.init();
    }

    init() {
        this.createPhotorealisticOcean();
        this.createRealisticSky();
        this.setupLighting();
        this.addVolumetricFog();
    }

    createPhotorealisticOcean() {
        // High-resolution ocean geometry for detailed waves
        const geometry = new THREE.PlaneGeometry(1000, 1000, 512, 512);
        
        // Photorealistic ocean shader inspired by Clark Little's wave photography
        const material = new THREE.ShaderMaterial({
            uniforms: {
                time: { value: 0 },
                waveHeight: { value: 2.0 },
                wavePeriod: { value: 8.0 },
                
                // Deep ocean colors - turquoise to deep blue gradient
                waterShallow: { value: new THREE.Color(0x00d4d4) }, // Bright turquoise
                waterMid: { value: new THREE.Color(0x0099cc) }, // Ocean blue
                waterDeep: { value: new THREE.Color(0x003366) }, // Deep ocean
                
                // Lighting
                sunDirection: { value: new THREE.Vector3(0.7, 0.6, 0.3).normalize() },
                sunColor: { value: new THREE.Color(0xffd4a3) }, // Golden hour sun
                skyColor: { value: new THREE.Color(0x87ceeb) },
                
                // Surface properties
                roughness: { value: 0.05 },
                metalness: { value: 0.0 },
                
                // Foam and whitecaps
                foamThreshold: { value: 0.75 },
                foamDepth: { value: 0.3 },
                
                // Camera for fresnel
                cameraPosition: { value: new THREE.Vector3() }
            },
            vertexShader: `
                precision highp float;
                
                uniform float time;
                uniform float waveHeight;
                uniform float wavePeriod;
                
                varying vec3 vWorldPos;
                varying vec3 vNormal;
                varying float vWaveHeight;
                varying vec2 vUv;
                varying vec3 vTangent;
                varying vec3 vBinormal;
                varying float vFoam;
                
                #define PI 3.14159265359
                
                // Realistic wave function using Gerstner waves
                vec3 gerstnerWave(vec2 coord, vec2 direction, float amplitude, float wavelength, float speed) {
                    float k = 2.0 * PI / wavelength;
                    float omega = sqrt(9.81 * k); // Deep water approximation
                    float phase = dot(direction, coord) * k - omega * time * speed;
                    float sine = sin(phase);
                    float cosine = cos(phase);
                    
                    vec3 result;
                    result.x = -direction.x * amplitude * sine;
                    result.y = -direction.y * amplitude * sine;
                    result.z = amplitude * cosine;
                    
                    return result;
                }
                
                void main() {
                    vUv = uv;
                    vec3 pos = position;
                    
                    // Multiple Gerstner waves for realistic ocean surface
                    vec3 wave1 = gerstnerWave(pos.xy, normalize(vec2(1.0, 0.0)), waveHeight * 0.5, 60.0, 1.0);
                    vec3 wave2 = gerstnerWave(pos.xy, normalize(vec2(0.7, 0.7)), waveHeight * 0.3, 31.0, 0.8);
                    vec3 wave3 = gerstnerWave(pos.xy, normalize(vec2(-0.7, 0.9)), waveHeight * 0.2, 18.0, 1.1);
                    vec3 wave4 = gerstnerWave(pos.xy, normalize(vec2(0.5, -0.8)), waveHeight * 0.15, 14.0, 1.3);
                    
                    // Combine waves
                    vec3 totalWave = wave1 + wave2 + wave3 + wave4;
                    pos += totalWave;
                    vWaveHeight = totalWave.z;
                    
                    // Calculate foam intensity based on wave steepness
                    float steepness = length(vec2(totalWave.x, totalWave.y)) / (totalWave.z + 0.1);
                    vFoam = smoothstep(0.8, 1.2, steepness);
                    
                    // Calculate normal using neighboring points
                    float delta = 1.0;
                    vec3 neighborX = position + vec3(delta, 0.0, 0.0);
                    vec3 neighborY = position + vec3(0.0, delta, 0.0);
                    
                    vec3 waveX = gerstnerWave(neighborX.xy, normalize(vec2(1.0, 0.0)), waveHeight * 0.5, 60.0, 1.0) +
                                 gerstnerWave(neighborX.xy, normalize(vec2(0.7, 0.7)), waveHeight * 0.3, 31.0, 0.8) +
                                 gerstnerWave(neighborX.xy, normalize(vec2(-0.7, 0.9)), waveHeight * 0.2, 18.0, 1.1) +
                                 gerstnerWave(neighborX.xy, normalize(vec2(0.5, -0.8)), waveHeight * 0.15, 14.0, 1.3);
                    
                    vec3 waveY = gerstnerWave(neighborY.xy, normalize(vec2(1.0, 0.0)), waveHeight * 0.5, 60.0, 1.0) +
                                 gerstnerWave(neighborY.xy, normalize(vec2(0.7, 0.7)), waveHeight * 0.3, 31.0, 0.8) +
                                 gerstnerWave(neighborY.xy, normalize(vec2(-0.7, 0.9)), waveHeight * 0.2, 18.0, 1.1) +
                                 gerstnerWave(neighborY.xy, normalize(vec2(0.5, -0.8)), waveHeight * 0.15, 14.0, 1.3);
                    
                    neighborX += waveX;
                    neighborY += waveY;
                    
                    vTangent = normalize(neighborX - pos);
                    vBinormal = normalize(neighborY - pos);
                    vNormal = normalize(cross(vBinormal, vTangent));
                    
                    vWorldPos = (modelMatrix * vec4(pos, 1.0)).xyz;
                    gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
                }
            `,
            fragmentShader: `
                precision highp float;
                
                uniform float time;
                uniform float waveHeight;
                uniform vec3 waterShallow;
                uniform vec3 waterMid;
                uniform vec3 waterDeep;
                uniform vec3 sunDirection;
                uniform vec3 sunColor;
                uniform vec3 skyColor;
                uniform float roughness;
                uniform float foamThreshold;
                uniform float foamDepth;
                uniform vec3 cameraPosition;
                
                varying vec3 vWorldPos;
                varying vec3 vNormal;
                varying float vWaveHeight;
                varying vec2 vUv;
                varying vec3 vTangent;
                varying vec3 vBinormal;
                varying float vFoam;
                
                // Realistic water BRDF
                vec3 fresnelSchlick(float cosTheta, vec3 F0) {
                    return F0 + (1.0 - F0) * pow(1.0 - cosTheta, 5.0);
                }
                
                float distributionGGX(vec3 N, vec3 H, float roughness) {
                    float a = roughness * roughness;
                    float a2 = a * a;
                    float NdotH = max(dot(N, H), 0.0);
                    float NdotH2 = NdotH * NdotH;
                    
                    float num = a2;
                    float denom = (NdotH2 * (a2 - 1.0) + 1.0);
                    denom = 3.14159265359 * denom * denom;
                    
                    return num / denom;
                }
                
                float geometrySchlickGGX(float NdotV, float roughness) {
                    float r = (roughness + 1.0);
                    float k = (r * r) / 8.0;
                    
                    float num = NdotV;
                    float denom = NdotV * (1.0 - k) + k;
                    
                    return num / denom;
                }
                
                float geometrySmith(vec3 N, vec3 V, vec3 L, float roughness) {
                    float NdotV = max(dot(N, V), 0.0);
                    float NdotL = max(dot(N, L), 0.0);
                    float ggx2 = geometrySchlickGGX(NdotV, roughness);
                    float ggx1 = geometrySchlickGGX(NdotL, roughness);
                    
                    return ggx1 * ggx2;
                }
                
                void main() {
                    vec3 N = normalize(vNormal);
                    vec3 V = normalize(cameraPosition - vWorldPos);
                    vec3 L = normalize(sunDirection);
                    vec3 H = normalize(V + L);
                    
                    // Water color based on depth and viewing angle
                    float depth = smoothstep(-2.0, 2.0, vWaveHeight);
                    float viewAngle = max(dot(N, V), 0.0);
                    
                    // Turquoise in shallow/crest areas, deep blue in troughs
                    vec3 waterColor = mix(waterDeep, waterShallow, depth);
                    waterColor = mix(waterColor, waterMid, viewAngle * 0.5);
                    
                    // Subsurface scattering for that translucent wave look
                    vec3 lightDir = normalize(sunDirection);
                    float subsurface = pow(max(dot(V, -lightDir), 0.0), 3.0) * depth;
                    waterColor += waterShallow * subsurface * 0.5;
                    
                    // Realistic water BRDF
                    vec3 F0 = vec3(0.02); // Water F0
                    vec3 F = fresnelSchlick(max(dot(H, V), 0.0), F0);
                    float NDF = distributionGGX(N, H, roughness);
                    float G = geometrySmith(N, V, L, roughness);
                    
                    vec3 numerator = NDF * G * F;
                    float denominator = 4.0 * max(dot(N, V), 0.0) * max(dot(N, L), 0.0) + 0.001;
                    vec3 specular = numerator / denominator;
                    
                    // Diffuse component
                    vec3 kS = F;
                    vec3 kD = vec3(1.0) - kS;
                    
                    float NdotL = max(dot(N, L), 0.0);
                    vec3 diffuse = waterColor * kD / 3.14159265359;
                    
                    // Combine lighting
                    vec3 color = (diffuse + specular) * sunColor * NdotL;
                    
                    // Add sky reflection
                    vec3 reflectDir = reflect(-V, N);
                    float skyMix = pow(1.0 - viewAngle, 2.0);
                    color += skyColor * skyMix * 0.3;
                    
                    // Foam rendering
                    float foam = vFoam;
                    
                    // Additional foam in wave crests
                    foam += smoothstep(foamThreshold, foamThreshold + 0.2, vWaveHeight / (waveHeight + 0.1));
                    
                    // Foam texture using noise
                    float foamPattern = sin(vWorldPos.x * 0.1 + time * 2.0) * 
                                       sin(vWorldPos.y * 0.1 - time * 1.5) * 
                                       sin(vWorldPos.z * 0.2 + time);
                    foam *= 0.7 + 0.3 * foamPattern;
                    
                    // Mix foam
                    vec3 foamColor = vec3(1.0, 1.0, 1.0);
                    color = mix(color, foamColor, clamp(foam, 0.0, 1.0));
                    
                    // Atmospheric perspective
                    float distance = length(cameraPosition - vWorldPos);
                    float fogFactor = exp(-distance * 0.0005);
                    color = mix(skyColor * 0.8, color, fogFactor);
                    
                    gl_FragColor = vec4(color, 0.95);
                }
            `,
            transparent: true,
            side: THREE.DoubleSide
        });
        
        this.oceanMesh = new THREE.Mesh(geometry, material);
        this.oceanMesh.rotation.x = -Math.PI / 2;
        this.scene.add(this.oceanMesh);
        
        // Store material for updates
        this.oceanMaterial = material;
    }

    createRealisticSky() {
        // Create a realistic sky dome with gradient
        const skyGeo = new THREE.SphereGeometry(500, 64, 64);
        const skyMat = new THREE.ShaderMaterial({
            uniforms: {
                topColor: { value: new THREE.Color(0x5588aa) },
                bottomColor: { value: new THREE.Color(0xffd4a3) }, // Golden horizon
                offset: { value: 20 },
                exponent: { value: 0.6 },
                sunPosition: { value: new THREE.Vector3(100, 30, -100) }
            },
            vertexShader: `
                varying vec3 vWorldPosition;
                varying vec3 vSunDirection;
                
                uniform vec3 sunPosition;
                
                void main() {
                    vec4 worldPosition = modelMatrix * vec4(position, 1.0);
                    vWorldPosition = worldPosition.xyz;
                    vSunDirection = normalize(sunPosition);
                    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
                }
            `,
            fragmentShader: `
                uniform vec3 topColor;
                uniform vec3 bottomColor;
                uniform float offset;
                uniform float exponent;
                
                varying vec3 vWorldPosition;
                varying vec3 vSunDirection;
                
                void main() {
                    float h = normalize(vWorldPosition + offset).y;
                    float mixStrength = pow(max(h, 0.0), exponent);
                    
                    vec3 color = mix(bottomColor, topColor, mixStrength);
                    
                    // Add sun glow
                    vec3 viewDirection = normalize(vWorldPosition);
                    float sunAngle = dot(viewDirection, vSunDirection);
                    float sunGlow = pow(max(sunAngle, 0.0), 128.0);
                    color += vec3(1.0, 0.9, 0.7) * sunGlow;
                    
                    gl_FragColor = vec4(color, 1.0);
                }
            `,
            side: THREE.BackSide
        });
        
        const sky = new THREE.Mesh(skyGeo, skyMat);
        this.scene.add(sky);
    }

    setupLighting() {
        // Golden hour lighting setup
        const sunLight = new THREE.DirectionalLight(0xffd4a3, 2.0);
        sunLight.position.set(100, 30, -100);
        sunLight.castShadow = true;
        sunLight.shadow.mapSize.width = 4096;
        sunLight.shadow.mapSize.height = 4096;
        sunLight.shadow.camera.near = 0.5;
        sunLight.shadow.camera.far = 1000;
        sunLight.shadow.camera.left = -500;
        sunLight.shadow.camera.right = 500;
        sunLight.shadow.camera.top = 500;
        sunLight.shadow.camera.bottom = -500;
        this.scene.add(sunLight);
        
        // Sky light for ambient
        const skyLight = new THREE.HemisphereLight(0x87ceeb, 0x5588aa, 0.6);
        this.scene.add(skyLight);
        
        // Subtle fill light
        const fillLight = new THREE.DirectionalLight(0xaaccff, 0.3);
        fillLight.position.set(-100, 50, 100);
        this.scene.add(fillLight);
    }

    addVolumetricFog() {
        // Use exponential fog for atmospheric perspective
        this.scene.fog = new THREE.FogExp2(0xaabbcc, 0.0003);
    }

    updateWaveConditions(conditions) {
        gsap.to(this.waveParams, {
            height: conditions.waveHeight / 3.28084, // Convert feet to meters
            period: conditions.wavePeriod,
            windSpeed: conditions.windSpeed,
            duration: 2,
            ease: "power2.inOut",
            onUpdate: () => {
                if (this.oceanMaterial) {
                    this.oceanMaterial.uniforms.waveHeight.value = this.waveParams.height;
                    this.oceanMaterial.uniforms.wavePeriod.value = this.waveParams.period;
                }
            }
        });
    }

    update(elapsedTime, camera) {
        if (this.oceanMaterial) {
            this.oceanMaterial.uniforms.time.value = elapsedTime;
            this.oceanMaterial.uniforms.cameraPosition.value.copy(camera.position);
        }
    }
}