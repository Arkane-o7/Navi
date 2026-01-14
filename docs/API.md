# API Reference

This document provides a complete reference for the Navi API endpoints.

## Base URL

- **Development**: `http://localhost:3001`
- **Production**: `https://navi-search.vercel.app`

## Authentication

Most endpoints support both authenticated and anonymous access. Authenticated requests get additional features like cloud sync and higher rate limits.

### Authorization Header

```
Authorization: Bearer <access_token>
```

The access token is a JWT obtained from the WorkOS authentication flow.

---

## Endpoints

### Chat

#### `POST /api/chat`

Stream a chat completion response.

**Request Body:**

```json
{
  "message": "What is the capital of France?",
  "history": [
    { "role": "user", "content": "Hello" },
    { "role": "assistant", "content": "Hi! How can I help you?" }
  ]
}
```

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `message` | string | Yes | The user's message |
| `history` | array | No | Previous messages for context |

**Response (SSE Stream):**

```
data: {"content":"The"}

data: {"content":" capital"}

data: {"content":" of"}

data: {"content":" France"}

data: {"content":" is"}

data: {"content":" Paris."}

data: [DONE]
```

**Error Responses:**

| Status | Code | Description |
|--------|------|-------------|
| 400 | `BAD_REQUEST` | Message is required |
| 429 | `DAILY_LIMIT_REACHED` | Free tier limit exceeded |
| 500 | `INTERNAL_ERROR` | Server error |

**Example Error:**

```json
{
  "success": false,
  "error": {
    "code": "DAILY_LIMIT_REACHED",
    "message": "You've used all 20 messages for today. Come back tomorrow!",
    "remaining": 0,
    "resetAt": 1705363200
  }
}
```

---

### Authentication

#### `GET /api/auth/login`

Initiate the OAuth authentication flow.

**Query Parameters:**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `redirect` | string | No | Custom redirect URI |

**Response:** Redirects to WorkOS AuthKit login page.

---

#### `GET /api/auth/callback`

Handle OAuth callback from WorkOS.

**Query Parameters:**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `code` | string | Yes | Authorization code from WorkOS |

**Response:** Redirects to `navi://auth/callback` with tokens or `navi://auth/error` on failure.

**Success Redirect:**
```
navi://auth/callback?access_token=...&refresh_token=...&user_id=...
```

**Error Redirect:**
```
navi://auth/error?error=auth_failed&description=...
```

---

#### `POST /api/auth/refresh`

Refresh an expired access token.

**Request Body:**

```json
{
  "refreshToken": "refresh_token_here"
}
```

**Response:**

```json
{
  "success": true,
  "accessToken": "new_access_token",
  "refreshToken": "new_refresh_token"
}
```

---

### User

#### `GET /api/user`

Get the current authenticated user's information.

**Headers:** Requires `Authorization: Bearer <token>`

**Response:**

```json
{
  "success": true,
  "user": {
    "id": "user_01234567890",
    "email": "user@example.com",
    "firstName": "John",
    "lastName": "Doe",
    "profilePictureUrl": "https://..."
  }
}
```

**Error Response (401):**

```json
{
  "success": false,
  "error": {
    "code": "UNAUTHORIZED",
    "message": "Authentication required"
  }
}
```

---

### Conversations

#### `GET /api/conversations`

List all conversations for the authenticated user.

**Headers:** Requires `Authorization: Bearer <token>`

**Query Parameters:**

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `limit` | number | 50 | Max conversations to return |
| `offset` | number | 0 | Pagination offset |

**Response:**

```json
{
  "success": true,
  "conversations": [
    {
      "id": "conv_abc123",
      "title": "Chat about Paris",
      "createdAt": "2024-01-15T10:30:00Z",
      "updatedAt": "2024-01-15T10:35:00Z"
    }
  ],
  "total": 15
}
```

---

#### `POST /api/conversations`

Create a new conversation.

**Headers:** Requires `Authorization: Bearer <token>`

**Request Body:**

```json
{
  "id": "conv_abc123",
  "title": "New Conversation"
}
```

**Response:**

```json
{
  "success": true,
  "conversation": {
    "id": "conv_abc123",
    "title": "New Conversation",
    "createdAt": "2024-01-15T10:30:00Z",
    "updatedAt": "2024-01-15T10:30:00Z"
  }
}
```

---

#### `DELETE /api/conversations?id=conv_abc123`

Delete a conversation and all its messages.

**Headers:** Requires `Authorization: Bearer <token>`

**Response:**

```json
{
  "success": true
}
```

---

### Messages

#### `GET /api/messages`

Get messages for a conversation.

**Headers:** Requires `Authorization: Bearer <token>`

**Query Parameters:**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `conversationId` | string | Yes | The conversation ID |
| `limit` | number | No | Max messages (default: 100) |
| `offset` | number | No | Pagination offset |

**Response:**

