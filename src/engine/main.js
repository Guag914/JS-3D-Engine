const canvas = document.getElementById('engine-canvas');
canvas.width = window.innerWidth;
canvas.height = window.innerHeight;

//constants:
const CW = canvas.width;
const CH = canvas.height;

const gl = canvas.getContext('webgl2');
gl.enable(gl.DEPTH_TEST);
const vao = gl.createVertexArray();

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
        this.forward = {x: 0, y: 0, z: 0};
        this.right = {x: 0, y: 0, z: 0};
        this.up = {x: 0, y: 0, z: 0};
    }

    controls(){
        const rotM = this.q.convertToM();

        this.forward = { x: rotM[0][2], y: rotM[1][2], z: rotM[2][2] };
        this.right   = { x: rotM[0][0], y: rotM[1][0], z: rotM[2][0] };
        this.up      = { x: rotM[0][1], y: rotM[1][1], z: rotM[2][1] };

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

    //Movement Methods
    mForward(){ this.x -= this.forward.x * this.r * 10; this.y -= this.forward.y * this.r * 10; this.z += this.forward.z * this.r * 10; }
    mBackward(){ this.x += this.forward.x * this.r * 10; this.y += this.forward.y * this.r * 10; this.z -= this.forward.z * this.r * 10; }

    mLeft(){ this.x -= this.right.x * this.r * 10; this.y -= this.right.y * this.r * 10; this.z += this.right.z * this.r * 10; }
    mRight(){ this.x += this.right.x * this.r * 10; this.y += this.right.y * this.r * 10; this.z -= this.right.z * this.r * 10; }

    //test using static +++ || --- not --+ && ++-
    // mForward(){  this.x += this.forward.x * this.r * 10; this.y += this.forward.y * this.r * 10; this.z += this.forward.z * this.r * 10; }
    // mBackward(){ this.x -= this.forward.x * this.r * 10; this.y -= this.forward.y * this.r * 10; this.z -= this.forward.z * this.r * 10; }
    //
    // mLeft(){  this.x -= this.right.x * this.r * 10; this.y -= this.right.y * this.r * 10; this.z -= this.right.z * this.r * 10; }
    // mRight(){ this.x += this.right.x * this.r * 10; this.y += this.right.y * this.r * 10; this.z += this.right.z * this.r * 10; }

    mUp(){ this.y += this.up.y * this.r * 10; }
    mDown(){ this.y -= this.up.y * this.r * 10; }

    //Rotation Methods
    rUp(){ if (this.pitch < 1.5){this.q.update(0.015 * this.r, Math.cos(this.yaw), 0, Math.sin(this.yaw)); this.pitch += 0.015 * this.r;} }
    rDown(){ if (this.pitch > -1.5){this.q.update(-0.015 * this.r, Math.cos(this.yaw), 0, Math.sin(this.yaw)); this.pitch -= 0.015 * this.r;} }

    rLeft(){ this.q.update(0.015 * this.r, 0, 1, 0); this.yaw += 0.015 * this.r; }
    rRight(){ this.q.update(-0.015 * this.r, 0, 1, 0); this.yaw -= 0.015 * this.r; }

    rCW(){ this.q.update(0.015 * this.r, -Math.sin(this.yaw), 0, Math.cos(this.yaw)); this.roll += 0.015 * this.r; }
    rCCW(){ this.q.update(-0.015 * this.r, -Math.sin(this.yaw), 0, Math.cos(this.yaw)); this.roll -= 0.015 * this.r; }

    calcVectorToPoint(v){
        let vec = {
            x: this.x - v.x,
            y: this.y - v.y,
            z: this.z - v.z
        };

        const mag = Math.sqrt(vec.x**2 + vec.y**2 + vec.z**2);
        vec.x /= mag;
        vec.y /= mag;
        vec.z /= mag;

        return vec;
    }
}

