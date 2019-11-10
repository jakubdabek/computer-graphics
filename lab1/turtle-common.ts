export { Command };

class Command<TCommandType> {
    constructor(public kind: TCommandType, public args: any[]) {}

    public static parse<TCommandType>(parse_: (kind: string, args: string[]) => TCommandType, s: string): TCommandType {
        const parts = s.trim().split(' ').map(s => s.trim());

        return parse_(parts[0], parts.slice(1));
    }
}

type TParseCommand<TCommandType> = (kind: string, args: string[]) => { kind: TCommandType, parsedArgs: any[] };

export abstract class Turtle<TCommandType> {
    private commands: Command<TCommandType>[];
    protected log = (...args) => {};

    public setLog(log: (...args: any[]) => void) { this.log = log; }

    protected abstract resetImpl(): void;

    public reset(resetCommands: boolean = true) {
        this.resetImpl();

        if (resetCommands)
            this.commands = [];
    }

    constructor(private parseCommand: TParseCommand<TCommandType>) {}

    public addCommandFromString(s: string) {
        const { kind, parsedArgs } = Command.parse(this.parseCommand, s);
        const newCommand = new Command(kind, parsedArgs);
        this.commands.push(newCommand);
        this.execute(newCommand);
    }

    public addCommand(kind: TCommandType, ...args: any[]) {
        const newCommand = new Command(kind, args);
        this.commands.push(newCommand);
        this.execute(newCommand);
    }

    public abstract execute(command: Command<TCommandType>);

    public replay() {
        this.reset(false);

        this.commands.forEach(command => {
            this.execute(command);
        });
    }
}
