import { McpError, ErrorCode } from '@modelcontextprotocol/sdk/types.js';

export function validateString(value: unknown, field: string): string {
  if (typeof value !== 'string') {
    throw new McpError(ErrorCode.InvalidParams, `${field} must be a string`);
  }
  return value;
}

export function validateOptionalString(value: unknown): string | undefined {
  if (value === undefined) return undefined;
  return validateString(value, 'value');
}

export function validateNumber(value: unknown, field: string): number {
  if (typeof value !== 'number') {
    throw new McpError(ErrorCode.InvalidParams, `${field} must be a number`);
  }
  return value;
}

export function validateOptionalNumber(value: unknown): number | undefined {
  if (value === undefined) return undefined;
  return validateNumber(value, 'value');
}

export function validateStringArray(value: unknown): string[] {
  if (!Array.isArray(value) || !value.every(item => typeof item === 'string')) {
    throw new McpError(ErrorCode.InvalidParams, 'Value must be an array of strings');
  }
  return value;
}

export function validateOptionalStringArray(value: unknown): string[] | undefined {
  if (value === undefined) return undefined;
  return validateStringArray(value);
}

export function validateGetCardsListRequest(args: Record<string, unknown>): { listId: string } {
  if (!args.listId) {
    throw new McpError(ErrorCode.InvalidParams, 'listId is required');
  }
  return {
    listId: validateString(args.listId, 'listId'),
  };
}

export function validateGetRecentActivityRequest(args: Record<string, unknown>): { limit?: number } {
  return {
    limit: validateOptionalNumber(args.limit),
  };
}

export function validateAddCardRequest(args: Record<string, unknown>): {
  listId: string;
  name: string;
  description?: string;
  dueDate?: string;
  labels?: string[];
} {
  if (!args.listId || !args.name) {
    throw new McpError(ErrorCode.InvalidParams, 'listId and name are required');
  }
  return {
    listId: validateString(args.listId, 'listId'),
    name: validateString(args.name, 'name'),
    description: validateOptionalString(args.description),
    dueDate: validateOptionalString(args.dueDate),
    labels: validateOptionalStringArray(args.labels),
  };
}

export function validateUpdateCardRequest(args: Record<string, unknown>): {
  cardId: string;
  name?: string;
  description?: string;
  dueDate?: string;
  labels?: string[];
} {
  if (!args.cardId) {
    throw new McpError(ErrorCode.InvalidParams, 'cardId is required');
  }
  return {
    cardId: validateString(args.cardId, 'cardId'),
    name: validateOptionalString(args.name),
    description: validateOptionalString(args.description),
    dueDate: validateOptionalString(args.dueDate),
    labels: validateOptionalStringArray(args.labels),
  };
}

export function validateArchiveCardRequest(args: Record<string, unknown>): { cardId: string } {
  if (!args.cardId) {
    throw new McpError(ErrorCode.InvalidParams, 'cardId is required');
  }
  return {
    cardId: validateString(args.cardId, 'cardId'),
  };
}

export function validateAddListRequest(args: Record<string, unknown>): { name: string } {
  if (!args.name) {
    throw new McpError(ErrorCode.InvalidParams, 'name is required');
  }
  return {
    name: validateString(args.name, 'name'),
  };
}

export function validateArchiveListRequest(args: Record<string, unknown>): { listId: string } {
  if (!args.listId) {
    throw new McpError(ErrorCode.InvalidParams, 'listId is required');
  }
  return {
    listId: validateString(args.listId, 'listId'),
  };
}

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

function validateOptionalBoolean(value: unknown): boolean | undefined {
  if (value === undefined) return undefined;
  if (typeof value !== 'boolean') {
    throw new McpError(ErrorCode.InvalidParams, 'value must be a boolean');
  }
  return value;
}

function validateOptionalRecord(value: unknown): Record<string, unknown> | undefined {
  if (value === undefined) return undefined;
  if (value === null || typeof value !== 'object' || Array.isArray(value)) {
    throw new McpError(ErrorCode.InvalidParams, 'value must be an object');
  }
  return value as Record<string, unknown>;
}

const LABEL_COLORS = new Set([
  'yellow', 'purple', 'blue', 'red', 'green',
  'orange', 'black', 'sky', 'pink', 'lime',
]);

