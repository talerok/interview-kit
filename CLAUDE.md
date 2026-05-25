# Interview App

Angular-приложение. Разработка ведётся на актуальной мажорной версии Angular с использованием standalone-компонентов, signals и нового control flow.

---

## Источники истины

- **[docs/code-req.md](docs/code-req.md)** — требования к коду (signals, control flow, RxJS, TS, нейминг). Обязательны к соблюдению при любом изменении.
- **[docs/style-guide.md](docs/style-guide.md)** — архитектура: слои (api/core/shared/features), Store + Actions, scope моделей, Repo, DTO/Domain, sync.
- **`.agents/skills/angular-developer/`** — установленный skill с актуальной документацией по Angular (signals, формы, роутинг, DI, тестирование). При сомнениях по Angular API заглядывать в `references/` этого skill.

При конфликте: `style-guide.md` (архитектура) > `code-req.md` (код) > skills (API-справочник).

---

## Ключевые правила (кратко)

Полные правила — в [docs/code-req.md](docs/code-req.md) и [docs/style-guide.md](docs/style-guide.md). Здесь — то, что чаще всего нарушается:

### Архитектура

- **Слои:** `api/` (storage, cloud) → `core/` (bootstrap, конфиг) → `shared/` (UI, utils, state primitives) → `features/` (фичи). `shared` не зависит от `features`/`core`.
- **Структура фичи:** `components/`, `models/state/` (`*.store.ts` + `*.actions.ts`), `models/data/` (`*.repo.ts` + `*.mapper.ts`), `interfaces/`, `constants/`, `*.routes.ts`. `src/app/api/` — только общие платформенные адаптеры (storage, cloud), не модели фич. Вложенные суб-фичи — внутри `components/<sub>/` с той же структурой.
- **Store + Actions вместо монолитной Model:**
  - `*.store.ts` — `extends EntityStore<T> | ListEntityStore<T>` из `shared/state/`. Только состояние, public `value` (signal) и `value$` (observable), `set/patch`.
  - `*.actions.ts` — use-cases, инжектит сторы + repo, возвращает `Observable<T>`. Без состояния.
  - Компонент инжектит Store для чтения, Actions для команд.
  - Тонкие фичи без сложной логики допускают один `*.model.ts`.
- **Scope:** глобальное/stateless → `providedIn: 'root'`. Эксклюзивное для дерева роута → провайдим в route-компоненте (scoped). Локальный UI-state — `signal()` в компоненте.
- **Repo:** `*.repo.ts` — тонкая обёртка над IDB/cloud, возвращает `Observable<T>`. Работает с DTO. Без состояния.
- **DTO vs Domain:** `*.dto.ts` для хранения, `*.ts` в `interfaces/` для UI. Маппер на границе Repo.
- **Storage:** IDB (idxdb-utils) — single source of truth. Cloud — отложенный бэкап с debounced push.

### Код

- **Компонент — 3 файла** (`.ts`, `.html`, `.scss`). Inline template/styles запрещены. `standalone: true`, `ChangeDetectionStrategy.OnPush`.
- **NgModules запрещены.** Фичи — через `loadChildren` и экспорт `FEATURE_ROUTES`.
- **Signals**: состояние — `private signal()` + публичный `.asReadonly()` (или через `EntityStore`). `effect()` запрещён, использовать `explicitEffect()`. `computed()` — только чистые функции.
- **Inputs/Outputs**: только signal-based — `input()`, `model()`, `output()`. Декораторы `@Input`/`@Output`/`@ViewChild`/`@HostBinding`/`@HostListener` запрещены.
- **DI**: только через `inject()`, не через конструктор.
- **Control flow**: только `@if`/`@for`/`@switch`. Старые `*ngIf`/`*ngFor`/`*ngSwitch` запрещены. В `@for` — обязательный `track`.
- **RxJS**: плоский `pipe()`, без вложенных `subscribe`. В компонентах любой `subscribe()` — с `takeUntilDestroyed()`. В Actions — без `subscribe()` вообще.
- **Формы**: только `ReactiveFormsModule`, `nonNullable: true` на всех контролах.
- **Guards**: только функциональный стиль (`CanActivateFn`).
- **Ошибки**: `ProblemDetails`-подобный contract, `catchError` — в Actions, не в компоненте. Ориентир на поле `code`.
- **TypeScript**: `strict: true`, `any` запрещён, `readonly` по умолчанию, магических констант нет. ID — branded types.
- **Нейминг**: `*.component.ts`, `*Store`, `*Actions`, `*Repo`, `*Dto`. Private signals — `_` префикс. `protected readonly _x` — то, что используется в шаблоне.

---

## Что делать перед коммитом

1. Свериться с [docs/style-guide.md](docs/style-guide.md) (архитектура) и [docs/code-req.md](docs/code-req.md) (код).
2. Запустить линтер и проверку типов проекта.
3. Если меняется UI — проверить вживую в браузере (golden path + крайние случаи).

---

## Современный HTML/CSS

Целевые браузеры — **актуальные версии Chrome, Safari, Firefox**. Полифилы и фолбэки под старые браузеры не пишем.

- **Платформенные API вместо самописных решений:**
  - `<dialog>` + `showModal()` — для модалок (не самописные оверлеи).
  - **Popover API** (`popover` + `popovertarget`) — для тултипов, поповеров, меню.
  - **CSS Anchor Positioning** (`anchor-name`, `position-anchor`) — для привязки поповеров к триггеру.
  - `<details>`/`<summary>` — для раскрывающихся секций.
  - Нативные `inert`, `:has()`, `:is()`, `:where()`.
- **CSS:**
  - Контейнерные запросы (`@container`) — приоритет над media-запросами там, где компонент адаптируется к своему контейнеру.
  - Логические свойства (`margin-inline`, `padding-block`, `inset`) вместо `left`/`right`/`top`/`bottom`.
  - CSS nesting — нативный, без SCSS-обёрток где можно.
  - `color-mix()`, `oklch()`, относительные цвета.
  - `:focus-visible` для фокус-стилей, не `:focus`.
  - `aspect-ratio`, `gap` в flex/grid, `clamp()` для типографики.
- **HTML:** семантические теги (`<nav>`, `<main>`, `<article>`, `<section>`), корректный `aria-*` только там, где семантика не покрывает.

Перед написанием своего поведения — проверить, нет ли платформенного API.

---

## Чего избегать

- Излишних абстракций «на будущее» (YAGNI > DRY).
- Логики в шаблоне или в компоненте — её место в `computed()` стора или в Actions.
- Мутации доменного состояния напрямую из компонента — только через Actions. Из компонента — только UI-флаги.
- Workaround-ов без комментария и ссылки на задачу (нулевая толерантность к костылям).
- `::ng-deep`, `ViewEncapsulation.None`, Angular animations — запрещены (кроме явных workaround для сторонних библиотек).
- Брать код/решения из `design/` — это только визуальный референс (HTML/CSS-вёрстка). JS-код и архитектурные подсказки в комментариях макета — игнорируются.
