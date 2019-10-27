const mainHilbert = () => {
    const canvas = <HTMLCanvasElement> document.getElementById("main");

    const context = canvas.getContext("2d");

    const turtle = new Turtle(context, [[-10, -10], [canvas.width, canvas.height]]);
    context.translate(10, canvas.height - 10);
    context.scale(1, -1);

    const hilbert_curve = (turtle: Turtle, A: number, parity: number, n: number) => {
        if (n < 1)
            return;

        /*turtle.left(parity * 90)
    hilbert_curve(turtle, A, - parity, n - 1)
    turtle.forward(A)
    turtle.right(parity * 90)
    hilbert_curve(turtle, A, parity, n - 1)
    turtle.forward(A)
    hilbert_curve(turtle, A, parity, n - 1)
    turtle.right(parity * 90)
    turtle.forward(A)
    hilbert_curve(turtle, A, - parity, n - 1)
    turtle.left(parity * 90)*/

        turtle.addCommand(CommandType.ROTATE, parity * Math.PI / 2);
        hilbert_curve(turtle, A, -parity, n - 1);
        turtle.addCommand(CommandType.FORWARD, A);
        turtle.addCommand(CommandType.ROTATE, -parity * Math.PI / 2);
        hilbert_curve(turtle, A, parity, n - 1);
        turtle.addCommand(CommandType.FORWARD, A);
        hilbert_curve(turtle, A, parity, n - 1)
        turtle.addCommand(CommandType.ROTATE, -parity * Math.PI / 2);
        turtle.addCommand(CommandType.FORWARD, A);
        hilbert_curve(turtle, A, -parity, n - 1)
        turtle.addCommand(CommandType.ROTATE, parity * Math.PI / 2);
    }


    const slider = <HTMLInputElement> document.getElementById("level");
    slider.oninput = () => {
        turtle.reset();
        hilbert_curve(turtle, (canvas.width - 20) / 2 ** slider.valueAsNumber, 1, slider.valueAsNumber);
        // console.log(curve);
    }

    onload = () => {
        turtle.reset();
        hilbert_curve(turtle, (canvas.width - 20) / 2 ** slider.valueAsNumber, 1, slider.valueAsNumber);
    }
}
