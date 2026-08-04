import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  A11yVirtualList,
  createVirtualList,
  initVirtualListAll,
  type VirtualListInstance
} from "../src/index";

interface TestItem {
  id: string;
  label: string;
}

const createItems = (count: number): TestItem[] =>
  Array.from({ length: count }, (_, index) => ({
    id: `item-${index + 1}`,
    label: `Item ${index + 1}`
  }));

const setViewportHeight = (element: HTMLElement, height: number): void => {
  Object.defineProperty(element, "clientHeight", {
    configurable: true,
    value: height
  });

  element.getBoundingClientRect = () =>
    ({
      x: 0,
      y: 0,
      width: 640,
      height,
      top: 0,
      right: 640,
      bottom: height,
      left: 0,
      toJSON: () => ({})
    }) satisfies DOMRect;
};

const createMarkup = (): HTMLElement => {
  document.body.innerHTML = `
    <section
      class="a11y-virtual-list"
      data-a11y-virtual-list
      data-row-height="48"
      data-overscan="2"
      data-navigation="roving"
      data-restore-key="test-list"
      aria-labelledby="list-title"
    >
      <header class="a11y-virtual-list__header">
        <h2 id="list-title" class="a11y-virtual-list__title">Items</h2>
        <p
          class="a11y-virtual-list__status"
          data-a11y-virtual-list-status
          aria-live="polite"
          aria-atomic="true"
        ></p>
      </header>
      <div
        class="a11y-virtual-list__viewport"
        data-a11y-virtual-list-viewport
        tabindex="0"
        aria-label="Items"
      >
        <div class="a11y-virtual-list__spacer" data-a11y-virtual-list-spacer>
          <ol class="a11y-virtual-list__items" data-a11y-virtual-list-items></ol>
        </div>
      </div>
    </section>
  `;

  const root = document.querySelector("[data-a11y-virtual-list]");
  const viewport = document.querySelector("[data-a11y-virtual-list-viewport]");

  if (!(root instanceof HTMLElement) || !(viewport instanceof HTMLElement)) {
    throw new Error("Test markup failed to render.");
  }

  setViewportHeight(viewport, 240);

  return root;
};

const setup = (
  count = 100,
  options: Parameters<typeof createVirtualList<TestItem>>[1] = {}
): VirtualListInstance<TestItem> => {
  const root = createMarkup();

  return createVirtualList(root, {
    items: createItems(count),
    announceDebounce: 0,
    getKey: (item) => item.id,
    renderItem: (item, index, meta) => {
      const li = document.createElement("li");

      li.className = "a11y-virtual-list__item";
      li.dataset.a11yVirtualListItem = "";
      li.textContent = item.label;
      li.setAttribute("aria-posinset", String(meta.posInSet));
      li.setAttribute("aria-setsize", String(meta.setSize));

      return li;
    },
    ...options
  });
};

