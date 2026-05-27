import { Injectable, inject } from '@angular/core';
import { Observable, defer } from 'rxjs';
import { Transaction, promisifyRequest } from 'idxdb-utils';
import {
  AppDb,
  CategoryDto,
  INDEXES,
  QuestionDto,
  STORES,
  TemplateDto,
  TombstoneDto,
  tombstoneKey,
} from '../../../../api/storage';
import { newId } from '../../../../shared/utils';
import { deriveTemplateCode } from '../../constants/template-presets.const';
import {
  Category,
  CategoryId,
  Question,
  QuestionId,
  QuestionWeight,
  Template,
  TemplateAggregate,
  TemplateId,
} from '../../interfaces/template';
import {
  toCategory,
  toCategoryDto,
  toQuestion,
  toQuestionDto,
  toTemplate,
  toTemplateDto,
} from './template.mapper';

export interface CreateCategoryInput {
  readonly templateId: TemplateId;
  readonly label: string;
  readonly color: string;
}

export interface CreateQuestionInput {
  readonly templateId: TemplateId;
  readonly text: string;
  readonly categoryId: CategoryId | null;
  readonly weight: QuestionWeight;
  readonly criteria: string;
}

export interface UpdateMetaInput {
  readonly templateId: TemplateId;
  readonly name?: string;
  readonly description?: string;
}

@Injectable({ providedIn: 'root' })
export class TemplateRepo {
  private readonly _appDb = inject(AppDb);

  list(): Observable<readonly Template[]> {
    return defer(async () => {
      const tx = this._appDb.database.transaction(STORES.templates, 'readonly');
      const dtos = await tx.objectStore<TemplateDto>(STORES.templates).getAll();
      await tx.done;
      return dtos.map(toTemplate);
    });
  }

  get(id: TemplateId): Observable<TemplateAggregate | null> {
    return defer(async () => {
      const tx = this._appDb.database.transaction(
        [STORES.templates, STORES.categories, STORES.questions],
        'readonly',
      );
      const templateDto = await tx.objectStore<TemplateDto>(STORES.templates).get(id);
      if (!templateDto) {
        await tx.done;
        return null;
      }
      const categoriesDto = await promisifyRequest<CategoryDto[]>(
        tx.objectStore<CategoryDto>(STORES.categories).raw.index(INDEXES.categories.byTemplate).getAll(id),
      );
      const questionsDto = await promisifyRequest<QuestionDto[]>(
        tx.objectStore<QuestionDto>(STORES.questions).raw.index(INDEXES.questions.byTemplate).getAll(id),
      );
      await tx.done;
      return {
        template: toTemplate(templateDto),
        categories: categoriesDto.map(toCategory).sort((a, b) => a.order - b.order),
        questions: questionsDto.map(toQuestion).sort((a, b) => a.order - b.order),
      };
    });
  }

  createAggregate(aggregate: TemplateAggregate): Observable<void> {
    return defer(async () => {
      const tx = this._appDb.database.transaction(
        [STORES.templates, STORES.categories, STORES.questions],
        'readwrite',
      );
      await tx.objectStore<TemplateDto>(STORES.templates).put(toTemplateDto(aggregate.template));
      const catsStore = tx.objectStore<CategoryDto>(STORES.categories);
      for (const c of aggregate.categories) {
        await catsStore.put(toCategoryDto(c));
      }
      const qsStore = tx.objectStore<QuestionDto>(STORES.questions);
      for (const q of aggregate.questions) {
        await qsStore.put(toQuestionDto(q));
      }
      await tx.done;
    });
  }

  updateMeta(input: UpdateMetaInput): Observable<Template> {
    return defer(async () => {
      const tx = this._appDb.database.transaction(STORES.templates, 'readwrite');
      const next = await this._bumpTemplate(tx, input.templateId, (current) => {
        const name = input.name?.trim() ?? current.name;
        return {
          ...current,
          name,
          description: input.description?.trim() ?? current.description,
          code: input.name !== undefined ? deriveTemplateCode(name) : current.code,
        };
      });
      await tx.done;
      return toTemplate(next);
    });
  }

