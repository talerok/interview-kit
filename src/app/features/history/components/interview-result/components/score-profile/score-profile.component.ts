import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { CategoryAverage } from '../../../../models/state/result.store';

interface BarRow {
  readonly label: string;
  readonly color: string;
  readonly value: string;
  readonly percent: number;
  readonly hasScore: boolean;
}

const MAX_SCORE = 5;

@Component({
  selector: 'app-score-profile',
  templateUrl: './score-profile.component.html',
  styleUrl: './score-profile.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ScoreProfileComponent {
  readonly data = input.required<readonly CategoryAverage[]>();

  protected readonly _scale = [1, 2, 3, 4, 5] as const;

  protected readonly _rows = computed<readonly BarRow[]>(() =>
    this.data().map((d) => {
      const hasScore = d.count > 0;
      return {
        label: d.category.label,
        color: d.category.color,
        value: hasScore ? d.avg.toFixed(1) : '—',
        percent: hasScore ? (d.avg / MAX_SCORE) * 100 : 0,
        hasScore,
      };
    }),
  );
}
