import { deg2rad } from "./render-3d.js";
import { Turtle3D } from "./turtle-3d.js";


const updateOnInput = (elementId: string, turtle: Turtle3D, path: string, transform?: (x: number)=>number) => {
    const withRedraw = f => () => { f(); turtle.replay(); }

    const element = <HTMLInputElement> document.getElementById(elementId);
    const updateProp = turtle.makePropertyUpdater(path);
    const update = () => {
        console.log(`updating ${path} (${elementId})`);
        updateProp(transform ? transform(element.valueAsNumber) : element.valueAsNumber);
    }
    update();
    element.oninput = withRedraw(update);
};

const mainTurtle = () => {
    const canvas = <HTMLCanvasElement> document.getElementById("main");

    const context = canvas.getContext("2d");

    const turtle = new Turtle3D(context);
    turtle.setLog(console.log);

    const commands = `
PENUP
FORWARD 15
ROTATE 0 0
FORWARD 15
ROTATE 0 0 90
FORWARD 15`

    const input = <HTMLInputElement> document.getElementById("input");
    input.value = commands;
    const button = <HTMLInputElement> document.getElementById("button");

    updateOnInput("cameraX", turtle, "camera.position.x");
    updateOnInput("cameraY", turtle, "camera.position.y");
    updateOnInput("cameraZ", turtle, "camera.position.z");

    updateOnInput("cameraRoll", turtle, "camera.rotation.roll", deg2rad);
    updateOnInput("cameraPitch", turtle, "camera.rotation.pitch", deg2rad);
    updateOnInput("cameraYaw", turtle, "camera.rotation.yaw", deg2rad);

    updateOnInput("nearDistance", turtle, "camera.nearDistance");
    updateOnInput("farDistance", turtle, "camera.farDistance");

    button.onclick = () => {
        turtle.reset();
        input.value.split('\n').forEach(element => {
            if (element.trim().length > 0)
            turtle.addCommandFromString(element);
        });
    }

    button.click();
}

document.body.onload = mainTurtle;
