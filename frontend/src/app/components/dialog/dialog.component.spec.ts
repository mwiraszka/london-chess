import { Component, EventEmitter, Input, Output } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';

import { DialogOutput } from '@app/models';
import { DIALOG_CONFIG_TOKEN } from '@app/services';
import { query } from '@app/utils';

import { DialogComponent } from './dialog.component';

@Component({
  template: '<div>Test Content</div>',
})
export class MockContentComponent implements DialogOutput<string> {
  @Input() public testInput?: string;

  @Output() public dialogResult = new EventEmitter<string | 'close'>();

  public emitResult(result: string): void {
    this.dialogResult.emit(result);
  }
}

describe('DialogComponent', () => {
  let fixture: ComponentFixture<DialogComponent<MockContentComponent, string>>;
  let component: DialogComponent<MockContentComponent, string>;

  let resultSpy: MockInstance;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [DialogComponent, MockContentComponent],
      providers: [
        {
          provide: DIALOG_CONFIG_TOKEN,
          useValue: {
            componentType: MockContentComponent,
            inputs: { testInput: 'testValue' },
            isModal: true,
          },
        },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(DialogComponent<MockContentComponent, string>);
    component = fixture.componentInstance;

    resultSpy = vi.spyOn(component.result, 'emit');

    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should forward events from the content component', () => {
    // @ts-expect-error Private class member
    component.contentComponentRef?.instance.dialogResult.emit('test-result');

    expect(resultSpy).toHaveBeenCalledWith('test-result');
  });

  describe('template rendering', () => {
    it('should have a close button that emits "close" result event', () => {
      query(fixture.debugElement, '.close-button').triggerEventHandler('click');

      expect(resultSpy).toHaveBeenCalledWith('close');
    });
  });
});
