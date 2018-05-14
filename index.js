const WebSocket = require('ws');
const url = require('url');
const setPrototypeOf = require('setprototypeof');

// janky next implementation https://github.com/expressjs/express/blob/351396f971280ab79faddcf9782ea50f4e88358d/lib/router/index.js#L136
const makeNext = (req, socket, rest) => (err) => {
  if (err) {
    socket.close(1001, err.message);
  }
  else {
    chain(req, socket, rest); // eslint-disable-line no-use-before-define
  }
};

// middleware handler
const chain = (req, socket, fns) => {
  try {
    const [ fn, ...rest ] = fns;

    if (!fn) {
      socket.close();
    }
    else {
      const next = makeNext(req, socket, rest);
      fn(req, socket, next);
    }
  }
  catch (err) {
    makeNext(req, socket)(err);
  }
};

const paths = {};
const registerWebsocketPath = (path, ...middleware) => {
  if (/\/:.*/.test(path)) {
    throw new Error('params in paths are not supported');
  }

  if (!middleware) {
    throw new Error('middleware is required to register a websocket handler');
  }

  paths[path] = middleware;
};

const handleWebsocketRequests = (wss, prefix, prototype) => wss.on('connection', (client, req) => {
  const parsedUrl = url.parse(req.url, true);
  const middlewareForPath = paths[parsedUrl.pathname];
  if (middlewareForPath) {
    // pretend our request has a cooler prototype, for example express
    // adds some handy getters on the prototype in this way
    if (prototype) {
      setPrototypeOf(req, prototype);
    }
    req.query = parsedUrl.query;

    chain(req, client, middlewareForPath);
  }
  else {
    client.close(1000, 'no matching websocket paths were found');
  }
});

const addHandler = ({ app, server, prefix = '/', prototype = null }) => {
  const wss = new WebSocket.Server({ server });
  handleWebsocketRequests(wss, prefix, prototype);

  // eslint-disable-next-line no-param-reassign
  app.ws = registerWebsocketPath(wss, prefix, prototype);

  return wss;
};

module.exports = addHandler;
