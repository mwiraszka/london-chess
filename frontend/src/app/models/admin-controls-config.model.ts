import { InternalPath } from './link.model';

export interface AdminControlsConfig {
  bookmarkCb?: () => void;
  editPath?: InternalPath;
  editInNewTab?: boolean;
  isEditDisabled?: boolean;
  editDisabledReason?: string;
  deleteCb: () => void;
  isDeleteDisabled?: boolean;
  deleteDisabledReason?: string;
  itemName?: string;
  bookmarked?: boolean;
}
