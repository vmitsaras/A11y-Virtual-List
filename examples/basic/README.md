# Basic A11y Virtual List Example

This example demonstrates a fixed-height virtual audit log with 4,000 generated rows, a visible range announcement, rendered DOM count, `scrollToIndex()`, and `destroy()`.

Build the package first:

```bash
npm run build
```

Then open `examples/basic/index.html` in a browser from the project root, or serve the repository with any local static server.

Keyboard checks to try:

- Tab to each list viewport and verify focus remains visible.
- In roving examples, use ArrowUp, ArrowDown, Home, End, PageUp, and PageDown to move the active item.
- Press Enter on roving rows and Space or Enter on the country picker to verify activation or selection announcements.
- Tab into row action buttons and confirm arrow keys are not intercepted by the virtual-list viewport.
- Use the destroy button in the audit log and confirm the rendered rows and status updates stop.

Pointer and touch checks to try:

- Click or tap a roving row and verify it becomes active and dispatches the same activation outcome as Enter or Space.
- Click or tap a country option and verify the listbox selects it and moves focus to the listbox viewport.
- Activate a native control nested inside a row and confirm the row itself is not also activated.
- At narrow widths, verify the page does not scroll horizontally and controls remain comfortably targetable.

Accessibility behavior to inspect:

- The visible status text announces the rendered range without updating on every scroll tick.
- The DOM contains only a window of rows, while rendered rows expose `aria-posinset` and `aria-setsize`.
- The country picker is the only listbox example; log and notification examples keep native list semantics.
- Focused rows remain mounted when the rendered window changes.
- Updated focused rows are rerendered by stable key and focus returns to the corresponding control when possible.
- Forced-colors and reduced-motion browser settings keep the component usable.

> Do not use `A11yVirtualList` for normal content pages. Virtualization removes off-screen content from the DOM and can break browser find-in-page, screen reader browse behavior, print output, and expected document semantics. Prefer pagination, server-side filtering, or “load more” unless virtualization is genuinely required.

Known limitations: find-in-page cannot search rows that are not rendered, print output only includes the current DOM window, and assistive technology behavior must be tested for the target list and browser combination.
