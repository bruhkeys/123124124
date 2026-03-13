/**
 * MAZE RUNNER: THE FRIEND EXPERIENCE
 * Controls: 
 * WASD - Move | SHIFT - Sprint
 * Arrow Left/Right - Rotate View
 */

// --- 1. SETTINGS & CONSTANTS ---
const UNIT_SIZE = 6;
const WALL_HEIGHT = 9;
const PLAYER_HEIGHT = 2.5;
const GHOST_SPEED = 0.025;
const NORMAL_SPEED = 0.12;
const SPRINT_SPEED = 0.22;
const ROTATION_SPEED = 0.045;

// --- 2. SCENE SETUP ---
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x000000);
// Add Fog to hide the edges of the maze and make it spooky
scene.fog = new THREE.Fog(0x000000, 1, 25); 

const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
document.body.appendChild(renderer.domElement);

// --- 3. THE MAZE MAP ---
const mazeData = [
    [1,1,1,1,1,1,1,1,1,1,1,1,1,1,1],
    [1,0,0,0,1,0,0,0,0,0,0,1,0,0,1],
    [1,0,1,0,1,0,1,1,1,1,0,1,0,1,1],
    [1,0,1,0,0,0,0,0,0,1,0,0,0,0,1],
    [1,0,1,1,1,1,1,1,0,1,1,1,1,0,1],
    [1,0,0,0,0,0,0,1,0,0,0,0,1,0,1],
    [1,1,1,0,1,1,0,1,1,1,1,0,1,0,1],
    [1,0,0,0,1,0,0,0,0,0,1,0,0,0,1],
    [1,0,1,1,1,0,1,1,1,0,1,1,1,1,1],
    [1,0,0,0,0,0,1,0,0,0,0,0,0,0,1],
    [1,1,1,1,1,1,1,1,1,1,1,1,1,1,1],
];

// --- 4. BUILDING THE WORLD ---
const textureLoader = new THREE.TextureLoader();
// Wall texture (optional: use a dark brick image if you have one)
const wallMat = new THREE.MeshStandardMaterial({ color: 0x1a1a1a });
const wallGeo = new THREE.BoxGeometry(UNIT_SIZE, WALL_HEIGHT, UNIT_SIZE);

for (let r = 0; r < mazeData.length; r++) {
    for (let c = 0; c < mazeData[r].length; c++) {
        if (mazeData[r][c] === 1) {
            const wall = new THREE.Mesh(wallGeo, wallMat);
            wall.position.set(
                (c - mazeData[r].length / 2) * UNIT_SIZE,
                WALL_HEIGHT / 2,
                (r - mazeData.length / 2) * UNIT_SIZE
            );
            scene.add(wall);
        }
    }
}

// Floor
const floorGeo = new THREE.PlaneGeometry(200, 200);
const floorMat = new THREE.MeshStandardMaterial({ color: 0x0a0a0a });
const floor = new THREE.Mesh(floorGeo, floorMat);
floor.rotation.x = -Math.PI / 2;
scene.add(floor);

// --- 5. LIGHTING (The Flashlight) ---
const ambientLight = new THREE.AmbientLight(0xffffff, 0.05); // Barely visible
scene.add(ambientLight);

const flashlight = new THREE.PointLight(0xfff0dd, 1.5, 20); // Warm light
flashlight.castShadow = true;
scene.add(flashlight);

// --- 6. PLAYER & INPUTS ---
let playerRotation = 0;
camera.position.set(-25, PLAYER_HEIGHT, -20); // Set starting point manually

const keys = {};
window.addEventListener('keydown', (e) => { keys[e.code] = true; });
window.addEventListener('keyup', (e) => { keys[e.code] = false; });

// --- 7. GHOSTS (The "Friends") ---
const ghosts = [];
const ghostTex = textureLoader.load('friend.jpg'); 

