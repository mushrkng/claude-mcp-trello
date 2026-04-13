# Trello MCP Server — Full Client Rework

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add 11 missing Trello tools (boards, card details, comments, checklists, labels, members) and refactor handler dispatch from switch to handler map.

**Architecture:** Extend existing MCP server (Express + Streamable HTTP) with new Trello API client methods and tool definitions. Refactor `index.ts` from a 12-case switch to a handler map that scales to 23 tools cleanly. No changes to transport, rate-limiter, or Docker config.

**Tech Stack:** TypeScript, Node.js 20, MCP SDK 1.29+, axios, Express, Docker

**Spec:** `docs/superpowers/specs/2026-04-13-trello-mcp-full-client-design.md`

---

## File Structure

| File | Action | Responsibility |
|------|--------|----------------|
| `src/types.ts` | Modify | Add `TrelloBoard`, `TrelloChecklist`, `TrelloCheckItem`, `TrelloComment` interfaces |
| `src/trello-client.ts` | Modify | Add 11 new API methods |
| `src/validators.ts` | Modify | Add validators for new tools |
| `src/index.ts` | Modify | Add 11 tool definitions, refactor switch → handler map |

No new files. No changes to `rate-limiter.ts`, `package.json`, `tsconfig.json`, `Dockerfile`, `docker-compose.yml`.

---

### Task 1: Add new type interfaces

**Files:**
- Modify: `src/types.ts:1-95`

- [ ] **Step 1: Add TrelloBoard interface**

After the `TrelloCard` interface (line 16), add:

```typescript
export interface TrelloBoard {
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
```

- [ ] **Step 2: Add TrelloChecklist and TrelloCheckItem interfaces**

After the `TrelloLabel` interface (line 57 area), add:

```typescript
export interface TrelloCheckItem {
  id: string;
  name: string;
  state: "complete" | "incomplete";
  idChecklist: string;
  pos: number;
}

export interface TrelloChecklist {
  id: string;
  name: string;
  idBoard: string;
  idCard: string;
  pos: number;
  checkItems: TrelloCheckItem[];
}
```

- [ ] **Step 3: Add TrelloComment interface**

After the `TrelloChecklist` interface, add:

```typescript
export interface TrelloComment {
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

- [ ] **Step 4: Verify types compile**

Run: `cd /Users/mushrkng/Development/claude-mcp-trello && npx tsc --noEmit`
Expected: No errors (new types are not imported anywhere yet, but should parse cleanly)

- [ ] **Step 5: Commit**

```bash
cd /Users/mushrkng/Development/claude-mcp-trello
git add src/types.ts
git commit -m "feat: add TrelloBoard, TrelloChecklist, TrelloCheckItem, TrelloComment types"
```

---

### Task 2: Add new client methods

**Files:**
- Modify: `src/trello-client.ts:1-282`

All new methods follow the existing pattern: wrap the axios call in `this.handleRequest()` which provides retry logic for 429 errors. The rate limiter is applied automatically via the axios interceptor.

- [ ] **Step 1: Update imports**

Change line 2 from:

```typescript
import { TrelloConfig, TrelloCard, TrelloList, TrelloAction, TrelloMember, TrelloAttachment } from './types.js';
```

to:

```typescript
import { TrelloConfig, TrelloCard, TrelloList, TrelloAction, TrelloMember, TrelloAttachment, TrelloBoard, TrelloChecklist, TrelloCheckItem, TrelloComment, TrelloLabel } from './types.js';
```

- [ ] **Step 2: Add board methods**

After the `getCardsByList` method (line 49), add:

```typescript
  async getBoards(): Promise<TrelloBoard[]> {
    return this.handleRequest(async () => {
      const response = await this.axiosInstance.get('/members/me/boards');
      return response.data;
    });
  }

  async getBoard(boardId: string): Promise<TrelloBoard> {
    return this.handleRequest(async () => {
      const response = await this.axiosInstance.get(`/boards/${boardId}`);
      return response.data;
    });
  }

  async getBoardLabels(boardId: string): Promise<TrelloLabel[]> {
    return this.handleRequest(async () => {
      const response = await this.axiosInstance.get(`/boards/${boardId}/labels`);
      return response.data;
    });
  }

  async getBoardMembers(boardId: string): Promise<TrelloMember[]> {
    return this.handleRequest(async () => {
      const response = await this.axiosInstance.get(`/boards/${boardId}/members`);
      return response.data;
    });
  }
