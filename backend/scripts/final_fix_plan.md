# S378 & First Timer Attendance Fix Plan

## Problem
1. **S378 Inconsistency**: 101 records use legacy 'S378' ID; 734 orphans use UUID but point to deleted members.
2. **First Timer UI Bug**: `getServiceStats` counts current 'First Timer' category, but members are promoted to 'Member' upon check-in, making the count consistently 0 for past services.

## Proposed Strategy

### 1. Data Repair (`scripts/master_attendance_repair_v2.ts`)
- **Action**: Migrate all records for S378 (legacy 'S378' and UUID) to point to the correct **Master Member IDs** and the **S378 UUID**.
- **Collision Handling**: Use a `DELETE` strategy for records that would violate the `(member_id, service_id)` unique constraint after re-mapping.
- **Scope**: Targeted fix for S378, but extensible to other services if needed.

### 2. Backend Logic Fix (`memberController.ts`)
- **Modify `getServiceStats`**:
  - Filter First Timers based on `joined_date` matching `serviceDate` instead of current `category`.
- **Modify `getMemberDetails`**:
  - Ensure it correctly maps legacy service IDs to modern event titles.

### 3. Verification
- Run `audit_s378_uuid.ts` to confirm 835 registered members (or close to it after deduplication).
- Check UI screenshots for Arthur and S378 stats.

## Next Steps
- [ ] Run `master_attendance_repair_v2.ts`.
- [ ] Apply logic fixes to `memberController.ts`.
- [ ] Verify UI.
