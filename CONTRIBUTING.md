# Contributing to Navi

Thank you for your interest in contributing to Navi! This document provides guidelines and instructions for contributing.

## Table of Contents

- [Code of Conduct](#code-of-conduct)
- [Getting Started](#getting-started)
- [Development Process](#development-process)
- [Pull Request Process](#pull-request-process)
- [Coding Standards](#coding-standards)
- [Commit Messages](#commit-messages)
- [Issue Guidelines](#issue-guidelines)

---

## Code of Conduct

By participating in this project, you agree to maintain a respectful and inclusive environment. Please be kind and constructive in all interactions.

---

## Getting Started

### 1. Fork the Repository

Click the "Fork" button on GitHub to create your own copy of the repository.

### 2. Clone Your Fork

```bash
git clone https://github.com/YOUR_USERNAME/Navi.git
cd Navi
```

### 3. Add Upstream Remote

```bash
git remote add upstream https://github.com/Arkane-o7/Navi.git
```

### 4. Install Dependencies

```bash
pnpm install
```

### 5. Create a Branch

```bash
git checkout -b feature/your-feature-name
```

---

## Development Process

### Setting Up the Environment

Follow the [Development Guide](./docs/DEVELOPMENT.md) for detailed setup instructions.

### Running the App

```bash
# Start all apps (API + Electron)
pnpm dev

# Start individually
pnpm dev:api
pnpm dev:electron
```

### Making Changes

1. Make your changes in the appropriate package
2. Test your changes locally
3. Ensure linting passes: `pnpm lint`
4. Commit your changes

---

## Pull Request Process

### Before Submitting

- [ ] Code follows the project's coding standards
- [ ] Changes are tested locally
- [ ] Linting passes (`pnpm lint`)
- [ ] Build succeeds (`pnpm build`)
- [ ] Commit messages follow conventions
- [ ] Branch is up to date with main

### Submitting a PR

1. **Push your branch**:
   ```bash
   git push origin feature/your-feature-name
   ```

2. **Open a Pull Request** on GitHub

3. **Fill out the PR template**:
   - Describe what changes you made
   - Explain why the changes are needed
   - Link any related issues

4. **Wait for review**

### After Submission

- Respond to review feedback
- Make requested changes
- Keep your branch up to date:
  ```bash
  git fetch upstream
  git rebase upstream/main
  ```

---

## Coding Standards

### TypeScript

- Use TypeScript for all new code
- Define proper types (avoid `any`)
- Use interfaces for object shapes
- Export types when they're used across files

```typescript
// Good
interface User {
  id: string;
  email: string;
  name?: string;
}

// Avoid
const user: any = { id: '123' };
```

### React

- Use functional components with hooks
- Keep components focused and small
- Use proper hook dependencies
- Memoize expensive computations

```typescript
// Good
const MyComponent = ({ data }: { data: DataType }) => {
  const processedData = useMemo(() => 
    expensiveOperation(data), 
    [data]
  );
  
  return <div>{processedData}</div>;
};
```

### CSS

- Use CSS variables for theming
- Support both dark and light modes
- Use meaningful class names
- Keep styles scoped to components

```css
/* Good */
.message-content {
  background: var(--bg-secondary);
  color: var(--text-primary);
}

/* Avoid */
.mc {
  background: #1a1a1a;
  color: white;
}
```

### File Organization

- Keep files focused on a single concern
- Use descriptive file names
- Group related files in directories
- Follow the existing project structure

---

## Commit Messages

### Format

```
type(scope): brief description

[optional body]

[optional footer]
```

### Types

| Type | Description |
|------|-------------|
| `feat` | New feature |
| `fix` | Bug fix |
| `docs` | Documentation only |
| `style` | Code style (formatting, etc.) |
| `refactor` | Code change that neither fixes a bug nor adds a feature |
| `perf` | Performance improvement |
| `test` | Adding or updating tests |
| `chore` | Maintenance tasks |

### Examples

```bash
# Feature
feat(chat): add streaming response support

# Bug fix
fix(auth): handle expired refresh tokens

# Documentation
docs: update installation instructions

# Refactor
refactor(api): simplify error handling
```

### Guidelines

- Use present tense ("add feature" not "added feature")
- Keep the first line under 72 characters
- Reference issues when relevant: "fixes #123"

---

## Issue Guidelines

### Reporting Bugs

When reporting a bug, please include:

1. **Description**: What happened?
2. **Expected Behavior**: What should have happened?
3. **Steps to Reproduce**: How can we recreate it?
4. **Environment**: OS, version, etc.
5. **Screenshots**: If applicable
6. **Logs**: Any relevant error messages

### Feature Requests

When requesting a feature:

1. **Description**: What do you want?
2. **Use Case**: Why do you need it?
3. **Alternatives**: Have you considered other solutions?
4. **Mockups**: If applicable

### Issue Labels

| Label | Description |
|-------|-------------|
| `bug` | Something isn't working |
| `enhancement` | New feature or request |
| `documentation` | Docs improvements |
| `good first issue` | Good for newcomers |
| `help wanted` | Extra attention needed |
| `wontfix` | Won't be addressed |

---

## Where to Contribute

### Good First Issues

Look for issues labeled `good first issue` for beginner-friendly contributions.

### Areas Needing Help

- **Documentation**: Improve guides and API docs
- **Testing**: Add unit and integration tests
- **Accessibility**: Improve keyboard navigation and screen reader support
- **Internationalization**: Add language support
- **Performance**: Optimize rendering and bundle size

### Feature Ideas

Check the [Issues](https://github.com/Arkane-o7/Navi/issues) page for planned features and discussions.

---

## Questions?

- Open a [Discussion](https://github.com/Arkane-o7/Navi/discussions)
- Check existing [Issues](https://github.com/Arkane-o7/Navi/issues)
- Reach out to maintainers

---

Thank you for contributing to Navi! 🎉
