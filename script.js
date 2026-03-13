<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Maze Runner: Friend Edition</title>
    <style>
        body { margin: 0; overflow: hidden; font-family: 'Courier New', Courier, monospace; }
        canvas { display: block; }
        #ui {
            position: absolute;
            top: 20px;
            left: 20px;
            background: rgba(0, 0, 0, 0.7);
            color: #00ffcc;
            padding: 15px;
            border-radius: 5px;
            border-left: 5px solid #00ffcc;
            pointer-events: none;
        }
        h1 { margin: 0 0 5px 0; font-size: 18px; text-transform: uppercase; }
        p { margin: 0; font-size: 12px; color: #ccc; }
        .objective { font-weight: bold; color: #ff0055; margin-top: 5px; }
    </style>
</head>
<body>

    <div id="ui">
        <h1>Maze Runner: Friend Edition</h1>
        <p>WASD to Move | Arrows to Rotate</p>
        <div class="objective">OBJECTIVE: Find the Cyan Glow.</div>
    </div>

    <script src="https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js"></script>

    <script>
        // --- 1. CORE THREE.JS SETUP ---
        const scene = new THREE.Scene();
        scene.background = new THREE.Color(0x020202); 
        const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
        const renderer = new THREE.WebGLRenderer({ antialias: true });
        renderer.setSize(window.innerWidth, window.innerHeight);
        document.body.appendChild(renderer.domElement);

        // --- 2. LIGHTING ---
        const ambientLight = new THREE.AmbientLight(0x404040, 0.1); 
        scene.add(ambientLight);

        const flashLight = new THREE.PointLight(0xffffff, 1.5, 18); 
        scene.add(flashLight);

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
        const wallMat = new THREE.MeshStandardMaterial({ color: 0x1a1a1a, roughness: 0.9 });

        for (let row = 0; row < mazeData.length; row++) {
            for (let col = 0; col < mazeData[row].length; col++) {
                if (mazeData[row][col] === 1) {
                    const wall = new THREE.Mesh(wallGeo, wallMat);
                    wall.position.set(
                        (col - mazeData[row].length / 2) * unitSize,
                        wallHeight / 2,
                        (row - mazeData.length / 2) * unitSize
                    );
                    scene.add(wall);
                }
            }
        }

        const groundGeo = new THREE.PlaneGeometry(200, 200);
        const groundMat = new THREE.MeshStandardMaterial({ color: 0x0a0a0a });
        const ground = new THREE.Mesh(groundGeo, groundMat);
        ground.rotation.x = -Math.PI / 2;
        scene.add(ground);

        // --- 4. THE GOAL ---
        const goalPos = { row: 9, col: 10 }; 
        const goalGeo = new THREE.TorusKnotGeometry(0.8, 0.3, 100, 16);
        const goalMat = new THREE.MeshStandardMaterial({ 
            color: 0x00ffcc, 
            emissive: 0x00ffcc, 
            emissiveIntensity: 5 
        });
        const goal = new THREE.Mesh(goalGeo, goalMat);
        goal.position.set(
            (goalPos.col - mazeData[0].length / 2) * unitSize,
            2.5,
            (goalPos.row - mazeData.length / 2) * unitSize
        );
        scene.add(goal);

        const goalLight = new THREE.PointLight(0x00ffcc, 2, 12);
        goalLight.position.copy(goal.position);
        scene.add(goalLight);

        // --- 5. PLAYER & GHOSTS ---
        let playerRotation = 0;
        const startPos = { x: -25, z: -25 }; 
        camera.position.set(startPos.x, 2, startPos.z);

        const ghosts = [];
        // Placeholder texture (red glow) if 'friend.jpg' is missing
        const loader = new THREE.TextureLoader();
        const ghostTex = loader.load('friend.jpg', undefined, undefined, () => {
            console.warn("Ghost texture not found, using color.");
        });

        function spawnGhost() {
            const ghostMat = new THREE.MeshBasicMaterial({ 
                map: ghostTex, 
                color: 0xff0000, 
                transparent: true, 
                opacity: 0.8,
                side: THREE.DoubleSide 
            });
            const ghostGeo = new THREE.PlaneGeometry(4, 4);
            const ghost = new THREE.Mesh(ghostGeo, ghostMat);
            
            // Random valid starting position logic
            ghost.position.set(Math.random() * 40 - 20, 2, Math.random() * 40 - 20);
            scene.add(ghost);
            ghosts.push(ghost);
        }

        for(let i=0; i<4; i++) spawnGhost();

        // --- 6. INPUT ---
        const keys = { 
            KeyW: false, KeyA: false, KeyS: false, KeyD: false, 
            ArrowLeft: false, ArrowRight: false 
        };

        window.addEventListener('keydown', (e) => { if (e.code in keys) keys[e.code] = true; });
        window.addEventListener('keyup', (e) => { if (e.code in keys) keys[e.code] = false; });

        function isWall(x, z) {
            const col = Math.floor((x / unitSize) + (mazeData[0].length / 2) + 0.5);
            const row = Math.floor((z / unitSize) + (mazeData.length / 2) + 0.5);
            if (row < 0 || row >= mazeData.length || col < 0 || col >= mazeData[0].length) return true;
            return mazeData[row][col] === 1;
        }

        // --- 7. ANIMATION LOOP ---
        const rotSpeed = 0.04;
        const moveSpeed = 0.15;

        function animate() {
            requestAnimationFrame(animate);

            if (keys.ArrowLeft) playerRotation += rotSpeed;
            if (keys.ArrowRight) playerRotation -= rotSpeed;
            camera.rotation.y = playerRotation;

            let dx = 0;
            let dz = 0;
            if (keys.KeyW) { dx += -Math.sin(playerRotation) * moveSpeed; dz += -Math.cos(playerRotation) * moveSpeed; }
            if (keys.KeyS) { dx -= -Math.sin(playerRotation) * moveSpeed; dz -= -Math.cos(playerRotation) * moveSpeed; }
            if (keys.KeyA) { dx += -Math.cos(playerRotation) * moveSpeed; dz -= Math.sin(playerRotation) * moveSpeed; }
            if (keys.KeyD) { dx -= -Math.cos(playerRotation) * moveSpeed; dz += Math.sin(playerRotation) * moveSpeed; }

            const buffer = 0.8; 
            if (!isWall(camera.position.x + dx + (dx > 0 ? buffer : -buffer), camera.position.z)) camera.position.x += dx;
            if (!isWall(camera.position.x, camera.position.z + dz + (dz > 0 ? buffer : -buffer))) camera.position.z += dz;

            flashLight.position.copy(camera.position);

            // Goal Animation & Logic
            goal.rotation.y += 0.02;
            if (camera.position.distanceTo(goal.position) < 2.5) {
                alert("YOU ESCAPED THE FRIEND ZONE!");
                camera.position.set(startPos.x, 2, startPos.z);
            }

            // Ghost AI
            ghosts.forEach(ghost => {
                ghost.lookAt(camera.position);
                const dir = new THREE.Vector3().subVectors(camera.position, ghost.position).normalize();
                ghost.position.add(dir.multiplyScalar(0.025));
                
                if (ghost.position.distanceTo(camera.position) < 1.8) {
                    alert("HE FOUND YOU.");
                    camera.position.set(startPos.x, 2, startPos.z);
                }
            });

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
