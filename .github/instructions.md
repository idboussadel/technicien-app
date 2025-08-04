# Tauri React Desktop Application - Copilot Instructions

## Prime Directive

- **Single File Focus**: Work on one file at a time to prevent corruption
- **No Simultaneous Edits**: Multiple simultaneous edits to a file will cause corruption
- **Clean, Simple Code**: Prioritize clarity and simplicity over complexity
- **DRY Principle**: Eliminate redundancy through reusable components and services
- **Documentation**: Every function must have proper JSDoc comments
- **Type Safety**: Strict TypeScript usage with proper interfaces and types
- **French Localization**: All messages or titles that clients will see must be in French (default language)
- **Educational Approach**: Be chatty and teach about what you are doing while coding
- **Tauri Best Practices**: Follow Tauri conventions for secure desktop app development
- **Avoid Redundant Operations**: Never perform the same computation in both frontend and backend (either Rust or React, not both)

## Operational Guidelines

### File Management Protocol

- Avoid working on more than one file at a time
- Multiple simultaneous edits to a file will cause corruption
- Be chatty and teach about what you are doing while coding

### Efficiency Best Practices

- Avoid re-reading files unnecessarily
- Avoid re-searching the same query multiple times
- Cache expensive operations appropriately

### Large File & Complex Change Protocol

- Break down large changes into smaller, manageable chunks
- Work through complex modifications step by step
- Validate each change before proceeding to the next

## Rust Backend Standards

### Tauri Command Standards

- All commands must be declared with proper error handling
- Use `Result<T, String>` for command return types
- Implement proper serialization/deserialization with serde
- Use async/await for database operations
- All commands must have proper documentation comments
- Wrap all database operations in proper error handling
- Use structured logging for debugging

```rust
#[tauri::command]
async fn get_users(app_handle: tauri::AppHandle) -> Result<Vec<User>, String> {
    // Implementation with proper error handling
}
```

### Architecture Patterns

#### Repository Pattern Requirements

- Create traits for all repositories
- Implement repositories as structs with proper lifetime management
- Use dependency injection through Tauri state management
- Include proper error handling in repository methods
- Document all repository methods with rustdoc
- Use connection pooling to prevent database lock issues

#### Service Layer Requirements

- Services must handle business logic and data manipulation
- Use database transactions for multi-step operations
- Implement proper error handling with custom error types
- Use async/await for non-blocking operations
- Dispatch events for important actions using Tauri's event system

## File Organization & Project Structure

### Directory Structure

```
src-tauri/
├── src/
│   ├── commands/          # Tauri command handlers
│   ├── database/          # Database operations and migrations
│   ├── models/            # Data models and structs
│   ├── services/          # Business logic services
│   ├── utils/             # Utility functions
│   └── main.rs           # Main application entry point
src/
├── components/           # Reusable React components
├── pages/               # Application pages/views
├── hooks/               # Custom React hooks
├── services/            # Frontend service layer
├── stores/              # Zustand stores
├── types/               # TypeScript type definitions
├── utils/               # Utility functions
└── App.tsx             # Main React application
```

### Naming Conventions

- Rust Commands: `snake_case` (e.g., `get_user_profile`, `create_project`)
- Rust Structs/Enums: `PascalCase` (e.g., `UserProfile`, `ProjectStatus`)
- React Components: `PascalCase` (e.g., `UserProfile`, `ProjectCard`)
- React Files: `kebab-case` (e.g., `user-profile.tsx`, `project-card.tsx`)
- Zustand Stores: `camelCase` with `Store` suffix (e.g., `userStore`, `projectStore`)
- SQLite Tables: `snake_case` (e.g., `user_profiles`, `project_requests`)

### File Naming Standards

#### React Components

- All React component files must use kebab-case naming: `user-profile.tsx`, `project-card.tsx`
- Component function names should be PascalCase: `UserProfile`, `ProjectCard`
- Directory structure should follow kebab-case: `auth/login-form.tsx`, `settings/user-profile.tsx`

