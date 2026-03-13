const keys = { 
    w: false, a: false, s: false, d: false, 
    ArrowLeft: false, ArrowRight: false 
};

document.addEventListener('keydown', (e) => { if (e.code in keys) keys[e.code] = true; });
document.addEventListener('keyup', (e) => { if (e.code in keys) keys[e.code] = false; });

// 2. Rotation and Movement Variables
let playerRotation = 0;
const rotationSpeed = 0.04;
const playerSpeed = 0.15;

// Helper function to check if a position is a wall
function isWall(x, z) {
    // Convert 3D world coordinates back to Maze Array indices
    const col = Math.floor((x / unitSize) + (mazeData[0].length / 2) + 0.5);
    const row = Math.floor((z / unitSize) + (mazeData.length / 2) + 0.5);
    
    // Check boundaries and wall value
    if (row < 0 || row >= mazeData.length || col < 0 || col >= mazeData[0].length) return true;
    return mazeData[row][col] === 1;
}

function animate() {
    requestAnimationFrame(animate);

    // --- ROTATION (Arrow Keys) ---
    if (keys.ArrowLeft) playerRotation += rotationSpeed;
    if (keys.ArrowRight) playerRotation -= rotationSpeed;
    camera.rotation.y = playerRotation;

    // --- MOVEMENT (WASD) ---
    // We calculate intended movement based on rotation
    let moveX = 0;
    let moveZ = 0;

    if (keys.w) {
        moveX += -Math.sin(playerRotation) * playerSpeed;
        moveZ += -Math.cos(playerRotation) * playerSpeed;
    }
    if (keys.s) {
        moveX -= -Math.sin(playerRotation) * playerSpeed;
        moveZ -= -Math.cos(playerRotation) * playerSpeed;
    }
    if (keys.a) {
        moveX += -Math.cos(playerRotation) * playerSpeed;
        moveZ -= Math.sin(playerRotation) * playerSpeed;
    }
    if (keys.d) {
        moveX -= -Math.cos(playerRotation) * playerSpeed;
        moveZ += Math.sin(playerRotation) * playerSpeed;
    }

    // --- COLLISION CHECK ---
    // We check X and Z separately to allow "sliding" along walls
    const nextX = camera.position.x + moveX;
    const nextZ = camera.position.z + moveZ;

    // Buffer helps prevent camera clipping through thin edges (0.2 is the buffer)
    if (!isWall(nextX + (moveX > 0 ? 0.2 : -0.2), camera.position.z)) {
        camera.position.x = nextX;
    }
    if (!isWall(camera.position.x, nextZ + (moveZ > 0 ? 0.2 : -0.2))) {
        camera.position.z = nextZ;
    }

    // --- GHOST LOGIC ---
    ghosts.forEach(ghost => {
        ghost.lookAt(camera.position);
        
        const direction = camera.position.clone().sub(ghost.position).normalize();
        ghost.position.add(direction.multiplyScalar(0.025)); 
        
        if (ghost.position.distanceTo(camera.position) < 1.5) {
            // Trigger a quick "Screen Flash" or Alert
            document.body.style.backgroundColor = "red";
            setTimeout(() => { document.body.style.backgroundColor = "black"; }, 100);
            
            camera.position.set(0, 2, 0); // Respawn
        }
    });

    pointLight.position.copy(camera.position);
    renderer.render(scene, camera);
}

animate();
