# TIC

Game Service and Web Client.  Tic Tac Toe, Reversi, Connect Four etc.

# Client

A zero dependency SPA using SSE and semantic html for simplicity and reliability.

# Server

Native `node:http2` service stack with no 3rd party dependencies.

Providing endpoint resolution and support for standard rest-like interactions. Intentionally build to host REST(-like) API without boilerplate code or libraries.

features include:
- Stream based
- Event Source (SSE)
- Rate Limit
- Server Timing
- Encoding (gzip / deflate / br)
- Declarative endpoint definition (list, create, get, actions)
- CORS / Preflight

