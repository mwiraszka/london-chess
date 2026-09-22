import { Component, signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';

import { AdminControlsConfig } from '@app/models';
import { AdminControlsService } from '@app/services';
import { query } from '@app/utils';

import { AdminControlsDirective } from './admin-controls.directive';

@Component({
  template: `
    <div
      class="item"
      [adminControls]="config()">
      Item
    </div>
  `,
  imports: [AdminControlsDirective],
})
class HostComponent {
  readonly config = signal<AdminControlsConfig | null>({
    buttonSize: 34,
    deleteCb: vi.fn(),
    editPath: ['event', 'edit'],
    itemName: 'Test Item',
  });
}

describe('AdminControlsDirective', () => {
  let fixture: ComponentFixture<HostComponent>;
  let host: HostComponent;

  let openSpy: Mock;

  const rightClick = (): MouseEvent => {
    const event = new MouseEvent('contextmenu', { bubbles: true, cancelable: true });
    query(fixture.debugElement, '.item').nativeElement.dispatchEvent(event);
    return event;
  };

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [HostComponent],
      providers: [{ provide: AdminControlsService, useValue: { open: vi.fn() } }],
    }).compileComponents();

    fixture = TestBed.createComponent(HostComponent);
    host = fixture.componentInstance;
    openSpy = vi.mocked(TestBed.inject(AdminControlsService).open);
    fixture.detectChanges();
  });

  afterEach(() => vi.restoreAllMocks());

  it('should open the controls at the item on a right click, in place of the menu', () => {
    const event = rightClick();

    expect(event.defaultPrevented).toBe(true);
    expect(openSpy).toHaveBeenCalledWith(
      host.config(),
      query(fixture.debugElement, '.item').nativeElement,
      expect.anything(),
    );
  });

  it('should leave the menu to selected text', () => {
    vi.spyOn(window, 'getSelection').mockReturnValue({
      toString: () => 'Item',
    } as Selection);

    const event = rightClick();

    expect(event.defaultPrevented).toBe(false);
    expect(openSpy).not.toHaveBeenCalled();
  });

  it('should do nothing without a config', () => {
    host.config.set(null);
    fixture.detectChanges();

    const event = rightClick();

    expect(event.defaultPrevented).toBe(false);
    expect(openSpy).not.toHaveBeenCalled();
  });
});