describe("A11yVirtualList", () => {
  beforeEach(() => {
    document.body.innerHTML = "";
    sessionStorage.clear();
    vi.restoreAllMocks();
  });

  it("exports the plugin-specific API", () => {
    expect(A11yVirtualList).toBeTypeOf("function");
    expect(createVirtualList).toBeTypeOf("function");
    expect(initVirtualListAll).toBeTypeOf("function");
  });

  it("initializes valid markup and renders a virtual window", () => {
    const root = createMarkup();
    const readyListener = vi.fn();
    const rangeListener = vi.fn();

    root.addEventListener("a11y-virtual-list:ready", readyListener);
    root.addEventListener("a11y-virtual-list:range-change", rangeListener);

    createVirtualList(root, {
      items: createItems(100),
      announceDebounce: 0,
      rowHeight: 48,
      overscan: 2
    });

    const rendered = root.querySelectorAll("[data-a11y-virtual-list-item]");
    const viewport = document.querySelector("[data-a11y-virtual-list-viewport]");
    const status = document.querySelector("[data-a11y-virtual-list-status]");

    expect(root.classList.contains("is-initialized")).toBe(true);
    expect(root.classList.contains("is-ready")).toBe(true);
    expect(viewport?.getAttribute("role")).toBe("group");
    expect(status?.getAttribute("role")).toBe("status");
    expect(rendered.length).toBeLessThan(100);
    expect(rendered.length).toBeGreaterThan(0);
    expect(readyListener).toHaveBeenCalledTimes(1);
    expect(rangeListener).toHaveBeenCalled();
  });

  it("reuses the same instance on duplicate initialization", () => {
    const root = createMarkup();
    const first = createVirtualList(root, { items: createItems(20) });
    const second = createVirtualList(root, { items: createItems(20) });

    expect(second).toBe(first);
  });

  it("initVirtualListAll initializes every matching root without auto-running on import", () => {
    const first = createMarkup();
    const second = first.cloneNode(true) as HTMLElement;

    second.setAttribute("aria-labelledby", "list-title-2");
    second.querySelector("#list-title")?.setAttribute("id", "list-title-2");
    document.body.append(second);

    const instances = initVirtualListAll<TestItem>({
      items: createItems(10),
      announceDebounce: 0
    });

    expect(instances).toHaveLength(2);
    expect(document.querySelectorAll(".is-initialized")).toHaveLength(2);
    expect(document.querySelectorAll("[data-a11y-virtual-list-item]").length).toBeGreaterThan(
      0
    );
  });

  it("destroys without throwing and removes state, rows, and listeners", () => {
    const instance = setup();
    const root = document.querySelector("[data-a11y-virtual-list]");
    const viewport = document.querySelector("[data-a11y-virtual-list-viewport]");
    const status = document.querySelector("[data-a11y-virtual-list-status]");

    if (
      !(root instanceof HTMLElement) ||
      !(viewport instanceof HTMLElement) ||
      !(status instanceof HTMLElement)
    ) {
      throw new Error("Missing markup.");
    }

    expect(() => instance.destroy()).not.toThrow();
    expect(root.classList.contains("is-initialized")).toBe(false);
    expect(root.querySelectorAll("[data-a11y-virtual-list-item]")).toHaveLength(0);
    expect(viewport.hasAttribute("role")).toBe(false);
    expect(status.hasAttribute("role")).toBe(false);

    const previousStatus = status.textContent;
    viewport.scrollTop = 960;
    viewport.dispatchEvent(new Event("scroll"));

    expect(status.textContent).toBe(previousStatus);
  });

  it("dispatches destroy and allows clean re-initialization after destroy", () => {
    const instance = setup(20);
    const root = document.querySelector("[data-a11y-virtual-list]");
    const destroyListener = vi.fn();

    if (!(root instanceof HTMLElement)) {
      throw new Error("Missing root.");
    }

    root.addEventListener("a11y-virtual-list:destroy", destroyListener);
    instance.destroy();

    const next = createVirtualList(root, {
      items: createItems(5),
      announceDebounce: 0
    });

    expect(destroyListener).toHaveBeenCalledTimes(1);
    expect(next).not.toBe(instance);
    expect(root.classList.contains("is-initialized")).toBe(true);
    expect(root.querySelectorAll("[data-a11y-virtual-list-item]").length).toBeGreaterThan(0);
  });

  it("keeps focus on the viewport when destroy removes a focused row control", () => {
    const instance = setup(10, {
      renderItem: (item) => {
        const li = document.createElement("li");
        const button = document.createElement("button");

        li.dataset.a11yVirtualListItem = "";
        button.type = "button";
        button.textContent = item.label;
        li.append(button);

        return li;
      }
    });
    const viewport = document.querySelector("[data-a11y-virtual-list-viewport]");
    const button = document.querySelector("[data-a11y-virtual-list-item] button");

    if (!(viewport instanceof HTMLElement) || !(button instanceof HTMLButtonElement)) {
      throw new Error("Missing focus targets.");
    }

    button.focus();
    instance.destroy();

    expect(document.activeElement).toBe(viewport);
    expect(viewport.hasAttribute("aria-activedescendant")).toBe(false);
  });

  it("updates status text and item position metadata", () => {
    setup(100);
    const root = document.querySelector("[data-a11y-virtual-list]");
    const status = document.querySelector("[data-a11y-virtual-list-status]");
    const firstItem = document.querySelector("[data-a11y-virtual-list-item]");

    expect(status?.textContent).toBe("Showing items 1–5 of 100");
    expect(firstItem?.getAttribute("aria-posinset")).toBe("1");
    expect(firstItem?.getAttribute("aria-setsize")).toBe("100");
    expect(root?.querySelectorAll("[data-a11y-virtual-list-item]").length).toBeLessThan(100);
  });

  it("replaces stale status text when initialized with an empty dataset", () => {
    const root = createMarkup();
    const status = root.querySelector("[data-a11y-virtual-list-status]");

    if (!(status instanceof HTMLElement)) {
      throw new Error("Missing status.");
    }

    status.textContent = "Loading items";

    createVirtualList(root, {
      items: [],
      announceDebounce: 0
    });

    expect(status.textContent).toBe("Showing 0 items");
    expect(root.querySelectorAll("[data-a11y-virtual-list-item]")).toHaveLength(0);
  });

  it("scrollToIndex changes scroll position and rendered range", () => {
    const instance = setup(100);
    const viewport = document.querySelector("[data-a11y-virtual-list-viewport]");

    if (!(viewport instanceof HTMLElement)) {
      throw new Error("Missing viewport.");
    }

    instance.scrollToIndex(20, "start");

    expect(viewport.scrollTop).toBe(960);
    expect(instance.getRenderedRange().startIndex).toBeLessThanOrEqual(20);
    expect(instance.getRenderedRange().endIndex).toBeGreaterThanOrEqual(20);
  });

  it("setActiveIndex updates active state and aria-activedescendant", () => {
    const instance = setup(100);
    const viewport = document.querySelector("[data-a11y-virtual-list-viewport]");

    if (!(viewport instanceof HTMLElement)) {
      throw new Error("Missing viewport.");
    }

    instance.setActiveIndex(4);

    const activeId = viewport.getAttribute("aria-activedescendant");
    const activeItem = activeId ? document.getElementById(activeId) : null;

    expect(instance.getActiveIndex()).toBe(4);
    expect(viewport.getAttribute("role")).toBe("group");
    expect(activeId).toBeTruthy();
    expect(activeItem).toBeInstanceOf(HTMLElement);
    expect(activeItem?.classList.contains("is-active")).toBe(true);
  });

  it("ArrowDown changes the active item in roving mode", () => {
    const instance = setup(100);
    const viewport = document.querySelector("[data-a11y-virtual-list-viewport]");

    if (!(viewport instanceof HTMLElement)) {
      throw new Error("Missing viewport.");
    }

    viewport.dispatchEvent(new KeyboardEvent("keydown", { key: "ArrowDown", bubbles: true }));

    expect(instance.getActiveIndex()).toBe(1);
  });

  it("does not hijack arrow keys from native controls inside rows", () => {
    const instance = setup(20, {
      renderItem: (item) => {
        const li = document.createElement("li");
        const button = document.createElement("button");

        li.className = "a11y-virtual-list__item";
        li.dataset.a11yVirtualListItem = "";
        button.type = "button";
        button.textContent = item.label;
        li.append(button);

        return li;
      }
    });
    const button = document.querySelector("[data-a11y-virtual-list-item] button");

    if (!(button instanceof HTMLButtonElement)) {
      throw new Error("Missing row button.");
    }

    const event = new KeyboardEvent("keydown", {
      key: "ArrowDown",
      bubbles: true,
      cancelable: true
    });

    button.dispatchEvent(event);

    expect(instance.getActiveIndex()).toBe(0);
    expect(event.defaultPrevented).toBe(false);
  });

  it("does not hijack arrow keys from custom interactive controls inside rows", () => {
    const instance = setup(20, {
      renderItem: (item) => {
        const li = document.createElement("li");
        const checkbox = document.createElement("div");

        li.className = "a11y-virtual-list__item";
        li.dataset.a11yVirtualListItem = "";
        checkbox.setAttribute("role", "checkbox");
        checkbox.setAttribute("aria-checked", "false");
        checkbox.tabIndex = 0;
        checkbox.textContent = item.label;
        li.append(checkbox);

        return li;
      }
    });
    const checkbox = document.querySelector("[role='checkbox']");

    if (!(checkbox instanceof HTMLElement)) {
      throw new Error("Missing custom checkbox.");
    }

    const event = new KeyboardEvent("keydown", {
      key: "ArrowDown",
      bubbles: true,
      cancelable: true
    });

    checkbox.dispatchEvent(event);

    expect(instance.getActiveIndex()).toBe(0);
    expect(event.defaultPrevented).toBe(false);
  });

  it("activates the current item with Enter in roving mode", () => {
    const root = createMarkup();
    const onActivate = vi.fn();
    const activateListener = vi.fn();

    root.addEventListener("a11y-virtual-list:item-activate", activateListener);

    createVirtualList(root, {
      items: createItems(10),
      announceDebounce: 0,
      navigation: "roving",
      onActivate
    });

    const viewport = document.querySelector("[data-a11y-virtual-list-viewport]");

    if (!(viewport instanceof HTMLElement)) {
      throw new Error("Missing viewport.");
    }

    viewport.dispatchEvent(new KeyboardEvent("keydown", { key: "Enter", bubbles: true }));

    const event = activateListener.mock.calls[0]?.[0] as
      | CustomEvent<{ index: number; key: string; instance: VirtualListInstance<TestItem> }>
      | undefined;

    expect(onActivate).toHaveBeenCalledWith(createItems(10)[0], 0);
    expect(activateListener).toHaveBeenCalledTimes(1);
    expect(event?.bubbles).toBe(true);
    expect(event?.detail.index).toBe(0);
    expect(event?.detail.key).toBe("0");
    expect(event?.detail.instance).toBeTruthy();
  });

  it("activates a roving item with a pointer click", () => {
    const onActivate = vi.fn();
    const instance = setup(10, { onActivate });
    const viewport = document.querySelector("[data-a11y-virtual-list-viewport]");
    const rows = document.querySelectorAll<HTMLElement>(
      "[data-a11y-virtual-list-item]"
    );

    if (!(viewport instanceof HTMLElement) || !rows[2]) {
      throw new Error("Missing rendered rows.");
    }

    rows[2].dispatchEvent(new MouseEvent("click", { bubbles: true }));

    expect(instance.getActiveIndex()).toBe(2);
    expect(onActivate).toHaveBeenCalledWith(createItems(10)[2], 2);
    expect(document.activeElement).toBe(viewport);
  });

  it("does not activate a row when a nested control is clicked", () => {
    const onActivate = vi.fn();

    setup(10, {
      onActivate,
      renderItem: (item) => {
        const li = document.createElement("li");
        const button = document.createElement("button");

        li.dataset.a11yVirtualListItem = "";
        button.type = "button";
        button.textContent = item.label;
        li.append(button);

        return li;
      }
    });

    const button = document.querySelector("[data-a11y-virtual-list-item] button");

    if (!(button instanceof HTMLButtonElement)) {
      throw new Error("Missing row button.");
    }

    button.click();

    expect(onActivate).not.toHaveBeenCalled();
  });

  it("updateItems clamps the active index", () => {
    const instance = setup(100);

    instance.setActiveIndex(80);
    instance.updateItems(createItems(3));

    expect(instance.getActiveIndex()).toBe(2);
  });

  it("updateOptions preserves the active index unless explicitly changed", () => {
    const instance = setup(100);

    instance.setActiveIndex(12);
    instance.updateOptions({ announceTotal: false });

    expect(instance.getActiveIndex()).toBe(12);

    instance.updateOptions({ activeIndex: 4 });

    expect(instance.getActiveIndex()).toBe(4);
  });

  it("dataset options are sanitized and JavaScript options take precedence", () => {
    const root = createMarkup();

    root.dataset.navigation = "listbox";
    root.dataset.overscan = "-10";
    root.dataset.restoreScroll = "maybe";

    const instance = createVirtualList(root, {
      items: createItems(30),
      announceDebounce: 0,
      navigation: "none"
    });
    const viewport = document.querySelector("[data-a11y-virtual-list-viewport]");

    if (!(viewport instanceof HTMLElement)) {
      throw new Error("Missing viewport.");
    }

    viewport.dispatchEvent(new KeyboardEvent("keydown", { key: "ArrowDown", bubbles: true }));

    expect(instance.getActiveIndex()).toBe(0);
    expect(viewport.getAttribute("role")).toBe("group");
    expect(viewport.hasAttribute("aria-activedescendant")).toBe(false);
    expect(instance.getRenderedRange().endIndex).toBeGreaterThan(0);
  });

  it("clearScrollPosition removes stored state", () => {
    const instance = setup(100);
    const storageKey = "a11y-virtual-list:test-list";

    instance.scrollToIndex(10);
    instance.saveScrollPosition();

    expect(sessionStorage.getItem(storageKey)).toBeTruthy();

    instance.clearScrollPosition();

    expect(sessionStorage.getItem(storageKey)).toBeNull();
  });

  it("ignores invalid stored state without dispatching an error", () => {
    const root = createMarkup();
    const errorListener = vi.fn();

    sessionStorage.setItem("a11y-virtual-list:test-list", JSON.stringify({ scrollTop: "bad" }));
    root.addEventListener("a11y-virtual-list:error", errorListener);

    const instance = createVirtualList(root, {
      items: createItems(20),
      announceDebounce: 0
    });

    expect(instance.getActiveIndex()).toBe(0);
    expect(errorListener).not.toHaveBeenCalled();
  });

  it("dispatches an error event when stored scroll state cannot be parsed", () => {
    const root = createMarkup();
    const errorListener = vi.fn();

    sessionStorage.setItem("a11y-virtual-list:test-list", "{");
    root.addEventListener("a11y-virtual-list:error", errorListener);

    const instance = createVirtualList(root, {
      items: createItems(20),
      announceDebounce: 0
    });

    const event = errorListener.mock.calls[0]?.[0] as
      | CustomEvent<{ error: unknown; instance: VirtualListInstance<TestItem> }>
      | undefined;

    expect(errorListener).toHaveBeenCalledTimes(1);
    expect(event?.detail.error).toBeInstanceOf(SyntaxError);
    expect(event?.detail.instance).toBe(instance);
  });

  it("keeps a focused row mounted when scrolling would otherwise remove it", () => {
    const instance = setup(100, {
      renderItem: (item) => {
        const li = document.createElement("li");
        const button = document.createElement("button");

        li.className = "a11y-virtual-list__item";
        li.dataset.a11yVirtualListItem = "";
        button.type = "button";
        button.textContent = item.label;
        li.append(button);

        return li;
      }
    });
    const firstButton = document.querySelector("[data-a11y-virtual-list-item] button");

    if (!(firstButton instanceof HTMLButtonElement)) {
      throw new Error("Missing row button.");
    }

    firstButton.focus();
    instance.scrollToIndex(50, "start");

    const focusedRow = firstButton.closest("[data-a11y-virtual-list-item]");

    expect(document.activeElement).toBe(firstButton);
    expect(focusedRow).toBeInstanceOf(HTMLElement);
    expect((focusedRow as HTMLElement).dataset.a11yVirtualListIndex).toBe("0");
    expect(instance.getRenderedRange().startIndex).toBe(0);
    expect(instance.getRenderedRange().endIndex).toBeGreaterThanOrEqual(50);
  });

  it("rerenders updated focused content and restores focus by stable item key", () => {
    const root = createMarkup();
    const initialItems = createItems(3);
    const instance = createVirtualList(root, {
      items: initialItems,
      announceDebounce: 0,
      getKey: (item) => item.id,
      renderItem: (item) => {
        const li = document.createElement("li");
        const button = document.createElement("button");

        li.dataset.a11yVirtualListItem = "";
        button.type = "button";
        button.textContent = item.label;
        li.append(button);

        return li;
      }
    });
    const secondButton = root.querySelectorAll<HTMLButtonElement>("button")[1];

    if (!secondButton) {
      throw new Error("Missing focused row button.");
    }

    secondButton.focus();
    instance.updateItems([
      { id: "item-2", label: "Updated item 2" },
      { id: "item-1", label: "Item 1" },
      { id: "item-3", label: "Item 3" }
    ]);

    const focusedElement = document.activeElement;
    const focusedRow = focusedElement?.closest("[data-a11y-virtual-list-item]");

    expect(focusedElement).toBeInstanceOf(HTMLButtonElement);
    expect(focusedElement?.textContent).toBe("Updated item 2");
    expect((focusedRow as HTMLElement | null)?.dataset.a11yVirtualListIndex).toBe("0");
    expect((focusedRow as HTMLElement | null)?.dataset.a11yVirtualListKey).toBe(
      "item-2"
    );
  });

  it("keeps the rendered window bounded when a focused item moves far away", () => {
    const root = createMarkup();
    const initialItems = createItems(1000);
    const instance = createVirtualList(root, {
      items: initialItems,
      announceDebounce: 0,
      getKey: (item) => item.id,
      renderItem: (item) => {
        const li = document.createElement("li");
        const button = document.createElement("button");

        li.dataset.a11yVirtualListItem = "";
        button.type = "button";
        button.textContent = item.label;
        li.append(button);

        return li;
      }
    });
    const firstButton = root.querySelector("button");

    if (!(firstButton instanceof HTMLButtonElement)) {
      throw new Error("Missing focused row button.");
    }

    firstButton.focus();
    instance.updateItems([
      ...initialItems.slice(1),
      { id: "item-1", label: "Updated item 1" }
    ]);

    const focusedElement = document.activeElement;
    const focusedRow = focusedElement?.closest("[data-a11y-virtual-list-item]");

    expect(focusedElement?.textContent).toBe("Updated item 1");
    expect((focusedRow as HTMLElement | null)?.dataset.a11yVirtualListIndex).toBe(
      "999"
    );
    expect(root.querySelectorAll("[data-a11y-virtual-list-item]").length).toBeLessThan(
      50
    );
  });

  it("moves focus to the viewport when a focused item is removed", () => {
    const root = createMarkup();
    const instance = createVirtualList(root, {
      items: createItems(1),
      announceDebounce: 0,
      getKey: (item) => item.id,
      renderItem: (item) => {
        const li = document.createElement("li");
        const button = document.createElement("button");

        li.dataset.a11yVirtualListItem = "";
        button.type = "button";
        button.textContent = item.label;
        li.append(button);

        return li;
      }
    });
    const viewport = root.querySelector("[data-a11y-virtual-list-viewport]");
    const button = root.querySelector("button");

    if (!(viewport instanceof HTMLElement) || !(button instanceof HTMLButtonElement)) {
      throw new Error("Missing focus targets.");
    }

    button.focus();
    instance.updateItems([]);

    expect(document.activeElement).toBe(viewport);
    expect(root.querySelectorAll("[data-a11y-virtual-list-item]")).toHaveLength(0);
  });

  it("renders a bounded window for large estimated-height lists", () => {
    const instance = setup(10000, {
      rowHeight: 40,
      rowHeightMode: "estimated",
      overscan: 1
    });
    const viewport = document.querySelector("[data-a11y-virtual-list-viewport]");

    if (!(viewport instanceof HTMLElement)) {
      throw new Error("Missing viewport.");
    }

    instance.scrollToIndex(9000, "start");

    const range = instance.getRenderedRange();

    expect(viewport.scrollTop).toBe(360000);
    expect(range.startIndex).toBeLessThanOrEqual(9000);
    expect(range.endIndex).toBeGreaterThanOrEqual(9000);
    expect(document.querySelectorAll("[data-a11y-virtual-list-item]").length).toBeLessThan(
      10000
    );
  });

  it("listbox mode selects with Space and dispatches a select event", () => {
    const root = createMarkup();
    const selectListener = vi.fn();

    root.addEventListener("a11y-virtual-list:select", selectListener);

    const instance = createVirtualList(root, {
      items: createItems(20),
      announceDebounce: 0,
      navigation: "listbox"
    });
    const viewport = document.querySelector("[data-a11y-virtual-list-viewport]");
    const items = document.querySelector("[data-a11y-virtual-list-items]");

    if (!(viewport instanceof HTMLElement) || !(items instanceof HTMLElement)) {
      throw new Error("Missing viewport.");
    }

    instance.setActiveIndex(2);
    viewport.dispatchEvent(new KeyboardEvent("keydown", { key: " ", bubbles: true }));

    const selected = document.querySelector("[aria-selected='true']");

    expect(viewport.getAttribute("role")).toBe("listbox");
    expect(viewport.getAttribute("aria-orientation")).toBe("vertical");
    expect(items.getAttribute("role")).toBe("presentation");
    expect(selected).toBeInstanceOf(HTMLElement);
    expect(selectListener).toHaveBeenCalledTimes(1);
  });

  it("listbox mode selects a clicked option and focuses the viewport", () => {
    const onSelect = vi.fn();
    const instance = setup(20, {
      navigation: "listbox",
      onSelect
    });
    const viewport = document.querySelector("[data-a11y-virtual-list-viewport]");
    const options = document.querySelectorAll<HTMLElement>("[role='option']");

    if (!(viewport instanceof HTMLElement) || !options[1]) {
      throw new Error("Missing listbox options.");
    }

    options[1].dispatchEvent(new MouseEvent("click", { bubbles: true }));

    const selectedOption = document.querySelector("[role='option'][aria-selected='true']");

    expect(instance.getActiveIndex()).toBe(1);
    expect(selectedOption?.textContent).toBe("Item 2");
    expect(onSelect).toHaveBeenCalledWith(createItems(20)[1], 1);
    expect(document.activeElement).toBe(viewport);
  });
});