const clipTriangle = (v1, v2, v3, r1, g1, b1, r2, g2, b2, r3, g3, b3) => {
    const inside = [];
    const outside = [];

    if (v1.w > 0) inside.push({v: v1, r: r1, g: g1, b: b1}); else outside.push({v: v1, r: r1, g: g1, b: b1});
    if (v2.w > 0) inside.push({v: v2, r: r2, g: g2, b: b2}); else outside.push({v: v2, r: r2, g: g2, b: b2});
    if (v3.w > 0) inside.push({v: v3, r: r3, g: g3, b: b3}); else outside.push({v: v3, r: r3, g: g3, b: b3});

    const clip = (A, B, Ar, Ag, Ab, Br, Bg, Bb) => {
        const t = A.w / (A.w - B.w);
        return {
            v: {
                x: A.x + t * (B.x - A.x),
                y: A.y + t * (B.y - A.y),
                z: A.z + t * (B.z - A.z),
                w: A.w + t * (B.w - A.w)
            },
            r: Ar + t * (Br - Ar),
            g: Ag + t * (Bg - Ag),
            b: Ab + t * (Bb - Ab)
        };
    }

    if (inside.length === 0) return [];

    if (inside.length === 3) return [new Triangle(v1, v2, v3, r1, g1, b1, r2, g2, b2, r3, g3, b3)];

    if (inside.length === 1){
        const a = inside[0];
        const i1 = clip(a.v, outside[0].v, a.r, a.g, a.b, outside[0].r, outside[0].g, outside[0].b);
        const i2 = clip(a.v, outside[1].v, a.r, a.g, a.b, outside[1].r, outside[1].g, outside[1].b);
        return [new Triangle(a.v, i1.v, i2.v, a.r, a.g, a.b, i1.r, i1.g, i1.b, i2.r, i2.g, i2.b)];
    }

    if (inside.length === 2){
        const a = inside[0];
        const b = inside[1];
        const out = outside[0];
        const i1 = clip(a.v, out.v, a.r, a.g, a.b, out.r, out.g, out.b);
        const i2 = clip(b.v, out.v, b.r, b.g, b.b, out.r, out.g, out.b);
        return [
            new Triangle(a.v, b.v, i1.v, a.r, a.g, a.b, b.r, b.g, b.b, i1.r, i1.g, i1.b),
            new Triangle(b.v, i2.v, i1.v, b.r, b.g, b.b, i2.r, i2.g, i2.b, i1.r, i1.g, i1.b)
        ];
    }

    return [];
}

class PointLightSource {
    constructor(x, y, z, intensity, r, g, b){ //no w because it's not going through render pipeline
        this.x = x;
        this.y = y;
        this.z = z;

        this.intensity = intensity;

        //use values from 0 to 1 like webgl
        this.r = r;
        this.g = g;
        this.b = b;
    }

    calcVectorToPoint(v){
        let vec = {
            x: this.x - v.x,
            y: this.y - v.y,
            z: this.z - v.z
        };

        const mag = Math.sqrt(vec.x**2 + vec.y**2 + vec.z**2);
        vec.x /= mag;
        vec.y /= mag;
        vec.z /= mag;

        return vec;
    }
}

class Player {
    constructor(x, y, z, w, r, g, b){
        this.x = x;
        this.y = y;
        this.z = z;
        this.w = w;

        this.r = r;
        this.g = g;
        this.b = b;

        this.rotation = cam.q;

        //placeholder cube for rendering
        this.pos = new Cube(this.x, this.y, this.z, this.w, 100, 100, 100, 0, 0, 0);
    }

    updatePos(){
        this.pos.x = this.x;
        this.pos.y = this.y;
        this.pos.z = this.z;
        this.pos.w = this.w;

        this.pos.V = [
            new Vertex( this.pos.width,  this.pos.height, -this.pos.depth, 1),
            new Vertex( this.pos.width, -this.pos.height, -this.pos.depth, 1),
            new Vertex(-this.pos.width, -this.pos.height, -this.pos.depth, 1),
            new Vertex(-this.pos.width,  this.pos.height, -this.pos.depth, 1),
            new Vertex( this.pos.width,  this.pos.height,  this.pos.depth, 1),
            new Vertex( this.pos.width, -this.pos.height,  this.pos.depth, 1),
            new Vertex(-this.pos.width, -this.pos.height,  this.pos.depth, 1),
            new Vertex(-this.pos.width,  this.pos.height,  this.pos.depth, 1),
        ];
    }

    //handle rendering within the main loop
}

//websocket code
const socket = new WebSocket('ws://localhost:3000');

//other player scripts
const players = new Map();

