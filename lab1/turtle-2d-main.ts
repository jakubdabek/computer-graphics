import { Turtle2D } from "./turtle-2d.js"

const mainTurtle = () => {
    const canvas = <HTMLCanvasElement> document.getElementById("main");

    const context = canvas.getContext("2d");
    context.translate(canvas.width / 2, canvas.height / 2);
    context.scale(1, -1);

    const turtle = new Turtle2D(context, [[-canvas.width / 2, -canvas.height / 2], [canvas.width, canvas.height]]);

    const commands =
    `PENUP
ROTATE 135
FORWARD 300
ROTATE -135

PENDOWN
FORWARD 100
ROTATE 60
FORWARD 100
ROTATE 60
FORWARD 100
ROTATE 60
FORWARD 100
ROTATE 60
FORWARD 100
ROTATE 60
FORWARD 100

PENUP
FORWARD 100

SETCOLOR rgb(255,0,0)
PENDOWN
FORWARD 100
ROTATE -120
FORWARD 100
ROTATE -120
FORWARD 100
ROTATE -60

PENUP
FORWARD 200

SETCOLOR rgb(0,255,0)
PENDOWN
ROTATE 60
FORWARD 100
ROTATE 72
FORWARD 100
ROTATE 72
FORWARD 100
ROTATE 72
FORWARD 100
ROTATE 72
FORWARD 100

PENUP
FORWARD 150

SETCOLOR rgb(255,0,128)
PENDOWN
ARC 150
ROTATE 180
ARC 150
ROTATE 180
ARC 75 false
ARC 75 true
    `;

    const input = <HTMLInputElement> document.getElementById("input");
    input.value = commands;
    const button = <HTMLInputElement> document.getElementById("button");

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
