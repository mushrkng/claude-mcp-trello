import { randomUUID } from "node:crypto";
import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import { createMcpExpressApp } from "@modelcontextprotocol/sdk/server/express.js";
import {
  CallToolRequest,
  CallToolRequestSchema,
  ListToolsRequestSchema,
  Tool,
  isInitializeRequest,
} from "@modelcontextprotocol/sdk/types.js";
import cors from "cors";

import { TrelloClient } from "./trello-client.js";
import {
  validateGetCardsListRequest,
  validateGetRecentActivityRequest,
  validateAddCardRequest,
  validateUpdateCardRequest,
  validateArchiveCardRequest,
  validateAddListRequest,
  validateArchiveListRequest,
} from "./validators.js";

// --------------------------------------------------
// Tool definitions
// --------------------------------------------------

const trelloGetCardsByListTool: Tool = {
  name: "trello_get_cards_by_list",
  description: "Retrieves a list of cards contained in the specified list ID.",
  inputSchema: {
    type: "object",
    properties: {
      listId: { type: "string", description: "Trello list ID" },
    },
    required: ["listId"],
  },
};

const trelloGetListsTool: Tool = {
  name: "trello_get_lists",
  description: "Retrieves all lists in the specified board.",
  inputSchema: {
    type: "object",
    properties: {
      boardId: { type: "string", description: "The ID of the Trello board to get lists from" },
    },
    required: ["boardId"],
  },
};

const trelloGetRecentActivityTool: Tool = {
  name: "trello_get_recent_activity",
  description: "Retrieves the most recent activity for a specified board.",
  inputSchema: {
    type: "object",
    properties: {
      boardId: { type: "string", description: "The ID of the Trello board to get activity from" },
      limit: { type: "number", description: "Number of activities to retrieve (default: 10)" },
    },
    required: ["boardId"],
  },
};

const trelloAddCardTool: Tool = {
  name: "trello_add_card",
  description: "Adds a card to the specified list.",
  inputSchema: {
    type: "object",
    properties: {
      listId: { type: "string", description: "The ID of the list to add to" },
      name: { type: "string", description: "The title of the card" },
      description: { type: "string", description: "Details of the card (optional)" },
      dueDate: { type: "string", description: "Due date in ISO8601 format (optional)" },
      labels: { type: "array", description: "Array of label IDs (optional)", items: { type: "string" } },
    },
    required: ["listId", "name"],
  },
};

const trelloUpdateCardTool: Tool = {
  name: "trello_update_card",
  description: "Updates the content of a card.",
  inputSchema: {
    type: "object",
    properties: {
      cardId: { type: "string", description: "The ID of the card to be updated" },
      name: { type: "string", description: "The title of the card (optional)" },
      description: { type: "string", description: "Details of the card (optional)" },
      dueDate: { type: "string", description: "Due date in ISO8601 format (optional)" },
      labels: { type: "array", description: "An array of label IDs (optional)", items: { type: "string" } },
    },
    required: ["cardId"],
  },
};

const trelloArchiveCardTool: Tool = {
  name: "trello_archive_card",
  description: "Archives (closes) the specified card.",
  inputSchema: {
    type: "object",
    properties: {
      cardId: { type: "string", description: "The ID of the card to archive" },
    },
    required: ["cardId"],
  },
};

const trelloAddListTool: Tool = {
  name: "trello_add_list",
  description: "Adds a new list to the specified board.",
  inputSchema: {
    type: "object",
    properties: {
      boardId: { type: "string", description: "The ID of the Trello board to add the list to" },
      name: { type: "string", description: "Name of the list" },
    },
    required: ["boardId", "name"],
  },
};

const trelloArchiveListTool: Tool = {
  name: "trello_archive_list",
  description: "Archives (closes) the specified list.",
  inputSchema: {
    type: "object",
    properties: {
      listId: { type: "string", description: "The ID of the list to archive" },
    },
    required: ["listId"],
  },
};

