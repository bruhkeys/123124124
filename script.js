// --- CONFIGURATION ---
const UNIT = 6;
const WALL_H = 8;
const MOVE_SPEED = 0.07;  // Slower movement
const ROT_SPEED = 0.025;  // Slower rotation
const GHOST_SPEED = 0.01; // Slower ghost chase
const PLAYER_RAD = 1.2;   // Wall collision buffer

const mazeData = [
    [1,1,1,1,1,1,1,1,1,1,1,1],
    [1,0,0,0,1,0,0,0,0,0,0,1],
    [1,0,1,0,1,0,1,1,1,1,0,1],
    [1,0,1,0,0,0,0,0,0,1,0,1],
    [1,0,1,1,1,1,0,1,0,1,0,1],
    [1,0,0,0,0,0,0,1,0,0,0,1],
    [1,1,1,1,1,1,1,1,1,1,1,1]
];

let scene, camera, renderer, flashlight;
const ghosts = [];
const keys = {};
let rotY = 0;

function init() {
    scene = new THREE.Scene();
    scene.fog = new THREE.Fog(0x000000, 1, 18);
    
    camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
    // Start player in a safe empty cell
    camera.position.set(-18, 2, -10); 

    renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    document.body.appendChild(renderer.domElement);

    flashlight = new THREE.PointLight(0xffffff, 1.5, 15);
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
        g.position.set(Math.random()*20-10, 2, Math.random()*20-10);
        scene.add(g);
        ghosts.push(g);
    }

    // Start loop immediately
    animate();
}

function canMoveTo(x, z) {
    const c = Math.floor((x / UNIT) + (mazeData[0].length / 2) + 0.5);
    const r = Math.floor((z / UNIT) + (mazeData.length / 2) + 0.5);
    if (r < 0 || r >= mazeData.length || c < 0 || c >= mazeData[0].length) return false;
    return mazeData[r][c] === 0;
}

function animate() {
    requestAnimationFrame(animate);

    // Rotation (Arrow Keys)
    if (keys['ArrowLeft']) rotY += ROT_SPEED;
    if (keys['ArrowRight']) rotY -= ROT_SPEED;
    camera.rotation.y = rotY;

    // Movement (WASD)
    let dx = 0; let dz = 0;
    const speed = keys['ShiftLeft'] ? 0.12 : MOVE_SPEED;

    if (keys['KeyW']) { dx -= Math.sin(rotY) * speed; dz -= Math.cos(rotY) * speed; }
    if (keys['KeyS']) { dx += Math.sin(rotY) * speed; dz += Math.cos(rotY) * speed; }
    if (keys['KeyA']) { dx -= Math.cos(rotY) * speed; dz += Math.sin(rotY) * speed; }
    if (keys['KeyD']) { dx += Math.cos(rotY) * speed; dz -= Math.sin(rotY) * speed; }

    // Collision Logic (Sliding)
    const nextX = camera.position.x + dx;
    const nextZ = camera.position.z + dz;

    if (canMoveTo(nextX + (dx > 0 ? PLAYER_RAD : -PLAYER_RAD), camera.position.z)) {
        camera.position.x = nextX;
    }
    if (canMoveTo(camera.position.x, nextZ + (dz > 0 ? PLAYER_RAD : -PLAYER_RAD))) {
        camera.position.z = nextZ;
    }

    // Ghost Chase
    ghosts.forEach(g => {
        g.lookAt(camera.position);
        const dir = new THREE.Vector3().subVectors(camera.position, g.position).normalize();
        g.position.add(dir.multiplyScalar(GHOST_SPEED));

        if (g.position.distanceTo(camera.position) < 1.5) {
            // Death Flash
            document.body.style.background = "red";
            setTimeout(() => { 
                document.body.style.background = "black";
                camera.position.set(-18, 2, -10); // Reset position
            }, 100);
        }
    });

    flashlight.position.copy(camera.position);
    renderer.render(scene, camera);
}

// Input Listeners
window.addEventListener('keydown', (e) => keys[e.code] = true);
window.addEventListener('keyup', (e) => keys[e.code] = false);

// Start on Window Load
window.onload = init;

window.addEventListener('resize', () => {
    if(camera && renderer) {
        camera.aspect = window.innerWidth / window.innerHeight;
        camera.updateProjectionMatrix();
        renderer.setSize(window.innerWidth, window.innerHeight);
    }
});
