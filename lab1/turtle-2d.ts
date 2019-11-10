import { Command, Turtle } from "./turtle-common.js";

export enum CommandType2D {
    FORWARD,
    ROTATE,
    ARC,
    PENUP,
    PENDOWN,
    SETCOLOR,
}

const parseCommandType2D = (kind: string, args: string[]): { kind: CommandType2D, parsedArgs: any[] } => {
    switch (kind) {
        case "FORWARD":
            return { kind: CommandType2D.FORWARD, parsedArgs: [parseFloat(args[0])] };
        case "ROTATE":
            return { kind: CommandType2D.ROTATE, parsedArgs: [Math.PI * parseFloat(args[0]) / 180] };
        case "ARC":
            const args_: any[] = [parseFloat(args[0])]
            if (args.length > 2)
                args_.push(args[1] == "true");
            return { kind: CommandType2D.ARC, parsedArgs: args_ };
        case "PENUP":
            return { kind: CommandType2D.PENUP, parsedArgs: [] };
        case "PENDOWN":
            return { kind: CommandType2D.PENDOWN, parsedArgs: [] };
        case "SETCOLOR":
            return { kind: CommandType2D.SETCOLOR, parsedArgs: [args[0]] };
    }
};

type Command2D = Command<CommandType2D>;

export class Turtle2D extends Turtle<CommandType2D> {
    private x: number;
    private y: number;
    private angle: number;
    private isPenDown: boolean = true;

    constructor(protected context: CanvasRenderingContext2D, private clearArea: [[number, number], [number, number]]) {
        super(parseCommandType2D);
        this.reset();
    }

    protected resetImpl() {
        this.x = 0;
        this.y = 0;
        this.angle = 0;
        this.isPenDown = true;

        const [[x, y], [width, height]] = this.clearArea;
        this.log(`Clearing ${this.clearArea}`);
        this.context.clearRect(x, y, width, height);
    }

    public execute(command: Command2D) {
        switch (command.kind) {
            case CommandType2D.FORWARD:
                this.forward(command.args[0]);
                break;
            case CommandType2D.ROTATE:
                this.rotate(command.args[0]);
                break;
            case CommandType2D.ARC:
                if (command.args.length > 1)
                    this.arc(command.args[0], command.args[1]);
                else
                    this.arc(command.args[0]);
                break;
            case CommandType2D.PENUP:
                this.penup();
                break;
            case CommandType2D.PENDOWN:
                this.pendown();
                break;
            case CommandType2D.SETCOLOR:
                this.setcolor(command.args[0]);
        }
    }

    public forward(length: number) {
        this.context.beginPath();

        this.context.moveTo(this.x, this.y);
        this.log(`line starting in ${(this.x, this.y)}`);

        this.x += length * Math.cos(this.angle);
        this.y += length * Math.sin(this.angle);

        this.log(`line ending in ${(this.x, this.y)}`);

        if (this.isPenDown) {
            this.context.lineTo(this.x, this.y);
            this.context.stroke();
        }

    }

    public rotate(angle: number) {
        this.angle += angle;
    }

    public arc(length: number, clockwise?: boolean) {
        this.context.beginPath();

        this.context.moveTo(this.x, this.y);
        this.log(`arc starting in ${(this.x, this.y)}`);

        const midX = this.x + length * Math.cos(this.angle) / 2;
        const midY = this.y + length * Math.sin(this.angle) / 2;

        this.x += length * Math.cos(this.angle);
        this.y += length * Math.sin(this.angle);

        this.log(`arc ending in ${(this.x, this.y)}`);

        if (this.isPenDown) {
            this.context.arc(midX, midY, length / 2, this.angle - Math.PI, this.angle, clockwise);
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
}
