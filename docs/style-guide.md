# Architecture Style Guide

Version: 1 | Last updated: 2026-05-25
Status: дополняет [code-req.md](code-req.md). При конфликте — code-req.md.

Документ описывает **архитектурные слои проекта** и **разделение модели на Store + Actions**. Правила к коду (signals, control flow, formы, TS, RxJS) — в `code-req.md`.

---

## 1. Слои приложения

```
src/app/
  api/        — общие абстракции для IO (storage, cloud)
  core/       — bootstrap, конфигурация, app-wide cross-cutting (interceptors, error handling, init)
  shared/     — переиспользуемые UI/utils/state primitives, не знают про конкретные фичи
  features/   — конечные фичи. Могут содержать вложенные суб-фичи.
```

**Жёсткое правило направления зависимостей:**

```
features → shared, core, api
shared   → (никуда — самодостаточен)
core     → api, shared
api      → shared
```

`shared` НЕ импортирует ничего из `features`/`core`. `api` не знает про UI.

---

## 2. Структура фичи

Базовая структура папки фичи:

```
features/<feature>/
  components/             — компоненты фичи (3 файла: .ts/.html/.scss)
  models/                 — все @Injectable модели фичи
    state/                — *.store.ts + *.actions.ts (бизнес-состояние)
    data/                 — *.repo.ts + *.mapper.ts (доступ к persistence)
  interfaces/             — domain-типы (Template, Question, ...)
  constants/              — const / enums (presets, labels)
  <feature>.routes.ts     — экспорт FEATURE_ROUTES
```

**Почему `models/` зонтиком:**

- В `models/` лежит вся бизнес-логика фичи: и стейт (`state/`), и работа с данными (`data/`).
- Внутри `models/`:
  - `state/` — то, что отвечает за **поведение и состояние** (Store держит state, Actions оркестрирует use-cases).
  - `data/` — то, что отвечает за **доступ к данным** (Repo обёртывает IDB/cloud, Mapper переводит DTO ↔ domain).
- Слово `api/` зарезервировано за `src/app/api/` — общие платформенные адаптеры (storage, cloud), не модели фичи.

Компонент может содержать **вложенные суб-фичи** в `components/<sub>/`. Структура суб-фичи повторяет фичу:

```
templates/
  components/
    template-editor/
      template-editor.component.ts/html/scss
      models/
        state/
          template-editor.store.ts
          template-editor.actions.ts
        data/                            # только если суб-фича владеет своими данными
      interfaces/
      constants/
      components/                        ← следующий уровень суб-фич
        question-editor/
          question-editor.component.ts/html/scss
          models/...
          components/...                 ← вложенность не ограничена
```

**Принципы:**

- Суб-фича создаётся когда у вложенного компонента есть **свои models** (state и/или data). Без них — компонент остаётся плоским внутри `components/<name>/` без папок `models/`.
- `interfaces/` и `constants/` живут на уровне той фичи, которая их **владеет**. Если используется в нескольких фичах — поднимается в `shared/`.
- `models/data/` появляется только тогда, когда суб-фича имеет свой Repo. В типичном случае data-доступ владеет корневая фича, суб-фичи только мутируют состояние через actions.

---

## 3. Model = Store + Actions

В `code-req.md` Model описана как один `@Injectable` со состоянием и логикой. На практике для нетривиальных фич это разрастается и нарушает SRP. Поэтому **Model разделяется на два артефакта**:

| Артефакт      | Ответственность                                                          | Файл                |
| ------------- | ------------------------------------------------------------------------ | ------------------- |
| **Store**     | Состояние. Сигнал + операции `set/patch`. Без бизнес-логики.             | `*.store.ts`        |
| **Actions**   | Use-cases. Координирует store(ы), repo, формы, UX (диалоги, прелоадеры). | `*.actions.ts`      |

Компонент инжектит **оба**: Store для чтения, Actions для команд.

### 3.1. EntityStore<T> — базовый класс

В `shared/state/entity-store.ts`:

```ts
import { signal, WritableSignal, Signal } from '@angular/core';
import { toObservable } from '@angular/core/rxjs-interop';
import { Observable } from 'rxjs';

export abstract class EntityStore<T extends object> {
  protected readonly _value: WritableSignal<T | null> = signal<T | null>(null);

  readonly value: Signal<T | null> = this._value.asReadonly();
  readonly value$: Observable<T | null> = toObservable(this._value);

  set(value: T | null): void {
    this._value.set(value);
  }

  patch(patch: Partial<T>): void {
    const current = this._value();
    this._value.set(current ? { ...current, ...patch } : (patch as T));
  }
}
```

