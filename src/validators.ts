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
