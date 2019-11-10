import { Camera, Shape, Vec3D, vec3, clipLine, Box, deg2rad } from "./render-3d.js"

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
