/**
 * MAZE RUNNER: FRIEND EDITION
 * Controls: 
 * WASD - Move
 * Arrow Left/Right - Rotate Camera
 */

// --- 1. CORE THREE.JS SETUP ---
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x050505); // Near black
const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
document.body.appendChild(renderer.domElement);

// --- 2. LIGHTING ---
const ambientLight = new THREE.AmbientLight(0x404040, 0.2); // Very dim ambient
scene.add(ambientLight);

const flashLight = new THREE.PointLight(0xffffff, 1.2, 15); // Player's flashlight
scene.add(flashLight);

// --- 3. MAZE DATA & GENERATION ---
// 1 = Wall, 0 = Path
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

// Create Wall Mesh
const wallGeo = new THREE.BoxGeometry(unitSize, wallHeight, unitSize);
const wallMat = new THREE.MeshStandardMaterial({ color: 0x222222 });

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

// Create Ground
const groundGeo = new THREE.PlaneGeometry(100, 100);
const groundMat = new THREE.MeshStandardMaterial({ color: 0x111111 });
const ground = new THREE.Mesh(groundGeo, groundMat);
ground.rotation.x = -Math.PI / 2;
scene.add(ground);

// --- 4. PLAYER & GHOSTS ---
let playerRotation = 0;
const startPos = { x: -25, z: -25 }; // Starting in a corner
camera.position.set(startPos.x, 2, startPos.z);

const ghosts = [];
const textureLoader = new THREE.TextureLoader();
const ghostTex = textureLoader.load('friend.jpg'); // PLACEHOLDER: Ensure this exists!

function spawnGhost() {
    const ghostMat = new THREE.MeshBasicMaterial({ map: ghostTex, transparent: true, side: THREE.DoubleSide });
    const ghostGeo = new THREE.PlaneGeometry(4, 4);
    const ghost = new THREE.Mesh(ghostGeo, ghostMat);
    
    // Position randomly in an empty spot
    ghost.position.set(Math.random() * 40 - 20, 2, Math.random() * 40 - 20);
    scene.add(ghost);
    ghosts.push(ghost);
}

for(let i=0; i<4; i++) spawnGhost();

// --- 5. INPUT HANDLING ---
const keys = { 
    KeyW: false, KeyA: false, KeyS: false, KeyD: false, 
    ArrowLeft: false, ArrowRight: false 
};

window.addEventListener('keydown', (e) => { if (e.code in keys) keys[e.code] = true; });
window.addEventListener('keyup', (e) => { if (e.code in keys) keys[e.code] = false; });

// --- 6. COLLISION & MOVEMENT LOGIC ---
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

    // Rotate Camera
    if (keys.ArrowLeft) playerRotation += rotSpeed;
    if (keys.ArrowRight) playerRotation -= rotSpeed;
    camera.rotation.y = playerRotation;

    // Calculate Intended Movement
    let dx = 0;
    let dz = 0;
    if (keys.KeyW) {
        dx += -Math.sin(playerRotation) * moveSpeed;
        dz += -Math.cos(playerRotation) * moveSpeed;
    }
    if (keys.KeyS) {
        dx -= -Math.sin(playerRotation) * moveSpeed;
        dz -= -Math.cos(playerRotation) * moveSpeed;
    }
    if (keys.KeyA) {
        dx += -Math.cos(playerRotation) * moveSpeed;
        dz -= Math.sin(playerRotation) * moveSpeed;
    }
    if (keys.KeyD) {
        dx -= -Math.cos(playerRotation) * moveSpeed;
        dz += Math.sin(playerRotation) * moveSpeed;
    }

    // Apply Collision (Checking X and Z separately for sliding)
    const buffer = 0.3; // Distance to keep from walls
    if (!isWall(camera.position.x + dx + (dx > 0 ? buffer : -buffer), camera.position.z)) {
        camera.position.x += dx;
    }
    if (!isWall(camera.position.x, camera.position.z + dz + (dz > 0 ? buffer : -buffer))) {
        camera.position.z += dz;
    }

    // Update Flashlight
    flashLight.position.copy(camera.position);

    // Ghost AI & Billboarding
    ghosts.forEach(ghost => {
        ghost.lookAt(camera.position);
        
        // Move towards player
        const dir = new THREE.Vector3().subVectors(camera.position, ghost.position).normalize();
        ghost.position.add(dir.multiplyScalar(0.03));
        
        // Game Over logic
        if (ghost.position.distanceTo(camera.position) < 1.5) {
            alert("HE FOUND YOU.");
            camera.position.set(startPos.x, 2, startPos.z);
        }
    });

    renderer.render(scene, camera);
}

// Handle Window Resize
window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
});

animate();
