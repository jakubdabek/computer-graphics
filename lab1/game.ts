import { Camera, Shape, Vec3D, vec3, clipLine, Box, deg2rad, DrawingContext3D } from "./render-3d.js"
import { updateProperty } from "./utils.js";

class GameState {
    private drawingContext: DrawingContext3D;

    constructor(context: CanvasRenderingContext2D, public shapes: Shape[]) {
        this.drawingContext = new DrawingContext3D(context);
    }

    public draw() {
        this.drawingContext.clearScreen();
        this.shapes.forEach(shape => {
            shape.getLines().forEach((line: [Vec3D, Vec3D]) => {
                this.drawingContext.drawLine(line);
            });
        });
    }

    public makePropertyUpdater(path: string): (x:any) => void {
        return updateProperty(this.drawingContext, path);
    }
}

const canvas = <HTMLCanvasElement> document.getElementById("main");
const context = canvas.getContext("2d");

// context.scale(canvas.width / 2, canvas.height / 2);

const game = new GameState(context, [new Box(vec3(-10, -10, 10), vec3(50, 50, 50))]);
// const game = new GameState(new Camera(), [{getLines: ()=>[[vec3(-10, 0, 10), vec3(10, 0, 10)]]}]);

const withRedraw = f => () => { f(); game.draw(); }

const updateOnInput = (elementId: string, path: string, transform?: (x: number)=>number) => {
    const element = <HTMLInputElement> document.getElementById(elementId);
    const updateProp = game.makePropertyUpdater(path);
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

    updateOnInput("nearDistance", "camera.nearDistance");
    updateOnInput("farDistance", "camera.farDistance");

    game.draw();
};

document.body.onload = mainGame;
