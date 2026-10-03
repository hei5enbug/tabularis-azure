import type { CosmosClient } from "@azure/cosmos";
import type { AuthMode } from "@tabularis/service-contracts/types";

export interface ConnectionSettings { endpoint: string; database?: string; auth_mode: AuthMode; tenant_id?: string; client_id?: string; credential_ref?: string }
export type TransientAuthContext =
  | { kind: "account_key"; account_key: string; identity: string }
  | { kind: "entra_token"; access_token: string; expires_at_ms: number; tenant_id: string; client_id: string; principal_id: string; scope: string; identity: string };
export interface ConnectionContext { connection_id: string; settings: ConnectionSettings; auth: TransientAuthContext }
export interface ClientProvider { get(context: ConnectionContext): Promise<CosmosClient>; invalidate(connection_id: string): Promise<void> }
export class CapabilityUnavailableError extends Error {
  readonly code = "CAPABILITY_UNAVAILABLE";
  constructor() { super("The Cosmos data-plane handler is unavailable."); }
}
export function createClientProvider(): ClientProvider {
  return { async get() { throw new CapabilityUnavailableError(); }, async invalidate() { throw new CapabilityUnavailableError(); } };
}
