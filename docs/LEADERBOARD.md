# Leaderboard

HackPilot leaderboards rank users by the existing gamification profile XP. No second XP system is introduced.

## Backend Endpoint

`GET /api/leaderboard?scope=global`

Returns all provisioned HackPilot profiles ordered by:

1. `total_xp` descending
2. `username` ascending for deterministic ties

`GET /api/leaderboard?scope=friends`

Requires authentication. Returns the current user plus mutual follows only.

## Data Source

XP, level, streak, badges, and earned achievements come from the existing gamification tables and `GamificationService`.

Current supported fields:

- `total_xp`
- `level`
- `streak_days`
- `badges`
- completed quest count

The current codebase does not have a separate achievement table. Public profile achievements are therefore derived from earned badges, and no future/unearned achievement definitions are invented.

## Frontend

The `/leaderboard` page includes:

- Global/Friends tabs
- Rank
- Profile picture
- Name and username
- XP
- Level
- Streak
- Current-user highlighting
- Empty friends state

## Production Notes

The existing repository has DynamoDB submission sync, but local profile/social persistence is SQLModel-backed. Moving profiles and follows to DynamoDB requires a manual AWS checkpoint for table/index design and IAM permissions before deployment.
