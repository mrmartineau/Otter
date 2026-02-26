import type { Context } from 'hono'
import { createAuthenticatedClient } from '../supabase/client'
import { toolDefinitions, toolHandlers } from './tools'
import {
  INTERNAL_ERROR,
  INVALID_PARAMS,
  INVALID_REQUEST,
  type JsonRpcRequest,
  type JsonRpcResponse,
  jsonRpcError,
  jsonRpcSuccess,
  MCP_PROTOCOL_VERSION,
  MCP_SERVER_NAME,
  MCP_SERVER_VERSION,
  METHOD_NOT_FOUND,
  PARSE_ERROR,
  toolError,
} from './types'

const CORS_HEADERS = {
  'Access-Control-Allow-Headers':
    'Content-Type, Accept, Authorization, Mcp-Session-Id',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Origin': '*',
}

const JSON_HEADERS = {
  ...CORS_HEADERS,
  'Content-Type': 'application/json',
}

/**
 * OPTIONS /api/mcp — CORS preflight
 */
export const handleMcpOptions = (c: Context) => {
  return c.body(null, 204, CORS_HEADERS)
}

/**
 * GET /api/mcp — SSE not supported (stateless mode)
 */
export const handleMcpGet = (c: Context) => {
  return c.text(
    'SSE not supported. Use POST for JSON-RPC requests.',
    405,
    CORS_HEADERS,
  )
}

/**
 * DELETE /api/mcp — No sessions to terminate (stateless mode)
 */
export const handleMcpDelete = (c: Context) => {
  return c.text(
    'Session management not supported (stateless server).',
    405,
    CORS_HEADERS,
  )
}

/**
 * POST /api/mcp — Main MCP JSON-RPC handler
 */
export const handleMcpPost = async (c: Context) => {
  // Validate Content-Type
  const contentType = c.req.header('Content-Type')
  if (!contentType?.includes('application/json')) {
    return c.text('Content-Type must be application/json', 415, CORS_HEADERS)
  }

  // Authenticate
  // @ts-expect-error - createAuthenticatedClient returns AuthenticatedClient | Response
  const authResult = await createAuthenticatedClient(c.req)
  if (authResult instanceof Response) {
    return authResult
  }
  const { client, user } = authResult

  // Parse JSON body
  let body: unknown
  try {
    body = await c.req.json()
  } catch {
    return jsonResponse(
      c,
      jsonRpcError(null, PARSE_ERROR, 'Parse error: invalid JSON'),
    )
  }

  // Handle batch requests
  if (Array.isArray(body)) {
    const responses: JsonRpcResponse[] = []
    for (const msg of body) {
      const result = await processMessage(msg as JsonRpcRequest, {
        client,
        userId: user.id,
      })
      if (result !== null) {
        responses.push(result)
      }
    }
    // If all messages were notifications, return 204
    if (responses.length === 0) {
      return c.body(null, 204, CORS_HEADERS)
    }
    return new Response(JSON.stringify(responses), {
      headers: JSON_HEADERS,
      status: 200,
    })
  }

  // Handle single request
  const result = await processMessage(body as JsonRpcRequest, {
    client,
    userId: user.id,
  })
  // Notification — no id, no response body
  if (result === null) {
    return c.body(null, 204, CORS_HEADERS)
  }
  return jsonResponse(c, result)
}

// --- Internal helpers ---

interface ProcessContext {
  client: ReturnType<typeof createAuthenticatedClient> extends Promise<infer T>
    ? T extends Response
      ? never
      : T
    : never
  userId: string
}

// Narrow the type properly
interface AuthedContext {
  client: Awaited<ReturnType<typeof createAuthenticatedClient>> extends infer T
    ? T extends Response
      ? never
      : T extends { client: infer C }
        ? C
        : never
    : never
  userId: string
}

async function processMessage(
  msg: JsonRpcRequest,
  ctx: { client: unknown; userId: string },
): Promise<JsonRpcResponse | null> {
  // Validate basic structure
  if (!msg || typeof msg !== 'object' || msg.jsonrpc !== '2.0' || !msg.method) {
    // If there's no id, we can't send a response (it's a malformed notification)
    if (!msg?.id) return null
    return jsonRpcError(
      msg?.id ?? null,
      INVALID_REQUEST,
      'Invalid Request: missing jsonrpc or method',
    )
  }

  const id = msg.id ?? null
  const isNotification = id === null || id === undefined

  try {
    const result = await dispatch(msg.method, msg.params, ctx)

    // Notifications don't get responses
    if (isNotification) return null

    return jsonRpcSuccess(id, result)
  } catch (err) {
    if (isNotification) return null
    if (err instanceof JsonRpcException) {
      return jsonRpcError(id, err.code, err.message)
    }
    return jsonRpcError(
      id,
      INTERNAL_ERROR,
      `Internal error: ${err instanceof Error ? err.message : 'unknown'}`,
    )
  }
}

async function dispatch(
  method: string,
  params: Record<string, unknown> | undefined,
  ctx: { client: unknown; userId: string },
): Promise<unknown> {
  switch (method) {
    case 'initialize':
      return {
        capabilities: { tools: {} },
        protocolVersion: MCP_PROTOCOL_VERSION,
        serverInfo: {
          name: MCP_SERVER_NAME,
          version: MCP_SERVER_VERSION,
        },
      }

    case 'ping':
      return {}

    case 'notifications/initialized':
      // No-op — processed but no result needed
      return undefined

    case 'tools/list':
      return { tools: toolDefinitions }

    case 'tools/call': {
      const toolName = params?.name as string
      if (!toolName) {
        throw new JsonRpcException(INVALID_PARAMS, 'Missing tool name')
      }
      const handler = toolHandlers[toolName]
      if (!handler) {
        throw new JsonRpcException(
          METHOD_NOT_FOUND,
          `Unknown tool: ${toolName}`,
        )
      }
      try {
        return await handler(
          (params?.arguments as Record<string, unknown>) || {},
          // biome-ignore lint/suspicious/noExplicitAny: auth types are complex
          { client: ctx.client as any, userId: ctx.userId },
        )
      } catch (err) {
        // Tool execution errors are returned as isError results, not JSON-RPC errors
        return toolError(
          `Tool execution failed: ${err instanceof Error ? err.message : String(err)}`,
        )
      }
    }

    default:
      throw new JsonRpcException(
        METHOD_NOT_FOUND,
        `Method not found: ${method}`,
      )
  }
}

class JsonRpcException extends Error {
  code: number
  constructor(code: number, message: string) {
    super(message)
    this.code = code
  }
}

function jsonResponse(c: Context, data: JsonRpcResponse) {
  return new Response(JSON.stringify(data), {
    headers: JSON_HEADERS,
    status: 200,
  })
}
