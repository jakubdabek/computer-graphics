import { Camera, Shape, Vec3D, vec3, clipLine, Box, deg2rad, DrawingContext3D } from "./render-3d.js"
import { updateProperty, rand } from "./utils.js";

enum State { Normal, Win, Loss }

class GameState {
    private drawingContext: DrawingContext3D;

    constructor(context: CanvasRenderingContext2D, public shapes: Shape[], public winningShape: Shape) {
        this.drawingContext = new DrawingContext3D(context);

        const camera = this.drawingContext.camera;

        camera.position = vec3(0, 0, -10);
        camera.nearDistance = 1;
        camera.farDistance = 80;
    }

    private checkState(): State {
        const currentPosition = this.drawingContext.camera.position;

        const insideAny = this.shapes
            .map(s => s.isInside(currentPosition))
            .reduce((prev, curr) => prev || curr, false);

        if (insideAny)
            return State.Loss;
        
        if (this.winningShape.isInside(currentPosition))
            return State.Win;
        
        return State.Normal;
    }

    public draw() {
        switch (this.checkState()) {
        case State.Normal:
            this.drawingContext.clearScreen();
            this.shapes.forEach(shape => {
                shape.getLines().forEach((line: [Vec3D, Vec3D]) => {
                    this.drawingContext.drawLine(line);
                });
            });

            this.drawingContext.setColor("rgb(0,255,0)");
            this.winningShape.getLines().forEach((line: [Vec3D, Vec3D]) => {
                this.drawingContext.drawLine(line);
            });
            this.drawingContext.setColor("rgb(0,0,0)");
            break;
        case State.Win:
            alert("You win");
            break;
        case State.Loss:
            alert("You lose");
            break;
        }

    }

    private getForwardUnit(): Vec3D {
        const point = vec3(0, 0, 1);

        const x = point.x;
        const y = point.y;
        const z = point.z;

        const cx = Math.cos(this.drawingContext.camera.rotation.x);
        const cy = Math.cos(this.drawingContext.camera.rotation.y);
        const cz = Math.cos(this.drawingContext.camera.rotation.z);

        const sx = Math.sin(this.drawingContext.camera.rotation.x);
        const sy = Math.sin(this.drawingContext.camera.rotation.y);
        const sz = Math.sin(this.drawingContext.camera.rotation.z);

        const dx = cy * (-sz * y + cz * x) + sy * z;
        const tmp1 = cy * z - sy * (-sz * y + cz * x);
        const tmp2 = cz * y + sz * x;
        const dy = -sx * tmp1 + cx * tmp2;
        const dz = cx * tmp1 + sx * tmp2;

        return vec3(dx, dy, dz);
    }

    public forward(x: number) {
        const unit = this.getForwardUnit();

        this.drawingContext.camera.position = this.drawingContext.camera.position.add(unit.mulScalar(x));
    }

    public makePropertyUpdater(path: string): (x?: any | undefined, transform?: (x: any) => any) => void {
        return updateProperty(this.drawingContext, path);
    }
}

const canvas = <HTMLCanvasElement> document.getElementById("main");
const context = canvas.getContext("2d");

const obstaclesNum = rand(3, 10);

const obstacles: Shape[] = [];
for (let i = 0; i < obstaclesNum; i++) {
    const pos = vec3(rand(-50, 50), rand(-50, 50), rand(-50, 50));
    const size = vec3(rand(10, 50), rand(10, 50), rand(10, 50));

    obstacles.push(new Box(pos, size));
}

let winningShape: Shape;

while (true) {
    const pos = vec3(rand(-50, 50), rand(-50, 50), rand(-50, 50));
    const size = vec3(15, 15, 15);
    const other = pos.add(size);

    const points = [pos.x, pos.y, pos.z, other.x, other.y, other.z];

    const anyInObstacles = obstacles
        .map(s => s.isInside(pos) || s.isInside(other))
        .reduce((prev, curr) => prev || curr, false);
    
    if (!anyInObstacles) {
        winningShape = new Box(pos, size);
        break;
    }
}

// const game = new GameState(context, [new Box(vec3(-10, -10, 10), vec3(50, 50, 50))], new Box(vec3(-20, -20, 20), vec3(15, 15, 15)));
const game = new GameState(context, obstacles, winningShape);

const withRedraw = f => () => { f(); game.draw(); }

const updateOnInput = (elementId: string, path: string, transform?: (x: number)=>number) => {
    const element = <HTMLInputElement> document.getElementById(elementId);
    const updateProp = game.makePropertyUpdater(path);
    const update = () => updateProp(transform ? transform(element.valueAsNumber) : element.valueAsNumber);
    update();
    element.oninput = withRedraw(update);
};

const updateOnClick = (elementId: string, path: string, value: number) => {
    const element = <HTMLInputElement> document.getElementById(elementId);
    const updateProp = game.makePropertyUpdater(path);
    const update = () => updateProp(undefined, x => x + value);
    element.onclick = withRedraw(update);
};


const mainGame = () => {
    // updateOnInput("cameraX", "camera.position.x");
    // updateOnInput("cameraY", "camera.position.y");
    // updateOnInput("cameraZ", "camera.position.z");

    // updateOnInput("cameraRoll", "camera.rotation.roll", deg2rad);
    // updateOnInput("cameraPitch", "camera.rotation.pitch", deg2rad);
    // updateOnInput("cameraYaw", "camera.rotation.yaw", deg2rad);

    // updateOnInput("nearDistance", "camera.nearDistance");
    // updateOnInput("farDistance", "camera.farDistance");

    updateOnClick("btn-up", "camera.rotation.pitch", deg2rad(-10));
    updateOnClick("btn-down", "camera.rotation.pitch", deg2rad(10));
    updateOnClick("btn-left", "camera.rotation.yaw", deg2rad(-10));
    updateOnClick("btn-right", "camera.rotation.yaw", deg2rad(10));
    const fwd = <HTMLInputElement> document.getElementById("btn-forward");
    fwd.onclick = withRedraw(() => game.forward(3));

    game.draw();
};

document.body.onload = mainGame;
