import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const migration = readFileSync(
  resolve(process.cwd(), 'supabase/migrations/20260915080922_add_gamification_events.sql'),
  'utf8',
);

describe('gamification migration', () => {
  it('uses an owner-scoped immutable ledger and a restricted atomic reward function', () => {
    expect(migration).toContain('unique (user_id, event_key)');
    expect(migration).toContain('alter table public.focusos_reward_events enable row level security');
    expect(migration).toContain("current_user_id uuid := auth.uid()");
    expect(migration).toContain('security definer');
    expect(migration).toContain('revoke all on function public.record_focusos_reward');
    expect(migration).toContain('grant execute on function public.record_focusos_reward');
    expect(migration).not.toContain('grant insert on public.focusos_reward_events');
  });
});
