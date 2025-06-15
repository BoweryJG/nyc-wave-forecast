import * as THREE from 'three';
import { gsap } from 'gsap';

export class Shark {
    constructor(scene) {
        this.scene = scene;
        this.sharkGroup = new THREE.Group();
        this.isAnimating = false;
        this.surfboardPieces = [];
        
        this.init();
    }

    init() {
        this.createShark();
        this.createSurfer();
        
        // Initially hide shark underwater
        this.sharkGroup.position.set(0, -30, 0);
        this.sharkGroup.visible = false;
        this.scene.add(this.sharkGroup);
    }

    createShark() {
        const sharkBody = new THREE.Group();
        
        // MASSIVE GREAT WHITE - 25 feet long!
        const sharkLength = 25;
        
        // Main body with realistic segments
        const bodyParts = [];
        const bodyMaterial = new THREE.MeshPhongMaterial({
            color: 0x2c3e50,
            emissive: 0x1a252f,
            emissiveIntensity: 0.3,
            shininess: 100,
            specular: 0x222222
        });
        
        // Build body in segments for realistic shape
        for (let i = 0; i < 10; i++) {
            const t = i / 9;
            const radius = Math.sin(t * Math.PI) * 4 + 1;
            const segment = new THREE.SphereGeometry(radius, 16, 8);
            const mesh = new THREE.Mesh(segment, bodyMaterial);
            mesh.position.x = (t - 0.5) * sharkLength;
            mesh.scale.y = 0.7;
            bodyParts.push(mesh);
            sharkBody.add(mesh);
        }
        
        // Massive head with realistic shape
        const headGeometry = new THREE.ConeGeometry(4, 8, 16);
        const head = new THREE.Mesh(headGeometry, bodyMaterial);
        head.rotation.z = -Math.PI / 2;
        head.position.x = sharkLength / 2 - 2;
        head.scale.set(1.5, 1.2, 1);
        sharkBody.add(head);
        
        // Menacing snout
        const snoutGeometry = new THREE.ConeGeometry(2, 4, 8);
        const snout = new THREE.Mesh(snoutGeometry, bodyMaterial);
        snout.rotation.z = -Math.PI / 2;
        snout.position.x = sharkLength / 2 + 2;
        sharkBody.add(snout);
        
        // HUGE dorsal fin
        const dorsalGeometry = new THREE.BufferGeometry();
        const dorsalVertices = new Float32Array([
            0, 0, 0,
            -4, 8, 0,
            -6, 0, 0,
            0, 0, 0.5,
            -4, 8, 0.5,
            -6, 0, 0.5
        ]);
        dorsalGeometry.setAttribute('position', new THREE.BufferAttribute(dorsalVertices, 3));
        dorsalGeometry.setIndex([0,1,2, 3,4,5, 0,3,1, 1,3,4, 1,4,2, 2,4,5, 2,5,0, 0,5,3]);
        dorsalGeometry.computeVertexNormals();
        
        const dorsalFin = new THREE.Mesh(dorsalGeometry, bodyMaterial);
        dorsalFin.position.set(2, 4, 0);
        sharkBody.add(dorsalFin);
        
        // Side fins (pectoral fins)
        const pectoralGeometry = new THREE.ConeGeometry(3, 8, 4);
        const leftFin = new THREE.Mesh(pectoralGeometry, bodyMaterial);
        leftFin.position.set(5, -2, 5);
        leftFin.rotation.z = Math.PI / 3;
        leftFin.rotation.x = -Math.PI / 6;
        leftFin.scale.set(0.5, 1, 1.5);
        sharkBody.add(leftFin);
        
        const rightFin = new THREE.Mesh(pectoralGeometry, bodyMaterial);
        rightFin.position.set(5, -2, -5);
        rightFin.rotation.z = Math.PI / 3;
        rightFin.rotation.x = Math.PI / 6;
        rightFin.scale.set(0.5, 1, 1.5);
        sharkBody.add(rightFin);
        
        // MASSIVE tail fin
        const tailFinGeometry = new THREE.BufferGeometry();
        const tailVertices = new Float32Array([
            0, 0, 0,
            -6, 6, 0,
            -6, -6, 0,
            0, 0, 1,
            -6, 6, 1,
            -6, -6, 1
        ]);
        tailFinGeometry.setAttribute('position', new THREE.BufferAttribute(tailVertices, 3));
        tailFinGeometry.setIndex([0,1,2, 3,4,5, 0,3,1, 1,3,4, 1,4,2, 2,4,5, 2,5,0, 0,5,3]);
        tailFinGeometry.computeVertexNormals();
        
        const tailFin = new THREE.Mesh(tailFinGeometry, bodyMaterial);
        tailFin.position.set(-sharkLength / 2, 0, 0);
        tailFin.scale.z = 3;
        sharkBody.add(tailFin);
        
        // Evil black eyes
        const eyeGeometry = new THREE.SphereGeometry(1, 16, 16);
        const eyeMaterial = new THREE.MeshPhongMaterial({ 
            color: 0x000000,
            emissive: 0x000000,
            shininess: 100
        });
        
        const leftEye = new THREE.Mesh(eyeGeometry, eyeMaterial);
        leftEye.position.set(sharkLength / 2 - 4, 1, 3);
        sharkBody.add(leftEye);
        
        const rightEye = new THREE.Mesh(eyeGeometry, eyeMaterial);
        rightEye.position.set(sharkLength / 2 - 4, 1, -3);
        sharkBody.add(rightEye);
        
        // White underbelly
        const bellyGeometry = new THREE.CylinderGeometry(3, 2, sharkLength * 0.8, 8, 1, false, Math.PI, Math.PI);
        const bellyMaterial = new THREE.MeshPhongMaterial({
            color: 0xeeeeee,
            emissive: 0xcccccc,
            emissiveIntensity: 0.1
        });
        const belly = new THREE.Mesh(bellyGeometry, bellyMaterial);
        belly.rotation.z = Math.PI / 2;
        belly.position.y = -2;
        sharkBody.add(belly);
        
        // TERRIFYING JAWS AND TEETH
        const jawGroup = new THREE.Group();
        
        // Upper jaw
        const upperJawGeometry = new THREE.BoxGeometry(6, 2, 8);
        const jawMaterial = new THREE.MeshPhongMaterial({
            color: 0xff6666,
            emissive: 0xcc0000,
            emissiveIntensity: 0.2
        });
        const upperJaw = new THREE.Mesh(upperJawGeometry, jawMaterial);
        upperJaw.position.set(sharkLength / 2, -1, 0);
        jawGroup.add(upperJaw);
        
        // Lower jaw (animated)
        const lowerJawGeometry = new THREE.BoxGeometry(6, 2, 8);
        const lowerJaw = new THREE.Mesh(lowerJawGeometry, jawMaterial);
        lowerJaw.position.set(sharkLength / 2, -3, 0);
        this.lowerJaw = lowerJaw;
        jawGroup.add(lowerJaw);
        
        // ROWS OF RAZOR SHARP TEETH
        const teethMaterial = new THREE.MeshPhongMaterial({ 
            color: 0xffffff,
            emissive: 0xffffff,
            emissiveIntensity: 0.1,
            shininess: 100
        });
        
        // Upper teeth - multiple rows!
        for (let row = 0; row < 3; row++) {
            for (let i = 0; i < 12; i++) {
                const toothGeometry = new THREE.ConeGeometry(0.3 - row * 0.05, 1.5 - row * 0.3, 4);
                const tooth = new THREE.Mesh(toothGeometry, teethMaterial);
                tooth.position.set(
                    sharkLength / 2 + 2 - row * 0.5, 
                    -2, 
                    (i - 6) * 0.7
                );
                tooth.rotation.z = Math.PI + (Math.random() - 0.5) * 0.2;
                jawGroup.add(tooth);
            }
        }
        
        // Lower teeth
        for (let row = 0; row < 2; row++) {
            for (let i = 0; i < 10; i++) {
                const toothGeometry = new THREE.ConeGeometry(0.25 - row * 0.05, 1.2 - row * 0.3, 4);
                const tooth = new THREE.Mesh(toothGeometry, teethMaterial);
                tooth.position.set(
                    sharkLength / 2 + 2 - row * 0.5, 
                    -2.5, 
                    (i - 5) * 0.8
                );
                tooth.rotation.z = 0;
                lowerJaw.add(tooth);
            }
        }
        
        // Gills
        for (let i = 0; i < 5; i++) {
            const gillGeometry = new THREE.BoxGeometry(0.1, 3, 0.5);
            const gillMaterial = new THREE.MeshBasicMaterial({ color: 0x000000 });
            const gill = new THREE.Mesh(gillGeometry, gillMaterial);
            gill.position.set(5 - i * 1.5, 0, 4);
            sharkBody.add(gill);
            
            const gillRight = gill.clone();
            gillRight.position.z = -4;
            sharkBody.add(gillRight);
        }
        
        // Scars for character
        const scarGeometry = new THREE.BoxGeometry(0.2, 5, 0.1);
        const scarMaterial = new THREE.MeshBasicMaterial({ color: 0x1a1a1a });
        const scar1 = new THREE.Mesh(scarGeometry, scarMaterial);
        scar1.position.set(0, 2, 3);
        scar1.rotation.z = 0.3;
        sharkBody.add(scar1);
        
        const scar2 = new THREE.Mesh(scarGeometry, scarMaterial);
        scar2.position.set(-5, 1, -2);
        scar2.rotation.z = -0.2;
        scar2.scale.y = 0.7;
        sharkBody.add(scar2);
        
        sharkBody.add(jawGroup);
        this.jawGroup = jawGroup;
        
        // Scale the entire shark
        sharkBody.scale.set(0.7, 0.7, 0.7);
        
        this.shark = sharkBody;
        this.sharkGroup.add(sharkBody);
    }

