import { Component, DebugElement } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';

import { query, queryAll, queryTextContent } from './debug-element-queries.util';

@Component({
  template: `
    <div class="container">
      <p class="paragraph">First paragraph</p>
      <p class="paragraph">Second paragraph</p>
      <p class="paragraph">Third paragraph</p>
      <div class="nested">
        <span class="text">Nested text</span>
      </div>
      <button class="btn">Click me</button>
    </div>
  `,
})
class TestComponent {}

describe('Debug Element Queries', () => {
  let fixture: ComponentFixture<TestComponent>;
  let debugElement: DebugElement;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [TestComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(TestComponent);
    debugElement = fixture.debugElement;
    fixture.detectChanges();
  });

  describe('queryAll', () => {
    it('should return all elements matching the selector', () => {
      const paragraphs = queryAll(debugElement, '.paragraph');

      expect(paragraphs.length).toBe(3);
      expect(paragraphs[0].nativeElement.textContent).toBe('First paragraph');
      expect(paragraphs[1].nativeElement.textContent).toBe('Second paragraph');
      expect(paragraphs[2].nativeElement.textContent).toBe('Third paragraph');
    });

    it('should return an empty array when no elements match the selector', () => {
      const nonExistentElements = queryAll(debugElement, '.non-existent');

      expect(nonExistentElements.length).toBe(0);
    });
  });

  describe('query', () => {
    it('should return the first element matching the selector', () => {
      const paragraph = query(debugElement, '.paragraph');

      expect(paragraph.nativeElement.textContent).toBe('First paragraph');
    });

    it('should return null when no elements match the selector', () => {
      const nonExistentElement = query(debugElement, '.non-existent');

      expect(nonExistentElement).toBeFalsy();
    });
  });

  describe('queryTextContent', () => {
    it('should return the trimmed text content of the first element matching the selector', () => {
      const paragraphText = queryTextContent(debugElement, '.paragraph');

      expect(paragraphText).toBe('First paragraph');
    });

    it('should work with nested elements', () => {
      const nestedText = queryTextContent(debugElement, '.text');

      expect(nestedText).toBe('Nested text');
    });

    it('should throw an error when no elements match the selector', () => {
      expect(() => {
        queryTextContent(debugElement, '.non-existent');
      }).toThrow();
    });

    it('should work with a child element as the starting point', () => {
      const nestedDiv = query(debugElement, '.nested');
      const nestedText = queryTextContent(nestedDiv, '.text');

      expect(nestedText).toBe('Nested text');
    });
  });
});
