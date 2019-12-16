import { WebGLUtils } from "./webgl-utils.js";
import { mat4, vec3 } from "./gl-matrix/index.js";

// let log = console.log;
let logCounter = 0;
let log = (...args) => {
    if (++logCounter < 40)
        console.log(...args);
};

const getShaderSource = (useTexture: boolean) => {
    let shaderSourceVariables: {
        attribute: string;
        varying: string;
        assignment: string;
        additionalFragmentVariables: string;
        fragmentColorValue: string;
    };

    if (useTexture) {
        shaderSourceVariables = {
            attribute: 'vec2 aTextureCoord',
            varying: 'highp vec2 vTextureCoord',
            assignment: 'vTextureCoord = aTextureCoord',
            additionalFragmentVariables: 'uniform sampler2D uSampler;',
            fragmentColorValue: 'texture2D(uSampler, vTextureCoord)',
        }
    } else {
        shaderSourceVariables = {
            attribute: 'vec4 aVertexColor',
            varying: 'lowp vec4 vColor',
            assignment: 'vColor = aVertexColor',
            additionalFragmentVariables: '',
            fragmentColorValue: 'vColor',
        }
    }

    const vsSource = `
        attribute vec4 aVertexPosition;
        attribute ${shaderSourceVariables.attribute};

        uniform mat4 uModelViewMatrix;
        uniform mat4 uProjectionMatrix;

        varying ${shaderSourceVariables.varying};

        void main() {
            gl_Position = uProjectionMatrix * uModelViewMatrix * aVertexPosition;
            ${shaderSourceVariables.assignment};
        }
    `;

    const fsSource = `
        varying ${shaderSourceVariables.varying};

        ${shaderSourceVariables.additionalFragmentVariables}

        void main(void) {
            gl_FragColor = ${shaderSourceVariables.fragmentColorValue};
        }
    `;

    return {
        vsSource,
        fsSource,
    };
};

type ProgramInfo = {
    program: WebGLProgram
    attribLocations: {
        vertexPosition: number
        vertexColor?: number
        vertexTextureCoord?: number
    }
    uniformLocations: {
        projectionMatrix: WebGLUniformLocation
        modelViewMatrix: WebGLUniformLocation
        sampler?: WebGLUniformLocation
    }
};

type Point2D = { x: number, y: number };

abstract class PlaneShape {
    protected abstract get positionBuffer(): WebGLBuffer;
    protected abstract get colorBuffer(): WebGLBuffer | null;
    protected abstract get textureCoordBuffer(): WebGLBuffer | null;
    protected abstract get textureBuffer(): WebGLTexture | null;

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
        if (!this.colorBuffer)
            return;

