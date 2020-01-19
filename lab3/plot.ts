import { WebGLUtils } from "./webgl-utils.js";
import { mat4, vec4 } from "./gl-matrix/index.js";

const vertexShaderSource = `
    attribute vec4 aVertexPosition;
    attribute vec4 aVertexColor;

    uniform float uZoom;
    uniform mat4 uStartingMatrix;
    uniform mat4 uRotationMatrix;
    uniform mat4 uProjectionMatrix;

    varying mediump vec4 vColor;
    varying vec3 vPosition;

    void main() {
        vec4 position = uRotationMatrix * uStartingMatrix * aVertexPosition;
        position.z += uZoom;
        gl_Position = uProjectionMatrix * position;
        gl_PointSize = 2.0;
        vPosition = position.xyz;
        vColor = aVertexColor;
    }
`;

const fragmentShaderSource = `
    precision mediump float;

    varying vec4 vColor;
    varying vec3 vPosition;

    uniform vec4 uFogColor;
    uniform float uFogDensity;

    void main() {
        #define LOG2 1.442695

        float fogDistance = length(vPosition);
        float fogAmount = 1. - exp2(-uFogDensity * uFogDensity * fogDistance * fogDistance * LOG2);
        fogAmount = clamp(fogAmount, 0., 1.);

        gl_FragColor = mix(vColor, uFogColor, fogAmount);
    }
`;

const fogColor = vec4.fromValues(0.8, 0.9, 1, 1);
let fogDensity = 0.02;

type ProgramInfo = {
    program: WebGLProgram
    attribLocations: {
        vertexPosition: number
        vertexColor: number
    }
    uniformLocations: {
        zoom: WebGLUniformLocation
        projectionMatrix: WebGLUniformLocation
        startingMatrix: WebGLUniformLocation
        rotationMatrix: WebGLUniformLocation
        fogColor: WebGLUniformLocation
        fogDensity: WebGLUniformLocation
    }
};

const interpolate = (min: number, max: number, percent: number) => {
    return min + percent * (max - min);
}

abstract class Base {
    constructor(
        protected readonly gl: WebGLRenderingContext,
        protected readonly programInfo: ProgramInfo,
    ) {}

    protected abstract get buffer(): WebGLBuffer;

    protected setupPositionBuffer() {
        const gl = this.gl;

        const numComponents = 3;
        const type = gl.FLOAT;
        const normalize = false;
        const stride = 0;
        const offset = 0;
        gl.bindBuffer(gl.ARRAY_BUFFER, this.buffer);
        gl.vertexAttribPointer(
            this.programInfo.attribLocations.vertexPosition,
            numComponents,
            type,
            normalize,
            stride,
            offset
        );
        gl.enableVertexAttribArray(this.programInfo.attribLocations.vertexPosition);
    }

    protected setupColorBuffer(color: vec4) {
        this.gl.vertexAttrib4fv(this.programInfo.attribLocations.vertexColor, color);
    }

    protected setupProgram(startingMatrix: mat4, rotationMatrix: mat4, color: vec4, zoom: number, fogColor: vec4, fogDensity: number) {
        const gl = this.gl;
        const programInfo = this.programInfo;

        this.setupPositionBuffer();

        this.setupColorBuffer(color);

        gl.useProgram(programInfo.program);

        gl.uniform1f(
            programInfo.uniformLocations.zoom,
            zoom
        );

        gl.uniform1f(
            programInfo.uniformLocations.fogDensity,
            fogDensity
        );

        gl.uniform4fv(
            programInfo.uniformLocations.fogColor,
            fogColor
        );

        gl.uniformMatrix4fv(
            programInfo.uniformLocations.projectionMatrix,
            false,
            WebGLUtils.getDefaultPerspective(gl)
        );

        gl.uniformMatrix4fv(
            programInfo.uniformLocations.startingMatrix,
            false,
            startingMatrix
        );

        gl.uniformMatrix4fv(
            programInfo.uniformLocations.rotationMatrix,
            false,
            rotationMatrix
        );
    }

    abstract render(rotationMatrix: mat4, zoom: number);
}

class Grid extends Base {
    private readonly density: number;
    constructor(
        gl: WebGLRenderingContext,
        programInfo: ProgramInfo,
        public readonly buffer: WebGLBuffer,
        public readonly size: number,
        public readonly graphDensity: number)
    {
        super(gl, programInfo);

        this.density = Math.log2(graphDensity) * 3;
        const density = this.density;

        const data = new Float32Array(density * density * 2 * 3);

        const low = -size / 2;
        const high = size / 2;
        const interpolateCoord = v => interpolate(low, high, v / (density - 1));

        let currentCell = 0;

        for (let i = 0; i < density; i++) {
            let coords = [
                // horizontal
                [low, interpolateCoord(i), 0.0],
                [high, interpolateCoord(i), 0.0],
                //vertical
                [interpolateCoord(i), low, 0.0],
                [interpolateCoord(i), high, 0.0],
            ]

            coords.forEach(([x, y, z]) => {
                data[currentCell++] = x;
                data[currentCell++] = y;
                data[currentCell++] = z;
            });
        }

        gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
        gl.bufferData(gl.ARRAY_BUFFER, data, gl.STATIC_DRAW);
    }

