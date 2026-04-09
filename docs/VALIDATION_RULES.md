# 🧪 GLOBAL VALIDATION RULES

All inputs and automated workflows must be gated through these validations. Never rely on the database schema defaults alone to reject malformed data. Validate early at the UI/Service level.

## 1. Field Level Validations

### 1.1 Identifiers (IDs)
* **Rule**: All `id`, `eventId`, `departmentId`, and foreign keys must be strictly validated as version-4 UUIDs.
* **Regex**: `/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i`
* **Enforcement**: Reject request or block form submission if ID generation falls back to random strings like `'e1'`.

### 1.2 Phone Numbers (`phoneNumber`)
* **Rule**: Must be validated against globally recognized E.164 standard logic. 
* **Constraint**: For regional usage, inputs missing a country code must automatically prepend `+256` (Uganda) prior to submission.
* **Format**: String. No spaces, no dashes, no parentheses. (e.g. `+256700000000`).

### 1.3 Currency / Amounts (`amount`)
* **Rule**: Must be strictly passed across network requests as **Integers** (e.g. cents).
* **UI Constraint**: Visualized to the user via `Intl.NumberFormat('en-UG', { style: 'currency', currency: 'UGX' })`.
* **Enforcement**: Under no circumstance should a string with commas `"10,000"` be sent over JSON payload to the database.

### 1.4 Usernames & Emails
* **Username**: Alpha-numeric, lowercase only, no spaces. `\^[a-z0-9_]{3,20}\$`.
* **Email**: Standard RFC 5322 regex validation.

## 2. Central Validation Pattern

All forms and payload submissions must use standard schema wrappers (e.g., Zod, Yup, or Joi) centralized inside a `/shared/validators/` folder.

```typescript
// /shared/validators/memberSchema.ts
import { z } from 'zod';

export const CreateMemberSchema = z.object({
  fullName: z.string().min(2, "Full Name is required").max(100),
  phoneNumber: z.string().regex(/^\+[1-9]\d{10,14}$/, "Must be a valid E.164 phone number"),
  residence: z.string().min(3),
  status: z.nativeEnum(AttendanceStatus)
});
```

## 3. Error Handling Paradigm

When validation fails, errors must be bubbled up uniquely identifying the faulty field.

**Forbidden Output**: 
`Error: Failed to save user.`

**Required Output**: 
`Error: Validation failed -> phoneNumber: "Must be a valid E.164 phone number".`

## 4. Specific Business Constraints (Database / Form Layer)
1. **Tithes & Requisitions**: A requisition amount requested must never exceed internal preset caps organically without Admin Override boolean flag set to true.
2. **First Timers**: A record identified as `isFirstTime === true` MUST require `phoneNumber` and `residence` data values. Guest/Anonymous pass-throughs missing contact data cannot be classified specifically as Follow-Up First Timers.
3. **Vehicle Registration**: `number_plate` MUST follow local formats (e.g., removing whitespace internally, uppercase casting `uab123m` -> `UAB123M`).
