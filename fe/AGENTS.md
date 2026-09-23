## Core Principles

- Follow the existing codebase before introducing new patterns.
- Keep changes small, direct, and easy to review.
- Prefer simple solutions over speculative abstractions.
- Implement only what is required by the current task.
- Reuse existing utilities, components, hooks, and API clients where possible.
- Do not perform Git commits, pushes, resets, or branch operations unless the
  user explicitly asks for them.

## Dangerous Operation Confirmation

Agents must ask for explicit confirmation before performing high-risk actions:

- deleting files or directories
- batch-moving or batch-rewriting files
- modifying system configuration or permissions
- changing package manager configuration
- updating major dependencies
- calling production APIs
- running database or destructive data operations
- running `git commit`, `git push`, or `git reset --hard`

Confirmation format:

```text
Dangerous operation detected.
Operation: <operation>
Scope: <affected files, services, or data>
Risk: <possible consequence>

Please confirm whether to continue.
```

## Security Rules

Never read, print, or request secret values.

Forbidden:

- Do not read `.env`, `.env.local`, `.env.production`, or equivalent secret files.
- Do not ask the user to paste credentials, tokens, cookies, or private keys.
- Do not include real secrets in examples, tests, logs, screenshots, or docs.
- Do not send sensitive data to external services.

Allowed:

- Read `.env.example`, `.env.template`, or documented public configuration.
- Use placeholders such as `<SECRET>`, `<TOKEN>`, or `***REDACTED***`.
- Reference environment variables by name only.

Frontend-specific rule:

- Treat all frontend environment variables as public because they are bundled
  into browser-delivered code.
- Do not store secrets in `VITE_*`, `NEXT_PUBLIC_*`, or other client-exposed
  variables.
- Frontend variables may contain public base URLs, feature flags, release
  channels, or analytics public keys only when those values are safe to expose.

## Repository Discovery

Before editing, inspect the existing implementation:

- package manager and scripts
- framework version and routing pattern
- component organization
- API client conventions
- state management
- styling approach
- test setup
- lint and formatting setup

Use fast repository search tools such as `rg` where available.

## Error Recovery

- Do not repeatedly retry the same failing command or code path without changing
  the diagnosis.
- If the same error appears twice, pause and inspect the surrounding code,
  dependency docs, changelog, or issue tracker before attempting another fix.
- Identify several plausible causes, choose the smallest supported fix, and
  document any remaining uncertainty in the final response.
- Treat failing tests as evidence. Read the failure, locate the behavioral
  boundary, and avoid broad rewrites when a narrow fix is available.

## Suggested Project Structure

This template assumes a frontend project similar to:

```text
frontend/
├── src/
│   ├── apis/
│   ├── assets/
│   ├── components/
│   ├── hooks/
│   ├── layouts/
│   ├── pages/
│   ├── router/
│   ├── stores/
│   ├── styles/
│   ├── types/
│   └── utils/
├── public/
├── package.json
├── pnpm-lock.yaml
├── vite.config.ts
└── tsconfig.json
```

If the actual project structure differs, follow the existing structure instead
of forcing this reference layout. New files should be placed near related code.

## Code Style

- Use TypeScript for application code.
- Prefer strict types and explicit domain models over broad `any` usage.
- Use English for code comments, docs, identifiers, logs, and error messages.
- Keep comments short and useful. Do not explain obvious assignments.
- Preserve existing naming, formatting, import ordering, and file organization.
- Avoid unrelated refactors.
- Keep each directory easy to scan. If a folder grows large, split by feature,
  route, component family, or responsibility instead of adding unrelated files
  at the same level.

## Size And Complexity Budgets

Use these limits as default engineering budgets for new or meaningfully modified
frontend code:

- Route or page files should stay under about 700 non-blank, non-comment lines.
- Reusable components should stay under about 300 non-blank, non-comment lines.
- Functions, render helpers, and hooks should stay under about 120 non-blank,
  non-comment lines.
