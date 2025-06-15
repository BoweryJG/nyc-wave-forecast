import * as THREE from 'three';
import { gsap } from 'gsap';

export class LocationMarkers {
    constructor(scene) {
        this.scene = scene;
        this.markers = {};
        
        this.locations = {
            smithPoint: {
                position: new THREE.Vector3(150, 10, -100),
                name: 'Smith Point',
                color: 0x00ff88
            },
            brick: {
                position: new THREE.Vector3(-150, 10, 100),
                name: 'Brick',
                color: 0x00a8ff
            }
        };
        
        this.init();
    }

    init() {
        Object.entries(this.locations).forEach(([key, location]) => {
            this.createLocationMarker(key, location);
        });
    }

    createLocationMarker(key, location) {
        const markerGroup = new THREE.Group();
        
        // Create a tall cylinder as a beacon
        const beaconGeometry = new THREE.CylinderGeometry(3, 5, 50, 16);
        const beaconMaterial = new THREE.MeshPhongMaterial({
            color: location.color,
            emissive: location.color,
            emissiveIntensity: 0.5,
            transparent: true,
            opacity: 0.9
        });
        const beacon = new THREE.Mesh(beaconGeometry, beaconMaterial);
        beacon.position.y = 25;
        markerGroup.add(beacon);
        
        // Add a glowing sphere at the top
        const sphereGeometry = new THREE.SphereGeometry(8, 32, 32);
        const sphereMaterial = new THREE.MeshPhongMaterial({
            color: location.color,
            emissive: location.color,
            emissiveIntensity: 0.7,
            transparent: true,
            opacity: 0.9
        });
        const sphere = new THREE.Mesh(sphereGeometry, sphereMaterial);
        sphere.position.y = 55;
        markerGroup.add(sphere);
        
        // Add a light source
        const light = new THREE.PointLight(location.color, 3, 150);
        light.position.y = 55;
        markerGroup.add(light);
        
        // Create text label with canvas
        const canvas = document.createElement('canvas');
        const context = canvas.getContext('2d');
        canvas.width = 512;
        canvas.height = 128;
        
        // Draw background
        context.fillStyle = 'rgba(0, 0, 0, 0.8)';
        context.roundRect(10, 10, 492, 108, 20);
        context.fill();
        
        // Draw text
        context.fillStyle = 'white';
        context.font = 'bold 48px Arial';
        context.textAlign = 'center';
        context.textBaseline = 'middle';
        context.fillText(location.name, 256, 64);
        
        const texture = new THREE.CanvasTexture(canvas);
        const spriteMaterial = new THREE.SpriteMaterial({
            map: texture,
            transparent: true
        });
        const sprite = new THREE.Sprite(spriteMaterial);
        sprite.scale.set(50, 12, 1);
        sprite.position.y = 75;
        markerGroup.add(sprite);
        
        // Add a ring on the water surface
        const ringGeometry = new THREE.RingGeometry(15, 20, 32);
        const ringMaterial = new THREE.MeshBasicMaterial({
            color: location.color,
            side: THREE.DoubleSide,
            transparent: true,
            opacity: 0.6
        });
        const ring = new THREE.Mesh(ringGeometry, ringMaterial);
        ring.rotation.x = -Math.PI / 2;
        ring.position.y = 0.1;
        markerGroup.add(ring);
        
        // Add inner glowing ring
        const innerRingGeometry = new THREE.RingGeometry(8, 15, 32);
        const innerRingMaterial = new THREE.MeshBasicMaterial({
            color: location.color,
            side: THREE.DoubleSide,
            transparent: true,
            opacity: 0.8
        });
        const innerRing = new THREE.Mesh(innerRingGeometry, innerRingMaterial);
        innerRing.rotation.x = -Math.PI / 2;
        innerRing.position.y = 0.2;
        markerGroup.add(innerRing);
        
        // Position the marker
        markerGroup.position.copy(location.position);
        
        // Add floating animation
        gsap.to(sphere.position, {
            y: 45,
            duration: 2,
            ease: "power1.inOut",
            repeat: -1,
            yoyo: true
        });
        
        // Add rotation animation
        gsap.to(sphere.rotation, {
            y: Math.PI * 2,
            duration: 10,
            ease: "none",
            repeat: -1
        });
        
        // Add pulsing light animation
        gsap.to(light, {
            intensity: 4,
            duration: 1.5,
            ease: "power2.inOut",
            repeat: -1,
            yoyo: true
        });
        
        // Add ring pulsing animation
        gsap.to(ring.scale, {
            x: 1.2,
            y: 1.2,
            duration: 2,
            ease: "power1.inOut",
            repeat: -1,
            yoyo: true
        });
        
        gsap.to(innerRing.scale, {
            x: 0.8,
            y: 0.8,
            duration: 2,
            ease: "power1.inOut",
            repeat: -1,
            yoyo: true
        });
        
        this.markers[key] = {
            group: markerGroup,
            sphere: sphere,
            light: light,
            material: sphereMaterial,
            ring: ring,
            innerRing: innerRing
        };
        
        this.scene.add(markerGroup);
    }

    updateConditions(locationKey, conditions) {
        const marker = this.markers[locationKey];
        if (!marker) return;
        
        // Update color intensity based on surf quality
        let intensity = 0.3;
        let lightIntensity = 2;
        
        switch (conditions.quality.rating) {
            case 'excellent':
                intensity = 0.8;
                lightIntensity = 5;
                // Make it golden for excellent conditions
                marker.material.color.setHex(0xffcc00);
                marker.material.emissive.setHex(0xffcc00);
                marker.light.color.setHex(0xffcc00);
                break;
            case 'good':
                intensity = 0.6;
                lightIntensity = 3;
                break;
            case 'fair':
                intensity = 0.4;
                lightIntensity = 2;
                break;
            default:
                intensity = 0.2;
                lightIntensity = 1;
                break;
        }
        
        marker.material.emissiveIntensity = intensity;
        
        // Animate the change
        gsap.to(marker.light, {
            intensity: lightIntensity,
            duration: 1,
            ease: "power2.inOut"
        });
    }

    update(elapsedTime) {
        // Add gentle rotation to markers
        Object.values(this.markers).forEach(marker => {
            marker.group.rotation.y = Math.sin(elapsedTime * 0.5) * 0.1;
        });
    }
}