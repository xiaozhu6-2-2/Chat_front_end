# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is **echat_web**, a modern real-time chat application built with Vue 3 and Vuetify 3. It's a web-based instant messaging client that supports both private and group chat functionality with WebSocket communication.

## Development Commands

```bash
# Development
npm run dev          # Start dev server on port 8080
npm run build        # Build for production
npm run preview      # Preview production build

# Code Quality
npm run lint         # Run ESLint with auto-fix
npm run type-check   # TypeScript type checking
```

## Architecture Overview

### Core Technologies
- **Frontend**: Vue 3 (Composition API) + TypeScript
- **UI Framework**: Vuetify 3 (Material Design)
- **State Management**: Pinia stores
- **WebSocket**: Custom service with automatic reconnection
- **Build Tool**: Vite with auto-imports and component registration

### Key Architectural Patterns

#### WebSocket Message System
The application uses a sophisticated event-driven WebSocket architecture:

- **Message Flow**: User sends → LocalMessage created → Queued → WebSocket → ACK confirmation → Status update
- **Connection Management**: Automatic reconnection with exponential backoff, heartbeat/ping-pong mechanism
- **Offline Support**: Message queuing for offline scenarios
- **Event System**: Custom event handlers for different message types (Private, Group, Notification, System)

#### State Management Structure
- **chatStore**: Manages chat sessions, messages, active conversations
- **loadingStore**: Global loading states and UI feedback
- **Reactive State**: Real-time UI updates via Pinia reactivity
- **Message Types**: Strongly typed enum system for different message categories

#### Service Layer Architecture
- **message.ts**: Complete message handling service with ACK system
- **websocket.ts**: WebSocket connection management service
- **mockDataService.ts**: Development mock data service
- **messageTypes.ts**: Comprehensive type definitions

### Component Organization

```
src/
├── components/
│   ├── chat/           # Chat-related components
│   │   ├── Message/    # Message bubble components
│   │   ├── VirtualMessageList.vue  # Performance-optimized list rendering
│   │   └── chatArea.vue
│   ├── contact/        # Contact management
│   ├── global/         # Global UI components
│   └── setting/        # Settings components
├── composables/        # Vue composables (useChat, useMessageInput)
├── stores/            # Pinia stores (chatStore, loadingStore)
├── service/           # Business logic services
└── utils/             # Utility functions
```

## Environment Configuration

The project uses environment-based configuration:

### Development Environment
- **Mock Data**: Enabled by default (`VITE_USE_MOCK_DATA=true`)
- **Debug Logging**: Enabled (`VITE_ENABLE_DEBUG=true`)
- **API Endpoints**: Local development server

### Key Environment Variables
```bash
VITE_API_BASE_URL=http://localhost:3000
VITE_WS_URL=ws://localhost:3000
VITE_USE_MOCK_DATA=true
VITE_MOCK_USER_ID=test-user-001
```

Refer to `ENVIRONMENT_GUIDE.md` for comprehensive environment setup.

## Development Workflow

### Getting Started
1. Install dependencies: `npm install`
2. Start development server: `npm run dev`
3. Application runs on `http://localhost:8080`
4. Mock data automatically loads for testing

### Message System Development
When working with message-related features:

1. **Message Types**: Use the strongly-typed enums in `messageTypes.ts`
2. **State Management**: Update relevant Pinia stores for UI changes
3. **WebSocket Events**: Follow the established event patterns in `message.ts`
4. **Mock Data**: Add test cases to `mockDataService.ts` for new features

### WebSocket Connection Handling
The WebSocket service handles:
- **Connection States**: Connected, connecting, disconnected, error
- **Message Queuing**: Automatic retry for failed sends
- **Heartbeat**: Ping/pong mechanism for connection health
- **Event Processing**: Custom event listeners for different message types

## Important Implementation Notes

### Message Status Flow
Messages progress through these states: PENDING → SENDING → SENT → DELIVERED → READ/FAILED

### Auto-Import Configuration
The project uses unplugin-auto-import for:
- Vue APIs (ref, reactive, computed, etc.)
- Pinia APIs (defineStore, storeToRefs)
- Vue Router APIs (useRouter, useRoute)
- Vuetify components (auto-registered)

### Component Auto-Registration
Components are automatically registered based on file structure. No manual imports needed for components.

### Path Aliases
- `@/` → `src/` (configured in vite.config.mts)

## Code Style Guidelines

- **TypeScript**: Strict mode enabled, maintain type safety
- **Composition API**: Prefer Composition API over Options API
- **Pinia**: Use stores for state management, avoid direct mutations
- **Event System**: Follow existing patterns for WebSocket event handling
- **Component Structure**: Keep components focused and composable

## Testing Approach

Currently uses manual testing through the development environment with mock data service for simulating backend interactions. No formal test suite is configured.