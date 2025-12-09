# Supabase Configuration Guide

This document explains how the Volunteer Connect application manages Supabase configuration securely.

## Overview

The application uses a centralized configuration system that:
- Validates all environment variables on startup
- Provides helpful error messages when configuration is missing
- Caches validated configuration to avoid repeated checks
- Handles missing credentials gracefully in production
- Follows security best practices for Vercel deployments

## Required Environment Variables

### Client & Server (Public)

\`\`\`bash
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key-here
\`\`\`

### Server Only (Private)

\`\`\`bash
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key-here
\`\`\`

⚠️ **SECURITY WARNING**: Never expose `SUPABASE_SERVICE_ROLE_KEY` to the client. It has full database access.

## Finding Your Credentials

1. Go to your Supabase dashboard: https://supabase.com/dashboard
2. Select your project
3. Navigate to Settings → API
4. Copy the values:
   - **Project URL** → `NEXT_PUBLIC_SUPABASE_URL`
   - **anon/public key** → `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - **service_role key** → `SUPABASE_SERVICE_ROLE_KEY`

## Configuration in Different Environments

### Local Development

Create a `.env.local` file in your project root:

\`\`\`bash
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
\`\`\`

### Vercel Deployment

1. Go to your project settings in Vercel
2. Navigate to Environment Variables
3. Add each variable with the appropriate values
4. Ensure `NEXT_PUBLIC_*` variables are available to all environments

## Architecture

### File Structure

\`\`\`
lib/supabase/
├── config.ts          # Configuration validation and management
├── client.ts          # Browser client (public key)
├── server.ts          # Server client (public key + cookies)
├── admin.ts           # Admin client (service role key)
└── middleware.ts      # Session refresh and auth checks
\`\`\`

### Configuration Flow

1. **Validation**: `config.ts` validates environment variables on first access
2. **Caching**: Valid configuration is cached to avoid repeated validation
3. **Error Handling**: Missing/invalid configuration throws helpful errors in development
4. **Graceful Degradation**: Production continues with limited functionality if misconfigured

### Client Types

#### Browser Client (`client.ts`)
- Used in React components
- Public anon key only
- Respects Row Level Security (RLS)

\`\`\`typescript
import { createClient } from '@/lib/supabase/client'

const supabase = createClient()
\`\`\`

#### Server Client (`server.ts`)
- Used in Server Components, API Routes, Server Actions
- Public anon key + cookie handling
- Respects RLS
- Maintains user session

\`\`\`typescript
import { createClient } from '@/lib/supabase/server'

const supabase = await createClient()
\`\`\`

#### Admin Client (`admin.ts`)
- Used ONLY in server-side code requiring elevated privileges
- Service role key (bypasses RLS)
- Use sparingly and carefully

\`\`\`typescript
import { createAdminClient } from '@/lib/supabase/admin'

const supabase = createAdminClient()
\`\`\`

## Error Handling

### Development Mode
- Detailed error messages with troubleshooting steps
- Logs to console with stack traces
- Blocks requests to prevent cascading errors

### Production Mode
- Generic error messages (no sensitive info leaked)
- Graceful degradation where possible
- Errors logged for monitoring

## Best Practices

### ✅ DO

- Always validate configuration before creating clients
- Use appropriate client type for your context
- Keep service role key server-side only
- Set environment variables in Vercel project settings
- Use the cached configuration to avoid repeated checks

### ❌ DON'T

- Never commit `.env` files to version control
- Never expose service role key to client
- Don't create multiple client instances unnecessarily
- Don't store credentials in code
- Don't bypass the configuration system

## Troubleshooting

### "Missing required Supabase environment variables"

**Cause**: Environment variables not set or misspelled

**Solution**:
1. Check `.env.local` file exists and has correct values
2. Verify variable names match exactly (including `NEXT_PUBLIC_` prefix)
3. Restart development server after changing `.env.local`

### "Invalid NEXT_PUBLIC_SUPABASE_URL"

**Cause**: URL is not a valid URL format

**Solution**:
1. Ensure URL starts with `https://`
2. Check for typos in the URL
3. Verify URL is from your Supabase dashboard

### "Supabase is not properly configured" in production

**Cause**: Environment variables not set in Vercel

**Solution**:
1. Go to Vercel project settings
2. Add missing environment variables
3. Redeploy the application

### Middleware errors on every request

**Cause**: Configuration fails on every request

**Solution**:
1. Check Vercel logs for specific error
2. Verify all required env vars are set
3. Check for special characters in env var values that need escaping

## Security Considerations

1. **Public Keys**: The anon key is public and safe to expose - it's protected by RLS policies
2. **Service Role Key**: Must remain secret - has full database access
3. **Environment Variables**: Vercel encrypts environment variables at rest
4. **RLS Policies**: Always implement proper Row Level Security in Supabase
5. **Client vs Server**: Use appropriate client for your security context

## Monitoring

The configuration system logs important events:

\`\`\`typescript
// Configuration loaded successfully
[Supabase Config] Configuration validated

// Warning about non-standard URL
[Supabase Config] URL does not appear to be a Supabase URL

// Configuration unavailable
[Supabase Config] Configuration unavailable: <reason>

// Middleware errors
[Middleware] Supabase is not properly configured
\`\`\`

Monitor these logs in production to catch configuration issues early.
