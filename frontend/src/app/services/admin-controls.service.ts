import {
  ApplicationRef,
  ComponentRef,
  DOCUMENT,
  EnvironmentInjector,
  Injectable,
  ViewContainerRef,
  createComponent,
  inject,
} from '@angular/core';

import { AdminControlsComponent } from '@app/components/admin-controls/admin-controls.component';
import { ADMIN_CONTROLS_OPEN_CLASS } from '@app/constants/admin-controls';
import { AdminControlsConfig, AdminControlsPlacement } from '@app/models';

// Shows one item's admin controls at a time, over the item it was opened on
@Injectable({ providedIn: 'root' })
export class AdminControlsService {
  private readonly appRef = inject(ApplicationRef);
  private readonly document = inject(DOCUMENT);
  private readonly environmentInjector = inject(EnvironmentInjector);

  private componentRef: ComponentRef<AdminControlsComponent> | null = null;
  private anchor: HTMLElement | null = null;

  public get isOpen(): boolean {
    return this.componentRef !== null;
  }

  public open(
    config: AdminControlsConfig,
    anchor: HTMLElement,
    viewContainerRef?: ViewContainerRef,
    placement: AdminControlsPlacement = 'top',
  ): void {
    this.close();

    // Created in the item's own context, so its route's providers reach the controls
    const componentRef = createComponent(AdminControlsComponent, {
      environmentInjector:
        viewContainerRef?.injector.get(EnvironmentInjector) ?? this.environmentInjector,
      elementInjector: viewContainerRef?.injector,
    });
    componentRef.setInput('anchor', anchor);
    componentRef.setInput('config', config);
    componentRef.setInput('placement', placement);
    componentRef.instance.closed.subscribe(() => this.close());
    this.appRef.attachView(componentRef.hostView);
    this.document.body.appendChild(componentRef.location.nativeElement);
    // The pointer leaves the item for its controls, and an item that grows on hover would
    // shrink out from under them
    anchor.classList.add(ADMIN_CONTROLS_OPEN_CLASS);
    this.componentRef = componentRef;
    this.anchor = anchor;
  }

  public close(): void {
    const componentRef = this.componentRef;
    if (!componentRef) {
      return;
    }

    this.componentRef = null;
    this.anchor?.classList.remove(ADMIN_CONTROLS_OPEN_CLASS);
    this.anchor = null;
    const host: HTMLElement = componentRef.location.nativeElement;
    componentRef.destroy();
    host.remove();
  }
}
