declare const __idBrand: unique symbol;

export type Branded<T, B extends string> = T & { readonly [__idBrand]: B };

export const newId = <B extends string>(): Branded<string, B> =>
  crypto.randomUUID() as Branded<string, B>;

export const asId = <B extends string>(value: string): Branded<string, B> =>
  value as Branded<string, B>;
