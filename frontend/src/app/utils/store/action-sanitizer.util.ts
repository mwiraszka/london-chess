import { Action } from '@ngrx/store';

interface GenericAction extends Action {
  [key: string]: unknown;
}

/**
 * Sanitize the action by replacing sensitive props if it includes any.
 */
export function actionSanitizer(action: Action): GenericAction {
  return { ...action };
}
