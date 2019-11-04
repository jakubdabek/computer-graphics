const deg2rad = deg => deg / 180 * Math.PI;
const rad2deg = rad => rad / Math.PI * 180;

class Vec2D {
    constructor(public x: number, public y: number) {}

    public add(other: Vec2D): Vec2D { return vec2(this.x + other.x, this.y + other.y); }
    public sub(other: Vec2D): Vec2D { return vec2(this.x - other.x, this.y - other.y); }
    public mul(other: Vec2D): Vec2D { return vec2(this.x * other.x, this.y * other.y); }

    public toString() { return `(${this.x}, ${this.y})`}

    static readonly zero = new Vec2D(0, 0);
}

const vec2 = (x: number, y: number) => new Vec2D(x, y);

class Vec3D {
    constructor(public x: number, public y: number, public z: number) {}

    public add(other: Vec3D): Vec3D { return vec3(this.x + other.x, this.y + other.y, this.z + other.z); }
    public sub(other: Vec3D): Vec3D { return vec3(this.x - other.x, this.y - other.y, this.z - other.z); }
    public mul(other: Vec3D): Vec3D { return vec3(this.x * other.x, this.y * other.y, this.z * other.z); }

    public toString() { return `(${this.x}, ${this.y}, ${this.z})`}

    static readonly zero = new Vec3D(0, 0, 0);
}

const vec3 = (x: number, y: number, z: number) => new Vec3D(x, y, z);

class Rotation {
    constructor(public roll: number, public pitch: number, public yaw: number) {}
    public get x() { return this.pitch; }
    public get y() { return this.yaw; }
    public get z() { return this.roll; }
    public toString() { return `(${this.roll}, ${this.pitch}, ${this.yaw})`}

    public static readonly zero = new Rotation(0, 0, 0);
}

class Camera {
    constructor(
        public position: Vec3D = Vec3D.zero,
        public rotation: Rotation = Rotation.zero,
        public fov: number = 0,
        public nearDistance: number = 0,
        public farDistance: number = 0,
    ) {}

    public getRelativePoint(point: Vec3D): Vec3D {
        const x = point.x - this.position.x;
        const y = point.y - this.position.y;
        const z = point.z - this.position.z;

        const cx = Math.cos(this.rotation.x);
        const cy = Math.cos(this.rotation.y);
        const cz = Math.cos(this.rotation.z);

        const sx = Math.sin(this.rotation.x);
        const sy = Math.sin(this.rotation.y);
        const sz = Math.sin(this.rotation.z);

        const dx = cy * (sz * y + cz * x) - sy * z;
        const tmp1 = cy * z + sy * (sz * y + cz * x);
        const tmp2 = cz * y - sz * x;
        const dy = sx * tmp1 + cx * tmp2;
        const dz = cx * tmp1 - sx * tmp2;

        return vec3(dx, dy, dz);
    }

    public normalizeViewVolumePoint(p: Vec3D): Vec3D {
        const xy = this.projection(p);

        const midpoint = (this.farDistance + this.nearDistance) / 2;
        const distance = this.farDistance - this.nearDistance;

        return vec3(xy.x, xy.y, (p.z - midpoint) / distance);
    }

    public normalizeViewVolume([p1, p2]: [Vec3D, Vec3D]): [Vec3D, Vec3D] | null {
        const tooNear1 = p1.z < this.nearDistance;
        const tooNear2 = p2.z < this.nearDistance;
        if (tooNear1 && tooNear2)
            return null;
        if (tooNear1 || tooNear2) {
            const alpha = (this.nearDistance - p1.z) / (p2.z - p1.z);
            const intersection = vec3(p1.x + alpha * (p2.x - p1.x), p1.y + alpha * (p2.y - p1.y), this.nearDistance);
            if (tooNear1)
                p1 = intersection;
            else
                p2 = intersection;
        }

        return [this.normalizeViewVolumePoint(p1), this.normalizeViewVolumePoint(p2)];
    }

    public projection(relativePoint: Vec3D): Vec2D {
        return vec2(
            this.nearDistance / relativePoint.z * relativePoint.x,
            this.nearDistance / relativePoint.z * relativePoint.y,
        );
    }
}

