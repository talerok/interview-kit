import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  OnInit,
  inject,
  input,
  signal,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Router } from '@angular/router';
import { CloudProviderKind } from '../../interfaces/cloud';
import { CloudActions } from '../../models/state/cloud.actions';

type CallbackStatus = 'pending' | 'success' | 'error';

const isCloudProviderKind = (value: string): value is CloudProviderKind => value === 'dropbox';

@Component({
  selector: 'app-oauth-callback',
  templateUrl: './oauth-callback.component.html',
  styleUrl: './oauth-callback.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class OAuthCallbackComponent implements OnInit {
  readonly kind = input.required<string>();

  private readonly _actions = inject(CloudActions);
  private readonly _router = inject(Router);
  private readonly _destroyRef = inject(DestroyRef);

  protected readonly _status = signal<CallbackStatus>('pending');
  protected readonly _message = signal('Обмениваем код на токен…');

  ngOnInit(): void {
    const kind = this.kind();
    if (!isCloudProviderKind(kind)) {
      this._fail(`Неизвестный провайдер: ${kind}`);
      return;
    }

    const params = new URLSearchParams(location.search);
    this._actions
      .finalizeOAuth(kind, params)
      .pipe(takeUntilDestroyed(this._destroyRef))
      .subscribe({
        next: () => {
          this._status.set('success');
          this._message.set('Готово! Возвращаемся в приложение…');
          this._actions.openDialog();
          setTimeout(() => void this._router.navigate(['/templates']), 600);
        },
        error: (err: unknown) => {
          console.error('[OAuth callback] error:', err);
          this._fail(formatOAuthError(err));
        },
      });
  }

  protected _retry(): void {
    void this._router.navigate(['/templates']);
  }

  private _fail(message: string): void {
    this._status.set('error');
    this._message.set(message);
  }
}

interface MaybeHttpError {
  readonly status?: number;
  readonly message?: string;
  readonly error?: unknown;
}

const formatOAuthError = (err: unknown): string => {
  if (err instanceof Error) return err.message;
  if (typeof err !== 'object' || err === null) return String(err);
  const e = err as MaybeHttpError;
  const status = e.status ?? '?';
  const body = e.error;
  if (typeof body === 'string') return `${status}: ${body}`;
  if (typeof body === 'object' && body !== null) {
    const bodyObj = body as { error_description?: string; error_summary?: string; error?: string };
    const detail =
      bodyObj.error_description ?? bodyObj.error_summary ?? bodyObj.error;
    if (detail) return `${status}: ${detail}`;
  }
  return e.message ?? `${status}: неизвестная ошибка`;
};
