import { areSame } from '@app/utils/common/are-same.util';

// A refreshed record keeps a draft with unsaved edits, while a draft without any takes on
// the refreshed copy, so another admin's save never shows up as an edit of your own
export function refreshedFormData<FormData extends object>(
  draft: FormData | null | undefined,
  saved: FormData | null | undefined,
  refreshed: FormData,
): FormData {
  return draft && saved && !areSame(draft, saved) ? draft : refreshed;
}
