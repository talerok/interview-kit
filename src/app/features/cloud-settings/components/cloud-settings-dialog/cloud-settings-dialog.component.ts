import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  ElementRef,
  inject,
  input,
  output,
  viewChild,
} from '@angular/core';
import { takeUntilDestroyed, toObservable } from '@angular/core/rxjs-interop';
import { CloudSyncService } from '../../../../api/cloud';
import { AccountId, AccountsStore } from '../../../../core/account';
import { FmtDateTimePipe } from '../../../../shared/pipes';
import { IconComponent } from '../../../../shared/ui/icon';
import { CloudActions } from '../../models/state/cloud.actions';
import { CloudStore } from '../../models/state/cloud.store';

@Component({
  selector: 'app-cloud-settings-dialog',
  imports: [IconComponent, FmtDateTimePipe],
  templateUrl: './cloud-settings-dialog.component.html',
  styleUrl: './cloud-settings-dialog.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CloudSettingsDialogComponent {
  readonly open = input<boolean>(false);
  readonly dismissed = output<void>();

  protected readonly _store = inject(CloudStore);
  protected readonly _accounts = inject(AccountsStore);
  protected readonly _actions = inject(CloudActions);
  protected readonly _sync = inject(CloudSyncService);

  protected readonly _dialog = viewChild.required<ElementRef<HTMLDialogElement>>('dialog');
  private readonly _destroyRef = inject(DestroyRef);

  constructor() {
    toObservable(this.open)
      .pipe(takeUntilDestroyed(this._destroyRef))
      .subscribe((open) => this._syncDialog(open));
  }

  protected _close(): void {
    const el = this._dialog().nativeElement;
    if (el.open) {
      el.close();
    }
  }

  protected _onNativeClose(): void {
    this.dismissed.emit();
  }

  protected _onAddDropbox(): void {
    this._actions
      .connect('dropbox')
      .pipe(takeUntilDestroyed(this._destroyRef))
      .subscribe();
  }

  protected _onActivate(id: AccountId): void {
    this._actions.activate(id);
  }

  protected _onDisconnect(id: AccountId): void {
    this._actions.disconnect(id);
  }

  protected _onSyncNow(): void {
    this._actions
      .syncNow()
      .pipe(takeUntilDestroyed(this._destroyRef))
      .subscribe();
  }

  private _syncDialog(open: boolean): void {
    const el = this._dialog().nativeElement;
    if (open === el.open) {
      return;
    }
    if (open) {
      el.showModal();
      return;
    }
    el.close();
  }
}
