import { Injectable, inject } from '@angular/core';
import { EMPTY, Observable, map, tap } from 'rxjs';
import { CloudSyncService } from '../../../../../../api/cloud';
import { TemplateRepo } from '../../../../models/data/template.repo';
import { TemplatesActions } from '../../../../models/state/templates.actions';
import {
  Category,
  CategoryId,
  Question,
  QuestionId,
  QuestionWeight,
  Template,
  TemplateAggregate,
  TemplateId,
} from '../../../../interfaces/template';
import { TemplateEditorStore } from './template-editor.store';

export interface AddCategoryInput {
  readonly label: string;
  readonly color: string;
}

export interface UpdateMetaInput {
  readonly name?: string;
  readonly description?: string;
}

export interface AddQuestionInput {
  readonly text: string;
  readonly categoryId: CategoryId | null;
  readonly weight: QuestionWeight;
}

@Injectable()
export class TemplateEditorActions {
  private readonly _store = inject(TemplateEditorStore);
  private readonly _repo = inject(TemplateRepo);
  private readonly _templatesActions = inject(TemplatesActions);
  private readonly _cloudSync = inject(CloudSyncService);

  load(id: TemplateId): Observable<TemplateAggregate | null> {
    return this._repo.get(id).pipe(tap((aggregate) => this._store.setAggregate(aggregate)));
  }

  updateMeta(input: UpdateMetaInput): Observable<void> {
    const templateId = this._currentTemplateId();
    if (templateId === null) {
      return EMPTY;
    }
    return this._repo.updateMeta({ templateId, ...input }).pipe(
      tap((template) => this._afterTemplateChange(template)),
      map(() => undefined),
    );
  }

  addCategory(input: AddCategoryInput): Observable<Category> {
    const templateId = this._currentTemplateId();
    if (templateId === null) {
      return EMPTY;
    }
    return this._repo.addCategory({ templateId, ...input }).pipe(
      tap(({ template, category }) => {
        this._store.addCategory(category);
        this._afterTemplateChange(template);
      }),
      map(({ category }) => category),
    );
  }

  updateCategory(category: Category): Observable<Category> {
    return this._repo.updateCategory(category).pipe(
      tap(({ template, category: next }) => {
        this._store.updateCategory(next);
        this._afterTemplateChange(template);
      }),
      map(({ category: next }) => next),
    );
  }

  deleteCategory(id: CategoryId): Observable<void> {
    const templateId = this._currentTemplateId();
    if (templateId === null) {
      return EMPTY;
    }
    return this._repo.deleteCategory(templateId, id).pipe(
      tap(({ template }) => {
        this._store.removeCategory(id);
        this._afterTemplateChange(template);
      }),
      map(() => undefined),
    );
  }

  addQuestion(input: AddQuestionInput): Observable<Question> {
    const templateId = this._currentTemplateId();
    if (templateId === null) {
      return EMPTY;
    }
    return this._repo.addQuestion({ templateId, ...input }).pipe(
      tap(({ template, question }) => {
        this._store.addQuestion(question);
        this._afterTemplateChange(template);
      }),
      map(({ question }) => question),
    );
  }

  updateQuestion(question: Question): Observable<Question> {
    return this._repo.updateQuestion(question).pipe(
      tap(({ template, question: next }) => {
        this._store.updateQuestion(next);
        this._afterTemplateChange(template);
      }),
      map(({ question: next }) => next),
    );
  }

  reorderQuestions(orderedIds: readonly QuestionId[]): Observable<void> {
    const templateId = this._currentTemplateId();
    if (templateId === null) {
      return EMPTY;
    }
    // Update the in-memory store first for an instant visual response; the
    // repo write below makes it durable and bumps template.rev.
    this._store.reorderQuestions(orderedIds);
    return this._repo.reorderQuestions(templateId, orderedIds).pipe(
      tap((template) => this._afterTemplateChange(template)),
      map(() => undefined),
    );
  }

  deleteQuestion(id: QuestionId): Observable<void> {
    const templateId = this._currentTemplateId();
    if (templateId === null) {
      return EMPTY;
    }
    return this._repo.deleteQuestion(templateId, id).pipe(
      tap(({ template }) => {
        this._store.removeQuestion(id);
        this._afterTemplateChange(template);
      }),
      map(() => undefined),
    );
  }

  setFilter(id: CategoryId | null): void {
    this._store.setFilter(id);
  }

  startAdding(): void {
    this._store.startEditing('new');
  }

  startEditing(id: QuestionId): void {
    this._store.startEditing(id);
  }

  cancelEditing(): void {
    this._store.cancelEditing();
  }

  private _currentTemplateId(): TemplateId | null {
    return this._store.template()?.id ?? null;
  }

  private _afterTemplateChange(template: Template): void {
    this._store.replaceTemplate(template);
    this._templatesActions.replaceTemplate(template);
    this._cloudSync.markDirty({ kind: 'template', id: template.id });
  }
}
