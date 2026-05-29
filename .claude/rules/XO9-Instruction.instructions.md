---
description: Global engineering, architecture, UI/UX, security, and development standards for all projects
paths:
  - "**/*"
---

# XO9 Global Engineering Instructions

These instructions define the required engineering standards, coding conventions, architectural principles, UI/UX practices, security requirements, and development workflows that must always be followed.

The AI must treat these instructions as production-grade engineering rules.

---

# Core Engineering Principles

## General Rules

- Always generate production-quality code.
- Prioritize readability, maintainability, scalability, and security.
- Avoid overengineering.
- Prefer simple and modular solutions.
- Use modern best practices and current standards.
- Keep code consistent across the entire project.
- Never introduce unnecessary dependencies.
- Never duplicate logic unnecessarily.
- Always think about long-term maintainability.
- Refactor poor code structures when identified.
- Avoid temporary hacks unless explicitly requested.
- Follow clean architecture principles whenever possible.
- Preserve existing project conventions unless they are clearly harmful.

---

# Code Quality Standards

## Clean Code Rules

- Use descriptive variable and function names.
- Avoid ambiguous abbreviations.
- Keep functions small and focused.
- Separate concerns properly.
- Prefer composition over inheritance.
- Minimize side effects.
- Avoid deeply nested logic.
- Use early returns when appropriate.
- Group related logic together.
- Remove dead or unused code.
- Keep files organized and structured.

## Comments

- Do not add unnecessary comments.
- Write comments only when logic is non-obvious.
- Never comment obvious code.
- Prefer self-documenting code.
- Use TODO comments only for real pending work.

---

# Architecture Standards

## Application Architecture

- Use scalable folder structures.
- Maintain clear separation between:
  - UI
  - business logic
  - state management
  - APIs
  - database access
  - utilities
  - configuration
- Keep components modular and reusable.
- Avoid tightly coupled systems.
- Design systems for extensibility.

## SOLID Principles

Always follow SOLID principles:

- Single Responsibility Principle
- Open/Closed Principle
- Liskov Substitution Principle
- Interface Segregation Principle
- Dependency Inversion Principle

## Design Patterns

Use appropriate patterns when beneficial:

- Factory Pattern
- Repository Pattern
- Service Layer Pattern
- Observer Pattern
- Adapter Pattern
- Dependency Injection
- Strategy Pattern

Do not force patterns unnecessarily.

---

# Frontend Development Standards

## UI/UX Rules

- Build responsive interfaces by default.
- Ensure accessibility compliance.
- Use semantic HTML.
- Maintain consistent spacing and typography.
- Use proper visual hierarchy.
- Design for usability first.
- Avoid cluttered interfaces.
- Prefer clean and modern layouts.
- Ensure keyboard accessibility.
- Ensure mobile compatibility.

## Frontend Best Practices

- Prefer reusable components.
- Avoid massive components.
- Keep state localized when possible.
- Avoid prop drilling when architecture becomes complex.
- Optimize rendering performance.
- Lazy load expensive resources when appropriate.
- Avoid unnecessary re-renders.

## CSS Standards

- Use consistent spacing systems.
- Prefer utility-first or modular CSS architecture.
- Avoid overly specific selectors.
- Avoid inline styles unless necessary.
- Keep styling maintainable and reusable.
- Ensure dark mode compatibility when applicable.

---

# Backend Development Standards

## API Design

- Follow RESTful conventions unless otherwise specified.
- Use proper HTTP status codes.
- Validate all incoming data.
- Sanitize user input.
- Handle errors consistently.
- Return structured responses.
- Avoid leaking sensitive information.

## Backend Architecture

- Separate controllers, services, repositories, and models.
- Keep business logic out of controllers.
- Use dependency injection where appropriate.
- Ensure scalability and maintainability.

## Error Handling

- Never expose stack traces in production.
- Provide meaningful error messages.
- Log important failures properly.
- Fail gracefully whenever possible.

---

# Database Standards

## Database Design

- Normalize data appropriately.
- Use indexes when necessary.
- Avoid unnecessary joins.
- Design for scalability.
- Use migrations properly.
- Enforce relational integrity when applicable.

## Query Standards

- Optimize expensive queries.
- Avoid N+1 query problems.
- Prevent unnecessary database calls.
- Use pagination for large datasets.

---

# Security Standards

## Mandatory Security Rules

- Validate and sanitize all inputs.
- Never trust client-side validation alone.
- Prevent:
  - SQL Injection
  - XSS
  - CSRF
  - Command Injection
  - Path Traversal
  - SSRF vulnerabilities
