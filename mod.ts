class Node<T> {
    public handler?: T;
    public staticPaths: Record<string, Node<T>> = {};
    public variablePaths?: Node<T>;

    constructor(
        public parent?: Node<T> | undefined,
        public segment?: string | undefined,
        public isTrailer?: boolean | undefined,
    ) {}
}

export interface Builder<T> {
    add(path: string, handler: T): Builder<T>;
    build(): Router<T>;
}

export interface Result<T> {
    handler: T | undefined;
    trailer: string | undefined;
    params: Record<string, string>;
}

export default class Router<T = any> {
    public static builder<T>(): Builder<T> {
        const root = new Node<T>();
        return {
            add(path: string, handler: T): Builder<T> {
                set(root, path, handler);
                return this;
            },
            build(): Router<T> {
                return new Router(root);
            },
        };
    }

    #root: Node<T>;

    private constructor(root: Node<T>) {
        this.#root = root;
    }

    public match(path: string): Result<T> {
        const pathSegments = path.split('/');

        let params: Record<string, string> = {};
        let variablePaths: Node<T> | undefined;
        let trailer: string | undefined;
        
        let node: Node<T> | undefined = this.#root;
        let savedTrailerNode: [string, Node<T>] | undefined;
        for (let i = 0; i < pathSegments.length; i++) {
            const segment = pathSegments[i];
            if (!segment && !node.isTrailer) {
                continue;
            }

            if (node.variablePaths?.isTrailer) {
                savedTrailerNode = [pathSegments.slice(i).join('/'), node.variablePaths];
            }

            if (segment in node.staticPaths) {
                node = node.staticPaths[segment];
            } else if ((variablePaths = node.variablePaths)) {
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
    
        // Match the empty trailer
        if (
            !node?.handler &&
            node?.variablePaths?.isTrailer
        ) {
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
            params,
        };
    }
}

function set<T>(node: Node<T>, pathname: string, handler: T): void {
    const pathSegments = pathname.split('/');
    const lastIndex = pathSegments.length - 1;
    const trailerIndex = pathname[pathname.length - 1] === '*' ? pathname.length - 1 : -1;
    const hasTrailer = trailerIndex >= 0;

    for (let i = 0; i < pathSegments.length; i++) {
        let segment = pathSegments[i];
        if (!segment) {
            continue;
        }

        if (hasTrailer && i === lastIndex) {
            node = (
                node.variablePaths ||
                (node.variablePaths = new Node(node, segment, true))
            );

            if (!node.isTrailer) {
                throw new Error('route conflict');
            }
        } else if (segment.indexOf(':') === 0) {
            segment = segment.slice(1);
            node = (
                node.variablePaths ||
                (node.variablePaths = new Node(node, segment))
            );

            if (node.segment !== segment || node.isTrailer) {
                throw new Error('route conflict');
            }
        } else {
            node = (
                node.staticPaths[segment] ||
                (node.staticPaths[segment] = new Node(node, segment))
            );
        }
    }

    if (!node.handler) {
        node.handler = handler;
    } else {
        throw new Error('route conflict');
    }
}
