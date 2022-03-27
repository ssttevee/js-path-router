import { assertEquals } from 'https://deno.land/std@0.132.0/testing/asserts.ts';

import Router from './mod.ts'


const root = Symbol('root');
const tail = Symbol('tail');
const foo = Symbol('foo');
const bar = Symbol('bar');
const baz = Symbol('baz');

function assertMatch(router: Router, path: string, handler?: any, params: Record<string, string> = {}, trailer?: string) {
    assertEquals(router.match(path), { handler, params, trailer });
}
 
Deno.test('router', async (t) => {
    await t.step('matching root', () => {
        const router = Router.builder().add('/', foo).build();

        assertMatch(router, '/', foo);
    });

    await t.step('matching fixed route', () => {
        const router = Router.builder().add('/test', foo).build();

        assertMatch(router, '/test', foo);
    });

    await t.step('matching variable route', () => {
        const router = Router.builder().add('/:test', foo).build();

        assertMatch(router, '/hello', foo, { test: 'hello' });
    });

    await t.step('matching undefined root', () => {
        const router = Router.builder().build();

        assertMatch(router, '/');
        assertMatch(router, '/test');
    });

    await t.step('matching undefined static', () => {
        const router = Router.builder().build();

        assertMatch(router, '/foo/bar/baz');
        assertMatch(router, '/hello/world');
    });

    await t.step('matching undefined variable', () => {
        const router = Router.builder().add('/foo/:bar/baz', foo).build();

        assertMatch(router, '/foo/bar/');
        assertMatch(router, '/foo/bar/hello');
    });

    await t.step('matching undefined variable', () => {
        const router = Router.builder().add('/foo/:bar/baz', foo).build();

        assertMatch(router, '/foo/bar/');
        assertMatch(router, '/foo/bar/hello');
    });

    await t.step('matching root tail with param route', () => {
        const router = Router.builder().add('/foo/:bar/baz', foo).add('/*', bar).build();

        assertMatch(router, '/foo/bar', bar, {}, 'foo/bar');
    });

    await t.step('matching empty tail', () => {
        const router = Router.builder().add('/*', foo).build();

        assertMatch(router, '/', foo, {}, '');
    });

    await t.step('conflicting root', () => {
        const builder = Router.builder().add('/', foo);

        let error: any;
        try {
            builder.add('/', bar);
        } catch (err) {
            error = err;
        }

        assertEquals(error?.message, 'route conflict');
    });

    await t.step('conflicting static route', () => {
        const builder = Router.builder().add('/test', foo);

        let error: any;
        try {
            builder.add('/test', bar);
        } catch (err) {
            error = err;
        }

        assertEquals(error?.message, 'route conflict');
    });

    await t.step('conflicting variable route', () => {
        const builder = Router.builder().add('/:test', foo);

        let error: any;
        try {
            builder.add('/:test', bar);
        } catch (err) {
            error = err;
        }

        assertEquals(error?.message, 'route conflict');
    });

    await t.step('conflicting tail route', () => {
        const builder = Router.builder().add('/*', foo);

        let error: any;
        try {
            builder.add('/*', bar);
        } catch (err) {
            error = err;
        }

        assertEquals(error?.message, 'route conflict');
    });

    await t.step('conflicting tail route after variable route', () => {
        const builder = Router.builder().add('/:foo', foo);

        let error: any;
        try {
            builder.add('/*', bar);
        } catch (err) {
            error = err;
        }

        assertEquals(error?.message, 'route conflict');
    });

    await t.step('conflicting variable route after tail route', () => {
        const builder = Router.builder().add('/*', foo);

        let error: any;
        try {
            builder.add('/:foo', bar);
        } catch (err) {
            error = err;
        }

        assertEquals(error?.message, 'route conflict');
    });

    await t.step('adding parent route after sub route', () => {
        const router = Router.builder().add('/foo/bar', bar).add('/foo', foo).build();

        assertMatch(router, '/foo/bar', bar);
        assertMatch(router, '/foo', foo);
    });

    await t.step('deep route with tail', () => {
        const router = Router.builder().add('/a/:varA/b/:varB/c/*', foo).build();

        assertMatch(router, '/a/1/b/2/c/3/4/5', foo, { varA: '1', varB: '2' }, '3/4/5');
    });

    await t.step('no leading slash', () => {
        const router = Router.builder().add('test', foo).build();

        assertMatch(router, '/test', foo);
    });

    const router = Router.builder()
        .add('/', root)
        .add('/foo', foo)
        .add('/foo/bar', bar)
        .add('/foo/:bar/baz', baz)
        .add('/*', tail)
        .build();

    assertMatch(router, '/', root);
    assertMatch(router, '/foo', foo);
    assertMatch(router, '/foo/bar', bar);
    assertMatch(router, '/foo/hello/baz', baz, { bar: 'hello' });
    assertMatch(router, '/foo/hello', tail, {}, 'foo/hello');
});
