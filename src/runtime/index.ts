import { createInterface } from "node:readline";
import type { Readable, Writable } from "node:stream";
import type { JsonObject, JsonValue, ServiceError } from "@tabularis/service-contracts/types";
import type { TransientAuthContext } from "../connection/index.js";

export const rpcMethods = ["initialize", "ping", "shutdown", "test_connection", "get_databases", "get_tables", "get_columns", "get_connection_metadata", "execute_query", "query_page", "read_document", "create_document", "replace_document", "delete_document", "cancel_request"] as const;
export type RpcMethod = (typeof rpcMethods)[number];
export interface RpcRequest { jsonrpc: "2.0"; id?: string | number | null; method: string; params?: JsonObject }
export interface RpcRequestContext { connection_id: string; request_id: string; deadline_ms: number; signal: AbortSignal; auth?: TransientAuthContext }
export type RpcHandler = (params: JsonObject, context: RpcRequestContext) => Promise<JsonValue>;
export interface RpcFailure { jsonrpc: "2.0"; id: string | number | null; error: { code: number; message: string; data?: ServiceError } }

export function dispatchRpc(request: RpcRequest): RpcFailure {
  const known = (rpcMethods as readonly string[]).includes(request.method);
  const code = known ? "CAPABILITY_UNAVAILABLE" : "UNSUPPORTED_OPERATION";
  return { jsonrpc: "2.0", id: request.id ?? null, error: {
    code: known ? -32000 : -32601, message: known ? "The requested driver handler is unavailable." : "The requested RPC method is unsupported.",
    data: { code, message: known ? "The requested driver handler is unavailable." : "The requested RPC method is unsupported.", retryable: false, outcome: "not_started", details: null },
  } };
}

export async function runStdio(input: Readable, output: Writable): Promise<void> {
  const lines = createInterface({ input, crlfDelay: Infinity });
  for await (const line of lines) {
    let response: RpcFailure | undefined;
    try {
      const value: unknown = JSON.parse(line);
      if (typeof value !== "object" || value === null || !("jsonrpc" in value) || value.jsonrpc !== "2.0" || !("method" in value) || typeof value.method !== "string") {
        response = { jsonrpc: "2.0", id: null, error: { code: -32600, message: "Invalid JSON-RPC request." } };
      } else if ("id" in value) {
        const id = value.id;
        response = typeof id === "string" || typeof id === "number" || id === null
          ? dispatchRpc({ jsonrpc: "2.0", id, method: value.method })
          : { jsonrpc: "2.0", id: null, error: { code: -32600, message: "Invalid JSON-RPC request ID." } };
      }
    } catch {
      response = { jsonrpc: "2.0", id: null, error: { code: -32700, message: "Invalid JSON." } };
    }
    if (response) {
      await new Promise<void>((resolve, reject) => output.write(JSON.stringify(response) + "\n", (error) => error ? reject(error) : resolve()));
    }
  }
}
