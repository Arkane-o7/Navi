import { neon, neonConfig } from '@neondatabase/serverless';

// Enable connection pooling
neonConfig.fetchConnectionCache = true;

// Lazy initialization to avoid build-time errors
let _sql: ReturnType<typeof neon> | null = null;

export function sql(strings: TemplateStringsArray, ...values: unknown[]) {
  if (!_sql) {
    if (!process.env.DATABASE_URL) {
      throw new Error('DATABASE_URL is not set');
    }
    _sql = neon(process.env.DATABASE_URL);
  }
  return _sql(strings, ...values);
}

// Initialize database schema
export async function initializeDatabase() {
  await sql`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      email TEXT UNIQUE NOT NULL,
      name TEXT,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
    )
  `;

  await sql`
    CREATE TABLE IF NOT EXISTS conversations (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      title TEXT,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
    )
  `;

  await sql`
    CREATE TABLE IF NOT EXISTS messages (
      id TEXT PRIMARY KEY,
      conversation_id TEXT NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
      role TEXT NOT NULL CHECK (role IN ('user', 'assistant')),
      content TEXT NOT NULL,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
    )
  `;

  await sql`
    CREATE INDEX IF NOT EXISTS idx_conversations_user_id ON conversations(user_id)
  `;

  await sql`
    CREATE INDEX IF NOT EXISTS idx_messages_conversation_id ON messages(conversation_id)
  `;

  // Subscriptions table for Stripe integration
  await sql`
    CREATE TABLE IF NOT EXISTS subscriptions (
      id TEXT PRIMARY KEY,
      user_id TEXT UNIQUE NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      stripe_customer_id TEXT,
      stripe_subscription_id TEXT,
      tier TEXT NOT NULL DEFAULT 'free' CHECK (tier IN ('free', 'pro')),
      status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'canceled', 'past_due', 'trialing')),
      current_period_end TIMESTAMP WITH TIME ZONE,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
    )
  `;

  await sql`
    CREATE INDEX IF NOT EXISTS idx_subscriptions_stripe_customer ON subscriptions(stripe_customer_id)
  `;
}

// Helper functions for subscriptions
export async function getSubscription(userId: string) {
  const result = await sql`
    SELECT tier, status, period_end
    FROM subscriptions
    WHERE user_id = ${userId}
  ` as Array<{ tier: string; status: string; period_end: string | null }>;

  if (result.length === 0) {
    // Return default free tier for users without subscription record
    return { tier: 'free' as const, status: 'active' as const, periodEnd: null };
  }

  return {
    tier: result[0].tier as 'free' | 'pro',
    status: result[0].status as 'active' | 'canceled' | 'past_due' | 'trialing',
    periodEnd: result[0].period_end,
  };
}

export async function upsertSubscription(data: {
  userId: string;
  stripeCustomerId?: string;
  stripeSubscriptionId?: string;
  tier: 'free' | 'pro';
  status: 'active' | 'canceled' | 'past_due' | 'trialing';
  currentPeriodEnd?: Date;
}) {
  const id = `sub_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;

  await sql`
    INSERT INTO subscriptions (id, user_id, stripe_customer_id, stripe_subscription_id, tier, status, current_period_end, updated_at)
    VALUES (
      ${id},
      ${data.userId},
      ${data.stripeCustomerId || null},
      ${data.stripeSubscriptionId || null},
      ${data.tier},
      ${data.status},
      ${data.currentPeriodEnd?.toISOString() || null},
      CURRENT_TIMESTAMP
    )
    ON CONFLICT (user_id) DO UPDATE SET
      stripe_customer_id = COALESCE(EXCLUDED.stripe_customer_id, subscriptions.stripe_customer_id),
      stripe_subscription_id = COALESCE(EXCLUDED.stripe_subscription_id, subscriptions.stripe_subscription_id),
      tier = EXCLUDED.tier,
      status = EXCLUDED.status,
      current_period_end = EXCLUDED.current_period_end,
      updated_at = CURRENT_TIMESTAMP
  `;
}
