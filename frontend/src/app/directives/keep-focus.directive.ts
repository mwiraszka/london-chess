import { Directive } from '@angular/core';

// Pressing the host leaves focus on the active field, so switching away from a
// form never marks its fields touched and flags them invalid
@Directive({
  selector: '[keepFocus]',
  host: { '(mousedown)': '$event.preventDefault()' },
})
export class KeepFocusDirective {}
