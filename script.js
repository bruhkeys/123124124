// Basic Three.js setup
const scene = new THREE.Scene();
// Set a dark, spooky background color
scene.background = new THREE.Color(0x111111); 
const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
document.body.appendChild(renderer.domElement);

// Spooky lighting
const ambientLight = new THREE.AmbientLight(0x404040, 0.5); // Soft overall light
scene.add(ambientLight);
const pointLight = new THREE.PointLight(0xff0000, 1, 50); // Red light from player
scene.add(pointLight);

// Maze Data (1 = wall, 0 = empty space)
// A simple 10x10 maze layout
const mazeData = [
    [1, 1, 1, 1, 1, 1, 1, 1, 1, 1],
    [1, 0, 0, 0, 1, 0, 0, 0, 0, 1],
    [1, 0, 1, 0, 1, 0, 1, 1, 0, 1],
    [1, 0, 1, 0, 0, 0, 0, 1, 0, 1],
    [1, 1, 1, 1, 1, 1, 0, 1, 0, 1],
    [1, 0, 0, 0, 0, 1, 0, 0, 0, 1],
    [1, 0, 1, 1, 0, 1, 1, 1, 1, 1],
    [1, 0, 0, 1, 0, 0, 0, 0, 0, 1],
    [1, 1, 0, 1, 1, 1, 1, 1, 0, 1],
    [1, 1, 1, 1, 1, 1, 1, 1, 1, 1],
];

const unitSize = 5; // Size of each maze cell
const wallHeight = 10;
const walls = [];

// Create walls based on mazeData
const wallGeometry = new THREE.BoxGeometry(unitSize, wallHeight, unitSize);
const wallMaterial = new THREE.MeshStandardMaterial({ color: 0x333333 }); // Dark grey walls

for (let i = 0; i < mazeData.length; i++) {
    for (let j = 0; j < mazeData[i].length; j++) {
        if (mazeData[i][j] === 1) {
            const wall = new THREE.Mesh(wallGeometry, wallMaterial);
            wall.position.set(
                (j - mazeData[i].length / 2) * unitSize,
                wallHeight / 2,
                (i - mazeData.length / 2) * unitSize
            );
            scene.add(wall);
            walls.push(wall); // Store for collision detection later
        }
    }
}

// Create the Ground
const groundGeometry = new THREE.PlaneGeometry(mazeData[0].length * unitSize, mazeData.length * unitSize);
const groundMaterial = new THREE.MeshStandardMaterial({ color: 0x222222 });
const ground = new THREE.Mesh(groundGeometry, groundMaterial);
ground.rotation.x = -Math.PI / 2; // Lay flat
scene.add(ground);

// Player setup
camera.position.set(0, 2, 0); // Start position (adjust based on maze)
const playerSpeed = 0.2;
pointLight.position.copy(camera.position); // Red light follows player

// Ghost setup
const ghosts = [];
const numGhosts = 3;
const ghostSize = 3;

// Load the friend image texture
const textureLoader = new THREE.TextureLoader();
// Make sure 'friend.jpg' (or .png) is in the same folder!
const ghostTexture = textureLoader.load('friend.jpg'); 

// Create a material using the texture for the ghosts
const ghostMaterial = new THREE.MeshBasicMaterial({ map: ghostTexture, transparent: true });
const ghostGeometry = new THREE.PlaneGeometry(ghostSize, ghostSize);

// Function to find a valid random empty space in the maze
function getRandomEmptySpace() {
    let r, c;
    do {
        r = Math.floor(Math.random() * mazeData.length);
        c = Math.floor(Math.random() * mazeData[0].length);
    } while (mazeData[r][c] === 1); // Keep picking until an empty space (0) is found
    return {
        x: (c - mazeData[0].length / 2) * unitSize,
        z: (r - mazeData.length / 2) * unitSize
    };
}

// Spawn ghosts
for (let i = 0; i < numGhosts; i++) {
    const ghost = new THREE.Mesh(ghostGeometry, ghostMaterial);
    const pos = getRandomEmptySpace();
    ghost.position.set(pos.x, ghostSize / 2, pos.z);
    scene.add(ghost);
    ghosts.push(ghost);
}

// Player movement controls
const keys = { w: false, a: false, s: false, d: false };
document.addEventListener('keydown', (e) => { if (keys.hasOwnProperty(e.key)) keys[e.key] = true; });
document.addEventListener('keyup', (e) => { if (keys.hasOwnProperty(e.key)) keys[e.key] = false; });

// Game loop / Animation
function animate() {
    requestAnimationFrame(animate);

    // Player Movement
    if (keys.w) camera.translateZ(-playerSpeed);
    if (keys.s) camera.translateZ(playerSpeed);
    if (keys.a) camera.translateX(-playerSpeed);
    if (keys.d) camera.translateX(playerSpeed);

    // Basic collision detection (stop player from going through walls)
    // For simplicity, this just checks if the camera gets too close to any wall mesh center
    const playerPos = camera.position.clone();
    walls.forEach(wall => {
        if (playerPos.distanceTo(wall.position) < unitSize / 2 + 0.5) {
            // Very basic push-back - move player away from wall
            const direction = playerPos.clone().sub(wall.position).normalize();
            camera.position.add(direction.multiplyScalar(0.1)); 
        }
    });

    // Update light position
    pointLight.position.copy(camera.position);

    // Ghost behavior: make them always face the player ("billboarding")
    // and move slowly towards the player
    ghosts.forEach(ghost => {
        ghost.lookAt(camera.position); // Always face the camera/player
        
        // Move towards player
        const direction = camera.position.clone().sub(ghost.position).normalize();
        ghost.position.add(direction.multiplyScalar(0.03)); // Adjust ghost speed here
        
        // Simple game over check
        if (ghost.position.distanceTo(camera.position) < 2) {
            alert("YOUR FRIEND CAUGHT YOU!");
            // Reset player position
            camera.position.set(0, 2, 0);
        }
    });

    renderer.render(scene, camera);
}

// Start the game
animate();

// Handle window resizing
window.addEventListener('resize', onWindowResize, false);
function onWindowResize() {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
}