- Cyclomatic complexity should stay at or below 15.
- Nesting depth should stay at or below 4.
- A single `useEffect` should own one lifecycle concern only.

When existing files already exceed these budgets, keep bug fixes narrow. For
feature work, first create a small extraction point such as a hook, helper, or
child component, then add the new behavior there.

## Frontend Architecture

- Keep route components focused on composition, loading states, and data flow.
- Keep complex business rules outside presentational components.
- Put reusable UI in `components/`.
- Put page-level screens in `pages/` or the existing route directory.
- Put API calls in `apis/` or the existing API client layer.
- Put shared hooks in `hooks/`.
- Put global or shared state in `stores/` when the project already uses a store.
- Put pure helpers in `utils/`.
- Keep feature-specific code close to the feature when the repository follows a
  feature-based structure.
- Avoid creating new architecture layers for one-off needs.
- Do not mix server state, URL state, local UI state, and persisted app state in
  the same abstraction unless the existing project already has that pattern.

## Feature Boundaries

- Put new behavior in the closest existing feature, route, or page boundary.
- Do not move feature-private logic into global `components/`, `hooks/`,
  `utils/`, or `stores/` just because it might be reusable later.
- Promote code to a shared layer only after at least two real call sites need it
  or the project already has a clear shared abstraction for that concern.
- Do not import another feature's private files. Cross-feature reuse must go
  through a stable public API, shared module, or project-approved boundary.
- Keep feature-specific types, mappers, validators, and helpers close to the
  feature unless they are truly shared domain concepts.

## Component Responsibilities

- Route or page components may coordinate routing, permissions, data loading,
  layout composition, and feature orchestration.
- Container or feature components may connect API data, stores, and business
  rules to presentational components.
- Presentational components should receive props and emit events. They should
  not call APIs, read route params, mutate global stores, or own cross-feature
  business rules.
- Form components may own local input state, but submission side effects,
  persistence, and navigation should live in a container, page, or focused hook.
- Move complex data mapping, validation, and orchestration out of JSX render
  bodies and into typed helpers, mappers, or hooks.

## State Ownership

- Keep local UI state such as open/closed, hover, selected row, and temporary
  input state inside the smallest relevant component.
- Keep shareable navigation state such as filters, pagination, sorting, and tabs
  in URL/search params when users need refresh, back/forward, or shareable links.
- Keep server state in the project's data-fetching layer or cache. Do not copy
  server data into global stores without a clear ownership and invalidation
  strategy.
- Use global stores only for cross-page client state, application session state,
  or state that genuinely has multiple distant consumers.
- Persist only intentional user preferences, drafts, or session-safe values.
  Never persist secrets.
- Do not store derived state when it can be computed from props, URL params,
  server data, or store state cheaply and reliably.

## Naming And Exports

- Follow existing naming conventions first.
- When the project has no convention, prefer `XxxPage.tsx` for route screens,
  `XxxLayout.tsx` for layouts, `useXxx.ts` for hooks, `xxxApi.ts` for API
  modules, `xxxStore.ts` for stores, and `xxx.types.ts` for shared types.
- Keep feature-internal helpers private to the feature directory.
- Use `index.ts` barrel files only for stable public exports. Do not export
  internal helpers, test fixtures, or implementation details through a public
  barrel.

## Component Reuse

- Prefer existing components, hooks, utilities, API clients, icons, and design
  tokens before creating new ones.
- Before building a new component, search for a close existing implementation in
  shared components, feature components, examples, and local design-system
  wrappers.
- Do not duplicate a component just to make a small visual or behavioral
  variation. Extend the existing component through its supported props or compose
  it locally when that keeps the API clear.
- Create a new reusable component only when the existing component cannot meet
  the requirement without awkward props, hidden coupling, or behavior that would
  harm existing call sites.
- When a new shared component or abstraction seems necessary, explain the gap and
  discuss it with the user unless the task explicitly asks for that abstraction.
- Keep one-off UI local to the feature until at least two real call sites need a
  shared component.