const trelloGetMyCardsTool: Tool = {
  name: "trello_get_my_cards",
  description: "Retrieves all cards related to your account.",
  inputSchema: {
    type: "object",
    properties: {},
  },
};

const trelloSearchAllBoardsTool: Tool = {
  name: "trello_search_all_boards",
  description: "Performs a cross-board search across all boards in the workspace.",
  inputSchema: {
    type: "object",
    properties: {
      query: { type: "string", description: "Search keyword" },
      limit: { type: "number", description: "Maximum number of results to retrieve (default: 10)" },
    },
    required: ["query"],
  },
};

const trelloGetCardAttachmentsTool: Tool = {
  name: "trello_get_card_attachments",
  description: "Retrieves all attachments from a specified card.",
  inputSchema: {
    type: "object",
    properties: {
      cardId: { type: "string", description: "The ID of the Trello card to get attachments from" },
    },
    required: ["cardId"],
  },
};

const trelloDownloadAttachmentTool: Tool = {
  name: "trello_download_attachment",
  description: "Downloads a specific attachment from a Trello card. Use trello_get_card_attachments first to get the attachment ID.",
  inputSchema: {
    type: "object",
    properties: {
      cardId: { type: "string", description: "The ID of the Trello card containing the attachment" },
      attachmentId: { type: "string", description: "The ID of the attachment to download" },
    },
    required: ["cardId", "attachmentId"],
  },
};

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