## Database Best Practices (SQLite)

### Migration Standards

- Use proper SQL migration files with version control
- Add proper indexes for performance (foreign keys, search fields, timestamps)
- Use foreign key constraints with cascade options
- Include unique constraints where needed
- Add composite indexes for complex queries
- Use descriptive constraint names

### Database Connection

- Use connection pooling for better performance
- Implement proper connection error handling
- Use transactions for data consistency
- Close connections properly to prevent locks
- Use prepared statements for all queries

```rust
// Example database service structure
pub struct DatabaseService {
    pool: Arc<Pool<SqliteConnectionManager>>,
}
```

## Error Handling & Logging

### Error Handling Requirements

- Create custom error types for different error categories
- Use `Result<T, E>` for all fallible operations
- Log all errors with relevant context
- Handle Tauri command errors properly
- Use structured logging with consistent formats
- Never expose sensitive data in error messages

```rust
#[derive(Debug, thiserror::Error)]
pub enum AppError {
    #[error("Database error: {0}")]
    Database(#[from] rusqlite::Error),
    #[error("Serialization error: {0}")]
    Serialization(#[from] serde_json::Error),
}
```

## React/TypeScript Standards

### Component Requirements

- All components must have TypeScript interfaces for props
- Use proper JSDoc comments for all exported components
- Implement error boundaries for critical components
- Use React.memo for expensive components when beneficial
- Follow naming convention: kebab-case for filenames, PascalCase for component functions
- Export components as default exports

### State Management with Zustand

- Create separate stores for different domains (user, projects, settings)
- Use TypeScript interfaces for store state
- Implement proper actions for state mutations
- Use selectors for derived state
- Keep store logic focused and minimal

```typescript
interface UserStore {
  user: User | null;
  isLoading: boolean;
  login: (credentials: LoginCredentials) => Promise<void>;
  logout: () => void;
}

export const useUserStore = create<UserStore>((set, get) => ({
  user: null,
  isLoading: false,
  login: async (credentials) => {
    // Implementation
  },
  logout: () => set({ user: null }),
}));
```

### Type Safety

- Define interfaces for all Tauri command responses
- Use proper TypeScript generics
- Avoid `any` type usage
- Use strict TypeScript configuration
- Define prop types for all components
- Create shared types between Rust and TypeScript

## Styling with Tailwind CSS & shadcn/ui

### Design System Requirements

- Use shadcn/ui components as the foundation
- Create consistent color palette variables
- Use design tokens for spacing, typography, and colors
- Implement component variants using class-variance-authority
- Follow desktop-first design principles
- Use semantic HTML elements
- Implement proper dark mode support

### CSS Organization

- Use Tailwind utility classes primarily
- Leverage shadcn/ui component system
- Use consistent spacing scale throughout
- Implement proper focus states for accessibility
- Use Tailwind CSS utility classes for responsive layouts
- Implement consistent color scheme and typography

## Tauri Integration Best Practices

### Command Invocation

- Use `invoke` for all backend communication
- Implement proper error handling for command failures
- Use TypeScript types for command parameters and responses
- Cache command results when appropriate
- Implement loading states for async operations

```typescript
import { invoke } from '@tauri-apps/api/tauri';

const fetchUsers = async (): Promise<User[]> => {
  try {
    return await invoke<User[]>('get_users');
  } catch (error) {
    console.error('Failed to fetch users:', error);
    throw error;
  }
};
```

### Event System

- Use Tauri's event system for real-time updates
- Implement proper event cleanup
- Type event payloads properly
- Use events for decoupled communication

### File System Operations

- Use Tauri's fs API for file operations
- Implement proper permission checks
- Handle file system errors gracefully
- Use async operations for better UX

## Performance Optimization

### Caching Strategy

- Implement client-side caching for frequently accessed data
- Cache expensive database queries on the Rust side
- Use Zustand for application state caching
- Implement proper cache invalidation
- Cache user preferences and settings

