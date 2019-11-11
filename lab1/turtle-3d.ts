import { Command, Turtle } from "./turtle-common.js";
import { Vec2D, Vec3D, vec3, Rotation, Camera, deg2rad, rot, DrawingContext3D } from "./render-3d.js"
import { updateProperty } from "./utils.js";

export { CommandType3D, Turtle3D };

enum CommandType3D {
    FORWARD,
    ROTATE,
    PENUP,
    PENDOWN,
    SETCOLOR,
}

const parseCommandType3D = (kind: string, args: string[]): { kind: CommandType3D, parsedArgs: any[] } => {
    switch (kind) {
        case "FORWARD":
            return { kind: CommandType3D.FORWARD, parsedArgs: [parseFloat(args[0])] };
        case "ROTATE":
            return {
                kind: CommandType3D.ROTATE,
                parsedArgs: [ rot(
                    deg2rad(parseFloat(args[0])),
                    deg2rad(parseFloat(args[1])),
                    0,
                )]
            };
        case "PENUP":
            return { kind: CommandType3D.PENUP, parsedArgs: [] };
        case "PENDOWN":
            return { kind: CommandType3D.PENDOWN, parsedArgs: [] };
        case "SETCOLOR":
            return { kind: CommandType3D.SETCOLOR, parsedArgs: [args[0]] };
    }
};


class Turtle3D extends Turtle<CommandType3D> {
    private position: Vec3D;
    private rotation: Rotation;
    private isPenDown: boolean = true;
    private drawingContext: DrawingContext3D;

    protected resetImpl() {
        this.position = Vec3D.zero;
        this.rotation = Rotation.zero;
        this.isPenDown = true;

        this.drawingContext.clearScreen();
    }

    constructor(context: CanvasRenderingContext2D) {
        super(parseCommandType3D);
        this.drawingContext = new DrawingContext3D(context);
        this.reset();
    }

    public execute(command: Command<CommandType3D>) {
        switch (command.kind) {
            case CommandType3D.FORWARD:
                this.forward(command.args[0]);
                break;
            case CommandType3D.ROTATE:
                this.rotate(command.args[0]);
                break;
            case CommandType3D.PENUP:
                this.penup();
                break;
            case CommandType3D.PENDOWN:
                this.pendown();
                break;
            case CommandType3D.SETCOLOR:
                this.setcolor(command.args[0]);
        }
    }

    public forward(length: number) {
        const start = this.position;
        const unit = this.getForwardUnit();
        this.log(`pos: ${this.position} rot: ${this.rotation} unit: ${unit}`);
        const end = start.add(unit.mulScalar(length));

        if (this.isPenDown) {
            this.drawingContext.drawLine([start, end]);
        }

        this.position = end;
    }

    private getForwardUnit(): Vec3D {
        const point = vec3(0, 0, 1);

        const x = point.x;
        const y = point.y;
        const z = point.z;

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

    public rotate(angle: Rotation) {
        this.rotation = this.rotation.add(angle);
    }

    public penup() {
        this.isPenDown = false;
    }

    public pendown() {
        this.isPenDown = true;
    }

    public setcolor(color: string) {
        this.drawingContext.setColor(color);
    }

    public makePropertyUpdater(path: string): (x:any) => void {
        return updateProperty(this.drawingContext, path);
    }

    public toString() { return "Turtle3D" }
}

