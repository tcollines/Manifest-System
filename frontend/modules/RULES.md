# Module Health Rules

A module is **healthy** when it satisfies ALL of the following:

## Independence
- [ ] Renders independently — requires zero props from `App.tsx`
- [ ] Fetches its own data via `EventStore` cache or its own store hook
- [ ] Does not import from or depend on other modules

## Boundaries
- [ ] Only imports from: `services/*`, `database/*`, `context/AuthContext`, `components/ui/*`, `types`, `utils`, `hooks/*`
- [ ] Never imports from `App.tsx` or another sibling module
- [ ] Owns its own modal open/close state (no global `modalType`)

## Routing
- [ ] All tabs are controlled by URL via `<NavLink>` and `useParams`/`<Outlet />`
- [ ] No `useState` for active tab tracking
- [ ] No `localStorage.setItem` for tab persistence
- [ ] Layout renders `<Outlet />` for child page content

## Safety
- [ ] Wrapped in `ErrorBoundary` via `ModuleShell` in `routes.tsx`
- [ ] Uses `useAuth()` for current user identity — never receives `currentUser` as prop
- [ ] Never calls `useNavigate()` directly — uses `navigationService` or `<NavLink>`

---

Use this checklist in PR reviews before merging new modules.