// --------------------------------------------------
// Server factory — creates a new Server instance per session
// --------------------------------------------------
function createServer(trelloClient: TrelloClient): Server {
  const server = new Server(
    { name: "Trello MCP Server", version: "0.2.0" },
    { capabilities: { tools: {} } },
  );

  server.setRequestHandler(ListToolsRequestSchema, async () => ({
    tools: ALL_TOOLS,
  }));

  server.setRequestHandler(CallToolRequestSchema, async (request: CallToolRequest) => {
    try {
      const args = (request.params.arguments ?? {}) as Record<string, unknown>;

      switch (request.params.name) {
        case "trello_get_cards_by_list": {
          const { listId } = validateGetCardsListRequest(args);
          return { content: [{ type: "text", text: JSON.stringify(await trelloClient.getCardsByList(listId)) }] };
        }

        case "trello_get_lists": {
          const boardId = args.boardId as string;
          if (!boardId) throw new Error("Missing required argument: boardId");
          return { content: [{ type: "text", text: JSON.stringify(await trelloClient.getLists(boardId)) }] };
        }

        case "trello_get_recent_activity": {
          const boardId = args.boardId as string;
          if (!boardId) throw new Error("Missing required argument: boardId");
          const { limit } = validateGetRecentActivityRequest(args);
          return { content: [{ type: "text", text: JSON.stringify(await trelloClient.getRecentActivity(boardId, limit ?? 10)) }] };
        }

        case "trello_add_card": {
          const validated = validateAddCardRequest(args);
          return { content: [{ type: "text", text: JSON.stringify(await trelloClient.addCard(validated)) }] };
        }

        case "trello_update_card": {
          const validated = validateUpdateCardRequest(args);
          return { content: [{ type: "text", text: JSON.stringify(await trelloClient.updateCard(validated)) }] };
        }

        case "trello_archive_card": {
          const { cardId } = validateArchiveCardRequest(args);
          return { content: [{ type: "text", text: JSON.stringify(await trelloClient.archiveCard(cardId)) }] };
        }

        case "trello_add_list": {
          const { name } = validateAddListRequest(args);
          const boardId = args.boardId as string;
          if (!boardId) throw new Error("Missing required argument: boardId");
          return { content: [{ type: "text", text: JSON.stringify(await trelloClient.addList(boardId, name)) }] };
        }

        case "trello_archive_list": {
          const { listId } = validateArchiveListRequest(args);
          return { content: [{ type: "text", text: JSON.stringify(await trelloClient.archiveList(listId)) }] };
        }

        case "trello_get_my_cards": {
          return { content: [{ type: "text", text: JSON.stringify(await trelloClient.getMyCards()) }] };
        }

        case "trello_search_all_boards": {
          const query = args.query as string;
          if (!query) throw new Error("Missing required argument: query");
          const limit = (args.limit as number) ?? 10;
          return { content: [{ type: "text", text: JSON.stringify(await trelloClient.searchAllBoards(query, limit)) }] };
        }

        case "trello_get_card_attachments": {
          const cardId = args.cardId as string;
          if (!cardId) throw new Error("Missing required argument: cardId");
          return { content: [{ type: "text", text: JSON.stringify(await trelloClient.getCardAttachments(cardId)) }] };
        }

        case "trello_download_attachment": {
          const cardId = args.cardId as string;
          const attachmentId = args.attachmentId as string;
          if (!cardId || !attachmentId) throw new Error("Missing required arguments: cardId, attachmentId");
          return { content: [{ type: "text", text: JSON.stringify(await trelloClient.downloadAttachment(cardId, attachmentId)) }] };
        }

        default:
          throw new Error(`Unknown tool: ${request.params.name}`);
      }
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

// --------------------------------------------------
// Main — Express + Streamable HTTP transport
// --------------------------------------------------
async function main() {
  const trelloApiKey = process.env.TRELLO_API_KEY;
  const trelloToken = process.env.TRELLO_TOKEN;
  if (!trelloApiKey || !trelloToken) {
    console.error("TRELLO_API_KEY / TRELLO_TOKEN are not set.");
    process.exit(1);
  }

  const trelloClient = new TrelloClient({ apiKey: trelloApiKey, token: trelloToken });
  const port = parseInt(process.env.PORT ?? "3000", 10);

  const app = createMcpExpressApp({ host: "0.0.0.0" });
  app.use(cors({
    exposedHeaders: ["Mcp-Session-Id", "Mcp-Protocol-Version"],
    origin: "*",
  }));

  // Store transports by session ID
  const transports = new Map<string, StreamableHTTPServerTransport>();

  app.post("/mcp", async (req, res) => {
    const sessionId = req.headers["mcp-session-id"] as string | undefined;

    if (sessionId && transports.has(sessionId)) {
      await transports.get(sessionId)!.handleRequest(req, res, req.body);
      return;
    }

    if (!sessionId && isInitializeRequest(req.body)) {
      const transport = new StreamableHTTPServerTransport({
        sessionIdGenerator: () => randomUUID(),
        onsessioninitialized: (sid) => {
          transports.set(sid, transport);
        },
      });
      transport.onclose = () => {
        if (transport.sessionId) transports.delete(transport.sessionId);
      };
      const server = createServer(trelloClient);
      await server.connect(transport);
      await transport.handleRequest(req, res, req.body);
      return;
    }

    res.status(400).json({ error: "Invalid request: missing session ID or not an initialize request" });
  });

  app.get("/mcp", async (req, res) => {
    const sessionId = req.headers["mcp-session-id"] as string | undefined;
    if (sessionId && transports.has(sessionId)) {
      await transports.get(sessionId)!.handleRequest(req, res);
      return;
    }
    res.status(400).json({ error: "Invalid or missing session ID" });
  });

  app.delete("/mcp", async (req, res) => {
    const sessionId = req.headers["mcp-session-id"] as string | undefined;
    if (sessionId && transports.has(sessionId)) {
      await transports.get(sessionId)!.close();
      transports.delete(sessionId);
      res.status(200).end();
      return;
    }
    res.status(400).json({ error: "Invalid or missing session ID" });
  });

  app.get("/health", (_req, res) => {
    res.json({ status: "ok", sessions: transports.size });
  });

  app.listen(port, "0.0.0.0", () => {
    console.log(`Trello MCP Server listening on http://0.0.0.0:${port}/mcp`);
  });
}

main().catch((error) => {
  console.error("Fatal error:", error);
  process.exit(1);
});
