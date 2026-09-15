import { Component, EventEmitter, Input, NgModule, Output } from '@angular/core';

// Manual mock for ng2-pdf-viewer. The real module evaluates pdfjs config against
// a frozen namespace at import time, which throws under the Vitest ESM
// environment, so specs replace it with these lightweight stand-ins.
@Component({
  selector: 'pdf-viewer',
  template: '',
  standalone: true,
})
export class PdfViewerComponent {
  @Input() src?: string;
  @Input('original-size') originalSize = false;
  @Input('render-text') renderText = false;
  @Input('render-text-mode') renderTextMode = 0;
  @Output('on-progress') onProgress = new EventEmitter<unknown>();
}

@NgModule({
  imports: [PdfViewerComponent],
  exports: [PdfViewerComponent],
})
export class PdfViewerModule {}