```json
{
  "success": true,
  "messages": [
    {
      "id": "msg_abc123",
      "conversationId": "conv_abc123",
      "role": "user",
      "content": "Hello!",
      "createdAt": "2024-01-15T10:30:00Z"
    },
    {
      "id": "msg_abc124",
      "conversationId": "conv_abc123",
      "role": "assistant",
      "content": "Hi! How can I help you?",
      "createdAt": "2024-01-15T10:30:05Z"
    }
  ]
}
```

---

#### `POST /api/messages`

Save messages to a conversation.

**Headers:** Requires `Authorization: Bearer <token>`

**Request Body:**

```json
{
  "conversationId": "conv_abc123",
  "messages": [
    {
      "id": "msg_abc125",
      "role": "user",
      "content": "What is AI?"
    },
    {
      "id": "msg_abc126",
      "role": "assistant",
      "content": "AI stands for Artificial Intelligence..."
    }
  ]
}
```

**Response:**

```json
{
  "success": true,
  "savedCount": 2
}
```

---

### Subscription

#### `GET /api/subscription`

Get the current user's subscription status.

**Headers:** Requires `Authorization: Bearer <token>`

**Response:**

```json
{
  "success": true,
  "subscription": {
    "tier": "free",
    "status": "active",
    "periodEnd": null
  }
}
```

**Tier Values:** `free`, `pro`

**Status Values:** `active`, `canceled`, `past_due`, `trialing`

---

#### `POST /api/subscription/checkout`

Create a Stripe checkout session for upgrading to Pro.

**Headers:** Requires `Authorization: Bearer <token>`

**Response:**

```json
{
  "success": true,
  "url": "https://checkout.stripe.com/..."
}
```

---

#### `POST /api/subscription/portal`

Create a Stripe billing portal session.

**Headers:** Requires `Authorization: Bearer <token>`

**Response:**

```json
{
  "success": true,
  "url": "https://billing.stripe.com/..."
}
```

---

#### `POST /api/subscription/webhook`

Handle Stripe webhook events.

**Headers:** Requires `stripe-signature` header

**Events Handled:**
- `checkout.session.completed`
- `customer.subscription.updated`
- `customer.subscription.deleted`
- `invoice.payment_failed`

---

### Health

#### `GET /api/health`

Health check endpoint.

**Response:**

```json
{
  "status": "ok",
  "timestamp": "2024-01-15T10:30:00Z"
}
```

---

## Rate Limits

### Free Tier
- **20 messages per day** (resets at midnight UTC)
- Rate limit tracked by user ID (authenticated) or IP address (anonymous)

### Pro Tier
- **Unlimited messages**
- Priority queue for API requests

### Rate Limit Headers

When approaching or exceeding limits:

```
X-RateLimit-Remaining: 5
X-RateLimit-Reset: 1705363200
```

---

## Error Handling

All error responses follow a consistent format:

```json
{
  "success": false,
  "error": {
    "code": "ERROR_CODE",
    "message": "Human-readable description",
    // Additional fields depending on error type
  }
}
```

### Error Codes

| Code | HTTP Status | Description |
|------|-------------|-------------|
| `BAD_REQUEST` | 400 | Invalid request body or parameters |
| `UNAUTHORIZED` | 401 | Missing or invalid authentication |
| `FORBIDDEN` | 403 | Insufficient permissions |
| `NOT_FOUND` | 404 | Resource not found |
| `DAILY_LIMIT_REACHED` | 429 | Free tier daily limit exceeded |
| `RATE_LIMITED` | 429 | Too many requests |
| `INTERNAL_ERROR` | 500 | Server error |

---

## SDK Usage

### TypeScript/JavaScript

```typescript
const API_URL = 'https://navi-search.vercel.app';

// Stream chat
async function chat(message: string, history: Message[] = []) {
  const response = await fetch(`${API_URL}/api/chat`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${accessToken}`,
    },
    body: JSON.stringify({ message, history }),
  });

  const reader = response.body?.getReader();
  const decoder = new TextDecoder();

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    const chunk = decoder.decode(value);
    const lines = chunk.split('\n');

    for (const line of lines) {
      if (line.startsWith('data: ')) {
        const data = line.slice(6);
        if (data === '[DONE]') return;
        
        try {
          const parsed = JSON.parse(data);
          console.log(parsed.content);
        } catch {}
      }
    }
  }
}
```

### cURL Examples

```bash
# Health check
curl https://navi-search.vercel.app/api/health

# Chat (streaming)
curl -X POST https://navi-search.vercel.app/api/chat \
  -H "Content-Type: application/json" \
  -d '{"message": "Hello!"}'

# Get user (authenticated)
curl https://navi-search.vercel.app/api/user \
  -H "Authorization: Bearer YOUR_TOKEN"
```

---

## Webhooks (Stripe)

Configure your Stripe webhook endpoint to point to:

```
https://your-domain.vercel.app/api/subscription/webhook
```

### Required Events

Enable these events in your Stripe dashboard:

- `checkout.session.completed`
- `customer.subscription.created`
- `customer.subscription.updated`
- `customer.subscription.deleted`
- `invoice.payment_succeeded`
- `invoice.payment_failed`

### Webhook Secret

Set the `STRIPE_WEBHOOK_SECRET` environment variable with your webhook signing secret.