function spawnGhost() {
    const ghostMat = new THREE.MeshBasicMaterial({ 
        map: ghostTex, 
        transparent: true, 
        side: THREE.DoubleSide 
    });
    const ghostGeo = new THREE.PlaneGeometry(4, 4);
    const ghost = new THREE.Mesh(ghostGeo, ghostMat);
    
    // Find an empty cell for spawning
    let r, c;
    do {
        r = Math.floor(Math.random() * mazeData.length);
        c = Math.floor(Math.random() * mazeData[0].length);
    } while (mazeData[r][c] === 1);

    ghost.position.set(
        (c - mazeData[0].length / 2) * UNIT_SIZE,
        2.5,
        (r - mazeData.length / 2) * UNIT_SIZE
    );
    scene.add(ghost);
    ghosts.push(ghost);
}

for(let i=0; i<5; i++) spawnGhost();

// --- 8. COLLISION LOGIC ---
function checkCollision(x, z) {
    const col = Math.floor((x / UNIT_SIZE) + (mazeData[0].length / 2) + 0.5);
    const row = Math.floor((z / UNIT_SIZE) + (mazeData.length / 2) + 0.5);
    
    if (row < 0 || row >= mazeData.length || col < 0 || col >= mazeData[0].length) return true;
    return mazeData[row][col] === 1;
}

// --- 9. THE GAME LOOP ---
let time = 0;

function animate() {
    requestAnimationFrame(animate);
    time += 0.05;

    // A. Rotation
    if (keys['ArrowLeft']) playerRotation += ROTATION_SPEED;
    if (keys['ArrowRight']) playerRotation -= ROTATION_SPEED;
    camera.rotation.y = playerRotation;

    // B. Movement Speed (Sprint)
    const currentSpeed = keys['ShiftLeft'] || keys['ShiftRight'] ? SPRINT_SPEED : NORMAL_SPEED;
    
    let dx = 0;
    let dz = 0;

    if (keys['KeyW']) {
        dx -= Math.sin(playerRotation) * currentSpeed;
        dz -= Math.cos(playerRotation) * currentSpeed;
    }
    if (keys['KeyS']) {
        dx += Math.sin(playerRotation) * currentSpeed;
        dz += Math.cos(playerRotation) * currentSpeed;
    }
    if (keys['KeyA']) {
        dx -= Math.cos(playerRotation) * currentSpeed;
        dz += Math.sin(playerRotation) * currentSpeed;
    }
    if (keys['KeyD']) {
        dx += Math.cos(playerRotation) * currentSpeed;
        dz -= Math.sin(playerRotation) * currentSpeed;
    }

    // C. Sliding Collision
    const buffer = 1.2;
    if (!checkCollision(camera.position.x + dx + (dx > 0 ? buffer : -buffer), camera.position.z)) {
        camera.position.x += dx;
    }
    if (!checkCollision(camera.position.x, camera.position.z + dz + (dz > 0 ? buffer : -buffer))) {
        camera.position.z += dz;
    }

    // D. Spooky Flashlight Flicker
    flashlight.position.copy(camera.position);
    flashlight.intensity = 1.5 + Math.random() * 0.5; // Constant slight flicker
    if (Math.random() > 0.98) flashlight.intensity = 0.1; // Sudden dimming

    // E. Ghost AI
    ghosts.forEach(ghost => {
        ghost.lookAt(camera.position);
        
        // Move slowly towards player
        const direction = new THREE.Vector3().subVectors(camera.position, ghost.position).normalize();
        ghost.position.add(direction.multiplyScalar(GHOST_SPEED));

        // Jumpscare / Catch Logic
        const dist = ghost.position.distanceTo(camera.position);
        if (dist < 1.8) {
            jumpscare();
        }
    });

    renderer.render(scene, camera);
}

// --- 10. JUMPSCARE MECHANIC ---
function jumpscare() {
    // Flash the screen red and reset
    document.body.style.filter = "invert(1) sepia(1) saturate(10000%) hue-rotate(0deg)";
    setTimeout(() => {
        document.body.style.filter = "none";
        camera.position.set(-25, PLAYER_HEIGHT, -20);
        playerRotation = 0;
    }, 500);
}

// Resize Handling
window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
});

animate();
