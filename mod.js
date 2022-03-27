// deno-fmt-ignore-file
// deno-lint-ignore-file
// This code was bundled using `deno bundle` and it's not recommended to edit it manually

class Node {
    parent;
    segment;
    isTrailer;
    handler;
    staticPaths = {};
    variablePaths;
    constructor(parent, segment, isTrailer){
        this.parent = parent;
        this.segment = segment;
        this.isTrailer = isTrailer;
    }
}
class Router {
    static builder() {
        const root = new Node();
        return {
            add (path, handler) {
                set(root, path, handler);
                return this;
            },
            build () {
                return new Router(root);
            }
        };
    }
    #root;
    constructor(root){
        this.#root = root;
    }
    match(path) {
        const pathSegments = path.split('/');
        let params = {};
        let variablePaths;
        let trailer;
        let node = this.#root;
        let savedTrailerNode;
        for(let i = 0; i < pathSegments.length; i++){
            const segment = pathSegments[i];
            if (!segment && !node.isTrailer) {
                continue;
            }
            if (node.variablePaths?.isTrailer) {
                savedTrailerNode = [
                    pathSegments.slice(i).join('/'),
                    node.variablePaths
                ];
            }
            if (segment in node.staticPaths) {
                node = node.staticPaths[segment];
            } else if (variablePaths = node.variablePaths) {
                if (variablePaths.isTrailer) {
                    trailer = pathSegments.slice(i).join('/');
                    node = variablePaths;
                    break;
                }
                if (variablePaths.segment) {
                    params[variablePaths.segment] = segment;
                }
                node = variablePaths;
            } else {
                node = undefined;
                break;
            }
        }
        if (!node?.handler && node?.variablePaths?.isTrailer) {
            trailer = '';
            node = node.variablePaths;
        }
        if (!node?.handler) {
            params = {};
            if (savedTrailerNode) {
                [trailer, node] = savedTrailerNode;
            }
        }
        return {
            handler: node?.handler,
            trailer,
            params
        };
    }
}
export { Router as default };
function set(node, pathname, handler) {
    const pathSegments = pathname.split('/');
    const lastIndex = pathSegments.length - 1;
    const trailerIndex = pathname[pathname.length - 1] === '*' ? pathname.length - 1 : -1;
    const hasTrailer = trailerIndex >= 0;
    for(let i = 0; i < pathSegments.length; i++){
        let segment = pathSegments[i];
        if (!segment) {
            continue;
        }
        if (hasTrailer && i === lastIndex) {
            node = node.variablePaths || (node.variablePaths = new Node(node, segment, true));
            if (!node.isTrailer) {
                throw new Error('route conflict');
            }
        } else if (segment.indexOf(':') === 0) {
            segment = segment.slice(1);
            node = node.variablePaths || (node.variablePaths = new Node(node, segment));
            if (node.segment !== segment || node.isTrailer) {
                throw new Error('route conflict');
            }
        } else {
            node = node.staticPaths[segment] || (node.staticPaths[segment] = new Node(node, segment));
        }
    }
    if (!node.handler) {
        node.handler = handler;
    } else {
        throw new Error('route conflict');
    }
}

