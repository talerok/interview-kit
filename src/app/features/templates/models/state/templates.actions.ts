import { Injectable, inject } from '@angular/core';
import { Observable, map, tap } from 'rxjs';
import { CloudSyncService } from '../../../../api/cloud';
import { buildNewTemplateAggregate } from '../data/template.factory';
import { TemplateRepo } from '../data/template.repo';
import {
  CreateTemplateInput,
  Template,
  TemplateId,
} from '../../interfaces/template';
import { TemplatesStore } from './templates.store';

@Injectable({ providedIn: 'root' })
export class TemplatesActions {
  private readonly _store = inject(TemplatesStore);
  private readonly _repo = inject(TemplateRepo);
  private readonly _cloudSync = inject(CloudSyncService);

  create(input: CreateTemplateInput): Observable<Template> {
    const aggregate = buildNewTemplateAggregate(input);
    return this._repo.createAggregate(aggregate).pipe(
      map(() => aggregate.template),
      tap((template) => {
        this._store.add(template);
        this._cloudSync.markDirty({ kind: 'template', id: template.id });
      }),
    );
  }

  delete(id: TemplateId): Observable<void> {
    return this._repo.delete(id).pipe(
      tap(() => {
        this._store.removeBy((t) => t.id === id);
        this._cloudSync.markDeleted({ kind: 'template', id });
      }),
    );
  }

  /** Replace a single template in the list store after an editor-side mutation. */
  replaceTemplate(template: Template): void {
    this._store.upsert(template, (t) => t.id);
    this._cloudSync.markDirty({ kind: 'template', id: template.id });
  }
}
