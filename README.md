# api-mock

[![npm version](https://img.shields.io/npm/v/api-mock.svg)](https://www.npmjs.com/package/api-mock) [![license: MIT](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE) [![node](https://img.shields.io/node/v/api-mock.svg)](https://nodejs.org/)

Spin up a local mock server from an OpenAPI spec with realistic fake data. Zero config, zero frameworks.

## Features

- **OpenAPI 3.0+ support** — reads JSON and YAML specs
- **Realistic fake data** — custom generators produce names, emails, URLs, phones, UUIDs, and more
- **Hot-reload** — watches spec file and restarts on change
- **Path & query parameters** — full route matching with `{param}` support
- **CORS enabled** — `Access-Control-Allow-Origin: *` on all responses
- **Delay simulation** — add artificial latency with `--delay`
- **Error simulation** — random 500s with `--error-rate`
- **Zero dependencies on web frameworks** — uses Node.js built-in `http`
- **Deterministic output** — same spec produces consistent data across restarts

## Installation

```bash
npm install -g api-mock
```

Or use directly with `npx`:

```bash
npx api-mock start ./openapi.yaml
```

## Quick Start

```bash
# Start a mock server from an OpenAPI spec
api-mock start ./examples/petstore.yaml

# List all routes in a spec
api-mock routes ./examples/petstore.yaml

# Validate a spec file
api-mock validate ./examples/petstore.yaml
```

## Commands

### `api-mock start <spec>`

Starts a mock HTTP server that serves responses matching your OpenAPI spec.

```bash
# Basic usage (default port 3456)
api-mock start ./openapi.yaml

# Custom port
api-mock start ./openapi.yaml --port 8080

# With simulated latency (200ms per request)
api-mock start ./openapi.yaml --delay 200

# With 10% error rate (random 500s)
api-mock start ./openapi.yaml --error-rate 0.1

# Watch mode (auto-restart on spec changes)
api-mock start ./openapi.yaml --watch

# Verbose (log request/response bodies)
api-mock start ./openapi.yaml --verbose
```

**Options:**

| Flag | Default | Description |
|------|---------|-------------|
| `-p, --port <number>` | `3456` | Port to listen on |
| `-d, --delay <ms>` | `0` | Artificial response delay in milliseconds |
| `-e, --error-rate <rate>` | `0` | Probability (0–1) of simulated 500 errors |
| `-w, --watch` | `false` | Watch spec file for changes and hot-reload |
| `-v, --verbose` | `false` | Show request/response bodies in logs |

**Example output:**

```
✔ Loaded "Petstore API" v1.0.0
ℹ 8 routes registered
✔ Mock server running at http://localhost:3456
ℹ Press Ctrl+C to stop

ℹ GET     /pets         200  3ms
ℹ POST    /pets         201  2ms
ℹ GET     /pets/1       200  1ms
✖ DELETE  /pets/99      404  1ms
```

### `api-mock routes <spec>`

Lists all routes defined in the spec as a formatted table.

```bash
api-mock routes ./openapi.yaml
```

**Example output:**

```
  Petstore API v1.0.0 — 8 routes

  METHOD   PATH              STATUS  CONTENT-TYPE
  ──────   ────              ──────  ────────────
  GET      /pets             200     application/json
  POST     /pets             201     application/json
  GET      /pets/{petId}     200     application/json
  DELETE   /pets/{petId}     204     application/json
  GET      /users            200     application/json
  POST     /users            201     application/json
  GET      /users/{userId}   200     application/json
  GET      /orders           200     application/json
```

### `api-mock validate <spec>`

Validates the OpenAPI spec for common issues.

```bash
api-mock validate ./openapi.yaml
```

Checks:
- Required fields present (`openapi`, `info`, `paths`)
- Valid OpenAPI version
- Paths start with `/`
- Operations have responses defined
- Parameters have `name` and `in` fields
- Schemas have `type` or composition keywords
- Array schemas have `items`
- Object schemas have `properties`

## Data Generation

Mock data is generated from response schemas using property names and types:

### By Property Name

| Property name contains | Generated value |
|------------------------|-----------------|
| `id` | Incrementing integer (1, 2, 3…) |
| `name` | Full name ("Sarah Johnson") |
| `email` / `mail` | Email address ("user123@example.com") |
| `price` / `amount` / `cost` | Decimal number (0.99–9999.99) |
| `url` / `href` / `link` | URL ("https://blog.example.com/api/42") |
| `phone` / `tel` | Phone number ("+1-555-234-8765") |
| `avatar` / `image` / `photo` | Placeholder image URL |
| `description` / `bio` / `body` | Lorem ipsum text (8–25 words) |
| `date` / `created` / `updated` | ISO 8601 datetime |
| `title` / `subject` | Title-cased phrase |
| `status` / `state` | Status string (active, pending, etc.) |
| `color` / `colour` | Hex color code |

### By Schema Type + Format

| Type | Format | Generated value |
|------|--------|-----------------|
| `string` | `date-time` | ISO 8601 datetime |
| `string` | `email` | Email address |
| `string` | `uri` / `url` | Fake URL |
| `string` | `uuid` | UUID v4 |
| `string` | `date` | ISO date |
| `string` | *(none)* | Lorem ipsum words |
| `integer` | *(any)* | Random integer in range |
| `number` | *(any)* | Random decimal in range |
| `boolean` | *(any)* | Random true/false |
| `array` | *(any)* | 3–5 items of item type |
| `object` | *(any)* | Recurse into properties |
| `enum` | *(any)* | Random enum value |

### Deterministic Output

The generator uses a seeded PRNG derived from the spec title and version. The same spec always produces the same data on restart, ensuring consistent mock responses.

## Configuration

All configuration is via CLI flags (no config files needed):

```
Usage: api-mock [options] [command]

Options:
  -V, --version          output the version number
  -h, --help             display help for command

Commands:
  start <spec>           Start a mock server from an OpenAPI spec
  routes <spec>          List all routes defined in the spec
  validate <spec>        Validate an OpenAPI spec file
  help [command]         Display help for command
```

## Contributing

Issues and pull requests are welcome at [github.com/katogatogato/api-mock](https://github.com/katogatogato/api-mock).

## License

[MIT](LICENSE) © katogatogato
