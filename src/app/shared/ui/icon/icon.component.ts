import { ChangeDetectionStrategy, Component, computed, inject, input } from '@angular/core';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';
import { ICONS, IconName } from './icons.const';

@Component({
  selector: 'app-icon',
  templateUrl: './icon.component.html',
  styleUrl: './icon.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    role: 'img',
    'aria-hidden': 'true',
    '[attr.data-icon]': 'name()',
  },
})
export class IconComponent {
  private readonly _sanitizer = inject(DomSanitizer);

  readonly name = input.required<IconName>();

  protected readonly _svg = computed<SafeHtml>(() =>
    this._sanitizer.bypassSecurityTrustHtml(ICONS[this.name()]),
  );
}