        const numComponents = 4;
        const type = gl.FLOAT;
        const normalize = false;
        const stride = 0;
        const offset = 0;
        gl.bindBuffer(gl.ARRAY_BUFFER, this.colorBuffer);
        gl.vertexAttribPointer(
            programInfo.attribLocations.vertexColor!,
            numComponents,
            type,
            normalize,
            stride,
            offset
        );
        gl.enableVertexAttribArray(programInfo.attribLocations.vertexColor!);
    }

    protected setupTexture(gl: WebGLRenderingContext, programInfo: ProgramInfo) {
        log(this.textureCoordBuffer, this.textureBuffer);
        if (!this.textureCoordBuffer || !this.textureBuffer)
            return;

        const numComponents = 2; // every coordinate composed of 2 values
        const type = gl.FLOAT; // the data in the buffer is 32 bit float
        const normalize = false; // don't normalize
        const stride = 0; // how many bytes to get from one set to the next
        const offset = 0; // how many bytes inside the buffer to start from

        gl.bindBuffer(gl.ARRAY_BUFFER, this.textureCoordBuffer);
        gl.vertexAttribPointer(
            programInfo.attribLocations.vertexTextureCoord!,
            numComponents,
            type,
            normalize,
            stride,
            offset
        );
        gl.enableVertexAttribArray(programInfo.attribLocations.vertexTextureCoord!);

        // Tell WebGL we want to affect texture unit 0
        gl.activeTexture(gl.TEXTURE0);

        // Bind the texture to texture unit 0
        gl.bindTexture(gl.TEXTURE_2D, this.textureBuffer);

        // Tell the shader we bound the texture to texture unit 0
        gl.uniform1i(programInfo.uniformLocations.sampler!, 0);
    }

    protected setupProgram(gl: WebGLRenderingContext, programInfo: ProgramInfo, projectionMatrix: mat4, modelViewMatrix: mat4) {
        this.setupPositionBuffer(gl, programInfo);

        this.setupColorBuffer(gl, programInfo);
        this.setupTexture(gl, programInfo);

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
    colorBuffer: WebGLBuffer | null;
    textureCoordBuffer: WebGLBuffer | null;
    textureBuffer: WebGLTexture | null;
    textureSource = './ball.jpg';

    constructor(gl: WebGLRenderingContext, public readonly radius: number, useTexture: boolean) {
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

        if (useTexture) {
            const unitPoints = points.map(p => p / radius / 2 + 0.5);

            const textureCoordBuffer = gl.createBuffer()!;
            gl.bindBuffer(gl.ARRAY_BUFFER, textureCoordBuffer);
            gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(unitPoints), gl.STATIC_DRAW);

            this.textureCoordBuffer = textureCoordBuffer;

            this.textureBuffer = WebGLUtils.loadTexture(gl, this.textureSource)!;
        } else {
            const colorBuffer = gl.createBuffer()!;
            gl.bindBuffer(gl.ARRAY_BUFFER, colorBuffer);
            gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(colors), gl.STATIC_DRAW);

            this.colorBuffer = colorBuffer;
        }
    }

    createBall(): Ball {
        return new Ball(this);
    }
};

class Ball extends PlaneShape {
    position: Point2D = { x: 0, y: 0 };
    velocity: Point2D = { x: 0, y: 0 };

    constructor(private readonly ballBuffer: BallBuffer) { super(); }

    protected get positionBuffer() { return this.ballBuffer.positionBuffer; }
    protected get colorBuffer() { return this.ballBuffer.colorBuffer; }
    protected get textureCoordBuffer() { return this.ballBuffer.textureCoordBuffer; }
    protected get textureBuffer() { return this.ballBuffer.textureBuffer; }

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
    colorBuffer: WebGLBuffer | null;
    textureCoordBuffer: WebGLBuffer | null;
    textureBuffer: WebGLTexture | null;
    textureSource = "./wall.jpg";

    constructor(gl: WebGLRenderingContext, public readonly height: number, public readonly width: number, useTexture: boolean) {
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

        if (useTexture) {
            const textureCoords = [
                0.0, 0.0,
                1.0, 0.0,
                1.0, 1.0,
                0.0, 1.0,
            ];

            const textureCoordBuffer = gl.createBuffer()!;
            gl.bindBuffer(gl.ARRAY_BUFFER, textureCoordBuffer);
            gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(textureCoords), gl.STATIC_DRAW);

            this.textureCoordBuffer = textureCoordBuffer;

            this.textureBuffer = WebGLUtils.loadTexture(gl, this.textureSource)!;
        } else {
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
    }

    createPaddle(x: number, y: number): Paddle {
        return new Paddle(this, { x, y });
    }
};

class Paddle extends PlaneShape {
    public velocity: Point2D = { x: 0, y: 0 };

    constructor(
        private readonly paddleBuffer: PaddleBuffer,
        public position: Point2D = { x: 0, y: 0 }
    ) { super(); }

    protected get positionBuffer() { return this.paddleBuffer.positionBuffer; }
    protected get colorBuffer() { return this.paddleBuffer.colorBuffer; }
    protected get textureCoordBuffer() { return this.paddleBuffer.textureCoordBuffer; }
    protected get textureBuffer() { return this.paddleBuffer.textureBuffer; }

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

