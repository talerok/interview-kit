# Frontend Code Requirements

Version: 2 | Last updated: 2026-03-04

---

## 1. Принципы

- **KISS** — главный принцип. SOLID, YAGNI, DRY подчиняются ему
- **YAGNI > DRY** — лучше похожие реализации для разных контекстов, чем универсальная и сложная
- **SRP** — компонент: UI/события; модель: состояние/логика; сервис: только HTTP
- **Dependency Inversion** — зависимости направлены вниз или вбок, не вверх
- **Boy Scout Rule** — оставляй код чище, чем он был
- **Нулевая толерантность к костылям** — workaround только для внешних библиотек, с комментарием и ссылкой на задачу

---

## 2. Архитектура — MVVM

```
View (template) → ViewModel (component) → Model (injectable) → Service (HTTP)
```

| Слой          | Ответственность                                                      | Файл                         |
| ------------- | -------------------------------------------------------------------- | ---------------------------- |
| **View**      | Шаблон, максимально простой                                          | `*.component.html`           |
| **ViewModel** | Инжекты, привязки к шаблону, обработчики событий — делегирует модели | `*.component.ts`             |
| **Model**     | Бизнес-логика, состояние (signals), computed, экшены                 | `*.model.ts` (`@Injectable`) |
| **Service**   | Тонкий HTTP-враппер, возвращает `Observable<T>`                      | `*.service.ts`               |
| **DTO**       | Чистые интерфейсы, ноль Angular-импортов                             | `*.model.ts` (интерфейсы)    |

**Структура фичи:**

```
features/users/
  user.service.ts       # HTTP
  user.model.ts         # DTO-интерфейсы + Injectable Model (если нужна логика)
  user.routes.ts        # lazy-loaded routes
  user-list/            # .ts, .html, .scss
  user-detail/          # .ts, .html, .scss
  create-user-dialog/   # .ts, .html, .scss
```

**Правила:**

- Компонент — строго **3 файла** (`.ts`, `.html`, `.scss`). Inline template/styles запрещены
- В одном `.ts` — один `@Component`. Диалог — отдельный файл
- Каждый компонент `standalone`, `ChangeDetectionStrategy.OnPush`
- NgModules запрещены
- Каждая фича подключается через `loadChildren` (lazy loading)
- Фича экспортирует `FEATURE_ROUTES` constant

---

## 3. Model

`@Injectable` — один на фичу. Содержит состояние и бизнес-логику.

```ts
@Injectable({ providedIn: "root" })
export class UserModel {
  private readonly _service = inject(UserService);

  private readonly _users = signal<UserDto[]>([]);
  private readonly _loading = signal(false);

  readonly users = this._users.asReadonly();
  readonly loading = this._loading.asReadonly();
  readonly isEmpty = computed(
    () => !this._loading() && this._users().length === 0,
  );

  load(): void {
    this._loading.set(true);
    this._service
      .search(this._searchRequest())
      .pipe(finalize(() => this._loading.set(false)))
      .subscribe((res) => this._users.set(res.items));
  }

  delete(id: string): Observable<void> {
    return this._service
      .delete(id)
      .pipe(
        tap(() =>
          this._users.update((list) => list.filter((u) => u.id !== id)),
        ),
      );
  }
}
```

**Правила:**

- Все поля состояния — `private signal()`, публично — `.asReadonly()`
- Мутация состояния — только через методы (экшены) модели
- Модель не импортирует Angular-компоненты
- Разовые операции (create/update) возвращают `Observable<T>` — компонент подписывается и управляет UX

---

## 4. Компоненты

**Класс содержит только:**

- Инжектированные зависимости
- `protected readonly _model`, `protected readonly _perms` — для шаблона
- Обработчики событий — вызывают метод модели или открывают диалог
- Минимальный UI-state (`protected readonly _panelOpen = signal(false)`)

Если в классе появляется `if`/`filter`/`map` над данными — логика переносится в `computed()` модели.

**Control flow** — только новый синтаксис (`*ngIf`/`*ngFor`/`*ngSwitch` запрещены):

```html
@if (_model.loading()) { <mat-spinner /> } @for (user of _model.users(); track
user.id) { ... } @empty {
<tr>
  <td>Нет данных</td>
</tr>
}
```