## Project Configuration

- Preserve the existing package manager, build tool, module format, and path
  aliases.
- Keep `tsconfig`, bundler, lint, formatter, and test configuration changes
  minimal and task-driven.
- Prefer existing aliases such as `@/` instead of deep relative imports when the
  project already uses aliases.
- Do not loosen TypeScript, lint, or test rules to make an implementation pass.
- Do not enable source maps, analytics, or remote debugging for production
  builds unless the project has an explicit policy for it.
- Keep environment variable names documented in example files, not secret files.

## React Guidelines

- Prefer function components and hooks.
- Keep components small enough to understand without excessive indirection.
- Do not introduce global state for local UI state.
- Memoize only when there is a measurable or obvious rendering concern.
- Keep side effects inside dedicated hooks or clearly scoped `useEffect` blocks.
- Preserve the repository's routing pattern, such as `useRoutes` or file-based
  routing.
- Do not mix route normalization, polling, API hydration, modal state, and
  derived UI state in one effect.

## API And Error Handling

- Use the existing API client instead of creating ad hoc `fetch` or `axios`
  calls.
- Keep endpoint definitions and request/response types close to the API layer.
- Prefer backend-provided error messages when the project standard allows it.
- Avoid duplicate error notifications from both interceptors and business code.
- Handle authentication failures in the existing global auth flow.
- Keep local validation errors separate from API failure handling.
- Surface API request failures once from the business catch path or the
  project's chosen error utility. Do not add duplicate non-auth toasts in global
  interceptors when feature code also handles the error.
- Prefer backend-provided `message` values when they are safe for users; use a
  frontend fallback when the backend does not provide a message.

## Forms And Keyboard Behavior

- Forms should support Enter-to-submit when the focused field belongs to the
  main submit flow.
- Prefer native form semantics and the component library's submit mechanism.
- If a custom input, modal, or wizard footer intercepts keyboard events, wire
  Enter explicitly to the same validated submit path used by the primary button.
- Preserve validation, disabled, and loading guards for keyboard submission.
- Keep validation rules centralized for each form. Do not duplicate the same
  required, pattern, length, or business rule across blur handlers, submit
  handlers, and button click handlers.
- Keep create and edit forms explicit about initial values, dirty state, reset
  behavior, and submit payload mapping.
- Keep field error messages close to the validation rule or form schema so the
  user-facing behavior has one source of truth.

## UI Implementation

- Match the existing design system, spacing scale, typography, and interaction
  patterns.
- Use the existing icon system before adding a new icon dependency.
- Use existing UI components before building new controls. Do not recreate
  forms, tables, dialogs, dropdowns, uploaders, notifications, pagination, or
  navigation primitives when the project or UI library already provides them.
- Use standard controls for standard interactions: buttons, menus, tabs, forms,
  switches, segmented controls, sliders, and dialogs.
- Do not create a marketing landing page when the requested output is an app,
  dashboard, tool, or workflow screen.
- Keep layouts responsive across mobile and desktop.
- Ensure text does not overflow, overlap, or become unreadable.
- Avoid decorative visuals that do not support the product experience.
- Do not nest cards inside cards unless the existing design system requires it.
- For dashboard, SaaS, CRM, or workflow products, prefer dense, scannable, and
  predictable layouts over decorative marketing-style sections.
- Use stable dimensions for fixed-format UI such as toolbars, icon buttons,
  counters, boards, grids, and stat cards so hover, loading, and dynamic text do
  not shift layout.

## Accessibility

- Use semantic elements before adding ARIA attributes.
- Use buttons for actions and links for navigation.
- Keep keyboard navigation, visible focus states, and logical tab order intact.
- Ensure form controls have labels, validation messages, and accessible error
  states.
- Keep dialogs, drawers, popovers, and menus compatible with keyboard and screen
  reader expectations.
- Use `alt=""` for decorative images and meaningful `alt` text for content
  images.
- Do not remove accessible names from icon-only controls.

## Styling

