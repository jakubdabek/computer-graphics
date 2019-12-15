import { WebGlUtils } from "./webgl-utils.js";
import { mat4 } from "./gl-matrix/index.js";


// let log = console.log;
let logCounter = 0;
let log = (...args) => {
    if (++logCounter < 20)
        console.log(...args);
};

const vsSource = `
    attribute vec4 aVertexPosition;
    attribute vec4 aVertexColor;

    uniform mat4 uModelViewMatrix;
    uniform mat4 uProjectionMatrix;

    varying lowp vec4 vColor;

    void main() {
        gl_Position = uProjectionMatrix * uModelViewMatrix * aVertexPosition;
        vColor = aVertexColor;
    }
`;

const fsSource = `
    varying lowp vec4 vColor;

    void main(void) {
        gl_FragColor = vColor;
    }
`;

const initBuffers = (gl: WebGLRenderingContext) => {

    // Create a buffer for the square's positions.

    const positionBuffer = gl.createBuffer();

    // Select the positionBuffer as the one to apply buffer
    // operations to from here out.

    gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);

    // Now create an array of positions for the square.

    const positions = [
        -1.0, 1.0,
        1.0, 1.0,
        -1.0, -1.0,
        1.0, -1.0,
    ];

    // Now pass the list of positions into WebGL to build the
    // shape. We do this by creating a Float32Array from the
    // JavaScript array, then use it to fill the current buffer.

    gl.bufferData(gl.ARRAY_BUFFER,
        new Float32Array(positions),
        gl.STATIC_DRAW);

    const colors = [
        1.0, 1.0, 1.0, 1.0,    // white
        1.0, 0.0, 0.0, 1.0,    // red
        0.0, 1.0, 0.0, 1.0,    // green
        0.0, 0.0, 1.0, 1.0,    // blue
    ];

    const colorBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, colorBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(colors), gl.STATIC_DRAW);

    return {
        position: positionBuffer,
        color: colorBuffer,
    };
};

const drawScene = (gl: WebGLRenderingContext, programInfo, buffers, parameters) => {
    gl.clearColor(0.0, 0.0, 0.0, 1.0);  // Clear to black, fully opaque
    gl.clearDepth(1.0);                 // Clear everything
    gl.enable(gl.DEPTH_TEST);           // Enable depth testing
    gl.depthFunc(gl.LEQUAL);            // Near things obscure far things

    // Clear the canvas before we start drawing on it.

    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

    // Create a perspective matrix, a special matrix that is
    // used to simulate the distortion of perspective in a camera.
    // Our field of view is 45 degrees, with a width/height
    // ratio that matches the display size of the canvas
    // and we only want to see objects between 0.1 units
    // and 100 units away from the camera.

    const canvas = <HTMLCanvasElement>gl.canvas;

    const fieldOfView = 45 * Math.PI / 180;   // in radians
    const aspect = canvas.clientWidth / canvas.clientHeight;
    const zNear = 0.1;
    const zFar = 100.0;
    const projectionMatrix = mat4.create();

    // note: glmatrix.js always has the first argument
    // as the destination to receive the result.
    mat4.perspective(
        projectionMatrix,
        fieldOfView,
        aspect,
        zNear,
        zFar
    );

    // Set the drawing position to the "identity" point, which is
    // the center of the scene.
    const modelViewMatrix = mat4.create();

    // Now move the drawing position a bit to where we want to
    // start drawing the square.

    mat4.translate(
        modelViewMatrix,    // destination matrix
        modelViewMatrix,    // matrix to translate
        [-0.0, 0.0, -6.0]   // amount to translate
    );

    mat4.rotate(
        modelViewMatrix,            // destination matrix
        modelViewMatrix,            // matrix to rotate
        parameters.squareRotation,  // amount to rotate in radians
        [0, 0, 1]                   // axis to rotate around
    );

    // Tell WebGL how to pull out the positions from the position
    // buffer into the vertexPosition attribute.
    {
        const numComponents = 2;    // pull out 2 values per iteration
        const type = gl.FLOAT;      // the data in the buffer is 32bit floats
        const normalize = false;    // don't normalize
        const stride = 0;           // how many bytes to get from one set of values to the next
        // 0 = use type and numComponents above
        const offset = 0;           // how many bytes inside the buffer to start from
        gl.bindBuffer(gl.ARRAY_BUFFER, buffers.position);
        gl.vertexAttribPointer(
            programInfo.attribLocations.vertexPosition,
            numComponents,
            type,
            normalize,
            stride,
            offset);
        gl.enableVertexAttribArray(
            programInfo.attribLocations.vertexPosition);
    }

    // Tell WebGL how to pull out the colors from the color buffer
    // into the vertexColor attribute.
    {
        const numComponents = 4;
        const type = gl.FLOAT;
        const normalize = false;
        const stride = 0;
        const offset = 0;
        gl.bindBuffer(gl.ARRAY_BUFFER, buffers.color);
        gl.vertexAttribPointer(
            programInfo.attribLocations.vertexColor,
            numComponents,
            type,
            normalize,
            stride,
            offset);
        gl.enableVertexAttribArray(
            programInfo.attribLocations.vertexColor);
    }

    // Tell WebGL to use our program when drawing

    gl.useProgram(programInfo.program);

    // Set the shader uniforms

    gl.uniformMatrix4fv(
        programInfo.uniformLocations.projectionMatrix,
        false,
        projectionMatrix);
    gl.uniformMatrix4fv(
        programInfo.uniformLocations.modelViewMatrix,
        false,
        modelViewMatrix);

    {
        const offset = 0;
        const vertexCount = 4;
        gl.drawArrays(gl.TRIANGLE_STRIP, offset, vertexCount);
    }
};

