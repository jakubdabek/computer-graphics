import { WebGLUtils } from "./webgl-utils.js";
import { mat4, vec4, vec3 } from "./gl-matrix/index.js";

const getShaderSources = (light: boolean) => {
    if (light) {
        return {
            vertexShaderSource: `
                attribute vec4 aVertexPosition;
                attribute vec3 aVertexNormal;
            
                uniform float uZoom;
                uniform mat4 uWorldMatrix;
                uniform mat4 uWorldInverseTransposeMatrix;
                uniform mat4 uProjectionMatrix;

                varying vec3 vNormal;
                varying vec3 vPosition;
            
                void main() {
                    vec4 position = uWorldMatrix * aVertexPosition;
                    position.z += uZoom;
                    gl_Position = uProjectionMatrix * position;
                    gl_PointSize = 2.0;
            
                    vPosition = position.xyz;
                    vNormal = mat3(uWorldInverseTransposeMatrix) * aVertexNormal;
                }
            `,
            fragmentShaderSource: `
                precision mediump float;
            
                varying vec3 vNormal;
                varying vec3 vPosition;
            
                uniform vec4 uFogColor;
                uniform float uFogDensity;
            
                uniform vec3 uReverseLightDirection;
                uniform vec4 uLightColor;
            
                void main() {
                    #define LOG2 1.442695
            
                    float fogDistance = length(vPosition);
                    float fogAmount = 1. - exp2(-uFogDensity * uFogDensity * fogDistance * fogDistance * LOG2);
                    fogAmount = clamp(fogAmount, 0., 1.);
            
                    vec3 normal = normalize(vNormal);
                    float light = max(dot(normal, uReverseLightDirection), 0.0);
            
                    vec4 color = uLightColor;
                    color.rgb *= light;
            
                    gl_FragColor = mix(color, uFogColor, fogAmount);
                }
            `,
        }
    } else {
        return {
            vertexShaderSource: `
                attribute vec4 aVertexPosition;
                attribute vec4 aVertexColor;
            
                uniform float uZoom;
                uniform mat4 uWorldMatrix;
                uniform mat4 uProjectionMatrix;
            
                varying mediump vec4 vColor;
                varying vec3 vPosition;
            
                void main() {
                    vec4 position = uWorldMatrix * aVertexPosition;
                    position.z += uZoom;
                    gl_Position = uProjectionMatrix * position;
                    gl_PointSize = 2.0;
            
                    vPosition = position.xyz;
                    vColor = aVertexColor;
                }
            `,
            fragmentShaderSource: `
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
            `,
        }
    }
}

const fogColor = vec4.fromValues(0.8, 0.9, 1, 1);
let fogDensity = 0.02;

type LightProgramInfo = {
    program: WebGLProgram
    attribLocations: {
        vertexPosition: number
        vertexNormal: number
    }
    uniformLocations: {
        zoom: WebGLUniformLocation
        projectionMatrix: WebGLUniformLocation
        worldMatrix: WebGLUniformLocation
        worldInverseTransposeMatrix: WebGLUniformLocation
        fogColor: WebGLUniformLocation
        fogDensity: WebGLUniformLocation
        reverseLightDirection: WebGLUniformLocation
        lightColor: WebGLUniformLocation
    }
};

