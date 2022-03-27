# js-path-router

Fast and simple path router written in modern ts for deno. Based on [http-hash](https://www.npmjs.com/package/http-hash).

## Usage

```ts
const router = Router.builder()
    .add('/foo/:bar', foobarHandler)
    .add('/*', catchallHandler)
    .build();

assertEquals(router.match('/asdf').handler, catchallHandler);
```
