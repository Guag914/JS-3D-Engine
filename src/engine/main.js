const canvas = document.getElementById('engine-canvas');
canvas.width = window.innerWidth;
canvas.height = window.innerHeight;
const ctx = canvas.getContext('2d');

//constants:
const CW = canvas.width;
const CH = canvas.height;
const CW2 = CW/2;
const CH2 = CH/2;

const pressedKeys = {};
document.addEventListener('keydown', (event) => { pressedKeys[event.code] = true; });
document.addEventListener('keyup', (event) => { pressedKeys[event.code] = false; });

//class declarations:
class Camera {
    constructor (x, y, z, r){
        this.x = x;
        this.y = y;
        this.z = z;

        this.r = r; //rate
        this.acell = 0; //acceleration

        this.q = new Quaternion(1, 0, 0, 0); //identity quaternion

        //rotation tracking for movement math
        this.yaw = 0;
        this.pitch = 0;
        this.roll = 0;

        //vectors moved into class scope for external movement calls
        let forward = {x: 0, y: 0, z: 0};
        let right = {x: 0, y: 0, z: 0};
        let up = {x: 0, y: 0, z: 0};
    }

    controls(){
        const rotM = this.q.convertToM();

        this.forward = { x: rotM[0][2], y: 0, z: rotM[2][2] }; //store as a vector instead of just a scalar
        this.right =   { x: rotM[0][0], y: 0, z: rotM[2][0] };
        this.up =      { x: rotM[0][1], y: rotM[1][1], z: rotM[2][1] };

        const fLength = Math.sqrt(this.forward.x**2 + this.forward.y**2 + this.forward.z**2);
        const rLength = Math.sqrt(this.right.x**2 + this.right.y**2 + this.right.z**2);
        const uLength = Math.sqrt(this.up.x**2 + this.up.y**2 + this.up.z**2);

        this.forward = vectorByNumber(1/fLength, this.forward);
        this.right = vectorByNumber(1/rLength, this.right);
        this.up = vectorByNumber(1/uLength, this.up);

        //gram schmidt process to make the vectors orthogonal (make axis perpendicular again)
        //subtract projection of each matrix so only get the perpendicular component
        //normalize after to get unit vector
        //right = right - (right·forward / forward·forward) * forward
        //up = up - (up·forward / forward·forward) * forward - (up·right / right·right) * right

        this.right = vectorSubtraction(this.right, vectorByNumber(vectorDotProduct(this.right, this.forward)/vectorDotProduct(this.forward, this.forward), this.forward))

        this.up = vectorSubtraction(this.up, vectorByNumber(vectorDotProduct(this.up, this.forward)/vectorDotProduct(this.forward, this.forward), this.forward));
        this.up = vectorSubtraction(this.up, vectorByNumber(vectorDotProduct(this.up, this.right)/vectorDotProduct(this.right, this.right), this.right));

        let  rightLength = Math.sqrt(this.right.x**2 + this.right.y**2 + this.right.z**2);
        let  upLength = Math.sqrt(this.up.x**2 + this.up.y**2 + this.up.z**2);

        this.right = vectorByNumber(1/rightLength, this.right); //normalize vectors
        this.up = vectorByNumber(1/upLength, this.up);

        //debug
//        console.log(vectorDotProduct(forward, right).toFixed(6)); // should be ~0 if orthogonal
//        console.log(`
//            X: ${this.x}, Y: ${this.y}, Z: ${this.z},
//            \n Roll: ${this.roll}, Pitch: ${this.pitch}, Yaw: ${this.yaw}
//        `);

//        console.log(`ForwardX: ${forward.x}\nForwardZ: ${forward.z}`);
        //Movement
        if (pressedKeys['KeyW']){ this.mForward(); }
        if (pressedKeys['KeyS']){ this.mBackward(); }
        if (pressedKeys['KeyA']){ this.mLeft(); }
        if (pressedKeys['KeyD']){ this.mRight(); }

        if (pressedKeys['Space']){ this.mUp() }
        if (pressedKeys['ShiftLeft']){ this.mDown() }

        //Rotations
        if (pressedKeys['ArrowLeft']){ this.rLeft(); }
        if (pressedKeys['ArrowRight']){ this.rRight(); }
        if (pressedKeys['ArrowUp']){ this.rUp(); }
        if (pressedKeys['ArrowDown']){ this.rDown(); }

        if (pressedKeys['KeyE']){ this.rCW(); }
        if (pressedKeys['KeyQ']){ this.rCCW(); }
    }

