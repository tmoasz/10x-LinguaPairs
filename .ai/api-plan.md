# REST API Plan - 10x-LinguaPairs

## 1. Resources

| Resource   | Database Table     | Description                                      |
| ---------- | ------------------ | ------------------------------------------------ |
| Users      | `profiles`         | User profiles and settings (1:1 with auth.users) |
| Languages  | `languages`        | Global language dictionary (ISO 639-1 codes)     |
| Decks      | `decks`            | User's vocabulary decks with language pairs      |
| Pairs      | `pairs`            | Individual vocabulary pairs within decks         |
| Tags       | `tags`             | Global tags for pair categorization              |
| Progress   | `user_pair_state`  | User's learning progress per pair (Leitner SRS)  |
| ShareLinks | `deck_share_links` | Token-based sharing for unlisted decks           |
| Generation | N/A                | AI-powered vocabulary generation service         |

---

## 2. Endpoints

### 2.1 Authentication

#### POST /api/auth/signup

Register a new user account.

**Request Body:**

```json
{
  "email": "user@example.com",
  "password": "SecurePass123!",
  "username": "johndoe"
}
```

**Response (201 Created):**

```json
{
  "user": {
    "id": "uuid",
    "email": "user@example.com",
    "username": "johndoe"
  },
  "session": {
    "access_token": "jwt_token",
    "refresh_token": "jwt_token",
    "expires_in": 3600
  }
}
```

**Error Responses:**

- `400 Bad Request` - Invalid email format or weak password
- `409 Conflict` - Email or username already exists

---

#### POST /api/auth/login

Authenticate user and receive session tokens.

**Request Body:**

```json
{
  "email": "user@example.com",
  "password": "SecurePass123!"
}
```

**Response (200 OK):**

```json
{
  "user": {
    "id": "uuid",
    "email": "user@example.com",
    "username": "johndoe"
  },
  "session": {
    "access_token": "jwt_token",
    "refresh_token": "jwt_token",
    "expires_in": 3600
  }
}
```

**Error Responses:**

- `401 Unauthorized` - Invalid credentials
- `400 Bad Request` - Missing email or password

---

#### POST /api/auth/logout

End current user session.

**Headers:**

- `Authorization: Bearer {access_token}`

**Response (204 No Content)**

**Error Responses:**

- `401 Unauthorized` - Invalid or expired token

---

#### POST /api/auth/refresh

Refresh access token using refresh token.

**Request Body:**

```json
{
  "refresh_token": "jwt_token"
}
```

**Response (200 OK):**

```json
{
  "access_token": "new_jwt_token",
  "expires_in": 3600
}
```

**Error Responses:**

- `401 Unauthorized` - Invalid or expired refresh token

---

### 2.2 Users / Profiles

#### GET /api/users/me

Get current authenticated user profile.

**Headers:**

- `Authorization: Bearer {access_token}`

**Response (200 OK):**

```json
{
  "id": "uuid",
  "username": "johndoe",
  "display_name": "John Doe",
  "timezone": "Europe/Warsaw",
  "settings": {
    "theme": "dark",
    "notifications_enabled": true
  },
  "created_at": "2025-01-15T10:00:00Z",
  "updated_at": "2025-01-15T10:00:00Z"
}
```

**Error Responses:**

- `401 Unauthorized` - Not authenticated

---

#### PATCH /api/users/me

Update current user profile.

**Headers:**

- `Authorization: Bearer {access_token}`

**Request Body:**

```json
{
  "display_name": "John Smith",
  "timezone": "Europe/London",
  "settings": {
    "theme": "light"
  }
}
```

**Response (200 OK):**

```json
{
  "id": "uuid",
  "username": "johndoe",
  "display_name": "John Smith",
  "timezone": "Europe/London",
  "settings": {
    "theme": "light"
  },
  "updated_at": "2025-01-16T14:30:00Z"
}
```

**Error Responses:**

- `401 Unauthorized` - Not authenticated
- `400 Bad Request` - Invalid timezone or settings format

---

#### GET /api/users/me/quota

Get current user's generation quota and usage.

**Headers:**

- `Authorization: Bearer {access_token}`

**Response (200 OK):**

```json
{
  "daily_limit": 3,
  "used_today": 1,
  "remaining": 2,
  "reset_at": "2025-01-17T00:00:00Z"
}
```

**Error Responses:**

- `401 Unauthorized` - Not authenticated

---

### 2.3 Languages

#### GET /api/languages

List all active languages available for deck creation.

**Query Parameters:**

- `is_active` (boolean, default: true) - Filter by active status
- `sort` (string, default: "sort_order") - Sort field

**Response (200 OK):**

```json
{
  "languages": [
    {
      "id": "uuid",
      "code": "pl",
      "name": "Polish",
      "name_native": "Polski",
      "flag_emoji": "🇵🇱",
      "is_active": true,
      "sort_order": 1
    },
    {
      "id": "uuid",
      "code": "en-US",
      "name": "English (US)",
      "name_native": "English",
      "flag_emoji": "🇺🇸",
      "is_active": true,
      "sort_order": 2
    }
  ],
  "count": 6
}
```