socket.onmessage = (event) => {
    let otherPlayers = JSON.parse(event.data);

    for (const id in otherPlayers){
        const currX = otherPlayers[id].x;
        const currY = otherPlayers[id].y;
        const currZ = otherPlayers[id].z;
        const currW = otherPlayers[id].w;

        // const currRotation = otherPlayers[id].rotation;
        const currRotation = otherPlayers[id].rotation;

        const currR = otherPlayers[id].r;
        const currG = otherPlayers[id].g;
        const currB = otherPlayers[id].b;

        const currFR = otherPlayers[id].fcr;
        const currFG = otherPlayers[id].fcg;
        const currFB = otherPlayers[id].fcb;

        console.log("CurrG " + currG);

        if (!players.has(id)){ players.set(id, new Player(currX, currY, currZ, currW, currR, currG, currB)) }
        else {
            const currPlayer = players.get(id);
            currPlayer.x = currX;
            currPlayer.y = currY;
            currPlayer.z = currZ;
            currPlayer.w = currW;

            currPlayer.rotation = new Quaternion(
                currRotation.w,
                currRotation.x,
                currRotation.y,
                currRotation.z
            );

            currPlayer.r = currR;
            currPlayer.g = currG;
            currPlayer.b = currB;

            //implement multicolor cubes in pipeline later
            currPlayer.fcr = currFR;
            currPlayer.fcg = currFG;
            currPlayer.fcb = currFB;
        }

    }

    for (const [id] of players) { if (!(id in otherPlayers)) { players.delete(id); } }
}

