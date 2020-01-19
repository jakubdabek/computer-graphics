import { WebGLUtils } from "./webgl-utils.js";
import { mat4, vec4 } from "./gl-matrix/index.js";

const vertexShaderSource = `
    attribute vec4 aVertexPosition;
    attribute vec4 aVertexColor;

    uniform mat4 uModelViewMatrix;
    uniform mat4 uProjectionMatrix;

    varying mediump vec4 vColor;

    void main() {
        gl_Position = uProjectionMatrix * uModelViewMatrix * aVertexPosition;
        vColor = aVertexColor;
    }
`;

const fragmentShaderSource = `
    varying mediump vec4 vColor;

    void main() {
        gl_FragColor = vColor;
    }
`;

type ProgramInfo = {
    program: WebGLProgram
    attribLocations: {
        vertexPosition: number
        vertexColor: number
    }
    uniformLocations: {
        projectionMatrix: WebGLUniformLocation
        modelViewMatrix: WebGLUniformLocation
    }
};

const interpolate = (min: number, max: number, percent: number) => {
    return min + percent * (max - min);
}

class Grid {
    constructor(
        private readonly gl: WebGLRenderingContext,
        private readonly programInfo: ProgramInfo,
        public readonly buffer: WebGLBuffer,
        public readonly size: number,
        public readonly density: number)
    {
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

    private setupPositionBuffer() {
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

    private setupProgram(projectionMatrix: mat4, modelViewMatrix: mat4, color: vec4) {
        const gl = this.gl;
        const programInfo = this.programInfo;

        this.setupPositionBuffer();

        this.setupColorBuffer(color);

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

    render(rotationMatrix: mat4, zoom: number) {
        const gl = this.gl;

        const projectionMatrix = WebGLUtils.getDefaultPerspective(gl);
        const modelViewMatrix = this.getCenterMatrix();

        mat4.multiply(modelViewMatrix, rotationMatrix, modelViewMatrix);
        mat4.translate(modelViewMatrix, modelViewMatrix, [0.0, 0.0, zoom]);

        this.setupProgram(projectionMatrix, modelViewMatrix, vec4.fromValues(1.0, 1.0, 1.0, 1.0));

        gl.drawArrays(gl.LINES, 0.0, this.density * this.density * 2);
    }

    getCenterMatrix(): mat4 {
        const mat = mat4.fromXRotation(mat4.create(), -Math.PI);

        return mat;
    }
}

class Grapher {
    size?: number;
    density?: number;
    filled?: boolean;
    grid?: Grid;
    positionBuffer?: WebGLBuffer;
    gridBuffer?: WebGLBuffer;

    constructor(public readonly gl: WebGLRenderingContext, public readonly programInfo: ProgramInfo) {
        this.size = 10;
        this.density = 100;
        this.filled = true;

        this.initBuffer(this.size, this.density, (x, y) => x, this.filled);
    }

    private static getVertexCount(density: number, filled: boolean): number {
        if (filled) {
            return density * density;
        } else {
            return (density - 1) * (density - 1) * 6;
        }
    }

    private initBuffer(size: number, density: number, f: (x: number, y: number) => number, filled: boolean) {
        const gl = this.gl;

        const values = new Float32Array(density * density);
        for (let i = 0; i < density; i++) {
            for (let j = 0; j < density; j++) {
                values[i * density + j] = f(i, j);
            }
        }

        if (this.positionBuffer === undefined) {
            this.positionBuffer = this.gl.createBuffer()!;
        }

        const buf = this.positionBuffer;

        const low = -size / 2;
        const high = size / 2;
        const interpolateCoord = v => interpolate(low, high, v / (density - 1));

        const fullData = new Float32Array(Grapher.getVertexCount(density, filled) * 3);

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

                    points.forEach(([y, x]) => {
                        fullData[currentCell++] = interpolateCoord(x);
                        fullData[currentCell++] = interpolateCoord(y);
                        fullData[currentCell++] = values[y * density + x];
                    });
                }
            }
        } else {
            let currentCell = 0;
            for (let y = 0; y <= density; y++) {
                for (let x = 0; x <= density; x++) {
                    fullData[currentCell++] = interpolateCoord(x);
                    fullData[currentCell++] = interpolateCoord(y);
                    fullData[currentCell++] = values[y * density + x];
                }
            }
        }

        gl.bindBuffer(gl.ARRAY_BUFFER, buf);
        gl.bufferData(gl.ARRAY_BUFFER, fullData, gl.STATIC_DRAW);

        if (this.gridBuffer === undefined) {
            this.gridBuffer = gl.createBuffer()!;
        }

        this.grid = new Grid(gl, this.programInfo, this.gridBuffer, size, density);
    }

