# A11y Virtual List

Accessible TypeScript virtual list plugin for huge datasets.

`A11yVirtualList` renders only the visible window of very large lists while preserving keyboard-safe navigation, scroll restoration, range announcements, and predictable cleanup. It is TypeScript-first, framework-agnostic, ESM-only, and does not auto-initialize on import.

## Release Status

This repository is an initial-release candidate. The package has not been
published to npm, and the GitHub Pages demo has not been deployed. Their public
endpoints are therefore intentionally treated as **unreleased** until a
maintainer completes those separate release steps.

Until the first npm release, clone the repository and use the development setup
below. The installation commands in the next section describe the future
consumer workflow; they do not yet resolve to a published package.

> Do not use `A11yVirtualList` for normal content pages. Virtualization removes off-screen content from the DOM and can break browser find-in-page, screen reader browse behavior, print output, and expected document semantics. Prefer pagination, server-side filtering, or “load more” unless virtualization is genuinely required.

Virtualization is a performance escape hatch, not a content layout pattern. Use it only when the dataset is genuinely large, profiling shows a real rendering problem, pagination or filtering is not enough, and keyboard plus assistive technology behavior has been tested.

## Installation

After the initial npm release:

```bash
npm install a11y-virtual-list
pnpm add a11y-virtual-list
yarn add a11y-virtual-list
```

## Usage

```ts
import { createVirtualList } from "a11y-virtual-list";
import "a11y-virtual-list/styles.css";

interface LogEntry {
  id: string;
  level: "info" | "warning" | "error";
  message: string;
  timestamp: string;
}

const root = document.querySelector("[data-a11y-virtual-list]");

if (root instanceof HTMLElement) {
  createVirtualList<LogEntry>(root, {
    items: logs,
    rowHeight: 48,
    navigation: "roving",
    getKey: (item) => item.id,
    renderItem: (item, index, meta) => {
      const li = document.createElement("li");
      li.className = "a11y-virtual-list__item";
      li.dataset.a11yVirtualListItem = "";
      li.textContent = `${index + 1}. [${item.level}] ${item.message}`;
      li.setAttribute("aria-posinset", String(meta.posInSet));
      li.setAttribute("aria-setsize", String(meta.setSize));
      return li;
    }
  });
}
```

## CSS

Import the baseline styles when using the package:

```ts
import "a11y-virtual-list/styles.css";
```

The CSS provides the scroll viewport, virtual spacer, visible focus states, active and selected states, reduced motion handling, and forced-colors support. Public custom properties use the `--a11y-virtual-list-*` prefix.

Useful public custom properties:

- `--a11y-virtual-list-border`
- `--a11y-virtual-list-bg`
- `--a11y-virtual-list-text`
- `--a11y-virtual-list-focus`
- `--a11y-virtual-list-muted`
- `--a11y-virtual-list-accent`
- `--a11y-virtual-list-selected-bg`
- `--a11y-virtual-list-row-gap`
- `--a11y-virtual-list-viewport-height`

## HTML Structure

Start with semantic markup. Do not initialize an empty root.

```html
<section
  class="a11y-virtual-list"
  data-a11y-virtual-list
  data-row-height="48"
  data-overscan="6"
  data-navigation="roving"
  data-restore-key="audit-log-demo"
  aria-labelledby="audit-log-title"
>
  <header class="a11y-virtual-list__header">
    <h2 id="audit-log-title" class="a11y-virtual-list__title">Audit log</h2>
    <p id="audit-log-description" class="a11y-virtual-list__description">
      Use Arrow keys, Home, End, Page Up, and Page Down to move. Press Enter or
      Space, or click or tap a row, to activate it.
    </p>
    <p
      class="a11y-virtual-list__status"
      data-a11y-virtual-list-status
      aria-live="polite"
      aria-atomic="true"
    >
      Showing items 1–40 of 4,000
    </p>
  </header>

  <div
    class="a11y-virtual-list__viewport"
    data-a11y-virtual-list-viewport
    tabindex="0"
    aria-label="Audit log entries"
    aria-describedby="audit-log-description"
  >
    <div class="a11y-virtual-list__spacer" data-a11y-virtual-list-spacer>
      <ol class="a11y-virtual-list__items" data-a11y-virtual-list-items></ol>
    </div>
  </div>

  <noscript>
    <p>JavaScript is required for this virtualized demo. Use a paginated fallback view instead.</p>
  </noscript>
</section>
```