Для коллекций — `shared/state/list-entity.store.ts`:

```ts
export abstract class ListEntityStore<T> {
  protected readonly _value = signal<readonly T[]>([]);

  readonly value = this._value.asReadonly();
  readonly value$ = toObservable(this._value);
  readonly count = computed(() => this._value().length);
  readonly isEmpty = computed(() => this.count() === 0);

  set(items: readonly T[]): void { this._value.set(items); }
  add(item: T): void { this._value.update(xs => [...xs, item]); }
  removeBy(pred: (x: T) => boolean): void {
    this._value.update(xs => xs.filter(x => !pred(x)));
  }
  updateBy(pred: (x: T) => boolean, patch: (x: T) => T): void {
    this._value.update(xs => xs.map(x => pred(x) ? patch(x) : x));
  }
}
```

**Правила Store:**

- Store не инжектит ничего, кроме других сторов (для агрегатов).
- Store НЕ вызывает repo / HTTP / IDB.
- `value` — `Signal<T | null>` (nullable by default). `value$` — Observable для RxJS-цепочек.
- `set/patch` — public. По соглашению вызывает только Actions; компонент мутирует Store напрямую только для UI-флагов (например, panelOpen).
- Один Store — одна сущность/одна логическая область. Не складывать в один Store несвязанные данные.

### 3.2. Actions — use-cases

```ts
@Injectable()
export class TemplatesActions {
  private readonly _store = inject(TemplatesStore);
  private readonly _repo = inject(TemplateRepo);

  load(): Observable<readonly Template[]> {
    return this._repo.list().pipe(tap(items => this._store.set(items)));
  }

  create(input: CreateTemplateInput): Observable<Template> {
    return this._repo.create(input).pipe(tap(t => this._store.add(t)));
  }

  delete(id: TemplateId): Observable<void> {
    return this._repo.delete(id).pipe(tap(() => this._store.removeBy(t => t.id === id)));
  }
}
```

**Правила Actions:**

- Без состояния. Все поля — `inject()`.
- Возвращают `Observable<T>` для async-операций. Компонент подписывается с `takeUntilDestroyed()`.
- Внутри Actions запрещён `subscribe()` — только `pipe(...tap, finalize)`.
- Actions может вызывать другие Actions, но без циклов.
- При оркестровке UX (диалоги, прелоадеры) — Actions делает это сам, не компонент. Цель: компонент остаётся тонким.

### 3.3. Когда разделяем Store + Actions, а когда нет

| Случай                                                       | Решение                          |
| ------------------------------------------------------------ | -------------------------------- |
| Состояние шарится между несколькими компонентами/роутами     | **Store + Actions**              |
| Сложные операции (валидация, диалоги, координация сторов)    | **Store + Actions**              |
| Тонкий компонент с локальным UI-state (открыт/закрыт)        | `signal()` прямо в компоненте    |
| Stateless логика (форматтер, селектор без состояния)         | Один `*.model.ts` (если нужен)   |
| Одна сущность, одна модель, тривиальный CRUD                 | `*.model.ts` ок, но рекомендация — Store + Actions для единообразия |

**Дефолт:** для любой фичи с операциями над данными — Store + Actions.

---

## 4. Scope: root vs scoped

| Тип                                                | Scope                                |
| -------------------------------------------------- | ------------------------------------ |
| Глобальное состояние приложения (CloudConfig, Tweaks) | `providedIn: 'root'`              |
| Список-кэш для всего приложения (TemplatesStore)   | `providedIn: 'root'`                 |
| Stateless model/service/repo                       | `providedIn: 'root'`                 |
| State редактора одного шаблона (открытый template) | **scoped** — `providers: [TemplateEditorStore, TemplateEditorActions]` на route-компоненте редактора |
| State текущего интервью (run)                      | **scoped** на runner-компоненте      |
| Локальный UI-state                                 | `signal()` в компоненте              |

**Правило:** если состояние эксклюзивно для дерева компонентов одного роута/субдерева — провайдим на root-компоненте этого дерева. Не в `root`.

При выходе из роута provider пересоздаётся → состояние сбрасывается автоматически. Это устраняет ручной reset.

---