**Error Responses:**

- None (public endpoint)

---

#### GET /api/languages/:id

Get details of a specific language.

**Response (200 OK):**

```json
{
  "id": "uuid",
  "code": "pl",
  "name": "Polish",
  "name_native": "Polski",
  "flag_emoji": "🇵🇱",
  "is_active": true,
  "sort_order": 1,
  "created_at": "2025-01-01T00:00:00Z"
}
```

**Error Responses:**

- `404 Not Found` - Language not found

---

### 2.4 Decks

#### GET /api/decks

List user's decks or public decks.

**Headers:**

- `Authorization: Bearer {access_token}` (optional for public decks)

**Query Parameters:**

- `visibility` (enum: "private" | "public" | "unlisted", optional) - Filter by visibility
- `lang_a` (uuid, optional) - Filter by source language
- `lang_b` (uuid, optional) - Filter by target language
- `page` (integer, default: 1) - Page number
- `limit` (integer, default: 20, max: 100) - Items per page
- `sort` (string, default: "created_at") - Sort field
- `order` (enum: "asc" | "desc", default: "desc") - Sort order

**Response (200 OK):**

```json
{
  "decks": [
    {
      "id": "uuid",
      "owner_user_id": "uuid",
      "title": "Travel Vocabulary",
      "description": "Essential phrases for traveling",
      "lang_a": {
        "id": "uuid",
        "code": "pl",
        "name": "Polish"
      },
      "lang_b": {
        "id": "uuid",
        "code": "en-US",
        "name": "English (US)"
      },
      "visibility": "public",
      "pairs_count": 30,
      "created_at": "2025-01-15T10:00:00Z",
      "updated_at": "2025-01-15T10:00:00Z"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 45,
    "total_pages": 3
  }
}
```

**Error Responses:**

- `400 Bad Request` - Invalid query parameters
- `401 Unauthorized` - Required for private decks

---

#### GET /api/decks/:id

Get detailed information about a specific deck.

**Headers:**

- `Authorization: Bearer {access_token}` (required for private/unlisted decks)

**Response (200 OK):**

```json
{
  "id": "uuid",
  "owner_user_id": "uuid",
  "owner": {
    "username": "johndoe",
    "display_name": "John Doe"
  },
  "title": "Travel Vocabulary",
  "description": "Essential phrases for traveling",
  "lang_a": {
    "id": "uuid",
    "code": "pl",
    "name": "Polish",
    "flag_emoji": "🇵🇱"
  },
  "lang_b": {
    "id": "uuid",
    "code": "en-US",
    "name": "English (US)",
    "flag_emoji": "🇺🇸"
  },
  "visibility": "public",
  "pairs_count": 30,
  "created_at": "2025-01-15T10:00:00Z",
  "updated_at": "2025-01-15T10:00:00Z"
}
```

**Error Responses:**

- `404 Not Found` - Deck not found or not accessible
- `403 Forbidden` - No permission to access private deck

---

#### POST /api/decks

Create a new deck.

**Headers:**

- `Authorization: Bearer {access_token}`

**Request Body:**

```json
{
  "title": "Business English",
  "description": "Professional vocabulary for business meetings",
  "lang_a": "uuid-of-polish",
  "lang_b": "uuid-of-english",
  "visibility": "private"
}
```

**Response (201 Created):**

```json
{
  "id": "uuid",
  "owner_user_id": "uuid",
  "title": "Business English",
  "description": "Professional vocabulary for business meetings",
  "lang_a": {
    "id": "uuid",
    "code": "pl",
    "name": "Polish"
  },
  "lang_b": {
    "id": "uuid",
    "code": "en-US",
    "name": "English (US)"
  },
  "visibility": "private",
  "pairs_count": 0,
  "created_at": "2025-01-16T15:00:00Z",
  "updated_at": "2025-01-16T15:00:00Z"
}
```

**Validation Rules:**

- `title`: Required, 1-200 characters
- `description`: Required, 1-1000 characters
- `lang_a` and `lang_b`: Must be different, must reference valid language IDs
- `visibility`: Must be one of: "private", "public", "unlisted"

**Error Responses:**

- `401 Unauthorized` - Not authenticated
- `400 Bad Request` - Validation failed (same languages, invalid language IDs)
- `422 Unprocessable Entity` - Invalid data format

---

#### PATCH /api/decks/:id

Update deck metadata.

**Headers:**

- `Authorization: Bearer {access_token}`

**Request Body:**

```json
{
  "title": "Advanced Business English",
  "description": "Updated description",
  "visibility": "public"
}
```

**Response (200 OK):**

```json
{
  "id": "uuid",
  "title": "Advanced Business English",
  "description": "Updated description",
  "visibility": "public",
  "updated_at": "2025-01-16T16:00:00Z"
}
```

**Business Rules:**

- `lang_a` and `lang_b` CANNOT be changed if deck has pairs (trigger protection)
- Only owner can update

**Error Responses:**

- `401 Unauthorized` - Not authenticated
- `403 Forbidden` - Not the deck owner
- `404 Not Found` - Deck not found
- `409 Conflict` - Cannot change languages when pairs exist

