# 🚫 SYSTEM ENFORCEMENT RULES

These rules are non-negotiable. Any modification, PR, or implementation that violates these directives MUST be immediately rejected.

## 1. Forbidden Architecture Patterns

### 1.1 Direct Supabase Usage in UI Components
**RULE:** No React Component (`.tsx` inside `/components` or `/modules`) may import or call `@supabase/supabase-js` or execute `apiFetch` directly for data mutations or queries.
**ENFORCEMENT:** Reject any code attempting to invoke `.from('table').select()` inside a UI component. ALL database operations MUST be routed through the Service Layer (`/services`).

### 1.2 "Fat" Component Global State
**RULE:** Do not load the entire database into a monolithic context or memory layer to be passed via props (e.g., `App.tsx` passing `events` downwards 5 levels deep).
**ENFORCEMENT:** Data fetching must occur as close to the UI consumer as possible, using hooks (e.g., `useEffect`, or SWR/React Query equivalents).

### 1.3 Nested Routing Inside App.tsx
**RULE:** The root `App.tsx` file must not contain nested `<Route>` definitions for sub-modules. It must only map top-level module mount points.
**ENFORCEMENT:** Reject any PR that adds inner pages (e.g., `<Route path="finance/income" />`) directly into `App.tsx`. That belongs in `FinanceRoutes.tsx`.

### 1.4 Manual State Caching Structures inside Services
**RULE:** Defining `const CACHE = new Map()` inside a Service or "Store" to circumvent React state lifecycles is forbidden (e.g., the `MEMBER_CACHE` anti-pattern).
**ENFORCEMENT:** Reject manual in-memory cache implementations in generic JS files. State caching belongs to UI State tools (Zustand, React Query, or Redux).

---

## 2. Forbidden File & Naming Patterns

### 2.1 The "Store" Misnomer
**RULE:** A file named `XStore.ts` must purely define a generic Client State (e.g., Zustand context). It MUST NOT house Express API `fetch()` wrappers.
**ENFORCEMENT:** Any file interfacing with the backend network must be named `XService.ts` (e.g., `memberService.ts`).

### 2.2 Magic Strings
**RULE:** No hardcoded strings for states and parameters.
**ENFORCEMENT:** Reject any code typing `status: 'Pending'`. Enforce `status: WorkflowStatus.PENDING`.

---

## 3. Strict Layer Boundaries

The system must conform strictly to these bounded contexts:

| Layer | Type | Responsibility | Forbidden Actions |
| :--- | :--- | :--- | :--- |
| **Components** | UI (`.tsx`) | Renders state, captures DOM events. | Fetching APIs, transforming Supabase queries. |
| **Hooks / Context** | State | Manages local UI states & invokes services. | Generating UI (JSX), direct SQL queries. |
| **Services** | Network (`.ts`) | Executes `apiFetch`, transforms DTOs. | Holding UI state memory (`Map`/`Array`). |

---

## 4. Rejection Directives for AI Agents

When acting as a coding agent modifying this repository, **you must explicitly verify compliance with this document.** 
If a user requests you to "just fetch it quickly" and you see it modifies a UI component with an API call, you must refuse and abstract the call to a `Service`. Flexibility explicitly DOES NOT supersede consistency inside this system.