## Selectors And State Classes

Required data attributes:

- `data-a11y-virtual-list`
- `data-a11y-virtual-list-viewport`
- `data-a11y-virtual-list-spacer`
- `data-a11y-virtual-list-items`
- `data-a11y-virtual-list-item`

Optional status target:

- `data-a11y-virtual-list-status`

State classes added by the plugin:

- `is-initialized`
- `is-ready`
- `is-scrolling`
- `is-restoring`
- `is-keyboard-mode`
- `is-active`
- `is-focused`
- `is-selected`

## API

`createVirtualList(root, options)` initializes one root and returns a `VirtualListInstance`.

`initVirtualListAll(options)` initializes every `[data-a11y-virtual-list]` root in the current document. It does not run automatically on import.

`A11yVirtualList` is the plugin class. Repeated construction against the same root returns the existing instance through a `WeakMap`.

Instance methods:

- `init()`
- `destroy()`
- `updateItems(items, options)`
- `updateOptions(options)`
- `scrollToIndex(index, align)`
- `getVisibleRange()`
- `getRenderedRange()`
- `setActiveIndex(index, options)`
- `getActiveIndex()`
- `saveScrollPosition()`
- `restoreScrollPosition()`
- `clearScrollPosition()`

## Options

Important options include `items`, `totalCount`, `rowHeight`, `rowHeightMode`, `overscan`, `navigation`, `restoreScroll`, `restoreKey`, `storage`, `announceRange`, `activeIndex`, `preserveFocusedItem`, `selectionFollowsFocus`, `getKey`, `renderItem`, `onActivate`, and `onSelect`.

Dataset options are parsed safely from `data-row-height`, `data-row-height-mode`, `data-overscan`, `data-total-count`, `data-navigation`, `data-restore-scroll`, `data-restore-key`, `data-storage`, `data-announce-range`, `data-announce-total`, and `data-announce-debounce`.

Use `rowHeightMode: "fixed"` for uniform rows. Use `rowHeightMode: "estimated"` only when row heights vary and you can test the target dataset size; it measures rendered rows and estimates off-screen offsets.

JavaScript options override dataset options. Calling `updateOptions()` preserves the current active item unless `activeIndex` is explicitly supplied.

## Events

All lifecycle events bubble from the root and include `{ instance }` in `detail`. Range and item events include the relevant range or item metadata.

- `a11y-virtual-list:init`
- `a11y-virtual-list:ready`
- `a11y-virtual-list:range-change`
- `a11y-virtual-list:render`
- `a11y-virtual-list:item-active`
- `a11y-virtual-list:item-activate`
- `a11y-virtual-list:select`
- `a11y-virtual-list:scroll-save`
- `a11y-virtual-list:scroll-restore`
- `a11y-virtual-list:update`
- `a11y-virtual-list:error`
- `a11y-virtual-list:destroy`

## Accessibility Notes

Default mode uses native list markup and does not invent arrow-key behavior. Use this for logs, chat history, notification histories, and content with interactive controls.

`navigation: "roving"` keeps focus on the viewport and uses `aria-activedescendant` for non-interactive row navigation. Arrow keys, Home, End, PageUp, PageDown, Enter, and Space are supported.

In `roving` and `listbox` modes, clicking or tapping a row moves the active item and invokes the same activation or selection outcome as Enter or Space. Clicks from nested links, buttons, form controls, editable content, and recognized custom controls keep their own behavior and do not also activate the row.

Associate the viewport with its nearby interaction instructions using `aria-describedby`, as shown in the HTML structure example, so the keyboard and pointer model is available when users enter the component.

`navigation: "listbox"` is only for option-picking lists. It sets `role="listbox"`, `role="option"`, and `aria-selected`. Do not use listbox mode for logs, articles, chat history, or normal reading content.