    public contains(point: Point2D) {
        const left = this.position.x - this.paddleBuffer.width / 2;
        const right = left + this.paddleBuffer.width;

        const bottom = this.position.y - this.paddleBuffer.height / 2;
        const top = bottom + this.paddleBuffer.height;

        return point.x < right && point.x > left && point.y > bottom && point.y < top;
    }
};

class BackgroundBuffer {
    vertexCount: number;
    positionBuffer: WebGLBuffer;
    colorBuffer: WebGLBuffer | null;
    textureCoordBuffer: WebGLBuffer | null;
    textureBuffer: WebGLTexture | null;
    textureSource = "./football.jpg";

    constructor(gl: WebGLRenderingContext, public readonly height: number, public readonly width: number, useTexture: boolean) {
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

        if (useTexture) {
            const textureCoords = [
                0.0, 0.0,
                1.0, 0.0,
                1.0, 1.0,
                0.0, 1.0,
            ];

            const textureCoordBuffer = gl.createBuffer()!;
            gl.bindBuffer(gl.ARRAY_BUFFER, textureCoordBuffer);
            gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(textureCoords), gl.STATIC_DRAW);

            this.textureCoordBuffer = textureCoordBuffer;

            this.textureBuffer = WebGLUtils.loadTexture(gl, this.textureSource)!;
        } else {
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
    }

    createBackground(): Background {
        return new Background(this);
    }
};

class Background extends PlaneShape {
    constructor(private readonly backgroundBuffer: BackgroundBuffer) { super(); }

    protected get positionBuffer() { return this.backgroundBuffer.positionBuffer; }
    protected get colorBuffer() { return this.backgroundBuffer.colorBuffer; }
    protected get textureCoordBuffer() { return this.backgroundBuffer.textureCoordBuffer; }
    protected get textureBuffer() { return this.backgroundBuffer.textureBuffer; }

    public get width() { return this.backgroundBuffer.width; }
    public get height() { return this.backgroundBuffer.height; }

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

const initObjects = (gl: WebGLRenderingContext, useTexture: boolean): ObjectStore => {
    const paddleBuffer = new PaddleBuffer(gl, 5, 1, useTexture);
    const paddles = [paddleBuffer.createPaddle(-18, 0), paddleBuffer.createPaddle(18, 0)];

    const ballBuffer = new BallBuffer(gl, 1, useTexture);
    const ball = ballBuffer.createBall();

    const backgroundBuffer = new BackgroundBuffer(gl, 25, 48, useTexture);
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
    Special,
};

enum Movement {
    Neutral = 0b00,
    Up = 0b01,
    Down = 0b10,
    Left = 0b100,
    Right = 0b1000,
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
    case "ArrowLeft":
        callback(Op.Set, undefined, Movement.Left);
        break;
    case "ArrowRight":
        callback(Op.Set, undefined, Movement.Right);
        break;

    case "w":
        callback(Op.Set, Movement.Up, undefined);
        break;
    case "s":
        callback(Op.Set, Movement.Down, undefined);
        break;
    case "a":
        callback(Op.Set, Movement.Left, undefined);
        break;
    case "d":
        callback(Op.Set, Movement.Right, undefined);
        break;

    case "Enter":
        callback(Op.Special);
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
        case "ArrowLeft":
            callback(Op.Reset, undefined, Movement.Left);
            break;
        case "ArrowRight":
            callback(Op.Reset, undefined, Movement.Right);
            break;

        case "w":
            callback(Op.Reset, Movement.Up, undefined);
            break;
        case "s":
            callback(Op.Reset, Movement.Down, undefined);
            break;
        case "a":
            callback(Op.Reset, Movement.Left, undefined);
            break;
        case "d":
            callback(Op.Reset, Movement.Right, undefined);
            break;
    }
};

