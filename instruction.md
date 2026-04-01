# 🧠 Manifest Management System — Agent Instruction File

## 1. 🎯 System Overview

The Manifest Management System is a **multi-module operational dashboard** designed to manage organizational workflows across departments such as:

- Finance
- Transportation
- Follow-Ups

The system is transitioning from a **monolithic dashboard architecture** into a **modular, multi-page architecture** with clear separation of concerns.

---

## 2. 🏗️ Tech Stack

### Frontend
- React (CDN-based, no build step dependency)
- TailwindCSS (UI styling)
- React Router (multi-page navigation)

### Backend
- Supabase
  - Authentication (email/password)
  - Database (PostgreSQL)
  - Realtime (optional)

### Mobile
- Capacitor (Android deployment supported)

### Supporting Libraries
- Recharts (data visualization)
- XLSX (Excel import/export)
- Google Maps API (location features)
- @google/genai (AI integrations - optional/experimental)

---

## 3. 🧩 Core Architectural Principles

### 3.1 Modular Design (CRITICAL)

Each major feature must be implemented as an **independent module/page**, not embedded inside a monolith.

#### Required Modules:
- `/finance`
- `/transport`
- `/follow-ups`

Each module must:
- Have its own page/component
- Manage its own state
- Interact with shared services (Supabase, utils)

---

### 3.2 Separation of Concerns

STRICTLY enforce:

| Layer            | Responsibility            |
|------------------|--------------------------|
| UI Components    | Rendering only           |
| Hooks / State    | Local logic              |
| Services         | API/Supabase calls       |
| Utils            | Pure helper functions    |

❌ DO NOT mix UI and data-fetching logic in the same file.

---

### 3.3 State Management Strategy

- Prefer **local state + hooks**
- Avoid global state unless necessary
- Shared state (e.g., user session) should be centralized

---

## 4. 🧱 Core Data Model (MANDATORY)

Agents must structure Supabase tables around these entities:

### 4.1 Users
- id
- email
- role (admin, staff, etc.)

---

### 4.2 Finance Records
- id
- amount
- type (income/expense)
- category
- date
- created_by

---

### 4.3 Transport Records
- id
- vehicle
- driver
- route
- fuel_cost
- date

---

### 4.4 Follow-Ups
- id
- title
- description
- assigned_to
- status (pending/completed)
- due_date

---

### Relationships
- Users ↔ Records (ownership)
- Follow-ups ↔ Users (assignment)

---

## 5. 🧭 Routing Architecture

Use React Router:

```

/login
/dashboard
/finance
/transport
/follow-ups

```

Each route must:
- Be independently loadable
- Not depend directly on other pages

---

## 6. 🔐 Authentication Rules

- All routes except `/login` require authentication
- Use Supabase session
- Redirect unauthenticated users to `/login`

---

## 7. 📊 Dashboard Behavior

The main dashboard should:
- Aggregate data from all modules
- Display summaries (charts, totals)
- NOT contain business logic of modules

---

## 8. ⚙️ Services Layer (IMPORTANT)

Create a `/services` structure:

```

/services
supabaseClient.ts
financeService.ts
transportService.ts
followUpService.ts

```

Each service:
- Handles CRUD operations
- Is reusable across components

---

## 9. 🧪 Error Handling

- Global error logger already exists (DO NOT REMOVE)
- All async operations must:
  - Handle errors gracefully
  - Display user-friendly messages

---

## 10. 📱 Mobile Considerations

- UI must be responsive (mobile-first)
- Avoid large fixed layouts
- Ensure touch-friendly components

---

## 11. 🚫 Anti-Patterns (DO NOT DO)

❌ Rebuilding a monolithic dashboard  
❌ Deep prop drilling across modules  
❌ Mixing Supabase calls inside UI components  
❌ Hardcoding data instead of using services  
❌ Tight coupling between modules  

---

## 12. ✅ Expected Output from Agents

When implementing features, agents MUST:

1. Create modular pages  
2. Use services for data access  
3. Follow the defined data models  
4. Maintain clean separation of concerns  
5. Ensure scalability (future modules can be added easily)  

---

## 13. 🚀 Future Extensions (Optional Guidance)

- Role-based access control  
- Realtime updates (Supabase subscriptions)  
- AI insights (finance predictions, summaries)  
- Notifications system  
- Offline-first support  

---

## 14. 🧠 Agent Execution Strategy

When given a task:

1. Identify the module (finance, transport, follow-ups)  
2. Check if service exists → reuse or extend  
3. Build UI component  
4. Connect via service layer  
5. Ensure routing is updated  
6. Maintain modular integrity  

---

## FINAL DIRECTIVE

> This system MUST evolve into a clean, scalable, modular architecture.  
> Any solution that increases coupling or complexity should be rejected.
