import * as THREE from 'three';
import { gsap } from 'gsap';

export class CinematicLocationSystem {
    constructor(scene) {
        this.scene = scene;
        this.locations = {};
        this.activeLocation = null;
        
        this.surfSpots = {
            smithPoint: {
                position: new THREE.Vector3(200, 5, -150),
                name: 'Smith Point',
                cameraPosition: new THREE.Vector3(180, 20, -120),
                cameraLookAt: new THREE.Vector3(200, 0, -150)
            },
            brick: {
                position: new THREE.Vector3(-200, 5, 150),
                name: 'Brick',
                cameraPosition: new THREE.Vector3(-180, 20, 120),
                cameraLookAt: new THREE.Vector3(-200, 0, 150)
            }
        };
        
        this.init();
    }

    init() {
        Object.entries(this.surfSpots).forEach(([key, spot]) => {
            this.createCinematicLocation(key, spot);
        });
    }

    createCinematicLocation(key, spot) {
        const group = new THREE.Group();
        
        // Create a subtle glow on the water surface
        const glowGeometry = new THREE.PlaneGeometry(100, 100);
        const glowMaterial = new THREE.ShaderMaterial({
            uniforms: {
                color: { value: new THREE.Color(0x00ffff) },
                opacity: { value: 0.3 },
                time: { value: 0 }
            },
            vertexShader: `
                varying vec2 vUv;
                void main() {
                    vUv = uv;
                    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
                }
            `,
            fragmentShader: `
                uniform vec3 color;
                uniform float opacity;
                uniform float time;
                varying vec2 vUv;
                
                void main() {
                    vec2 center = vec2(0.5, 0.5);
                    float dist = distance(vUv, center);
                    
                    // Radial gradient with pulsing
                    float alpha = (1.0 - smoothstep(0.0, 0.5, dist)) * opacity;
                    alpha *= 0.8 + 0.2 * sin(time * 2.0);
                    
                    gl_FragColor = vec4(color, alpha);
                }
            `,
            transparent: true,
            blending: THREE.AdditiveBlending,
            depthWrite: false
        });
        
        const glow = new THREE.Mesh(glowGeometry, glowMaterial);
        glow.rotation.x = -Math.PI / 2;
        glow.position.y = 0.1;
        group.add(glow);
        
        // Create floating UI element (will be positioned in screen space)
        const canvas = document.createElement('canvas');
        canvas.width = 512;
        canvas.height = 256;
        const ctx = canvas.getContext('2d');
        
        // Modern glass-morphism style
        ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
        ctx.fillRect(0, 0, 512, 256);
        
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.2)';
        ctx.lineWidth = 2;
        ctx.strokeRect(0, 0, 512, 256);
        
        ctx.fillStyle = 'white';
        ctx.font = 'bold 48px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(spot.name, 256, 128);
        
        const texture = new THREE.CanvasTexture(canvas);
        const spriteMaterial = new THREE.SpriteMaterial({
            map: texture,
            transparent: true,
            opacity: 0
        });
        
        const sprite = new THREE.Sprite(spriteMaterial);
        sprite.scale.set(40, 20, 1);
        sprite.position.y = 30;
        group.add(sprite);
        
        group.position.copy(spot.position);
        
        this.locations[key] = {
            group: group,
            glow: glow,
            glowMaterial: glowMaterial,
            sprite: sprite,
            spriteMaterial: spriteMaterial,
            spot: spot,
            active: false
        };
        
        this.scene.add(group);
    }

    focusLocation(key, camera, controls) {
        const location = this.locations[key];
        if (!location) return;
        
        // Deactivate previous location
        if (this.activeLocation && this.activeLocation !== location) {
            this.deactivateLocation(this.activeLocation);
        }
        
        this.activeLocation = location;
        location.active = true;
        
        // Cinematic camera movement
        gsap.to(camera.position, {
            x: location.spot.cameraPosition.x,
            y: location.spot.cameraPosition.y,
            z: location.spot.cameraPosition.z,
            duration: 3,
            ease: "power2.inOut",
            onUpdate: () => {
                controls.target.lerp(location.spot.cameraLookAt, 0.1);
                controls.update();
            }
        });
        
        // Fade in location UI
        gsap.to(location.spriteMaterial, {
            opacity: 0.9,
            duration: 1,
            delay: 1
        });
        
        // Enhance glow
        gsap.to(location.glowMaterial.uniforms.opacity, {
            value: 0.6,
            duration: 1
        });
    }

    deactivateLocation(location) {
        location.active = false;
        
        gsap.to(location.spriteMaterial, {
            opacity: 0,
            duration: 0.5
        });
        
        gsap.to(location.glowMaterial.uniforms.opacity, {
            value: 0.3,
            duration: 0.5
        });
    }

    updateConditions(locationKey, conditions) {
        const location = this.locations[locationKey];
        if (!location) return;
        
        // Update glow color based on conditions
        let glowColor;
        switch (conditions.quality.rating) {
            case 'excellent':
                glowColor = new THREE.Color(0xffcc00); // Gold
                break;
            case 'good':
                glowColor = new THREE.Color(0x00ff88); // Green
                break;
            case 'fair':
                glowColor = new THREE.Color(0x00aaff); // Blue
                break;
            default:
                glowColor = new THREE.Color(0x666666); // Gray
                break;
        }
        
        gsap.to(location.glowMaterial.uniforms.color.value, {
            r: glowColor.r,
            g: glowColor.g,
            b: glowColor.b,
            duration: 1
        });
    }

    update(elapsedTime) {
        Object.values(this.locations).forEach(location => {
            if (location.glowMaterial) {
                location.glowMaterial.uniforms.time.value = elapsedTime;
            }
            
            // Gentle floating animation for sprites
            if (location.sprite && location.active) {
                location.sprite.position.y = 30 + Math.sin(elapsedTime) * 2;
            }
        });
    }
}