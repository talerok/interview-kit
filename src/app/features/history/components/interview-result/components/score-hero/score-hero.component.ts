import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { ScoreBand, scoreBandLabel } from '../../../../../../shared/utils';

@Component({
  selector: 'app-score-hero',
  templateUrl: './score-hero.component.html',
  styleUrl: './score-hero.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ScoreHeroComponent {
  readonly avg = input.required<number>();
  readonly band = input.required<ScoreBand>();
  readonly distribution = input.required<readonly number[]>();
  readonly answered = input.required<number>();
  readonly skipped = input.required<number>();

  protected readonly _bandLabel = computed(() => scoreBandLabel(this.avg()));
  protected readonly _maxDist = computed(() => Math.max(1, ...this.distribution()));
  protected readonly _scoreSlots = [1, 2, 3, 4, 5] as const;
}
