// --- 1. CONFIGURATION ---
const UNIT = 6;
const WALL_H = 8;
const MOVE_SPEED = 0.08; 
const ROT_SPEED = 0.03;  
const GHOST_SPEED = 0.012;
const PLAYER_RAD = 1.0; 

const mazeData = [
    [1,1,1,1,1,1,1,1,1,1,1,1],
    [1,0,0,0,1,0,0,0,0,0,0,1],
    [1,0,1,0,1,0,1,1,1,1,0,1],
    [1,0,1,0,0,0,0,0,0,1,0,1],
    [1,0,1,1,1,1,0,1,0,1,0,1],
    [1,0,0,0,0,0,0,1,0,0,0,1],
    [1,1,1,1,1,1,1,1,1,1,1,1]
];

// --- 2. GLOBAL VARIABLES ---
let scene, camera, renderer, flashlight;
const ghosts = [];
const keys = {};
let isRunning = false;
let rotY = 0;

// --- 3. CORE INITIALIZATION ---
function init() {
    scene = new THREE.Scene();
    scene.fog = new THREE.Fog(0x000000, 1, 20);
    
    camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
    
    renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    document.body.appendChild(renderer.domElement);

    flashlight = new THREE.PointLight(0xffffff, 1.2, 18);
    scene.add(flashlight);

    // Build Walls
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

    // Ground
    const ground = new THREE.Mesh(
        new THREE.PlaneGeometry(100, 100),
        new THREE.MeshStandardMaterial({ color: 0x050505 })
    );
    ground.rotation.x = -Math.PI / 2;
    scene.add(ground);

    // Ghosts
    const loader = new THREE.TextureLoader();
    const friendTex = loader.load('friend.jpg'); 

    for(let i=0; i<3; i++) {
        const gMat = new THREE.MeshBasicMaterial({ map: friendTex, transparent: true, side: THREE.DoubleSide });
        const g = new THREE.Mesh(new THREE.PlaneGeometry(4, 4), gMat);
        // Randomly place ghosts in open areas
        g.position.set(Math.random()*20-10, 2, Math.random()*20-10);
        scene.add(g);
        ghosts.push(g);
    }
}

// --- 4. COLLISION ENGINE ---
function canMoveTo(x, z) {
    const c = Math.floor((x / UNIT) + (mazeData[0].length / 2) + 0.5);
    const r = Math.floor((z / UNIT) + (mazeData.length / 2) + 0.5);
    if (r < 0 || r >= mazeData.length || c < 0 || c >= mazeData[0].length) return false;
    return mazeData[r][c] === 0;
}

// --- 5. THE GAME LOOP ---
function animate() {
    if (!isRunning) return;
    requestAnimationFrame(animate);

    // Rotation
    if (keys['ArrowLeft']) rotY += ROT_SPEED;
    if (keys['ArrowRight']) rotY -= ROT_SPEED;
    camera.rotation.y = rotY;

    // Movement
    let dx = 0; let dz = 0;
    const speed = keys['ShiftLeft'] ? 0.15 : MOVE_SPEED;

    if (keys['KeyW']) { dx -= Math.sin(rotY) * speed; dz -= Math.cos(rotY) * speed; }
    if (keys['KeyS']) { dx += Math.sin(rotY) * speed; dz += Math.cos(rotY) * speed; }
    if (keys['KeyA']) { dx -= Math.cos(rotY) * speed; dz -= Math.sin(rotY) * speed; }
    if (keys['KeyD']) { dx += Math.cos(rotY) * speed; dz += Math.sin(rotY) * speed; }

    // Collision
    const nextX = camera.position.x + dx;
    const nextZ = camera.position.z + dz;
    if (canMoveTo(nextX + (dx > 0 ? PLAYER_RAD : -PLAYER_RAD), camera.position.z)) camera.position.x = nextX;
    if (canMoveTo(camera.position.x, nextZ + (dz > 0 ? PLAYER_RAD : -PLAYER_RAD))) camera.position.z = nextZ;

    // Ghost Logic
    ghosts.forEach(g => {
        g.lookAt(camera.position);
        const dir = new THREE.Vector3().subVectors(camera.position, g.position).normalize();
        g.position.add(dir.multiplyScalar(GHOST_SPEED));

        if (g.position.distanceTo(camera.position) < 1.5) {
            document.body.style.background = "red";
            isRunning = false; // Pause game for "death"
            setTimeout(() => { 
                document.body.style.background = "black";
                camera.position.set(-20, 2, -10); 
                isRunning = true;
                animate();
            }, 500);
        }
    });

    flashlight.position.copy(camera.position);
    renderer.render(scene, camera);
}

// --- 6. EVENT LISTENERS ---
window.addEventListener('keydown', (e) => keys[e.code] = true);
window.addEventListener('keyup', (e) => keys[e.code] = false);

// Wait for HTML to load before looking for the button
document.addEventListener('DOMContentLoaded', () => {
    init(); // Setup scene but don't start loop
    
    const startBtn = document.getElementById('start-button');
    const startScreen = document.getElementById('start-screen');

    startBtn.addEventListener('click', () => {
        console.log("Game Starting...");
        startScreen.style.display = 'none';
        isRunning = true;
        camera.position.set(-20, 2, -10); 
        animate(); // Kick off the animation loop
    });
});

window.addEventListener('resize', () => {
    if(camera && renderer) {
        camera.aspect = window.innerWidth / window.innerHeight;
        camera.updateProjectionMatrix();
        renderer.setSize(window.innerWidth, window.innerHeight);
    }
});
