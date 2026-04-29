const canvas = document.getElementById('engine-canvas');
canvas.width = window.innerWidth;
canvas.height = window.innerHeight;

//constants:
const CW = canvas.width;
const CH = canvas.height;

const gl = canvas.getContext('webgl2', { stencil: true });

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

class SpotLightSource {
    constructor(x, y, z, dx, dy, dz, intensity, r, g, b, angle){ //no w because it's not going through render pipeline
        //coordinate
        this.x = x;
        this.y = y;
        this.z = z;

        //direction
        this.dx = dx;
        this.dy = dy;
        this.dz = dz;

        this.angle = angle;
        this.intensity = intensity;

        //use values from 0 to 1 like webgl
        this.r = r;
        this.g = g;
        this.b = b;
    }

    calcVectorToPoint(v){
        let vec = {
            x: v.x - this.x,
            y: v.y - this.y,
            z: v.z - this.z
        };

        const mag = Math.sqrt(vec.x**2 + vec.y**2 + vec.z**2);
        vec.x /= mag;
        vec.y /= mag;
        vec.z /= mag;

        return vec;
    }

    degreesToRadians(a){ return (a*Math.PI)/180 }

    calcContribution(v1, v2, v3, tempTri){
        const dist1 = (this.x-v1.x)**2 + (this.y-v1.y)**2 + (this.z-v1.z)**2;
        const dist2 = (this.x-v2.x)**2 + (this.y-v2.y)**2 + (this.z-v2.z)**2;
        const dist3 = (this.x-v3.x)**2 + (this.y-v3.y)**2 + (this.z-v3.z)**2;

        const ref1 = this.calcVectorToPoint(v1);
        const ref2 = this.calcVectorToPoint(v2);
        const ref3 = this.calcVectorToPoint(v3);

        let b1 = 0.05;
        let b2 = 0.05;
        let b3 = 0.05;

        const vecD = {x: this.dx, y: this.dy, z: this.dz};
        const mag = Math.sqrt(vecD.x**2 + vecD.y**2 + vecD.z**2);

        vecD.x /= mag;
        vecD.y /= mag;
        vecD.z /= mag;

        if (vectorDotProduct(ref1, vecD) > Math.cos(this.degreesToRadians(this.angle))){ b1 = Math.min(Math.max(vectorDotProduct(ref1, v1.vecN) / dist1 * this.intensity, 0.0), 1); }
        if (vectorDotProduct(ref2, vecD) > Math.cos(this.degreesToRadians(this.angle))){ b2 = Math.min(Math.max(vectorDotProduct(ref2, v2.vecN) / dist2 * this.intensity, 0.0), 1); }
        if (vectorDotProduct(ref3, vecD) > Math.cos(this.degreesToRadians(this.angle))){ b3 = Math.min(Math.max(vectorDotProduct(ref3, v3.vecN) / dist3 * this.intensity, 0.0), 1); }

        return {c1: b1, c2: b2, c3: b3}
    }
}

class DirectionalLightSource {
    constructor(x, y, z, intensity, r, g, b){

        const mag = Math.sqrt(x**2 + y**2 + z**2);

        //coords in this context pertaibn to direction not coordiantes
        this.x = x / mag;
        this.y = y / mag;
        this.z = z / mag;

        this.intensity = intensity;

        //use values from 0 to 1 like webgl
        this.r = r;
        this.g = g;
        this.b = b;
    }

    calcContribution(v1, v2, v3, tempTri){

        //construct vector before use
        let vec = {
            x: this.x,
            y: this.y,
            z: this.z
        }

        // console.log('vec:', vec, 'v1.vecN:', v1.vecN, 'dot:', vectorDotProduct(vec, v1.vecN));

        const b1 = Math.min(Math.max(vectorDotProduct(vec, v1.vecN) * this.intensity, 0.0), 1);
        const b2 = Math.min(Math.max(vectorDotProduct(vec, v2.vecN) * this.intensity, 0.0), 1);
        const b3 = Math.min(Math.max(vectorDotProduct(vec, v3.vecN) * this.intensity, 0.0), 1);

        return {c1: b1, c2: b2, c3: b3} //return in same format in order to keep pipeline the same
    }
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

