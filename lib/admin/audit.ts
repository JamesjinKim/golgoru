import { supabaseAdmin } from '@/lib/supabase';
import { AuditAction } from './types';

interface AuditEntry {
  actorId?: string | null;
  actorEmail?: string | null;
  action: AuditAction;
  targetTable?: string;
  targetId?: string;
  detail?: unknown;
}

// 모든 어드민 쓰기 + 로그인 이벤트 기록 (FR-06/07). 실패해도 본 작업은 막지 않음.
export async function logAudit(e: AuditEntry): Promise<void> {
  try {
    await supabaseAdmin.from('audit_log').insert({
      actor_id: e.actorId ?? null,
      actor_email: e.actorEmail ?? null,
      action: e.action,
      target_table: e.targetTable ?? null,
      target_id: e.targetId ?? null,
      detail: e.detail ?? null,
    });
  } catch (err) {
    console.error('[audit] insert failed:', err);
  }
}
