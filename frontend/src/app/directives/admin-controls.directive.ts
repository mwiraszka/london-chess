import { Directive, ElementRef, ViewContainerRef, inject, input } from '@angular/core';

import { AdminControlsConfig } from '@app/models';
import { AdminControlsService } from '@app/services';

@Directive({
  selector: '[adminControls]',
  host: { '(contextmenu)': 'onContextMenu($event)' },
})
export class AdminControlsDirective {
  public readonly adminControls = input<AdminControlsConfig | null>(null);

  private readonly adminControlsService = inject(AdminControlsService);
  private readonly elementRef = inject<ElementRef<HTMLElement>>(ElementRef);
  private readonly viewContainerRef = inject(ViewContainerRef);

  public onContextMenu(event: MouseEvent): void {
    const adminControls = this.adminControls();
    if (!adminControls) {
      return;
    }
    // Selected text keeps its own context menu
    const selection = window.getSelection();
    if (selection && selection.toString().trim() !== '') {
      return;
    }
    // An item scrolled partly out of its grid keeps the native menu too
    const host = this.elementRef.nativeElement;
    const scroller = host.closest('.image-grid');
    if (
      scroller &&
      host.getBoundingClientRect().top < scroller.getBoundingClientRect().top
    ) {
      return;
    }
    event.preventDefault();
    this.adminControlsService.open(adminControls, host, this.viewContainerRef);
  }
}
