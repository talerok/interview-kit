import { CreateEffectOptions, effect, untracked } from '@angular/core';

/**
 * Like `effect()`, but tracks only the explicit `deps` and never the signals
 * read inside the body. Avoids "spooky action at a distance" where reading
 * a signal inside an effect accidentally adds it to the dep set.
 */

type ExplicitEffectValues<T> = {
  readonly [K in keyof T]: () => T[K];
};

type InputType = readonly unknown[];

export const explicitEffect = <T extends InputType>(
  deps: readonly [...ExplicitEffectValues<T>],
  fn: (deps: T) => void,
  options?: CreateEffectOptions,
) =>
  effect(() => {
    const depValues = deps.map((d) => d()) as unknown as T;
    untracked(() => fn(depValues));
  }, options);
