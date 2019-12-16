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

type ProgramInfo = {
    program: WebGLProgram;
    attribLocations: {
        vertexPosition: number;
        vertexColor: number;
    };
    uniformLocations: {
        projectionMatrix: WebGLUniformLocation;
        modelViewMatrix: WebGLUniformLocation;
    };
};

abstract class PlaneShape {
    protected abstract get positionBuffer(): WebGLBuffer;
    protected abstract get colorBuffer(): WebGLBuffer;

    protected setupPositionBuffer(gl: WebGLRenderingContext, programInfo: ProgramInfo) {
        const numComponents = 2;
        const type = gl.FLOAT;
        const normalize = false;
        const stride = 0;
        const offset = 0;
        gl.bindBuffer(gl.ARRAY_BUFFER, this.positionBuffer);
        gl.vertexAttribPointer(
            programInfo.attribLocations.vertexPosition,
            numComponents,
            type,
            normalize,
            stride,
            offset
        );
        gl.enableVertexAttribArray(programInfo.attribLocations.vertexPosition);
    }

    protected setupColorBuffer(gl: WebGLRenderingContext, programInfo: ProgramInfo) {
        const numComponents = 4;
        const type = gl.FLOAT;
        const normalize = false;
        const stride = 0;
        const offset = 0;
        gl.bindBuffer(gl.ARRAY_BUFFER, this.colorBuffer);
        gl.vertexAttribPointer(
            programInfo.attribLocations.vertexColor,
            numComponents,
            type,
            normalize,
            stride,
            offset
        );
        gl.enableVertexAttribArray(programInfo.attribLocations.vertexColor);
    }

    protected setupProgram(gl: WebGLRenderingContext, programInfo: ProgramInfo, projectionMatrix: mat4, modelViewMatrix: mat4) {
        this.setupPositionBuffer(gl, programInfo);

        this.setupColorBuffer(gl, programInfo);

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
    }
};

class BallBuffer {
    vertexCount: number;
    positionBuffer: WebGLBuffer;
    colorBuffer: WebGLBuffer;

    constructor(gl: WebGLRenderingContext, public readonly radius: number) {
        const count = 64;
        const angle = 2 * Math.PI / count;
        const points: number[] = [];
        const colors: number[] = [];

        for (let i = 0; i <= count; i++)
        {
            points.push(radius * Math.cos(i * angle), radius * Math.sin(i * angle));
            // colors.push(0.0, 1.0, 0.0, 1.0);
            colors.push(Math.cos(i * angle), -Math.cos(i * angle), Math.sin(i * angle), 1.0);
        }

        this.vertexCount = count;

        const positionBuffer = gl.createBuffer()!;
        gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
        gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(points), gl.STATIC_DRAW);

        this.positionBuffer = positionBuffer;

        const colorBuffer = gl.createBuffer()!;
        gl.bindBuffer(gl.ARRAY_BUFFER, colorBuffer);
        gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(colors), gl.STATIC_DRAW);

        this.colorBuffer = colorBuffer;
    }

    createBall(): Ball {
        return new Ball(this);
    }
};

class Ball extends PlaneShape {
    position: { x: number, y: number } = { x: 0, y: 0 };
    velocity: { x: number, y: number } = { x: 0, y: 0 };

    constructor(private readonly ballBuffer: BallBuffer) { super(); }

    protected get positionBuffer() { return this.ballBuffer.positionBuffer; }
    protected get colorBuffer() { return this.ballBuffer.colorBuffer; }
    public get radius() { return this.ballBuffer.radius; }

    private getModelViewMatrix() {
        return mat4.fromTranslation(mat4.create(), [this.position.x, this.position.y, -36.0]);
    }

    public render(gl: WebGLRenderingContext, programInfo: ProgramInfo) {
        const projectionMatrix = WebGLUtils.getDefaultPerspective(gl);
        const modelViewMatrix = this.getModelViewMatrix();

        this.setupProgram(gl, programInfo, projectionMatrix, modelViewMatrix);

        {
            const offset = 0;
            gl.drawArrays(gl.TRIANGLE_FAN, offset, this.ballBuffer.vertexCount);
        }
    }
};

class PaddleBuffer {
    vertexCount: number;
    positionBuffer: WebGLBuffer;
    colorBuffer: WebGLBuffer;

