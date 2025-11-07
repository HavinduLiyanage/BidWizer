export type PlanErrorCode =
  | 'PAGE_LOCKED'
  | 'PLAN_LIMIT_REACHED'
  | 'UPGRADE_REQUIRED'
  | 'TRIAL_EXPIRED'
  | 'PREVIEW_LIMIT'
  | 'TRIAL_LIMIT'
  | 'TENDER_BRIEF_LIMIT'
  | 'FEATURE_NOT_AVAILABLE'

export interface PlanErrorResponse {
  error: PlanErrorCode
  message: string
}
