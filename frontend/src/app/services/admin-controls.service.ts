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
import { AdminControlsConfig, AdminControlsPlacement } from '@app/models';

// Shows one item's admin controls at a time, over the item it was opened on
@Injectable({ providedIn: 'root' })
export class AdminControlsService {
  private readonly appRef = inject(ApplicationRef);
  private readonly document = inject(DOCUMENT);
  private readonly environmentInjector = inject(EnvironmentInjector);

  private componentRef: ComponentRef<AdminControlsComponent> | null = null;

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
    this.componentRef = componentRef;
  }

  public close(): void {
    const componentRef = this.componentRef;
    if (!componentRef) {
      return;
    }

    this.componentRef = null;
    const host: HTMLElement = componentRef.location.nativeElement;
    componentRef.destroy();
    host.remove();
  }
}