    calcContribution(v1, v2, v3, tempTri){
        const dist1 = (this.x-v1.x)**2 + (this.y-v1.y)**2 + (this.z-v1.z)**2;
        const dist2 = (this.x-v2.x)**2 + (this.y-v2.y)**2 + (this.z-v2.z)**2;
        const dist3 = (this.x-v3.x)**2 + (this.y-v3.y)**2 + (this.z-v3.z)**2;

        const b1 = Math.min(Math.max(vectorDotProduct(this.calcVectorToPoint(v1), v1.vecN) / dist1 * this.intensity, 0.05), 1);
        const b2 = Math.min(Math.max(vectorDotProduct(this.calcVectorToPoint(v2), v2.vecN) / dist2 * this.intensity, 0.05), 1);
        const b3 = Math.min(Math.max(vectorDotProduct(this.calcVectorToPoint(v3), v3.vecN) / dist3 * this.intensity, 0.05), 1);

        return {c1: b1, c2: b2, c3: b3}
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

        console.log(x);

        //placeholder cube for rendering
        this.pos = new Mesh(createSphere(0, 0, 0, 50, 8, 8), this.r, this.g, this.b);
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

        const currRotation = otherPlayers[id].rotation;

        const currR = otherPlayers[id].r;
        const currG = otherPlayers[id].g;
        const currB = otherPlayers[id].b;

        const currFR = otherPlayers[id].fcr;
        const currFG = otherPlayers[id].fcg;
        const currFB = otherPlayers[id].fcb;


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
    constructor(w, x, y, z){ //ai + bj + ck d || a + bi + cj + dk
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

class Mesh {
    constructor(T, r, g, b, doubleSided){
        this.T = T;
        this.r = r;
        this.g = g;
        this.b = b;
        this.doubleSided = doubleSided;
    }
}

class Triangle {
    constructor(v1, v2, v3, r1, g1, b1, r2, g2, b2, r3, g3, b3){
        this.v1 = new Vertex(v1.x, v1.y, v1.z, v1.w);
        this.v2 = new Vertex(v2.x, v2.y, v2.z, v2.w);
        this.v3 = new Vertex(v3.x, v3.y, v3.z, v3.w);

        //color values for brightness
        this.r1 = r1;
        this.r2 = r2;
        this.r3 = r3;

        this.g1 = g1;
        this.g2 = g2;
        this.g3 = g3;

        this.b1 = b1;
        this.b2 = b2;
        this.b3 = b3;

        //face normal
        this.vecN = calculateFaceNormal(this.v1, this.v2, this.v3);;

        //vector normalization
        const mag = Math.sqrt(this.vecN.x**2 + this.vecN.y**2 + this.vecN.z**2);
        this.vecN.x /= mag;
        this.vecN.y /= mag;
        this.vecN.z /= mag;

        //handle normals within triangle
        this.v1.nx = v1.nx || 0;
        this.v1.ny = v1.ny || 0;
        this.v1.nz = v1.nz || 0;
        this.v1.vecN = {x: this.v1.nx, y: this.v1.ny, z: this.v1.nz};

        this.v2.nx = v2.nx || 0;
        this.v2.ny = v2.ny || 0;
        this.v2.nz = v2.nz || 0;
        this.v2.vecN = {x: this.v2.nx, y: this.v2.ny, z: this.v2.nz};

        this.v3.nx = v3.nx || 0;
        this.v3.ny = v3.ny || 0;
        this.v3.nz = v3.nz || 0;
        this.v3.vecN = {x: this.v3.nx, y: this.v3.ny, z: this.v3.nz};
    }
}

class Vertex {
    constructor (x, y, z, w){
        //vector coordinates
        this.x = x;
        this.y = y;
        this.z = z;
        this.w = w;

        //lighting vector normal (no w because not going through render pipeline)
        this.nx = 0;
        this.ny = 0;
        this.nz = 0;

        this.vecN = {x: this.nx, y: this.ny, z: this.nz}
    }
}

//Vector operations
const vectorDotProduct = (v1, v2) => { return v1.x * v2.x + v1.y * v2.y + v1.z * v2.z; }
const vectorSubtraction = (v1, v2) => { return {x: v1.x - v2.x, y: v1.y - v2.y, z: v1.z - v2.z,} }
const vectorByNumber = (n, v) => { return {x: v.x * n, y: v.y * n, z: v.z * n,} }

const calculateFaceNormal = (v1, v2, v3) => {
    //orthagonal vectors
    const vecA = {x: v2.x - v1.x, y: v2.y - v1.y, z:v2.z - v1.z}
    const vecB = {x: v3.x - v1.x, y: v3.y - v1.y, z:v3.z - v1.z}

    //face normal
    const vecN = {
        x: vecA.y*vecB.z - vecA.z*vecB.y,
        y: vecA.z*vecB.x - vecA.x*vecB.z,
        z: vecA.x*vecB.y - vecA.y*vecB.x
    }

    //vector normalization
    const mag = Math.sqrt(vecN.x**2 + vecN.y**2 + vecN.z**2);
    if (mag === 0 || isNaN(mag)) return {x: 0, y: 1, z: 0}; // default normal

    vecN.x /= mag;
    vecN.y /= mag;
    vecN.z /= mag;

    return vecN;
}

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

//need to build adjacency maping
const adjacencyMap = new Map();
const buildAdjacencyMap = () => {
    //init map
    for (let tri of mesh.T){

        let key1 = tri.v1.x + "," + tri.v1.y + "," +tri.v1.z;
        let key2 = tri.v2.x + "," + tri.v2.y + "," +tri.v2.z;
        let key3 = tri.v3.x + "," + tri.v3.y + "," +tri.v3.z;

        adjacencyMap.set(key1, []);
        adjacencyMap.set(key2, []);
        adjacencyMap.set(key3, []);
    }

    //build values
    for (let tri of mesh.T){
        const v1 = tri.v1;
        const v2 = tri.v2
        const v3 = tri.v3

        const faceNormal = calculateFaceNormal(v1, v2, v3);

        const key1 = v1.x + "," + v1.y + "," + v1.z;
        const key2 = v2.x + "," + v2.y + "," + v2.z;
        const key3 = v3.x + "," + v3.y + "," + v3.z;

        adjacencyMap.get(key1).push(faceNormal);
        adjacencyMap.get(key2).push(faceNormal);
        adjacencyMap.get(key3).push(faceNormal);
    }

    //store on vertex
    for (const [key, normals] of adjacencyMap){
        if (normals.length === 0) continue;

        const reference = normals[0];
        const sum = {x: 0, y: 0, z: 0};

        //threshold for smoothing
        for (const n of normals){
            if (vectorDotProduct(reference, n) > Math.cos(Math.PI)){
                sum.x += n.x;
                sum.y += n.y;
                sum.z += n.z;
            }
        }

        //normalize normal vectors
        const mag = Math.sqrt(sum.x**2 + sum.y**2 + sum.z**2);
        sum.x /= mag;
        sum.y /= mag;
        sum.z /= mag;

        for (let tri of mesh.T){
            for (let i = 0; i < 3; i++){

                let v = {};

                if (i === 0){ v = tri.v1; }
                if (i === 1){ v = tri.v2; }
                if (i === 2){ v = tri.v3; }

                const testKey = v.x + "," + v.y + "," + v.z;

                if (testKey === key){
                    //update vertex object normals
                    v.nx = sum.x;
                    v.ny = sum.y;
                    v.nz = sum.z;

                    v.vecN.x = v.nx;
                    v.vecN.y = v.ny;
                    v.vecN.z = v.nz;
                }
            }

            // console.log(c.V[0].vecN);
        }
    }
}

const edgeMap = new Map();

const buildEdgeMap = (mesh) => {
    for (let tri of mesh.T){
        const edges = [ //map vertices in pairs
            tri.v1, tri.v2,
            tri.v2, tri.v3,
            tri.v3, tri.v1
        ];

        for (let v = 0; v < edges.length; v += 2){
            let key = makeEdgeKey(edges[v], edges[v+1]);
            //if the keys match then the vertices are in the same position and the triangle shares an edge
            if (!edgeMap.has(key)){ edgeMap.set( key, {v1: edges[v], v2: edges[v+1], triangles: []} ); }
            edgeMap.get(key).triangles.push(tri);
        }
    }
}

const makeEdgeKey = (va, vb) => {
    const ka = va.x + "," + va.y + "," + va.z;
    const kb = vb.x + "," + vb.y + "," + vb.z;
    return ka < kb ? ka + "|" + kb : kb + "|" + ka;
}

const getSilhouettes = (light) => {
    const silhouettes = [];
    for (let [key, data] of edgeMap) {
        //check if there are exactly 2 triangles
        if (data.triangles.length === 2) {
            const triA = data.triangles[0];
            const triB = data.triangles[1];

            //vector from Light to the Edge
            let vecL = {
                x: data.v1.x - light.x,
                y: data.v1.y - light.y,
                z: data.v1.z - light.z
            };

            //check dot product
            const dotA = vectorDotProduct(vecL, triA.vecN);
            const dotB = vectorDotProduct(vecL, triB.vecN);

            //make one triangle face light while other away creating "volume" of shadow
            if ((dotA > 0 && dotB <= 0) || (dotB > 0 && dotA <= 0)) {
                silhouettes.push(data);
            }
        }
    }
    return silhouettes;
}

const extrudeSilhouettes = (silhouettes, light) => {

    const volumeTriangles = [];
    const lightPos = { x: light.x, y: light.y, z: light.z };
    const farDist = 10000; //larger number = father shadow distance | decrase to improve performance

    silhouettes.forEach(edge => {
        const v1 = edge.v1;
        const v2 = edge.v2;

        // Calculate far points
        const dir1 = { x: v1.x - lightPos.x, y: v1.y - lightPos.y, z: v1.z - lightPos.z };
        const dir2 = { x: v2.x - lightPos.x, y: v2.y - lightPos.y, z: v2.z - lightPos.z };

        const v1_far = {
            x: v1.x + dir1.x * farDist,
            y: v1.y + dir1.y * farDist,
            z: v1.z + dir1.z * farDist,
            w: 1
        };

        const v2_far = {
            x: v2.x + dir2.x * farDist,
            y: v2.y + dir2.y * farDist,
            z: v2.z + dir2.z * farDist,
            w: 1
        };

        // Try this specific winding
        // Triangle 1: v1 -> v2 -> v1_far
        volumeTriangles.push(new Triangle(v1, v2, v1_far));

// Triangle 2: v2 -> v2_far -> v1_far
        volumeTriangles.push(new Triangle(v2, v2_far, v1_far));
    });

    return volumeTriangles;
}

//init compiling

let gpuShadowBuffer;
let gpuQuadBuffer;

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

    gpuShadowBuffer = gl.createBuffer();
    gpuQuadBuffer = gl.createBuffer();

    //enable stencil
    gl.enable(gl.STENCIL_TEST);
}

//webgl rendering
const render = (triBuffer, shadowBuffer) => {
    try {

        if (!canvas){ console.log('Cannot get canvas element'); return; }
        if (!gl){ console.log('Browser does not support webgl2'); return; }

        //step 1 clear canvas
        gl.clearColor(0.08, 0.08, 0.08, 1); //gray bg
        gl.clear(gl.DEPTH_BUFFER_BIT | gl.COLOR_BUFFER_BIT | gl.STENCIL_BUFFER_BIT);
        gl.enable(gl.DEPTH_TEST);

        const triVert = [];

        for (let tri of triBuffer){
            // const brightness = (tri.b1+tri.b2+tri.b3)/3; //use raw values for smooth shading (gpu interpolation) - removed because of significant interpolation issues

            triVert.push(tri.v1.x, tri.v1.y, tri.v1.z, tri.v1.w, tri.r1, tri.g1, tri.b1);
            triVert.push(tri.v2.x, tri.v2.y, tri.v2.z, tri.v2.w, tri.r2, tri.g2, tri.b2);
            triVert.push(tri.v3.x, tri.v3.y, tri.v3.z, tri.v3.w, tri.r3, tri.g3, tri.b3);
        }

        //step 2 draw original scene
        const cpuTriBuffer = new Float32Array(triVert); //gpu uses 32 bit to store format
        gl.bindBuffer(gl.ARRAY_BUFFER, gpuTriBuffer);
        gl.bufferData(gl.ARRAY_BUFFER, cpuTriBuffer, gl.DYNAMIC_DRAW);

        //Draw call - primitive assembly
        gl.drawArrays(gl.TRIANGLES, 0, triVert.length / 7);

        //step 3  calculate volume shadow
        gl.colorMask(false, false, false, false);
        gl.depthMask(false);
        gl.enable(gl.STENCIL_TEST);
        gl.stencilMask(0xFF);
        gl.clear(gl.STENCIL_BUFFER_BIT);

        let shadowTriBuffer = [];

        for (let tri of shadowBuffer){
            shadowTriBuffer.push(tri.v1.x, tri.v1.y, tri.v1.z, 1, 0, 0, 0);
            shadowTriBuffer.push(tri.v2.x, tri.v2.y, tri.v2.z, 1, 0, 0, 0);
            shadowTriBuffer.push(tri.v3.x, tri.v3.y, tri.v3.z, 1, 0, 0, 0);
        }

        const cpuShadowBuffer = new Float32Array(shadowTriBuffer);
        gl.bindBuffer(gl.ARRAY_BUFFER, gpuShadowBuffer);
        gl.bufferData(gl.ARRAY_BUFFER, cpuShadowBuffer, gl.DYNAMIC_DRAW);

        gl.enable(gl.CULL_FACE);
        gl.frontFace(gl.CW); // You mentioned you set this

        // PASS 1: BACK FACES
        gl.cullFace(gl.FRONT); // This draws the back faces
        gl.stencilOp(gl.KEEP, gl.INCR_WRAP, gl.KEEP); // Increment on Z-Fail
        gl.drawArrays(gl.TRIANGLES, 0, cpuShadowBuffer.length / 7);

        // PASS 2: FRONT FACES
        gl.cullFace(gl.BACK); // This draws the front faces
        gl.stencilOp(gl.KEEP, gl.DECR_WRAP, gl.KEEP); // Decrement on Z-Fail
        gl.drawArrays(gl.TRIANGLES, 0, cpuShadowBuffer.length / 7);

        //step 5 draw shadow rectangle
        gl.colorMask(true, true, true, true);
        gl.stencilFunc(gl.ALWAYS, 0, 0xFF);
        gl.stencilOp(gl.KEEP, gl.KEEP, gl.KEEP);

        gl.enable(gl.BLEND);
        gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);

        //flat black quad
        const quadData = new Float32Array([
            -1, -1, 0, 1, 0, 0, 0, // Bottom Left
            1, -1, 0, 1, 0, 0, 0, // Bottom Right
            -1,  1, 0, 1, 0, 0, 0, // Top Left
            1,  1, 0, 1, 0, 0, 0  // Top Right
        ]);
        gl.bindBuffer(gl.ARRAY_BUFFER, gpuQuadBuffer);
        gl.bufferData(gl.ARRAY_BUFFER, quadData, gl.STATIC_DRAW);
        gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);

        //Rasterizer - which pixels are part of a triangle
        gl.viewport(0, 0, canvas.width, canvas.height);

        gl.disable(gl.STENCIL_TEST);
        gl.disable(gl.BLEND);
        gl.depthMask(true);
        gl.cullFace(gl.BACK);

        const err = gl.getError();
        if (err !== gl.NO_ERROR) console.log('WebGL error:', err);

    } catch (e){console.log(e);}
}

