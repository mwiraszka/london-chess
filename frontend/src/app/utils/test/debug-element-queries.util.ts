import { DebugElement } from '@angular/core';
import { By } from '@angular/platform-browser';

export function queryAll(debugElement: DebugElement, selector: string): DebugElement[] {
  return debugElement.queryAll(By.css(selector));
}

export function query(debugElement: DebugElement, selector: string): DebugElement {
  return debugElement.query(By.css(selector));
}

export function queryTextContent(debugElement: DebugElement, selector: string): string {
  return query(debugElement, selector).nativeElement.textContent.trim();
}
