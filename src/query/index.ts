import type { PartitionKeyComponent, QueryParameter } from "@tabularis/service-contracts/types";
import type { RpcHandler } from "../runtime/index.js";
import type { ClientProvider } from "../connection/index.js";
import { CapabilityUnavailableError } from "../connection/index.js";

export interface QueryInput { database: string; container: string; text: string; parameters: QueryParameter[]; partition_key?: PartitionKeyComponent[] | null; page_size?: number; next_token?: string | null; ru_budget?: number }
export interface QueryHandlers { query_page: RpcHandler; execute_query: RpcHandler }
export function createQueryHandlers(_clients: ClientProvider): QueryHandlers {
  const unavailable: RpcHandler = async () => { throw new CapabilityUnavailableError(); };
  return { query_page: unavailable, execute_query: unavailable };
}