window.addEventListener('resize', () => {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    gl.viewport(0, 0, canvas.width, canvas.height);
});

//Meant for testing only
const createRandomPlane = (cx, cy, cz, width, depth, segments) => {
    const triangles = [];
    const vertices = [];

    // generate a grid of vertices with random y displacement
    for (let i = 0; i <= segments; i++){
        for (let j = 0; j <= segments; j++){
            const x = cx + (i / segments - 0.5) * width;
            const z = cz + (j / segments - 0.5) * depth;
            const y = cy + (Math.random() - 0.5) * 100; // random height displacement

            const v = new Vertex(x, y, z, 1);
            vertices.push(v);
        }
    }

    // connect into triangles
    for (let i = 0; i < segments; i++){
        for (let j = 0; j < segments; j++){
            const a = i * (segments + 1) + j;
            const b = a + 1;
            const c = a + (segments + 1);
            const d = c + 1;

            const v1 = vertices[a];
            const v2 = vertices[b];
            const v3 = vertices[c];
            const v4 = vertices[d];

            triangles.push(new Triangle(v1, v2, v3, 1, 1, 1, 1, 1, 1, 1, 1, 1));
            triangles.push(new Triangle(v2, v4, v3, 1, 1, 1, 1, 1, 1, 1, 1, 1));
        }
    }

    return triangles;
}

