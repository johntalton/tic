# TIC

Tic Tac Toe Rest API and Web Client, with no 3rd party dependencies (sans nodejs itself).

# Client

A zero dependency SPA using SSE and semantic html for simplicity and reliability.

# Server

Based directly on `node:http2` it directly implements the remaining stack from scratch.

Providing endpoint resolution and support for standard rest-like interactions. Intentionally build to host REST(-like) API without boilerplate code or libraries.

features include:
- Stream based
- Event Source (SSE)
- Rate Limit
- Server Timing
- Encoding (gzip / deflate / br)
- Declarative endpoint definition (list, create, get, actions)
- CORS / Preflight

