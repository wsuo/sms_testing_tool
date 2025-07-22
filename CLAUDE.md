# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a Next.js 15 SMS testing tool built with React 19, TypeScript, and shadcn/ui components. The application provides a web interface for testing SMS message delivery through an admin API backend and monitors status via Aliyun SMS services.

## Architecture

### Core Application Structure
- **Next.js App Router**: Using the new app directory structure
- **Single Page Application**: Main functionality in `app/page.tsx` 
- **Component Library**: shadcn/ui components in `components/ui/`
- **State Management**: React hooks with localStorage persistence
- **API Integration**: Proxied backend calls through Next.js rewrites

### Key Features
1. **Token Management**: Stores admin and Aliyun tokens in localStorage
2. **SMS Template Selection**: Fetches and manages SMS templates from admin API
3. **Message Sending**: Posts SMS requests with template parameters  
4. **Status Monitoring**: Auto-refreshing status checks with mock Aliyun API calls
5. **Phone Number Management**: Predefined test numbers and custom input

### API Integration Points
- Admin API: `/admin-api/system/sms-template/*` (proxied to external backend)
- Authentication: Bearer token authorization
- Status monitoring: Mock implementation (needs real Aliyun SMS API integration)

## Development Commands

```bash
# Install dependencies
pnpm install

# Run development server
pnpm dev

# Build for production  
pnpm build

# Start production server
pnpm start

# Lint code
pnpm lint
```

## Important Configuration

### Next.js Configuration
- ESLint and TypeScript errors ignored during builds (see `next.config.mjs:4-8`)
- Images are unoptimized for deployment flexibility
- Admin API requests proxied to `http://your-admin-backend.com` (update in `next.config.mjs:16`)

### TypeScript Setup
- Strict mode enabled
- Path aliases: `@/*` maps to project root
- Target ES6 with Next.js plugin integration

### Styling
- Tailwind CSS with shadcn/ui theme system
- CSS custom properties for theming (`--background`, `--foreground`, etc.)
- Dark mode support with class-based strategy

## Key Implementation Details

### State Persistence
- Tokens stored in localStorage with keys: `sms-admin-token`, `sms-aliyun-token`
- Auto-loads on component mount

### SMS Status Monitoring  
- Mock implementation in `checkSmsStatus()` function (lines 223-239)
- Auto-refresh every 3 seconds when active
- Stops when all messages reach final state

### Error Handling
- Toast notifications for user feedback
- Graceful API failure handling
- Token validation before operations

## Development Notes

- The backend URL in `next.config.mjs` must be updated for your environment
- SMS status checking is currently mocked and needs real Aliyun SMS API integration  
- All UI text is in Chinese - consider internationalization for broader use
- Component uses extensive shadcn/ui components - familiarize with their API patterns