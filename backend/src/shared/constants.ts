export const WORKPLAN_STATUS = {
  DRAFT: "Draft",
  ADMIN_REVIEW: "Admin_Review",
  TL_REVIEW: "TL_Review",
  FINALIZED: "Finalized"
} as const;

export const REQUISITION_STATUS = {
  DRAFT: "DRAFT",
  PENDING: "PENDING",
  FINANCE_BATCH: "FINANCE_BATCH",
  TL_APPROVAL: "TL_APPROVAL",
  APPROVED: "APPROVED",
  PAID: "PAID",
  REJECTED: "REJECTED"
} as const;

export type WorkplanStatusType = typeof WORKPLAN_STATUS[keyof typeof WORKPLAN_STATUS];
export type RequisitionStatusType = typeof REQUISITION_STATUS[keyof typeof REQUISITION_STATUS];
