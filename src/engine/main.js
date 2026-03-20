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
        const YPR = this.q.quatToYawPitchRoll();
        this.yaw = YPR.yaw;
        this.pitch = YPR.pitch;
        this.roll = YPR.roll;

        const rotM = this.q.convertToM();
        const forwardX = rotM[0][2];
        const forwardY = rotM[1][2];
        const forwardZ = rotM[2][2];

        const rightX = rotM[0][0];
        const rightY = rotM[1][0];
        const rightZ = rotM[2][0];

        if (pressedKeys['KeyW']){
            this.x -= forwardX * this.rate;
//            this.y += forwardY * this.rate;
            this.z += forwardZ * this.rate;
        }
        if (pressedKeys['KeyS']){
            this.x += forwardX * this.rate;
//            this.y -= forwardY * this.rate;
            this.z -= forwardZ * this.rate;
        }
        if (pressedKeys['KeyA']){
            this.x -= rightX * this.rate; //inverse because of perspective
//            this.y - rightY * this.rate;
            this.z += rightZ * this.rate;
        }
        if (pressedKeys['KeyD']){
            this.x += rightX * this.rate;
//            this.y += rightY * this.rate;
            this.z -= rightZ * this.rate;
        }

        if (pressedKeys['Space']){ this.y += this.rate; }
        if (pressedKeys['ShiftLeft']){ this.y -= this.rate; }

        //yaw
        if (pressedKeys['ArrowLeft']){ this.q.update(0.015, 0, 1, 0); } //flipped for perspective
        if (pressedKeys['ArrowRight']){ this.q.update(-0.015, 0, 1, 0); }

        //pitch
        if (pressedKeys['ArrowUp']){ this.q.update(0.015, rotM[0][0], rotM[1][0], rotM[2][0]);  }
        if (pressedKeys['ArrowDown']){ this.q.update(-0.015, rotM[0][0], rotM[1][0], rotM[2][0]);  }
    }
    //don't include getters and setters because everything is public
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

    update(angle, tx, ty, tz){ //use 0 to denote not used in axis
        const tempQ = new Quaternion(Math.cos(angle/2), Math.sin(angle/2)*tx, Math.sin(angle/2)*ty, Math.sin(angle/2)*tz); //similar to unit circle cos(t) and sin(t) ratios
        const result = this.hamiltonProduct(tempQ);
        this.w = result.w;
        this.x = result.x;
        this.y = result.y;
        this.z = result.z;

        //normalization
        const length = Math.sqrt(this.w**2 + this.x**2 + this.y**2 + this.z**2); //pythag thm only for 4d
        this.w /= length; //divide by length
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

    quatToYawPitchRoll() {
        // Pitch (y-axis rotation)
        let sinp = 2 * (this.w * this.y - this.z * this.x);
        let pitch;
        if (Math.abs(sinp) >= 1) {
            pitch = Math.sign(sinp) * Math.PI / 2; // Use 90 degrees if out of range
        } else {
            pitch = Math.asin(sinp);
        }

        // Yaw (z-axis rotation)
        let siny_cosp = 2 * (this.w * this.z + this.x * this.y);
        let cosy_cosp = 1 - 2 * (this.y * this.y + this.z * this.z);
        let yaw = Math.atan2(siny_cosp, cosy_cosp);

        // Roll (x-axis rotation)
        let sinr_cosp = 2 * (this.w * this.x + this.y * this.z);
        let cosr_cosp = 1 - 2 * (this.x * this.x + this.y * this.y);
        let roll = Math.atan2(sinr_cosp, cosr_cosp);

        return { yaw, pitch, roll }; // Returns radians
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
}

//Matricies:
//const proj = [
//    [1, 0, 0, 0],
//    [0, 1, 0, 0],
//    [0, 0, 1, 0],
//    [0, 0, 0, 1]
//] DOES NOT SCALE ANYTHING

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

//used for combining rotations
const multiplyMatMat = (a, b) => {
    let m = [[0,0,0,0],[0,0,0,0],[0,0,0,0],[0,0,0,0]];
    for (let r = 0; r < 4; r++)
        for (let c = 0; c < 4; c++)
            for (let k = 0; k < 4; k++)
                m[r][c] += a[r][k] * b[k][c];
    return m;
}

const camUpdate = (M) => {

}

const cam = new Camera(0, 0, -1000); //, 0, 0, 10

const V = [
//    new Vertex(50, 50, -50, 1),
//    new Vertex(50, -50, -50, 1),
//    new Vertex(-50, -50, -50, 1),
//    new Vertex(-50, 50, -50, 1),
//
//    new Vertex(50, 50, 50, 1),
//    new Vertex(50, -50, 50, 1),
//    new Vertex(-50, -50, 50, 1),
//    new Vertex(-50, 50, 50, 1),

    new Vertex(100, 100, -100, 1),
    new Vertex(100, -100, -100, 1),
    new Vertex(-100, -100, -100, 1),
    new Vertex(-100, 100, -100, 1),

    new Vertex(100, 100, 100, 1),
    new Vertex(100, -100, 100, 1),
    new Vertex(-100, -100, 100, 1),
    new Vertex(-100, 100, 100, 1)
];

const M = [
    // front
    [0, 1, 2],
    [0, 2, 3],
    // back
    [4, 5, 6],
    [4, 6, 7],
    // right
    [0, 4, 5],
    [0, 5, 1],
    // left
    [3, 7, 6],
    [3, 6, 2],
    // top
    [0, 3, 7],
    [0, 7, 4],
    // bottom
    [1, 2, 6],
    [1, 6, 5]
];

let angle = 0; //angle of rotation

const main = () => {
    let projectedMatrix = [];
    ctx.clearRect(0, 0, CW, CH);
    cam.controls();

//    angle += 0.02; //radians

    //combine rotations BEFORE use in for loop
    //transformation order: scale, rotate, translate
    //order of multiply is REVERSE
    //don't modify scale factor unless changing fov
    const proj = makeProjM(Math.PI / 2, CW / CH, 0.1, 1000); //make sure to calculate fov properly later (this only works for square screen)

    let view = multiplyMatMat(cam.q.convertToM(), translateM(  -cam.x, -cam.y, -cam.z));

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

        console.log(`0: ${p1.z} 1: ${p2.z} 2: ${p3.z}`)

        if (p1.z > 1 || p2.z > 1 || p3.z > 1) continue;
        drawLine(p1.x, p1.y, p2.x, p2.y);
        drawLine(p2.x, p2.y, p3.x, p3.y);
        drawLine(p3.x, p3.y, p1.x, p1.y);
    }

    requestAnimationFrame(main);
}

main();