---

#### DELETE /api/decks/:id

Soft delete a deck.

**Headers:**

- `Authorization: Bearer {access_token}`

**Response (204 No Content)**

**Error Responses:**

- `401 Unauthorized` - Not authenticated
- `403 Forbidden` - Not the deck owner
- `404 Not Found` - Deck not found

---

### 2.5 Pairs

#### GET /api/decks/:deckId/pairs

List all pairs in a deck.

**Headers:**

- `Authorization: Bearer {access_token}` (required for private decks)

**Query Parameters:**

- `search` (string, optional) - Full-text search query
- `tags` (string, comma-separated UUIDs, optional) - Filter by tag IDs
- `page` (integer, default: 1)
- `limit` (integer, default: 30, max: 100)
- `sort` (string, default: "added_at") - Sort field
- `order` (enum: "asc" | "desc", default: "desc")

**Response (200 OK):**

```json
{
  "pairs": [
    {
      "id": "uuid",
      "deck_id": "uuid",
      "term_a": "Cześć",
      "term_b": "Hello",
      "tags": [
        {
          "id": "uuid",
          "slug": "greetings",
          "name": "Greetings"
        }
      ],
      "added_at": "2025-01-15T10:00:00Z",
      "updated_at": "2025-01-15T10:00:00Z"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 30,
    "total": 30,
    "total_pages": 1
  }
}
```

**Error Responses:**

- `404 Not Found` - Deck not found or not accessible
- `403 Forbidden` - No permission to access deck

---

#### GET /api/decks/:deckId/pairs/:id

Get details of a specific pair.

**Headers:**

- `Authorization: Bearer {access_token}` (required for private decks)

**Response (200 OK):**

```json
{
  "id": "uuid",
  "deck_id": "uuid",
  "term_a": "Cześć",
  "term_b": "Hello",
  "term_a_norm": "czesc",
  "term_b_norm": "hello",
  "tags": [
    {
      "id": "uuid",
      "slug": "greetings",
      "name": "Greetings"
    }
  ],
  "added_at": "2025-01-15T10:00:00Z",
  "updated_at": "2025-01-15T10:00:00Z"
}
```

**Error Responses:**

- `404 Not Found` - Pair or deck not found
- `403 Forbidden` - No permission to access

---

#### POST /api/decks/:deckId/pairs

Create a new pair manually (with auto-translation if one side is missing).

**Headers:**

- `Authorization: Bearer {access_token}`

**Request Body:**

```json
{
  "term_a": "Cześć",
  "term_b": "Hello",
  "tags": ["uuid1", "uuid2"]
}
```

**OR (auto-translation):**

```json
{
  "term_a": "Cześć",
  "auto_translate": true
}
```

**Response (201 Created):**

```json
{
  "id": "uuid",
  "deck_id": "uuid",
  "term_a": "Cześć",
  "term_b": "Hello",
  "tags": [
    {
      "id": "uuid",
      "slug": "greetings",
      "name": "Greetings"
    }
  ],
  "added_at": "2025-01-16T10:00:00Z",
  "updated_at": "2025-01-16T10:00:00Z"
}
```

**Validation Rules:**

- Each term must be ≤ 8 tokens
- Duplicate check: `(deck_id, term_a_norm, term_b_norm)` uniqueness
- If `auto_translate: true`, one term must be provided and the other will be generated

**Error Responses:**

- `401 Unauthorized` - Not authenticated
- `403 Forbidden` - Not the deck owner
- `400 Bad Request` - Validation failed (too long, invalid format)
- `409 Conflict` - Duplicate pair exists in deck
- `404 Not Found` - Deck not found

---

#### PATCH /api/decks/:deckId/pairs/:id

Update an existing pair.

**Headers:**

- `Authorization: Bearer {access_token}`

**Request Body:**

```json
{
  "term_a": "Witaj",
  "term_b": "Hi",
  "tags": ["uuid1"]
}
```

**Response (200 OK):**

```json
{
  "id": "uuid",
  "deck_id": "uuid",
  "term_a": "Witaj",
  "term_b": "Hi",
  "tags": [
    {
      "id": "uuid",
      "slug": "greetings",
      "name": "Greetings"
    }
  ],
  "updated_at": "2025-01-16T11:00:00Z"
}
```

**Error Responses:**

- `401 Unauthorized` - Not authenticated
- `403 Forbidden` - Not the deck owner
- `404 Not Found` - Pair or deck not found
- `409 Conflict` - Updated pair would create duplicate

---

#### DELETE /api/decks/:deckId/pairs/:id

Soft delete a pair.

**Headers:**

- `Authorization: Bearer {access_token}`

**Response (204 No Content)**

**Error Responses:**

- `401 Unauthorized` - Not authenticated
- `403 Forbidden` - Not the deck owner
- `404 Not Found` - Pair or deck not found

---

#### POST /api/decks/:deckId/pairs/:id/flag

Flag a pair as incorrect (error reporting).

**Headers:**

- `Authorization: Bearer {access_token}`

**Request Body:**

```json
{
  "reason": "Incorrect translation",
  "details": "The term 'Hello' should be 'Hi' in this context"
}
```

