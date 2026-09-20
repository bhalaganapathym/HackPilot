# HackPilot Auth Setup

HackPilot uses Supabase Auth for identity and keeps HackPilot application data in the existing backend persistence layer. The canonical authenticated identity is `supabase_user_id`.

## Local Setup

1. Create or open the HackPilot Supabase project.
2. In Supabase, open **Authentication > Providers**.
3. Enable **Email** authentication.
4. Add these local redirect URLs in **Authentication > URL Configuration**:
   - `http://localhost:3000/auth/callback`
   - `http://localhost:3000`
5. Copy the project URL and public anon key into local env files.

Frontend `frontend/.env.local`:

```env
NEXT_PUBLIC_API_URL=http://localhost:8000/api
NEXT_PUBLIC_SUPABASE_URL=https://your-project-ref.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-public-anon-key
```

Backend `backend/.env`:

```env
SUPABASE_URL=https://your-project-ref.supabase.co
SUPABASE_ANON_KEY=your-public-anon-key
```

The anon key is public. Do not put service-role keys in frontend env files.

## Google OAuth

Google OAuth is implemented through Supabase Auth. Manual setup is required before the button can complete a real login.

1. Open Google Cloud Console.
2. Configure the OAuth consent screen for the HackPilot app.
3. Create an OAuth 2.0 Client ID for a web application.
4. In the Google OAuth client, add the Supabase callback URL from Supabase **Authentication > Providers > Google**. It typically looks like:
   - `https://your-project-ref.supabase.co/auth/v1/callback`
5. In Supabase **Authentication > Providers > Google**, paste the Google client ID and client secret.
6. In Supabase **Authentication > URL Configuration**, add local and production site URLs/callback URLs.

Never paste the Google client secret into chat or source code.

## Production Setup

Configure these variable names in the production hosts:

Amplify frontend:

- `NEXT_PUBLIC_API_URL`
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`

Backend host:

- `SUPABASE_URL`
- `SUPABASE_ANON_KEY`

Production redirect URLs must include:

- `https://your-production-domain/auth/callback`
- `https://your-production-domain`

## Backend Verification

Protected API endpoints read the current user from a verified Supabase bearer token. The backend does not trust user IDs, usernames, emails, XP, badges, or profile ownership claims sent in request bodies.