//Testing only will later be moved to scene class for organization
const createSphere = (cx, cy, cz, radius, stacks, slices) => {
    const triangles = [];
    const vertices = [];

    // generate vertex positions
    for (let i = 0; i <= stacks; i++){
        const phi = (Math.PI * i) / stacks; // 0 to PI
        for (let j = 0; j <= slices; j++){
            const theta = (2 * Math.PI * j) / slices; // 0 to 2PI

            const x = cx + radius * Math.sin(phi) * Math.cos(theta);
            const y = cy + radius * Math.cos(phi);
            const z = cz + radius * Math.sin(phi) * Math.sin(theta);

            const v = new Vertex(x, y, z, 1);
            // normals for a sphere are just the normalized position minus center
            v.nx = Math.sin(phi) * Math.cos(theta);
            v.ny = Math.cos(phi);
            v.nz = Math.sin(phi) * Math.sin(theta);
            v.vecN = {x: v.nx, y: v.ny, z: v.nz};

            vertices.push(v);
        }
    }

    // generate triangles from vertices
    for (let i = 0; i < stacks; i++){
        for (let j = 0; j < slices; j++){
            const a = i * (slices + 1) + j;
            const b = a + slices + 1;

            const v1 = vertices[a];
            const v2 = vertices[b];
            const v3 = vertices[a + 1];
            const v4 = vertices[b + 1];

            triangles.push(new Triangle(v1, v2, v3, 1, 1, 1, 1, 1, 1, 1, 1, 1));
            triangles.push(new Triangle(v2, v4, v3, 1, 1, 1, 1, 1, 1, 1, 1, 1));
        }
    }

    return triangles;
}