const startAnimation = (gl: WebGLRenderingContext, programInfo, buffers, parameters, update) => {
    let then = null;
    
    // Draw the scene repeatedly
    const render = (now: number) => {
        now *= 0.001;  // convert to seconds
        const deltaTime = now - then;
        then = now;
        
        log(deltaTime);
        const newParameters = update(parameters, deltaTime);
        parameters = newParameters;

        drawScene(gl, programInfo, buffers, parameters);

        requestAnimationFrame(render);
    };

    requestAnimationFrame(now => { then = now / 1000; render(now); });
};

const showcaseMain = () => {
    const canvas = <HTMLCanvasElement>document.querySelector("#glCanvas");
    const gl = canvas.getContext("webgl");

    if (gl === null) {
        alert("Unable to initialize WebGL. Your browser or machine may not support it.");
        return;
    }

    gl.clearColor(0.0, 0.0, 0.0, 1.0);
    gl.clear(gl.COLOR_BUFFER_BIT);

    const attribLocations = {
        vertexPosition: 0,
        vertexColor: 1,
    }

    const shaderProgram = WebGlUtils.initShaderProgram(gl, vsSource, fsSource, program => {
        gl.bindAttribLocation(program, attribLocations.vertexPosition, 'aVertexPosition');
        gl.bindAttribLocation(program, attribLocations.vertexColor, 'aVertexColor');
    });

    const programInfo = {
        program: shaderProgram,
        attribLocations,
        uniformLocations: {
            projectionMatrix: gl.getUniformLocation(shaderProgram, 'uProjectionMatrix'),
            modelViewMatrix: gl.getUniformLocation(shaderProgram, 'uModelViewMatrix'),
        },
    };

    const buffers = initBuffers(gl);

    const update = (parameters, deltaTime) => {
        let squareRotation = parameters.squareRotation;
        squareRotation = (squareRotation + deltaTime) % (2 * Math.PI);

        // log(squareRotation);

        return { ...parameters, squareRotation };
    };

    const initialParameters = {
        squareRotation: 0.0,
    };

    startAnimation(gl, programInfo, buffers, initialParameters, update);
};


document.body.onload = showcaseMain;