- Follow the existing styling approach: CSS Modules, SCSS Modules, Tailwind,
  CSS-in-JS, or component-library styling.
- Prefer local component styles over broad global overrides.
- Keep class names semantic and scoped.
- Avoid hardcoded one-off colors when design tokens or theme variables exist.
- Use stable dimensions for fixed-format UI elements such as toolbars, icon
  buttons, grids, boards, counters, and tiles.

## Assets And Figma

- Use real exported assets when implementing from design files.
- Inspect the exact Figma frame, component, or icon node before coding. Prefer a
  narrow node request over loading an entire page.
- Match provided desktop frame alignment, spacing, typography, colors, borders,
  radii, and shadows precisely when the design gives those values.
- Download or import the smallest meaningful asset node.
- Inspect SVG assets before use.
- Reject exports containing invalid path data, unexpected text, oversized frames,
  or missing dimensions.
- Use `alt=""` and `aria-hidden="true"` for decorative images.
- Do not redraw complex icons in CSS when a valid asset exists.
- When using component libraries inside a Figma-restored screen, account for
  library default padding, line height, and internal DOM. Prefer scoped
  component-local overrides over global library selectors.
- Verify at the target desktop width and at least one narrow width before
  finishing UI-heavy work.

## Testing Strategy

- Test pure logic, formatting, data mapping, hooks, and complex component state.
- Add integration or component tests for critical user flows when the change
  affects routing, forms, permissions, API errors, or async states.
- Mock network calls at the API boundary rather than inside UI details.
- Cover loading, empty, error, and permission states when they are part of the
  changed behavior.
- Prefer regression tests for bug fixes: write or update a test that would have
  failed before the fix when the project test setup makes that practical.
- Test validators, mappers, formatters, and state transitions directly before
  reaching for heavier page tests.
- Do not add brittle tests that assert implementation details unrelated to user
  behavior.

## Verification

Before finishing, run the smallest relevant verification command available:

- typecheck
- lint
- unit tests
- component tests
- build
- visual check for UI-heavy changes

If a command cannot be run, explain why and state the remaining risk.

Prefer targeted verification first. For example, run the specific component or
feature tests touched by the change before expanding to full test suites.

## Package Management

- Use the package manager already present in the repository.
- Do not switch package managers.
- Do not update major dependencies unless explicitly requested.
- Do not add dependencies when existing code or platform APIs are sufficient.
- Prefer small, well-maintained dependencies only when they materially reduce
  complexity.

## Git Safety

- Do not commit unless explicitly requested.
- Do not push unless explicitly requested.
- Do not reset, checkout, or discard user changes unless explicitly requested.
- If the worktree has unrelated changes, leave them untouched.
- If user changes affect the task, work with them rather than reverting them.

## Documentation

- Keep public documentation free of secrets, private paths, internal hostnames,
  and business-sensitive information.
- Prefer examples with placeholders.
- Update the nearest relevant documentation when changing user flows, route
  contracts, reusable component APIs, debug flags, environment variables, or
  verification workflows.
- Prefer feature-local documentation for feature-scoped behavior and broader
  docs only for shared conventions or cross-feature architecture.
- Document project-specific decisions only when they help future maintainers.
- Record a short decision note when introducing a new state library, UI library,
  data-fetching layer, routing structure, design-system primitive, or other
  cross-feature architecture choice.
- Do not create decision records for small local implementation details.

## Final Self-Check

Before finishing, verify:

- Existing components, hooks, utilities, API clients, icons, and tokens were
  reused where practical.
- Feature-private logic did not leak into shared directories unnecessarily.
- State lives at the correct owner: local component, URL, server cache, global
  store, or persistence.
- API errors are surfaced once and authentication failures follow the existing
  global flow.
- Forms keep validation, Enter submission, disabled state, loading state, and
  payload mapping on one coherent path.
- Loading, empty, error, permission, and narrow viewport states were considered
  when affected.
- The smallest relevant verification ran, or any skipped command is explained
  with residual risk.