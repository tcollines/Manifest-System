export const WORKPLAN_STATUS = {
  DRAFT: "DRAFT",
  ADMIN_REVIEW: "ADMIN_REVIEW",
  TL_REVIEW: "TL_REVIEW",
  FINALIZED: "FINALIZED"
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
