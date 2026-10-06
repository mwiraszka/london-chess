import { DialogComponent, ProgressBarComponent } from '@eagami/ui';
import { PDFProgressData, PdfViewerModule } from 'ng2-pdf-viewer';

import { ChangeDetectionStrategy, Component, input, signal } from '@angular/core';

@Component({
  selector: 'lcc-document-viewer',
  template: `
    <ea-dialog
      width="2xl"
      [aria-label]="documentTitle()">
      @if (percentLoaded() < 100) {
        <ea-progress-bar
          class="loading-progress"
          label="Loading document"
          size="sm"
          [value]="percentLoaded()" />
      }

      <pdf-viewer
        [src]="documentPath()"
        [original-size]="false"
        [render-text]="true"
        [render-text-mode]="1"
        (on-progress)="onProgress($event)">
      </pdf-viewer>
    </ea-dialog>
  `,
  styleUrl: './document-viewer.component.scss',
  imports: [DialogComponent, PdfViewerModule, ProgressBarComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DocumentViewerComponent {
  public readonly documentPath = input<string>();
  public readonly documentTitle = input('Document');

  public readonly percentLoaded = signal(0);

  public onProgress(progressData: PDFProgressData): void {
    if (progressData.total <= 0 || progressData.loaded > progressData.total) {
      console.error('[LCC] Could not parse document load progress data:', progressData);
      return;
    }

    this.percentLoaded.set(Math.floor((progressData.loaded / progressData.total) * 100));
  }
}
