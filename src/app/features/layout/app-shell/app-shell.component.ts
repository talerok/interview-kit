import { ChangeDetectionStrategy, Component, DestroyRef, OnInit, inject } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { RouterOutlet } from '@angular/router';
import { CloudSyncService } from '../../../api/cloud';
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
  protected readonly _cloudActions = inject(CloudActions);
  protected readonly _cloudSync = inject(CloudSyncService);
  private readonly _templatesActions = inject(TemplatesActions);
  private readonly _interviewsActions = inject(InterviewsActions);
  private readonly _destroyRef = inject(DestroyRef);

  ngOnInit(): void {
    this._templatesActions
      .load()
      .pipe(takeUntilDestroyed(this._destroyRef))
      .subscribe();
    this._interviewsActions
      .load()
      .pipe(takeUntilDestroyed(this._destroyRef))
      .subscribe();
    this._cloudActions
      .load()
      .pipe(takeUntilDestroyed(this._destroyRef))
      .subscribe();
  }

  protected _openCloud(): void {
    this._cloudActions.openDialog();
  }

  protected _closeCloud(): void {
    this._cloudActions.closeDialog();
  }
}
