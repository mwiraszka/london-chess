import { Component } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';

import { MemberProfile } from '@app/models';
import { ApiService } from '@app/services/api.service';
import { MemberProfilesService } from '@app/services/member-profiles.service';
import { query, queryTextContent } from '@app/utils';

import { MemberLinkComponent } from './member-link.component';

@Component({
  template: `
    <lcc-member-link
      [memberNumber]="memberNumber"
      [name]="name"
      [showAvatar]="showAvatar"
      [appearance]="appearance" />
  `,
  imports: [MemberLinkComponent],
})
class HostComponent {
  public memberNumber: number | null = null;
  public name = 'Stored Name';
  public showAvatar = false;
  public appearance: 'plain' | 'link' = 'plain';
}

describe('MemberLinkComponent', () => {
  let fixture: ComponentFixture<HostComponent>;
  let host: HostComponent;

  const profiles: MemberProfile[] = [
    { number: 0, firstName: 'Magnus', lastName: 'Carlsen', avatarUrl: null },
  ];
  const api = { get: vi.fn(() => Promise.resolve(profiles)) };

  beforeEach(async () => {
    api.get.mockClear();

    await TestBed.configureTestingModule({
      imports: [HostComponent],
      providers: [provideRouter([]), { provide: ApiService, useValue: api }],
    }).compileComponents();

    fixture = TestBed.createComponent(HostComponent);
    host = fixture.componentInstance;
  });

  it("should show a member's current name, linked to their profile, including member 0", async () => {
    host.memberNumber = 0;

    fixture.detectChanges();
    await TestBed.inject(MemberProfilesService).load();
    fixture.detectChanges();

    const link = query(fixture.debugElement, 'a.member-link');
    expect(link.attributes['href']).toBe('/members/0');
    expect(queryTextContent(fixture.debugElement, 'a.member-link')).toBe(
      'Magnus Carlsen',
    );
    expect(api.get).toHaveBeenCalledWith('/public/members/profiles');
  });

  it('should leave the name unstyled by default', async () => {
    host.memberNumber = 0;

    fixture.detectChanges();
    await TestBed.inject(MemberProfilesService).load();
    fixture.detectChanges();

    expect(query(fixture.debugElement, 'a.member-link.lcc-link')).toBeFalsy();
  });

  it('should style the name as a link when asked to', async () => {
    host.memberNumber = 0;
    host.appearance = 'link';

    fixture.detectChanges();
    await TestBed.inject(MemberProfilesService).load();
    fixture.detectChanges();

    expect(query(fixture.debugElement, 'a.member-link.lcc-link')).toBeTruthy();
  });

  it('should include the avatar inside the link when asked to', async () => {
    host.memberNumber = 0;
    host.showAvatar = true;

    fixture.detectChanges();
    await TestBed.inject(MemberProfilesService).load();
    fixture.detectChanges();

    expect(query(fixture.debugElement, 'a.member-link ea-avatar')).toBeTruthy();
  });

  it('should show the avatar beside an unlinked name for a member without a profile', () => {
    host.showAvatar = true;

    fixture.detectChanges();

    expect(query(fixture.debugElement, 'a.member-link')).toBeFalsy();
    expect(query(fixture.debugElement, 'span.member-link ea-avatar')).toBeTruthy();
  });

  it('should show the stored name unlinked when the member has no profile', async () => {
    host.memberNumber = 5;

    fixture.detectChanges();
    await TestBed.inject(MemberProfilesService).load();
    fixture.detectChanges();

    expect(query(fixture.debugElement, 'a.member-link')).toBeFalsy();
    expect(fixture.nativeElement.textContent.trim()).toBe('Stored Name');
  });

  it('should show the stored name unlinked, without loading profiles, when there is no number', () => {
    fixture.detectChanges();

    expect(query(fixture.debugElement, 'a.member-link')).toBeFalsy();
    expect(fixture.nativeElement.textContent.trim()).toBe('Stored Name');
    expect(api.get).not.toHaveBeenCalled();
  });
});