    constructor(gl: WebGLRenderingContext, public readonly height: number, public readonly width: number) {
        const points = [
            0.0, 0.0,
            width, 0.0,
            width, height,
            0.0, height,
        ];

        this.vertexCount = 4;

        const positionBuffer = gl.createBuffer()!;
        gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
        gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(points), gl.STATIC_DRAW);

        this.positionBuffer = positionBuffer;

        const colors = [
            1.0, 1.0, 1.0, 1.0,
            1.0, 1.0, 1.0, 1.0,
            1.0, 1.0, 1.0, 1.0,
            1.0, 1.0, 1.0, 1.0,
        ];

        const colorBuffer = gl.createBuffer()!;
        gl.bindBuffer(gl.ARRAY_BUFFER, colorBuffer);
        gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(colors), gl.STATIC_DRAW);

        this.colorBuffer = colorBuffer;
    }

    createPaddle(x: number, y: number): Paddle {
        return new Paddle(this, { x, y });
    }
};

class Paddle extends PlaneShape {
    public velocity: { x: number, y: number } = { x: 0, y: 0 };

    constructor(
        private readonly paddleBuffer: PaddleBuffer,
        public position: { x: number, y: number } = { x: 0, y: 0 }
    ) { super(); }

    protected get positionBuffer() { return this.paddleBuffer.positionBuffer; }
    protected get colorBuffer() { return this.paddleBuffer.colorBuffer; }

    private getModelViewMatrix() {
        return mat4.fromTranslation(mat4.create(), [
            this.position.x - this.paddleBuffer.width / 2,
            this.position.y - this.paddleBuffer.height / 2,
            -36.0
        ]);
    }

    public render(gl: WebGLRenderingContext, programInfo: ProgramInfo) {
        const projectionMatrix = WebGLUtils.getDefaultPerspective(gl);
        const modelViewMatrix = this.getModelViewMatrix();

        this.setupProgram(gl, programInfo, projectionMatrix, modelViewMatrix);

        {
            const offset = 0;
            gl.drawArrays(gl.TRIANGLE_FAN, offset, this.paddleBuffer.vertexCount);
        }
    }
};

class BackgroundBuffer {
    vertexCount: number;
    positionBuffer: WebGLBuffer;
    colorBuffer: WebGLBuffer;

    constructor(gl: WebGLRenderingContext, public readonly height: number, public readonly width: number) {
        const points = [
            0.0, 0.0,
            width, 0.0,
            width, height,
            0.0, height,
        ];

        this.vertexCount = 4;

        const positionBuffer = gl.createBuffer()!;
        gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
        gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(points), gl.STATIC_DRAW);

        this.positionBuffer = positionBuffer;

        const colors = [
            0.0, 1.0, 0.2, 1.0,
            0.0, 1.0, 0.2, 1.0,
            0.0, 1.0, 0.2, 1.0,
            0.0, 1.0, 0.2, 1.0,
        ];

        const colorBuffer = gl.createBuffer()!;
        gl.bindBuffer(gl.ARRAY_BUFFER, colorBuffer);
        gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(colors), gl.STATIC_DRAW);

        this.colorBuffer = colorBuffer;
    }

    createBackground(): Background {
        return new Background(this);
    }
};

class Background extends PlaneShape {
    constructor(private readonly backgroundBuffer: BackgroundBuffer) { super(); }
    protected get positionBuffer() { return this.backgroundBuffer.positionBuffer; }
    protected get colorBuffer() { return this.backgroundBuffer.colorBuffer; }

    private getModelViewMatrix() {
        return mat4.fromTranslation(mat4.create(), [-this.backgroundBuffer.width / 2, -this.backgroundBuffer.height / 2, -48.0]);
    }

    public render(gl: WebGLRenderingContext, programInfo: ProgramInfo) {
        const projectionMatrix = WebGLUtils.getDefaultPerspective(gl);
        const modelViewMatrix = this.getModelViewMatrix();

        this.setupProgram(gl, programInfo, projectionMatrix, modelViewMatrix);

        {
            const offset = 0;
            gl.drawArrays(gl.TRIANGLE_FAN, offset, this.backgroundBuffer.vertexCount);
        }
    }
}

type ObjectStore = {
    paddles: Paddle[],
    ball: Ball,
    background: Background,
}