## 5. Repo: абстракция над хранилищем

Repo — тонкая обёртка над storage. Аналог HTTP-service из `code-req.md`, но для IndexedDB / cloud.

```ts
@Injectable({ providedIn: 'root' })
export class TemplateRepo {
  private readonly _db = inject(AppDb);

  list(): Observable<readonly TemplateDto[]> {
    return from(this._db.templates.getAll());
  }

  get(id: TemplateId): Observable<TemplateDto | null> { ... }
  create(input: CreateTemplateInput): Observable<TemplateDto> { ... }
  update(id: TemplateId, patch: Partial<TemplateDto>): Observable<TemplateDto> { ... }
  delete(id: TemplateId): Observable<void> { ... }
}
```

**Правила:**

- Возвращает `Observable<T>`. Promise из IDB оборачиваем через `from()` или `defer(() => ...)`.
- Repo работает с **DTO** (см. §6), не с domain-моделями.
- Никакого состояния, сигналов, подписок.
- Repo живёт в `features/<feature>/models/data/<entity>.repo.ts` (когда фича владеет сущностью). Низкоуровневые платформенные адаптеры (например, обёртка над IDB или над cloud-провайдером) — в `src/app/api/`.

---

## 6. DTO vs Domain Model

Разделяем:

- **DTO** (`*.dto.ts`) — форма хранения/передачи: то, что лежит в IDB и в JSON облака. Без Angular-импортов.
- **Domain** (`*.ts` в `interfaces/`) — форма внутри UI: то, чем оперируют Store/Actions/components.

**Маппинг:**

```ts
// features/templates/api/template.mapper.ts
export const toTemplate = (dto: TemplateDto): Template => ({ ... });
export const toTemplateDto = (model: Template): TemplateDto => ({ ... });
```

Маппер вызывается в Repo на границе. В Store/Actions попадают только domain-типы.

**Когда DTO === Domain:** допустимо реэкспортировать через `export type Template = TemplateDto`. Но **только если** изменение формата хранения не должно ломать UI и наоборот — обычно лучше иметь два типа сразу.

---

## 7. Storage: IndexedDB

**Стратегия:** IDB — единственный источник истины для приложения. Cloud — бэкап.

### 7.1. Schema

Нормализованные object stores с явными индексами:

```
db: interviewkit
  templates   { id }                     primary: id
  categories  { id, templateId }         primary: id, index: by-template (templateId)
  questions   { id, templateId, categoryId }
                                          primary: id, indexes: by-template, by-category
  interviews  { id, templateId, status, candidateDate }
                                          primary: id, indexes: by-template, by-status, by-date
  answers     { interviewId, qId }       primary: [interviewId, qId], index: by-interview
  meta        { key }                    primary: key  (хранит fileVersion, cloud config)
```

Версии схемы — через миграции idxdb-utils. Каждая миграция — отдельный файл `api/storage/migrations/v<N>.ts`.

### 7.2. Транзакции

Атомарные операции, затрагивающие несколько store, — внутри транзакции. Например: удаление шаблона удаляет вопросы, категории и помечает интервью как orphan.

### 7.3. Reactive layer

idxdb-utils — promise-based. Оборачиваем в RxJS на границе Repo:

```ts
list(): Observable<readonly TemplateDto[]> {
  return defer(() => this._db.templates.getAll());
}
```

**БД не обеспечивает реактивность.** Источник истины для UI-state — Store. Reactivity = `signal/observable` стора. IDB — durable persistence. Сценарий:

```
Actions.create()
  → Repo.create()         # write в IDB
  → Store.add(template)   # обновили реактивный state
  → CloudSync.markDirty() # отметили для отложенного push
```

Никакие `notify`-механизмы поверх IDB не вводим. Если в будущем понадобится cross-tab sync — добавим отдельный `CrossTabSyncService` через `BroadcastChannel`. Это будет наблюдаемая граница между приложением и внешним миром, не размазанный по сторам подписочный механизм.

---

## 8. Cloud sync

Cloud — это бэкап. Приложение не зависит от облака в runtime.

Один монолитный JSON для всех данных — **не подходит:** Dropbox медленно загружает большие файлы, и любое изменение требовало бы полного re-upload. Используем подход **file-per-aggregate + manifest**.

### 8.1. Структура файлов в облаке