**Response (200 OK):**

```json
{
  "id": "uuid",
  "pair_id": "uuid",
  "flagged_by": "uuid",
  "reason": "Incorrect translation",
  "details": "The term 'Hello' should be 'Hi' in this context",
  "flagged_at": "2025-01-16T12:00:00Z"
}
```

**Error Responses:**

- `401 Unauthorized` - Not authenticated
- `404 Not Found` - Pair not found
- `400 Bad Request` - Missing reason

---

### 2.6 Generation (AI-Powered)

#### POST /api/generate/from-topic

Generate 30 vocabulary pairs from a predefined topic.

**Headers:**

- `Authorization: Bearer {access_token}`

**Request Body:**

```json
{
  "topic_id": "travel",
  "deck_id": "uuid",
  "content_type": "auto",
  "register": "neutral"
}
```

**Request Parameters:**

- `topic_id`: One of 20 predefined topic IDs
- `deck_id`: Target deck UUID (must belong to authenticated user)
- `content_type`: "auto" (60% words, 30% phrases, 10% mini-phrases) | "words" | "phrases" | "mini-phrases"
- `register`: "neutral" | "informal" | "formal"

**Response (201 Created):**

```json
{
  "generation_id": "uuid",
  "deck_id": "uuid",
  "pairs_generated": 30,
  "pairs": [
    {
      "id": "uuid",
      "term_a": "lotnisko",
      "term_b": "airport",
      "type": "words",
      "register": "neutral",
      "source": "ai_generated",
      "tags": [
        {
          "id": "uuid",
          "slug": "travel",
          "name": "Travel"
        }
      ]
    }
  ],
  "metadata": {
    "generation_time_ms": 7800,
    "cache_hit": false,
    "cost_usd": 0.015,
    "prompt_hash": "sha256_hash"
  },
  "quota": {
    "used_today": 2,
    "remaining": 1
  }
}
```

**Validation Rules:**

- User must have remaining daily quota (3 generations/day)
- Deck must belong to authenticated user
- Each pair ≤ 8 tokens per side

**Error Responses:**

- `401 Unauthorized` - Not authenticated
- `403 Forbidden` - Daily quota exceeded
- `404 Not Found` - Deck not found or not owned by user
- `400 Bad Request` - Invalid topic_id or parameters
- `500 Internal Server Error` - AI generation failed
- `503 Service Unavailable` - AI service temporarily unavailable

---

#### POST /api/generate/from-text

Generate 30 vocabulary pairs from custom text description.

**Headers:**

- `Authorization: Bearer {access_token}`

**Request Body:**

```json
{
  "text": "I'm planning a trip to Italy and need vocabulary for...",
  "deck_id": "uuid",
  "content_type": "auto",
  "register": "neutral",
  "exclude_pairs": ["uuid1", "uuid2"]
}
```

**Request Parameters:**

- `text`: Custom description (1-5000 characters)
- Other parameters same as `/api/generate/from-topic`

**Response (201 Created):**
Same structure as `/api/generate/from-topic`

**Validation Rules:**

- Text length: 1-5000 characters
- Same quota as topic-based generation

**Error Responses:**
Same as `/api/generate/from-topic`, plus:

- `413 Payload Too Large` - Text exceeds 5000 characters

---

#### POST /api/generate/extend

Generate additional 10 pairs for existing deck ("+10" feature).

**Headers:**

- `Authorization: Bearer {access_token}`

**Request Body:**

```json
{
  "deck_id": "uuid",
  "base_generation_id": "uuid",
  "content_type": "auto",
  "register": "neutral"
}
```

**Response (201 Created):**

```json
{
  "generation_id": "uuid",
  "deck_id": "uuid",
  "pairs_generated": 10,
  "pairs": [...],
  "metadata": {
    "generation_time_ms": 3200,
    "excluded_count": 45,
    "cache_hit": false
  },
  "quota": {
    "used_today": 3,
    "remaining": 0
  }
}
```

**Business Rules:**

- Excludes all existing pairs in deck (including flagged and known)
- Counts against daily quota (1 generation)
- Uses same prompt context as base generation

**Error Responses:**

- `401 Unauthorized` - Not authenticated
- `403 Forbidden` - Daily quota exceeded or not deck owner
- `404 Not Found` - Deck or base generation not found
- `409 Conflict` - Cannot generate more unique pairs

---

### 2.7 Progress Tracking (Leitner SRS)

#### GET /api/decks/:deckId/progress

Get user's learning progress for a deck.

**Headers:**

- `Authorization: Bearer {access_token}`

**Query Parameters:**

- `bucket` (enum: "new" | "learning" | "known", optional) - Filter by Leitner bucket

**Response (200 OK):**

```json
{
  "deck_id": "uuid",
  "user_id": "uuid",
  "statistics": {
    "total_pairs": 30,
    "new": 10,
    "learning": 15,
    "known": 5,
    "mastery_percentage": 16.67
  },
  "pairs": [
    {
      "pair_id": "uuid",
      "pair": {
        "term_a": "Cześć",
        "term_b": "Hello"
      },
      "reps": 5,
      "total_correct": 4,
      "streak_correct": 2,
      "accuracy_percentage": 80.0,
      "last_grade": 4,
      "last_reviewed_at": "2025-01-16T10:00:00Z",
      "interval_days": 3,
      "due_at": "2025-01-19T10:00:00Z",
      "bucket": "learning"
    }
  ]
}
```