**Inputs/Outputs** — signal-based, декораторы `@Input`/`@Output` запрещены:

```ts
readonly userId = input.required<string>();
readonly deleted = output<string>();
readonly value = model<string>('');
```

**Разрешения** — через `inject(PermissionService)` напрямую:

```ts
protected readonly _perms = inject(PermissionService);
// шаблон: @if (_perms.hasPermission('users.create'))
```

**Производительность:**

- `track id` в `@for` — обязателен
- Диалоги/тяжёлые компоненты — через `@defer`
- `loading="lazy"` на `<img>`

**Размер:**

- Компонент ≤200 строк (обычный), ≤500 (сложный)
- Шаблон ≤200–300 строк
- Метод ≤20–30 строк

---

## 5. HTTP Services

Тонкий слой над `HttpClient`. Никакого состояния, сигналов, подписок.

```ts
@Injectable({ providedIn: "root" })
export class UserService {
  private readonly _http = inject(HttpClient);

  getUser(id: string): Observable<UserDto> {
    return this._http.get<UserDto>(`/api/users/${id}`);
  }
}
```

- Методы возвращают `Observable<T>`, `.subscribe()` внутри запрещён
- `tap()` для обновления состояния — запрещён (задача модели)
- `any` запрещён

---

## 6. RxJS

- Код **плоский** — один `pipe()` с цепочкой операторов, без вложенных `subscribe`
- Если логика оператора > 1 строки — выносится в отдельную функцию

```ts
loadUser() {
  return this.api.getUser().pipe(
    map(toUserDto),
    filter(isValidUser),
    tap(logUser),
  );
}
```

- Порядок операторов: `filter → map → switchMap/mergeMap → catchError → finalize`
- `Observable` — для IO-потоков (HTTP, события, WS). Хранение состояния — только signals
- На границе с UI конвертировать `Observable → Signal` через `toSignal()`

**Завершение подписок:**

Любой `.subscribe()` в компоненте/директиве/пайпе обязан иметь `takeUntilDestroyed()`:

```ts
private readonly _destroyRef = inject(DestroyRef);
this.obs$.pipe(takeUntilDestroyed(this._destroyRef)).subscribe(...);
```

В моделях (`providedIn: 'root'`) `takeUntilDestroyed` не нужен.

**Если тело `next`/`error` > 1 строки — выносится в приватный метод:**

```ts
.subscribe({ next: this._onSaveSuccess.bind(this), error: this._onSaveError.bind(this) });
```

---

## 7. Signals

- `effect()` запрещён. Только `explicitEffect()` с явными зависимостями
- `computed()` — только чистые функции, без сайд-эффектов
- `model()` вместо `Input() + Output()Change`

```ts
explicitEffect([this.user], ([user]) => {
  console.log("User updated:", user);
});
```

---

## 8. Формы — Signal Forms

Только **Angular Signal Forms** (`@angular/forms/signals`, Angular 21+). Reactive Forms и Template-driven запрещены — они не интегрируются с zoneless без RxJS-обвязки.

```ts
import { form, FormField, required, minLength, email, submit } from '@angular/forms/signals';

protected readonly _model = signal({
  name: '',
  email: '',
  description: '',
});

protected readonly _form = form(this._model, (s) => {
  required(s.name, { message: 'Имя обязательно' });
  minLength(s.name, 2);
  required(s.email, { message: 'Email обязателен' });
  email(s.email, { message: 'Некорректный email' });
});

protected _onSubmit(): void {
  submit(this._form, async () => {
    await this._actions.save(this._model());
  });
}
```

**Правила:**

- Модель — `signal()` с обязательным начальным значением. **Никаких `null`/`undefined`** — используем `''`, `0`, `[]`.
- Форма создаётся через `form(model, schema)` как поле класса.
- В шаблоне инпуты биндятся через `[formField]="_form.name"`. Нельзя ставить `[value]`, `[disabled]`, `[readonly]`, `min`, `max` атрибутами — только через schema-правила.
- Состояние поля — функция: `_form.name()` возвращает `FieldState` с сигналами (`.value()`, `.valid()`, `.touched()`, `.errors()`).
- Состояние формы в целом — `_form()` (`.invalid()`, `.valid()`, `.pending()`).
- Submit — `submit(form, async () => { ... })`. Callback **обязательно** `async`. Submit сам помечает поля touched.
- Мутация значений — через `_model.update(...)`. Никаких `_form.field.set(...)` — Signal Forms model-driven.
- Импорт `FormControl`/`FormGroup`/`FormBuilder` из `@angular/forms` запрещён.
- Кастомные контролы — через CVA остаются возможны, но обёртывают `[formField]` через `bindControl`/`Control` directive.