    private setupPositionBuffer() {
        const gl = this.gl;

        const numComponents = 3;
        const type = gl.FLOAT;
        const normalize = false;
        const stride = 0;
        const offset = 0;
        gl.bindBuffer(gl.ARRAY_BUFFER, this.positionBuffer!);
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

    private setupProgram(projectionMatrix: mat4, modelViewMatrix: mat4, color: vec4) {
        const gl = this.gl;
        const programInfo = this.programInfo;

        this.setupPositionBuffer();

        this.setupColorBuffer(color);

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

    render(rotationMatrix: mat4, zoom: number) {
        const gl = this.gl;

        const projectionMatrix = WebGLUtils.getDefaultPerspective(gl);
        const modelViewMatrix = this.getCenterMatrix();
        mat4.multiply(modelViewMatrix, rotationMatrix, modelViewMatrix);
        mat4.translate(modelViewMatrix, modelViewMatrix, [0.0, 0.0, zoom]);

        this.setupProgram(projectionMatrix, modelViewMatrix, vec4.fromValues(0.0, 1.0, 0.0, 1.0));

        gl.drawArrays(gl.TRIANGLES, 0.0, Grapher.getVertexCount(this.density!, this.filled!));

        this.grid!.render(rotationMatrix, zoom);
    }

    getCenterMatrix(): mat4 {
        const mat = mat4.fromXRotation(mat4.create(), -Math.PI);
        const move = -this.size! / 2;
        mat4.translate(mat, mat, [move, move, 0.0]);

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
    modelViewMatrix: mat4,
    zoom: number,
};

const drawScene = (gl: WebGLRenderingContext, grapher: Grapher, properties: Properties) => {
    const canvas = <HTMLCanvasElement>gl.canvas;
    console.log(gl.drawingBufferWidth, gl.drawingBufferHeight);
    console.log(canvas.clientWidth, canvas.clientHeight);
    resize(canvas);
    gl.viewport(0.0, 0.0, canvas.clientWidth, canvas.clientHeight);

    gl.clearColor(0.0, 0.0, 0.0, 1.0);  // Clear to black, fully opaque
    gl.clearDepth(1.0);                 // Clear everything
    gl.enable(gl.DEPTH_TEST);           // Enable depth testing
    gl.depthFunc(gl.LEQUAL);            // Near things obscure far things

    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

    grapher.render(properties.modelViewMatrix, properties.zoom);
};

const onKeyDown = (event: KeyboardEvent, properties: Properties) => {
    const key = event.key;

    const mat = properties.modelViewMatrix;

    console.log(key);

    switch (key) {
    case "ArrowUp":
        mat4.rotateX(mat, mat, 0.2);
        break;
    case "ArrowDown":
        mat4.rotateX(mat, mat, -0.2);
        break;
    case "ArrowLeft":
        mat4.rotateY(mat, mat, 0.2);
        break;
    case "ArrowRight":
        mat4.rotateY(mat, mat, -0.2);
        break;
    case "+":
        properties.zoom += 1;
        break;
    case "-":
        properties.zoom -= 1;
        break;
    case "Backspace":
        mat4.identity(mat);
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
            projectionMatrix: gl.getUniformLocation(shaderProgram, 'uProjectionMatrix')!,
            modelViewMatrix: gl.getUniformLocation(shaderProgram, 'uModelViewMatrix')!,
        }
    };

    const grapher = new Grapher(gl, programInfo);

    const properties: Properties = {
        modelViewMatrix: mat4.create(),
        zoom: 20,
    }
    
    const draw = () => {
        drawScene(gl, grapher, properties);
    }

    window.onkeydown = e => {
        onKeyDown(e, properties);
        draw();
    }

    window.onresize = draw;

    draw();
};

document.body.onload = plotMain;
