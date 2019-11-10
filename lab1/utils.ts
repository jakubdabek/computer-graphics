export { updateProperty };

const updateProperty = (obj: any, path: string) => {
    const pathSegments = path.split('.');
    const {o:innerObject, trail} = pathSegments.slice(0, -1).reduce(
        ({o, trail}, prop) => { return {o: o[prop], trail: trail.concat(o)}; },
        {o:obj, trail:[]}
    );
    const lastSegment = pathSegments[pathSegments.length - 1];

    return (value: any) => {
        console.log(`updating on ${trail} -> ${innerObject}`)
        innerObject[lastSegment] = value;
    }
};
