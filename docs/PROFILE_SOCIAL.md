# Profile And Social Graph

HackPilot profiles extend the existing application instead of replacing gamification or submission data.

## Profile Fields

Editable fields:

- Profile picture
- Name
- Username
- LinkedIn URL
- GitHub URL
- Bio

Read-only identity field:

- Email, sourced from Supabase Auth

Username rules:

- 3-30 characters
- Lowercase letters, numbers, underscores, and hyphens
- Must be unique
- Reserved product names such as `admin`, `api`, `profile`, and `leaderboard` are rejected

## Routes

Frontend:

- `/login`
- `/signup`
- `/auth/callback`
- `/profile/edit`
- `/u?username={username}` because the current frontend is deployed as a static Next export
- `/leaderboard`

Backend:

- `GET /api/me`
- `PUT /api/me/profile`
- `POST /api/me/avatar`
- `DELETE /api/me/avatar`
- `GET /api/u/{username}`
- `POST /api/u/{username}/follow`
- `DELETE /api/u/{username}/follow`

## Profile Pictures

Local development stores validated profile images under the backend static directory and serves them from `/static/profile-images/...`.

Validation:

- MIME type: JPEG, PNG, or WebP
- Maximum size: 2 MB
- Generated object names use the authenticated user ID plus a UUID

Production can move the same endpoint to S3 using the existing `S3_BUCKET_NAME` infrastructure. That requires manual AWS/IAM/S3 confirmation before switching storage behavior.

## Follow Model

`Follow` records contain:

- `follower_user_id`
- `following_user_id`
- `created_at`

A duplicate follow pair is prevented by a unique constraint. Self-follow is rejected.

Friend definition:

- A friendship exists when both users follow each other.

Follow state returned to the UI:

- `follow`
- `following`
- `friends`
- `none`

## Privacy

Public profile pages do not expose email. The authenticated user's own profile response includes email so it can be displayed as read-only in profile editing.
