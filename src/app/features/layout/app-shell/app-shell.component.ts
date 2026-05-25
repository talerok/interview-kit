import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  OnInit,
  inject,
  signal,
} from '@angular/core';
import { takeUntilDestroyed, toObservable } from '@angular/core/rxjs-interop';
import { RouterOutlet } from '@angular/router';
import { skip, switchMap } from 'rxjs';
import { forkJoin } from 'rxjs';
import { CloudSyncService } from '../../../api/cloud';
import { AccountsStore } from '../../../core/account';
import { WorkspaceService } from '../../../core/workspace';
import { CloudActions } from '../../../features/cloud-settings/models/state/cloud.actions';
import { CloudStore } from '../../../features/cloud-settings/models/state/cloud.store';
import { CloudSettingsDialogComponent } from '../../../features/cloud-settings/components/cloud-settings-dialog/cloud-settings-dialog.component';
import { InterviewsActions } from '../../../features/interview/models/state/interviews.actions';
import { InterviewsStore } from '../../../features/interview/models/state/interviews.store';
import { TemplatesActions } from '../../../features/templates/models/state/templates.actions';
import { TemplatesStore } from '../../../features/templates/models/state/templates.store';
import { SidebarComponent } from '../sidebar/sidebar.component';

@Component({
  selector: 'app-shell',
  imports: [RouterOutlet, SidebarComponent, CloudSettingsDialogComponent],
  templateUrl: './app-shell.component.html',
  styleUrl: './app-shell.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AppShellComponent implements OnInit {
  protected readonly _templates = inject(TemplatesStore);
  protected readonly _interviews = inject(InterviewsStore);
  protected readonly _cloud = inject(CloudStore);
  protected readonly _accounts = inject(AccountsStore);
  protected readonly _cloudActions = inject(CloudActions);
  protected readonly _cloudSync = inject(CloudSyncService);
  private readonly _workspace = inject(WorkspaceService);
  private readonly _templatesActions = inject(TemplatesActions);
  private readonly _interviewsActions = inject(InterviewsActions);
  private readonly _destroyRef = inject(DestroyRef);

  protected readonly _cloudDialogOpen = signal(false);

  ngOnInit(): void {
    // Initial population from IDB.
    this._templatesActions
      .load()
      .pipe(takeUntilDestroyed(this._destroyRef))
      .subscribe();
    this._interviewsActions
      .load()
      .pipe(takeUntilDestroyed(this._destroyRef))
      .subscribe();

    // Whenever the workspace DB swaps or cloud sync writes new data,
    // reload feature caches. skip(1) drops the initial signal emission;
    // the explicit load()s above already covered first-paint state.
    toObservable(this._workspace.dataToken)
      .pipe(
        skip(1),
        switchMap(() =>
          forkJoin([this._templatesActions.load(), this._interviewsActions.load()]),
        ),
        takeUntilDestroyed(this._destroyRef),
      )
      .subscribe();
  }

  protected _openCloud(): void {
    this._cloudDialogOpen.set(true);
  }

  protected _closeCloud(): void {
    this._cloudDialogOpen.set(false);
  }
}