const POSITIVE_X = 0b100000;
const NEGATIVE_X = 0b010000;
const POSITIVE_Y = 0b001000;
const NEGATIVE_Y = 0b000100;
const POSITIVE_Z = 0b000010;
const NEGATIVE_Z = 0b000001;

const clipLine = ([p1, p2]: [Vec3D, Vec3D]): [Vec3D, Vec3D] | null => {
    const outCodes = [
        { pred: (p: Vec3D) => p.x > 1,  code: POSITIVE_X },
        { pred: (p: Vec3D) => p.x < -1, code: NEGATIVE_X },
        { pred: (p: Vec3D) => p.y > 1,  code: POSITIVE_Y },
        { pred: (p: Vec3D) => p.y < -1, code: NEGATIVE_Y },
        { pred: (p: Vec3D) => p.z > 1,  code: POSITIVE_Z },
        { pred: (p: Vec3D) => p.z < -1, code: NEGATIVE_Z },
    ];

    const getOutCode = p => outCodes.reduce((curr, {pred, code}) => pred(p) ? curr | code : curr, 0)

    for (let i = 1; i < 10; i++) {
        const out1 = getOutCode(p1);
        const out2 = getOutCode(p2);

        if ((out1 | out2) == 0) {
			return [p1, p2];
		} else if (out1 & out2) {
			return null;
		} else {
            const outcode = out1 ? out1 : out2;
            let intersection: Vec3D;
            if (outcode & POSITIVE_X) {
                console.log(`POSITIVE_X ${p1} -> ${p2}`);
                const alpha = (1 - p1.x) / (p2.x - p1.x);
                intersection = vec3(1, p1.y + alpha * (p2.y - p1.y), p1.z + alpha * (p2.z - p1.z));
            } else if (outcode & NEGATIVE_X) {
                console.log(`NEGATIVE_X ${p1} -> ${p2}`);
                const alpha = (-1 - p1.x) / (p2.x - p1.x);
                intersection = vec3(-1, p1.y + alpha * (p2.y - p1.y), p1.z + alpha * (p2.z - p1.z));
            } else if (outcode & POSITIVE_Y) {
                console.log(`POSITIVE_Y ${p1} -> ${p2}`);
                const alpha = (1 - p1.y) / (p2.y - p1.y);
                intersection = vec3(p1.x + alpha * (p2.x - p1.x), 1, p1.z + alpha * (p2.z - p1.z));
            } else if (outcode & NEGATIVE_Y) {
                console.log(`NEGATIVE_Y ${p1} -> ${p2}`);
                const alpha = (-1 - p1.y) / (p2.y - p1.y);
                intersection = vec3(p1.x + alpha * (p2.x - p1.x), -1, p1.z + alpha * (p2.z - p1.z));
            } else if (outcode & POSITIVE_Z) {
                console.log(`POSITIVE_Z ${p1} -> ${p2}`);
                const alpha = (1 - p1.z) / (p2.z - p1.z);
                intersection = vec3(p1.x + alpha * (p2.x - p1.x), p1.y + alpha * (p2.y - p1.y), 1);
            } else if (outcode & NEGATIVE_Z) {
                console.log(`NEGATIVE_Z ${p1} -> ${p2}`);
                const alpha = (-1 - p1.z) / (p2.z - p1.z);
                intersection = vec3(p1.x + alpha * (p2.x - p1.x), p1.y + alpha * (p2.y - p1.y), -1);
            } else {
                console.log(`bruh moment: ${p1} -> ${p2}`);
            }

            if (outcode == out1) {
                p1 = intersection;
            } else {
                p2 = intersection;
            }
        }
    }

    console.log(`couldn't clip ${p1} -> ${p2}`);
};

interface Shape {
    getLines(): [Vec3D, Vec3D][];
}

class Box implements Shape {
    constructor(public vertex: Vec3D, public size: Vec3D) {}

