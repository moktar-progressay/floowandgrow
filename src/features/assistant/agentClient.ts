import { env, focusAgentFunction } from '../../config/env';
import { supabase } from '../../services/supabase/client';

export type AgentProposal = {
  id: string;
  action: 'focus' | 'complete' | 'create' | 'update';
  taskId?: string;
  title?: string;
  scheduledDate?: string | null;
  scheduledTime?: string | null;
  priority?: 'red' | 'yellow' | 'green' | null;
  reason: string;
  requiresUserApproval: true;
};

export type AgentStreamEvent =
  | { type: 'status'; message: string; requestId?: string }
  | { type: 'tool'; stage: 'started' | 'completed'; name: string }
  | { type: 'text_delta'; delta: string }
  | { type: 'proposal'; proposal: AgentProposal }
  | { type: 'done'; requestId: string; model: string }
  | { type: 'error'; message: string };

export type ConversationItem = { role: 'user' | 'assistant'; content: string };
export type AgentMessageContext = {
  channel: 'email' | 'whatsapp';
  subject?: string;
  sender?: string;
  text: string;
};

export async function streamFocusAgent(
  message: string,
  conversation: ConversationItem[],
  onEvent: (event: AgentStreamEvent) => void,
  signal?: AbortSignal,
  context?: AgentMessageContext,
) {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session?.access_token) throw new Error('Please sign in again.');
  const response = await fetch(focusAgentFunction, {
    method: 'POST',
    headers: {
      apikey: env.supabasePublishableKey,
      Authorization: `Bearer ${session.access_token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ message, conversation: conversation.slice(-8), context }),
    signal,
  });
  if (!response.ok) {
    const body = await response.json().catch(() => ({})) as { error?: string };
    throw new Error(body.error || 'The Task Orb could not start.');
  }
  if (!response.body) throw new Error('The Task Orb returned no stream.');
  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';
  while (true) {
    const { value, done } = await reader.read();
    buffer += decoder.decode(value, { stream: !done });
    const lines = buffer.split('\n');
    buffer = lines.pop() || '';
    for (const line of lines) {
      if (line.trim()) onEvent(JSON.parse(line) as AgentStreamEvent);
    }
    if (done) break;
  }
  if (buffer.trim()) onEvent(JSON.parse(buffer) as AgentStreamEvent);
}

export async function draftReply(context: AgentMessageContext) {
  let draft = '';
  let streamError = '';
  await streamFocusAgent(
    `Draft a concise, warm ${context.channel === 'email' ? 'email' : 'WhatsApp'} reply. Return only the proposed reply text. Do not send it.`,
    [],
    (event) => {
      if (event.type === 'text_delta') draft += event.delta;
      if (event.type === 'error') streamError = event.message;
    },
    undefined,
    context,
  );
  if (streamError) throw new Error(streamError);
  if (!draft.trim()) throw new Error('The Task Orb did not produce a draft.');
  return draft.trim();
}
