import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { CloudSyncService } from '../../../api/cloud';
import { AccountsStore } from '../../../core/account';
import { CloudActions } from '../../../features/cloud-settings/models/state/cloud.actions';
import { CloudStore } from '../../../features/cloud-settings/models/state/cloud.store';
import { CloudSettingsDialogComponent } from '../../../features/cloud-settings/components/cloud-settings-dialog/cloud-settings-dialog.component';
import { InterviewsStore } from '../../../features/interview/models/state/interviews.store';
import { TemplatesStore } from '../../../features/templates/models/state/templates.store';
import { SidebarComponent } from '../sidebar/sidebar.component';

@Component({
  selector: 'app-shell',
  imports: [RouterOutlet, SidebarComponent, CloudSettingsDialogComponent],
  templateUrl: './app-shell.component.html',
  styleUrl: './app-shell.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AppShellComponent {
  // Stores self-load via rxResource on first signal read; sidebar reads
  // count() below and triggers it. WorkspaceService also self-syncs on
  // bootstrap by observing AccountsStore.activeId. No explicit wiring needed.
  protected readonly _templates = inject(TemplatesStore);
  protected readonly _interviews = inject(InterviewsStore);
  protected readonly _cloud = inject(CloudStore);
  protected readonly _accounts = inject(AccountsStore);
  protected readonly _cloudActions = inject(CloudActions);
  protected readonly _cloudSync = inject(CloudSyncService);

  protected readonly _cloudDialogOpen = signal(false);

  protected _openCloud(): void {
    this._cloudDialogOpen.set(true);
  }

  protected _closeCloud(): void {
    this._cloudDialogOpen.set(false);
  }
}
