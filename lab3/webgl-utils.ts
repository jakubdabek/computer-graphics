import { mat4 } from "./gl-matrix/index.js";

export { WebGLUtils };

const initShaderProgram = (
    gl: WebGLRenderingContext,
    vertexShaderSource: string,
    fragmentShaderSource: string,
    bindAttribLocations?: ((program: WebGLProgram) => void)
): WebGLProgram | null => {
    const vertexShader = loadShader(gl, gl.VERTEX_SHADER, vertexShaderSource);
    const fragmentShader = loadShader(gl, gl.FRAGMENT_SHADER, fragmentShaderSource);

    if (vertexShader == null || fragmentShader == null) {
        return null;
    }

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

const loadShader = (gl: WebGLRenderingContext, type: number, source: string): WebGLShader | null => {
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

const loadTexture = (gl: WebGLRenderingContext, url: string): WebGLTexture => {
    const texture = gl.createTexture()!;
    gl.bindTexture(gl.TEXTURE_2D, texture);

    const level = 0;
    const internalFormat = gl.RGBA;
    const width = 1;
    const height = 1;
    const border = 0;
    const srcFormat = gl.RGBA;
    const srcType = gl.UNSIGNED_BYTE;
    const pixel = new Uint8Array([0, 0, 255, 255]);
    gl.texImage2D(gl.TEXTURE_2D, level, internalFormat,
        width, height, border, srcFormat, srcType,
        pixel);

    const image = new Image();
    image.onload = () => {
        gl.bindTexture(gl.TEXTURE_2D, texture);
        gl.texImage2D(gl.TEXTURE_2D, level, internalFormat,
            srcFormat, srcType, image);

        if (isPowerOf2(image.width) && isPowerOf2(image.height)) {
            gl.generateMipmap(gl.TEXTURE_2D);
        } else {
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
        }
    };

    image.onerror = () => {
        alert(`unable to load image: "${url}"`);
    };

    image.src = url;

    return texture;
}

const isPowerOf2 = (value: number): boolean => {
    return (value & (value - 1)) == 0;
}

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

const getDefaultPerspective = (gl: WebGLRenderingContext): mat4 => {
    const fieldOfView = 45 * Math.PI / 180;   // in radians
    const aspect = gl.drawingBufferWidth / gl.drawingBufferHeight;
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
    loadTexture,
    getData,
    getDefaultPerspective,
};
