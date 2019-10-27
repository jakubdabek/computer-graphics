const hilbert = (width: number, spacing: number, points: number[]) => (x, y, lg, i1, i2, f) => {
    if (lg === 1) {
        const px = (width - x) * spacing;
        const py = (width - y) * spacing;
        points.push(px, py);
        return;
    }
    lg >>= 1;
    f(x + i1 * lg, y + i1 * lg, lg, i1, 1 - i2, f);
    f(x + i2 * lg, y + (1 - i2) * lg, lg, i1, i2, f);
    f(x + (1 - i1) * lg, y + (1 - i1) * lg, lg, i1, i2, f);
    f(x + (1 - i2) * lg, y + i2 * lg, lg, 1 - i1, i2, f);
    return points;
};

const drawHilbert = (order: number) => {
    if (!order || order < 1) {
        throw 'You need to give a valid positive integer';
    } else {
        order = Math.floor(order);
    }


    // Curve Constants
    const width = 2 ** order;
    const space = 10;

    // SVG Setup
    const size = 800;
    const stroke = 2;
    const col = "red";
    const fill = "transparent";

    // Prep and run function
    const f = hilbert(width, space, []);
    const points = f(0, 0, width, 0, 0, f);
    const path = points.join(' ');


    return`<svg xmlns="http://www.w3.org/2000/svg"
    width="${size}"
    height="${size}"
    viewBox="${space / 2} ${space / 2} ${width * space} ${width * space}">
        <path d="M${path}" stroke-width="${stroke}" stroke="${col}" fill="${fill}"/>
    </svg>`;
};

const main = document.getElementById("main");

const slider = <HTMLInputElement> document.getElementById("level");
slider.oninput = () => {
    const curve = drawHilbert(slider.valueAsNumber);
    // console.log(curve);
    main.innerHTML = curve;
}

onload = () => {
    const curve = drawHilbert(slider.valueAsNumber);
    // console.log(curve);
    main.innerHTML = curve;
}
