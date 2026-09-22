import { CanActivateFn } from '@angular/router';

import { Member } from '@app/models';
import { MembersActions, MembersSelectors } from '@app/store/members';
import { isRecordNumber } from '@app/utils';

import { recordGuard } from './record.guard';

// Refetched so a rating update reaches every visitor
export function memberProfileGuard(param: string): CanActivateFn {
  return recordGuard<Member>({
    param,
    isWellFormed: isRecordNumber,
    select: value => MembersSelectors.selectMemberByNumber(Number(value)),
    request: value =>
      MembersActions.fetchMemberByNumberRequested({ memberNumber: Number(value) }),
    failed: MembersActions.fetchMemberFailed,
    refreshes: true,
  });
}