```

- [ ] **Step 3: Add getCard method**

After the `getMyCards` method (line 157 area), add:

```typescript
  async getCard(cardId: string): Promise<TrelloCard> {
    return this.handleRequest(async () => {
      const response = await this.axiosInstance.get(`/cards/${cardId}`);
      return response.data;
    });
  }
```

- [ ] **Step 4: Add moveCard method**

After the `getCard` method, add:

```typescript
  async moveCard(cardId: string, listId: string): Promise<TrelloCard> {
    return this.handleRequest(async () => {
      const response = await this.axiosInstance.put(`/cards/${cardId}`, {
        idList: listId,
      });
      return response.data;
    });
  }
```

- [ ] **Step 5: Add addComment method**

After the `moveCard` method, add:

```typescript
  async addComment(cardId: string, text: string): Promise<TrelloComment> {
    return this.handleRequest(async () => {
      const response = await this.axiosInstance.post(`/cards/${cardId}/actions/comments`, null, {
        params: { text },
      });
      return response.data;
    });
  }
```

Note: Trello's comment endpoint takes `text` as a query parameter, not request body. The `null` is the body, `params` goes into the URL query string via axios.

- [ ] **Step 6: Add checklist methods**

After the `addComment` method, add:

```typescript
  async getChecklists(cardId: string): Promise<TrelloChecklist[]> {
    return this.handleRequest(async () => {
      const response = await this.axiosInstance.get(`/cards/${cardId}/checklists`);
      return response.data;
    });
  }

  async createChecklist(cardId: string, name: string): Promise<TrelloChecklist> {
    return this.handleRequest(async () => {
      const response = await this.axiosInstance.post(`/cards/${cardId}/checklists`, { name });
      return response.data;
    });
  }

  async updateCheckItem(cardId: string, checkItemId: string, params: {
    name?: string;
    state?: "complete" | "incomplete";
  }): Promise<TrelloCheckItem> {
    return this.handleRequest(async () => {
      const response = await this.axiosInstance.put(`/cards/${cardId}/checkItem/${checkItemId}`, params);
      return response.data;
    });
  }

  async deleteChecklist(cardId: string, checklistId: string): Promise<void> {
    return this.handleRequest(async () => {
      await this.axiosInstance.delete(`/cards/${cardId}/checklists/${checklistId}`);
    });
  }
```

- [ ] **Step 7: Verify compilation**

Run: `cd /Users/mushrkng/Development/claude-mcp-trello && npx tsc --noEmit`
Expected: No errors

- [ ] **Step 8: Commit**

```bash
cd /Users/mushrkng/Development/claude-mcp-trello
git add src/trello-client.ts
git commit -m "feat: add 11 new Trello API client methods (boards, card, comments, checklists)"
```

---

### Task 3: Add new validators

**Files:**
- Modify: `src/validators.ts:1-118`

- [ ] **Step 1: Add validators for new tools**

After the `validateArchiveListRequest` function (line 117), add:

```typescript
export function validateBoardIdRequest(args: Record<string, unknown>): { boardId: string } {
  if (!args.boardId) {
    throw new McpError(ErrorCode.InvalidParams, 'boardId is required');
  }
  return {
    boardId: validateString(args.boardId, 'boardId'),
  };
}

export function validateCardIdRequest(args: Record<string, unknown>): { cardId: string } {
  if (!args.cardId) {
    throw new McpError(ErrorCode.InvalidParams, 'cardId is required');
  }
  return {
    cardId: validateString(args.cardId, 'cardId'),
  };
}

export function validateMoveCardRequest(args: Record<string, unknown>): { cardId: string; listId: string } {
  if (!args.cardId || !args.listId) {
    throw new McpError(ErrorCode.InvalidParams, 'cardId and listId are required');
  }
  return {
    cardId: validateString(args.cardId, 'cardId'),
    listId: validateString(args.listId, 'listId'),
  };
}

