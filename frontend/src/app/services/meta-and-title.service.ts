import { Injectable, inject } from '@angular/core';
import { Meta, Title } from '@angular/platform-browser';

@Injectable({
  providedIn: 'root',
})
export class MetaAndTitleService {
  private readonly meta = inject(Meta);
  private readonly title = inject(Title);

  public updateTitle(title: string): void {
    if (title !== 'London Chess Club') {
      title = title.concat(' | LCC');
    }

    this.title.setTitle(title);
  }

  public updateDescription(content: string): void {
    this.meta.updateTag({ property: 'og:description', content });
    this.meta.updateTag({ name: 'description', content });
  }
}
