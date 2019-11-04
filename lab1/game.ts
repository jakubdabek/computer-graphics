class Vec2D {
    constructor(public x: number, public y: number) {}

    public add(other: Vec2D): Vec2D { return vec2(this.x + other.x, this.y + other.y); }
    public mul(other: Vec2D): Vec2D { return vec2(this.x * other.x, this.y * other.y); }

    public toString() { return `(${this.x}, ${this.y})`}
    
    static readonly zero = new Vec2D(0, 0);
}

const vec2 = (x: number, y: number) => new Vec2D(x, y);

class Vec3D {
    constructor(public x: number, public y: number, public z: number) {}
    
    public add(other: Vec3D): Vec3D { return vec3(this.x + other.x, this.y + other.y, this.z + other.z); }
    public mul(other: Vec3D): Vec3D { return vec3(this.x * other.x, this.y * other.y, this.z * other.z); }
    public toString() { return `(${this.x}, ${this.y}, ${this.z})`}
    
    static readonly zero = new Vec3D(0, 0, 0);
}

const vec3 = (x: number, y: number, z: number) => new Vec3D(x, y, z);

class Rotation {
    constructor(public roll: number, public pitch: number, public yaw: number) {}
    public get x() { return this.roll; }
    public get y() { return this.pitch; }
    public get z() { return this.yaw; }
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

    public normalizeViewVolume(relativePoint: Vec3D): Vec3D {
        return null;
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
                this.vertex.add(beginInd.mul(this.size)),
                this.vertex.add(endInd.mul(this.size)),
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

const game = new GameState(new Camera(), [new Box(vec3(10, 10, 10), vec3(50, 50, 50))]);

const withRedraw = f => () => { f(); game.draw(context); }

const updateProperty = (obj: any, path: string) => {
    const pathSegments = path.split('.');
    const innerObject = pathSegments.slice(0, -1).reduce((o, prop) => o[prop], obj);
    const lastSegment = pathSegments[pathSegments.length - 1];

    return (value: any) => innerObject[lastSegment] = value;
};


const updateOnInput = (elementId: string, path: string) => {
    const element = <HTMLInputElement> document.getElementById(elementId);
    const updateProp = updateProperty(game, path);
    const update = () => updateProp(element.valueAsNumber);
    update();
    element.oninput = withRedraw(update);
};


const mainGame = () => {
    updateOnInput("cameraX", "camera.position.x");
    updateOnInput("cameraY", "camera.position.y");
    updateOnInput("cameraZ", "camera.position.z");
    
    updateOnInput("cameraRoll", "camera.rotation.roll");
    updateOnInput("cameraPitch", "camera.rotation.pitch");
    updateOnInput("cameraYaw", "camera.rotation.yaw");
    
    updateOnInput("fov", "camera.fov");
    updateOnInput("nearDistance", "camera.nearDistance");
    updateOnInput("farDistance", "camera.farDistance");

    game.draw(context);
};

document.body.onload = mainGame;
