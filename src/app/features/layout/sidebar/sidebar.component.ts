import { ChangeDetectionStrategy, Component, inject, input, output } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { IconComponent } from '../../../shared/ui/icon';
import { ThemeStore } from '../../../shared/theme';
import {
  CloudCardComponent,
  CloudKindLabel,
  SyncStatusLabel,
} from './components/cloud-card/cloud-card.component';

@Component({
  selector: 'app-sidebar',
  imports: [RouterLink, RouterLinkActive, IconComponent, CloudCardComponent],
  templateUrl: './sidebar.component.html',
  styleUrl: './sidebar.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SidebarComponent {
  protected readonly _theme = inject(ThemeStore);

  readonly templatesCount = input<number>(0);
  readonly historyCount = input<number>(0);
  readonly cloudKind = input<CloudKindLabel>(null);
  readonly cloudFileVersion = input<number>(0);
  readonly cloudSyncStatus = input<SyncStatusLabel>('idle');

  readonly cloudSettings = output<void>();

  protected _toggleTheme(): void {
    this._theme.toggle();
  }

  protected _onCloudClick(): void {
    this.cloudSettings.emit();
  }
}
