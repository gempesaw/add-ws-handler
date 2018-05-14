const express = require('express');
const { expect } = require('chai');
const addWebsocketHandler = require('..');
const WebSocket = require('ws');

describe('websocket handler', () => {
  let app;
  let server;
  let address;

  before(async () => {
    app = express();
    server = await new Promise((resolve, reject) => {
      const s = app.listen(0, () => resolve(s));
    });
    address = `localhost:${server.address().port}`;

    addWebsocketHandler({ app, server });
  });

  it('should accept websocket requests', async () => {
    let called = 0;
    app.ws('/test', (_ , ws) => ws.send(++called));

    const ws = new WebSocket(`ws://${address}/test`);
    const message = await new Promise((resolve, reject) => ws.on('message', resolve));
    ws.close();

    expect(message).to.equal('1');
  });

  it('should register multiple routes ', async () => {
    app.ws('/something-else', (_ , ws) => ws.send('expected'));

    const ws = new WebSocket(`ws://${address}/something-else`);
    const message = await new Promise((resolve, reject) => ws.on('message', resolve));
    ws.close();

    expect(message).to.equal('expected');
  });

  it('should call all middleware in the chain', async () => {
    let first = 0;
    let second = 0;
    app.ws(
      '/middlewares',
      (req, ws, next) => {
        first++;
        next();
      },
      (req, ws, next) => {
        second++;
        next();
      },
      (req, ws, next) => ws.send(JSON.stringify({ first, second }))
    );

    const ws = new WebSocket(`ws://${address}/middlewares`);
    const assert = JSON.parse(await new Promise((resolve, reject) => ws.on('message', resolve)));
    ws.close();

    expect(assert).to.eql({ first: 1, second: 1 });
  });

  it('should not accept params', () => {
    try {
      app.ws('/:hello', (_ , ws) => ws.send('expected'));
    }
    catch ({ message }) {
      expect(message).to.match(/params .* not supported/);
    }
  });

  it('should not accept empty middleware', () => {
    try {
      app.ws('/hello');
    }
    catch ({ message }) {
      expect(message).to.match(/middleware is required/);
    }
  });

  after(() => {
    server.close();
    app.wss.close();
  });
});
