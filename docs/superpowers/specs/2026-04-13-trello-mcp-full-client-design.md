# Trello MCP Server — Full Client Rework

**Date:** 2026-04-13
**Status:** Approved
**Scope:** Add 11 missing tools + refactor handler dispatch in `index.ts`

## Problem

The current Trello MCP server is missing fundamental operations. There is no way to list boards (`GET /members/me/boards`), view board details, work with checklists, add comments, or move cards between lists. The only discovery mechanism is `trello_search_all_boards`, which requires a keyword and cannot reliably enumerate boards.

## Goals

- Full read/write Trello client: boards, lists, cards, checklists, comments, labels, members
- Clean handler architecture that scales to 23+ tools without degrading readability
- Zero breaking changes to existing 12 tools
- Same deployment model (Docker on Arkanis, Streamable HTTP transport)

## Non-Goals

- Webhooks / real-time subscriptions
- Power-Up integrations
- Batch/bulk operations
- UI or dashboard

## Architecture Change: Handler Map

**Current:** Single `switch` statement in `index.ts` with 12 cases.

**New:** A `Record<string, (args) => Promise<result>>` handler map. Each tool registers its handler as a function. The `CallToolRequestSchema` handler does a single lookup + call.

```typescript
const handlers: Record<string, (args: Record<string, unknown>) => Promise<ToolResult>> = {
  trello_get_boards: async () => ({
    content: [{ type: "text", text: JSON.stringify(await trelloClient.getBoards()) }],
  }),
  trello_get_board: async (args) => {
    const boardId = validateString(args.boardId, "boardId");
    return { content: [{ type: "text", text: JSON.stringify(await trelloClient.getBoard(boardId)) }] };
  },
  // ... all other handlers
};

server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const handler = handlers[request.params.name];
  if (!handler) throw new Error(`Unknown tool: ${request.params.name}`);
  try {
    return await handler(request.params.arguments ?? {});
  } catch (error) {
    return { content: [{ type: "text", text: JSON.stringify({ error: error instanceof Error ? error.message : String(error) }) }] };
  }
});
```

This keeps tool definitions (the `Tool` objects for `ListToolsRequestSchema`) separate from handler logic, and each handler is a self-contained function.

## New Tools

### Board Operations

#### `trello_get_boards`
- **API:** `GET /members/me/boards`
- **Params:** none
- **Returns:** Array of board objects (id, name, desc, url, closed, dateLastActivity)
- **Why:** The most basic operation — "what boards do I have?"

#### `trello_get_board`
- **API:** `GET /boards/{id}`
- **Params:** `boardId` (required)
- **Returns:** Full board object with prefs, labelNames, etc.
- **Why:** Get details of a specific board without listing all

#### `trello_get_board_labels`
- **API:** `GET /boards/{id}/labels`
- **Params:** `boardId` (required)
- **Returns:** Array of label objects (id, name, color)
- **Why:** Need label IDs to create/update cards with labels

#### `trello_get_board_members`
- **API:** `GET /boards/{id}/members`
- **Params:** `boardId` (required)
- **Returns:** Array of member objects (id, fullName, username)
- **Why:** Need member IDs for card assignment, understand who's on the board

### Card Operations

#### `trello_get_card`
- **API:** `GET /cards/{id}`
- **Params:** `cardId` (required)
- **Returns:** Full card object with all fields
- **Why:** Get complete card details (desc, checklists, due, labels, members) — currently only available through list-level fetch

#### `trello_move_card`
- **API:** `PUT /cards/{id}` with `idList` in body
- **Params:** `cardId` (required), `listId` (required)
- **Returns:** Updated card object
- **Why:** Explicit "move card to list X" is the most common card operation. Technically possible via `trello_update_card` but semantically distinct and deserves its own tool for clarity.

#### `trello_add_comment`
- **API:** `POST /cards/{id}/actions/comments`
- **Params:** `cardId` (required), `text` (required)
- **Returns:** Comment action object
- **Why:** Comments are essential for collaboration and status updates

### Checklist Operations

#### `trello_get_checklists`
- **API:** `GET /cards/{id}/checklists`
- **Params:** `cardId` (required)
- **Returns:** Array of checklist objects, each containing checkItems array
- **Why:** Read checklist state — what items exist, which are complete

