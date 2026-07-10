import { io } from 'socket.io-client';
import { getAccessToken } from './api.js';

// LEARN: one socket connection for the whole app, created lazily. The token is
// read from the same in-memory store the REST client uses, so the socket
// authenticates with the same credential. reconnection is on by default —
// socket.io handles backoff for us.
let socket = null;

export function getSocket() {
  if (!socket) {
    socket = io({
      auth: { token: getAccessToken() },
      autoConnect: true,
    });
  }
  return socket;
}

export function reconnectSocket() {
  // On a token refresh, hand the socket the new token and reconnect.
  if (socket) {
    socket.auth = { token: getAccessToken() };
    socket.disconnect().connect();
  }
}
