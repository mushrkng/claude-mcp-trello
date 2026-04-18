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
  validateString,
  validateGetCardsListRequest,
  validateAddCardRequest,
  validateUpdateCardRequest,
  validateArchiveCardRequest,
  validateArchiveListRequest,
  validateBoardIdRequest,
  validateCardIdRequest,
  validateMoveCardRequest,
  validateAddCommentRequest,
  validateCreateChecklistRequest,
  validateUpdateCheckItemRequest,
  validateDeleteChecklistRequest,
  validateCreateBoardRequest,
  validateUpdateBoardRequest,
  validateUpdateListRequest,
  validateCreateLabelRequest,
  validateUpdateLabelRequest,
  validateLabelIdRequest,
  validateCardLabelRequest,
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

const trelloCreateBoardTool: Tool = {
  name: "trello_create_board",
  description: "Creates a new Trello board. Returns the created board including its ID and URL.",
  inputSchema: {
    type: "object",
    properties: {
      name: { type: "string", description: "Board name (1-16384 chars)" },
      desc: { type: "string", description: "Board description (optional)" },
      idOrganization: { type: "string", description: "Workspace/organization ID to place the board in (optional)" },
      defaultLabels: { type: "boolean", description: "Create the default set of labels (default: true)" },
      defaultLists: { type: "boolean", description: "Create default lists To Do / Doing / Done (default: true). Set false if you plan to add custom lists." },
    },
    required: ["name"],
  },
};

const trelloUpdateBoardTool: Tool = {
  name: "trello_update_board",
  description: "Updates board properties: name, description, closed (archive), or preferences (e.g. prefs.background, prefs.permissionLevel).",
  inputSchema: {
    type: "object",
    properties: {
      boardId: { type: "string", description: "The ID of the Trello board" },
      name: { type: "string", description: "New board name (optional)" },
      desc: { type: "string", description: "New board description (optional)" },
      closed: { type: "boolean", description: "Archive/unarchive the board (optional)" },
      prefs: {
        type: "object",
        description: "Board preferences object. Keys become prefs/<key>. Common keys: background, permissionLevel, voting, comments, invitations, selfJoin, cardCovers.",
      },
    },
    required: ["boardId"],
  },
};

const trelloDeleteBoardTool: Tool = {
  name: "trello_delete_board",
  description: "Permanently deletes a board. Destructive — use trello_update_board with closed=true for archive instead.",
  inputSchema: {
    type: "object",
    properties: {
      boardId: { type: "string", description: "The ID of the board to delete" },
    },
    required: ["boardId"],
  },
};

const trelloUpdateListTool: Tool = {
  name: "trello_update_list",
  description: "Updates a list's properties: rename, reposition, or close/reopen.",
  inputSchema: {
    type: "object",
    properties: {
      listId: { type: "string", description: "The ID of the list to update" },
      name: { type: "string", description: "New list name (optional)" },
      closed: { type: "boolean", description: "Archive/unarchive the list (optional)" },
      pos: { description: "Position: number, 'top', or 'bottom' (optional)" },
    },
    required: ["listId"],
  },
};

const trelloCreateLabelTool: Tool = {
  name: "trello_create_label",
  description: "Creates a new label on a board. Colors: yellow, purple, blue, red, green, orange, black, sky, pink, lime, or null for no color.",
  inputSchema: {
    type: "object",
    properties: {
      boardId: { type: "string", description: "The ID of the board to create the label on" },
      name: { type: "string", description: "Label name" },
      color: { type: ["string", "null"], description: "Label color (see description). Use null for no color." },
    },
    required: ["boardId", "name", "color"],
  },
};

const trelloUpdateLabelTool: Tool = {
  name: "trello_update_label",
  description: "Updates a label's name and/or color. Colors: yellow, purple, blue, red, green, orange, black, sky, pink, lime, or null.",
  inputSchema: {
    type: "object",
    properties: {
      labelId: { type: "string", description: "The ID of the label to update" },
      name: { type: "string", description: "New label name (optional)" },
      color: { type: ["string", "null"], description: "New label color, or null for no color (optional)" },
    },
    required: ["labelId"],
  },
};