    createSurfer() {
        const surferGroup = new THREE.Group();
        
        // Surfboard
        const boardGeometry = new THREE.BoxGeometry(2, 0.3, 6);
        const boardMaterial = new THREE.MeshPhongMaterial({
            color: 0xffcc00,
            emissive: 0xff9900,
            emissiveIntensity: 0.1
        });
        const board = new THREE.Mesh(boardGeometry, boardMaterial);
        surferGroup.add(board);
        
        // Simple surfer (will be eaten!)
        const surferBodyGeo = new THREE.CapsuleGeometry(0.8, 3, 4, 8);
        const surferMaterial = new THREE.MeshPhongMaterial({
            color: 0xffdbac
        });
        const surferBody = new THREE.Mesh(surferBodyGeo, surferMaterial);
        surferBody.position.y = 2;
        surferGroup.add(surferBody);
        
        // Head
        const headGeo = new THREE.SphereGeometry(0.8, 8, 8);
        const head = new THREE.Mesh(headGeo, surferMaterial);
        head.position.y = 4;
        surferGroup.add(head);
        
        // Position surfer on the surface
        surferGroup.position.set(0, 5, 0);
        
        this.surfer = surferGroup;
        this.sharkGroup.add(surferGroup);
    }

    attack() {
        if (this.isAnimating) return;
        this.isAnimating = true;
        
        // Show shark
        this.sharkGroup.visible = true;
        
        // Create attack timeline
        const timeline = gsap.timeline({
            onComplete: () => {
                this.isAnimating = false;
                // Hide everything after animation
                setTimeout(() => {
                    this.sharkGroup.visible = false;
                    this.reset();
                }, 3000);
            }
        });
        
        // Shark emerges from below
        timeline
            .to(this.sharkGroup.position, {
                y: 10,
                duration: 1,
                ease: "power2.out"
            })
            .to(this.shark.rotation, {
                z: 0.3,
                duration: 0.5,
                ease: "power2.inOut"
            }, "-=0.5")
            // Chomp!
            .to(this.shark.position, {
                x: 10,
                duration: 0.3,
                ease: "power4.in",
                onComplete: () => {
                    this.destroySurfer();
                }
            })
            // Shake
            .to(this.shark.rotation, {
                z: -0.2,
                duration: 0.1,
                repeat: 3,
                yoyo: true
            })
            // Dive back down
            .to(this.sharkGroup.position, {
                y: -30,
                duration: 1.5,
                ease: "power2.in"
            })
            .to(this.sharkGroup.rotation, {
                x: -0.5,
                duration: 1.5,
                ease: "power2.in"
            }, "-=1.5");
            
        // Add splash particles
        this.createSplash();
    }

