/** Typed getElementById: checks the element really is a `type`, so callers never need a cast. */
export function byId<T extends HTMLElement>(id: string, type: { new (): T; prototype: T }): T {
  const el = document.getElementById(id);
  if (!(el instanceof type)) throw new Error(`#${id} is missing or not a ${type.name}`);
  return el;
}

export const $ = (id: string): HTMLElement => byId(id, HTMLElement);

export const $button = (id: string): HTMLButtonElement => byId(id, HTMLButtonElement);

/** Nearest ancestor (or self) of an event target matching `selector`. */
export function closest<T extends HTMLElement>(target: EventTarget | null, selector: string, type: { new (): T; prototype: T }): T | null {
  if (!(target instanceof Element)) return null;
  const el = target.closest(selector);
  return el instanceof type ? el : null;
}
