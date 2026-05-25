import { Injectable } from '@angular/core';
import { ListEntityStore } from '../../../../shared/state';
import { Template } from '../../interfaces/template';

@Injectable({ providedIn: 'root' })
export class TemplatesStore extends ListEntityStore<Template> {}