Keyboard events that start inside native controls such as buttons, links, inputs, selects, textareas, summaries, and editable elements are ignored by the plugin so row content can keep its own expected keyboard behavior.

Rendered items receive `aria-posinset` and `aria-setsize` when the full list is not in the DOM. The visible status text uses polite live updates such as `Showing items 80–120 of 4,000`, debounced to avoid scroll spam.

Focus is not trapped. `Tab` and `Shift+Tab` leave the component normally, and the plugin avoids removing a row that currently contains focus while the rendered window changes.

When `updateItems()` rerenders a focused row, `getKey` is used to locate the same item after reordering and focus is restored to the corresponding control when possible. If the item no longer exists or no equivalent control is available, focus moves to the viewport instead of being lost.

An initialized empty list reports `Showing 0 items` through the configured status element.

The baseline CSS provides visible focus indicators for the viewport and item action controls, high-contrast adjustments for forced-colors mode, and reduced-motion fallbacks for animations or transitions added by consumers.

## Limitations

Virtualization removes off-screen DOM nodes. Browser find-in-page cannot search unloaded rows, print output may be incomplete, and screen reader browse behavior can be incomplete because the whole document is not present at once.

This package does not implement table or grid virtualization, masonry layouts, horizontal virtualization, infinite network loading, drag and drop, sticky grouped headers, or spreadsheet behavior.

## Examples

See [`examples/basic`](examples/basic) for a fixed-height virtual audit log demo with range announcements, rendered DOM counts, `scrollToIndex()`, and `destroy()`.

## Compatibility And Modules

- The package is ESM-only. Use `import`; a CommonJS `require()` export is not
  provided.
- JavaScript output targets ES2022 and expects modern browser DOM APIs. The
  package has zero runtime dependencies.
- Importing the module does not touch the DOM or auto-initialize a list.
  Constructing or initializing a list requires a browser-like document.
- Baseline styles are a separate public export and must be imported from
  `a11y-virtual-list/styles.css` when wanted.
- Browser and assistive-technology behavior varies. Test the actual content,
  interaction mode, browser, and assistive technology used by the product.

## Development

The locked development toolchain requires Node.js 22.18 or newer. Install the
exact dependency tree from `package-lock.json`:

```bash
npm ci
```

Run the individual release checks:

```bash
npm test
npm run typecheck
npm run build
npm run pack:check
npm run package:verify
```

`npm run build` regenerates both the ignored package output in `dist/` and the
committed Pages output in `docs/`. After a build, `git diff --exit-code -- docs`
must be clean. `npm run package:verify` creates a temporary tarball, installs it
into an isolated temporary project, checks the release-file allowlist, and
imports the package entry points. It does not publish anything.

Run all checks in sequence with `npm run verify`.

## Changesets

User-visible changes require a Changeset:

```bash
npm run changeset
```

Do not edit the version or release changelog entry by hand. Once the maintainer
chooses the release version, `npm run version-packages` applies queued release
notes and updates package metadata through Changesets.

## GitHub Pages

The unreleased demo site is prepared in the committed `docs/` folder. Regenerate it
after changing the package or examples:

```bash
npm run pages:build
```

This command rebuilds the npm package in `dist/`, then deterministically
recreates `docs/` with the example hub, every browser example, the runtime
JavaScript and CSS, and a `.nojekyll` marker. Do not edit generated files in
`docs/` by hand.

When the maintainer is ready to deploy it separately, configure the repository
once in **Settings → Pages → Build and deployment**:

- Source: **Deploy from a branch**
- Branch: **`main`**
- Folder: **`/docs`**

Commit the regenerated `docs/` folder whenever its source files change. The
reserved project-site endpoint is currently unreleased:
`https://vmitsaras.github.io/A11y-Virtual-List/`.

## Docs Metadata

```ts
import { docs } from "a11y-virtual-list/docs";
```

## Contributing And Security

See [CONTRIBUTING.md](CONTRIBUTING.md) for the local workflow and review
expectations. Report suspected vulnerabilities using the private-first process
in [SECURITY.md](SECURITY.md); do not publish exploit details in an issue.

## License

Licensed under the [MIT License](LICENSE).
