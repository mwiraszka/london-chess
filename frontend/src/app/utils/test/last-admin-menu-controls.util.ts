import { AdminControlsConfig } from '@app/models';
import { isAdminControlsConfig } from '@app/utils/type-guards/is-admin-controls-config.util';

// The admin actions an item handed the menu it last opened, from a spy on
// `MenuComponent.prototype.openAsContextMenu`
export function lastAdminMenuControls(openSpy: {
  mock: { lastCall?: unknown[] };
}): AdminControlsConfig {
  const controls = openSpy.mock.lastCall?.[2];
  if (!isAdminControlsConfig(controls)) {
    throw new Error('No admin menu was opened.');
  }
  return controls;
}
