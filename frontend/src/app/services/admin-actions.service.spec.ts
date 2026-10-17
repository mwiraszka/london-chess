import { Component, inject } from '@angular/core';
import { TestBed } from '@angular/core/testing';

import { AdminCommandAction, AdminLinkAction } from '@app/models';

import { AdminActionsService } from './admin-actions.service';

@Component({ selector: 'lcc-test-icon', template: '' })
class IconComponent {}

const addEvent: AdminLinkAction = {
  label: 'Add event',
  icon: IconComponent,
  group: 'add',
  path: ['event', 'add'],
};
const exportEvents: AdminCommandAction = {
  label: 'Export events to CSV',
  icon: IconComponent,
  group: 'data',
  run: vi.fn(),
};

@Component({ selector: 'lcc-test-events', template: '' })
class EventsViewComponent {
  constructor() {
    inject(AdminActionsService).register(() => [addEvent]);
  }
}

@Component({ selector: 'lcc-test-export', template: '' })
class ExportViewComponent {
  constructor() {
    inject(AdminActionsService).register(() => [exportEvents]);
  }
}

describe('AdminActionsService', () => {
  let service: AdminActionsService;

  beforeEach(() => {
    service = TestBed.inject(AdminActionsService);
  });

  it('should offer no actions until a view registers some', () => {
    expect(service.actions()).toEqual([]);
  });

  it('should list the actions of every registered view, in the order they registered', () => {
    TestBed.createComponent(EventsViewComponent);
    TestBed.createComponent(ExportViewComponent);

    expect(service.actions()).toEqual([addEvent, exportEvents]);
  });

  it("should drop a view's actions once the view is gone", () => {
    const events = TestBed.createComponent(EventsViewComponent);
    TestBed.createComponent(ExportViewComponent);

    events.destroy();

    expect(service.actions()).toEqual([exportEvents]);
  });
});
