const { Engine, Render, Runner, World, Bodies, Mouse, MouseConstraint, Constraint, Composite } = Matter;

// 1. Setup Engine & Renderer
const engine = Engine.create();
const world = engine.world;
const render = Render.create({
    element: document.getElementById('game-container'),
    engine: engine,
    options: {
        width: 800,
        height: 600,
        wireframes: false,
        background: '#87CEEB' // Sky Blue
    }
});

Render.run(render);
Runner.run(Runner.create(), engine);

// 2. Create Ground
const ground = Bodies.rectangle(400, 590, 810, 60, { isStatic: true, render: { fillStyle: '#2ed573' } });
World.add(world, ground);

// 3. Create the "Bird"
let bird = Bodies.circle(150, 450, 20, { 
    restitution: 0.5, 
    render: { fillStyle: '#ff4757' } 
});

// 4. Slingshot Logic
const anchor = { x: 150, y: 450 };
const elastic = Constraint.create({
    pointA: anchor,
    bodyB: bird,
    stiffness: 0.1,
    length: 0.01,
    render: { strokeStyle: '#4b4b4b', lineWidth: 5 }
});

World.add(world, [bird, elastic]);

// 5. Create a Tower (The "Pigs" targets)
function createTower(x) {
    const stack = [];
    for (let i = 0; i < 5; i++) {
        stack.push(Bodies.rectangle(x, 500 - i * 50, 40, 40, { render: { fillStyle: '#eccc68' } }));
    }
    // Add a "Pig" on top
    stack.push(Bodies.circle(x, 200, 15, { render: { fillStyle: '#7bed9f' } }));
    return stack;
}

World.add(world, createTower(550));
World.add(world, createTower(650));

// 6. Mouse Interaction
const mouse = Mouse.create(render.canvas);
const mouseConstraint = MouseConstraint.create(engine, {
    mouse: mouse,
    constraint: { stiffness: 0.2, render: { visible: false } }
});

World.add(world, mouseConstraint);

// 7. Launching Logic
let isLaunched = false;
Matter.Events.on(mouseConstraint, 'enddrag', (event) => {
    if (event.body === bird) {
        isLaunched = true;
    }
});

Matter.Events.on(engine, 'afterUpdate', () => {
    if (isLaunched && bird.position.x > 170) {
        // "Snap" the elastic and let the bird fly
        elastic.bodyB = null;
        elastic.render.visible = false;
    }
});

// Reset with Spacebar
document.addEventListener('keydown', (e) => {
    if (e.code === 'Space') location.reload();
});
