import { AdminButton } from './admin-button.model';
import { InternalLink } from './link.model';

// An entry in the admin actions menu: a page to open, or something to do
export type AdminAction = InternalLink | AdminButton;
