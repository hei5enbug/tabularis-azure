import type { DocumentIdentity, JsonObject, PartitionKeyComponent } from "@tabularis/service-contracts/types";
import type { RpcHandler } from "../runtime/index.js";
import type { ClientProvider } from "../connection/index.js";
import { CapabilityUnavailableError } from "../connection/index.js";

export interface DocumentScope { database: string; container: string }
export interface ReadDocumentInput extends DocumentScope { identity: DocumentIdentity }
export interface CreateDocumentInput extends DocumentScope { document: JsonObject; partition_key: PartitionKeyComponent[] }
export interface ReplaceDocumentInput extends ReadDocumentInput { if_match: string; document: JsonObject }
export interface DeleteDocumentInput extends ReadDocumentInput { if_match: string }
export interface DocumentHandlers { read_document: RpcHandler; create_document: RpcHandler; replace_document: RpcHandler; delete_document: RpcHandler }
export function createDocumentHandlers(_clients: ClientProvider): DocumentHandlers {
  const unavailable: RpcHandler = async () => { throw new CapabilityUnavailableError(); };
  return { read_document: unavailable, create_document: unavailable, replace_document: unavailable, delete_document: unavailable };
}
