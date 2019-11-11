export { updateProperty };

const updateProperty = (obj: any, path: string) => {
    const pathSegments = path.split('.');
    
    return (value?: any | undefined, transform?: (x: any) => any) => {
        const {o:innerObject, trail} = pathSegments.slice(0, -1).reduce(
            ({o, trail}, prop) => { return {o: o[prop], trail: trail.concat(o)}; },
            {o:obj, trail:[]}
        );
        const lastSegment = pathSegments[pathSegments.length - 1];
        console.log(`updating on ${trail} -> ${innerObject}`)
        if (value !== undefined)
            innerObject[lastSegment] = value;
        else if(transform)
            innerObject[lastSegment] = transform(innerObject[lastSegment]);
    }
};