    mForward(){ this.x -= this.forward.x * this.r * 10; this.y -= this.forward.y * this.r * 10; this.z += this.forward.z * this.r * 10; }
    mBackward(){ this.x += this.forward.x * this.r * 10; this.y += this.forward.y * this.r * 10; this.z -= this.forward.z * this.r * 10; }
    mLeft(){ this.x -= this.right.x * this.r * 10; this.z += this.right.z * this.r * 10; }
    mRight(){ this.x += this.right.x * this.r * 10; this.z -= this.right.z * this.r * 10; }
    mUp(){ this.y += this.up.y * this.r * 10; }
    mDown(){ this.y -= this.up.y * this.r * 10; }

    rUp(){ if (this.pitch < 1.5){this.q.update(0.015 * this.r, Math.cos(this.yaw), 0, Math.sin(this.yaw)); this.pitch += 0.015 * this.r;} }
    rDown(){ if (this.pitch > -1.5){this.q.update(-0.015 * this.r, Math.cos(this.yaw), 0, Math.sin(this.yaw)); this.pitch -= 0.015 * this.r;} }
    rLeft(){ this.q.update(0.015 * this.r, 0, 1, 0); this.yaw += 0.015 * this.r; }
    rRight(){ this.q.update(-0.015 * this.r, 0, 1, 0); this.yaw -= 0.015 * this.r; }
    rCW(){ this.q.update(0.015 * this.r, -Math.sin(this.yaw), 0, Math.cos(this.yaw)); this.roll += 0.015 * this.r; }
    rCCW(){ this.q.update(-0.015 * this.r, -Math.sin(this.yaw), 0, Math.cos(this.yaw)); this.roll -= 0.015 * this.r; }
}

class Quaternion{
    constructor(w, x, y, z){
        this.w = w;
        this.x = x;
        this.y = y;
        this.z = z;
    }

    hamiltonProduct(b){
        const tempW = this.w*b.w - this.x*b.x - this.y*b.y - this.z*b.z;
        const tempX = this.w*b.x + this.x*b.w + this.y*b.z - this.z*b.y;
        const tempY = this.w*b.y - this.x*b.z + this.y*b.w + this.z*b.x;
        const tempZ = this.w*b.z + this.x*b.y - this.y*b.x + this.z*b.w;

        return new this.constructor(tempW, tempX, tempY, tempZ);
    }

    update(angle, tx, ty, tz){
        const tempQ = new Quaternion(Math.cos(angle/2), Math.sin(angle/2)*tx, Math.sin(angle/2)*ty, Math.sin(angle/2)*tz); //similar to unit circle cos(t) and sin(t) ratios

        const result = this.hamiltonProduct(tempQ);
        this.w = result.w;
        this.x = result.x;
        this.y = result.y;
        this.z = result.z;

        const dot = this.w*tempQ.w + this.x*tempQ.x + this.y*tempQ.y + this.z*tempQ.z;
        if (dot < 0) {
            tempQ.w *= -1;
            tempQ.x *= -1;
            tempQ.y *= -1;
            tempQ.z *= -1;
        }

        //normalization
        const length = Math.sqrt(this.w**2 + this.x**2 + this.y**2 + this.z**2); //magnitude formula for a 3d vector
        this.w /= length; //divide by length to normalize => convert to unit vector
        this.x /= length;
        this.y /= length;
        this.z /= length;
    }

    convertToM(){
        return [
            [1 - 2*(this.y**2+this.z**2), 2*(this.x*this.y - this.w*this.z), 2*(this.x*this.z+this.w*this.y), 0],
            [2*(this.x*this.y+this.w*this.z), 1 - 2*(this.x**2+this.z**2), 2*(this.y*this.z - this.w*this.x), 0],
            [2*(this.x*this.z - this.w*this.y), 2*(this.y*this.z+this.w*this.x), 1 - 2*(this.x**2+this.y**2),0],
            [0, 0, 0, 1]
        ];
    }

