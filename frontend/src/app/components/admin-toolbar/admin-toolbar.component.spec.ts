import {
  DownloadIconComponent,
  RefreshCwIconComponent,
  SettingsIconComponent,
} from '@eagami/ui';

import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';

import { LinkListComponent } from '@app/components/link-list/link-list.component';
import { TooltipDirective } from '@app/directives/tooltip.directive';
import { AdminButton, ExternalLink, InternalLink } from '@app/models';
import { query, queryAll } from '@app/utils';

import { AdminToolbarComponent } from './admin-toolbar.component';

describe('AdminToolbarComponent', () => {
  let fixture: ComponentFixture<AdminToolbarComponent>;

  const mockAdminButtons: AdminButton[] = [
    {
      id: 'refresh-button',
      tooltip: 'Refresh data',
      icon: RefreshCwIconComponent,
      action: vi.fn(),
    },
    {
      id: 'settings-button',
      tooltip: 'Open settings',
      icon: SettingsIconComponent,
      action: vi.fn(),
    },
    {
      id: 'export-button',
      tooltip: 'Export data',
      icon: DownloadIconComponent,
      action: vi.fn(),
    },
  ];

  const mockAdminLinks: Array<InternalLink | ExternalLink> = [
    {
      text: 'Articles',
      internalPath: 'article',
    },
    {
      text: 'Members',
      internalPath: 'members',
    },
    {
      text: 'Documentation',
      externalPath: 'https://docs.example.com',
    },
  ];

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AdminToolbarComponent, LinkListComponent, TooltipDirective],
      providers: [provideRouter([])],
    }).compileComponents();

    fixture = TestBed.createComponent(AdminToolbarComponent);
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(fixture.componentInstance).toBeTruthy();
  });

  describe('template rendering', () => {
    it('should display the admin icon', () => {
      expect(query(fixture.debugElement, 'ea-icon-shield-check.admin-icon')).toBeTruthy();
    });

    describe('with no inputs', () => {
      it('should not render link list when adminLinks is undefined', () => {
        fixture.componentRef.setInput('adminLinks', undefined);
        fixture.detectChanges();

        expect(query(fixture.debugElement, 'lcc-link-list')).toBeFalsy();
      });

      it('should not render admin buttons section when adminButtons is undefined', () => {
        fixture.componentRef.setInput('adminButtons', undefined);
        fixture.detectChanges();

        expect(query(fixture.debugElement, '.admin-buttons')).toBeFalsy();
      });
    });

    describe('with adminLinks', () => {
      beforeEach(() => {
        fixture.componentRef.setInput('adminLinks', mockAdminLinks);
        fixture.detectChanges();
      });

      it('should render the link list component', () => {
        expect(query(fixture.debugElement, 'lcc-link-list')).toBeTruthy();
      });

      it('should pass links to the link list component', () => {
        expect(
          query(fixture.debugElement, 'lcc-link-list').componentInstance.links,
        ).toEqual(mockAdminLinks);
      });
    });

    describe('with adminButtons', () => {
      beforeEach(() => {
        fixture.componentRef.setInput('adminButtons', mockAdminButtons);
        fixture.detectChanges();
      });

      it('should render the admin buttons container', () => {
        expect(query(fixture.debugElement, '.admin-buttons')).toBeTruthy();
      });

      it('should render all admin buttons', () => {
        expect(queryAll(fixture.debugElement, '.admin-button').length).toBe(
          mockAdminButtons.length,
        );
      });

      it('should set correct button properties', () => {
        const firstButton = query(fixture.debugElement, '#refresh-button');

        expect(firstButton).toBeTruthy();
        expect(firstButton.attributes['type']).toBe('button');
        expect(firstButton.classes['admin-button']).toBe(true);
        expect(firstButton.classes['lcc-secondary-button']).toBe(true);
      });

      it('should display correct icon for each button', () => {
        const buttonIcons = queryAll(fixture.debugElement, '.button-icon');
        expect(buttonIcons.length).toBe(mockAdminButtons.length);

        expect(query(buttonIcons[0], 'ea-icon-refresh-cw')).toBeTruthy();
        expect(query(buttonIcons[1], 'ea-icon-settings')).toBeTruthy();
        expect(query(buttonIcons[2], 'ea-icon-download')).toBeTruthy();
      });

      it('should apply tooltip directive with correct tooltip text', () => {
        const firstButton = query(fixture.debugElement, '#refresh-button');
        const tooltipDirective = firstButton.injector.get(TooltipDirective);

        expect(tooltipDirective.tooltip).toBe('Refresh data');
      });

      it('should call action function when button is clicked', () => {
        mockAdminButtons.forEach((mockButton, index) => {
          const button = queryAll(fixture.debugElement, '.admin-button')[index];
          button.triggerEventHandler('click');

          expect(mockButton.action).toHaveBeenCalled();
        });
      });
    });

    describe('with both adminLinks and adminButtons', () => {
      beforeEach(() => {
        fixture.componentRef.setInput('adminLinks', mockAdminLinks);
        fixture.componentRef.setInput('adminButtons', mockAdminButtons);
        fixture.detectChanges();
      });

      it('should render both link list and buttons', () => {
        expect(query(fixture.debugElement, 'lcc-link-list')).toBeTruthy();
        expect(query(fixture.debugElement, '.admin-buttons')).toBeTruthy();
      });

      it('should render controls in correct order within controls container', () => {
        const children = query(fixture.debugElement, '.controls-container').children;

        expect(children.length).toBe(2);
        expect(children[0].name).toBe('lcc-link-list');
        expect(children[1].classes['admin-buttons']).toBe(true);
      });
    });

    describe('button click handling', () => {
      beforeEach(() => {
        fixture.componentRef.setInput('adminButtons', mockAdminButtons);
        fixture.detectChanges();
      });

      it('should execute the correct action for each button', () => {
        query(fixture.debugElement, '#refresh-button').triggerEventHandler('click');
        expect(mockAdminButtons[0].action).toHaveBeenCalledTimes(1);

        query(fixture.debugElement, '#settings-button').triggerEventHandler('click');
        expect(mockAdminButtons[1].action).toHaveBeenCalledTimes(1);

        query(fixture.debugElement, '#export-button').triggerEventHandler('click');
        expect(mockAdminButtons[2].action).toHaveBeenCalledTimes(1);
      });

      it('should not interfere with other button actions when one is clicked', () => {
        query(fixture.debugElement, '#refresh-button').triggerEventHandler('click');

        expect(mockAdminButtons[0].action).toHaveBeenCalled();
        expect(mockAdminButtons[1].action).not.toHaveBeenCalled();
        expect(mockAdminButtons[2].action).not.toHaveBeenCalled();
      });
    });

    describe('dynamic updates', () => {
      it('should update buttons when adminButtons input changes', () => {
        fixture.componentRef.setInput('adminButtons', mockAdminButtons.slice(0, 2));
        fixture.detectChanges();

        let buttons = queryAll(fixture.debugElement, '.admin-button');
        expect(buttons.length).toBe(2);

        fixture.componentRef.setInput('adminButtons', mockAdminButtons);
        fixture.detectChanges();

        buttons = queryAll(fixture.debugElement, '.admin-button');
        expect(buttons.length).toBe(3);
      });

      it('should update links when adminLinks input changes', () => {
        fixture.componentRef.setInput('adminLinks', mockAdminLinks.slice(0, 1));
        fixture.detectChanges();

        let linkList = query(fixture.debugElement, 'lcc-link-list');
        expect(linkList.componentInstance.links.length).toBe(1);

        fixture.componentRef.setInput('adminLinks', mockAdminLinks);
        fixture.detectChanges();

        linkList = query(fixture.debugElement, 'lcc-link-list');
        expect(linkList.componentInstance.links.length).toBe(3);
      });

      it('should handle removal of all buttons', () => {
        fixture.componentRef.setInput('adminButtons', mockAdminButtons);
        fixture.detectChanges();

        expect(query(fixture.debugElement, '.admin-buttons')).toBeTruthy();

        fixture.componentRef.setInput('adminButtons', undefined);
        fixture.detectChanges();

        expect(query(fixture.debugElement, '.admin-buttons')).toBeFalsy();
      });

      it('should handle removal of all links', () => {
        fixture.componentRef.setInput('adminLinks', mockAdminLinks);
        fixture.detectChanges();

        expect(query(fixture.debugElement, 'lcc-link-list')).toBeTruthy();

        fixture.componentRef.setInput('adminLinks', undefined);
        fixture.detectChanges();

        expect(query(fixture.debugElement, 'lcc-link-list')).toBeFalsy();
      });
    });
  });
});
