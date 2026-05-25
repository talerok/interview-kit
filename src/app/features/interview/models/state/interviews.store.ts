import { Injectable, Signal, computed, inject } from '@angular/core';
import { rxResource } from '@angular/core/rxjs-interop';
import { WorkspaceService } from '../../../../core/workspace';
import { InterviewRepo } from '../data/interview.repo';
import { Interview, InterviewId } from '../../interfaces/interview';

/**
 * Reactive cache over `InterviewRepo.list()`. Re-runs on every
 * `WorkspaceService.dataToken` bump (account switch or external cloud
 * write) so the sidebar count and history list auto-refresh.
 */
@Injectable({ providedIn: 'root' })
export class InterviewsStore {
  private readonly _repo = inject(InterviewRepo);
  private readonly _workspace = inject(WorkspaceService);

  private readonly _resource = rxResource<readonly Interview[], number>({
    params: () => this._workspace.dataToken(),
    stream: () => this._repo.list(),
    defaultValue: [],
  });

  readonly value: Signal<readonly Interview[]> = this._resource.value;
  readonly isLoading: Signal<boolean> = this._resource.isLoading;
  readonly count: Signal<number> = computed(() => this.value().length);
  readonly isEmpty: Signal<boolean> = computed(() => this.count() === 0);

  readonly completed: Signal<readonly Interview[]> = computed(() =>
    this.value().filter((i) => i.status === 'completed'),
  );
  readonly completedCount: Signal<number> = computed(() => this.completed().length);

  add(interview: Interview): void {
    this._resource.update((list) => [...(list ?? []), interview]);
  }

  removeBy(predicate: (item: Interview) => boolean): void {
    this._resource.update((list) => (list ?? []).filter((item) => !predicate(item)));
  }

  upsert(interview: Interview, key: (item: Interview) => InterviewId): void {
    const k = key(interview);
    this._resource.update((list) => {
      const arr = list ?? [];
      const exists = arr.some((x) => key(x) === k);
      return exists
        ? arr.map((x) => (key(x) === k ? interview : x))
        : [...arr, interview];
    });
  }

  reload(): void {
    this._resource.reload();
  }
}
