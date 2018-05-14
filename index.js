const WebSocket = require('ws');
const url = require('url');
const setPrototypeOf = require('setprototypeof');

// janky next implementation https://github.com/expressjs/express/blob/351396f971280ab79faddcf9782ea50f4e88358d/lib/router/index.js#L136
const makeNext = (req, ws, rest) => (err) => {
  if (err) {
    ws.close(1001, err.message);
  }
  else {
    chain(req, ws, rest); // eslint-disable-line no-use-before-define
  }
};

// middleware handler
const chain = (req, ws, fns) => {
  try {
    const [ fn, ...rest ] = fns;

    if (!fn) {
      ws.close();
    }
    else {
      const next = makeNext(req, ws, rest);
      fn(req, ws, next);
    }
  }
  catch (err) {
    makeNext(req, ws)(err);
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

const handleWebsocketRequests = (wss, prefix, prototype) => wss.on('connection', (ws, req) => {
  const parsedUrl = url.parse(req.url, true);
  const middlewareForPath = paths[parsedUrl.pathname.replace(prefix, '')];
  if (middlewareForPath) {
    // pretend our request has a cooler prototype, for example express
    // adds some handy getters on the prototype in this way
    if (prototype) {
      setPrototypeOf(req, prototype);
    }
    req.query = parsedUrl.query;

    chain(req, ws, middlewareForPath);
  }
  else {
    ws.close(1000, 'no matching websocket paths were found');
  }
});

const addHandler = ({ app, server, prefix = '', prototype = null }) => {
  const wss = new WebSocket.Server({ server });
  handleWebsocketRequests(wss, new RegExp(`^${prefix}`), prototype);

  app.wss = wss; // eslint-disable-line no-param-reassign
  app.ws = registerWebsocketPath; // eslint-disable-line no-param-reassign

  return wss;
};

module.exports = addHandler;
