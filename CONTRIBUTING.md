# 🤝 Contributing to Aura AI

Thank you for considering contributing to Aura AI! We welcome contributions from everyone, whether you're fixing a bug, adding a feature, improving documentation, or just asking questions.

---

## 📖 Table of Contents

- [Code of Conduct](#-code-of-conduct)
- [Getting Started](#-getting-started)
- [How Can I Contribute?](#-how-can-i-contribute)
- [Development Workflow](#-development-workflow)
- [Coding Standards](#-coding-standards)
- [Commit Guidelines](#-commit-guidelines)
- [Pull Request Process](#-pull-request-process)
- [Community](#-community)

---

## 📣 Code of Conduct

This project adheres to a [Code of Conduct](CODE_OF_CONDUCT.md). By participating, you are expected to uphold this code. Please report unacceptable behavior to [66511068+muhvarriel@users.noreply.github.com](mailto:66511068+muhvarriel@users.noreply.github.com).

---

## 🚀 Getting Started

### Prerequisites

- **Node.js** 18.0 or higher
- **Git** for version control
- **Code Editor** (VS Code recommended)
- **Groq API Key** for testing AI features

### Fork and Clone

1. **Fork the repository** on GitHub
2. **Clone your fork** locally:
   ```bash
   git clone https://github.com/YOUR_USERNAME/aura-ai.git
   cd aura-ai
   ```

3. **Add upstream remote:**
   ```bash
   git remote add upstream https://github.com/muhvarriel/aura-ai.git
   ```

4. **Install dependencies:**
   ```bash
   npm install
   ```

5. **Set up environment:**
   ```bash
   cp .env.example .env.local
   # Add your GROQ_API_KEY to .env.local
   ```

6. **Run development server:**
   ```bash
   npm run dev
   ```

---

## ❓ How Can I Contribute?

### 🐞 Reporting Bugs

Before creating bug reports, please check existing issues to avoid duplicates.

**Good bug reports include:**

- Clear, descriptive title
- Steps to reproduce
- Expected vs actual behavior
- Screenshots (if applicable)
- Environment details (OS, browser, Node version)

**Use this template:**

```markdown
**Describe the bug**
A clear description of what the bug is.

**To Reproduce**
1. Go to '...'
2. Click on '...'
3. See error

**Expected behavior**
What you expected to happen.

**Screenshots**
If applicable, add screenshots.

**Environment:**
 - OS: [e.g. macOS 14.0]
 - Browser: [e.g. Chrome 120]
 - Node: [e.g. 18.17.0]
 - Version: [e.g. 0.1.0]
```

### ✨ Suggesting Enhancements

Enhancement suggestions are tracked as GitHub issues.

**Include:**

- Clear, descriptive title
- Detailed description of proposed feature
- Why this enhancement would be useful
- Possible implementation approach

### 📝 Improving Documentation

Documentation improvements are always welcome:

- Fix typos or clarify existing docs
- Add missing documentation
- Create tutorials or examples
- Translate documentation

### 👨‍💻 Code Contributions

Look for issues labeled:

- `good first issue` - Great for newcomers
- `help wanted` - Extra attention needed
- `bug` - Something isn't working
- `enhancement` - New feature or request

---

## 🔧 Development Workflow

### 1. Create a Branch

Always create a new branch for your work:

```bash
# Sync with upstream
git fetch upstream
git checkout main
git merge upstream/main

# Create feature branch
git checkout -b feature/your-feature-name
```

### Branch Naming Convention

```
feature/add-dark-mode
bugfix/fix-roadmap-crash
refactor/improve-ai-chains
docs/update-readme
test/add-unit-tests
```

### 2. Make Changes

Follow our coding standards (see below) and make your changes.

### 3. Test Your Changes

```bash
# Run linter
npm run lint

# Format code
npm run format

# Test build
npm run build

# Test production build
npm run start
```

### 4. Commit Changes

Follow our [commit guidelines](#-commit-guidelines):

```bash
git add .
git commit -m "feat: add dark mode toggle"
```

### 5. Push to Your Fork

```bash
git push origin feature/your-feature-name
```

### 6. Open Pull Request

Go to GitHub and open a pull request from your fork to `muhvarriel/aura-ai:main`.

---

## 📜 Coding Standards

### File Structure

Follow the Clean Architecture pattern:

```
src/
├── app/           # Next.js app (routes, pages)
├── core/          # Domain logic (pure, no framework dependencies)
├── infrastructure/ # External services (AI, storage)
├── presentation/  # UI components
└── lib/           # Utilities
```

### TypeScript Guidelines

**1. Always use types:**

```typescript
// ❌ Bad
function generateRoadmap(topic) {
  // ...
}

// ✅ Good
function generateRoadmap(topic: string): Promise<Roadmap> {
  // ...
}
```

**2. Use interfaces for objects:**

```typescript
interface RoadmapNode {
  id: string;
  label: string;
  status: 'locked' | 'unlocked' | 'completed';
}
```

**3. Avoid `any`:**

```typescript
// ❌ Bad
const data: any = await fetch(...);

// ✅ Good
const data: RoadmapResponse = await fetch(...);
```

### React Guidelines

**1. Use functional components:**

```typescript
// ✅ Good
export function RoadmapGraph({ nodes, edges }: Props) {
  return <div>...</div>;
}
```

**2. Use hooks appropriately:**

```typescript
// State
const [isOpen, setIsOpen] = useState(false);

// Effects
useEffect(() => {
  // Side effects here
}, [dependencies]);

// Memoization
const expensiveValue = useMemo(() => {
  return computeExpensiveValue(data);
}, [data]);
```

**3. Extract complex logic to custom hooks:**

```typescript
// src/presentation/hooks/useRoadmapData.ts
export function useRoadmapData(roadmapId: string) {
  const [data, setData] = useState(null);
  // ... logic
  return { data, loading, error };
}
```

### Component Guidelines

**1. Component file structure:**

```typescript
// 1. Imports
import { useState } from 'react';
import { Button } from '@/components/ui/button';

// 2. Types
interface ComponentProps {
  title: string;
  onSubmit: () => void;
}

// 3. Component
export function MyComponent({ title, onSubmit }: ComponentProps) {
  // 4. Hooks
  const [value, setValue] = useState('');
  
  // 5. Handlers
  const handleClick = () => {
    onSubmit();
  };
  
  // 6. Render
  return <div>...</div>;
}
```

**2. Props destructuring:**

```typescript
// ✅ Good
function Button({ label, onClick, disabled = false }: ButtonProps) {
  return <button onClick={onClick} disabled={disabled}>{label}</button>;
}
```

### Styling Guidelines

**Use Tailwind utility classes:**

```typescript
// ✅ Good
<div className="flex items-center gap-4 p-6 bg-white rounded-lg shadow-sm">
  <Button className="px-4 py-2 bg-black text-white hover:bg-gray-800" />
</div>
```

**Use `clsx` or `cn` for conditional classes:**

```typescript
import { cn } from '@/lib/utils';

<div className={cn(
  'base-class',
  isActive && 'active-class',
  isDisabled && 'disabled-class'
)} />
```

### Code Quality

**1. Keep functions small and focused:**

```typescript
// Each function should do one thing well
function calculateProgress(completed: number, total: number): number {
  return Math.round((completed / total) * 100);
}
```

**2. Use meaningful names:**

```typescript
// ❌ Bad
const x = roadmaps.filter(r => r.s === 'c');

// ✅ Good
const completedRoadmaps = roadmaps.filter(
  roadmap => roadmap.status === 'completed'
);
```

**3. Add comments for complex logic:**

```typescript
// Calculate optimal node positions using force-directed layout
// This prevents node overlap and creates visually pleasing graphs
const positions = calculateForceLayout(nodes, edges);
```

---

## 📦 Commit Guidelines

We follow [Conventional Commits](https://www.conventionalcommits.org/) specification.

### Commit Message Format

```
<type>(<scope>): <subject>

<body>

<footer>
```

### Types

- `feat`: New feature
- `fix`: Bug fix
- `docs`: Documentation changes
- `style`: Code style changes (formatting, semicolons, etc.)
- `refactor`: Code refactoring
- `perf`: Performance improvements
- `test`: Adding or updating tests
- `chore`: Maintenance tasks
- `ci`: CI/CD changes
- `build`: Build system changes

### Examples

```bash
# Feature
git commit -m "feat(roadmap): add export to PDF functionality"

# Bug fix
git commit -m "fix(api): handle timeout errors in AI generation"

# Documentation
git commit -m "docs(readme): add installation instructions"

# Refactor
git commit -m "refactor(store): migrate to Zustand v5 API"

# Multiple changes
git commit -m "feat(ui): add dark mode support

- Add theme toggle component
- Update Tailwind config for dark mode
- Persist theme preference in localStorage

Closes #123"
```

### Scope

Scope refers to the area of the codebase:

- `api` - API routes
- `ui` - UI components
- `roadmap` - Roadmap features
- `ai` - AI integration
- `store` - State management
- `docs` - Documentation

---

## 📤 Pull Request Process

### Before Submitting

- [ ] Code follows project style guidelines
- [ ] All tests pass (`npm run lint`)
- [ ] Code is formatted (`npm run format`)
- [ ] Commit messages follow convention
- [ ] Documentation is updated (if needed)
- [ ] No console.logs or debug code

### PR Title Format

Use the same format as commits:

```
feat(roadmap): add collaborative editing
```

### PR Description Template

```markdown
## Description
Brief description of changes.

## Type of Change
- [ ] Bug fix
- [ ] New feature
- [ ] Breaking change
- [ ] Documentation update

## Testing
How has this been tested?

## Screenshots (if applicable)
[Add screenshots]

## Checklist
- [ ] Code follows style guidelines
- [ ] Self-review completed
- [ ] Comments added for complex code
- [ ] Documentation updated
- [ ] No new warnings
```

### Review Process

1. **Automated checks:** CI runs linting and type checking
2. **Code review:** Maintainer reviews code
3. **Discussion:** Address feedback and make changes
4. **Approval:** Once approved, PR will be merged

### After Merge

- Delete your branch
- Sync your fork:
  ```bash
  git checkout main
  git fetch upstream
  git merge upstream/main
  git push origin main
  ```

---

## 📢 Community

### Communication Channels

- **GitHub Issues:** Bug reports and feature requests
- **GitHub Discussions:** Questions and general discussion
- **Pull Requests:** Code contributions

### Getting Help

Stuck? Need help?

1. Check existing [issues](https://github.com/muhvarriel/aura-ai/issues)
2. Search [discussions](https://github.com/muhvarriel/aura-ai/discussions)
3. Ask in a new discussion
4. Contact maintainers

---

## 🎉 Recognition

Contributors are recognized in:

- Repository contributors page
- Release notes
- README acknowledgments

---

## 📝 Additional Resources

- [Next.js Documentation](https://nextjs.org/docs)
- [TypeScript Handbook](https://www.typescriptlang.org/docs/)
- [React Documentation](https://react.dev/)
- [Tailwind CSS](https://tailwindcss.com/docs)
- [Conventional Commits](https://www.conventionalcommits.org/)

---

## ❓ Questions?

Feel free to reach out:

- **Email:** [66511068+muhvarriel@users.noreply.github.com](mailto:66511068+muhvarriel@users.noreply.github.com)
- **GitHub:** [@muhvarriel](https://github.com/muhvarriel)

---

**Thank you for contributing to Aura AI! 🚀**
