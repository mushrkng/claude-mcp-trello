<p align="center">
  <h1 align="center">Trello MCP Server</h1>
  <p align="center">
    A full-featured Model Context Protocol server for Trello — 23 tools for complete board management through AI agents.
  </p>
  <p align="center">
    <a href="#quick-start">Quick Start</a> &bull;
    <a href="#available-tools">Tools</a> &bull;
    <a href="#deployment">Deployment</a> &bull;
    <a href="#api-reference">API Reference</a>
  </p>
</p>

---

> **Fork of [hrs-asano/claude-mcp-trello](https://github.com/hrs-asano/claude-mcp-trello)** — rewritten with Streamable HTTP transport, Docker deployment, 11 additional tools, and a handler map architecture.

## What's Different From Upstream

| | Upstream | This Fork |
|---|---|---|
| **Transport** | stdio | Streamable HTTP (Express) |
| **Tools** | 12 | **23** |
| **Deployment** | Local process | **Docker** (self-hosted) |
| **Board discovery** | Search only | `get_boards`, `get_board`, labels, members |
| **Checklists** | Not supported | Full CRUD |
| **Comments** | Not supported | Supported |
| **Architecture** | Switch statement | Handler map |

## Available Tools

### Boards

| Tool | Description |
|------|-------------|
| `trello_get_boards` | List all boards for the authenticated user |
| `trello_get_board` | Get board details (name, description, preferences) |
| `trello_get_board_labels` | Get all labels defined on a board |
| `trello_get_board_members` | Get all members of a board |

### Lists

| Tool | Description |
|------|-------------|
| `trello_get_lists` | Get all lists on a board |
| `trello_add_list` | Create a new list on a board |
| `trello_archive_list` | Archive a list |

### Cards

| Tool | Description |
|------|-------------|
| `trello_get_cards_by_list` | Get all cards in a list |
| `trello_get_card` | Get full details of a specific card |
| `trello_add_card` | Create a card (with optional description, due date, labels) |
| `trello_update_card` | Update card properties |
| `trello_move_card` | Move a card to a different list |
| `trello_archive_card` | Archive a card |

### Checklists

| Tool | Description |
|------|-------------|
| `trello_get_checklists` | Get all checklists on a card with item states |
| `trello_create_checklist` | Create a new checklist on a card |
| `trello_update_checklist_item` | Update a check item (name, complete/incomplete) |
| `trello_delete_checklist` | Delete an entire checklist |

### Comments & Attachments

| Tool | Description |
|------|-------------|
| `trello_add_comment` | Add a comment to a card |
| `trello_get_card_attachments` | List all attachments on a card |
| `trello_download_attachment` | Download attachment content (base64) |

### Search & Activity

| Tool | Description |
|------|-------------|
| `trello_get_my_cards` | Get all cards assigned to you |
| `trello_search_all_boards` | Cross-board keyword search |
| `trello_get_recent_activity` | Get recent activity on a board |

## Quick Start

### Prerequisites

- [Trello API key and token](https://trello.com/power-ups/admin) (generate at `trello.com/power-ups/admin`)
- Node.js 20+ or Docker

### Option 1: Docker (recommended)

```bash
git clone https://github.com/mushrkng/claude-mcp-trello.git
cd claude-mcp-trello

# Create .env with your credentials
cat > .env << 'EOF'
TRELLO_API_KEY=your_api_key
TRELLO_TOKEN=your_token
EOF

docker compose up -d
```

The server starts on `http://localhost:3100/mcp`.

### Option 2: Node.js

```bash
git clone https://github.com/mushrkng/claude-mcp-trello.git
cd claude-mcp-trello
npm ci
npm run build

TRELLO_API_KEY=your_api_key TRELLO_TOKEN=your_token npm start
```

The server starts on `http://localhost:3000/mcp`.

### Verify

```bash
curl http://localhost:3100/health
# {"status":"ok","sessions":0}
```

## Deployment

### Docker Compose

```yaml
services:
  trello-mcp:
    build: .
    container_name: trello-mcp
    ports:
      - "3100:3000"
    env_file: .env
    restart: unless-stopped
```

### Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `TRELLO_API_KEY` | Yes | Your Trello API key |
| `TRELLO_TOKEN` | Yes | Your Trello API token |
| `PORT` | No | Server port (default: `3000`) |

## Integration

### Claude Code (Streamable HTTP)

Add to your Claude Code MCP settings:

```json
{
  "mcpServers": {
    "trello": {
      "type": "streamable-http",
      "url": "http://localhost:3100/mcp"
    }
  }
}
```

### Claude Desktop (stdio — upstream mode)

If you prefer running as a local process without Docker:

```json
{
  "mcpServers": {
    "trello": {
      "command": "node",
      "args": ["/path/to/claude-mcp-trello/build/index.js"],
      "env": {
        "TRELLO_API_KEY": "your_api_key",
        "TRELLO_TOKEN": "your_token"
      }
    }
  }
}
```

> **Note:** stdio transport is not included in this fork. Use the upstream repo for stdio mode, or run this fork via Docker / Streamable HTTP.

## API Reference

### Board Operations

#### `trello_get_boards`

No parameters. Returns all boards for the authenticated user.

#### `trello_get_board`

```typescript
{ boardId: string }
```

#### `trello_get_board_labels`

```typescript
{ boardId: string }
```

#### `trello_get_board_members`

```typescript
{ boardId: string }
```

### List Operations

#### `trello_get_lists`

```typescript
{ boardId: string }
```

#### `trello_add_list`

```typescript
{ boardId: string, name: string }
```

#### `trello_archive_list`

```typescript
{ listId: string }
```

### Card Operations

#### `trello_get_cards_by_list`

```typescript
{ listId: string }
```

#### `trello_get_card`

```typescript
{ cardId: string }
```

#### `trello_add_card`

```typescript
{
  listId: string,
  name: string,
  description?: string,
  dueDate?: string,       // ISO 8601
  labels?: string[]       // Label IDs
}
```

#### `trello_update_card`

```typescript
{
  cardId: string,
  name?: string,
  description?: string,
  dueDate?: string,
  labels?: string[]
}
```

#### `trello_move_card`

```typescript
{ cardId: string, listId: string }
```

#### `trello_archive_card`

```typescript
{ cardId: string }
```

### Checklist Operations

#### `trello_get_checklists`

```typescript
{ cardId: string }
```

Returns checklists with their check items and completion state.

#### `trello_create_checklist`

```typescript
{ cardId: string, name: string }
```

#### `trello_update_checklist_item`

```typescript
{
  cardId: string,
  checkItemId: string,
  name?: string,
  state?: "complete" | "incomplete"
}
```

#### `trello_delete_checklist`

```typescript
{ cardId: string, checklistId: string }
```

### Comments & Attachments

#### `trello_add_comment`

```typescript
{ cardId: string, text: string }
```

#### `trello_get_card_attachments`

```typescript
{ cardId: string }
```

#### `trello_download_attachment`

```typescript
{ cardId: string, attachmentId: string }
```

Returns `{ attachment, content: string | null, url: string }`. Content is base64-encoded for Trello uploads, `null` for external links.

### Search & Activity

#### `trello_get_my_cards`

No parameters. Returns all cards assigned to the authenticated user.

#### `trello_search_all_boards`

```typescript
{ query: string, limit?: number }
```

#### `trello_get_recent_activity`

```typescript
{ boardId: string, limit?: number }
```

## Rate Limiting

Built-in token bucket rate limiter respects Trello's API limits:

- **300 requests / 10 seconds** per API key
- **100 requests / 10 seconds** per token

Requests are automatically queued when limits are reached. Failed requests (429) are retried with exponential backoff (up to 3 retries).

## Architecture

```
src/
  index.ts          → MCP server, tool definitions, handler map, Express setup
  trello-client.ts  → Trello API client (axios + rate limiting + retry)
  validators.ts     → Input validation for all tools
  types.ts          → TypeScript interfaces for Trello objects
  rate-limiter.ts   → Token bucket rate limiter
```

The server uses **Streamable HTTP transport** via Express. Each MCP session gets its own `StreamableHTTPServerTransport` instance, identified by session ID. The handler map dispatches tool calls to the appropriate Trello API client method.

## License

MIT — see [LICENSE](LICENSE).

## Acknowledgments

- Forked from [hrs-asano/claude-mcp-trello](https://github.com/hrs-asano/claude-mcp-trello)
- Built with [Model Context Protocol TypeScript SDK](https://github.com/modelcontextprotocol/typescript-sdk)
- Uses the [Trello REST API](https://developer.atlassian.com/cloud/trello/rest/)
