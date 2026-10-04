import { Signal } from '@angular/core';

export interface Dialog {
  title: 'Confirm' | 'Unsaved changes';
  body: string;
  confirmButtonText: string;
  confirmButtonType?: 'primary' | 'warning';
  cancelButtonText?: string;
  // Keeps the dialog open, with the confirm button loading, until the work is done
  confirmAction?: () => Promise<unknown>;
  uploadProgress?: Signal<{ uploaded: number; total: number } | null>;
}

export type BasicDialogResult = 'cancel' | 'confirm';