**Error Responses:**

- `401 Unauthorized` - Not authenticated
- `404 Not Found` - Deck not found
- `403 Forbidden` - No access to deck

---

#### GET /api/progress/due

Get all pairs due for review across all user's decks.

**Headers:**

- `Authorization: Bearer {access_token}`

**Query Parameters:**

- `limit` (integer, default: 20, max: 100)
- `deck_id` (uuid, optional) - Filter by specific deck

**Response (200 OK):**

```json
{
  "due_count": 25,
  "pairs": [
    {
      "pair_id": "uuid",
      "deck_id": "uuid",
      "deck_title": "Travel Vocabulary",
      "pair": {
        "term_a": "Cześć",
        "term_b": "Hello"
      },
      "due_at": "2025-01-15T10:00:00Z",
      "interval_days": 1,
      "bucket": "learning"
    }
  ]
}
```

**Error Responses:**

- `401 Unauthorized` - Not authenticated

---

#### POST /api/progress/review

Submit a review result for a pair (update Leitner state).

**Headers:**

- `Authorization: Bearer {access_token}`

**Request Body:**

```json
{
  "pair_id": "uuid",
  "deck_id": "uuid",
  "grade": 4,
  "time_spent_ms": 3500
}
```

**Request Parameters:**

- `pair_id`: UUID of the pair reviewed
- `deck_id`: UUID of the deck
- `grade`: 0-5 (0=wrong, 1-5=correct with varying confidence)
- `time_spent_ms`: Time spent on review in milliseconds

**Response (200 OK):**

```json
{
  "pair_id": "uuid",
  "deck_id": "uuid",
  "reps": 6,
  "total_correct": 5,
  "streak_correct": 3,
  "last_grade": 4,
  "last_reviewed_at": "2025-01-16T14:30:00Z",
  "interval_days": 5,
  "due_at": "2025-01-21T14:30:00Z",
  "bucket": "learning",
  "bucket_changed": false
}
```

**Business Rules (Simplified Leitner 3-Bucket):**

- Grade 0: Move to "new", reset streak, interval = 0
- Grade 1-2: Stay in current bucket, increment interval by 1 day
- Grade 3-4: Advance bucket if streak ≥ 2, interval × 2
- Grade 5: Advance bucket, interval × 3
- "new" → "learning" → "known"

**Error Responses:**

- `401 Unauthorized` - Not authenticated
- `404 Not Found` - Pair or deck not found
- `400 Bad Request` - Invalid grade (must be 0-5)
- `403 Forbidden` - No access to deck

---

#### POST /api/progress/batch-review

Submit multiple review results (for Challenge mode).

**Headers:**

- `Authorization: Bearer {access_token}`

**Request Body:**

```json
{
  "deck_id": "uuid",
  "reviews": [
    {
      "pair_id": "uuid",
      "grade": 5,
      "time_spent_ms": 2000
    },
    {
      "pair_id": "uuid",
      "grade": 3,
      "time_spent_ms": 4500
    }
  ],
  "session_type": "challenge"
}
```

**Response (200 OK):**

```json
{
  "reviews_processed": 10,
  "statistics": {
    "average_grade": 4.2,
    "total_time_ms": 35000,
    "accuracy_percentage": 90.0
  },
  "updated_pairs": [
    {
      "pair_id": "uuid",
      "bucket": "known",
      "bucket_changed": true
    }
  ]
}
```

**Error Responses:**

- `401 Unauthorized` - Not authenticated
- `400 Bad Request` - Invalid review data
- `403 Forbidden` - No access to deck

---

### 2.8 Tags

#### GET /api/tags

List all available tags.

**Query Parameters:**

- `search` (string, optional) - Search tags by name or slug

**Response (200 OK):**

```json
{
  "tags": [
    {
      "id": "uuid",
      "slug": "greetings",
      "name": "Greetings",
      "description": "Common greeting phrases"
    },
    {
      "id": "uuid",
      "slug": "travel",
      "name": "Travel",
      "description": "Travel-related vocabulary"
    }
  ],
  "count": 20
}
```

**Error Responses:**
None (public endpoint)

---

### 2.9 Share Links (Unlisted Decks)

#### POST /api/decks/:deckId/share

Create a share link for an unlisted deck.

**Headers:**

- `Authorization: Bearer {access_token}`

**Request Body:**

```json
{
  "expires_in_days": 30
}
```

**Response (201 Created):**

```json
{
  "deck_id": "uuid",
  "token": "uuid",
  "share_url": "https://app.com/shared/uuid",
  "created_at": "2025-01-16T15:00:00Z",
  "expires_at": "2025-02-15T15:00:00Z"
}
```

**Business Rules:**

- Only works for decks with `visibility='unlisted'`
- Token is UUID, not guessable

**Error Responses:**