class Quaternion{
    constructor(w, x, y, z){ // ai + bj + ck d || a + bi + cj + dk
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

    //test with +++ || --- coordinates not ++- && --+
    // convertToM(){
    //     return [
    //         [-(1 - 2*(this.y**2+this.z**2)), -(2*(this.x*this.y+this.w*this.z)),  -(2*(this.x*this.z-this.w*this.y)), 0],
    //         [2*(this.x*this.y-this.w*this.z),  1 - 2*(this.x**2+this.z**2), 2*(this.y*this.z+this.w*this.x), 0],
    //         [2*(this.x*this.z+this.w*this.y),  2*(this.y*this.z-this.w*this.x), 1 - 2*(this.x**2+this.y**2), 0],
    //         [0, 0, 0, 1]
    //     ];
    // }

    quaternionDotProduct(q1, q2) { return q1.x * q2.x + q1.y * q2.y + q1.z * q2.z + q1.w * q2.w; }
}

class Cube {
    constructor(x, y, z, w, width, height, depth, r, g, b) {
        this.x = x;
        this.y = y;
        this.z = z;
        this.w = w;

        this.r = r;
        this.g = g;
        this.b = b;

        this.width = width / 2;
        this.height = height / 2;
        this.depth = depth / 2;

        this.M = [
            // Front face
            [0,1,2], [0,2,3],
            // Back face
            [4,6,5], [4,7,6],
            // Top face
            [0,3,7], [0,7,4],
            // Bottom face
            [1,5,6], [1,6,2],
            // Right face
            [0,4,5], [0,5,1],
            // Left face
            [3,2,6], [3,6,7],
        ];

        this.V = [
            // Front face (z - depth)
            new Vertex(x + this.width, y + this.height, z - this.depth, w), // 0: top-right-front
            new Vertex(x + this.width, y - this.height, z - this.depth, w), // 1: bot-right-front
            new Vertex(x - this.width, y - this.height, z - this.depth, w), // 2: bot-left-front
            new Vertex(x - this.width, y + this.height, z - this.depth, w), // 3: top-left-front
            // Back face (z + depth)
            new Vertex(x + this.width, y + this.height, z + this.depth, w), // 4: top-right-back
            new Vertex(x + this.width, y - this.height, z + this.depth, w), // 5: bot-right-back
            new Vertex(x - this.width, y - this.height, z + this.depth, w), // 6: bot-left-back
            new Vertex(x - this.width, y + this.height, z + this.depth, w), // 7: top-left-back
        ];
    }
}

class Triangle {
    constructor(v1, v2, v3, r1, g1, b1, r2, g2, b2, r3, g3, b3){
        this.v1 = new Vertex(v1.x, v1.y, v1.z, v1.w);
        this.v2 = new Vertex(v2.x, v2.y, v2.z, v2.w);
        this.v3 = new Vertex(v3.x, v3.y, v3.z, v3.w);

        this.r1 = r1;
        this.r2 = r2;
        this.r3 = r3;

        this.g1 = g1;
        this.g2 = g2;
        this.g3 = g3;

        this.b1 = b1;
        this.b2 = b2;
        this.b3 = b3;

        this.vecA = {x: v2.x - v1.x, y: v2.y - v1.y, z:v2.z - v1.z}
        this.vecB = {x: v3.x - v1.x, y: v3.y - v1.y, z:v3.z - v1.z}

        this.vecN = {
            x: this.vecA.y*this.vecB.z - this.vecA.z*this.vecB.y,
            y: this.vecA.z*this.vecB.x - this.vecA.x*this.vecB.z,
            z: this.vecA.x*this.vecB.y - this.vecA.y*this.vecB.x
        }

        //vector normalization
        const mag = Math.sqrt(this.vecN.x**2 + this.vecN.y**2 + this.vecN.z**2);
        this.vecN.x /= mag;
        this.vecN.y /= mag;
        this.vecN.z /= mag;
    }
}

class Vertex {
    constructor (x, y, z, w){
        this.x = x;
        this.y = y;
        this.z = z;
        this.w = w;
    }
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

const negateMat = (m) =>{
    return {
        x: m[0][0]*-1 + m[0][1]*-1 + m[0][2]*-1 + m[0][3]*-1,
        y: m[1][0]*-1 + m[1][1]*-1 + m[1][2]*-1 + m[1][3]*-1,
        z: m[2][0]*-1 + m[2][1]*-1 + m[2][2]*-1 + m[2][3]*-1,
        w: m[3][0]*-1 + m[3][1]*-1 + m[3][2]*-1 + m[3][3]*-1,
    }
}

const s = 200;

const cubes = [
    // --- CEILING ---
    new Cube(-600, 400, -400, 1, s, s, s, 1, 1, 1),
    new Cube(-400, 400, -400, 1, s, s, s, 1, 1, 1),
    new Cube(-200, 400, -400, 1, s, s, s, 1, 1, 1),
    new Cube(   0, 400, -400, 1, s, s, s, 1, 1, 1),
    new Cube( 200, 400, -400, 1, s, s, s, 1, 1, 1),
    new Cube( 400, 400, -400, 1, s, s, s, 1, 1, 1),
    new Cube( 600, 400, -400, 1, s, s, s, 1, 1, 1),

    new Cube(-600, 400, -200, 1, s, s, s, 1, 1, 1),
    new Cube(-400, 400, -200, 1, s, s, s, 1, 1, 1),
    new Cube(-200, 400, -200, 1, s, s, s, 1, 1, 1),
    new Cube(   0, 400, -200, 1, s, s, s, 1, 1, 1),
    new Cube( 200, 400, -200, 1, s, s, s, 1, 1, 1),
    new Cube( 400, 400, -200, 1, s, s, s, 1, 1, 1),
    new Cube( 600, 400, -200, 1, s, s, s, 1, 1, 1),

    new Cube(-600, 400, 0, 1, s, s, s, 1, 1, 1),
    new Cube(-400, 400, 0, 1, s, s, s, 1, 1, 1),
    new Cube(-200, 400, 0, 1, s, s, s, 1, 1, 1),
    new Cube(   0, 400, 0, 1, s, s, s, 1, 1, 1),
    new Cube( 200, 400, 0, 1, s, s, s, 1, 1, 1),
    new Cube( 400, 400, 0, 1, s, s, s, 1, 1, 1),
    new Cube( 600, 400, 0, 1, s, s, s, 1, 1, 1),

    new Cube(-600, 400, 200, 1, s, s, s, 1, 1, 1),
    new Cube(-400, 400, 200, 1, s, s, s, 1, 1, 1),
    new Cube(-200, 400, 200, 1, s, s, s, 1, 1, 1),
    new Cube(   0, 400, 200, 1, s, s, s, 1, 1, 1),
    new Cube( 200, 400, 200, 1, s, s, s, 1, 1, 1),
    new Cube( 400, 400, 200, 1, s, s, s, 1, 1, 1),
    new Cube( 600, 400, 200, 1, s, s, s, 1, 1, 1),

    new Cube(-600, 400, 400, 1, s, s, s, 1, 1, 1),
    new Cube(-400, 400, 400, 1, s, s, s, 1, 1, 1),
    new Cube(-200, 400, 400, 1, s, s, s, 1, 1, 1),
    new Cube(   0, 400, 400, 1, s, s, s, 1, 1, 1),
    new Cube( 200, 400, 400, 1, s, s, s, 1, 1, 1),
    new Cube( 400, 400, 400, 1, s, s, s, 1, 1, 1),
    new Cube( 600, 400, 400, 1, s, s, s, 1, 1, 1),
];

//init compiling
//glsl source vertex and fragment
const gpuTriBuffer = gl.createBuffer();
const vertexShaderSource = `#version 300 es
    precision mediump float;

    in vec4 vertexPosition;
    in vec3 vertexBrightness;
    
    out vec3 fragBrightness;

    void main(){
        gl_Position = vertexPosition;
        fragBrightness = vertexBrightness;
    }
`;

const fragmentShaderSource = `#version 300 es
    precision mediump float;
    
    in vec3 fragBrightness;
    out vec4 outputColor;

    void main(){
        outputColor = vec4(fragBrightness, 1.0);
    }

`;
const webGlInit = () => {
    //compile shaders with source code
    const vertexShader = gl.createShader(gl.VERTEX_SHADER);
    gl.shaderSource(vertexShader, vertexShaderSource);
    gl.compileShader(vertexShader);

    //check for source errors and return if true
    if (!gl.getShaderParameter(vertexShader, gl.COMPILE_STATUS)) { console.log(`Failed to compile vertex shader: ${gl.getShaderInfoLog(vertexShader)}`); }

    const fragmentShader = gl.createShader(gl.FRAGMENT_SHADER);
    gl.shaderSource(fragmentShader, fragmentShaderSource);
    gl.compileShader(fragmentShader);

    //check for source errors and return if true
    if (!gl.getShaderParameter(fragmentShader, gl.COMPILE_STATUS)) { console.log(`Failed to compile fragment shader: ${gl.getShaderInfoLog(fragmentShader)}`); }

    const shaderProgram = gl.createProgram();
    gl.attachShader(shaderProgram, vertexShader);
    gl.attachShader(shaderProgram, fragmentShader);
    gl.linkProgram(shaderProgram);

    if (!gl.getProgramParameter(shaderProgram, gl.LINK_STATUS)) { console.log(`Failed to link shader: ${gl.getProgramInfoLog(shaderProgram)}`); }

    const vertexAttribLocation = gl.getAttribLocation(shaderProgram, `vertexPosition`);
    if (vertexAttribLocation < 0) { console.log(`Failed to get attrib location for verertexPosition`); }

    const vertexAttribBrightness = gl.getAttribLocation(shaderProgram, `vertexBrightness`);
    if (vertexAttribBrightness < 0) { console.log(`Failed to get attrib location for vertexBrightness`); }

    gl.useProgram(shaderProgram);
    gl.bindVertexArray(vao);
    gl.bindBuffer(gl.ARRAY_BUFFER, gpuTriBuffer);

    //position (first 4 floats)
    gl.vertexAttribPointer(
        vertexAttribLocation, //index
        4, //size
        gl.FLOAT, //type in the actual buffer
        false, //normalized parameter
        7 * Float32Array.BYTES_PER_ELEMENT, //stride
        0 //offset - how many bytes to skip
    );

    //brightness (5th float)
    gl.vertexAttribPointer(
        vertexAttribBrightness, //index
        3, //size
        gl.FLOAT, //type in the actual buffer
        false, //normalized parameter
        7 * Float32Array.BYTES_PER_ELEMENT, //stride
        4 * Float32Array.BYTES_PER_ELEMENT //offset - how many bytes to skip
    );

    gl.enableVertexAttribArray(vertexAttribLocation);
    gl.enableVertexAttribArray(vertexAttribBrightness);
}

//webgl rendering
const render = (triBuffer) => {
    try {

        if (!canvas){ console.log('Cannot get canvas element'); return; }
        if (!gl){ console.log('Browser does not support webgl2'); return; }

        const triVert = [];

        for (let tri of triBuffer){
            // const brightness = (tri.b1+tri.b2+tri.b3)/3; //use raw values for smooth shading (gpu interpolation) - removed because of significant interpolation issues

            triVert.push(tri.v1.x, tri.v1.y, tri.v1.z, tri.v1.w, tri.r1, tri.g1, tri.b1);
            triVert.push(tri.v2.x, tri.v2.y, tri.v2.z, tri.v2.w, tri.r2, tri.g2, tri.b2);
            triVert.push(tri.v3.x, tri.v3.y, tri.v3.z, tri.v3.w, tri.r3, tri.g3, tri.b3);
        }

        const cpuTriBuffer = new Float32Array(triVert); //gpu uses 32 bit to store format
        gl.bindBuffer(gl.ARRAY_BUFFER, gpuTriBuffer);
        gl.bufferData(gl.ARRAY_BUFFER, cpuTriBuffer, gl.DYNAMIC_DRAW);

        //DEBUG
        // console.log('First triangle NDC coords:');
        // console.log(`v1: ${cpuTriBuffer[0].toFixed(3)}, ${cpuTriBuffer[1].toFixed(3)}, ${cpuTriBuffer[2].toFixed(3)}, ${cpuTriBuffer[3].toFixed(3)}`);
        // console.log(`v2: ${cpuTriBuffer[4].toFixed(3)}, ${cpuTriBuffer[5].toFixed(3)}, ${cpuTriBuffer[6].toFixed(3)}, ${cpuTriBuffer[7].toFixed(3)}`);
        // console.log(`v3: ${cpuTriBuffer[8].toFixed(3)}, ${cpuTriBuffer[9].toFixed(3)}, ${cpuTriBuffer[10].toFixed(3)}, ${cpuTriBuffer[11].toFixed(3)}`);
        // console.log('buffer length:', cpuTriBuffer.length);

        gl.clearColor(0.08, 0.08, 0.08, 1); //gray bg
        gl.clear(gl.DEPTH_BUFFER_BIT | gl.COLOR_BUFFER_BIT);
        gl.enable(gl.DEPTH_TEST);

        //Rasterizer - which pixels are part of a triangle
        gl.viewport(0, 0, canvas.width, canvas.height);

        //Draw call - primitive assembly
        gl.drawArrays(gl.TRIANGLES, 0, triVert.length / 7);

        const err = gl.getError();
        if (err !== gl.NO_ERROR) console.log('WebGL error:', err);

    } catch (e){console.log(e);}
}

window.addEventListener('resize', () => {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    gl.viewport(0, 0, canvas.width, canvas.height);
});

//Main Render Pipeline
const cam = new Camera(0, 1000, -1000, 1); //x, y, z, rate

const lights = [
    new PointLightSource(0, 1000, -1000, 1000000, 1, 1, 1),
    new PointLightSource(1000, 1000, 1000, 1000000, 0, 1, 0),
    new PointLightSource(-1000, 1000, 1000, 1000000, 0, 0, 1)
];

const main = () => {
    //update light source position for testing
    lights[0].x = cam.x;
    lights[0].y = cam.y;
    lights[0].z = cam.z;

    //upate player logic, then render

    if (socket.readyState === WebSocket.OPEN) {  // only send if connected
        const data = {x: cam.x, y: cam.y, z: cam.z, w: 1, rotation: {w: cam.q.w, x: -cam.q.x, y: -cam.q.y, z: -cam.q.z}, r: 1, g: 0, b: 0 };
        socket.send(JSON.stringify(data));
    }

    cam.controls();

    //combine thererotations BEFORE use in for loop
    //transformation order: scale, rotate, translate
    //order of multiplication is REVERSE
    const projMatrix = makeProjM(Math.PI/2, CW / CH, 1, 10000); // 120 degrees

    let camView = multiplyMatMat(cam.q.convertToM(), translateM(  -cam.x, -cam.y, -cam.z  ));
    let camProj = multiplyMatMat(projMatrix, camView);

    let triangleBuffer = [];

    for (let c of cubes){
        for (let vert of c.M){ //look through map

            //original verticies
            const v1 = c.V[vert[0]];
            const v2 = c.V[vert[1]];
            const v3 = c.V[vert[2]];

            const h = handleTriangle(v1, v2, v3, c.r, c.g, c.b, lights);
            if (!h) continue;

            //vertex projection
            let pv1 = multiplyMatVec(camProj, v1);
            let pv2 = multiplyMatVec(camProj, v2);
            let pv3 = multiplyMatVec(camProj, v3);

            const clipped = clipTriangle(pv1, pv2, pv3, h.cr1, h.cg1, h.cb1, h.cr2, h.cg2, h.cb2, h.cr3, h.cg3, h.cb3);
            for (const tri of clipped) triangleBuffer.push(tri);
        }
    }

    //multiplayer handling
    for (const [id, player] of players) { //iterate through map of players
            player.updatePos();

            const playerView = multiplyMatMat(translateM(player.x, player.y, player.z), player.rotation.convertToM());
            const playerProj = multiplyMatMat(camProj, playerView);

            for (const vert of player.pos.M){ //iterate through vertex map of each player
                //verticies
                const v1 = player.pos.V[vert[0]];
                const v2 = player.pos.V[vert[1]];
                const v3 = player.pos.V[vert[2]];

                //translate vertices without projection (raw world space coords)
                const wv1 = multiplyMatVec(playerView, v1);
                const wv2 = multiplyMatVec(playerView, v2);
                const wv3 = multiplyMatVec(playerView, v3);

                console.log("G " + player.g);

                const h = handleTriangle(wv1, wv2, wv3, player.r, player.g, player.b, lights);
                if (!h) continue;

                // clip space vertices for projection
                const pv1 = multiplyMatVec(playerProj, v1);
                const pv2 = multiplyMatVec(playerProj, v2);
                const pv3 = multiplyMatVec(playerProj, v3);

                const clipped = clipTriangle(pv1, pv2, pv3, h.cr1, h.cg1, h.cb1, h.cr2, h.cg2, h.cb2, h.cr3, h.cg3, h.cb3);
                for (const tri of clipped) triangleBuffer.push(tri);
            }
        }

     render(triangleBuffer);

    requestAnimationFrame(main);
}

handleTriangle = (v1, v2, v3, cr, cg, cb, lights) => {

    //backface culling
    let tempTri = new Triangle(v1, v2, v3);

    if (vectorDotProduct(cam.calcVectorToPoint(v1), tempTri.vecN) < 0){ return; }

    //brightness calculations
    let sr1 = [];
    let sr2 = [];
    let sr3 = [];

    let sg1 = [];
    let sg2 = [];
    let sg3 = [];

    let sb1 = [];
    let sb2 = [];
    let sb3 = [];

    for (let light of lights){
        const dist1 = (light.x-v1.x)**2 + (light.y-v1.y)**2 + (light.z-v1.z)**2;
        const dist2 = (light.x-v2.x)**2 + (light.y-v2.y)**2 + (light.z-v2.z)**2;
        const dist3 = (light.x-v3.x)**2 + (light.y-v3.y)**2 + (light.z-v3.z)**2;

        const b1 = Math.min(Math.max(vectorDotProduct(light.calcVectorToPoint(v1), tempTri.vecN) / dist1 * light.intensity, 0), 1);
        const b2 = Math.min(Math.max(vectorDotProduct(light.calcVectorToPoint(v2), tempTri.vecN) / dist2 * light.intensity, 0), 1);
        const b3 = Math.min(Math.max(vectorDotProduct(light.calcVectorToPoint(v3), tempTri.vecN) / dist3 * light.intensity, 0), 1);

        sr1.push(cr * light.r * b1);
        sg1.push(cg * light.g * b1);
        sb1.push(cb * light.b * b1);

        sr2.push(cr * light.r * b2);
        sg2.push(cg * light.g * b2);
        sb2.push(cb * light.b * b2);

        sr3.push(cr * light.r * b3);
        sg3.push(cg * light.g * b3);
        sb3.push(cb * light.b * b3);
    }

    const r1 = Math.min(sr1.reduce((a,b) => a+b, 0), 1);
    const g1 = Math.min(sg1.reduce((a,b) => a+b, 0), 1);
    const b1 = Math.min(sb1.reduce((a,b) => a+b, 0), 1);

    const r2 = Math.min(sr2.reduce((a,b) => a+b, 0), 1);
    const g2 = Math.min(sg2.reduce((a,b) => a+b, 0), 1);
    const b2 = Math.min(sb2.reduce((a,b) => a+b, 0), 1);

    const r3 = Math.min(sr3.reduce((a,b) => a+b, 0), 1);
    const g3 = Math.min(sg3.reduce((a,b) => a+b, 0), 1);
    const b3 = Math.min(sb3.reduce((a,b) => a+b, 0), 1);

    return {
        cr1: r1, cr2: r2, cr3: r3,
        cg1: g1, cg2: g2, cg3: g3,
        cb1: b1, cb2: b2, cb3: b3
    }

}

webGlInit();
main();