### Database Optimization

- Use proper indexing for query performance
- Use connection pooling for better resource management
- Implement query optimization for large datasets
- Use database transactions for data integrity
- Select only required columns

### Frontend Optimization

- Use React.memo for expensive components
- Implement proper code splitting
- Optimize bundle size with tree shaking
- Use lazy loading for non-critical components
- Optimize image assets

## Security Implementation

### Tauri Security

- Use Tauri's security features properly
- Implement proper CSP (Content Security Policy)
- Validate all inputs on the Rust side
- Use allowlist for Tauri APIs
- Implement proper permission model
- Never expose sensitive data to the frontend

### Data Protection

- Hash passwords using proper algorithms
- Use encrypted storage for sensitive data
- Implement proper input sanitization
- Validate file operations thoroughly
- Use secure communication patterns

## Desktop-Specific Considerations

### Window Management

- Implement proper window state management
- Handle window events appropriately
- Use proper window sizing and positioning
- Implement window persistence across sessions

### System Integration

- Use system notifications appropriately
- Implement proper system tray integration
- Handle system events (sleep, wake, etc.)
- Use native file dialogs when appropriate

### Cross-Platform Compatibility

- Test on all target platforms (Windows, macOS, Linux)
- Handle platform-specific behaviors
- Use proper path handling for different OSes
- Implement platform-specific features when needed

## Code Quality & Tools

### Rust Standards

- Use `cargo fmt` for code formatting
- Use `cargo clippy` for linting
- Run `cargo test` for all changes
- Use proper error handling with `?` operator
- Follow Rust naming conventions

### TypeScript/React Standards

- Use ESLint with strict rules
- Use Prettier for code formatting
- Implement proper TypeScript strict mode
- Use meaningful variable and method names
- Keep components small and focused

## Testing Strategy

### Rust Testing

- Write unit tests for all business logic
- Use integration tests for database operations
- Test Tauri commands thoroughly
- Use proper test data management

### React Testing

- Write unit tests for components
- Test custom hooks thoroughly
- Use React Testing Library for component tests
- Test Zustand stores independently

## Additional Best Practices

### Development Standards

- Follow single responsibility principle for all modules
- Use meaningful variable and method names
- Implement proper error handling with custom types
- Use proper logging for debugging
- Document complex business logic
- Use consistent code organization

### Tauri-Specific Guidelines

- Keep Rust backend focused on data and business logic
- Use React frontend for UI and user interactions
- Implement proper serialization between Rust and TypeScript
- Use Tauri's built-in features instead of external solutions
- Follow Tauri's security best practices

## Summary Checklist

### Before Writing Code:

- Implement proper error handling in Rust commands
- Add proper JSDoc/rustdoc comments to all functions
- Use TypeScript interfaces for all data structures
- Wrap database operations in proper error handling
- Use async/await for non-blocking operations
- Implement proper logging strategy
- Add comprehensive type safety

### React/TypeScript:

- Use TypeScript interfaces for all props and state
- Implement proper error boundaries
- Use shadcn/ui components with Tailwind CSS
- Follow desktop-first design principles
- Add proper JSDoc comments
- Use Zustand for state management
- Implement proper loading states and error handling

### Performance:

- Implement database indexing
- Use connection pooling for database
- Cache frequently accessed data
- Use React.memo for expensive components
- Optimize bundle size and loading

### Security:

- Validate all inputs on Rust side
- Use Tauri's security features
- Implement proper CSP
- Sanitize all data exchange
- Use encrypted storage for sensitive data

### Code Quality:

- Pass cargo fmt and clippy checks
- Use ESLint and Prettier for frontend
- Follow TypeScript strict mode
- Use meaningful names for variables and methods
- Keep functions small and focused
- **Never blindly copy provided code** - Always adapt it to follow the established patterns in this codebase
- **Apply all coding standards** - Ensure the replicated code follows Rust formatting, TypeScript strict mode, and all other standards defined in this document