    render(rotationMatrix: mat4, zoom: number) {
        const gl = this.gl;

        const startingMatrix = this.getCenterMatrix();

        this.setupProgram(
            startingMatrix,
            rotationMatrix,
            vec4.fromValues(1.0, 1.0, 1.0, 1.0),
            zoom,
            fogColor,
            fogDensity,
        );

        gl.drawArrays(gl.LINES, 0.0, this.density * this.density * 2);
    }

    getCenterMatrix(): mat4 {
        const mat = mat4.fromXRotation(mat4.create(), -Math.PI / 2);

        return mat;
    }
}

type GraphFunc = (x: number, y: number) => number
type GraphProperties = {
    size: number,
    density: number,
    filled: boolean,
    f: GraphFunc,
};

class Grapher extends Base {
    properties?: GraphProperties;
    grid?: Grid;
    buffer: WebGLBuffer;
    gridBuffer: WebGLBuffer;

    constructor(gl: WebGLRenderingContext, programInfo: ProgramInfo) {
        super(gl, programInfo);

        this.buffer = gl.createBuffer()!;
        this.gridBuffer = gl.createBuffer()!;
    }

    public setProperties(graphProperties: GraphProperties) {
        this.properties = graphProperties;

        this.init();
    }

    private init() {
        this.initBuffer();
        this.initGrid();
    }

    private static getVertexCount(density: number, filled: boolean): number {
        if (filled) {
            return (density - 1) * (density - 1) * 6;
        } else {
            return density * density;
        }
    }

    private initGrid() {
        this.grid = new Grid(this.gl, this.programInfo, this.gridBuffer, this.properties!.size, this.properties!.density);
    }

    private initBuffer() {
        const gl = this.gl;

        const { density, size, f, filled } = this.properties!;

        const low = -size / 2;
        const high = size / 2;
        const interpolateCoord = v => interpolate(low, high, v / (density - 1));

        const values = new Float32Array(density * density);
        for (let i = 0; i < density; i++) {
            for (let j = 0; j < density; j++) {
                values[i * density + j] = f(interpolateCoord(j), interpolateCoord(i));
            }
        }

        const buf = this.buffer;

        const fullData = new Float32Array(Grapher.getVertexCount(density, filled) * 3);

        debugger;

        if (filled) {
            let currentCell = 0;
            for (let i = 0; i < density - 1; i++) {
                for (let j = 0; j < density - 1; j++) {
                    let points = [
                        [i, j],
                        [i, j + 1],
                        [i + 1, j + 1],
                        [i, j],
                        [i + 1, j],
                        [i + 1, j + 1],
                    ];

                    if ((i == 200 || i == 400) && j == 250)
                        debugger;

                    points.forEach(([y, x]) => {
                        fullData[currentCell++] = interpolateCoord(x);
                        fullData[currentCell++] = interpolateCoord(y);
                        fullData[currentCell++] = values[y * density + x];
                    });
                }
            }
        } else {
            let currentCell = 0;
            for (let y = 0; y < density; y++) {
                for (let x = 0; x < density; x++) {
                    fullData[currentCell++] = interpolateCoord(x);
                    fullData[currentCell++] = interpolateCoord(y);
                    fullData[currentCell++] = values[y * density + x];
                }
            }
        }

        gl.bindBuffer(gl.ARRAY_BUFFER, buf);
        gl.bufferData(gl.ARRAY_BUFFER, fullData, gl.STATIC_DRAW);
    }

    render(rotationMatrix: mat4, zoom: number) {
        const gl = this.gl;

        const startingMatrix = this.getCenterMatrix();

        this.setupProgram(
            startingMatrix,
            rotationMatrix,
            vec4.fromValues(0.0, 1.0, 0.0, 1.0),
            zoom,
            fogColor,
            fogDensity,
        );

        const { filled, density } = this.properties!;
        const mode = filled ? gl.TRIANGLES : gl.POINTS;
        gl.drawArrays(mode, 0.0, Grapher.getVertexCount(density, filled));

        this.grid!.render(rotationMatrix, zoom);
    }

    getCenterMatrix(): mat4 {
        const mat = mat4.fromXRotation(mat4.create(), -Math.PI / 2);

        return mat;
    }
};

function resize(canvas) {
    // Lookup the size the browser is displaying the canvas.
    const displayWidth  = canvas.clientWidth;
    const displayHeight = canvas.clientHeight;

    // Check if the canvas is not the same size.
    if (canvas.width  != displayWidth ||
        canvas.height != displayHeight) {

        // Make the canvas the same size
        canvas.width  = displayWidth;
        canvas.height = displayHeight;
    }
}

type Properties = {
    zoom: number,
    rotationHorizontal: number,
    rotationVertical: number,
};