const pongMain = (useTexture: boolean) => {
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
        vertexTextureCoord: 1,
    }

    const shaderSource = getShaderSource(useTexture);
    log(shaderSource);

    const shaderProgram = WebGLUtils.initShaderProgram(gl, shaderSource.vsSource, shaderSource.fsSource, program => {
        gl.bindAttribLocation(program, attribLocations.vertexPosition, 'aVertexPosition');
        gl.bindAttribLocation(program, attribLocations.vertexColor, 'aVertexColor');
        gl.bindAttribLocation(program, attribLocations.vertexColor, 'aTextureCoord');
    })!;

    const programInfo: ProgramInfo = {
        program: shaderProgram,
        attribLocations,
        uniformLocations: {
            projectionMatrix: gl.getUniformLocation(shaderProgram, 'uProjectionMatrix')!,
            modelViewMatrix: gl.getUniformLocation(shaderProgram, 'uModelViewMatrix')!,
            sampler: gl.getUniformLocation(shaderProgram, 'uSampler') || undefined,
        },
    };

    const objects = initObjects(gl, useTexture);

    let leftPaddleMovement = Movement.Neutral, rightPaddleMovement = Movement.Neutral;
    let resetStage = false;

    const getDelta = (movement: Movement) => {
        let deltaY = 0.0;
        let deltaX = 0.0;

        if (movement & Movement.Down)
            deltaY += -20;

        if (movement & Movement.Up)
            deltaY += 20;

        if (movement & Movement.Left)
            deltaX += -20;

        if (movement & Movement.Right)
            deltaX += 20;

        return { x: deltaX, y: deltaY };
    };

    let framesInsidePaddle = 0;

    const fixedUpdate = (deltaTime) => {
        const leftPaddle = objects.paddles[0];
        const rightPaddle = objects.paddles[1];
        const ball = objects.ball;
        const background = objects.background;

        const leftDelta = getDelta(leftPaddleMovement);
        const rightDelta = getDelta(rightPaddleMovement);
        leftPaddle.position.x += leftDelta.x * deltaTime;
        leftPaddle.position.y += leftDelta.y * deltaTime;
        rightPaddle.position.x += rightDelta.x * deltaTime;
        rightPaddle.position.y += rightDelta.y * deltaTime;

        if (Math.abs(ball.position.y) > (background.height / 2)) {
            ball.position.y = background.height / 2 * Math.sign(ball.position.y);
            ball.velocity.y = -ball.velocity.y;
        }

        if (framesInsidePaddle == 0) {
            if (leftPaddle.contains(ball.position) || rightPaddle.contains(ball.position)) {
                ball.velocity.x = -ball.velocity.x;
                framesInsidePaddle++;
            }
        } else if (++framesInsidePaddle > 120) {
            framesInsidePaddle = 0;
        }

        ball.position.x += ball.velocity.x;
        ball.position.y += ball.velocity.y;
    };

    const fixedUpdateDeltaTime = 1.0/120.0;
    let remainingDeltaTime = 0;

    const update = (parameters, deltaTime) => {
        deltaTime += remainingDeltaTime;

        for ( ; deltaTime > fixedUpdateDeltaTime; deltaTime -= fixedUpdateDeltaTime) {
            fixedUpdate(fixedUpdateDeltaTime);
        }

        remainingDeltaTime = deltaTime;

        if (resetStage) {
            objects.paddles.forEach(paddle => paddle.position.y = 0);
            objects.ball.position = { x: 0, y: 0 };

            const velocity = 0.1;
            const velocityX = velocity * (0.4 + Math.random() * 0.6) * Math.sign(Math.random() - 0.5);
            const velocityY = Math.sqrt(velocity * velocity - velocityX * velocityX) * Math.sign(Math.random() - 0.5);

            objects.ball.velocity = { x: velocityX, y: velocityY };

            resetStage = false;
        }

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
        case Op.Special:
            resetStage = true;
        }
    }

    window.onkeydown = e => onKeyDown(e, callback);
    window.onkeyup = e => onKeyUp(e, callback);

    startAnimation(gl, programInfo, objects, initialParameters, update);
};

document.body.onload = () => pongMain(true);
