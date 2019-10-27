type Vec2D = [number, number];
type Vec3D = [number, number, number];
type Rotation = [number, number, number];

const addVec2D = ([x1, y1]: Vec2D, [x2, y2]: Vec2D): Vec2D => {
    return [x1 + x2, y1 + y2];
}

const mulVec2D = ([x1, y1]: Vec2D, [x2, y2]: Vec2D): Vec2D => {
    return [x1 * x2, y1 * y2];
}

const addVec3D = ([x1, y1, z1]: Vec3D, [x2, y2, z2]: Vec3D): Vec3D => {
    return [x1 + x2, y1 + y2, z1 + z2];
}

const mulVec3D = ([x1, y1, z1]: Vec3D, [x2, y2, z2]: Vec3D): Vec3D => {
    return [x1 * x2, y1 * y2, z1 * z2];
}


class Camera {
    constructor(public position: Vec3D, public rotation: Rotation, public screenDistance: number) {}

    public getRelativePoint(point: Vec3D): Vec3D {
        const x = point[0] - this.position[0];
        const y = point[1] - this.position[1];
        const z = point[2] - this.position[2];

        const cx = Math.cos(this.rotation[0]);
        const cy = Math.cos(this.rotation[1]);
        const cz = Math.cos(this.rotation[2]);

        const sx = Math.sin(this.rotation[0]);
        const sy = Math.sin(this.rotation[1]);
        const sz = Math.sin(this.rotation[2]);

        const dx = cy * (sz * y + cz * x) - sy * z;
        const tmp1 = cy * z + sy * (sz * y + cz * x);
        const tmp2 = cz * y - sz * x;
        const dy = sx * tmp1 + cx * tmp2;
        const dz = cx * tmp1 - sx * tmp2;

        return [dx, dy, dz];
    }

    public projection(relativePoint: Vec3D): Vec2D {
        return [
            this.screenDistance / relativePoint[2] * relativePoint[0],
            this.screenDistance / relativePoint[2] * relativePoint[1],
        ];
    }
}

class Box {
    constructor(public vertex: Vec3D, public size: Vec3D) {}

    public getLines(): [Vec3D, Vec3D][] {
        const lineIndicators = [
            [[0, 0, 0], [1, 0, 0]],
            [[0, 0, 0], [0, 1, 0]],
            [[0, 0, 0], [0, 0, 1]],

            [[1, 0, 0], [1, 1, 0]],
            [[1, 0, 0], [1, 0, 1]],

            [[0, 1, 0], [1, 1, 0]],
            [[0, 1, 0], [0, 1, 1]],

            [[0, 0, 1], [1, 0, 1]],
            [[0, 0, 1], [0, 1, 1]],

            [[1, 1, 1], [0, 1, 1]],
            [[1, 1, 1], [1, 0, 1]],
            [[1, 1, 1], [1, 1, 0]],
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
                context.moveTo(...beginProjected);
                context.lineTo(...endProjected);
            });
        });

        context.stroke();
    }
}

const canvas = <HTMLCanvasElement> document.getElementById("main");
const context = canvas.getContext("2d");
context.translate(canvas.width / 2, canvas.height / 2);
context.scale(1, -1);

const game = new GameState(new Camera([0, 0, 0], [0, 0, 0], 10), [new Box([10, 10, 10], [50, 50, 50])]);

const withRedraw = f => () => { f(); game.draw(context); }

const cameraX = <HTMLInputElement> document.getElementById("cameraX");
cameraX.oninput = withRedraw(() => game.camera.position[0] = cameraX.valueAsNumber);
const cameraY = <HTMLInputElement> document.getElementById("cameraY");
cameraY.oninput = withRedraw(() => game.camera.position[1] = cameraY.valueAsNumber);
const cameraZ = <HTMLInputElement> document.getElementById("cameraZ");
cameraZ.oninput = withRedraw(() => game.camera.position[2] = cameraZ.valueAsNumber);

const mainGame = () => {
    game.draw(context);
};
