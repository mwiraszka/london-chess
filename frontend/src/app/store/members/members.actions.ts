import { createAction, props } from '@ngrx/store';

import {
  ApiScope,
  DataPaginationOptions,
  Id,
  LccError,
  Member,
  MemberEmail,
  MemberFormData,
  MemberWithNewRatings,
} from '@app/models';

export const fetchAllMembersRequested = createAction(
  '[Members] Fetch all members requested',
);
export const fetchAllMembersSucceeded = createAction(
  '[Members] Fetch all members succeeded',
  props<{ members: Member[]; totalCount: number; scope: ApiScope }>(),
);
export const fetchAllMembersFailed = createAction(
  '[Members] Fetch all members failed',
  props<{ error: LccError }>(),
);

export const fetchFilteredMembersRequested = createAction(
  '[Members] Fetch filtered members requested',
);
export const fetchFilteredMembersSucceeded = createAction(
  '[Members] Fetch filtered members succeeded',
  props<{
    members: Member[];
    filteredCount: number;
    totalCount: number;
    scope: ApiScope;
  }>(),
);
export const fetchFilteredMembersFailed = createAction(
  '[Members] Fetch filtered members failed',
  props<{ error: LccError }>(),
);

export const fetchMemberRequested = createAction(
  '[Members] Fetch member requested',
  props<{ memberId: Id }>(),
);
export const fetchMemberSucceeded = createAction(
  '[Members] Fetch member succeeded',
  props<{ member: Member; scope: ApiScope }>(),
);
export const fetchMemberFailed = createAction(
  '[Members] Fetch member failed',
  props<{ error: LccError }>(),
);

export const fetchMemberByNumberRequested = createAction(
  '[Members] Fetch member by number requested',
  props<{ memberNumber: number }>(),
);

export const addAMemberSelected = createAction('[Members] Add a member selected');

export const addMemberRequested = createAction(
  '[Members] Add member requested',
  props<{ notifyMember: boolean }>(),
);
export const addMemberSucceeded = createAction(
  '[Members] Add member succeeded',
  props<{ member: Member; emailSent: MemberEmail | null }>(),
);
export const addMemberFailed = createAction(
  '[Members] Add member failed',
  props<{ error: LccError }>(),
);

export const updateMemberRatingsRequested = createAction(
  '[Members] Update member ratings requested',
  props<{ membersWithNewRatings: MemberWithNewRatings[] }>(),
);
export const updateMemberRatingsSucceeded = createAction(
  '[Members] Update member ratings succeeded',
  props<{ members: Member[]; unnotifiedMemberNames: string[] }>(),
);
export const updateMemberRatingsFailed = createAction(
  '[Members] Update member ratings failed',
  props<{ error: LccError }>(),
);

export const updateMemberRequested = createAction(
  '[Members] Update member requested',
  props<{ memberId: Id; notifyMember: boolean }>(),
);
export const updateMemberSucceeded = createAction(
  '[Members] Update member succeeded',
  props<{ member: Member; originalMemberName: string; emailSent: MemberEmail | null }>(),
);
export const updateMemberFailed = createAction(
  '[Members] Update member failed',
  props<{ error: LccError }>(),
);

export const deleteMemberRequested = createAction(
  '[Members] Delete member requested',
  props<{ member: Member }>(),
);
export const deleteMemberSucceeded = createAction(
  '[Members] Delete member succeeded',
  props<{ memberId: Id; memberName: string }>(),
);
export const deleteMemberFailed = createAction(
  '[Members] Delete member failed',
  props<{ error: LccError }>(),
);

export const paginationOptionsChanged = createAction(
  '[Members] Pagination options changed',
  props<{ options: DataPaginationOptions<Member>; fetch: boolean }>(),
);

export const cancelSelected = createAction('[Members] Cancel selected');

export const formDataChanged = createAction(
  '[Members] Form data changed',
  props<{ memberId: Id | null; formData: Partial<MemberFormData> }>(),
);

export const formDataRestored = createAction(
  '[Members] Form data restored',
  props<{ memberId: Id | null }>(),
);

export const parseMemberRatingsFromCsvFailed = createAction(
  '[Members] Parse member ratings from CSV failed',
  props<{ error: LccError }>(),
);

export const exportMembersToCsvRequested = createAction(
  '[Members] Export members to CSV requested',
);
export const exportMembersToCsvSucceeded = createAction(
  '[Members] Export members to CSV succeeded',
  props<{ exportedCount: number }>(),
);
export const exportMembersToCsvFailed = createAction(
  '[Members] Export members to CSV failed',
  props<{ error: LccError }>(),
);
