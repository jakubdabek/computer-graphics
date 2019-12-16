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

const hilbert = (width: number, spacing: number, points: number[]) => (x, y, lg, i1, i2, f) => {
    if (lg === 1) {
        const px = (width - x) * spacing;
        const py = (width - y) * spacing;
        points.push(px, py);
        return points;
    }
    lg >>= 1;
    f(x + i1 * lg, y + i1 * lg, lg, i1, 1 - i2, f);
    f(x + i2 * lg, y + (1 - i2) * lg, lg, i1, i2, f);
    f(x + (1 - i1) * lg, y + (1 - i1) * lg, lg, i1, i2, f);
    f(x + (1 - i2) * lg, y + i2 * lg, lg, 1 - i1, i2, f);
    return points;
};

const getHilbertBuffer = (gl: WebGLRenderingContext, order: number) => {
    const width = 2 ** order;
    const space = 4.0 / (width);

    const f = hilbert(width, space, []);
    const points = f(0, 0, width, 0, 0, f);

    const positionBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(points), gl.STATIC_DRAW);

    const edges = [points[0], points[1], points[points.length - 1], points[points.length - 2]];
    const bufferData = {
        vertexCount: points.length / 2,
        width: Math.max(...edges) - Math.min(...edges),
        position: positionBuffer,
    };

    log(bufferData);

    return bufferData;
};

const initBuffers = (gl: WebGLRenderingContext, order: number) => {
    const list: number[] = [];
    const rot = 2 * Math.PI / order;

    for (let i = 1; i <= order; i++) {
        list.push(i);
    }

    const buffers = list.map(i => {
        return {
            ...getHilbertBuffer(gl, i),
            color: [Math.cos(i * rot), -Math.cos(i * rot), Math.sin(i * rot), 1.0],
        };
    });

    return buffers;
};

const drawHilbert = (gl: WebGLRenderingContext, programInfo, buffer, modelViewMatrix) => {
    const projectionMatrix = WebGLUtils.getDefaultPerspective(gl);

    const numComponents = 2;
    const type = gl.FLOAT;
    const normalize = false;
    const stride = 0;
    const offset = 0;
    gl.bindBuffer(gl.ARRAY_BUFFER, buffer.position);
    gl.vertexAttribPointer(
        programInfo.attribLocations.vertexPosition,
        numComponents,
        type,
        normalize,
        stride,
        offset
    );
    gl.enableVertexAttribArray(programInfo.attribLocations.vertexPosition);

    gl.vertexAttrib4fv(programInfo.attribLocations.vertexColor, buffer.color);

    gl.useProgram(programInfo.program);

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
        gl.drawArrays(gl.LINE_STRIP, offset, buffer.vertexCount);
    }
};

const drawScene = (gl: WebGLRenderingContext, programInfo, buffers, parameters) => {
    gl.clearColor(0.0, 0.0, 0.0, 1.0);  // Clear to black, fully opaque
    gl.clearDepth(1.0);                 // Clear everything
    gl.enable(gl.DEPTH_TEST);           // Enable depth testing
    gl.depthFunc(gl.LEQUAL);            // Near things obscure far things

    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

    const nearZ = -10.0;
    const dist = parameters.deltaDepth;
    const farZ = nearZ - dist * buffers.length;
    const centerZ = (nearZ + farZ) / 2;

    let i = 0;
    buffers.forEach(buffer => {
        const modelViewMatrix = mat4.create();

        const currentZ = nearZ - (i++ * dist);

        mat4.translate(
            modelViewMatrix,
            modelViewMatrix,
            [0.0, 0.0, centerZ]
        );

        mat4.rotate(
            modelViewMatrix,            // destination matrix
            modelViewMatrix,            // matrix to rotate
            parameters.rotationY,  // amount to rotate in radians
            [0, 1, 0]                   // axis to rotate around
        );

        mat4.translate(
            modelViewMatrix,
            modelViewMatrix,
            [0.0, 0.0, currentZ - centerZ]
        );

        mat4.rotate(
            modelViewMatrix,            // destination matrix
            modelViewMatrix,            // matrix to rotate
            parameters.rotationZ,  // amount to rotate in radians
            [0, 0, 1]                   // axis to rotate around
        );

        mat4.translate(
            modelViewMatrix,
            modelViewMatrix,
            [buffer.width / 2 - 4, buffer.width / 2 - 4, 0.0]
        );

        drawHilbert(gl, programInfo, buffer, modelViewMatrix);
    });
};

const startAnimation = (gl: WebGLRenderingContext, programInfo, buffers, parameters, update) => {
    let then: number = 0;

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

const onKeyDown = (event: KeyboardEvent, callback) => {
    const key = event.key;

    switch (key) {
    case "ArrowRight":
        callback(-1, null);
        break;
    case "ArrowLeft":
        callback(1, null);
        break;
    case "ArrowUp":
        callback(null, 1);
        break;
    case "ArrowDown":
        callback(null, -1);
        break;
    }
};

const onKeyUp = (event: KeyboardEvent, callback) => {
    const key = event.key;

    switch (key) {
    case "ArrowRight":
        callback(0, null);
        break;
    case "ArrowLeft":
        callback(0, null);
        break;
    case "ArrowUp":
        callback(null, 0);
        break;
    case "ArrowDown":
        callback(null, 0);
        break;
    }
};

const hilbertMain = () => {
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

    const order = 8;
    const buffers = initBuffers(gl, order);

    let deltaYRot = 0.0;
    let deltaDeltaDepth = 0.0;

    const update = (parameters, deltaTime) => {
        let { rotationZ, rotationY, deltaDepth } = parameters;

        rotationZ = (rotationZ + deltaTime / 3) % (2 * Math.PI);
        rotationY = (rotationY + deltaTime * deltaYRot) % (2 * Math.PI);
        deltaDepth += deltaDeltaDepth * deltaTime;

        return { ...parameters, rotationZ, rotationY, deltaDepth };
    };

    const initialParameters = {
        rotationZ: 0.0,
        rotationY: 0.0,
        deltaDepth: 2.0,
        order,
    };

    // const button = <HTMLButtonElement>document.querySelector("#button");
    // button.onclick = () => console.log(WebGlUtils.getData(gl, shaderProgram));

    const callback = (deltaYRotInteractive, deltaDeltaDepthInteractive) => {
        if (deltaYRotInteractive !== null)
        {
            deltaYRot = deltaYRotInteractive;
        }

        if (deltaDeltaDepthInteractive !== null)
        {
            deltaDeltaDepth = deltaDeltaDepthInteractive;
        }
    }

    window.onkeydown = e => onKeyDown(e, callback);
    window.onkeyup = e => onKeyUp(e, callback);

    startAnimation(gl, programInfo, buffers, initialParameters, update);
};

document.body.onload = hilbertMain;
