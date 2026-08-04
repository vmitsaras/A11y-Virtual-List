export interface PluginDocs {
  slug: string;
  name: string;
  packageName: string;
  description: string;
  repo?: string;
  npm?: string;
  install: {
    npm: string;
    pnpm: string;
    yarn: string;
  };
  usage: string;
  selectors?: string[];
  keyboard?: Array<{
    key: string;
    description: string;
  }>;
  api: Array<{
    name: string;
    type: string;
    description: string;
  }>;
  examples?: Array<{
    name: string;
    description: string;
    path: string;
  }>;
  warnings?: string[];
}

const virtualizationWarning =
  "Do not use A11yVirtualList for normal content pages. Virtualization removes off-screen content from the DOM and can break browser find-in-page, screen reader browse behavior, print output, and expected document semantics. Prefer pagination, server-side filtering, or “load more” unless virtualization is genuinely required.";

export const docs = {
  slug: "a11y-virtual-list",
  name: "A11y Virtual List",
  packageName: "a11y-virtual-list",
  description:
    "Accessible TypeScript virtual list behavior for huge datasets with windowed rendering, keyboard-safe navigation, scroll restoration, and range announcements.",
  repo: "https://github.com/vmitsaras/A11y-Virtual-List",
  npm: "https://www.npmjs.com/package/a11y-virtual-list",
  install: {
    npm: "npm install a11y-virtual-list",
    pnpm: "pnpm add a11y-virtual-list",
    yarn: "yarn add a11y-virtual-list"
  },
  usage: `import { createVirtualList } from "a11y-virtual-list";
import "a11y-virtual-list/styles.css";

const root = document.querySelector("[data-a11y-virtual-list]");

if (root instanceof HTMLElement) {
  createVirtualList(root, {
    items,
    rowHeight: 48,
    renderItem(item, index, meta) {
      const li = document.createElement("li");
      li.className = "a11y-virtual-list__item";
      li.dataset.a11yVirtualListItem = "";
      li.textContent = String(item);
      li.setAttribute("aria-posinset", String(meta.posInSet));
      li.setAttribute("aria-setsize", String(meta.setSize));
      return li;
    }
  });
}`,
  selectors: [
    "[data-a11y-virtual-list]",
    "[data-a11y-virtual-list-viewport]",
    "[data-a11y-virtual-list-spacer]",
    "[data-a11y-virtual-list-items]",
    "[data-a11y-virtual-list-item]",
    "[data-a11y-virtual-list-status]"
  ],
  keyboard: [
    {
      key: "ArrowDown / ArrowUp",
      description: "Moves the active item in roving or listbox mode."
    },
    {
      key: "Home / End",
      description: "Moves to the first or last item in roving or listbox mode."
    },
    {
      key: "PageDown / PageUp",
      description: "Moves by the visible page size in roving or listbox mode."
    },
    {
      key: "Enter / Space",
      description:
        "Activates or selects the active item where configured; clicking or tapping a row provides the same outcome."
    },
    {
      key: "Tab / Shift+Tab",
      description: "Moves into and out of the component normally."
    },
    {
      key: "Native controls",
      description:
        "Keyboard events that start in buttons, links, inputs, textareas, selects, summaries, or editable content are left alone."
    }
  ],
  api: [
    {
      name: "createVirtualList(root, options)",
      type:
        "<TItem>(root: HTMLElement, options?: VirtualListOptions<TItem>) => VirtualListInstance<TItem>",
      description: "Initializes a virtual list instance."
    },
    {
      name: "initVirtualListAll(options)",
      type:
        "<TItem>(options?: VirtualListOptions<TItem>) => Array<VirtualListInstance<TItem>>",
      description: "Initializes all matching virtual list roots."
    },
    {
      name: "scrollToIndex(index, align)",
      type: "(index: number, align?: VirtualListScrollAlign) => void",
      description: "Scrolls a specific item into view."
    },
    {
      name: "updateItems(items, options)",
      type:
        "(items: TItem[], options?: Partial<VirtualListOptions<TItem>>) => void",
      description: "Updates the dataset and rerenders safely."
    },
    {
      name: "updateOptions(options)",
      type: "(options: Partial<VirtualListOptions<TItem>>) => void",
      description:
        "Updates runtime options and rerenders safely. The active item is preserved unless activeIndex is supplied."
    },
    {
      name: "getVisibleRange()",
      type: "() => VirtualListRange",
      description: "Returns the current visible range."
    },
    {
      name: "getRenderedRange()",
      type: "() => VirtualListRange",
      description: "Returns the overscanned DOM range currently rendered."
    },
    {
      name: "setActiveIndex(index, options)",
      type: "(index: number, options?: { scroll?: boolean }) => void",
      description:
        "Moves the active item and optionally scrolls it into the rendered window."
    },
    {
      name: "saveScrollPosition() / restoreScrollPosition() / clearScrollPosition()",
      type: "() => void",
      description:
        "Manages stored scroll position when restoreScroll, restoreKey, and storage are configured."
    },
    {
      name: "destroy()",
      type: "() => void",
      description: "Removes listeners, observers, timers, frames, and state."
    }
  ],
  examples: [
    {
      name: "Basic",
      description: "Fixed-height virtual list with range announcement.",
      path: "examples/basic"
    }
  ],
  warnings: [
    "The npm package and GitHub Pages demo are not released yet; their URLs are reserved release targets.",
    virtualizationWarning,
    "Virtualization is a performance escape hatch, not a content layout pattern.",
    "Find-in-page cannot search items that are not currently rendered.",
    "Screen reader browse behavior may be incomplete because off-screen items are not in the DOM.",
    "Prefer pagination, server-side filtering, or load-more patterns for normal documents."
  ]
} satisfies PluginDocs;
