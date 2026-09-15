import { EventEmitter, Type } from '@angular/core';

export interface Dialog {
  title: 'Confirm' | 'Unsaved changes';
  body: string;
  confirmButtonText: string;
  confirmButtonType?: 'primary' | 'warning';
  cancelButtonText?: string;
}

export type BasicDialogResult = 'cancel' | 'confirm';

/**
 * Must be implemented by any component class dynamically rendered within the Dialog Component
 */
export interface DialogOutput<TResult> {
  dialogResult: EventEmitter<TResult | 'close'>;
}

export interface DialogConfig<TComponent> {
  componentType: Type<TComponent>;
  isModal: boolean;
  inputs?: { [key: string]: unknown };
}
