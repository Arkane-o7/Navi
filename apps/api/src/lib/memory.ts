import { sql } from '@/lib/db';

export type MemoryType = 'preference' | 'profile_fact' | 'project_context' | 'task_state';

export interface MemoryCandidate {
  memoryType: MemoryType;
  memoryKey: string;
  content: string;
  confidence: number;
}

export interface UserMemoryRecord {
  id: string;
  userId: string;
  memoryType: MemoryType;
  memoryKey: string;
  content: string;
  confidence: number;
  sourceConversationId: string | null;
  createdAt: string;
  updatedAt: string;
}

export type MemoryCommand =
  | { action: 'remember'; content: string }
  | { action: 'forget'; query: string };

let ensureUserMemoriesTablePromise: Promise<void> | null = null;

function normalizeMemoryKey(input: string): string {
  return input
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 96) || 'general';
}

function stripTrailingPunctuation(input: string): string {
  return input.trim().replace(/[\s.?!]+$/g, '');
}

function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .split(/[^a-z0-9]+/g)
    .filter((token) => token.length >= 3)
    .slice(0, 24);
}

function seemsSensitive(text: string): boolean {
  const normalized = text.toLowerCase();
  return (
    normalized.includes('password')
    || normalized.includes('private key')
    || normalized.includes('api key')
    || normalized.includes('secret')
    || normalized.includes('ssn')
    || normalized.includes('social security')
    || normalized.includes('credit card')
  );
}

function scoreCandidate(queryTokens: string[], memory: Pick<UserMemoryRecord, 'content' | 'memoryKey' | 'confidence' | 'updatedAt'>): number {
  const haystack = `${memory.memoryKey} ${memory.content}`.toLowerCase();
  const overlap = queryTokens.reduce((acc, token) => (haystack.includes(token) ? acc + 1 : acc), 0);
  const overlapScore = queryTokens.length ? overlap / queryTokens.length : 0;

  const updatedAtMs = Date.parse(memory.updatedAt);
  const ageDays = Number.isFinite(updatedAtMs)
    ? Math.max(0, (Date.now() - updatedAtMs) / (1000 * 60 * 60 * 24))
    : 30;
  const recencyBoost = Math.max(0, 1 - ageDays / 30);

  return overlapScore * 0.65 + memory.confidence * 0.25 + recencyBoost * 0.1;
}

async function resolveOwnedConversationId(userId: string, conversationId?: string): Promise<string | null> {
  if (!conversationId) return null;

  const rows = await sql`
    SELECT id
    FROM conversations
    WHERE id = ${conversationId} AND user_id = ${userId}
    LIMIT 1
  ` as Array<{ id: string }>;

  return rows[0]?.id ?? null;
}

export async function ensureUserMemoriesTable(): Promise<void> {
  if (!ensureUserMemoriesTablePromise) {
    ensureUserMemoriesTablePromise = (async () => {
      await sql`
        CREATE TABLE IF NOT EXISTS user_memories (
          id TEXT PRIMARY KEY,
          user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
          memory_type TEXT NOT NULL CHECK (memory_type IN ('preference', 'profile_fact', 'project_context', 'task_state')),
          memory_key TEXT NOT NULL,
          content TEXT NOT NULL,
          confidence DOUBLE PRECISION NOT NULL DEFAULT 0.7,
          source_conversation_id TEXT REFERENCES conversations(id) ON DELETE SET NULL,
          is_invalidated BOOLEAN NOT NULL DEFAULT FALSE,
          invalidated_at TIMESTAMP WITH TIME ZONE,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
          UNIQUE (user_id, memory_key)
        )
      `;

      await sql`
        CREATE INDEX IF NOT EXISTS idx_user_memories_user_id_updated_at
        ON user_memories(user_id, updated_at DESC)
      `;

      await sql`
        CREATE INDEX IF NOT EXISTS idx_user_memories_user_id_type
        ON user_memories(user_id, memory_type)
      `;
    })().catch((error) => {
      ensureUserMemoriesTablePromise = null;
      throw error;
    });
  }

  await ensureUserMemoriesTablePromise;
}