type NoLightProgramInfo = {
    program: WebGLProgram
    attribLocations: {
        vertexPosition: number
        vertexColor: number
    }
    uniformLocations: {
        zoom: WebGLUniformLocation
        projectionMatrix: WebGLUniformLocation
        worldMatrix: WebGLUniformLocation
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
        protected readonly lightProgramInfo: LightProgramInfo,
        protected readonly noLightProgramInfo: NoLightProgramInfo,
    ) {}

    protected abstract get buffer(): WebGLBuffer;
    protected abstract get normalBuffer(): WebGLBuffer | null;

    protected info(light: boolean) {
        if (light)
            return this.lightProgramInfo;
        else
            return this.noLightProgramInfo;
    }

    protected setupPositionBuffer(light: boolean) {
        const gl = this.gl;

        const numComponents = 3;
        const type = gl.FLOAT;
        const normalize = false;
        const stride = 0;
        const offset = 0;
        gl.bindBuffer(gl.ARRAY_BUFFER, this.buffer);
        gl.vertexAttribPointer(
            this.info(light).attribLocations.vertexPosition,
            numComponents,
            type,
            normalize,
            stride,
            offset
        );
        gl.enableVertexAttribArray(this.info(light).attribLocations.vertexPosition);
    }

    protected setupColorBuffer(color: vec4) {
        this.gl.vertexAttrib4fv(this.noLightProgramInfo.attribLocations.vertexColor, color);
    }

    protected setupNormalBuffer() {
        const buf = this.normalBuffer;
        if (buf === null)
            return;
        
        const gl = this.gl;

        const numComponents = 3;
        const type = gl.FLOAT;
        const normalize = false;
        const stride = 0;
        const offset = 0;
        gl.bindBuffer(gl.ARRAY_BUFFER, buf);
        gl.vertexAttribPointer(
            this.lightProgramInfo.attribLocations.vertexNormal,
            numComponents,
            type,
            normalize,
            stride,
            offset
        );
        gl.enableVertexAttribArray(this.lightProgramInfo.attribLocations.vertexNormal);
    }

    protected setupLightProgram(
        startingMatrix: mat4,
        rotationMatrix: mat4,
        zoom: number,
        fogColor: vec4,
        fogDensity: number,
        reverseLightDirection: vec3,
        lightColor: vec4
    ) {
        this.setupProgram(
            true,
            startingMatrix,
            rotationMatrix,
            zoom,
            fogColor,
            fogDensity,
        );

        this.setupNormalBuffer();

        const gl = this.gl;

        const programInfo = this.lightProgramInfo;

        gl.uniform3fv(
            programInfo.uniformLocations.reverseLightDirection,
            reverseLightDirection
        );

        gl.uniform4fv(
            programInfo.uniformLocations.lightColor,
            lightColor
        );
    }

    protected setupNoLightProgram(
        startingMatrix: mat4,
        rotationMatrix: mat4,
        zoom: number,
        color: vec4,
        fogColor: vec4,
        fogDensity: number,
    ) {
        this.setupProgram(
            false,
            startingMatrix,
            rotationMatrix,
            zoom,
            fogColor,
            fogDensity,
        );
            
        this.setupColorBuffer(color);
    }

    private setupProgram(
        light: boolean,
        startingMatrix: mat4,
        rotationMatrix: mat4,
        zoom: number,
        fogColor: vec4,
        fogDensity: number
    ) {
        const gl = this.gl;
        const programInfo = this.info(light);

        gl.useProgram(programInfo.program);

        this.setupPositionBuffer(light);

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

        const worldMatrix = mat4.mul(mat4.create(), rotationMatrix, startingMatrix);

        gl.uniformMatrix4fv(
            programInfo.uniformLocations.worldMatrix,
            false,
            worldMatrix
        );

        if (light) {
            const worldInverseTransposeMatrix = mat4.invert(worldMatrix, worldMatrix);
            if (worldInverseTransposeMatrix === null) {
                alert("bruh");
                return;
            }
    
            mat4.transpose(worldInverseTransposeMatrix, worldInverseTransposeMatrix);
    
            gl.uniformMatrix4fv(
                this.lightProgramInfo.uniformLocations.worldInverseTransposeMatrix,
                false,
                worldInverseTransposeMatrix
            );
        }
    }

    abstract render(rotationMatrix: mat4, zoom: number);
}

