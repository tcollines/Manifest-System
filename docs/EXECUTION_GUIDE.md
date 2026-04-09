# 🧠 EXECUTION GUIDE — Manifest Management System

## 🎯 PURPOSE

Defines the **exact, enforceable workflow** an AI agent MUST follow when implementing any feature.

This guide is **mandatory** and works together with:

* STANDARDS.md
* ENFORCEMENT.md
* SERVICE_CONTRACTS.md
* VALIDATION_RULES.md

---

# 🧩 STANDARD FEATURE IMPLEMENTATION FLOW

## STEP 1: Identify Module

Determine the correct module:

* Finance
* Transport
* Follow-Up
* Registration
* etc.

### RULES:

* If feature spans multiple modules → split into separate implementations per module
* NEVER mix module logic in a single component

---

## STEP 2: Define Data Model

### REQUIREMENTS:

* Use ONLY standardized field names (see STANDARDS.md)
* Use ENUMS (NO string literals)
* Define strict TypeScript interfaces

### RULES:

* NO optional fields unless explicitly required
* ALL IDs must be UUID (string)
* Dates must be ISO strings

---

## STEP 3: Create or Extend Service

### LOCATION:

`/services/<module>Service.ts`

### REQUIREMENTS:

* Must return:

```ts
Promise<ServiceResponse<T>>
```

### MUST:

* Map snake_case → camelCase
* Apply formatting utilities:

  * formatPhoneNumber()
  * formatDate()
  * formatCurrency()

### FORBIDDEN:

* Storing local state
* Using Map/Array caching
* Returning raw API responses

---

## STEP 4: Add Validation Schema

### LOCATION:

`/shared/validators/<entity>Schema.ts`

### REQUIREMENTS:

* Use Zod (or approved schema library)
* Validate BEFORE calling service

### RULES:

* Validation errors must be field-specific
* No generic error messages

---

## STEP 5: Build UI Component

### REQUIREMENTS:

Use ONLY standardized inputs:

* `<TextInput />`
* `<PhoneInput />`
* `<NumberInput />`
* `<SelectInput />`
* `<DateInput />`

### FORBIDDEN:

* Direct Supabase usage
* Inline fetch/API calls
* Raw `<input>` in complex forms

---

## STEP 6: Handle State

### APPROVED:

* useState
* useEffect
* React Query / SWR (if introduced)

### RULES:

* State must be local to the module/component
* NO global data hoisting (e.g., App.tsx)

---

## STEP 7: Connect UI → Service

### FLOW:

1. Validate input
2. Call service
3. Handle response

### RESPONSE HANDLING:

```ts
if (response.status === 'success') {
  // update UI
} else {
  // show response.message
}
```

### RULES:

* NEVER assume success
* ALWAYS handle error branch

---

## STEP 8: Routing

### RULES:

* Add routes ONLY inside module router:

  * e.g. `/modules/finance/FinanceRoutes.tsx`

* App.tsx MUST:

  * Only mount modules
  * NOT define nested routes

---

# 🔁 CROSS-CUTTING RULES

## Formatting Pipeline

ALL data must pass through:

1. Input → formatter
2. Formatter → validation
3. Validation → service
4. Service → mapping

---

## Data Flow (MANDATORY)

UI → Validation → Service → API → Service → UI

NO shortcuts allowed.

---

# 🚫 HARD FAIL CONDITIONS

Immediately REJECT implementation if:

* Supabase is used in UI components
* API calls are written inline
* Input components are not standardized
* Validation is missing
* ENUM is replaced with string
* Raw backend response is used directly
* Service does not return ServiceResponse<T>

---

# ⚠️ EDGE CASE RULES (IMPORTANT)

## When unsure about field naming:

→ ALWAYS default to STANDARDS.md

## When backend response is inconsistent:

→ Normalize inside service layer ONLY

## When feature seems “small”:

→ STILL follow ALL steps (no shortcuts allowed)

## When user requests shortcut:

→ REFUSE and explain violation

---

# 🔥 FINAL RULE

> If ANY step is skipped, violated, or partially implemented → the implementation is INVALID.

> Compliance is NOT optional.