export function validateAddCommentRequest(args: Record<string, unknown>): { cardId: string; text: string } {
  if (!args.cardId || !args.text) {
    throw new McpError(ErrorCode.InvalidParams, 'cardId and text are required');
  }
  return {
    cardId: validateString(args.cardId, 'cardId'),
    text: validateString(args.text, 'text'),
  };
}

export function validateCreateChecklistRequest(args: Record<string, unknown>): { cardId: string; name: string } {
  if (!args.cardId || !args.name) {
    throw new McpError(ErrorCode.InvalidParams, 'cardId and name are required');
  }
  return {
    cardId: validateString(args.cardId, 'cardId'),
    name: validateString(args.name, 'name'),
  };
}

export function validateUpdateCheckItemRequest(args: Record<string, unknown>): {
  cardId: string;
  checkItemId: string;
  name?: string;
  state?: string;
} {
  if (!args.cardId || !args.checkItemId) {
    throw new McpError(ErrorCode.InvalidParams, 'cardId and checkItemId are required');
  }
  return {
    cardId: validateString(args.cardId, 'cardId'),
    checkItemId: validateString(args.checkItemId, 'checkItemId'),
    name: validateOptionalString(args.name),
    state: validateOptionalString(args.state),
  };
}

export function validateDeleteChecklistRequest(args: Record<string, unknown>): { cardId: string; checklistId: string } {
  if (!args.cardId || !args.checklistId) {
    throw new McpError(ErrorCode.InvalidParams, 'cardId and checklistId are required');
  }
  return {
    cardId: validateString(args.cardId, 'cardId'),
    checklistId: validateString(args.checklistId, 'checklistId'),
  };
}
```

- [ ] **Step 2: Verify compilation**

Run: `cd /Users/mushrkng/Development/claude-mcp-trello && npx tsc --noEmit`
Expected: No errors

- [ ] **Step 3: Commit**

```bash
cd /Users/mushrkng/Development/claude-mcp-trello
git add src/validators.ts
git commit -m "feat: add validators for new Trello tools"
```

---

### Task 4: Add tool definitions and refactor handler dispatch

**Files:**
- Modify: `src/index.ts:1-383`

This is the largest task. It adds 11 new tool definitions and replaces the switch statement with a handler map.

- [ ] **Step 1: Update validator imports**

Replace the import block at lines 16-23:

```typescript
import {
  validateGetCardsListRequest,
  validateGetRecentActivityRequest,
  validateAddCardRequest,
  validateUpdateCardRequest,
  validateArchiveCardRequest,
  validateAddListRequest,
  validateArchiveListRequest,
} from "./validators.js";
```

with:

```typescript
import {
  validateString,
  validateGetCardsListRequest,
  validateGetRecentActivityRequest,
  validateAddCardRequest,
  validateUpdateCardRequest,
  validateArchiveCardRequest,
  validateAddListRequest,
  validateArchiveListRequest,
  validateBoardIdRequest,
  validateCardIdRequest,
  validateMoveCardRequest,
  validateAddCommentRequest,
  validateCreateChecklistRequest,
  validateUpdateCheckItemRequest,
  validateDeleteChecklistRequest,
} from "./validators.js";
```

- [ ] **Step 2: Add 11 new tool definitions**

After the `trelloDownloadAttachmentTool` definition (line 180), add:

```typescript
const trelloGetBoardsTool: Tool = {
  name: "trello_get_boards",
  description: "Retrieves all boards for the authenticated user.",
  inputSchema: {
    type: "object",
    properties: {},
  },
};

const trelloGetBoardTool: Tool = {
  name: "trello_get_board",
  description: "Retrieves details of a specific board including name, description, preferences, and label names.",
  inputSchema: {
    type: "object",
    properties: {
      boardId: { type: "string", description: "The ID of the Trello board" },
    },
    required: ["boardId"],
  },
};

const trelloGetBoardLabelsTool: Tool = {
  name: "trello_get_board_labels",
  description: "Retrieves all labels defined on a board. Use this to get label IDs for creating or updating cards with labels.",
  inputSchema: {
    type: "object",
    properties: {
      boardId: { type: "string", description: "The ID of the Trello board" },
    },
    required: ["boardId"],
  },
};

const trelloGetBoardMembersTool: Tool = {
  name: "trello_get_board_members",
  description: "Retrieves all members of a board.",
  inputSchema: {
    type: "object",
    properties: {
      boardId: { type: "string", description: "The ID of the Trello board" },
    },
    required: ["boardId"],
  },
};

