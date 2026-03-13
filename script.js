<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Maze Runner: Shotgun Edition</title>
    <style>
        body { margin: 0; overflow: hidden; font-family: 'Courier New', Courier, monospace; }
        canvas { display: block; }
        
        /* UI Elements */
        #ui {
            position: absolute;
            top: 20px;
            left: 20px;
            background: rgba(0, 0, 0, 0.7);
            color: #00ffcc;
            padding: 15px;
            border-left: 5px solid #ff0055;
            pointer-events: none;
        }

        #crosshair {
            position: absolute;
            top: 50%;
            left: 50%;
            width: 20px;
            height: 20px;
            border: 2px solid rgba(255, 255, 255, 0.5);
            border-radius: 50%;
            transform: translate(-50%, -50%);
            pointer-events: none;
        }

        #crosshair::before, #crosshair::after {
            content: '';
            position: absolute;
            background: white;
        }
        #crosshair::before { top: 50%; left: -5px; width: 30px; height: 1px; transform: translateY(-50%); }
        #crosshair::after { left: 50%; top: -5px; width: 1px; height: 30px; transform: translateX(-50%); }

        .stat { color: #ff0055; font-weight: bold; margin-top: 10px; }
    </style>
</head>
<body>

    <div id="crosshair"></div>
    <div id="ui">
        <h1>Maze Runner: Exorcist</h1>
        <p>WASD: Move | Left Click: Fire Shotgun</p>
        <div id="kill-count" class="stat">Ghosts Slain: 0</div>
    </div>

    <script src="https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js"></script>

    <script>
        // --- 1. CORE SETUP ---
        const scene = new THREE.Scene();
        scene.background = new THREE.Color(0x020202); 
        const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
        const renderer = new THREE.WebGLRenderer({ antialias: true });
        renderer.setSize(window.innerWidth, window.innerHeight);
        document.body.appendChild(renderer.domElement);

        // --- 2. LIGHTING & MUZZLE FLASH ---
        const ambientLight = new THREE.AmbientLight(0x404040, 0.1); 
        scene.add(ambientLight);

        const flashLight = new THREE.PointLight(0xffffff, 1.2, 15); // Player's constant light
        scene.add(flashLight);

        const muzzleFlash = new THREE.PointLight(0xffaa00, 0, 20); // The Shotgun blast light
        scene.add(muzzleFlash);

        // --- 3. MAZE DATA ---
        const mazeData = [
            [1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1],
            [1, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1],
            [1, 0, 1, 1, 1, 0, 1, 0, 1, 1, 0, 1],
            [1, 0, 1, 0, 0, 0, 0, 0, 0, 1, 0, 1],
            [1, 0, 1, 0, 1, 1, 1, 1, 0, 1, 0, 1],
            [1, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 1],
            [1, 1, 1, 0, 1, 0, 1, 1, 1, 1, 0, 1],
            [1, 0, 0, 0, 0, 0, 0, 0, 0, 1, 0, 1],
            [1, 0, 1, 1, 1, 1, 1, 1, 0, 1, 0, 1],
            [1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1],
            [1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1],
        ];

        const unitSize = 6;
        const wallHeight = 8;
        const wallGeo = new THREE.BoxGeometry(unitSize, wallHeight, unitSize);
        const wallMat = new THREE.MeshStandardMaterial({ color: 0x111111 });

        for (let row = 0; row < mazeData.length; row++) {
            for (let col = 0; col < mazeData[row].length; col++) {
                if (mazeData[row][col] === 1) {
                    const wall = new THREE.Mesh(wallGeo, wallMat);
                    wall.position.set((col - mazeData[row].length / 2) * unitSize, wallHeight / 2, (row - mazeData.length / 2) * unitSize);
                    scene.add(wall);
                }
            }
        }

        const ground = new THREE.Mesh(new THREE.PlaneGeometry(200, 200), new THREE.MeshStandardMaterial({ color: 0x050505 }));
        ground.rotation.x = -Math.PI / 2;
        scene.add(ground);

        // --- 4. THE GOAL ---
        const goal = new THREE.Mesh(new THREE.TorusKnotGeometry(0.7, 0.2, 64, 8), new THREE.MeshStandardMaterial({ color: 0x00ffcc, emissive: 0x00ffcc }));
        goal.position.set(21, 2.5, 21); // Bottom right
        scene.add(goal);

        // --- 5. PLAYER, GHOSTS, & COMBAT ---
        let playerRotation = 0;
        let kills = 0;
        const startPos = { x: -25, z: -25 }; 
        camera.position.set(startPos.x, 2, startPos.z);

        const ghosts = [];
        const raycaster = new THREE.Raycaster();
        const centerScreen = new THREE.Vector2(0, 0); // Always aim at center

        function spawnGhost() {
            const ghost = new THREE.Mesh(
                new THREE.PlaneGeometry(3, 3), 
                new THREE.MeshBasicMaterial({ color: 0xff3333, transparent: true, opacity: 0.7, side: THREE.DoubleSide })
            );
            ghost.position.set(Math.random() * 40 - 20, 1.5, Math.random() * 40 - 20);
            scene.add(ghost);
            ghosts.push(ghost);
        }
        for(let i=0; i<6; i++) spawnGhost();

        // --- 6. SHOOTING LOGIC ---
        function shoot() {
            // Visual Muzzle Flash
            muzzleFlash.intensity = 10;
            setTimeout(() => { muzzleFlash.intensity = 0; }, 50);

            // Raycast from camera center
            raycaster.setFromCamera(centerScreen, camera);
            const intersects = raycaster.intersectObjects(ghosts);

            if (intersects.length > 0) {
                const target = intersects[0].object;
                
                // Remove ghost from scene
                scene.remove(target);
                
                // Remove from array
                const index = ghosts.indexOf(target);
                if (index > -1) ghosts.splice(index, 1);

                // Update UI
                kills++;
                document.getElementById('kill-count').innerText = `Ghosts Slain: ${kills}`;
                
                // Respawn a new one somewhere else to keep the game going
                setTimeout(spawnGhost, 2000);
            }
        }

        // --- 7. INPUT ---
        const keys = { KeyW: false, KeyA: false, KeyS: false, KeyD: false, ArrowLeft: false, ArrowRight: false };
        window.addEventListener('keydown', (e) => { if (e.code in keys) keys[e.code] = true; });
        window.addEventListener('keyup', (e) => { if (e.code in keys) keys[e.code] = false; });
        
        // Shooting Listeners
        window.addEventListener('mousedown', (e) => { if (e.button === 0) shoot(); });
        window.addEventListener('keydown', (e) => { if (e.code === 'Space') shoot(); });

        function isWall(x, z) {
            const col = Math.floor((x / unitSize) + (mazeData[0].length / 2) + 0.5);
            const row = Math.floor((z / unitSize) + (mazeData.length / 2) + 0.5);
            if (row < 0 || row >= mazeData.length || col < 0 || col >= mazeData[0].length) return true;
            return mazeData[row][col] === 1;
        }

        // --- 8. ANIMATION LOOP ---
        function animate() {
            requestAnimationFrame(animate);

            // Movement & Rotation
            if (keys.ArrowLeft) playerRotation += 0.04;
            if (keys.ArrowRight) playerRotation -= 0.04;
            camera.rotation.y = playerRotation;

            let dx = 0, dz = 0;
            if (keys.KeyW) { dx += -Math.sin(playerRotation) * 0.15; dz += -Math.cos(playerRotation) * 0.15; }
            if (keys.KeyS) { dx -= -Math.sin(playerRotation) * 0.15; dz -= -Math.cos(playerRotation) * 0.15; }
            
            if (!isWall(camera.position.x + dx, camera.position.z)) camera.position.x += dx;
            if (!isWall(camera.position.x, camera.position.z + dz)) camera.position.z += dz;

            // Update Lights
            flashLight.position.copy(camera.position);
            muzzleFlash.position.copy(camera.position);

            // Ghost AI
            ghosts.forEach(ghost => {
                ghost.lookAt(camera.position);
                const dir = new THREE.Vector3().subVectors(camera.position, ghost.position).normalize();
                ghost.position.add(dir.multiplyScalar(0.03));
                
                if (ghost.position.distanceTo(camera.position) < 1.5) {
                    alert("YOU WERE CAPTURED.");
                    camera.position.set(startPos.x, 2, startPos.z);
                }
            });

            // Goal check
            if (camera.position.distanceTo(goal.position) < 2) {
                alert("YOU ESCAPED WITH " + kills + " KILLS!");
                location.reload();
            }

            renderer.render(scene, camera);
        }

        window.addEventListener('resize', () => {
            camera.aspect = window.innerWidth / window.innerHeight;
            camera.updateProjectionMatrix();
            renderer.setSize(window.innerWidth, window.innerHeight);
        });

        animate();
    </script>
</body>
</html>