#### `trello_create_checklist`
- **API:** `POST /cards/{id}/checklists`
- **Params:** `cardId` (required), `name` (required)
- **Returns:** Created checklist object
- **Why:** Create a new checklist on a card

#### `trello_update_checklist_item`
- **API:** `PUT /cards/{idCard}/checkItem/{idCheckItem}`
- **Params:** `cardId` (required), `checkItemId` (required), `name` (optional), `state` (optional: "complete" | "incomplete")
- **Returns:** Updated check item object
- **Why:** Mark items complete/incomplete, rename items

#### `trello_delete_checklist`
- **API:** `DELETE /cards/{id}/checklists/{idChecklist}`
- **Params:** `cardId` (required), `checklistId` (required)
- **Returns:** Success confirmation
- **Why:** Remove a checklist entirely

## File Changes

### `src/types.ts`

Add interfaces:

```typescript
interface TrelloBoard {
  id: string;
  name: string;
  desc: string;
  closed: boolean;
  url: string;
  shortUrl: string;
  dateLastActivity: string;
  idOrganization: string | null;
  prefs: Record<string, unknown>;
  labelNames: Record<string, string>;
}

interface TrelloChecklist {
  id: string;
  name: string;
  idBoard: string;
  idCard: string;
  pos: number;
  checkItems: TrelloCheckItem[];
}

interface TrelloCheckItem {
  id: string;
  name: string;
  state: "complete" | "incomplete";
  idChecklist: string;
  pos: number;
}

interface TrelloComment {
  id: string;
  idMemberCreator: string;
  data: {
    text: string;
    card: { id: string; name: string };
    board: { id: string; name: string };
  };
  type: string;
  date: string;
  memberCreator: {
    id: string;
    fullName: string;
    username: string;
  };
}
```

### `src/trello-client.ts`

Add 11 methods following existing pattern (`handleRequest` wrapper + axios call):

- `getBoards()` — `GET /members/me/boards`
- `getBoard(boardId)` — `GET /boards/{boardId}`
- `getBoardLabels(boardId)` — `GET /boards/{boardId}/labels`
- `getBoardMembers(boardId)` — `GET /boards/{boardId}/members`
- `getCard(cardId)` — `GET /cards/{cardId}`
- `moveCard(cardId, listId)` — `PUT /cards/{cardId}` body: `{ idList }`
- `addComment(cardId, text)` — `POST /cards/{cardId}/actions/comments` params: `{ text }`
- `getChecklists(cardId)` — `GET /cards/{cardId}/checklists`
- `createChecklist(cardId, name)` — `POST /cards/{cardId}/checklists` body: `{ name }`
- `updateCheckItem(cardId, checkItemId, params)` — `PUT /cards/{cardId}/checkItem/{checkItemId}`
- `deleteChecklist(cardId, checklistId)` — `DELETE /cards/{cardId}/checklists/{checklistId}`

### `src/validators.ts`

Add validators for new tools. Reuse existing `validateString`, `validateOptionalString` helpers.

### `src/index.ts`

1. Add 11 new `Tool` definition objects (inputSchema + description)
2. Add all tools to `ALL_TOOLS` array
3. Replace `switch` statement with handler map
4. Import new validators

## Existing Tools — No Changes

All 12 existing tools keep identical behavior:
- `trello_get_cards_by_list`
- `trello_get_lists`
- `trello_get_recent_activity`
- `trello_add_card`
- `trello_update_card`
- `trello_archive_card`
- `trello_add_list`
- `trello_archive_list`
- `trello_get_my_cards`
- `trello_search_all_boards`
- `trello_get_card_attachments`
- `trello_download_attachment`

## Deployment

No changes to deployment. After code changes:
1. Build locally or on Arkanis: `npm run build`
2. Rebuild Docker container on Arkanis: `docker compose up -d --build`
3. Verify via `/health` endpoint

## Testing

Manual verification after deploy:
1. `trello_get_boards` — should return all boards including Personal Board and the Perimeter board
2. `trello_get_board` — should return board name and details for a known board ID
3. `trello_get_checklists` on a card known to have checklists
4. `trello_add_comment` + verify in Trello UI
5. `trello_move_card` — move a test card between lists and verify