const drawScene = (gl: WebGLRenderingContext, grapher: Grapher, properties: Properties) => {
    const canvas = <HTMLCanvasElement>gl.canvas;
    console.log(gl.drawingBufferWidth, gl.drawingBufferHeight);
    console.log(canvas.clientWidth, canvas.clientHeight);
    resize(canvas);
    gl.viewport(0.0, 0.0, canvas.clientWidth, canvas.clientHeight);

    // gl.clearColor(0.0, 0.0, 0.0, 1.0);  // Clear to black, fully opaque
    // @ts-ignore
    gl.clearColor(...fogColor);
    gl.clearDepth(1.0);                 // Clear everything
    gl.enable(gl.DEPTH_TEST);           // Enable depth testing
    gl.depthFunc(gl.LEQUAL);            // Near things obscure far things

    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

    const rotationMatrix = mat4.fromYRotation(mat4.create(), properties.rotationHorizontal);
    mat4.rotateX(rotationMatrix, rotationMatrix, properties.rotationVertical);

    grapher.render(rotationMatrix, properties.zoom);
};


const initialProperties: Properties = {
    zoom: -30,
    rotationVertical: Math.PI / 4,
    rotationHorizontal: 0.0,
};

const functions = [
    (x: number, y: number) => Math.sin(x) * Math.cos(y) * 2.0,
    (x: number, y: number) => Math.sin(x) * Math.cos(y) * x * Math.log(Math.abs(y)) * 0.5,
    (x: number, y: number) => (x + y) / 4.0,
    (x: number, y: number) => x * y / 6.0,
    (x: number, y: number) => Math.trunc(x) * Math.cos(y),
    (x: number, y: number) => Math.tan(x) * Math.tanh(y),
];

let functionPtr = 0;

const initialGraphProperties: GraphProperties = {
    size: 16,
    density: 512,
    filled: false,
    f: functions[functionPtr],
};

let graphProperties: GraphProperties = { ...initialGraphProperties };

const updateGrapher = (grapher: Grapher) => {
    grapher.setProperties(graphProperties);
};

const onKeyDown = (event: KeyboardEvent, args: {grapher: Grapher, properties: Properties}) => {
    const key = event.key;

    console.log(key);

    switch (key) {
    case "ArrowUp":
        args.properties.rotationVertical += 0.1;
        break;
    case "ArrowDown":
        args.properties.rotationVertical -= 0.1;
        break;
    case "ArrowLeft":
        args.properties.rotationHorizontal -= 0.1;
        break;
    case "ArrowRight":
        args.properties.rotationHorizontal += 0.1;
        break;
    case "+":
        args.properties.zoom += 1;
        break;
    case "-":
        args.properties.zoom -= 1;
        break;
    case "f":
        functionPtr = (functionPtr + 1) % functions.length;
        graphProperties.f = functions[functionPtr];
        updateGrapher(args.grapher);
        break;
    case "m":
        graphProperties.filled = !graphProperties.filled;
        updateGrapher(args.grapher);
        break;
    case "d":
        fogDensity += 0.004;
        break;
    case "D":
        fogDensity -= 0.004;
        break;
    case "<":
        graphProperties.density /= 2;
        updateGrapher(args.grapher);
        break;
    case ">":
        graphProperties.density *= 2;
        updateGrapher(args.grapher);
        break;
    case "[":
        graphProperties.size /= 2;
        updateGrapher(args.grapher);
        break;
    case "]":
        graphProperties.size *= 2;
        updateGrapher(args.grapher);
        break;

    case "Backspace":
        args.properties = { ...initialProperties };
        graphProperties = { ...initialGraphProperties };
        updateGrapher(args.grapher);
        break;
    }
};

const plotMain = () => {
    const canvas = <HTMLCanvasElement>document.querySelector("#glCanvas");
    const gl = canvas.getContext("webgl");

    if (gl === null) {
        alert("Unable to initialize WebGL. Your browser or machine may not support it.");
        return;
    }

    const shaderProgram = WebGLUtils.initShaderProgram(gl, vertexShaderSource, fragmentShaderSource)!;

    const programInfo: ProgramInfo = {
        program: shaderProgram,
        attribLocations: {
            vertexPosition: gl.getAttribLocation(shaderProgram, "aVertexPosition"),
            vertexColor: gl.getAttribLocation(shaderProgram, "aVertexColor"),
        },
        uniformLocations: {
            zoom: gl.getUniformLocation(shaderProgram, "uZoom")!,
            projectionMatrix: gl.getUniformLocation(shaderProgram, 'uProjectionMatrix')!,
            startingMatrix: gl.getUniformLocation(shaderProgram, 'uStartingMatrix')!,
            rotationMatrix: gl.getUniformLocation(shaderProgram, 'uRotationMatrix')!,
            fogColor: gl.getUniformLocation(shaderProgram, 'uFogColor')!,
            fogDensity: gl.getUniformLocation(shaderProgram, 'uFogDensity')!,
        }
    };

    const grapher = new Grapher(gl, programInfo);
    updateGrapher(grapher);

    const properties: Properties = {...initialProperties};

    const args = { grapher, properties };

    const draw = () => {
        drawScene(gl, args.grapher, args.properties);
    }

    window.onkeydown = e => {
        onKeyDown(e, args);
        draw();
    }

    window.onresize = draw;

    draw();
};

document.body.onload = plotMain;