    destroySurfer() {
        // MASSIVE BLOOD EFFECT - TEETH AND BLOOD!
        this.createBloodEffect();
        
        // Hide surfer (he's been eaten!)
        this.surfer.visible = false;
        
        // Create surfboard pieces with blood on them
        for (let i = 0; i < 5; i++) { // More pieces for more destruction
            const pieceGeo = new THREE.BoxGeometry(
                Math.random() * 1 + 0.5,
                0.3,
                Math.random() * 2 + 1
            );
            
            // Some pieces are bloody
            const isBloodied = Math.random() > 0.5;
            const pieceMat = new THREE.MeshPhongMaterial({
                color: isBloodied ? 0x990000 : 0xffcc00, // Some pieces are bloody
                emissive: isBloodied ? 0x330000 : 0x000000
            });
            
            const piece = new THREE.Mesh(pieceGeo, pieceMat);
            piece.position.copy(this.surfer.position);
            piece.position.x += (Math.random() - 0.5) * 8; // Spread pieces wider
            piece.position.z += (Math.random() - 0.5) * 8;
            piece.position.y += Math.random() * 2; // Some pieces fly up
            
            this.surfboardPieces.push(piece);
            this.scene.add(piece);
            
            // Animate pieces floating with more violence
            gsap.to(piece.position, {
                y: 0,
                duration: 2 + Math.random(),
                ease: "power2.out"
            });
            gsap.to(piece.rotation, {
                x: Math.random() * Math.PI * 2,
                y: Math.random() * Math.PI * 2,
                z: Math.random() * Math.PI * 2,
                duration: 3 + Math.random()
            });
        }
        
        // Add some body parts (dark objects) for extra gore
        for (let i = 0; i < 3; i++) {
            const bodyPartGeo = new THREE.SphereGeometry(0.3 + Math.random() * 0.2, 8, 8);
            const bodyPartMat = new THREE.MeshPhongMaterial({
                color: 0x8B4513, // Brown flesh color
                emissive: 0x220000
            });
            
            const bodyPart = new THREE.Mesh(bodyPartGeo, bodyPartMat);
            bodyPart.position.copy(this.surfer.position);
            bodyPart.position.x += (Math.random() - 0.5) * 6;
            bodyPart.position.z += (Math.random() - 0.5) * 6;
            bodyPart.position.y += Math.random() * 3;
            
            this.surfboardPieces.push(bodyPart); // Track for cleanup
            this.scene.add(bodyPart);
            
            // Animate body parts sinking
            gsap.to(bodyPart.position, {
                y: -5, // Sink below surface
                duration: 3 + Math.random() * 2,
                ease: "power2.in"
            });
            
            gsap.to(bodyPart.rotation, {
                x: Math.random() * Math.PI,
                y: Math.random() * Math.PI,
                z: Math.random() * Math.PI,
                duration: 4
            });
        }
    }

