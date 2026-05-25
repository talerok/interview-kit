import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { CategoryAverage } from '../../../../models/state/result.store';

interface Axis {
  readonly endX: number;
  readonly endY: number;
  readonly labelX: number;
  readonly labelY: number;
  readonly anchor: 'start' | 'middle' | 'end';
  readonly label: string;
}

interface GridPoly {
  readonly points: string;
  readonly outer: boolean;
}

interface DataPoint {
  readonly x: number;
  readonly y: number;
  readonly color: string;
}

interface LegendItem {
  readonly label: string;
  readonly color: string;
  readonly value: string;
}

const SIZE = 440;
const RADIUS = 130;
const LABEL_OFFSET = 14;
const LEVELS = 5;

@Component({
  selector: 'app-score-profile',
  templateUrl: './score-profile.component.html',
  styleUrl: './score-profile.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ScoreProfileComponent {
  readonly data = input.required<readonly CategoryAverage[]>();

  protected readonly _size = SIZE;
  protected readonly _viewBox = `0 0 ${SIZE} ${SIZE}`;
  protected readonly _cx = SIZE / 2;
  protected readonly _cy = SIZE / 2;
  protected readonly _r = RADIUS;

  protected readonly _grid = computed<readonly GridPoly[]>(() => {
    const n = Math.max(3, this.data().length);
    const result: GridPoly[] = [];
    for (let level = 1; level <= LEVELS; level++) {
      const rr = (this._r * level) / LEVELS;
      const pts: string[] = [];
      for (let i = 0; i < n; i++) {
        const a = -Math.PI / 2 + (i / n) * Math.PI * 2;
        pts.push(
          `${(this._cx + rr * Math.cos(a)).toFixed(1)},${(this._cy + rr * Math.sin(a)).toFixed(1)}`,
        );
      }
      result.push({ points: pts.join(' '), outer: level === LEVELS });
    }
    return result;
  });

  protected readonly _axes = computed<readonly Axis[]>(() => {
    const data = this.data();
    const n = Math.max(3, data.length);
    const result: Axis[] = [];
    for (let i = 0; i < n; i++) {
      const a = -Math.PI / 2 + (i / n) * Math.PI * 2;
      const endX = this._cx + this._r * Math.cos(a);
      const endY = this._cy + this._r * Math.sin(a);
      const labelX = this._cx + (this._r + LABEL_OFFSET) * Math.cos(a);
      const labelY = this._cy + (this._r + LABEL_OFFSET) * Math.sin(a);
      const cosA = Math.cos(a);
      const anchor: 'start' | 'middle' | 'end' =
        Math.abs(cosA) < 0.2 ? 'middle' : cosA > 0 ? 'start' : 'end';
      result.push({
        endX,
        endY,
        labelX,
        labelY,
        anchor,
        label: data[i]?.category.label ?? '',
      });
    }
    return result;
  });

  protected readonly _dataPoints = computed<readonly DataPoint[]>(() => {
    const data = this.data();
    const n = Math.max(3, data.length);
    const result: DataPoint[] = [];
    for (let i = 0; i < n; i++) {
      const a = -Math.PI / 2 + (i / n) * Math.PI * 2;
      const score = data[i]?.avg ?? 0;
      const rr = (this._r * score) / 5;
      result.push({
        x: this._cx + rr * Math.cos(a),
        y: this._cy + rr * Math.sin(a),
        color: data[i]?.category.color ?? 'var(--fg-faint)',
      });
    }
    return result;
  });

  protected readonly _polygon = computed(() =>
    this._dataPoints().map((p) => `${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' '),
  );

  protected readonly _legend = computed<readonly LegendItem[]>(() =>
    this.data().map((d) => ({
      label: d.category.label,
      color: d.category.color,
      value: d.count > 0 ? d.avg.toFixed(1) : '—',
    })),
  );
}
