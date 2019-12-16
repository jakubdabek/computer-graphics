import { WebGLUtils } from "./webgl-utils.js";
import { mat4, vec3 } from "./gl-matrix/index.js";


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
    uniform float uPointSize;

    varying lowp vec4 vColor;

    void main() {
        gl_Position = uProjectionMatrix * uModelViewMatrix * aVertexPosition;
        gl_PointSize = uPointSize;
        vColor = aVertexColor;
    }
`;

const fsSource = `
    varying lowp vec4 vColor;

    void main(void) {
        gl_FragColor = vColor;
    }
`;

const initBuffers = (gl: WebGLRenderingContext, count: number) => {
    const triangle = [
        [-1.0, 0.0, 10.0],
        [ 1.0, 0.0, 10.0],
        [ 0.0, 5.0, 10.0],
    ];

    const list: number[] = [];
    const rot = 2 * Math.PI / count;

    for (let i = 0; i < count; i++) {
        list.push(i);
    }

    const triangles = list.map(i => {
        return triangle.map(p => [...vec3.rotateY(vec3.create(), p, [0.0, 0.0, 0.0], i * rot)]);
    });

    const colors = list.map(i => {
        const color = [Math.cos(i * rot), -Math.cos(i * rot), Math.sin(i * rot), 1.0];
        return [color, color, color];
    });

    const vertices = [].concat(...([] as any[]).concat(...triangles));

    log(triangles, vertices);

    const positionBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(vertices), gl.STATIC_DRAW);

    const flattenedColors = [].concat(...([] as any[]).concat(...colors));

    const colorBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, colorBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(flattenedColors), gl.STATIC_DRAW);

    return {
        position: positionBuffer,
        color: colorBuffer,
    };
}

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
        [-0.0, 0.0, -30.0]   // amount to translate
    );

    mat4.rotate(
        modelViewMatrix,            // destination matrix
        modelViewMatrix,            // matrix to rotate
        parameters.rotation,  // amount to rotate in radians
        [0, 0, 1]                   // axis to rotate around
    );

    mat4.rotate(
        modelViewMatrix,            // destination matrix
        modelViewMatrix,            // matrix to rotate
        parameters.rotation * 2,  // amount to rotate in radians
        [1, 0, 0]                   // axis to rotate around
    );

    // Tell WebGL how to pull out the positions from the position
    // buffer into the vertexPosition attribute.
    {
        const numComponents = 3;    // pull out 2 values per iteration
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
        projectionMatrix
    );

    gl.uniformMatrix4fv(
        programInfo.uniformLocations.modelViewMatrix,
        false,
        modelViewMatrix
    );

    gl.uniform1f(programInfo.uniformLocations.pointSize, 20);

    {
        const offset = 0;
        const vertexCount = parameters.count * 3;
        gl.drawArrays(parameters.mode, offset, vertexCount);
    }
};

const startAnimation = (gl: WebGLRenderingContext, programInfo, buffers, parameters, update) => {
    let then = 0;

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

    const shaderProgram = WebGLUtils.initShaderProgram(gl, vsSource, fsSource, program => {
        gl.bindAttribLocation(program, attribLocations.vertexPosition, 'aVertexPosition');
        gl.bindAttribLocation(program, attribLocations.vertexColor, 'aVertexColor');
    })!;

    const programInfo = {
        program: shaderProgram,
        attribLocations,
        uniformLocations: {
            projectionMatrix: gl.getUniformLocation(shaderProgram, 'uProjectionMatrix'),
            modelViewMatrix: gl.getUniformLocation(shaderProgram, 'uModelViewMatrix'),
            pointSize: gl.getUniformLocation(shaderProgram, 'uPointSize'),
        },
    };


    const count = 10;
    const buffers = initBuffers(gl, count);

    const modes = [gl.POINTS, gl.LINE_STRIP, gl.LINE_LOOP, gl.LINES, gl.TRIANGLE_STRIP, gl.TRIANGLE_FAN, gl.TRIANGLES];
    let modeIndex = 0;
    let elapsed = 0;

    const update = (parameters, deltaTime) => {
        let rotation = parameters.rotation;
        rotation = (rotation + deltaTime / 3) % (2 * Math.PI);

        // log(rotation);

        elapsed += deltaTime;
        if (elapsed > 5)
        {
            modeIndex = (modeIndex + 1) % modes.length;
            parameters = { ...parameters, mode: modes[modeIndex] };
            elapsed = 0;
        }

        return { ...parameters, rotation };
    };


    const initialParameters = {
        rotation: 0.0,
        count,
        mode: modes[modeIndex],
    };

    const button = <HTMLButtonElement>document.querySelector("#button");
    button.onclick = () => console.log(WebGLUtils.getData(gl, shaderProgram));

    startAnimation(gl, programInfo, buffers, initialParameters, update);
};


document.body.onload = showcaseMain;
