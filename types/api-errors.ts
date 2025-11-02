export type PlanErrorCode =
  | 'PAGE_LOCKED'
  | 'PLAN_LIMIT_REACHED'
  | 'UPGRADE_REQUIRED'
  | 'TRIAL_EXPIRED'

export interface PlanErrorResponse {
  error: PlanErrorCode
  message: string
}
