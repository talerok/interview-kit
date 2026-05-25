import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { IconComponent } from '../../../../../shared/ui/icon';

export type CloudKindLabel = 'dropbox' | null;
export type SyncStatusLabel = 'idle' | 'syncing' | 'error';

@Component({
  selector: 'app-cloud-card',
  imports: [IconComponent],
  templateUrl: './cloud-card.component.html',
  styleUrl: './cloud-card.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CloudCardComponent {
  readonly kind = input<CloudKindLabel>(null);
  readonly fileVersion = input<number>(0);
  readonly syncStatus = input<SyncStatusLabel>('idle');

  readonly open = output<void>();

  protected _activate(): void {
    this.open.emit();
  }
}