const trelloDeleteLabelTool: Tool = {
  name: "trello_delete_label",
  description: "Deletes a label from its board. Automatically removes it from all cards.",
  inputSchema: {
    type: "object",
    properties: {
      labelId: { type: "string", description: "The ID of the label to delete" },
    },
    required: ["labelId"],
  },
};

const trelloAddLabelToCardTool: Tool = {
  name: "trello_add_label_to_card",
  description: "Attaches a label to a card. Prefer this over trello_update_card for additive label changes.",
  inputSchema: {
    type: "object",
    properties: {
      cardId: { type: "string", description: "The ID of the card" },
      labelId: { type: "string", description: "The ID of the label to attach" },
    },
    required: ["cardId", "labelId"],
  },
};

const trelloRemoveLabelFromCardTool: Tool = {
  name: "trello_remove_label_from_card",
  description: "Removes a label from a card without affecting other labels.",
  inputSchema: {
    type: "object",
    properties: {
      cardId: { type: "string", description: "The ID of the card" },
      labelId: { type: "string", description: "The ID of the label to remove" },
    },
    required: ["cardId", "labelId"],
  },
};

const ALL_TOOLS: Tool[] = [
  // Board operations
  trelloGetBoardsTool,
  trelloGetBoardTool,
  trelloCreateBoardTool,
  trelloUpdateBoardTool,
  trelloDeleteBoardTool,
  trelloGetBoardLabelsTool,
  trelloGetBoardMembersTool,
  // List operations
  trelloGetListsTool,
  trelloAddListTool,
  trelloUpdateListTool,
  trelloArchiveListTool,
  // Label operations
  trelloCreateLabelTool,
  trelloUpdateLabelTool,
  trelloDeleteLabelTool,
  trelloAddLabelToCardTool,
  trelloRemoveLabelFromCardTool,
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

// --------------------------------------------------
// Server factory — creates a new Server instance per session
// --------------------------------------------------
type ToolResult = { content: { type: string; text: string }[] };

function createServer(trelloClient: TrelloClient): Server {
  const server = new Server(
    { name: "Trello MCP Server", version: "0.4.0" },
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
    trello_create_board: async (args) => {
      const validated = validateCreateBoardRequest(args);
      return { content: [{ type: "text", text: JSON.stringify(await trelloClient.createBoard(validated)) }] };
    },
    trello_update_board: async (args) => {
      const validated = validateUpdateBoardRequest(args);
      return { content: [{ type: "text", text: JSON.stringify(await trelloClient.updateBoard(validated)) }] };
    },
    trello_delete_board: async (args) => {
      const { boardId } = validateBoardIdRequest(args);
      await trelloClient.deleteBoard(boardId);
      return { content: [{ type: "text", text: JSON.stringify({ success: true }) }] };
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
    trello_update_list: async (args) => {
      const validated = validateUpdateListRequest(args);
      return { content: [{ type: "text", text: JSON.stringify(await trelloClient.updateList(validated)) }] };
    },

    // Label operations
    trello_create_label: async (args) => {
      const validated = validateCreateLabelRequest(args);
      return { content: [{ type: "text", text: JSON.stringify(await trelloClient.createLabel(validated)) }] };
    },
    trello_update_label: async (args) => {
      const validated = validateUpdateLabelRequest(args);
      return { content: [{ type: "text", text: JSON.stringify(await trelloClient.updateLabel(validated)) }] };
    },
    trello_delete_label: async (args) => {
      const { labelId } = validateLabelIdRequest(args);
      await trelloClient.deleteLabel(labelId);
      return { content: [{ type: "text", text: JSON.stringify({ success: true }) }] };
    },
    trello_add_label_to_card: async (args) => {
      const { cardId, labelId } = validateCardLabelRequest(args);
      return { content: [{ type: "text", text: JSON.stringify(await trelloClient.addLabelToCard(cardId, labelId)) }] };
    },
    trello_remove_label_from_card: async (args) => {
      const { cardId, labelId } = validateCardLabelRequest(args);
      await trelloClient.removeLabelFromCard(cardId, labelId);
      return { content: [{ type: "text", text: JSON.stringify({ success: true }) }] };
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
