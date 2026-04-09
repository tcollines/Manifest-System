# 🌍 GLOBAL DATA STANDARDIZATION — Manifest Management System

## 1. Naming Conventions

The Manifest Management System suffers from multiple inconsistent naming structures resulting from rapid legacy development. From this point forward, **the following mappings are STRICTLY ENFORCED.**

### 1.1 Field Name Mapping

| Existing Variants | Standard Enforced Name | Scope |
| :--- | :--- | :--- |
| `name`, `firstName`, `lastName` | `fullName` | All People (Users, Members, Children, Souls) |
| `phone`, `contact`, `driverContact` | `phoneNumber` | All Telephone inputs |
| `uid`, `_id` | `id` | All Primary Keys (Must be UUID) |
| `departmentUid`, `d1` (code) | `departmentId` | All Foreign Keys referencing Departments |
| `check_in_time`, `checkInTime` | `checkInAt` | Timestamps representing actions |
| `created_at` | `createdAt` | Base Timestamps |

### 1.2 TypeScript <-> Supabase Bridge Rules
**RULE:** Front-end TypeScript MUST strictly be `camelCase`. The backend database MUST strictly be `snake_case`. Over-the-wire conversions must happen exclusively in the Service Layer boundary (e.g. `mapMemberFromDB` / `mapMemberToDB`).

---

## 2. Enums & String Constants

Currently, magic strings like `'Pending' | 'Approved'` litter the UI types. These are forbidden. All status, type, and category states must use TypeScript `enum`.

```typescript
// /shared/enums.ts

export enum WorkflowStatus {
  PENDING = 'PENDING',
  APPROVED = 'APPROVED',
  REJECTED = 'REJECTED',
  COMPLETED = 'COMPLETED'
}

export enum AttendanceStatus {
  CHECKED_IN = 'CHECKED_IN',
  CHECKED_OUT = 'CHECKED_OUT',
  ABSENT = 'ABSENT'
}

export enum SoulStatus {
  NEW = 'NEW',
  CONTACTED = 'CONTACTED',
  VISITED = 'VISITED',
  INTEGRATED = 'INTEGRATED',
  LOST = 'LOST',
  CONFIRMED = 'CONFIRMED'
}

export enum VehicleJourneyStage {
  ONBOARDING = 'ONBOARDING',
  VERIFYING = 'VERIFYING',
  REGISTRATION_APPROVAL = 'REG_APPROVAL',
  FINANCE_APPROVAL = 'FINANCE_APPROVAL',
  TRANSIT = 'TRANSIT',
  ARRIVED = 'ARRIVED',
  COMPLETED = 'COMPLETED'
}
```
**RULE:** Never use naked string literals for statuses.

---

## 3. Data Type Formatting Utilities

All data processing requires centralized utilities. 

### 3.1 Provided Utilities Required For Save:
```typescript
// /shared/utils/formatters.ts

export const formatPhoneNumber = (phone: string): string => {
   // Implementation must enforce E.164 (e.g. +256...)
   // Remove all whitespace, dashes, and local '0' prefixes.
};

export const formatCurrency = (amount: number, currencyCode: string = 'UGX'): string => {
   // Implementation using Intl.NumberFormat
};

export const normalizeUsername = (username: string): string => {
   // Lowercase, trimmed, spaces replaced by underscores.
};
```

---

## 4. Input & Form Component Standardization

Manual `<input>` tags inside complex components are forbidden. Use generic standardized UI inputs to guarantee design and validation alignment.

### Global Input Components (MANDATORY TO USE)
* `<TextInput name="..." label="..." />`
* `<NumberInput name="..." min={0} format="currency" />`
* `<PhoneInput name="..." defaultCountry="UG" />`
* `<SelectInput name="..." options={...} />`
* `<DateInput name="..." withTime={true} />`

Every component must inherently support:
- `error` prop (string) for highlighting bad input.
- `onBlur` for intermediate formatting injections.