function validateLabelColor(value: unknown, field: string): string | null {
  if (value === null || value === '') return null;
  if (typeof value !== 'string') {
    throw new McpError(ErrorCode.InvalidParams, `${field} must be a string`);
  }
  if (!LABEL_COLORS.has(value)) {
    throw new McpError(ErrorCode.InvalidParams, `${field} must be one of: ${[...LABEL_COLORS].join(', ')}, or null`);
  }
  return value;
}

function validateOptionalLabelColor(value: unknown, field: string): string | null | undefined {
  if (value === undefined) return undefined;
  return validateLabelColor(value, field);
}

export function validateCreateBoardRequest(args: Record<string, unknown>): {
  name: string;
  desc?: string;
  idOrganization?: string;
  defaultLabels?: boolean;
  defaultLists?: boolean;
} {
  if (!args.name) {
    throw new McpError(ErrorCode.InvalidParams, 'name is required');
  }
  return {
    name: validateString(args.name, 'name'),
    desc: validateOptionalString(args.desc),
    idOrganization: validateOptionalString(args.idOrganization),
    defaultLabels: validateOptionalBoolean(args.defaultLabels),
    defaultLists: validateOptionalBoolean(args.defaultLists),
  };
}

export function validateUpdateBoardRequest(args: Record<string, unknown>): {
  boardId: string;
  name?: string;
  desc?: string;
  closed?: boolean;
  prefs?: Record<string, unknown>;
} {
  if (!args.boardId) {
    throw new McpError(ErrorCode.InvalidParams, 'boardId is required');
  }
  return {
    boardId: validateString(args.boardId, 'boardId'),
    name: validateOptionalString(args.name),
    desc: validateOptionalString(args.desc),
    closed: validateOptionalBoolean(args.closed),
    prefs: validateOptionalRecord(args.prefs),
  };
}

export function validateUpdateListRequest(args: Record<string, unknown>): {
  listId: string;
  name?: string;
  closed?: boolean;
  pos?: number | string;
} {
  if (!args.listId) {
    throw new McpError(ErrorCode.InvalidParams, 'listId is required');
  }
  let pos: number | string | undefined;
  if (args.pos !== undefined) {
    if (typeof args.pos === 'number' || typeof args.pos === 'string') {
      pos = args.pos;
    } else {
      throw new McpError(ErrorCode.InvalidParams, 'pos must be a number or a string (e.g. "top", "bottom")');
    }
  }
  return {
    listId: validateString(args.listId, 'listId'),
    name: validateOptionalString(args.name),
    closed: validateOptionalBoolean(args.closed),
    pos,
  };
}

export function validateCreateLabelRequest(args: Record<string, unknown>): {
  boardId: string;
  name: string;
  color: string | null;
} {
  if (!args.boardId || !args.name) {
    throw new McpError(ErrorCode.InvalidParams, 'boardId and name are required');
  }
  return {
    boardId: validateString(args.boardId, 'boardId'),
    name: validateString(args.name, 'name'),
    color: validateLabelColor(args.color ?? null, 'color'),
  };
}

export function validateUpdateLabelRequest(args: Record<string, unknown>): {
  labelId: string;
  name?: string;
  color?: string | null;
} {
  if (!args.labelId) {
    throw new McpError(ErrorCode.InvalidParams, 'labelId is required');
  }
  return {
    labelId: validateString(args.labelId, 'labelId'),
    name: validateOptionalString(args.name),
    color: validateOptionalLabelColor(args.color, 'color'),
  };
}

export function validateLabelIdRequest(args: Record<string, unknown>): { labelId: string } {
  if (!args.labelId) {
    throw new McpError(ErrorCode.InvalidParams, 'labelId is required');
  }
  return {
    labelId: validateString(args.labelId, 'labelId'),
  };
}

export function validateCardLabelRequest(args: Record<string, unknown>): { cardId: string; labelId: string } {
  if (!args.cardId || !args.labelId) {
    throw new McpError(ErrorCode.InvalidParams, 'cardId and labelId are required');
  }
  return {
    cardId: validateString(args.cardId, 'cardId'),
    labelId: validateString(args.labelId, 'labelId'),
  };
}