---

## 9. Guards, Routing

Guards — только функциональный стиль:

```ts
export const authGuard: CanActivateFn = () =>
  inject(AuthService).isAuthenticated() ||
  inject(Router).createUrlTree(["/login"]);
```

Фичи — `loadChildren`:

```ts
{
  path: 'users',
  canActivate: [authGuard, permissionGuard('users.view')],
  loadChildren: () => import('./features/users/user.routes').then(m => m.USER_ROUTES),
}
```

---

## 10. Обработка ошибок

API → `ProblemDetails` (RFC 7807). `catchError` — в модели, не в компоненте.

- Ориентироваться на поле `code`, не на `status`/`detail`
- Коды → локализованные строки в `error-messages.const.ts`
- `400`/`409` — снекбар с сообщением
- `401` → redirect на `/login` (interceptor)
- `403` — снекбар «Нет доступа»
- `500`/сетевые — общее сообщение + `traceId` в консоль

---

## 11. Angular API

**Запрещено:** `@Input`, `@Output`, `@ViewChild`, `@HostBinding`, `@HostListener`, DI через конструктор

**Разрешено:** `input()`, `model()`, `output()`, `viewChild()`, `viewChildren()`, `inject()`, `host: {}` в декораторе

**Change Detection:** только `OnPush`. `ViewEncapsulation.None` запрещён.

**Декларативный стиль** для UI предпочтителен. Self-closing теги: `<app-loader />`.

---

## 12. CSS

- `:host` — предпочитать стилизацию хост-элемента вместо лишнего `<div>`
- `::ng-deep` — запрещён, кроме workaround для сторонних библиотек (с комментарием и ссылкой на задачу)
- Максимальная вложенность — 2 уровня
- Angular animations запрещены (native CSS transitions/animations)
- Семантическая вёрстка, минимум `div`/`span`
- Компонент как контейнер — не оборачивать шаблон в лишний `<div>`

---

## 13. Нейминг и TypeScript

| Артефакт       | Паттерн                         | Пример                               |
| -------------- | ------------------------------- | ------------------------------------ |
| Component      | `PascalCase` + selector `kebab` | `UserListComponent`, `app-user-list` |
| Model          | суффикс `Model`                 | `UserModel`                          |
| Service        | суффикс `Service`               | `UserService`                        |
| Guard          | суффикс `Guard` (функция)       | `authGuard`                          |
| DTO            | суффикс `Dto`                   | `UserDto`, `CreateUserDto`           |
| Signal private | `_` префикс                     | `_users`, `_loading`                 |
| Computed       | прилагательное                  | `isEmpty`, `hasError`                |
| Action method  | глагол                          | `load()`, `delete()`                 |

**Модификаторы доступа:**

- `private readonly _x` — используется только внутри класса
- `protected readonly _x` — используется в шаблоне
- `public` — только если нужен снаружи

**TypeScript** (`strict: true`, `noUnusedLocals/Parameters: true`):

- `any` запрещён без обоснования
- `as Type` — только после guard/typecheck
- `interface` для DTO и контрактов, `type` для алиасов и union
- `readonly` на всех полях по умолчанию
- Магические константы запрещены — выносить в именованные константы

---

## 14. Порядок свойств в классе

1. Инжекты (`inject()`)
2. Inputs (`input()`, `model()`)
3. Outputs (`output()`)
4. ViewChild/ViewChildren
5. Публичные сигналы (для шаблона)
6. Приватные состояния
7. Хуки жизненного цикла
8. Публичные методы
9. Приватные методы

---

## 15. Комментарии

- Код самодокументируемый: имена отражают суть
- Комментарии — для **зачем**, не **что**
- TODO с обязательной ссылкой на задачу: `// TODO: описание (TASK-123)`
