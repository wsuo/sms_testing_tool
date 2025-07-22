# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a Next.js 15 SMS testing tool built with React 19, TypeScript, and shadcn/ui components. The application provides a web interface for testing SMS message delivery through an admin API backend and monitors status via real Aliyun SMS API integration.

## Architecture

### Core Application Structure
- **Next.js App Router**: Using the new app directory structure
- **Single Page Application**: Main functionality in `app/page.tsx` 
- **Component Library**: shadcn/ui components in `components/ui/`
- **State Management**: React hooks with localStorage persistence
- **API Integration**: Proxied backend calls through Next.js rewrites

### Key Features
1. **Token Management**: Intelligent token persistence with expiration handling and validation
2. **SMS Template Selection**: Fetches and manages SMS templates from admin API
3. **Message Sending**: Posts SMS requests with template parameters  
4. **Status Monitoring**: Real-time status checks with integrated Aliyun SMS API
5. **Phone Number Management**: Predefined test numbers and custom input

### API Integration Points
- Admin API: `/admin-api/system/sms-template/*` (proxied to https://wxapp.agrochainhub.com)
- Aliyun SMS Status API: `/api/sms-status` (server-side proxy to dysms.console.aliyun.com)
- Authentication: Bearer token for admin API, sec_token for Aliyun API

## Development Commands

```bash
# Install dependencies
npm install

# Run development server (on port 3030)
npm run dev

# Build for production  
npm run build

# Start production server
npm start

# Lint code
npm run lint
```

## Important Configuration

### Next.js Configuration
- ESLint and TypeScript errors ignored during builds (see `next.config.mjs:4-8`)
- Images are unoptimized for deployment flexibility
- Admin API requests proxied to https://wxapp.agrochainhub.com (configured in `next.config.mjs:16`)

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
- Smart token management with localStorage persistence  
- Automatic token validation on startup
- 401 error detection with automatic re-authentication flow
- Token expiration handling with clear user guidance
- Complete state reset on token configuration changes

### SMS Status Monitoring  
- Real Aliyun SMS API integration via `/api/sms-status` proxy endpoint
- Auto-refresh every 3 seconds when active
- Stops when all messages reach final state
- Maps Aliyun SendStatus codes: 1=发送中, 3=已送达, others=发送失败

### Error Handling
- Toast notifications for user feedback
- Graceful API failure handling with reduced notification frequency
- Token validation before operations

## Development Notes

- Admin API is fully configured and integrated with real backend
- Aliyun SMS status checking is now fully integrated via proxy API route
- All UI text is in Chinese - consider internationalization for broader use
- Component uses extensive shadcn/ui components - familiarize with their API patterns
- API route `/api/sms-status/route.ts` handles CORS and authentication for Aliyun API calls

When implementing UI elements in this Next.js SMS testing application, prioritize using the existing shadcn/ui components from the `components/ui/` directory. These components are already configured and styled consistently with the project's design system.

Available components include:
- `Button` for actions and interactions
- `Input` for form fields
- `Card`, `CardContent`, `CardHeader`, `CardTitle` for content containers
- `Select`, `SelectContent`, `SelectItem`, `SelectTrigger`, `SelectValue` for dropdowns
- `Badge` for status indicators
- `Alert`, `AlertDescription` for notifications
- `Label` for form labels
- Toast components (`useToast` hook, `Toaster`) for user feedback
- `Skeleton` for loading states
- `Progress` for progress indicators
- `Switch` for toggle controls
- `Separator` for visual dividers

Before creating custom UI components or using external libraries, check if an existing shadcn/ui component can fulfill the requirement. If modifications are needed, extend the existing components rather than replacing them to maintain design consistency and theming support (including dark mode).

Import these components using the configured path aliases: `@/components/ui/[component-name]`