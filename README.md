# add-ws-handler

This adds a no-features websockets middleware handler to an app. It's
intended for use with express, but technically I guess you can use it
with anything? This module is really quite awkward and you will almost
certainly be better off with an alternative.

- [express-ws](https://github.com/HenningM/express-ws)
- [express-websocket](https://github.com/olalonde/express-websocket)

Unfortunately, express-ws didn't work for my use case (due to the way
we're setting up express, which is out of my control), and it's using
ws@3 instead of ws@5, so!

## usage

For a server,

```node
const express = require('express');
const addWebsocketHandler = require('add-ws-handler');

const app = express();
const server = app.listen(0);
addWebsocketHandler({ app, server });

app.ws(
  '/path',
  (req, ws, next) => ws.send('hi'),
  (req, ws, next) => ws.send('hello')
);
```

and from a client,

```node
const WebSocket = require('ws');
const ws = new WebSocket(`ws://localhost:${server.address().port}/path`);
ws.on('message', console.log);
```

The `addWebsocketHandler` function takes an object with two required
parameters and two optional parameters:

- `app`: (required) the object to attach the `ws` function to.
- `server`: (required) the server that will be accepting requests and in
  particular will be emitting an 'upgrade' event when the it receives
  a WebSocket request
- `prefix`: (optional) if the router or app will be mounted on a prefix, it
  should be passed in here so that we can append it to the paths that
  are registered:

        addWebsocketHandler({ app, server, prefix: '/prefix' });
        app.ws('/path', ...);

        // the above would respond to /prefix/path, not /path

- `prototype`: (optional) Express adds a bunch of stuff to the
  http.IncomingMessage prototype. To make the `req` object a little
  more familiar, you can pass a prototype and we'll set the prototype
  of the `req` object for you.

        const Express = require('express');
        addWebsocketHandler({ app, server, prototype: Express.request  });

        app.ws('/path', (req, ws, next) => {
          // req.header() is defined as in Express, even though
          // http.IncomingMessage doesn't have it on its own
        });
