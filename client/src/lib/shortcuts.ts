// Keyboard shortcuts: a single source of truth for both the global key handler
// and the "?" help overlay.
//
// Design notes:
//  - We never bind anything with ⌘/⌃/⌥ held, so we stay clear of the entire
//    macOS / Safari / browser shortcut surface.
//  - Navigation and creation use Gmail-style two-key sequences (`g h`, `c b`),
//    which coexist with VoiceOver quick-nav and are hard to trigger by accident.
//  - `e` and `l` are single keys, but only act on the relevant detail screen,
//    so their conflict surface is tiny.

/** Display-only description of the bindings, rendered by the help overlay. */
export type ShortcutItem = { keys: string[]; label: string };
export type ShortcutGroup = { title: string; items: ShortcutItem[] };

export const SHORTCUT_GROUPS: ShortcutGroup[] = [
  {
    title: 'Go to',
    items: [
      { keys: ['g', 'h'], label: 'Home' },
      { keys: ['g', 'p'], label: 'Parts' },
      { keys: ['g', 'b'], label: 'Bikes' },
      { keys: ['g', 's'], label: 'Search' },
      { keys: ['g', 'u'], label: 'Profile' }
    ]
  },
  {
    title: 'Create',
    items: [
      { keys: ['c', 'b'], label: 'New bike' },
      { keys: ['c', 'p'], label: 'New part' }
    ]
  },
  {
    title: 'On a detail screen',
    items: [
      { keys: ['e'], label: 'Edit the bike or part you’re viewing' },
      { keys: ['l'], label: 'Open this bike’s build checklist' }
    ]
  },
  {
    title: 'Help',
    items: [{ keys: ['?'], label: 'Show this shortcuts help' }]
  }
];

/**
 * True when a key event originates from an editable or interactive control, in
 * which case shortcuts must NOT fire. Covers native form fields, contenteditable,
 * and the Melt UI widgets (combobox/menu/listbox/dialog) that do their own
 * type-ahead key handling.
 */
export function isTypingTarget(target: EventTarget | null): boolean {
  const el = target as HTMLElement | null;
  if (!el || typeof el.tagName !== 'string') return false;
  const tag = el.tagName;
  if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return true;
  if (el.isContentEditable) return true;
  if (
    el.closest?.(
      'dialog, [contenteditable="true"], [role="combobox"], [role="menu"], [role="listbox"], [role="dialog"], [role="textbox"]'
    )
  ) {
    return true;
  }
  return false;
}

const GO_TO: Record<string, string> = {
  h: '/',
  p: '/parts',
  b: '/bikes',
  s: '/search',
  u: '/profile'
};

const CREATE: Record<string, string> = {
  b: '/bikes/new',
  p: '/parts/new'
};

const PREFIX_TIMEOUT_MS = 1000;

export type ShortcutContext = {
  goto: (url: string) => void;
  /** Current pathname, read fresh on each keypress. */
  getPath: () => string;
  openHelp: () => void;
};

/**
 * Build the global keydown handler. Holds the small pending-prefix state machine
 * for the `g` / `c` sequences. Returns a function suitable for `svelte:window`.
 */
export function createShortcutHandler(ctx: ShortcutContext) {
  let prefix: 'g' | 'c' | null = null;
  let timer: ReturnType<typeof setTimeout> | null = null;

  function clearPrefix() {
    prefix = null;
    if (timer) {
      clearTimeout(timer);
      timer = null;
    }
  }

  function detailId(path: string, collection: 'bikes' | 'parts'): string | null {
    const m = path.match(new RegExp(`^/${collection}/([^/]+)$`));
    if (!m || m[1] === 'new') return null;
    return m[1];
  }

  return function handleKeydown(event: KeyboardEvent) {
    // Ignore mid-IME-composition keystrokes.
    if (event.isComposing || event.keyCode === 229) return;
    // Stay clear of OS / browser shortcuts — only act on unmodified keys.
    if (event.metaKey || event.ctrlKey || event.altKey) return;
    // Never fire while the user is typing in a field or interacting with a widget.
    if (isTypingTarget(event.target)) return;

    const key = event.key;

    // Help overlay (Shift+/ on most layouts).
    if (key === '?') {
      event.preventDefault();
      clearPrefix();
      ctx.openHelp();
      return;
    }

    // Resolve a pending sequence.
    if (prefix === 'g') {
      const dest = GO_TO[key];
      clearPrefix();
      if (dest) {
        event.preventDefault();
        ctx.goto(dest);
      }
      return;
    }
    if (prefix === 'c') {
      const dest = CREATE[key];
      clearPrefix();
      if (dest) {
        event.preventDefault();
        ctx.goto(dest);
      }
      return;
    }

    // Start a new sequence.
    if (key === 'g' || key === 'c') {
      event.preventDefault();
      prefix = key;
      timer = setTimeout(clearPrefix, PREFIX_TIMEOUT_MS);
      return;
    }

    // Context-scoped single-key actions.
    const path = ctx.getPath();
    if (key === 'e') {
      const bikeId = detailId(path, 'bikes');
      if (bikeId) {
        event.preventDefault();
        ctx.goto(`/bikes/${bikeId}/edit`);
        return;
      }
      const partId = detailId(path, 'parts');
      if (partId) {
        event.preventDefault();
        ctx.goto(`/parts/${partId}/edit`);
        return;
      }
    }
    if (key === 'l') {
      const bikeId = detailId(path, 'bikes');
      if (bikeId) {
        event.preventDefault();
        ctx.goto(`/bikes/${bikeId}/checklist`);
        return;
      }
    }
  };
}