    quaternionDotProduct(q1, q2) { return q1.x * q2.x + q1.y * q2.y + q1.z * q2.z + q1.w * q2.w; }
}

class Cube {
    constructor(x, y, z, w, width, height, depth) {
        this.x = x;
        this.y = y;
        this.z = z;
        this.w = w;

        this.width = width / 2;
        this.height = height / 2;
        this.depth = depth / 2;

        this.M = [
            [0,1,2],[0,2,3],
            [4,5,6],[4,6,7],
            [0,4,5],[0,5,1],
            [3,7,6],[3,6,2],
            [0,3,7],[0,7,4],
            [1,2,6],[1,6,5]
        ];

        this.V = [
            new Vertex(x + this.width, y + this.height, z - this.depth, w),
            new Vertex(x + this.width, y - this.height, z - this.depth, w),
            new Vertex(x - this.width, y - this.height, z - this.depth, w),
            new Vertex(x - this.width, y + this.height, z - this.depth, w),
            new Vertex(x + this.width, y + this.height, z + this.depth, w),
            new Vertex(x + this.width, y - this.height, z + this.depth, w),
            new Vertex(x - this.width, y - this.height, z + this.depth, w),
            new Vertex(x - this.width, y + this.height, z + this.depth, w)
        ];
    }
}

class Vertex {
    constructor (x, y, z, w){
        this.x = x;
        this.y = y;
        this.z = z;
        this.w = w;
    }
    draw(){
        ctx.beginPath();
        ctx.arc((CW2 + 1/2*this.x)/this.w, (CH2 - 1/2*this.y)/this.w, 3, 0, 2 * Math.PI);
        ctx.fillStyle = '#ffffff';
        ctx.fill();
        ctx.closePath();
    }
}

//Screen functions
const toScreen = (x, y, z, w) => {
    return {
        x: CW2 + (x / w)*CW2,
        y: CH2 - (y / w)*CH2,
        z: z / w
    }
}

const drawPoints = (x, y) => {
        ctx.beginPath();
        ctx.arc(x, y, 3, 0, 2 * Math.PI);
        ctx.fillStyle = '#ffffff';
        ctx.fill();
        ctx.closePath();
}

const drawLine = (x1, y1, x2, y2) => {
    ctx.save();
    ctx.beginPath();
    ctx.strokeStyle = 'white';
    ctx.moveTo(x1, y1);
    ctx.lineTo(x2, y2);
    ctx.stroke();
    ctx.restore();
}

//Vector operations
const vectorDotProduct = (v1, v2) => { return v1.x * v2.x + v1.y * v2.y + v1.z * v2.z; }
const vectorSubtraction = (v1, v2) => { return {x: v1.x - v2.x, y: v1.y - v2.y, z: v1.z - v2.z,} }
const vectorByNumber = (n, v) => { return {x: v.x * n, y: v.y * n, z: v.z * n,} }

//Matrices:
const makeProjM = (fov, aspect, near, far) => {
    const f = 1 / Math.tan(fov / 2);
    return [
        [f / aspect, 0, 0, 0],
        [0, f, 0, 0],
        [0, 0, (far + near) / (far - near), -(2 * far * near) / (far - near)],
        [0, 0, 1, 0]
    ];
}

const rotXM = (a) =>{
    return[
        [1, 0, 0, 0],
        [0, Math.cos(a), -Math.sin(a), 0],
        [0, Math.sin(a), Math.cos(a), 0],
        [0, 0, 0, 1],
    ];
}

const rotYM = (a) => {
    return[
        [ Math.cos(a), 0, Math.sin(a), 0],
        [ 0,           1, 0,           0],
        [-Math.sin(a), 0, Math.cos(a), 0],
        [ 0,           0, 0,           1]
    ];
}

const rotZM = (a) =>{
    return[
        [Math.cos(a), -Math.sin(a), 0, 0],
        [Math.sin(a), Math.cos(a), 0, 0],
        [0, 0, 1, 0],
        [0, 0, 0, 1]
    ];
}

const translateM = (x, y, z) =>{
    return[
        [1, 0, 0, x],
        [0, 1, 0, y],
        [0, 0, 1, z],
        [0, 0, 0, 1]
    ];
}

