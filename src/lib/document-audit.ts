// @ts-nocheck
import { supabase } from "@/integrations/supabase/client";

export type DocumentAuditInput = {
  documentType: "payslip" | "report" | "invoice" | "receipt";
  entityTable?: string | null;
  entityId?: string | null;
  payload: Record<string, unknown>;
};

async function sha256Hex(value: string) {
  const bytes = new TextEncoder().encode(value);
  const hash = await crypto.subtle.digest("SHA-256", bytes);
  return Array.from(new Uint8Array(hash)).map((byte) => byte.toString(16).padStart(2, "0")).join("");
}

export async function registerDocumentAudit(input: DocumentAuditInput) {
  const payloadHash = await sha256Hex(JSON.stringify(input.payload));
  const { data, error } = await (supabase as any).rpc("register_document_audit_key", {
    _document_type: input.documentType,
    _entity_table: input.entityTable ?? null,
    _entity_id: input.entityId ?? null,
    _payload_hash: payloadHash,
    _payload: input.payload,
  });

  if (error) {
    return {
      auditHash: await sha256Hex(`${input.documentType}:${input.entityTable ?? ""}:${input.entityId ?? ""}:${payloadHash}`),
      persisted: false,
      error,
    };
  }

  return {
    auditHash: data?.audit_hash as string,
    persisted: true,
    error: null,
  };
}
