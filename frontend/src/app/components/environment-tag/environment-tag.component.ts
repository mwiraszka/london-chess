import { GitBranchIconComponent, GitPullRequestIconComponent } from '@eagami/ui';

import { httpResource } from '@angular/common/http';
import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';

import {
  GITHUB_API_REPOSITORY_URL,
  GITHUB_REPOSITORY_OWNER,
  GITHUB_REPOSITORY_URL,
} from '@app/constants/github';
import { GitHubPullRequest } from '@app/models';

@Component({
  selector: 'lcc-environment-tag',
  template: `
    <span class="environment-name">
      {{ isPreview() ? 'Preview site' : 'Local development' }}
    </span>

    @if (pullRequestUrl(); as url) {
      <a
        class="branch-details pull-request-link"
        [href]="url"
        rel="noopener noreferrer"
        target="_blank">
        <span class="branch-detail">
          <ea-icon-git-pull-request></ea-icon-git-pull-request>
          #{{ pullRequestNumber() }}
        </span>
        <span class="branch-detail">
          <ea-icon-git-branch></ea-icon-git-branch>
          {{ branchName() }}
        </span>
      </a>
    } @else {
      <span class="branch-details">
        <span class="branch-detail">
          <ea-icon-git-branch></ea-icon-git-branch>
          {{ branchName() }}
        </span>
      </span>
    }
  `,
  styleUrl: './environment-tag.component.scss',
  imports: [GitBranchIconComponent, GitPullRequestIconComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    '[class.preview]': 'isPreview()',
  },
})
export class EnvironmentTagComponent {
  public readonly branchName = input.required<string>();
  public readonly isPreview = input.required<boolean>();

  private readonly openPullRequests = httpResource<GitHubPullRequest[]>(() => ({
    url: `${GITHUB_API_REPOSITORY_URL}/pulls`,
    params: { state: 'open', head: `${GITHUB_REPOSITORY_OWNER}:${this.branchName()}` },
  }));

  protected readonly pullRequestNumber = computed(() =>
    this.openPullRequests.hasValue()
      ? (this.openPullRequests.value()[0]?.number ?? null)
      : null,
  );

  protected readonly pullRequestUrl = computed(() => {
    const pullRequestNumber = this.pullRequestNumber();
    return pullRequestNumber === null
      ? null
      : `${GITHUB_REPOSITORY_URL}/pull/${pullRequestNumber}`;
  });
}