```
/Apps/InterviewKit/
  manifest.json                       # индекс всех aggregate-ов: id, kind, rev, deleted
  templates/
    {templateId}.json                 # { template, categories[], questions[] }
  interviews/
    {interviewId}.json                # { interview, answers[] }
```

**Aggregate-границы:**

- **Template aggregate** = `Template + Categories + Questions`. Всегда меняются вместе, удаляются вместе.
- **Interview aggregate** = `Interview + Answers`. Создаётся, проводится и закрывается как одно целое.

Каждый aggregate в IDB и в файле хранит `rev: number` — локальный счётчик ревизии. Инкремент — на каждый write через Actions.

### 8.2. Manifest

`manifest.json` — лёгкий индекс:

```ts
interface ManifestDto {
  readonly schemaVersion: number;
  readonly updatedAt: string;
  readonly entries: readonly ManifestEntryDto[];
}

interface ManifestEntryDto {
  readonly kind: 'template' | 'interview';
  readonly id: string;
  readonly rev: number;
  readonly updatedAt: string;
  readonly deleted?: boolean;          // tombstone
}
```

Tombstones (`deleted: true`) **остаются в manifest** — нужны другим устройствам, чтобы знать что aggregate был удалён. Compaction старых tombstones — отдельная ручная операция.

### 8.3. Провайдеры

`api/cloud/cloud-provider.ts` — общий интерфейс:

```ts
export interface CloudProvider {
  readonly kind: 'dropbox' | 'yandex';
  authorize(): Observable<CloudAccount>;
  disconnect(): Observable<void>;

  fetchManifest(): Observable<ManifestDto | null>;
  pushManifest(manifest: ManifestDto): Observable<void>;

  fetchAggregate<T>(kind: AggregateKind, id: string): Observable<T | null>;
  pushAggregate<T>(kind: AggregateKind, id: string, body: T): Observable<void>;
  deleteAggregate(kind: AggregateKind, id: string): Observable<void>;
}
```

Регистрируются через DI multi-token `CLOUD_PROVIDERS`.

### 8.4. Стратегия sync

**На старте (после успешного OAuth):**

1. Pull `manifest.json`.
2. Для каждой entry — сравниваем `remote.rev` с локальным `rev` aggregate-а (в IDB).
3. `remote.rev > local.rev` → pull этого файла → upsert в IDB → локальный `rev := remote.rev`.
4. `local.rev > remote.rev` (или aggregate отсутствует в remote и не помечен deleted) → push.
5. `deleted: true && exists locally` → delete локально.
6. По завершении — push обновлённого manifest.

**На изменение (внутри сессии):**

1. `Actions.save(...)` → `Repo` пишет в IDB → инкрементирует `rev` aggregate-а → `CloudSync.markDirty(kind, id)`.
2. `CloudSyncService` накапливает dirty-set, debounce ~1.5s.
3. Пушит aggregate-файлы параллельно (с лимитом 4–8) → в конце пушит `manifest.json`. **Manifest всегда последний** — он "коммитит" остальные пуши.

### 8.5. Конфликты

Простая политика: **last-write-wins на уровне aggregate + UI-баннер**.

- При pull обнаруживаем `remote.rev > local.rev` и при этом локально есть несохранённые изменения (например, `dirty` флаг) → перезаписываем локальное, показываем баннер: "Шаблон «N» был изменён на другом устройстве, ваши изменения сброшены".
- Если конфликта нет (правки только с одной стороны) — никакого UI.
- Полноценный merge / 3-way conflict UI — out of scope первой версии. Для одного пользователя в 99% случаев LWW достаточно.

### 8.6. Без облака

Если провайдер не подключён — приложение работает на IDB. Cloud-modal показывается как onboarding, но есть кнопка "Использовать без облака" → IDB-only режим.

### 8.7. Edge-cases для будущей реализации

- **Rate limits Dropbox** (~600 req/min) — при initial sync с большой историей нужно пакетировать.
- **Partial failure push.** Запушили часть aggregate-файлов, не дошли до manifest. На следующем старте сделаем pull manifest → не увидим новые rev → push заново. Идемпотентно.
- **Schema migrations.** В manifest и в каждом aggregate-файле есть `schemaVersion`. При load — мигрируем форму, при write — пишем актуальную.
- **Compaction tombstones** — раз в N запусков или вручную: убираем deleted-tombstones старше M дней.

---

## 9. Компонент как тонкий слой

Цель: компонент = шаблон + инжекты + обработчики, делегирующие в Actions. Аналог тонкого контроллера на бэкенде.

