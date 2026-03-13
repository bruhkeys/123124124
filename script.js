// --- CONFIGURATION (Slower Speeds) ---
const UNIT = 6;
const WALL_H = 8;
const MOVE_SPEED = 0.08;  // Was 0.15
const ROT_SPEED = 0.03;   // Was 0.045
const GHOST_SPEED = 0.012; // Was 0.025
const PLAYER_RAD = 1.0;   // Collision buffer

const mazeData = [
    [1,1,1,1,1,1,1,1,1,1,1,1],
    [1,0,0,0,1,0,0,0,0,0,0,1],
    [1,0,1,0,1,0,1,1,1,1,0,1],
    [1,0,1,0,0,0,0,0,0,1,0,1],
    [1,0,1,1,1,1,0,1,0,1,0,1],
    [1,0,0,0,0,0,0,1,0,0,0,1],
    [1,1,1,1,1,1,1,1,1,1,1,1]
];

// --- INITIALIZATION ---
const scene = new THREE.Scene();
scene.fog = new THREE.Fog(0x000000, 1, 20);
const camera = new THREE.PerspectiveCamera(75, window.innerWidth/window.innerHeight, 0.1, 1000);
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
document.body.appendChild(renderer.domElement);

// Lighting
const flashlight = new THREE.PointLight(0xffffff, 1.2, 18);
scene.add(flashlight);

// Create Maze
const wallGeo = new THREE.BoxGeometry(UNIT, WALL_H, UNIT);
const wallMat = new THREE.MeshStandardMaterial({ color: 0x111111 });

mazeData.forEach((row, r) => {
    row.forEach((val, c) => {
        if (val === 1) {
            const wall = new THREE.Mesh(wallGeo, wallMat);
            wall.position.set((c - row.length/2)*UNIT, WALL_H/2, (r - mazeData.length/2)*UNIT);
            scene.add(wall);
        }
    });
});

// Ghosts
const ghosts = [];
const loader = new THREE.TextureLoader();
const friendTex = loader.load('friend.jpg'); // Ensure this file exists!

function spawnGhost() {
    const gMat = new THREE.MeshBasicMaterial({ map: friendTex, transparent: true });
    const g = new THREE.Mesh(new THREE.PlaneGeometry(4, 4), gMat);
    g.position.set(Math.random()*20-10, 2, Math.random()*20-10);
    scene.add(g);
    ghosts.push(g);
}
for(let i=0; i<3; i++) spawnGhost();

// --- INPUTS ---
const keys = {};
window.addEventListener('keydown', (e) => keys[e.code] = true);
window.addEventListener('keyup', (e) => keys[e.code] = false);

// --- COLLISION ENGINE ---
function canMoveTo(x, z) {
    // Convert coordinate to array index
    const c = Math.floor((x / UNIT) + (mazeData[0].length / 2) + 0.5);
    const r = Math.floor((z / UNIT) + (mazeData.length / 2) + 0.5);
    
    // Check if index is out of bounds or is a wall
    if (r < 0 || r >= mazeData.length || c < 0 || c >= mazeData[0].length) return false;
    return mazeData[r][c] === 0;
}

// --- GAME STATE ---
let isRunning = false;
let rotY = 0;

document.getElementById('start-button').addEventListener('click', () => {
    document.getElementById('start-screen').style.display = 'none';
    document.getElementById('ui').style.display = 'block';
    isRunning = true;
    camera.position.set(-20, 2, -10); // Safe start point
    animate();
});

function animate() {
    if (!isRunning) return;
    requestAnimationFrame(animate);

    // 1. Rotation (Arrow Keys Fixed)
    if (keys['ArrowLeft']) rotY += ROT_SPEED;
    if (keys['ArrowRight']) rotY -= ROT_SPEED;
    camera.rotation.y = rotY;

    // 2. Movement Calculation
    let dx = 0;
    let dz = 0;
    const speed = (keys['ShiftLeft'] ? SPRINT_SPEED : MOVE_SPEED);

    if (keys['KeyW']) {
        dx -= Math.sin(rotY) * speed;
        dz -= Math.cos(rotY) * speed;
    }
    if (keys['KeyS']) {
        dx += Math.sin(rotY) * speed;
        dz += Math.cos(rotY) * speed;
    }
    if (keys['KeyA']) {
        dx -= Math.cos(rotY) * speed;
        dz += Math.sin(rotY) * speed;
    }
    if (keys['KeyD']) {
        dx += Math.cos(rotY) * speed;
        dz -= Math.sin(rotY) * speed;
    }

    // 3. Wall Collision (Sliding Logic)
    // We check X and Z separately so you don't stick to walls
    const nextX = camera.position.x + dx;
    const nextZ = camera.position.z + dz;

    if (canMoveTo(nextX + (dx > 0 ? PLAYER_RAD : -PLAYER_RAD), camera.position.z)) {
        camera.position.x = nextX;
    }
    if (canMoveTo(camera.position.x, nextZ + (dz > 0 ? PLAYER_RAD : -PLAYER_RAD))) {
        camera.position.z = nextZ;
    }

    // 4. Ghost AI (Slower)
    ghosts.forEach(g => {
        g.lookAt(camera.position);
        const dir = new THREE.Vector3().subVectors(camera.position, g.position).normalize();
        g.position.add(dir.multiplyScalar(GHOST_SPEED));

        if (g.position.distanceTo(camera.position) < 1.5) {
            // Jumpscare
            document.body.style.background = "red";
            setTimeout(() => { 
                document.body.style.background = "black";
                camera.position.set(-20, 2, -10); 
            }, 300);
        }
    });

    flashlight.position.copy(camera.position);
    renderer.render(scene, camera);
}

// Handle Resize
window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
});