- `401 Unauthorized` - Not authenticated
- `403 Forbidden` - Not deck owner or deck not unlisted
- `404 Not Found` - Deck not found

---

#### GET /api/shared/:token

Access a shared deck via token (public endpoint).

**Response (200 OK):**

```json
{
  "deck": {
    "id": "uuid",
    "title": "Shared Vocabulary",
    "description": "Description",
    "lang_a": {...},
    "lang_b": {...},
    "pairs_count": 30
  },
  "pairs": [
    {
      "id": "uuid",
      "term_a": "Cześć",
      "term_b": "Hello"
    }
  ]
}
```

**Business Rules:**

- Returns deck + pairs if token is valid, not expired, and not revoked
- Does not require authentication

**Error Responses:**

- `404 Not Found` - Invalid, expired, or revoked token
- `410 Gone` - Token has been revoked

---

#### DELETE /api/decks/:deckId/share/:token

Revoke a share link.

**Headers:**

- `Authorization: Bearer {access_token}`

**Response (204 No Content)**

**Error Responses:**

- `401 Unauthorized` - Not authenticated
- `403 Forbidden` - Not deck owner
- `404 Not Found` - Token not found

---

### 2.10 Curated Sets (Guest Access)

#### GET /api/curated-decks

List pre-built curated decks available to guests.

**Response (200 OK):**

```json
{
  "decks": [
    {
      "id": "uuid",
      "title": "Essential Travel Phrases",
      "description": "30 must-know phrases for travelers",
      "lang_a": {...},
      "lang_b": {...},
      "pairs_count": 30,
      "is_curated": true
    }
  ],
  "count": 10
}
```

**Error Responses:**
None (public endpoint)

---

#### GET /api/curated-decks/:id

Get a curated deck with all pairs.

**Response (200 OK):**

```json
{
  "deck": {
    "id": "uuid",
    "title": "Essential Travel Phrases",
    "description": "30 must-know phrases for travelers",
    "lang_a": {...},
    "lang_b": {...},
    "pairs_count": 30,
    "is_curated": true
  },
  "pairs": [
    {
      "id": "uuid",
      "term_a": "Dzień dobry",
      "term_b": "Good morning",
      "tags": [...]
    }
  ]
}
```

**Business Rules:**

- Guest users can access curated decks without authentication
- Guest progress stored in localStorage (client-side)

**Error Responses:**

- `404 Not Found` - Curated deck not found

---

## 3. Authentication and Authorization

### 3.1 Authentication Mechanism

**Supabase JWT-based Authentication:**

- User registration and login handled by Supabase Auth
- Access tokens (JWT) issued upon successful authentication
- Refresh tokens for token renewal
- Tokens passed via `Authorization: Bearer {token}` header

### 3.2 Authorization Strategy

**Row Level Security (RLS) in Supabase:**

1. **Profiles:**
   - Users can only read/update their own profile
   - Profile creation restricted to service role (triggered on user signup)

2. **Decks:**
   - **Private:** Only owner can CRUD
   - **Public:** Anyone can SELECT, only owner can CUD
   - **Unlisted:** Access only via share token (RPC function), owner can CRUD

3. **Pairs:**
   - Access inherits from deck visibility
   - Only deck owner can CUD
   - Public/unlisted access via deck permissions

4. **Languages & Tags:**
   - Public SELECT for all users
   - Mutations restricted to service role (centrally managed)

5. **User Progress (user_pair_state):**
   - Users can only access their own progress data
   - Enforced via `user_id = auth.uid()` policy

6. **Share Links:**
   - Only deck owner can create/revoke
   - Public access via RPC with token validation

### 3.3 Rate Limiting

**Generation Endpoints:**

- 3 generations per day per authenticated user
- Enforced at application layer and logged in database
- 429 Too Many Requests response when quota exceeded

**API Rate Limits (General):**

- 100 requests per minute per IP (anonymous)
- 1000 requests per minute per authenticated user
- Implemented via middleware

---

## 4. Validation and Business Logic

### 4.1 Validation Rules by Resource

#### Profiles

- `username`: citext, unique, 3-30 characters, alphanumeric + underscore
- `display_name`: optional, max 100 characters
- `timezone`: valid IANA timezone string
- `settings`: valid JSON object

#### Languages

- `code`: citext, unique, matches regex `^[a-z]{2}(-[A-Z]{2})?$`
- `name`: required, max 100 characters
- Managed centrally, users cannot create/modify

#### Decks

- `title`: required, 1-200 characters
- `description`: required, 1-1000 characters
- `lang_a` and `lang_b`: must be different, must reference valid language IDs
- `visibility`: enum ("private", "public", "unlisted")
- Language fields immutable after pairs exist (enforced by trigger)

#### Pairs

- `term_a` and `term_b`: required, max 8 tokens each
- Duplicate prevention: unique `(deck_id, term_a_norm, term_b_norm)` where `deleted_at IS NULL`
- Normalized fields auto-generated (unaccent, lowercase, whitespace normalization)
- Full-text search vector auto-generated from normalized terms

#### User Progress