    createSplash() {
        const splashCount = 50;
        const splashGeometry = new THREE.SphereGeometry(0.2, 4, 4);
        const splashMaterial = new THREE.MeshBasicMaterial({
            color: 0xffffff,
            transparent: true,
            opacity: 0.8
        });
        
        for (let i = 0; i < splashCount; i++) {
            const splash = new THREE.Mesh(splashGeometry, splashMaterial);
            splash.position.copy(this.sharkGroup.position);
            splash.position.x += (Math.random() - 0.5) * 10;
            splash.position.z += (Math.random() - 0.5) * 10;
            this.scene.add(splash);
            
            const velocity = new THREE.Vector3(
                (Math.random() - 0.5) * 20,
                Math.random() * 20 + 10,
                (Math.random() - 0.5) * 20
            );
            
            gsap.to(splash.position, {
                x: splash.position.x + velocity.x,
                y: 0,
                z: splash.position.z + velocity.z,
                duration: 1,
                ease: "power2.out",
                onComplete: () => {
                    this.scene.remove(splash);
                }
            });
            
            gsap.to(splash.material, {
                opacity: 0,
                duration: 1
            });
        }
    }

    createBloodEffect() {
        // MASSIVE BLOOD SPRAY when shark bites!
        const bloodParticleCount = 150;
        const bloodParticles = [];
        
        // Create blood particle geometry
        const bloodGeometry = new THREE.SphereGeometry(0.15, 6, 6);
        
        for (let i = 0; i < bloodParticleCount; i++) {
            // Different blood colors for realism
            const bloodIntensity = Math.random();
            const bloodColor = bloodIntensity > 0.7 ? 
                new THREE.Color(0x990000) : // Dark blood
                bloodIntensity > 0.4 ?
                new THREE.Color(0xcc0000) : // Medium blood
                new THREE.Color(0xff0000);  // Bright blood
            
            const bloodMaterial = new THREE.MeshBasicMaterial({
                color: bloodColor,
                transparent: true,
                opacity: 0.9
            });
            
            const bloodParticle = new THREE.Mesh(bloodGeometry, bloodMaterial);
            
            // Start at surfer position
            bloodParticle.position.copy(this.surfer.position);
            bloodParticle.position.x += (Math.random() - 0.5) * 2;
            bloodParticle.position.y += (Math.random() - 0.5) * 2;
            bloodParticle.position.z += (Math.random() - 0.5) * 2;
            
            this.scene.add(bloodParticle);
            bloodParticles.push(bloodParticle);
            
            // Blood spray velocity - explosive outward
            const velocity = new THREE.Vector3(
                (Math.random() - 0.5) * 30,
                Math.random() * 15 + 5,
                (Math.random() - 0.5) * 30
            );
            
            // Animate blood particles
            gsap.to(bloodParticle.position, {
                x: bloodParticle.position.x + velocity.x,
                y: Math.max(0, bloodParticle.position.y + velocity.y - 20), // Fall into water
                z: bloodParticle.position.z + velocity.z,
                duration: 2 + Math.random(),
                ease: "power2.out"
            });
            
            // Fade out blood
            gsap.to(bloodParticle.material, {
                opacity: 0,
                duration: 2 + Math.random(),
                onComplete: () => {
                    this.scene.remove(bloodParticle);
                }
            });
            
            // Scale particles as they spread
            gsap.to(bloodParticle.scale, {
                x: 0.3 + Math.random() * 0.7,
                y: 0.3 + Math.random() * 0.7,
                z: 0.3 + Math.random() * 0.7,
                duration: 1
            });
        }
        
        // Create blood trail in water
        this.createBloodTrail();
    }

