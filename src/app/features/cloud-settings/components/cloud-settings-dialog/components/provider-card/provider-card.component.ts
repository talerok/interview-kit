import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { IconComponent } from '../../../../../../shared/ui/icon';
import { CloudProviderState } from '../../../../interfaces/cloud';

@Component({
  selector: 'app-provider-card',
  imports: [IconComponent],
  templateUrl: './provider-card.component.html',
  styleUrl: './provider-card.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ProviderCardComponent {
  readonly state = input.required<CloudProviderState>();
  readonly isActive = input<boolean>(false);

  readonly connectRequested = output<void>();
  readonly disconnectRequested = output<void>();
  readonly activateRequested = output<void>();

  protected _connect(): void {
    this.connectRequested.emit();
  }

  protected _disconnect(): void {
    this.disconnectRequested.emit();
  }

  protected _activate(): void {
    this.activateRequested.emit();
  }
}