  addCategory(input: CreateCategoryInput): Observable<{ template: Template; category: Category }> {
    return defer(async () => {
      const tx = this._appDb.database.transaction(
        [STORES.templates, STORES.categories],
        'readwrite',
      );
      const templateDto = await this._requireTemplate(tx, input.templateId);
      const categoryDto: CategoryDto = {
        id: newId<'CategoryId'>(),
        templateId: input.templateId,
        label: input.label.trim(),
        color: input.color,
        order: templateDto.categoryCount,
      };
      await tx.objectStore<CategoryDto>(STORES.categories).put(categoryDto);
      const next = await this._bumpTemplate(tx, input.templateId, (current) => ({
        ...current,
        categoryCount: current.categoryCount + 1,
      }));
      await tx.done;
      return { template: toTemplate(next), category: toCategory(categoryDto) };
    });
  }

  updateCategory(category: Category): Observable<{ template: Template; category: Category }> {
    return defer(async () => {
      const tx = this._appDb.database.transaction(
        [STORES.templates, STORES.categories],
        'readwrite',
      );
      await tx.objectStore<CategoryDto>(STORES.categories).put(toCategoryDto(category));
      const next = await this._bumpTemplate(tx, category.templateId, (current) => current);
      await tx.done;
      return { template: toTemplate(next), category };
    });
  }

  deleteCategory(
    templateId: TemplateId,
    categoryId: CategoryId,
  ): Observable<{ template: Template }> {
    return defer(async () => {
      const tx = this._appDb.database.transaction(
        [STORES.templates, STORES.categories, STORES.questions],
        'readwrite',
      );
      const qStore = tx.objectStore<QuestionDto>(STORES.questions);
      const orphanQs = await promisifyRequest<QuestionDto[]>(
        qStore.raw.index(INDEXES.questions.byCategory).getAll(categoryId),
      );
      for (const q of orphanQs) {
        await qStore.put({ ...q, categoryId: null });
      }
      await tx.objectStore<CategoryDto>(STORES.categories).delete(categoryId);
      const next = await this._bumpTemplate(tx, templateId, (current) => ({
        ...current,
        categoryCount: Math.max(0, current.categoryCount - 1),
      }));
      await tx.done;
      return { template: toTemplate(next) };
    });
  }

  addQuestion(input: CreateQuestionInput): Observable<{ template: Template; question: Question }> {
    return defer(async () => {
      const tx = this._appDb.database.transaction(
        [STORES.templates, STORES.questions],
        'readwrite',
      );
      const templateDto = await this._requireTemplate(tx, input.templateId);
      const questionDto: QuestionDto = {
        id: newId<'QuestionId'>(),
        templateId: input.templateId,
        categoryId: input.categoryId,
        text: input.text.trim(),
        weight: input.weight,
        order: templateDto.questionCount,
        criteria: input.criteria.trim(),
      };
      await tx.objectStore<QuestionDto>(STORES.questions).put(questionDto);
      const next = await this._bumpTemplate(tx, input.templateId, (current) => ({
        ...current,
        questionCount: current.questionCount + 1,
      }));
      await tx.done;
      return { template: toTemplate(next), question: toQuestion(questionDto) };
    });
  }

  updateQuestion(question: Question): Observable<{ template: Template; question: Question }> {
    return defer(async () => {
      const tx = this._appDb.database.transaction(
        [STORES.templates, STORES.questions],
        'readwrite',
      );
      await tx.objectStore<QuestionDto>(STORES.questions).put(toQuestionDto(question));
      const next = await this._bumpTemplate(tx, question.templateId, (current) => current);
      await tx.done;
      return { template: toTemplate(next), question };
    });
  }