export function extractMemoryCandidatesFromUserMessage(message: string): MemoryCandidate[] {
  const trimmed = message.trim();
  if (!trimmed || trimmed.length < 10 || seemsSensitive(trimmed)) {
    return [];
  }

  const candidates: MemoryCandidate[] = [];

  const rememberMatch = trimmed.match(/(?:remember (?:that|this)|note that)\s+(.+)/i);
  if (rememberMatch?.[1]) {
    const content = rememberMatch[1].trim().replace(/[.?!]+$/, '');
    if (content.length >= 8 && !seemsSensitive(content)) {
      candidates.push({
        memoryType: 'profile_fact',
        memoryKey: `explicit-${normalizeMemoryKey(content.slice(0, 48))}`,
        content,
        confidence: 0.92,
      });
    }
  }

  const preferenceRegex = /\b(i\s+(?:prefer|like|love|enjoy|hate|dislike)\s+[^.?!]{3,120})/gi;
  for (const match of trimmed.matchAll(preferenceRegex)) {
    const content = match[1].trim();
    if (seemsSensitive(content)) continue;

    const conceptMatch = content.match(/\b(?:prefer|like|love|enjoy|hate|dislike)\s+(.+)/i);
    const concept = conceptMatch?.[1]?.trim() || content;

    candidates.push({
      memoryType: 'preference',
      memoryKey: `pref-${normalizeMemoryKey(concept.slice(0, 48))}`,
      content,
      confidence: 0.84,
    });
  }

  const nameMatch = trimmed.match(/\bmy name is\s+([a-z][a-z\s'-]{1,40})\b/i);
  if (nameMatch?.[1]) {
    candidates.push({
      memoryType: 'profile_fact',
      memoryKey: 'profile-name',
      content: `User name is ${nameMatch[1].trim()}`,
      confidence: 0.95,
    });
  }

  const workRegex = /\b(i\s+(?:work at|work on|am building|am working on)\s+[^.?!]{3,120})/gi;
  for (const match of trimmed.matchAll(workRegex)) {
    const content = match[1].trim();
    if (seemsSensitive(content)) continue;

    candidates.push({
      memoryType: 'project_context',
      memoryKey: `project-${normalizeMemoryKey(content.slice(0, 48))}`,
      content,
      confidence: 0.8,
    });
  }

  const deduped = new Map<string, MemoryCandidate>();
  for (const candidate of candidates) {
    const key = `${candidate.memoryType}:${candidate.memoryKey}`;
    if (!deduped.has(key) || (deduped.get(key)?.confidence ?? 0) < candidate.confidence) {
      deduped.set(key, candidate);
    }
  }

  return [...deduped.values()].slice(0, 6);
}

export function parseMemoryCommand(message: string): MemoryCommand | null {
  const trimmed = message.trim();
  if (!trimmed) return null;

  const rememberPatterns = [
    /^remember\s+this\s*:\s*(.+)$/i,
    /^remember\s+that\s*:\s*(.+)$/i,
    /^\/remember\s+(.+)$/i,
  ];

  for (const pattern of rememberPatterns) {
    const match = trimmed.match(pattern);
    if (!match?.[1]) continue;

    const content = stripTrailingPunctuation(match[1]);
    if (content.length >= 4) {
      return { action: 'remember', content };
    }
  }

  const forgetPatterns = [
    /^forget\s+this\s*:\s*(.+)$/i,
    /^forget\s*:\s*(.+)$/i,
    /^\/forget\s+(.+)$/i,
  ];

  for (const pattern of forgetPatterns) {
    const match = trimmed.match(pattern);
    if (!match?.[1]) continue;

    const query = stripTrailingPunctuation(match[1]);
    if (query.length >= 2) {
      return { action: 'forget', query };
    }
  }

  return null;
}

export async function rememberUserMemory(params: {
  userId: string;
  conversationId?: string;
  content: string;
}): Promise<void> {
  const content = stripTrailingPunctuation(params.content);
  if (!content || content.length < 4 || seemsSensitive(content)) {
    return;
  }

  const candidate: MemoryCandidate = {
    memoryType: 'profile_fact',
    memoryKey: `explicit-${normalizeMemoryKey(content.slice(0, 64))}`,
    content,
    confidence: 0.97,
  };

  await upsertUserMemoryCandidates({
    userId: params.userId,
    conversationId: params.conversationId,
    candidates: [candidate],
  });
}

export async function forgetUserMemoriesByQuery(params: {
  userId: string;
  query: string;
}): Promise<number> {
  await ensureUserMemoriesTable();

  const normalizedKey = normalizeMemoryKey(params.query);
  const fuzzyPattern = `%${params.query.trim()}%`;

  const rows = await sql`
    UPDATE user_memories
    SET is_invalidated = TRUE,
        invalidated_at = CURRENT_TIMESTAMP,
        updated_at = CURRENT_TIMESTAMP
    WHERE user_id = ${params.userId}
      AND is_invalidated = FALSE
      AND (
        memory_key = ${normalizedKey}
        OR memory_key LIKE ${`%${normalizedKey}%`}
        OR content ILIKE ${fuzzyPattern}
      )
    RETURNING id
  ` as Array<{ id: string }>;

  return rows.length;
}

export async function upsertUserMemoryCandidates(params: {
  userId: string;
  conversationId?: string;
  candidates: MemoryCandidate[];
}): Promise<void> {
  const { userId, conversationId, candidates } = params;

  if (!candidates.length) return;

  await ensureUserMemoriesTable();
  const safeConversationId = await resolveOwnedConversationId(userId, conversationId);

  for (const candidate of candidates) {
    const memoryId = `mem_${crypto.randomUUID()}`;
    const clampedConfidence = Math.max(0, Math.min(1, candidate.confidence));
    await sql`
      INSERT INTO user_memories (
        id,
        user_id,
        memory_type,
        memory_key,
        content,
        confidence,
        source_conversation_id,
        is_invalidated,
        invalidated_at,
        updated_at
      )
      VALUES (
        ${memoryId},
        ${userId},
        ${candidate.memoryType},
        ${candidate.memoryKey},
        ${candidate.content},
        ${clampedConfidence},
        ${safeConversationId},
        FALSE,
        NULL,
        CURRENT_TIMESTAMP
      )
      ON CONFLICT (user_id, memory_key) DO UPDATE SET
        memory_type = EXCLUDED.memory_type,
        content = EXCLUDED.content,
        confidence = GREATEST(user_memories.confidence, EXCLUDED.confidence),
        source_conversation_id = COALESCE(EXCLUDED.source_conversation_id, user_memories.source_conversation_id),
        is_invalidated = FALSE,
        invalidated_at = NULL,
        updated_at = CURRENT_TIMESTAMP
    `;
  }
}

export async function listUserMemories(userId: string, limit = 50): Promise<UserMemoryRecord[]> {
  await ensureUserMemoriesTable();

  const rows = await sql`
    SELECT
      id,
      user_id,
      memory_type,
      memory_key,
      content,
      confidence,
      source_conversation_id,
      created_at,
      updated_at
    FROM user_memories
    WHERE user_id = ${userId} AND is_invalidated = FALSE
    ORDER BY updated_at DESC
    LIMIT ${limit}
  ` as Array<{
    id: string;
    user_id: string;
    memory_type: MemoryType;
    memory_key: string;
    content: string;
    confidence: number;
    source_conversation_id: string | null;
    created_at: string;
    updated_at: string;
  }>;

  return rows.map((row) => ({
    id: row.id,
    userId: row.user_id,
    memoryType: row.memory_type,
    memoryKey: row.memory_key,
    content: row.content,
    confidence: row.confidence,
    sourceConversationId: row.source_conversation_id,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }));
}

export async function buildMemoryContextForPrompt(params: {
  userId: string;
  query: string;
  maxItems?: number;
}): Promise<string> {
  const { userId, query, maxItems = 5 } = params;

  const memories = await listUserMemories(userId, 200);
  if (!memories.length) return '';

  const queryTokens = tokenize(query);
  if (!queryTokens.length) return '';

  const ranked = memories
    .map((memory) => ({
      memory,
      score: scoreCandidate(queryTokens, memory),
    }))
    .filter((item) => item.score > 0.15)
    .sort((a, b) => b.score - a.score)
    .slice(0, maxItems);

  if (!ranked.length) return '';

  const lines = ranked.map(({ memory }) => `- (${memory.memoryType}) ${memory.content}`);
  return [
    'Relevant long-term user memory (may be stale; use only when relevant):',
    ...lines,
  ].join('\n');
}

export async function invalidateUserMemoryById(params: {
  userId: string;
  memoryId: string;
}): Promise<boolean> {
  await ensureUserMemoriesTable();

  const rows = await sql`
    UPDATE user_memories
    SET is_invalidated = TRUE,
        invalidated_at = CURRENT_TIMESTAMP,
        updated_at = CURRENT_TIMESTAMP
    WHERE id = ${params.memoryId} AND user_id = ${params.userId}
    RETURNING id
  ` as Array<{ id: string }>;

  return rows.length > 0;
}