class Grid extends Base {
    private readonly density: number;
    constructor(
        gl: WebGLRenderingContext,
        lightProgramInfo: LightProgramInfo,
        noLightProgramInfo: NoLightProgramInfo,
        public readonly buffer: WebGLBuffer,
        public readonly size: number,
        public readonly graphDensity: number)
    {
        super(gl, lightProgramInfo, noLightProgramInfo);

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

    protected get normalBuffer(): WebGLBuffer | null {
        return null;
    }

    render(rotationMatrix: mat4, zoom: number) {
        const gl = this.gl;

        const startingMatrix = this.getCenterMatrix();

        this.setupNoLightProgram(
            startingMatrix,
            rotationMatrix,
            zoom,
            vec4.fromValues(1.0, 1.0, 1.0, 1.0),
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
    normalBuffer: WebGLBuffer;
    gridBuffer: WebGLBuffer;

    constructor(
        gl: WebGLRenderingContext,
        lightProgramInfo: LightProgramInfo,
        noLightProgramInfo: NoLightProgramInfo
    ) {
        super(gl, lightProgramInfo, noLightProgramInfo);

        this.buffer = gl.createBuffer()!;
        this.normalBuffer = gl.createBuffer()!;
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
        this.grid = new Grid(
            this.gl,
            this.lightProgramInfo,
            this.noLightProgramInfo,
            this.gridBuffer,
            this.properties!.size,
            this.properties!.density
        );
    }

    private initBuffer() {
        const gl = this.gl;

        const { density, size, f, filled } = this.properties!;

        const low = -size / 2;
        const high = size / 2;
        const interpolateCoord = v => interpolate(low, high, v / (density - 1));

        const values: Float32Array[] = new Array(density).fill(undefined);
        values.forEach((_, i, self) => {
            self[i] = new Float32Array(density);
            self[i].forEach((_, j, row) => {
                row[j] = f(interpolateCoord(j), interpolateCoord(i));
            });
        });

        const points: vec3[][] = new Array(density).fill(undefined);
        points.forEach((_, i, self) => {
            self[i] = new Array(density).fill(undefined);
            self[i].forEach((_, j, row) => {
                row[j] = vec3.fromValues(interpolateCoord(j), interpolateCoord(i), values[i][j]);
            });
        });

        const triangleNormals: [vec3, vec3][][] = new Array(density - 1).fill(undefined);
        triangleNormals.forEach((_, i, self) => {
            self[i] = new Array(density - 1).fill(undefined);
            self[i].forEach((_, j, row) => {
                const calcTriangleNormal = (a: vec3, b: vec3, c: vec3) => {
                    b = vec3.clone(b);
                    c = vec3.clone(c);

                    const ab = vec3.sub(b, b, a);
                    const ac = vec3.sub(c, c, a);

                    const normal = vec3.cross(ab, ab, ac);
                    vec3.normalize(normal, normal);

                    return normal;
                }

                // square points going counter-clockwise
                const a = points[i][j];
                const b = points[i][j + 1];
                const c = points[i + 1][j + 1];
                const d = points[i + 1][j];
                
                const bottomNormal = calcTriangleNormal(a, b, c);
                const topNormal = calcTriangleNormal(a, c, d);

                row[j] = [bottomNormal, topNormal];
            });
        });

        const vertexNormals: vec3[][] = new Array(density).fill(undefined);
        vertexNormals.forEach((_, i, self) => {
            self[i] = new Array(density).fill(undefined);
            self[i].forEach((_, j, row) => {
                if (i == 0 || i == density - 1 || j == 0 || j == density - 1) {
                    row[j] = vec3.fromValues(0.0, 0.0, 1.0);
                    return;
                }

                const triangleNormalCoords: [number, number, number][] = [
                    [i, j, 0],
                    [i, j, 1],
                    [i - 1, j - 1, 0],
                    [i - 1, j - 1, 1],
                    [i, j - 1, 0],
                    [i - 1, j, 1],
                ];

                const vertexNormal = triangleNormalCoords.reduce((curr, [y, x, c]) => {
                    const normal = triangleNormals[y][x][c];
                    return vec3.add(curr, curr, normal);
                }, vec3.create());

                vec3.normalize(vertexNormal, vertexNormal);

                row[j] = vertexNormal;
            });
        });

        const vertexData = new Float32Array(Grapher.getVertexCount(density, filled) * 3 * 2);
        const normalData = new Float32Array(Grapher.getVertexCount(density, filled) * 3 * 2);

        let currentCell = 0;
        let currentNormalCell = 0;

        if (filled) {
            for (let i = 0; i < density - 1; i++) {
                for (let j = 0; j < density - 1; j++) {
                    let triangleCoords = [
                        // bottom triangle
                        [i, j],
                        [i, j + 1],
                        [i + 1, j + 1],
                        // top triangle
                        [i, j],
                        [i + 1, j + 1],
                        [i + 1, j],
                    ];

                    if ((i == 200 || i == 400) && j == 250)
                        debugger;

                    triangleCoords.forEach(([y, x]) => {
                        const point = points[y][x];
                        vertexData[currentCell++] = point[0];
                        vertexData[currentCell++] = point[1];
                        vertexData[currentCell++] = point[2];
                        
                        const normal = vertexNormals[y][x];
                        normalData[currentNormalCell++] = normal[0];
                        normalData[currentNormalCell++] = normal[1];
                        normalData[currentNormalCell++] = normal[2];
                    });

                    triangleCoords.reverse().forEach(([y, x]) => {
                        const point = points[y][x];
                        vertexData[currentCell++] = point[0];
                        vertexData[currentCell++] = point[1];
                        vertexData[currentCell++] = point[2]-0.1;
                        
                        const normal = vertexNormals[y][x];
                        normalData[currentNormalCell++] = -normal[0];
                        normalData[currentNormalCell++] = -normal[1];
                        normalData[currentNormalCell++] = -normal[2];
                    });
                }
            }
        } else {
            for (let y = 0; y < density; y++) {
                for (let x = 0; x < density; x++) {
                    const point = points[y][x];
                    vertexData[currentCell++] = point[0];
                    vertexData[currentCell++] = point[1];
                    vertexData[currentCell++] = point[2];

                    const normal = vertexNormals[y][x];
                    normalData[currentNormalCell++] = normal[0];
                    normalData[currentNormalCell++] = normal[1];
                    normalData[currentNormalCell++] = normal[2];

                    vertexData[currentCell++] = point[0];
                    vertexData[currentCell++] = point[1];
                    vertexData[currentCell++] = point[2] - 0.1;
                    normalData[currentNormalCell++] = -normal[0];
                    normalData[currentNormalCell++] = -normal[1];
                    normalData[currentNormalCell++] = -normal[2];
                }
            }
        }

        gl.bindBuffer(gl.ARRAY_BUFFER, this.buffer);
        gl.bufferData(gl.ARRAY_BUFFER, vertexData, gl.STATIC_DRAW);

        gl.bindBuffer(gl.ARRAY_BUFFER, this.normalBuffer);
        gl.bufferData(gl.ARRAY_BUFFER, normalData, gl.STATIC_DRAW);
    }

    render(rotationMatrix: mat4, zoom: number) {
        const gl = this.gl;

        const startingMatrix = this.getCenterMatrix();

        this.setupLightProgram(
            startingMatrix,
            rotationMatrix,
            zoom,
            fogColor,
            fogDensity,
            vec3.normalize(vec3.create(), vec3.fromValues(0.5, 0.7, 0.3)),
            vec4.fromValues(0.2, 1, 0.2, 1)
        );

        const { filled, density } = this.properties!;
        const mode = filled ? gl.TRIANGLES : gl.POINTS;
        gl.drawArrays(mode, 0.0, Grapher.getVertexCount(density, filled) * 2);

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
    (x: number, y: number) => Math.sin(x * x * y * y),
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
        args.properties.rotationVertical += Math.PI / 32;
        break;
    case "ArrowDown":
        args.properties.rotationVertical -= Math.PI / 32;
        break;
    case "ArrowLeft":
        args.properties.rotationHorizontal -= Math.PI / 32;
        break;
    case "ArrowRight":
        args.properties.rotationHorizontal += Math.PI / 32;
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

    const lightSources = getShaderSources(true);
    const lightShaderProgram = WebGLUtils.initShaderProgram(gl, lightSources.vertexShaderSource, lightSources.fragmentShaderSource)!;

    const lightProgramInfo: LightProgramInfo = {
        program: lightShaderProgram,
        attribLocations: {
            vertexPosition: gl.getAttribLocation(lightShaderProgram, "aVertexPosition"),
            vertexNormal: gl.getAttribLocation(lightShaderProgram, "aVertexNormal"),
        },
        uniformLocations: {
            zoom: gl.getUniformLocation(lightShaderProgram, "uZoom")!,
            projectionMatrix: gl.getUniformLocation(lightShaderProgram, 'uProjectionMatrix')!,
            worldMatrix: gl.getUniformLocation(lightShaderProgram, 'uWorldMatrix')!,
            worldInverseTransposeMatrix: gl.getUniformLocation(lightShaderProgram, 'uWorldInverseTransposeMatrix')!,
            fogColor: gl.getUniformLocation(lightShaderProgram, 'uFogColor')!,
            fogDensity: gl.getUniformLocation(lightShaderProgram, 'uFogDensity')!,
            reverseLightDirection: gl.getUniformLocation(lightShaderProgram, 'uReverseLightDirection')!,
            lightColor: gl.getUniformLocation(lightShaderProgram, 'uLightColor')!,
        }
    };

    const noLightSources = getShaderSources(true);
    const noLightShaderProgram = WebGLUtils.initShaderProgram(gl, noLightSources.vertexShaderSource, noLightSources.fragmentShaderSource)!;

    const noLightProgramInfo: NoLightProgramInfo = {
        program: noLightShaderProgram,
        attribLocations: {
            vertexPosition: gl.getAttribLocation(noLightShaderProgram, "aVertexPosition"),
            vertexColor: gl.getAttribLocation(noLightShaderProgram, "aVertexColor"),
        },
        uniformLocations: {
            zoom: gl.getUniformLocation(noLightShaderProgram, "uZoom")!,
            projectionMatrix: gl.getUniformLocation(noLightShaderProgram, 'uProjectionMatrix')!,
            worldMatrix: gl.getUniformLocation(noLightShaderProgram, 'uWorldMatrix')!,
            fogColor: gl.getUniformLocation(noLightShaderProgram, 'uFogColor')!,
            fogDensity: gl.getUniformLocation(noLightShaderProgram, 'uFogDensity')!,
        }
    };

    const grapher = new Grapher(gl, lightProgramInfo, noLightProgramInfo);
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
