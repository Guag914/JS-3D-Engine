const triangle = () =>{
    const canvas = document.getElementById('canvas');
    if (!canvas){ console.log('Cannot get canvas element'); return; }

    const gl = canvas.getContext('webgl2');
    if (!gl){ console.log('Browser does not support webgl2'); return; }


    const triVert = [ //bounds go from -1 to 1
        0.0, 0.5, -0.5, 1.0, //top middle
        -0.5, -0.5, -0.5, 1.0, //bottom left
        0.5, -0.5, -0.5, 1.0 //bottom right
    ];

    const cpuTriBuffer = new Float32Array(triVert); //gpu uses 32 bit to store format - js array does not make sure that objects are next to each other in memory
    const gpuTriBuffer = gl.createBuffer(); //might need to catch null buffer

    gl.bindBuffer(gl.ARRAY_BUFFER, gpuTriBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, cpuTriBuffer, gl.STATIC_DRAW);

    //glsl source vertex and fragment
    const vertexShaderSource = `#version 300 es
        precision mediump float;

        in vec4 vertexPosition; //4 dimentional buffer (x, y, z, w)

        void main(){
            gl_Position = vec4(vertexPosition.x, vertexPosition.y, vertexPosition.z, vertexPosition.w); //can just plug in vertexPosition instead of having .x, .y, .z, and .w
        }
    `;

    const fragmentShaderSource = `#version 300 es
        precision mediump float;

        out vec4 outputColor;

        void main(){
            outputColor = vec4(0.294, 0.0, 0.51, 1.0);
        }

    `;

    //compile shaders with source code
    const vertexShader = gl.createShader(gl.VERTEX_SHADER);
    gl.shaderSource(vertexShader, vertexShaderSource);
    gl.compileShader(vertexShader);
    //check for source errors and return if true
    if (!gl.getShaderParameter(vertexShader, gl.COMPILE_STATUS)){ console.log(`Failed to compile vertex shader: ${gl.getShaderInfoLog(vertexShader)}`); return; }

    const fragmentShader = gl.createShader(gl.FRAGMENT_SHADER);
    gl.shaderSource(fragmentShader, fragmentShaderSource);
    gl.compileShader(fragmentShader);
    //check for source errors and return if true
    if (!gl.getShaderParameter(fragmentShader, gl.COMPILE_STATUS)){ console.log(`Failed to compile fragment shader: ${gl.getShaderInfoLog(fragmentShader)}`); return; }


    const shaderProgram = gl.createProgram();
    gl.attachShader(shaderProgram, vertexShader);
    gl.attachShader(shaderProgram, fragmentShader);
    gl.linkProgram(shaderProgram);

    if (!gl.getProgramParameter(shaderProgram, gl.LINK_STATUS)){ console.log(`Failed to link shader: ${gl.getProgramInfoLog(shaderProgram)}`); return; }

    const vertexAttribLocation = gl.getAttribLocation(shaderProgram, `vertexPosition`);
    if (vertexAttribLocation < 0){ console.log(`Failed to get attrib location for verertexPosition`); return; }


    //Output merger - how to merge the shaded pixel fragment with the existing output image
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;

    gl.clearColor(0.08, 0.08, 0.08, 1); //grey bg
    gl.clear(gl.DEPTH_BUFFER_BIT);
    gl.clear(gl.COLOR_BUFFER_BIT);

    //Rasterizer - which pixels are part of a triangle
    gl.viewport(0, 0, canvas.width, canvas.height);

    //GPU program (shaders) - how to place those vertices in clip space
    gl.useProgram(shaderProgram);
    gl.enableVertexAttribArray(vertexAttribLocation);

    //Input assembler - how to read verticies from our cpu triangle buffer
    gl.bindBuffer(gl.ARRAY_BUFFER, gpuTriBuffer); //aleady did but again for consistency
    gl.vertexAttribPointer(
        vertexAttribLocation, //index
        4, //size
        gl.FLOAT, //type in the actual buffer
        false, //normalized parameter
        4 * Float32Array.BYTES_PER_ELEMENT, //stride - how many bytes to move forward
        0 //offset - how many bytes to skip
    );

    //Draw call - primitive assembly
    gl.drawArrays(gl.TRIANGLES, 0, 3);
}

triangle();