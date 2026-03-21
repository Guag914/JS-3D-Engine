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
    constructor (x, y, z){
        this.x = x;
        this.y = y;
        this.z = z;
        this.rate = 10;

        //identity quaternion
        this.q = new Quaternion(1, 0, 0, 0);

        //yaw for tracking
        this.yaw = 0;
        this.pitch = 0;
        this.roll = 0;
    }

    controls(){
        const rotM = this.q.convertToM();

        const forward = { x: rotM[0][2], y: rotM[1][2], z: rotM[2][2] }; //store as a vector instead of just a scalar
        let right =   { x: rotM[0][0], y: rotM[1][0], z: rotM[2][0] };
        let up =      { x: rotM[0][1], y: rotM[1][1], z: rotM[2][1] };

        //gram schmidt process to make the vectors orthogonal
        //subtract projection of each matrix so only get the perpendicular component
        //normalize after to get unit vector
        //right = right - (right·forward / forward·forward) * forward
        //up = up - (up·forward / forward·forward) * forward - (up·right / right·right) * right

        right = vectorSubtraction(right, vectorByNumber(vectorDotProduct(right, forward)/vectorDotProduct(forward, forward), forward))

        up = vectorSubtraction(up, vectorByNumber(vectorDotProduct(up, forward)/vectorDotProduct(forward, forward), forward));
        up = vectorSubtraction(up, vectorByNumber(vectorDotProduct(up, right)/vectorDotProduct(right, right), right));

        let  rightLength = Math.sqrt(right.x**2 + right.y**2 + right.z**2);
        let  upLength = Math.sqrt(up.x**2 + up.y**2 + up.z**2);

        right = vectorByNumber(1/rightLength, right); //normalize vectors
        up = vectorByNumber(1/upLength, up);

        console.log(vectorDotProduct(forward, right).toFixed(6)); // should be ~0 if orthogonal
        console.log(`
            RightX: ${right.x}, RightY: ${right.y}, RightZ: ${right.z},
            \n ForwardX: ${forward.x}, ForwardY: ${forward.y}, ForwardZ: ${forward.z}
            \n Roll: ${this.roll}, Pitch: ${this.pitch}, Yaw: ${this.yaw}
        `);


        if (pressedKeys['KeyW']){
            this.x -= forward.x * this.rate;
//            this.y -= forward.y * this.rate;
            this.z += forward.z * this.rate;
        }
        if (pressedKeys['KeyS']){
            this.x += forward.x * this.rate;
//            this.y += forward.y * this.rate;
            this.z -= forward.z * this.rate;
        }
        if (pressedKeys['KeyA']){
            this.x -= right.x * this.rate;
//            this.y += right.y * this.rate;
            this.z += right.z * this.rate;
        }
        if (pressedKeys['KeyD']){
            this.x += right.x * this.rate;
//            this.y -= right.y * this.rate;
            this.z -= right.z * this.rate;
        }

        if (pressedKeys['Space']){ this.y += this.rate; }
        if (pressedKeys['ShiftLeft']){ this.y -= this.rate; }

        //yaw
        if (pressedKeys['ArrowLeft']){ this.q.update(0.015, 0, 1, 0); this.yaw += 0.015;}
        if (pressedKeys['ArrowRight']){ this.q.update(-0.015, 0, 1, 0); this.yaw -= 0.015;}

        //pitch
        if (pressedKeys['ArrowUp']){ this.q.update(0.015, Math.cos(this.yaw), 0, Math.sin(this.yaw)); this.pitch += 0.015;}
        if (pressedKeys['ArrowDown']){ this.q.update(-0.015, Math.cos(this.yaw), 0, Math.sin(this.yaw)); this.pitch -= 0.015;}
//        if (pressedKeys['ArrowUp']){ this.q.update(0.015, 1, 0, 0);  } //causes gimbal lock
//        if (pressedKeys['ArrowDown']){ this.q.update(-0.015, 1, 0, 0);  }
//        if (pressedKeys['ArrowUp']){ this.q.update(0.015, right.x, right.y, right.z);  } //causes camera wobble
//        if (pressedKeys['ArrowDown']){ this.q.update(-0.015, right.x, right.y, right.z);  }

        //roll
        if (pressedKeys['KeyE']){ this.q.update(0.015, -Math.sin(this.yaw), 0, Math.cos(this.yaw)); this.roll += 0.015; }
        if (pressedKeys['KeyQ']){ this.q.update(-0.015, -Math.sin(this.yaw), 0, Math.cos(this.yaw)); this.roll -= 0.015; }
//        if (pressedKeys['KeyE']){ this.q.update(0.015, 0, 0, 1); } //causes gimbal lock
//        if (pressedKeys['KeyQ']){ this.q.update(-0.015, 0, 0, 1); }
//        if (pressedKeys['KeyE']){ this.q.update(0.015, forward.x, forward.y, forward.z); } //causes camera wobble
//        if (pressedKeys['KeyQ']){ this.q.update(-0.015, forward.x, forward.y, forward.z); }
    }
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

    update(angle, tx, ty, tz){ //use 0 to denote a certain axis
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


const cam = new Camera(0, 0, -1000);

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
        projectedMatrix.push(screen);
    }

    for (let p of M){
        const p1 = projectedMatrix[p[0]];
        const p2 = projectedMatrix[p[1]];
        const p3 = projectedMatrix[p[2]];

        if (p1.z < 1 || p2.z < 1 || p3.z < 1) continue;
        drawLine(p1.x, p1.y, p2.x, p2.y);
        drawLine(p2.x, p2.y, p3.x, p3.y);
        drawLine(p3.x, p3.y, p1.x, p1.y);
    }

    requestAnimationFrame(main);
}

main();