- `last_grade`: 0-5 (smallint with CHECK constraint)
- `interval_days`: >= 0
- `reps`, `total_correct`, `streak_correct`: >= 0

#### Share Links

- Token auto-generated (UUID)
- `expires_at`: optional, must be future date if provided
- Only valid for unlisted decks

### 4.2 Business Logic Implementation

#### 4.2.1 AI Generation Logic

**Location:** Server-side API endpoint (`/api/generate/*`)

**Process:**

1. Check user quota (3/day limit)
2. Validate input parameters
3. Check backend cache (key: topic/text hash + parameters)
4. If cache miss, call AI service (OpenAI/Anthropic)
5. Parse and validate AI response
6. Ensure exactly 30 pairs (or 10 for "+10")
7. Create pairs in database
8. Log telemetry (generation time, cost, cache hit, prompt hash)
9. Return pairs + metadata

**Deduplication:**

- NOT in actual MVP
- Normalize terms (unaccent, lowercase, trim, collapse whitespace)
- Check against `(deck_id, term_a_norm, term_b_norm)` unique constraint
- Exclude flagged pairs
- Exclude pairs in user's "known" bucket

#### 4.2.2 Leitner SRS Logic

**Location:** `/api/progress/review` endpoint + database function

**3-Bucket System:**

- **Bucket 1 (New):** Never reviewed or failed
- **Bucket 2 (Learning):** Reviewed 1+ times, not yet mastered
- **Bucket 3 (Known):** Mastered, long intervals

**Algorithm:**

```
IF grade = 0:
  bucket = "new"
  streak_correct = 0
  interval_days = 0
  due_at = NOW()

ELSE IF grade IN (1, 2):
  bucket = unchanged
  streak_correct += 1
  interval_days = max(interval_days, 1)
  due_at = NOW() + interval_days

ELSE IF grade IN (3, 4):
  IF streak_correct >= 2 AND bucket != "known":
    bucket = next_bucket
  streak_correct += 1
  interval_days = interval_days * 2
  due_at = NOW() + interval_days

ELSE IF grade = 5:
  IF bucket != "known":
    bucket = next_bucket
  streak_correct += 1
  interval_days = interval_days * 3
  due_at = NOW() + interval_days
```

**Implementation:**

- PostgreSQL function `apply_review(user_id, pair_id, deck_id, grade)` with SECURITY DEFINER
- Atomically updates `user_pair_state` table
- Returns updated state

#### 4.2.3 Anti-Cheat Logic

**Location:** Client-side game logic (enforced in UI)

**Mechanism:**

- After incorrect match attempt:
  - Hide one correct pair from grid
  - Add one decoy pair (randomly selected from excluded pairs)
- Prevents random clicking
- Reset on correct match

**Note:** Not enforced server-side; progress tracking based on explicit review submissions

#### 4.2.4 Challenge Mode Logic

**Location:** Client-side game + `/api/progress/batch-review`

**Process:**

1. Select 10 random pairs from deck (prioritize "new" and "learning")
2. Run 3 rounds of matching (2×5 grid)
3. Track time and accuracy per round
4. Submit batch review with grades (5 for correct, 0 for incorrect)
5. Server updates all pair states atomically
6. Return updated statistics

#### 4.2.5 Offline Cache (PWA)

**Location:** Client-side (Service Worker + IndexedDB)

**Strategy:**

- Cache last 10 accessed decks + pairs
- Store in IndexedDB with timestamps
- Sync on reconnection
- Guest progress stored in localStorage
- Authenticated user progress synced to Supabase on reconnection

### 4.3 Data Consistency

**Soft Delete:**

- Decks and pairs use `deleted_at` timestamp
- Queries filter `WHERE deleted_at IS NULL`
- Unique constraints respect soft delete
- Cascade soft delete: deleting deck soft-deletes all pairs

**Triggers:**

- `set_updated_at()`: Auto-update `updated_at` on profiles, decks, pairs
- Block language change: Prevent updating `lang_a`/`lang_b` if deck has pairs
- Auto-normalize: Generate `term_a_norm`, `term_b_norm`, `search_tsv` on insert/update

**Foreign Key Integrity:**

- Cascading constraints where appropriate
- Composite FK in `user_pair_state`: `(pair_id, deck_id)` → `pairs(id, deck_id)`

---

## 5. Error Handling Standards

### 5.1 Standard Error Response Format

All error responses follow this structure:

```json
{
  "error": {
    "code": "ERROR_CODE",
    "message": "Human-readable error message",
    "details": {
      "field": "Additional context or validation errors"
    }
  }
}
```

### 5.2 HTTP Status Codes

| Code | Usage                                                |
| ---- | ---------------------------------------------------- |
| 200  | Successful GET/PATCH/POST (with body)                |
| 201  | Successful resource creation                         |
| 204  | Successful DELETE or action with no response body    |
| 400  | Bad Request - invalid input, validation failure      |
| 401  | Unauthorized - missing or invalid authentication     |
| 403  | Forbidden - authenticated but no permission          |
| 404  | Not Found - resource doesn't exist or not accessible |
| 409  | Conflict - duplicate, constraint violation           |
| 413  | Payload Too Large - request body exceeds limits      |
| 422  | Unprocessable Entity - semantic validation failure   |
| 429  | Too Many Requests - rate limit exceeded              |
| 500  | Internal Server Error - unexpected server error      |
| 503  | Service Unavailable - dependent service down         |

