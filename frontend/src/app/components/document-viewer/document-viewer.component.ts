import { PDFProgressData, PdfViewerModule } from 'ng2-pdf-viewer';

import { ChangeDetectionStrategy, Component, input, output, signal } from '@angular/core';

import { DialogOutput } from '@app/models';

@Component({
  selector: 'lcc-document-viewer',
  template: `
    <div
      class="loading-progress-indicator"
      [style.width.%]="percentLoaded()">
    </div>

    <pdf-viewer
      [src]="documentPath()"
      [original-size]="false"
      [render-text]="true"
      [render-text-mode]="0"
      (on-progress)="onProgress($event)">
    </pdf-viewer>
  `,
  styleUrl: './document-viewer.component.scss',
  imports: [PdfViewerModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DocumentViewerComponent implements DialogOutput<null> {
  public readonly documentPath = input<string>();

  public readonly percentLoaded = signal(0);

  public readonly dialogResult = output<null | 'close'>();

  public onProgress(progressData: PDFProgressData): void {
    if (progressData.total <= 0 || progressData.loaded > progressData.total) {
      console.error('[LCC] Could not parse document load progress data:', progressData);
      return;
    }

    this.percentLoaded.set(Math.floor((progressData.loaded / progressData.total) * 100));
  }
}