- Use secure authentication practices.
- Store secrets in environment variables.
- Never hardcode API keys or credentials.
- Use secure password hashing.
- Apply principle of least privilege.
- Protect sensitive routes and data.

## Authentication & Authorization

- Use token expiration properly.
- Validate permissions server-side.
- Protect admin-only functionality.
- Never expose sensitive user information.

---

# Performance Standards

## Optimization Rules

- Optimize for scalability.
- Avoid unnecessary computations.
- Cache expensive operations when appropriate.
- Reduce bundle sizes.
- Optimize asset loading.
- Use lazy loading strategically.
- Minimize memory usage.
- Avoid blocking operations.

---

# DevOps & Infrastructure Standards

## Deployment

- Ensure environment separation:
  - development
  - staging
  - production
- Use environment variables properly.
- Never commit secrets.
- Use CI/CD pipelines when possible.

## Logging & Monitoring

- Implement meaningful logging.
- Avoid excessive logs in production.
- Track important application failures.
- Ensure observability for production systems.

---

# Testing Standards

## Testing Rules

- Write testable code.
- Prefer automated testing.
- Cover critical business logic.
- Test edge cases when relevant.
- Avoid brittle tests.

## Types of Testing

Use when appropriate:

- Unit Testing
- Integration Testing
- End-to-End Testing

---

# Git & Version Control Standards

## Commit Rules

- Write meaningful commit messages.
- Keep commits focused and atomic.
- Avoid unrelated changes in the same commit.

## Branching

Use clear branch naming conventions:

- feature/
- fix/
- refactor/
- chore/
- hotfix/

---

# Documentation Standards

## Documentation Rules

- Document important architecture decisions.
- Keep README files updated.
- Provide setup instructions.
- Document environment requirements.
- Include examples when useful.

---

# TypeScript Standards

## Type Safety

- Prefer strict typing.
- Avoid using `any`.
- Use interfaces and types properly.
- Prefer explicit types for public APIs.
- Use enums sparingly.

## Code Structure

- Keep types organized.
- Reuse shared types.
- Avoid duplicated type definitions.

---

# React & Next.js Standards

## React Rules

- Prefer functional components.
- Use hooks correctly.
- Avoid unnecessary state.
- Keep components focused.
- Extract reusable logic into hooks.
- Avoid excessive context usage.

## Next.js Rules

- Use server components appropriately.
- Optimize SEO when applicable.
- Use proper caching strategies.
- Optimize image loading.
- Use route-based code splitting.

---

# AI Behavior Rules

## When Generating Code

The AI must:

- Generate complete working solutions.
- Include necessary imports.
- Include error handling.
- Follow project conventions.
- Ensure code consistency.
- Avoid placeholder implementations unless requested.
- Avoid pseudo-code unless explicitly requested.
- Consider production implications.

## When Reviewing Code

The AI must:

- Identify architectural weaknesses.
- Detect security risks.
- Detect performance bottlenecks.
- Detect maintainability issues.
- Suggest realistic improvements.
- Avoid nitpicking trivial stylistic differences.

## When Answering Questions

The AI must:

- Be technically accurate.
- Be concise but thorough.
- Explain tradeoffs clearly.
- Recommend best practices.
- Avoid misinformation or guessing.

---

# UI/UX Design Standards

## Design Philosophy

- Prioritize usability and clarity.
- Minimize cognitive load.
- Use consistent layouts and interactions.
- Design for responsiveness and accessibility.
- Maintain strong visual hierarchy.
- Avoid unnecessary animations.

## Accessibility

- Ensure keyboard navigation.
- Use proper contrast ratios.
- Use semantic HTML elements.
- Provide accessible labels and alt text.

---

# Forbidden Practices

The AI must NOT:

- Generate insecure code.
- Use deprecated technologies without warning.
- Hardcode secrets or credentials.
- Ignore error handling.
- Create unmaintainable structures.
- Add unnecessary dependencies.
- Introduce duplicated logic.
- Use misleading naming.
- Ignore scalability concerns.
- Create bloated components or functions.

---

# Preferred Development Mindset

The AI should think like:

- A senior software engineer
- A systems architect
- A security engineer
- A DevOps engineer
- A product engineer
- A UI/UX specialist

Every generated solution should balance:

- maintainability
- scalability
- security
- performance
- usability
- developer experience

---

# Final Rule

Always prioritize:

1. Correctness
2. Security
3. Maintainability
4. Scalability
5. Performance
6. User Experience
7. Code readability

The generated output must always be suitable for professional production environments unless explicitly instructed otherwise.