### 5.3 Common Error Codes

- `VALIDATION_ERROR` - Input validation failed
- `DUPLICATE_RESOURCE` - Resource already exists
- `QUOTA_EXCEEDED` - Daily generation limit reached
- `UNAUTHORIZED` - Authentication required
- `FORBIDDEN` - Insufficient permissions
- `NOT_FOUND` - Resource not found
- `LANGUAGE_IMMUTABLE` - Cannot change deck languages with existing pairs
- `GENERATION_FAILED` - AI generation service error
- `INVALID_TOKEN` - Share token invalid or expired

---

## 6. Pagination & Filtering Standards

### 6.1 Pagination Query Parameters

All list endpoints support:

- `page` (integer, default: 1, min: 1)
- `limit` (integer, default: 20, min: 1, max: 100)

### 6.2 Pagination Response Format

```json
{
  "data": [...],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 150,
    "total_pages": 8
  }
}
```

### 6.3 Sorting

- `sort` (string) - field name to sort by
- `order` (enum: "asc" | "desc", default: "desc")

Example: `?sort=created_at&order=desc`

### 6.4 Filtering

Common filters across resources:

- `search` - full-text search (uses PostgreSQL FTS)
- `created_after` / `created_before` - timestamp range
- Resource-specific filters documented per endpoint

---

## 7. Telemetry & Logging

### 7.1 Generation Telemetry

Each generation request logs:

- `generation_id`: UUID
- `user_id`: UUID
- `deck_id`: UUID
- `generation_type`: "topic" | "text" | "extend"
- `topic_id` or `text_hash`: SHA-256 of input
- `content_type`: "auto" | "words" | "phrases" | "mini-phrases"
- `register`: "neutral" | "informal" | "formal"
- `pairs_requested`: integer
- `pairs_generated`: integer
- `generation_time_ms`: integer
- `cache_hit`: boolean
- `cost_usd`: decimal
- `prompt_hash`: SHA-256 of full prompt
- `ai_model`: model identifier
- `created_at`: timestamp

### 7.2 Review Telemetry

Each review logs:

- `review_id`: UUID
- `user_id`: UUID
- `pair_id`: UUID
- `deck_id`: UUID
- `grade`: 0-5
- `time_spent_ms`: integer
- `session_type`: "practice" | "challenge"
- `created_at`: timestamp

### 7.3 Flag Telemetry

Each flag logs:

- `flag_id`: UUID
- `pair_id`: UUID
- `flagged_by`: UUID (user)
- `reason`: text
- `details`: text
- `flagged_at`: timestamp

---

## 8. Versioning & Future Considerations

### 8.1 API Versioning

**Current Version:** v1

**URL Structure:** `/api/v1/...` (optional for MVP, can add later)

**Versioning Strategy:**

- Header-based: `API-Version: 1`
- URL-based if breaking changes needed: `/api/v2/...`

### 8.2 Future Endpoint Candidates (Post-MVP)

- `POST /api/pairs/:id/fork` - Fork pair to another deck
- `GET /api/decks/:id/analytics` - Detailed deck analytics
- `POST /api/export/:deckId` - Export deck to CSV/JSON
- `POST /api/import` - Import deck from CSV
- `GET /api/users/me/statistics` - Global user learning stats
- `POST /api/decks/:deckId/clone` - Clone public deck
- `GET /api/leaderboard` - Public leaderboard
- `POST /api/pairs/similarity-merge` - Embedding-based duplicate detection
- `GET /api/suggestions/:deckId` - AI-powered learning suggestions

---

## Appendix A: Predefined Topics

The system supports 20 predefined topic IDs for generation:

1. `travel` - Travel and Tourism
2. `business` - Business and Professional
3. `food` - Food and Dining
4. `technology` - Technology and Computing
5. `health` - Health and Medicine
6. `education` - Education and Learning
7. `shopping` - Shopping and Commerce
8. `family` - Family and Relationships
9. `hobbies` - Hobbies and Leisure
10. `sports` - Sports and Fitness
11. `nature` - Nature and Environment
12. `culture` - Culture and Arts
13. `emotions` - Emotions and Feelings
14. `time` - Time and Calendar
15. `weather` - Weather and Seasons
16. `transport` - Transportation
17. `communication` - Communication
18. `home` - Home and Housing
19. `work` - Work and Career
20. `emergency` - Emergency Situations

Each topic generates contextually appropriate vocabulary with the specified content type and register.

---

## Appendix B: Content Type Distribution

When `content_type: "auto"` is specified:

- **60%** single words (e.g., "lotnisko" / "airport")
- **30%** short phrases (2-4 words, e.g., "check in" / "odprawić się")
- **10%** mini-phrases (5-8 tokens, e.g., "Where is the nearest bus stop?" / "Gdzie jest najbliższy przystanek autobusowy?")

This distribution ensures a balanced mix for effective learning.

---

**End of API Plan**