    createBloodTrail() {
        // Expanding blood cloud in the water
        const trailCount = 30;
        
        for (let i = 0; i < trailCount; i++) {
            const trailGeometry = new THREE.SphereGeometry(0.8 + Math.random() * 0.4, 8, 8);
            const trailMaterial = new THREE.MeshBasicMaterial({
                color: new THREE.Color(0x660000), // Dark blood in water
                transparent: true,
                opacity: 0.3
            });
            
            const bloodCloud = new THREE.Mesh(trailGeometry, trailMaterial);
            bloodCloud.position.copy(this.surfer.position);
            bloodCloud.position.y = Math.random() * 3; // Just below surface
            bloodCloud.position.x += (Math.random() - 0.5) * 8;
            bloodCloud.position.z += (Math.random() - 0.5) * 8;
            
            this.scene.add(bloodCloud);
            
            // Expand blood cloud
            gsap.to(bloodCloud.scale, {
                x: 3 + Math.random() * 2,
                y: 1.5 + Math.random(),
                z: 3 + Math.random() * 2,
                duration: 4 + Math.random() * 3,
                ease: "power2.out"
            });
            
            // Fade blood trail
            gsap.to(trailMaterial, {
                opacity: 0,
                duration: 5 + Math.random() * 2,
                onComplete: () => {
                    this.scene.remove(bloodCloud);
                }
            });
        }
    }

    reset() {
        // Reset surfer visibility
        this.surfer.visible = true;
        
        // Remove surfboard pieces
        this.surfboardPieces.forEach(piece => {
            this.scene.remove(piece);
        });
        this.surfboardPieces = [];
        
        // Reset positions
        this.shark.position.x = -5;
        this.shark.rotation.z = 0;
        this.sharkGroup.rotation.x = 0;
        this.sharkGroup.position.set(0, -30, 0);
    }

    update(elapsedTime) {
        if (this.sharkGroup.visible && !this.isAnimating) {
            // Gentle swimming motion when visible
            this.shark.rotation.y = Math.sin(elapsedTime * 2) * 0.1;
            this.shark.position.y = Math.sin(elapsedTime * 3) * 0.5;
        }
    }
}