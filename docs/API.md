# Navi API Reference

This document describes the API currently implemented in `apps/api/src/app/api/**/route.ts`.

## Base URLs

- Development: `http://localhost:3001`
- Production: `https://navi-search.vercel.app`

## Auth model

- Authenticated routes expect: `Authorization: Bearer <access_token>`
- Several routes return `401` if token is missing/invalid.
- `/api/chat` supports anonymous requests (with free-tier limits keyed by user ID or IP fallback).

---

## Endpoints

### Health

### `GET /api/health`

Returns:

```json
{
  "status": "ok",
  "timestamp": "2026-02-15T00:00:00.000Z"
}
```

---

### Chat

### `POST /api/chat`

Body:

```json
{
  "message": "What changed in AI this week?",
  "history": [
    { "role": "user", "content": "Hi" },
    { "role": "assistant", "content": "Hey!" }
  ]
}
```

Behavior:

- Validates JSON + `message`
- Detects user ID from bearer token (if present)
- Applies free-tier daily cap (`20/day`) via Redis
- May augment prompt with Tavily search context when `needsSearch(message)` is true
- Streams Groq response as Server-Sent Events (SSE)

SSE stream shape:

```text
data: {"content":"Hello"}

data: {"content":" there"}

data: [DONE]
```

Typical errors:

- `400` `BAD_REQUEST`
- `429` `DAILY_LIMIT_REACHED`
- `500` `INTERNAL_ERROR`

---

### Authentication

### `GET /api/auth/login`

- Builds WorkOS authorization URL and redirects to it.
- Optional query params:
  - `redirect_uri`
  - `state`

### `GET /api/auth/callback`

- Receives WorkOS callback (`code`/`error` params).
- On success:
  - exchanges code for tokens
  - upserts user in DB
  - redirects to deep link:

```text
navi://auth/callback?access_token=...&refresh_token=...&user_id=...&state=...
```

- On failure redirects to:

```text
navi://auth/error?error=...&description=...
```

### `POST /api/auth/refresh`

Body:

```json
{ "refreshToken": "..." }
```

Returns:

```json
{
  "accessToken": "...",
  "refreshToken": "..."
}
```

Errors:
- `400` (missing token)
- `401` (refresh failed)

---

### User

### `GET /api/user`

Requires bearer token.

Returns:

```json
{
  "success": true,
  "data": {
    "user": {
      "id": "...",
      "email": "...",
      "name": "...",
      "createdAt": "...",
      "updatedAt": "..."
    },
    "subscription": {
      "tier": "free",
      "status": "active",
      "periodEnd": null,
      "dailyMessagesUsed": 0,
      "dailyMessagesLimit": 20
    }
  }
}
```

Errors:
- `401` `UNAUTHORIZED`
- `404` `NOT_FOUND`
- `500` `INTERNAL_ERROR`

---

### Conversations

### `GET /api/conversations`

Requires bearer token.

Returns (latest first, max 50):

```json
{
  "success": true,
  "data": [
    {
      "id": "...",
      "title": "...",
      "createdAt": "...",
      "updatedAt": "..."
    }
  ]
}
```

### `POST /api/conversations`

Requires bearer token.

Body:

```json
{
  "id": "optional-conversation-id",
  "title": "optional-title"
}
```

Returns:

```json
{
  "success": true,
  "data": {
    "conversation": {
      "id": "...",
      "title": "..."
    }
  }
}
```

### `DELETE /api/conversations?id=<conversationId>`

Requires bearer token.

Returns:

```json
{ "success": true }
```

---

### Messages

### `GET /api/messages?conversationId=<id>`

Requires bearer token.

Returns:

```json
{
  "success": true,
  "data": {
    "messages": [
      {
        "id": "...",
        "role": "user",
        "content": "...",
        "timestamp": 1730000000000
      }
    ]
  }
}
```

### `POST /api/messages`

Requires bearer token.

Body:

```json
{
  "conversationId": "...",
  "id": "optional-message-id",
  "role": "user",
  "content": "hello"
}
```

Returns:

```json
{
  "success": true,
  "data": {
    "message": {
      "id": "...",
      "conversationId": "...",
      "role": "user",
      "content": "hello"
    }
  }
}
```

---

### Subscription

### `GET /api/subscription/checkout`

Browser-style flow.

Query:
- `userId` (required)

Behavior:
- creates/reuses Stripe customer
- creates Stripe checkout session
- redirects to Stripe checkout URL

### `POST /api/subscription/checkout`

API-style flow; requires bearer token.

Returns:

```json
{
  "success": true,
  "data": {
    "checkoutUrl": "https://checkout.stripe.com/...",
    "sessionId": "cs_..."
  }
}
```

### `GET /api/subscription/success`

Returns static success HTML page.

### `GET /api/subscription/canceled`

Returns static canceled HTML page.

### `POST /api/subscription/webhook`

Stripe webhook endpoint.

Requires:
- `stripe-signature` header
- `STRIPE_WEBHOOK_SECRET`

Handled events:
- `checkout.session.completed`
- `customer.subscription.updated`
- `customer.subscription.deleted`
- `invoice.payment_failed`

---

### Debug endpoints

### `GET /api/debug`

Returns environment readiness flags (non-secret booleans/short prefix).

### `POST /api/debug`

Performs a direct Groq test completion.

### `GET /api/debug/message-count?userId=<optional>`

Reads current Redis daily count for user (default `test_user`).

### `POST /api/debug/message-count`

Body:

```json
{ "userId": "optional" }
```

Increments Redis daily count.

---

## Notes

- CORS is enabled for `/api/:path*` via both `src/proxy.ts` and `vercel.json` headers.
- Subscription period in `/api/user` depends on `getSubscription()` behavior in `src/lib/db.ts`.
