enum CommandType {
    FORWARD,
    ROTATE,
    ARC,
    PENUP,
    PENDOWN,
    SETCOLOR,
}

class Command {
    constructor(public kind: CommandType, public args: any[]) {}

    public static parse(s: string): Command {
        const parts = s.split(' ');

        console.log(`parsing ${parts}`);

        switch (parts[0]) {
            case "FORWARD":
                return new Command(CommandType.FORWARD, [parseFloat(parts[1])]);
            case "ROTATE":
                return new Command(CommandType.ROTATE, [Math.PI * parseFloat(parts[1]) / 180]);
            case "ARC":
                const args: any[] = [parseFloat(parts[1])]
                if (parts.length > 2)
                    args.push(parts[2] == "true");
                return new Command(CommandType.ARC, args);
            case "PENUP":
                return new Command(CommandType.PENUP, []);
            case "PENDOWN":
                return new Command(CommandType.PENDOWN, []);
            case "SETCOLOR":
                return new Command(CommandType.SETCOLOR, [parts[1]]);
        }
    }
}

class Turtle {
    private canvasWidth: number;
    private canvasHeight: number;
    private x: number;
    private y: number;
    private angle: number;
    private isPenDown: boolean = true;
    private context: CanvasRenderingContext2D;
    private commands: Command[];

    public reset(resetCommands: boolean = true) {
        this.x = 0;
        this.y = 0;
        this.angle = 0;
        this.isPenDown = true;

        this.context.clearRect(-this.canvasWidth / 2, -this.canvasHeight / 2, this.canvasWidth, this.canvasHeight);

        if (resetCommands)
            this.commands = [];
    }

    constructor(context: CanvasRenderingContext2D) {
        this.context = context;
        this.canvasHeight = context.canvas.height;
        this.canvasWidth = context.canvas.width;
        this.reset();
    }

    public addCommandFromString(s: string) {
        const newCommand = Command.parse(s);
        this.commands.push(newCommand);
        this.execute(newCommand);
    }

    public addCommand(kind: CommandType, ...args: any[]) {
        const newCommand = new Command(kind, args);
        this.commands.push(newCommand);
        this.execute(newCommand);
    }

    public execute(command: Command) {
        switch (command.kind) {
            case CommandType.FORWARD:
                this.forward(command.args[0]);
                break;
            case CommandType.ROTATE:
                this.rotate(command.args[0]);
                break;
            case CommandType.ARC:
                if (command.args.length > 1)
                    this.arc(command.args[0], command.args[1]);
                else
                    this.arc(command.args[0]);
                break;
            case CommandType.PENUP:
                this.penup();
                break;
            case CommandType.PENDOWN:
                this.pendown();
                break;
            case CommandType.SETCOLOR:
                this.setcolor(command.args[0]);
        }
    }

    private realCoordinates(x: number, y: number): [number, number] {
        // return [x + this.canvasWidth / 2, -y + this.canvasHeight / 2];
        return [x, y];
    }

    public forward(length: number) {
        this.context.beginPath();

        const realStart = this.realCoordinates(this.x, this.y);
        this.context.moveTo(...realStart);
        console.log(`line starting in ${realStart}`);

        this.x += length * Math.cos(this.angle);
        this.y += length * Math.sin(this.angle);
        
        const realEnd = this.realCoordinates(this.x, this.y);
        console.log(`line ending in ${realEnd}`);
        
        if (this.isPenDown) {
            this.context.lineTo(...realEnd);
            this.context.stroke();
        }
        
    }

    public rotate(angle: number) {
        this.angle += angle;
    }

    public arc(length: number, clockwise?: boolean) {
        this.context.beginPath();

        const realStart = this.realCoordinates(this.x, this.y);
        this.context.moveTo(...realStart);
        console.log(`arc starting in ${realStart}`);

        const midX = this.x + length * Math.cos(this.angle) / 2;
        const midY = this.y + length * Math.sin(this.angle) / 2;

        const mid = this.realCoordinates(midX, midY);

        this.x += length * Math.cos(this.angle);
        this.y += length * Math.sin(this.angle);

        const realEnd = this.realCoordinates(this.x, this.y);
        console.log(`arc ending in ${realEnd}`);

        if (this.isPenDown) {
            // @ts-ignore buggy spread operator
            this.context.arc(...mid, length / 2, this.angle - Math.PI, this.angle, clockwise);
            this.context.stroke();
        }
    }

    public penup() {
        this.isPenDown = false;
    }

    public pendown() {
        this.isPenDown = true;
    }

    public setcolor(color: string) {
        this.context.strokeStyle = color;
    }

    public replay() {
        this.reset(false);
        
        this.commands.forEach(command => {
            this.execute(command);
        });
    }
}

const canvas = <HTMLCanvasElement> document.getElementById("main");

const context = canvas.getContext("2d");
context.translate(canvas.width / 2, canvas.height / 2);
context.scale(1, -1);

// const iters = 20;
// const oneWidth = canvas.width / (iters + 1);
// const oneHeight = canvas.height / (iters + 1);

// for (let i = 0; i < iters; i++) {
//     context.fillStyle = `hsl(${360 / iters * i}, 100%, 50%)`;
//     context.fillRect(oneWidth * i, oneHeight * i, (canvas.width - oneWidth * i * 2) , (canvas.height - oneHeight * i * 2) );
// }


const turtle = new Turtle(context);

const commands = 
`
PENUP
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

// onload = () => {
//     commands.split('\n').forEach(element => {
//         if (element.trim().length > 0)
//             turtle.addCommandFromString(element);
//     });
// }
