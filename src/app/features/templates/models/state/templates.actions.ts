import { Injectable, inject } from '@angular/core';
import { Observable, map, tap } from 'rxjs';
import { CloudSyncService } from '../../../../api/cloud';
import { asId, colorFromName, newId } from '../../../../shared/utils';
import { TemplateRepo } from '../data/template.repo';
import {
  CATEGORY_PRESETS,
  deriveTemplateCode,
} from '../../constants/template-presets.const';
import {
  Category,
  CategoryId,
  CreateTemplateInput,
  Question,
  Template,
  TemplateAggregate,
  TemplateId,
} from '../../interfaces/template';
import { TemplatesStore } from './templates.store';

@Injectable({ providedIn: 'root' })
export class TemplatesActions {
  private readonly _store = inject(TemplatesStore);
  private readonly _repo = inject(TemplateRepo);
  private readonly _cloudSync = inject(CloudSyncService);

  load(): Observable<readonly Template[]> {
    return this._repo.list().pipe(tap((items) => this._store.set(items)));
  }

  create(input: CreateTemplateInput): Observable<Template> {
    const aggregate = this._buildNewAggregate(input);
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

  private _buildNewAggregate(input: CreateTemplateInput): TemplateAggregate {
    const now = new Date().toISOString();
    const templateId = newId<'TemplateId'>();
    const preset = CATEGORY_PRESETS.find((p) => p.key === input.categoryPreset);
    const categories: readonly Category[] = (preset?.categories ?? []).map((seed, i) => ({
      id: newId<'CategoryId'>(),
      templateId,
      label: seed.label,
      color: colorFromName(seed.label),
      order: i,
    }));
    const questions: readonly Question[] = [];
    const name = input.name.trim();
    const template: Template = {
      id: templateId,
      code: deriveTemplateCode(name),
      name,
      description: input.description.trim(),
      color: colorFromName(name),
      rev: 1,
      categoryCount: categories.length,
      questionCount: questions.length,
      createdAt: now,
      updatedAt: now,
    };
    return { template, categories, questions };
  }

  // Helper for routing/components when wiring template-id from URL params.
  toTemplateId(value: string): TemplateId {
    return asId<'TemplateId'>(value);
  }

  toCategoryId(value: string): CategoryId {
    return asId<'CategoryId'>(value);
  }
}
