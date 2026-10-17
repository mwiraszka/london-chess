import { Signal, Type } from '@angular/core';

import { InternalPath } from './link.model';

// Like actions sit together in the admin actions menu, in the order ADMIN_ACTION_GROUPS sets
export type AdminActionGroup = 'add' | 'data' | 'manage' | 'delete';

interface BaseAdminAction {
  label: string;
  icon: Type<unknown>;
  group: AdminActionGroup;
}

// Opens a page, such as an editor
export interface AdminLinkAction extends BaseAdminAction {
  path: InternalPath;
  run?: never;
  isLoading?: never;
}

// Does something where the admin is, such as exporting a file
export interface AdminCommandAction extends BaseAdminAction {
  run: () => void;
  isLoading?: Signal<boolean>;
  path?: never;
}

export type AdminAction = AdminLinkAction | AdminCommandAction;
