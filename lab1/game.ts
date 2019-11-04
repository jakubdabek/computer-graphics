class Vec2D { constructor(public x: number, public y: number) {} }
class Vec3D { constructor(public x: number, public y: number, public z: number) {} }
class Rotation {
    constructor(public roll: number, public pitch: number, public yaw: number) {}
    get x() { return this.roll; }
    get y() { return this.pitch; }
    get z() { return this.yaw; }
}

// type Vec2D = [number, number];
// type Vec3D = [number, number, number];
// type Rotation = [number, number, number];

const vec2 = (x: number, y: number) => new Vec2D(x, y);
const vec3 = (x: number, y: number, z: number) => new Vec3D(x, y, z);

const addVec2D = ({x: x1, y: y1}: Vec2D, {x: x2, y: y2}: Vec2D): Vec2D =>
    vec2(x1 + x2, y1 + y2);

const mulVec2D = ({x: x1, y: y1}: Vec2D, {x: x2, y: y2}: Vec2D): Vec2D =>
    vec2(x1 * x2, y1 * y2);

const addVec3D = ({x: x1, y: y1, z: z1}: Vec3D, {x: x2, y: y2, z: z2}: Vec3D): Vec3D =>
    vec3(x1 + x2, y1 + y2, z1 + z2);

const mulVec3D = ({x: x1, y: y1, z: z1}: Vec3D, {x: x2, y: y2, z: z2}: Vec3D): Vec3D =>
    vec3(x1 * x2, y1 * y2, z1 * z2);


class Camera {
    constructor(
        public position: Vec3D,
        public rotation: Rotation,
        public nearDistance: number,
        public farDistance: number,
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

    public projection(relativePoint: Vec3D): Vec2D {
        return vec2(
            this.nearDistance / relativePoint.z * relativePoint.x,
            this.nearDistance / relativePoint.z * relativePoint.y,
        );
    }
}

class Box {
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
                addVec3D(this.vertex, mulVec3D(beginInd, this.size)),
                addVec3D(this.vertex, mulVec3D(endInd, this.size)),
            ];
        };

        return lineIndicators.map(getLine);
    }
}

class GameState {
    constructor(public camera: Camera, public boxes: Box[]) {}

    public draw(context: CanvasRenderingContext2D) {
        context.clearRect(-context.canvas.width / 2, - context.canvas.height / 2, context.canvas.width, context.canvas.height);

        context.beginPath();
        this.boxes.forEach(box => {
            box.getLines().forEach(([begin, end]: [Vec3D, Vec3D]) => {
                console.log(`Drawing line: ${begin} -> ${end}`);
                const beginProjected = this.camera.projection(this.camera.getRelativePoint(begin));
                const endProjected = this.camera.projection(this.camera.getRelativePoint(end));
                console.log(`Projected: ${beginProjected} -> ${endProjected}`);
                context.moveTo(beginProjected.x, beginProjected.y);
                context.lineTo(endProjected.x, endProjected.y);
            });
        });

        context.stroke();
    }
}

const canvas = <HTMLCanvasElement> document.getElementById("main");
const context = canvas.getContext("2d");
context.translate(canvas.width / 2, canvas.height / 2);
context.scale(1, -1);

const game = new GameState(new Camera(vec3(0, 0, 0), new Rotation(0, 0, 0), 1, 30), [new Box(vec3(10, 10, 10), vec3(50, 50, 50))]);

const withRedraw = f => () => { f(); game.draw(context); }

const cameraX = <HTMLInputElement> document.getElementById("cameraX");
cameraX.oninput = withRedraw(() => game.camera.position.x = cameraX.valueAsNumber);
const cameraY = <HTMLInputElement> document.getElementById("cameraY");
cameraY.oninput = withRedraw(() => game.camera.position.y = cameraY.valueAsNumber);
const cameraZ = <HTMLInputElement> document.getElementById("cameraZ");
cameraZ.oninput = withRedraw(() => game.camera.position.z = cameraZ.valueAsNumber);

const mainGame = () => {
    game.draw(context);
};

document.body.onload = mainGame;
