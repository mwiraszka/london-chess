import { ComponentFixture, TestBed } from '@angular/core/testing';

import { DocumentViewerComponent } from './document-viewer.component';

vi.mock('ng2-pdf-viewer');

describe('DocumentViewerComponent', () => {
  let fixture: ComponentFixture<DocumentViewerComponent>;
  let component: DocumentViewerComponent;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [DocumentViewerComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(DocumentViewerComponent);
    component = fixture.componentInstance;

    component.documentPath = 'assets/documents/test-document.pdf';
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  describe('onProgress', () => {
    it('should calculate percentLoaded correctly when onProgress is called', () => {
      component.onProgress({ loaded: 75, total: 100 });
      expect(component.percentLoaded).toBe(75);
    });

    it('should not change percentLoaded if total progress is negative or zero', () => {
      component.onProgress({ loaded: 2, total: 100 });
      expect(component.percentLoaded).toBe(2);

      component.onProgress({ loaded: 10, total: -1 });
      expect(component.percentLoaded).toBe(2);
    });

    it('should not change percentLoaded if loaded progress exceeds loaded progress', () => {
      component.onProgress({ loaded: 5, total: 100 });
      expect(component.percentLoaded).toBe(5);

      component.onProgress({ loaded: 150, total: 100 });
      expect(component.percentLoaded).toBe(5);
    });

    it('should reflect percentLoaded in the progress indicator', () => {
      component.onProgress({ loaded: 42, total: 100 });
      fixture.detectChanges();

      expect(component.percentLoaded).toBe(42);
      expect(
        fixture.nativeElement.querySelector('.loading-progress-indicator'),
      ).toBeTruthy();
    });
  });
});