const trelloGetCardTool: Tool = {
  name: "trello_get_card",
  description: "Retrieves full details of a specific card including description, labels, members, due date, and checklist info.",
  inputSchema: {
    type: "object",
    properties: {
      cardId: { type: "string", description: "The ID of the Trello card" },
    },
    required: ["cardId"],
  },
};

const trelloMoveCardTool: Tool = {
  name: "trello_move_card",
  description: "Moves a card to a different list.",
  inputSchema: {
    type: "object",
    properties: {
      cardId: { type: "string", description: "The ID of the card to move" },
      listId: { type: "string", description: "The ID of the destination list" },
    },
    required: ["cardId", "listId"],
  },
};

const trelloAddCommentTool: Tool = {
  name: "trello_add_comment",
  description: "Adds a comment to a card.",
  inputSchema: {
    type: "object",
    properties: {
      cardId: { type: "string", description: "The ID of the card to comment on" },
      text: { type: "string", description: "The comment text" },
    },
    required: ["cardId", "text"],
  },
};

const trelloGetChecklistsTool: Tool = {
  name: "trello_get_checklists",
  description: "Retrieves all checklists on a card, including their check items and completion state.",
  inputSchema: {
    type: "object",
    properties: {
      cardId: { type: "string", description: "The ID of the Trello card" },
    },
    required: ["cardId"],
  },
};

const trelloCreateChecklistTool: Tool = {
  name: "trello_create_checklist",
  description: "Creates a new checklist on a card.",
  inputSchema: {
    type: "object",
    properties: {
      cardId: { type: "string", description: "The ID of the card to add the checklist to" },
      name: { type: "string", description: "Name of the checklist" },
    },
    required: ["cardId", "name"],
  },
};

const trelloUpdateChecklistItemTool: Tool = {
  name: "trello_update_checklist_item",
  description: "Updates a check item on a card. Can change its name and/or completion state.",
  inputSchema: {
    type: "object",
    properties: {
      cardId: { type: "string", description: "The ID of the card containing the check item" },
      checkItemId: { type: "string", description: "The ID of the check item to update" },
      name: { type: "string", description: "New name for the check item (optional)" },
      state: { type: "string", enum: ["complete", "incomplete"], description: "New state (optional)" },
    },
    required: ["cardId", "checkItemId"],
  },
};

const trelloDeleteChecklistTool: Tool = {
  name: "trello_delete_checklist",
  description: "Deletes an entire checklist from a card. This removes all check items in it.",
  inputSchema: {
    type: "object",
    properties: {
      cardId: { type: "string", description: "The ID of the card containing the checklist" },
      checklistId: { type: "string", description: "The ID of the checklist to delete" },
    },
    required: ["cardId", "checklistId"],
  },
};
```

- [ ] **Step 3: Update ALL_TOOLS array**

Replace the `ALL_TOOLS` array (lines 182-195):

```typescript
const ALL_TOOLS: Tool[] = [
  trelloGetCardsByListTool,
  trelloGetListsTool,
  trelloGetRecentActivityTool,
  trelloAddCardTool,
  trelloUpdateCardTool,
  trelloArchiveCardTool,
  trelloAddListTool,
  trelloArchiveListTool,
  trelloGetMyCardsTool,
  trelloSearchAllBoardsTool,
  trelloGetCardAttachmentsTool,
  trelloDownloadAttachmentTool,
];
```

with:

```typescript
const ALL_TOOLS: Tool[] = [
  // Board operations
  trelloGetBoardsTool,
  trelloGetBoardTool,
  trelloGetBoardLabelsTool,
  trelloGetBoardMembersTool,
  // List operations
  trelloGetListsTool,
  trelloAddListTool,
  trelloArchiveListTool,
  // Card operations
  trelloGetCardsByListTool,
  trelloGetCardTool,
  trelloAddCardTool,
  trelloUpdateCardTool,
  trelloMoveCardTool,
  trelloArchiveCardTool,
  // Card sub-resources
  trelloAddCommentTool,
  trelloGetChecklistsTool,
  trelloCreateChecklistTool,
  trelloUpdateChecklistItemTool,
  trelloDeleteChecklistTool,
  trelloGetCardAttachmentsTool,
  trelloDownloadAttachmentTool,
  // Search & user
  trelloGetMyCardsTool,
  trelloSearchAllBoardsTool,
  trelloGetRecentActivityTool,
];
```

- [ ] **Step 4: Replace switch statement with handler map**

Replace the entire `createServer` function (lines 200-298) with:

```typescript
type ToolResult = { content: { type: string; text: string }[] };

