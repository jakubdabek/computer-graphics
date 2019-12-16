import { mat4 } from "./gl-matrix/index.js";

export { WebGLUtils };

const initShaderProgram = (
    gl: WebGLRenderingContext,
    vsSource: string,
    fsSource: string,
    bindAttribLocations?: ((program: WebGLProgram) => void)
) => {
    const vertexShader = loadShader(gl, gl.VERTEX_SHADER, vsSource)!;
    const fragmentShader = loadShader(gl, gl.FRAGMENT_SHADER, fsSource)!;

    const shaderProgram = gl.createProgram()!;
    gl.attachShader(shaderProgram, vertexShader);
    gl.attachShader(shaderProgram, fragmentShader);

    if (bindAttribLocations)
        bindAttribLocations(shaderProgram);

    gl.linkProgram(shaderProgram);

    if (!gl.getProgramParameter(shaderProgram, gl.LINK_STATUS)) {
        alert('Unable to initialize the shader program: ' + gl.getProgramInfoLog(shaderProgram));
        return null;
    }

    return shaderProgram;
};

const loadShader = (gl: WebGLRenderingContext, type: number, source: string) => {
    const shader = gl.createShader(type)!;

    gl.shaderSource(shader, source);

    gl.compileShader(shader);

    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
        alert('An error occurred compiling the shaders: ' + gl.getShaderInfoLog(shader));
        gl.deleteShader(shader);
        return null;
    }

    return shader;
};

const getData = (gl: WebGLRenderingContext, program: WebGLProgram) => {
    const numAttribs = gl.getProgramParameter(program, gl.ACTIVE_ATTRIBUTES);
    const attribs: WebGLActiveInfo[] = [];
    for (let i = 0; i < numAttribs; ++i) {
        const info = gl.getActiveAttrib(program, i)!;
        attribs.push(info);
    }

    const numUniforms = gl.getProgramParameter(program, gl.ACTIVE_UNIFORMS);
    const uniforms: WebGLActiveInfo[] = [];
    for (let i = 0; i < numUniforms; ++i) {
        const info = gl.getActiveUniform(program, i)!;
        uniforms.push(info);
    }

    return {
        attribs,
        uniforms,
    };
};

const getDefaultPerspective = (gl: WebGLRenderingContext) => {
    const canvas = <HTMLCanvasElement>gl.canvas;

    const fieldOfView = 45 * Math.PI / 180;   // in radians
    const aspect = canvas.clientWidth / canvas.clientHeight;
    const zNear = 0.1;
    const zFar = 100.0;
    const projectionMatrix = mat4.create();

    mat4.perspective(
        projectionMatrix,
        fieldOfView,
        aspect,
        zNear,
        zFar
    );

    return projectionMatrix;
};

const WebGLUtils = {
    initShaderProgram,
    loadShader,
    getData,
    getDefaultPerspective,
};
