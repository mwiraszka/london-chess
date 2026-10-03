import { DialogRef, ProgressBarComponent } from '@eagami/ui';

import { ComponentFixture, TestBed } from '@angular/core/testing';

import { query } from '@app/utils';

import { DocumentViewerComponent } from './document-viewer.component';

vi.mock('ng2-pdf-viewer');

describe('DocumentViewerComponent', () => {
  let fixture: ComponentFixture<DocumentViewerComponent>;
  let component: DocumentViewerComponent;
  let closeSpy: MockInstance;

  beforeEach(async () => {
    const dialogRef = new DialogRef();
    closeSpy = vi.spyOn(dialogRef, 'close');

    await TestBed.configureTestingModule({
      imports: [DocumentViewerComponent],
      providers: [{ provide: DialogRef, useValue: dialogRef }],
    }).compileComponents();

    fixture = TestBed.createComponent(DocumentViewerComponent);
    component = fixture.componentInstance;

    fixture.componentRef.setInput('documentPath', 'assets/documents/test-document.pdf');
    fixture.detectChanges();
  });

  describe('onProgress', () => {
    it('should calculate percentLoaded correctly when onProgress is called', () => {
      component.onProgress({ loaded: 75, total: 100 });
      expect(component.percentLoaded()).toBe(75);
    });

    it('should not change percentLoaded if total progress is negative or zero', () => {
      component.onProgress({ loaded: 2, total: 100 });
      expect(component.percentLoaded()).toBe(2);

      component.onProgress({ loaded: 10, total: -1 });
      expect(component.percentLoaded()).toBe(2);
    });

    it('should not change percentLoaded if loaded progress exceeds loaded progress', () => {
      component.onProgress({ loaded: 5, total: 100 });
      expect(component.percentLoaded()).toBe(5);

      component.onProgress({ loaded: 150, total: 100 });
      expect(component.percentLoaded()).toBe(5);
    });

    it('should show the loading progress until the document has loaded', () => {
      component.onProgress({ loaded: 42, total: 100 });
      fixture.detectChanges();

      const progressBar: ProgressBarComponent = query(
        fixture.debugElement,
        'ea-progress-bar',
      ).componentInstance;
      expect(progressBar.value()).toBe(42);

      component.onProgress({ loaded: 100, total: 100 });
      fixture.detectChanges();

      expect(query(fixture.debugElement, 'ea-progress-bar')).toBeFalsy();
    });
  });

  it('should close when the dialog is dismissed', () => {
    query(fixture.debugElement, '.ea-dialog__close').nativeElement.click();

    expect(closeSpy).toHaveBeenCalledWith();
  });
});
