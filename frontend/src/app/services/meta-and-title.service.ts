import { Injectable } from '@angular/core';
import { Meta, Title } from '@angular/platform-browser';

@Injectable({
  providedIn: 'root',
})
export class MetaAndTitleService {
  constructor(
    private readonly meta: Meta,
    private readonly title: Title,
  ) {}

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