function createServer(trelloClient: TrelloClient): Server {
  const server = new Server(
    { name: "Trello MCP Server", version: "0.3.0" },
    { capabilities: { tools: {} } },
  );

  server.setRequestHandler(ListToolsRequestSchema, async () => ({
    tools: ALL_TOOLS,
  }));

  const handlers: Record<string, (args: Record<string, unknown>) => Promise<ToolResult>> = {
    // Board operations
    trello_get_boards: async () => ({
      content: [{ type: "text", text: JSON.stringify(await trelloClient.getBoards()) }],
    }),
    trello_get_board: async (args) => {
      const { boardId } = validateBoardIdRequest(args);
      return { content: [{ type: "text", text: JSON.stringify(await trelloClient.getBoard(boardId)) }] };
    },
    trello_get_board_labels: async (args) => {
      const { boardId } = validateBoardIdRequest(args);
      return { content: [{ type: "text", text: JSON.stringify(await trelloClient.getBoardLabels(boardId)) }] };
    },
    trello_get_board_members: async (args) => {
      const { boardId } = validateBoardIdRequest(args);
      return { content: [{ type: "text", text: JSON.stringify(await trelloClient.getBoardMembers(boardId)) }] };
    },

    // List operations
    trello_get_lists: async (args) => {
      const { boardId } = validateBoardIdRequest(args);
      return { content: [{ type: "text", text: JSON.stringify(await trelloClient.getLists(boardId)) }] };
    },
    trello_add_list: async (args) => {
      const { boardId } = validateBoardIdRequest(args);
      const name = validateString(args.name, "name");
      return { content: [{ type: "text", text: JSON.stringify(await trelloClient.addList(boardId, name)) }] };
    },
    trello_archive_list: async (args) => {
      const { listId } = validateArchiveListRequest(args);
      return { content: [{ type: "text", text: JSON.stringify(await trelloClient.archiveList(listId)) }] };
    },

    // Card operations
    trello_get_cards_by_list: async (args) => {
      const { listId } = validateGetCardsListRequest(args);
      return { content: [{ type: "text", text: JSON.stringify(await trelloClient.getCardsByList(listId)) }] };
    },
    trello_get_card: async (args) => {
      const { cardId } = validateCardIdRequest(args);
      return { content: [{ type: "text", text: JSON.stringify(await trelloClient.getCard(cardId)) }] };
    },
    trello_add_card: async (args) => {
      const validated = validateAddCardRequest(args);
      return { content: [{ type: "text", text: JSON.stringify(await trelloClient.addCard(validated)) }] };
    },
    trello_update_card: async (args) => {
      const validated = validateUpdateCardRequest(args);
      return { content: [{ type: "text", text: JSON.stringify(await trelloClient.updateCard(validated)) }] };
    },
    trello_move_card: async (args) => {
      const { cardId, listId } = validateMoveCardRequest(args);
      return { content: [{ type: "text", text: JSON.stringify(await trelloClient.moveCard(cardId, listId)) }] };
    },
    trello_archive_card: async (args) => {
      const { cardId } = validateArchiveCardRequest(args);
      return { content: [{ type: "text", text: JSON.stringify(await trelloClient.archiveCard(cardId)) }] };
    },

    // Card sub-resources
    trello_add_comment: async (args) => {
      const { cardId, text } = validateAddCommentRequest(args);
      return { content: [{ type: "text", text: JSON.stringify(await trelloClient.addComment(cardId, text)) }] };
    },
    trello_get_checklists: async (args) => {
      const { cardId } = validateCardIdRequest(args);
      return { content: [{ type: "text", text: JSON.stringify(await trelloClient.getChecklists(cardId)) }] };
    },
    trello_create_checklist: async (args) => {
      const { cardId, name } = validateCreateChecklistRequest(args);
      return { content: [{ type: "text", text: JSON.stringify(await trelloClient.createChecklist(cardId, name)) }] };
    },
    trello_update_checklist_item: async (args) => {
      const { cardId, checkItemId, name, state } = validateUpdateCheckItemRequest(args);
      return { content: [{ type: "text", text: JSON.stringify(await trelloClient.updateCheckItem(cardId, checkItemId, { name, state: state as "complete" | "incomplete" | undefined })) }] };
    },
    trello_delete_checklist: async (args) => {
      const { cardId, checklistId } = validateDeleteChecklistRequest(args);
      await trelloClient.deleteChecklist(cardId, checklistId);
      return { content: [{ type: "text", text: JSON.stringify({ success: true }) }] };
    },
    trello_get_card_attachments: async (args) => {
      const { cardId } = validateCardIdRequest(args);
      return { content: [{ type: "text", text: JSON.stringify(await trelloClient.getCardAttachments(cardId)) }] };
    },
    trello_download_attachment: async (args) => {
      const cardId = validateString(args.cardId, "cardId");
      const attachmentId = validateString(args.attachmentId, "attachmentId");
      return { content: [{ type: "text", text: JSON.stringify(await trelloClient.downloadAttachment(cardId, attachmentId)) }] };
    },

    // Search & user
    trello_get_my_cards: async () => ({
      content: [{ type: "text", text: JSON.stringify(await trelloClient.getMyCards()) }],
    }),
    trello_search_all_boards: async (args) => {
      const query = validateString(args.query, "query");
      const limit = (args.limit as number) ?? 10;
      return { content: [{ type: "text", text: JSON.stringify(await trelloClient.searchAllBoards(query, limit)) }] };
    },
    trello_get_recent_activity: async (args) => {
      const { boardId } = validateBoardIdRequest(args);
      const limit = (args.limit as number) ?? 10;
      return { content: [{ type: "text", text: JSON.stringify(await trelloClient.getRecentActivity(boardId, limit)) }] };
    },
  };

  server.setRequestHandler(CallToolRequestSchema, async (request: CallToolRequest) => {
    const handler = handlers[request.params.name];
    if (!handler) {
      return {
        content: [{ type: "text", text: JSON.stringify({ error: `Unknown tool: ${request.params.name}` }) }],
      };
    }
    try {
      return await handler((request.params.arguments ?? {}) as Record<string, unknown>);
    } catch (error) {
      return {
        content: [{
          type: "text",
          text: JSON.stringify({ error: error instanceof Error ? error.message : String(error) }),
        }],
      };
    }
  });

  return server;
}
```

- [ ] **Step 5: Update version in package.json**

Change `"version": "0.2.0"` to `"version": "0.3.0"` in `package.json`.

- [ ] **Step 6: Build and verify**

Run: `cd /Users/mushrkng/Development/claude-mcp-trello && npm run build`
Expected: Clean compilation, no errors. Output in `build/` directory.

- [ ] **Step 7: Commit**

```bash
cd /Users/mushrkng/Development/claude-mcp-trello
git add src/index.ts package.json
git commit -m "feat: add 11 new tools, refactor switch to handler map, bump to 0.3.0"
```

---

### Task 5: Deploy to Arkanis

**Prereqs:** Tasks 1-4 completed, code builds locally.

The MCP server runs as a Docker container on Arkanis (192.168.1.187). The repo needs to be synced to the server and the container rebuilt.

- [ ] **Step 1: Push changes to GitHub**

```bash
cd /Users/mushrkng/Development/claude-mcp-trello
git push origin main
```

- [ ] **Step 2: Pull on Arkanis and rebuild**

```bash
ssh mushrkng@192.168.1.187 'cd ~/claude-mcp-trello && git pull origin main && docker compose up -d --build'
```

Note: Verify the actual path on Arkanis — it may differ. Check with `ssh mushrkng@192.168.1.187 'ls ~/claude-mcp-trello'` first.

- [ ] **Step 3: Verify health endpoint**

```bash
curl http://arkanis:3100/health
```

Expected: `{"status":"ok","sessions":0}`

- [ ] **Step 4: Verify new tools are available**

Use `trello_get_boards` through Claude Code to confirm the new tool works and returns the user's boards. This is the primary smoke test — if boards come back, the server is running the new code.
