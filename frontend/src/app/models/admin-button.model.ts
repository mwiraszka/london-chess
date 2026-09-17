import { Signal, Type } from '@angular/core';

export interface AdminButton {
  id: string;
  tooltip: string;
  icon: Type<unknown>;
  action: () => void;
  isLoading?: Signal<boolean>;
}