const scaleM = (x, y, z) =>{
    return[
        [x, 0, 0, 0],
        [0, y, 0, 0],
        [0, 0, z, 0],
        [0, 0, 0, 1]
    ];
}

//Matrix Functions:
const multiplyMatVec = (m, v) => {
    return {
        x: m[0][0]*v.x + m[0][1]*v.y + m[0][2]*v.z + m[0][3]*v.w,
        y: m[1][0]*v.x + m[1][1]*v.y + m[1][2]*v.z + m[1][3]*v.w,
        z: m[2][0]*v.x + m[2][1]*v.y + m[2][2]*v.z + m[2][3]*v.w,
        w: m[3][0]*v.x + m[3][1]*v.y + m[3][2]*v.z + m[3][3]*v.w,
    }
}

//Used for combining rotations (matrix multiplication order matters)
const multiplyMatMat = (a, b) => {
    let m = [[0,0,0,0],[0,0,0,0],[0,0,0,0],[0,0,0,0]];
    for (let r = 0; r < 4; r++)
        for (let c = 0; c < 4; c++)
            for (let k = 0; k < 4; k++)
                m[r][c] += a[r][k] * b[k][c];
    return m;
}

const cubeSize = 200;

const cubes = [
    // back wall
    new Cube(-600, 0, 400, 1, cubeSize, cubeSize, cubeSize),
    new Cube(-400, 0, 400, 1, cubeSize, cubeSize, cubeSize),
    new Cube(-200, 0, 400, 1, cubeSize, cubeSize, cubeSize),
    new Cube(0,    0, 400, 1, cubeSize, cubeSize, cubeSize),
    new Cube(200,  0, 400, 1, cubeSize, cubeSize, cubeSize),
    new Cube(400,  0, 400, 1, cubeSize, cubeSize, cubeSize),
    new Cube(600,  0, 400, 1, cubeSize, cubeSize, cubeSize),

    // left wall
    new Cube(-600, 0, 200, 1, cubeSize, cubeSize, cubeSize),
    new Cube(-600, 0,   0, 1, cubeSize, cubeSize, cubeSize),
    new Cube(-600, 0,-200, 1, cubeSize, cubeSize, cubeSize),
    new Cube(-600, 0,-400, 1, cubeSize, cubeSize, cubeSize),

    // right wall
    new Cube(600, 0, 200, 1, cubeSize, cubeSize, cubeSize),
    new Cube(600, 0,   0, 1, cubeSize, cubeSize, cubeSize),
    new Cube(600, 0,-200, 1, cubeSize, cubeSize, cubeSize),
    new Cube(600, 0,-400, 1, cubeSize, cubeSize, cubeSize),
];

const V = [];
const M = [];

for (const cube of cubes) {
    const offset = V.length;
    V.push(...cube.V);
    M.push(...cube.M.map(tri => tri.map(i => i + offset)));
}

let angle = 0; //angle of rotation
const cam = new Camera(0, 0, -1000, 1); //x, y, z, rate

const main = () => {
    let projectedMatrix = [];
    ctx.clearRect(0, 0, CW, CH);
    cam.controls();

    //combine rotations BEFORE use in for loop
    //transformation order: scale, rotate, translate
    //order of multiplication is REVERSE
    const proj = makeProjM(Math.PI/2, CW / CH, 0.1, 1000);

    let view = multiplyMatMat(cam.q.convertToM(), translateM(  cam.x, cam.y, cam.z));
    let final = multiplyMatMat(proj, view);

    for (let p of V){
        let result = multiplyMatVec(final, p);
        const screen = toScreen(result.x, result.y, result.z, result.w)
//        drawPoints(screen.x, screen.y);

        if (result.w >= 0){ //access w because z is divided by w for perspective
            projectedMatrix.push(null);
            continue;
        }

        projectedMatrix.push(screen);
    }

    for (let p of M){
        const p1 = projectedMatrix[p[0]];
        const p2 = projectedMatrix[p[1]];
        const p3 = projectedMatrix[p[2]];

        if (!p1 || !p2 || !p3) continue;

        drawLine(p1.x, p1.y, p2.x, p2.y);
        drawLine(p2.x, p2.y, p3.x, p3.y);
        drawLine(p3.x, p3.y, p1.x, p1.y);
    }

    requestAnimationFrame(main);
}

main();