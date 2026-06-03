export type KRNResult<T, E extends Error = Error> =
  | {
      ok: true;
      value: T;
    }
  | {
      ok: false;
      error: E;
    };

export function ok<T>(value: T): KRNResult<T> {
  return { ok: true, value };
}

export function err<E extends Error>(error: E): KRNResult<never, E> {
  return { ok: false, error };
}