    public getLines(): [Vec3D, Vec3D][] {
        const lineIndicators = [
            [vec3(0, 0, 0), vec3(1, 0, 0)],
            [vec3(0, 0, 0), vec3(0, 1, 0)],
            [vec3(0, 0, 0), vec3(0, 0, 1)],

            [vec3(1, 0, 0), vec3(1, 1, 0)],
            [vec3(1, 0, 0), vec3(1, 0, 1)],

            [vec3(0, 1, 0), vec3(1, 1, 0)],
            [vec3(0, 1, 0), vec3(0, 1, 1)],

            [vec3(0, 0, 1), vec3(1, 0, 1)],
            [vec3(0, 0, 1), vec3(0, 1, 1)],

            [vec3(1, 1, 1), vec3(0, 1, 1)],
            [vec3(1, 1, 1), vec3(1, 0, 1)],
            [vec3(1, 1, 1), vec3(1, 1, 0)],
        ];

        const getLine = ([beginInd, endInd]: [Vec3D, Vec3D]): [Vec3D, Vec3D] => {
            return [
                this.vertex.add(beginInd.mul(this.size)),
                this.vertex.add(endInd.mul(this.size)),
            ];
        };

        return lineIndicators.map(getLine);
    }
}

class GameState {
    constructor(public camera: Camera, public shapes: Shape[]) {}

    public draw(context: CanvasRenderingContext2D) {
        context.clearRect(-context.canvas.width / 2, - context.canvas.height / 2, context.canvas.width, context.canvas.height);

        context.beginPath();
        this.shapes.forEach(shape => {
            shape.getLines().forEach(([begin, end]: [Vec3D, Vec3D]) => {
                console.log(`Drawing line: ${begin} -> ${end}`);

                const beginRel = this.camera.getRelativePoint(begin);
                const endRel = this.camera.getRelativePoint(end);

                console.log(`Relative: ${beginRel} -> ${beginRel}`);

                const normalized = this.camera.normalizeViewVolume([beginRel, endRel]);

                if (normalized == null)
                    return;

                const [beginNormalized, endNormalized] = normalized;

                console.log(`Normalized: ${beginNormalized} -> ${beginNormalized}`);

                const clipped = clipLine([beginNormalized, endNormalized]);

                if (clipped == null)
                    return;

                const [beginClipped, endClipped] = clipped;

                console.log(`Projected: ${beginClipped} -> ${endClipped}`);
                context.moveTo(beginClipped.x * context.canvas.width / 2, beginClipped.y * context.canvas.height / 2);
                context.lineTo(endClipped.x * context.canvas.width / 2, endClipped.y * context.canvas.height / 2);
            });
        });

        context.stroke();
    }
}

const canvas = <HTMLCanvasElement> document.getElementById("main");
const context = canvas.getContext("2d");
context.translate(canvas.width / 2, canvas.height / 2);
context.scale(1, -1);
// context.scale(canvas.width / 2, canvas.height / 2);

const game = new GameState(new Camera(), [new Box(vec3(-10, -10, 10), vec3(50, 50, 50))]);
// const game = new GameState(new Camera(), [{getLines: ()=>[[vec3(-10, 0, 10), vec3(10, 0, 10)]]}]);

const withRedraw = f => () => { f(); game.draw(context); }

const updateProperty = (obj: any, path: string) => {
    const pathSegments = path.split('.');
    const innerObject = pathSegments.slice(0, -1).reduce((o, prop) => o[prop], obj);
    const lastSegment = pathSegments[pathSegments.length - 1];

    return (value: any) => innerObject[lastSegment] = value;
};


const updateOnInput = (elementId: string, path: string, transform?: (x: number)=>number) => {
    const element = <HTMLInputElement> document.getElementById(elementId);
    const updateProp = updateProperty(game, path);
    const update = () => updateProp(transform ? transform(element.valueAsNumber) : element.valueAsNumber);
    update();
    element.oninput = withRedraw(update);
};


const mainGame = () => {
    updateOnInput("cameraX", "camera.position.x");
    updateOnInput("cameraY", "camera.position.y");
    updateOnInput("cameraZ", "camera.position.z");

    updateOnInput("cameraRoll", "camera.rotation.roll", deg2rad);
    updateOnInput("cameraPitch", "camera.rotation.pitch", deg2rad);
    updateOnInput("cameraYaw", "camera.rotation.yaw", deg2rad);

    updateOnInput("fov", "camera.fov");
    updateOnInput("nearDistance", "camera.nearDistance");
    updateOnInput("farDistance", "camera.farDistance");

    game.draw(context);
};

document.body.onload = mainGame;
