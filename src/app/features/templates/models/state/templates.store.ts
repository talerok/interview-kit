import { Injectable, Signal, computed, inject } from '@angular/core';
import { rxResource } from '@angular/core/rxjs-interop';
import { WorkspaceService } from '../../../../core/workspace';
import { TemplateRepo } from '../data/template.repo';
import { Template, TemplateId } from '../../interfaces/template';

/**
 * Reactive cache over `TemplateRepo.list()`. The resource re-runs the
 * loader whenever `WorkspaceService.dataToken` changes (account switch
 * or external cloud-pull write), so cross-cutting refreshes are handled
 * without any manual coordination.
 *
 * Local mutations (add/update/remove) patch the resource value in-place
 * for optimistic UX; the next external bump will reconcile from IDB.
 */
@Injectable({ providedIn: 'root' })
export class TemplatesStore {
  private readonly _repo = inject(TemplateRepo);
  private readonly _workspace = inject(WorkspaceService);

  private readonly _resource = rxResource<readonly Template[], number>({
    params: () => this._workspace.dataToken(),
    stream: () => this._repo.list(),
    defaultValue: [],
  });

  readonly value: Signal<readonly Template[]> = this._resource.value;
  readonly isLoading: Signal<boolean> = this._resource.isLoading;
  readonly count: Signal<number> = computed(() => this.value().length);
  readonly isEmpty: Signal<boolean> = computed(() => this.count() === 0);

  add(template: Template): void {
    this._resource.update((list) => [...(list ?? []), template]);
  }

  removeBy(predicate: (item: Template) => boolean): void {
    this._resource.update((list) => (list ?? []).filter((item) => !predicate(item)));
  }

  upsert(template: Template, key: (item: Template) => TemplateId): void {
    const k = key(template);
    this._resource.update((list) => {
      const arr = list ?? [];
      const exists = arr.some((x) => key(x) === k);
      return exists
        ? arr.map((x) => (key(x) === k ? template : x))
        : [...arr, template];
    });
  }

  /** Force a fresh read from IDB. Same effect as a workspace.dataToken bump. */
  reload(): void {
    this._resource.reload();
  }
}
