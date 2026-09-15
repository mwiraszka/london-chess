import { PDFProgressData, PdfViewerModule } from 'ng2-pdf-viewer';

import {
  ChangeDetectionStrategy,
  Component,
  EventEmitter,
  Input,
  Output,
} from '@angular/core';

import { DialogOutput } from '@app/models';

@Component({
  selector: 'lcc-document-viewer',
  template: `
    <div
      class="loading-progress-indicator"
      [style.width.%]="percentLoaded">
    </div>

    <pdf-viewer
      [src]="documentPath"
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
  @Input() public documentPath?: string;

  public percentLoaded = 0;

  @Output() public dialogResult = new EventEmitter<null | 'close'>();

  public onProgress(progressData: PDFProgressData): void {
    if (progressData.total <= 0 || progressData.loaded > progressData.total) {
      console.error('[LCC] Could not parse document load progress data:', progressData);
      return;
    }

    this.percentLoaded = Math.floor((progressData.loaded / progressData.total) * 100);
  }
}