### 9.1. Что должен делать компонент

- Объявлять inputs (`input()`, `model()`), outputs (`output()`).
- Инжектировать Store(s) и Actions фичи.
- Декларировать локальный UI-state (`_panelOpen = signal(false)`).
- Объявлять FormGroup (если есть форма).
- Подписываться на Observable из Actions с `takeUntilDestroyed()`.

### 9.2. Чего НЕ должен делать компонент

- Не содержит бизнес-логики: фильтрация/сортировка/маппинг — в `computed` стора или в Actions.
- Не вызывает Repo / HttpClient напрямую.
- Не мутирует доменные сторы (только UI-флаги).
- Не содержит `if`/`switch` над данными в шаблоне (выносим в computed).
- Не содержит `try/catch` вокруг сетевых вызовов (это работа Actions).

### 9.3. Пример

```ts
@Component({...})
export class TemplateListComponent {
  protected readonly _store = inject(TemplatesStore);
  protected readonly _actions = inject(TemplatesActions);
  private readonly _destroyRef = inject(DestroyRef);

  ngOnInit() {
    this._actions.load().pipe(takeUntilDestroyed(this._destroyRef)).subscribe();
  }

  openTemplate(id: TemplateId): void {
    this._actions.openEditor(id);
  }
}
```

```html
@if (_store.isEmpty()) {
  <app-empty-templates />
} @else {
  @for (t of _store.value(); track t.id) {
    <app-template-card [template]="t" (open)="openTemplate(t.id)" />
  }
}
```

---

## 10. Layout & Shell

`features/layout/` содержит app-shell — это **общая UI-структура**, оформленная как фича верхнего уровня (живёт рядом с остальными фичами, не в `shared/`, потому что инжектит stores из других фич). Включает:

- `app-shell` — host: `<aside slot>`, `<router-outlet>`
- `app-sidebar` — основная навигация (получает данные через DI из root-stores: counts из TemplatesStore/HistoryStore)
- `cloud-card` — sub-компонент sidebar для cloud-статуса

Sidebar дёргает `cloud-settings`-фичу через actions/dialogs из своей фичи (cloud-settings — отдельная фича в `features/cloud-settings/`).

`features/layout` инжектит **stores** других features через DI (root-scoped), но не импортирует их компоненты. Если нужно открыть dialog — через `DialogService` (CDK), не через прямое создание.

---

## 11. Naming

| Артефакт        | Паттерн                            | Пример                                  |
| --------------- | ---------------------------------- | --------------------------------------- |
| Component       | `*.component.{ts,html,scss}`       | `template-list.component.ts`            |
| Store           | `*.store.ts` (`@Injectable`)       | `TemplatesStore`, `TemplateEditorStore` |
| Actions         | `*.actions.ts` (`@Injectable`)     | `TemplatesActions`                      |
| Repo            | `*.repo.ts` (`@Injectable`)        | `TemplateRepo`                          |
| DTO             | `*.dto.ts`                         | `TemplateDto`, `AnswerDto`              |
| Domain model    | `*.ts` в `interfaces/`             | `Template`, `Question`                  |
| Mapper          | `*.mapper.ts`                      | `template.mapper.ts`                    |
| Routes          | `*.routes.ts`, export `FEATURE_ROUTES` | `template.routes.ts`                |
| Const/enum      | `*.const.ts` / `*.enum.ts`         | `score-labels.const.ts`                 |

ID-типы — branded:

```ts
export type TemplateId = string & { readonly __brand: 'TemplateId' };
```

Это запрещает случайное смешивание `TemplateId` с `QuestionId`.

---

## 12. Чеклист перед коммитом (расширяет code-req.md)

- [ ] Компонент инжектит **Store** для чтения, **Actions** для команд. Логики в `.ts` минимум.
- [ ] Все мутации доменного состояния идут через Actions, не из компонента.
- [ ] Repo не содержит состояния. Возвращает Observable.
- [ ] Если состояние шарится — Store; если используется в одном дереве — scoped провайдер.
- [ ] DTO живёт в `src/app/api/storage/dto/` (общие) или `features/*/models/data/` (если фича владеет своими DTO). Domain-типы — в `features/*/interfaces/`.
- [ ] Изменения в IDB-схеме — миграцией, не правкой существующей версии.
- [ ] Cloud-push отложенный; UI не блокируется ожиданием облака.
