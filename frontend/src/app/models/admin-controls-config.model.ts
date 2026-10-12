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

// At the top start corner of the item, or centred on its start edge
export type AdminControlsPlacement = 'top' | 'center';