const initObjects = (gl: WebGLRenderingContext): ObjectStore => {
    const paddleBuffer = new PaddleBuffer(gl, 5, 1);
    const paddles = [paddleBuffer.createPaddle(-18, 0), paddleBuffer.createPaddle(18, 0)];

    const ballBuffer = new BallBuffer(gl, 1);
    const ball = ballBuffer.createBall();

    const backgroundBuffer = new BackgroundBuffer(gl, 30, 48);
    const background = backgroundBuffer.createBackground();

    return {
        paddles,
        ball,
        background,
    };
};

const drawScene = (gl: WebGLRenderingContext, programInfo: ProgramInfo, objects: ObjectStore, parameters) => {
    gl.clearColor(0.0, 0.0, 0.0, 1.0);  // Clear to black, fully opaque
    gl.clearDepth(1.0);                 // Clear everything
    gl.enable(gl.DEPTH_TEST);           // Enable depth testing
    gl.depthFunc(gl.LEQUAL);            // Near things obscure far things

    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

    objects.background.render(gl, programInfo);
    objects.paddles.map(paddle => paddle.render(gl, programInfo));
    objects.ball.render(gl, programInfo);
};

const startAnimation = (gl: WebGLRenderingContext, programInfo: ProgramInfo, buffers, parameters, update) => {
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

enum Op {
    Set,
    Reset,
};

enum Movement {
    Neutral = 0b00,
    Up = 0b01,
    Down = 0b10,
};

const onKeyDown = (event: KeyboardEvent, callback) => {
    const key = event.key;

    switch (key) {
    case "ArrowUp":
        callback(Op.Set, undefined, Movement.Up);
        break;
    case "ArrowDown":
        callback(Op.Set, undefined, Movement.Down);
        break;
    case "w":
        callback(Op.Set, Movement.Up, undefined);
        break;
    case "s":
        callback(Op.Set, Movement.Down, undefined);
        break;
    }
};

const onKeyUp = (event: KeyboardEvent, callback) => {
    const key = event.key;

    switch (key) {
    case "ArrowUp":
        callback(Op.Reset, undefined, Movement.Up);
        break;
    case "ArrowDown":
        callback(Op.Reset, undefined, Movement.Down);
        break;
    case "w":
        callback(Op.Reset, Movement.Up, undefined);
        break;
    case "s":
        callback(Op.Reset, Movement.Down, undefined);
        break;
    }
};

const pongMain = () => {
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

    const programInfo: ProgramInfo = {
        program: shaderProgram,
        attribLocations,
        uniformLocations: {
            projectionMatrix: gl.getUniformLocation(shaderProgram, 'uProjectionMatrix')!,
            modelViewMatrix: gl.getUniformLocation(shaderProgram, 'uModelViewMatrix')!,
        },
    };

    const objects = initObjects(gl);

    let leftPaddleMovement = Movement.Neutral, rightPaddleMovement = Movement.Neutral;

    const getDelta = (movement: Movement) => {
        let delta = 0.0;

        if (movement & Movement.Down)
            delta += -40;

        if (movement & Movement.Up)
            delta += 40;

        return delta;
    };

    const update = (parameters, deltaTime) => {
        objects.paddles[0].position.y += getDelta(leftPaddleMovement) * deltaTime;
        objects.paddles[1].position.y += getDelta(rightPaddleMovement) * deltaTime;

        return { ...parameters };
    };

    const initialParameters = {
    };

    const callback = (op: Op, leftPaddleUpdate?: Movement, rightPaddleUpdate?: Movement) => {
        switch (op) {
        case Op.Set:
            leftPaddleMovement |= leftPaddleUpdate ?? Movement.Neutral;
            rightPaddleMovement |= rightPaddleUpdate ?? Movement.Neutral;
            break;
        case Op.Reset:
            leftPaddleMovement &= ~(leftPaddleUpdate ?? Movement.Neutral);
            rightPaddleMovement &= ~(rightPaddleUpdate ?? Movement.Neutral);
            break;
        }
    }

    window.onkeydown = e => onKeyDown(e, callback);
    window.onkeyup = e => onKeyUp(e, callback);

    startAnimation(gl, programInfo, objects, initialParameters, update);
};

document.body.onload = pongMain;