  /**
   * Rewrite the `order` field on every template question to match the provided
   * sequence. Questions absent from `orderedIds` keep their existing rows but
   * are placed at the tail in their previous order. Bumps template.rev once.
   */
  reorderQuestions(
    templateId: TemplateId,
    orderedIds: readonly QuestionId[],
  ): Observable<Template> {
    return defer(async () => {
      const tx = this._appDb.database.transaction(
        [STORES.templates, STORES.questions],
        'readwrite',
      );
      const qStore = tx.objectStore<QuestionDto>(STORES.questions);
      const allKeys = await promisifyRequest<IDBValidKey[]>(
        qStore.raw.index(INDEXES.questions.byTemplate).getAllKeys(templateId),
      );
      const idSet = new Set(orderedIds);
      const tailKeys = allKeys.filter((k) => !idSet.has(k as QuestionId));

      const finalSequence = [...orderedIds, ...(tailKeys as QuestionId[])];
      for (let i = 0; i < finalSequence.length; i++) {
        const id = finalSequence[i];
        const current = await qStore.get(id);
        if (!current) continue;
        if (current.order !== i) {
          await qStore.put({ ...current, order: i });
        }
      }
      const next = await this._bumpTemplate(tx, templateId, (current) => current);
      await tx.done;
      return toTemplate(next);
    });
  }

  deleteQuestion(
    templateId: TemplateId,
    questionId: QuestionId,
  ): Observable<{ template: Template }> {
    return defer(async () => {
      const tx = this._appDb.database.transaction(
        [STORES.templates, STORES.questions],
        'readwrite',
      );
      await tx.objectStore<QuestionDto>(STORES.questions).delete(questionId);
      const next = await this._bumpTemplate(tx, templateId, (current) => ({
        ...current,
        questionCount: Math.max(0, current.questionCount - 1),
      }));
      await tx.done;
      return { template: toTemplate(next) };
    });
  }

  delete(id: TemplateId): Observable<void> {
    return defer(async () => {
      const tx = this._appDb.database.transaction(
        [STORES.templates, STORES.categories, STORES.questions, STORES.tombstones],
        'readwrite',
      );
      // Read the template's rev BEFORE deleting so the tombstone carries
      // a strictly-greater rev for cross-device conflict resolution.
      const current = await tx.objectStore<TemplateDto>(STORES.templates).get(id);

      const catsStore = tx.objectStore<CategoryDto>(STORES.categories);
      const catKeys = await promisifyRequest<IDBValidKey[]>(
        catsStore.raw.index(INDEXES.categories.byTemplate).getAllKeys(id),
      );
      for (const k of catKeys) await catsStore.delete(k);

      const qsStore = tx.objectStore<QuestionDto>(STORES.questions);
      const qKeys = await promisifyRequest<IDBValidKey[]>(
        qsStore.raw.index(INDEXES.questions.byTemplate).getAllKeys(id),
      );
      for (const k of qKeys) await qsStore.delete(k);

      await tx.objectStore<TemplateDto>(STORES.templates).delete(id);

      if (current) {
        const tombstone: TombstoneDto = {
          key: tombstoneKey('template', id),
          kind: 'template',
          id,
          rev: current.rev + 1,
          deletedAt: new Date().toISOString(),
        };
        await tx.objectStore<TombstoneDto>(STORES.tombstones).put(tombstone);
      }

      await tx.done;
    });
  }

  private async _requireTemplate(tx: Transaction, id: TemplateId): Promise<TemplateDto> {
    const dto = await tx.objectStore<TemplateDto>(STORES.templates).get(id);
    if (!dto) {
      throw new Error(`Template ${id} not found`);
    }
    return dto;
  }

  private async _bumpTemplate(
    tx: Transaction,
    id: TemplateId,
    mutate: (current: TemplateDto) => TemplateDto,
  ): Promise<TemplateDto> {
    const current = await this._requireTemplate(tx, id);
    const next: TemplateDto = {
      ...mutate(current),
      rev: current.rev + 1,
      updatedAt: new Date().toISOString(),
    };
    await tx.objectStore<TemplateDto>(STORES.templates).put(next);
    return next;
  }
}