//Main Render Pipeline
const mesh = new Mesh(createRandomPlane(0, 0, 0, 1000, 1000, 30), 1, 1, 0.8, false)
const cam = new Camera(0, 1000, -1000, 1); //x, y, z, rate
const lights = [
    //average ranges calculate from 1000px away from mesh
    new PointLightSource(0, 1000, 0, 640000, 1, 1, 1), //avg range 60000-2500000 | mid 1280000
    new SpotLightSource(0, 1000, 0, 0, -1, 0, -1000000, 1, 0, 0, 10), //avg range 80000-1000000 | mid 540000
    new DirectionalLightSource(0, 1000, 0, 0.5, 1, 1, 0.8), //avg range 0-2 | mid 1
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

    //shadow logic
    let shadowBuffer = [];
    for (let light of lights) {
        let sils = getSilhouettes(light);
        let vol = extrudeSilhouettes(sils, light);
        for (let tri of vol) {
            shadowBuffer.push(new Triangle(
                multiplyMatVec(camProj, tri.v1),
                multiplyMatVec(camProj, tri.v2),
                multiplyMatVec(camProj, tri.v3)
            ));
        }
    }

    let triangleBuffer = [];

    for (let tri of mesh.T){
        //world space
        const v1 = tri.v1;
        const v2 = tri.v2;
        const v3 = tri.v3;

        const h = handleTriangle(v1, v2, v3, mesh.r, mesh.g, mesh.b, lights, mesh.doubleSided);
        if (!h) continue;

        //projected
        const pv1 = multiplyMatVec(camProj, v1);
        const pv2 = multiplyMatVec(camProj, v2);
        const pv3 = multiplyMatVec(camProj, v3);

        const clipped = clipTriangle(pv1, pv2, pv3, h.cr1, h.cg1, h.cb1, h.cr2, h.cg2, h.cb2, h.cr3, h.cg3, h.cb3);
        for (const tri of clipped) triangleBuffer.push(tri);
    }

    //multiplayer handling
    for (const [id, player] of players) { //iterate through map of players
            player.updatePos();

            const playerView = multiplyMatMat(translateM(player.x, player.y, player.z), player.rotation.convertToM());
            const playerProj = multiplyMatMat(camProj, playerView);

            for (const tri of player.pos.T){ //iterate through vertex map of each player

                console.log('first tri:', player.pos.T[0]);
                console.log('v1:', player.pos.T[0]?.v1);

                //verticies
                const v1 = tri.v1;
                const v2 = tri.v2;
                const v3 = tri.v3;

                //translate vertices without projection (raw world space coords)
                const wv1 = multiplyMatVec(playerView, v1);
                const wv2 = multiplyMatVec(playerView, v2);
                const wv3 = multiplyMatVec(playerView, v3);

                console.log(wv1);
                console.log(wv2);
                console.log(wv3);

                const h = handleTriangle(wv1, wv2, wv3, player.r, player.g, player.b, lights);
                if (!h) continue;

                //clip space vertices for projection
                const pv1 = multiplyMatVec(playerProj, v1);
                const pv2 = multiplyMatVec(playerProj, v2);
                const pv3 = multiplyMatVec(playerProj, v3);

                const clipped = clipTriangle(pv1, pv2, pv3, h.cr1, h.cg1, h.cb1, h.cr2, h.cg2, h.cb2, h.cr3, h.cg3, h.cb3);
                for (const tri of clipped) triangleBuffer.push(tri);
            }
        }

    render(triangleBuffer, shadowBuffer);
    requestAnimationFrame(main);
}

handleTriangle = (v1, v2, v3, cr, cg, cb, lights, doubleSided) => {

    //backface culling
    let tempTri = new Triangle(v1, v2, v3);
    if (isNaN(tempTri.vecN.x)) return;
    if (vectorDotProduct(cam.calcVectorToPoint(v1), tempTri.vecN) < 0 && doubleSided){ return; }


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

        const contribution = light.calcContribution(v1, v2, v3, tempTri);

        sr1.push(cr * light.r * contribution.c1);
        sg1.push(cg * light.g * contribution.c1);
        sb1.push(cb * light.b * contribution.c1);

        sr2.push(cr * light.r * contribution.c2);
        sg2.push(cg * light.g * contribution.c2);
        sb2.push(cb * light.b * contribution.c2);

        sr3.push(cr * light.r * contribution.c3);
        sg3.push(cg * light.g * contribution.c3);
        sb3.push(cb * light.b * contribution.c3);
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

buildAdjacencyMap();
buildEdgeMap(mesh);
webGlInit();
main();