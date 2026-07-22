// JSON-RPC 2.0 types for MCP Streamable HTTP transport

export interface JsonRpcRequest {
  jsonrpc: '2.0'
  method: string
  params?: Record<string, unknown>
  id?: string | number
}

export interface JsonRpcResponse {
  jsonrpc: '2.0'
  id: string | number | null
  result?: unknown
  error?: JsonRpcError
}

export interface JsonRpcError {
  code: number
  message: string
  data?: unknown
}

// Standard JSON-RPC 2.0 error codes
export const PARSE_ERROR = -32700
export const INVALID_REQUEST = -32600
export const METHOD_NOT_FOUND = -32601
export const INVALID_PARAMS = -32602
export const INTERNAL_ERROR = -32603

// MCP protocol constants
export const MCP_PROTOCOL_VERSION = '2025-03-26'
export const MCP_SERVER_NAME = 'otter'
export const MCP_SERVER_VERSION = '1.0.0'

// MCP tool result types
export interface TextContent {
  type: 'text'
  text: string
}

export interface CallToolResult {
  content: TextContent[]
  isError?: boolean
}

// MCP tool definition
export interface McpToolDefinition {
  name: string
  description: string
  inputSchema: {
    type: 'object'
    properties: Record<string, unknown>
    required?: string[]
  }
}

// Helper to create a JSON-RPC success response
export const jsonRpcSuccess = (
  id: string | number | null,
  result: unknown,
): JsonRpcResponse => ({
  id,
  jsonrpc: '2.0',
  result,
})

// Helper to create a JSON-RPC error response
export const jsonRpcError = (
  id: string | number | null,
  code: number,
  message: string,
  data?: unknown,
): JsonRpcResponse => ({
  error: { code, message, ...(data !== undefined && { data }) },
  id,
  jsonrpc: '2.0',
})

// Helper to create a successful tool result
export const toolResult = (text: string): CallToolResult => ({
  content: [{ text, type: 'text' }],
})

// Helper to create an error tool result
export const toolError = (text: string): CallToolResult => ({
  content: [{ text, type: 'text' }],
  isError: true,
})
