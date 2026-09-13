import { MockStore, provideMockStore } from '@ngrx/store/testing';

import { Component } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';

import { MOCK_MEMBERS } from '@app/mocks/members.mock';
import { MembersSelectors } from '@app/store/members';
import { query, queryTextContent } from '@app/utils';

import { MemberLinkComponent } from './member-link.component';

@Component({
  template: `
    <lcc-member-link
      [memberId]="memberId"
      [name]="name">
      {{ label }}
    </lcc-member-link>
  `,
  imports: [MemberLinkComponent],
})
class HostComponent {
  public memberId: string | null = null;
  public name: string | null = null;
  public label = 'Some Name';
}

describe('MemberLinkComponent', () => {
  let fixture: ComponentFixture<HostComponent>;
  let host: HostComponent;
  let store: MockStore;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [HostComponent],
      providers: [provideMockStore(), provideRouter([])],
    }).compileComponents();

    store = TestBed.inject(MockStore);
    store.overrideSelector(MembersSelectors.selectAllMembers, MOCK_MEMBERS);

    fixture = TestBed.createComponent(HostComponent);
    host = fixture.componentInstance;
  });

  it('should link directly when a member id is provided', () => {
    host.memberId = MOCK_MEMBERS[0].id;

    fixture.detectChanges();

    const link = query(fixture.debugElement, 'a.lcc-link');
    expect(link.attributes['href']).toBe(`/members/${MOCK_MEMBERS[0].id}`);
    expect(queryTextContent(fixture.debugElement, 'a.lcc-link')).toBe('Some Name');
  });

  it('should resolve a member by full name', () => {
    host.name = `${MOCK_MEMBERS[0].firstName} ${MOCK_MEMBERS[0].lastName}`;

    fixture.detectChanges();

    const link = query(fixture.debugElement, 'a.lcc-link');
    expect(link.attributes['href']).toBe(`/members/${MOCK_MEMBERS[0].id}`);
  });

  it('should resolve names case-insensitively', () => {
    host.name = `${MOCK_MEMBERS[0].firstName} ${MOCK_MEMBERS[0].lastName}`.toUpperCase();

    fixture.detectChanges();

    expect(query(fixture.debugElement, 'a.lcc-link')).toBeTruthy();
  });

  it('should render plain content when no member matches', () => {
    host.name = 'Nobody Whatsoever';

    fixture.detectChanges();

    expect(query(fixture.debugElement, 'a.lcc-link')).toBeFalsy();
    expect(fixture.nativeElement.textContent.trim()).toBe('Some Name');
  });

  it('should render plain content when neither id nor name is provided', () => {
    fixture.detectChanges();

    expect(query(fixture.debugElement, 'a.lcc-link')).toBeFalsy();
    expect(fixture.nativeElement.textContent.trim()).toBe('Some Name');
  });
});
