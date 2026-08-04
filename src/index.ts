export type VirtualListRowHeightMode = "fixed" | "estimated";

export type VirtualListNavigationMode = "none" | "roving" | "listbox";

export type VirtualListOrientation = "vertical";

export type VirtualListStorageMode = "session" | "local" | "none";

export type VirtualListScrollAlign = "start" | "center" | "end" | "nearest";

export interface VirtualListItemMeta {
  index: number;
  key: string;
  isActive: boolean;
  isSelected: boolean;
  setSize: number;
  posInSet: number;
}

export interface VirtualListRange {
  startIndex: number;
  endIndex: number;
  visibleStartIndex: number;
  visibleEndIndex: number;
  totalCount: number;
}

export interface VirtualListStoredState {
  scrollTop: number;
  activeIndex: number;
  timestamp: number;
}

export interface VirtualListOptions<TItem = unknown> {
  items?: TItem[];
  totalCount?: number | null;

  rowHeight?: number;
  rowHeightMode?: VirtualListRowHeightMode;
  minRowHeight?: number;
  maxRowHeight?: number;

  overscan?: number;
  minOverscan?: number;
  maxOverscan?: number;

  navigation?: VirtualListNavigationMode;
  orientation?: VirtualListOrientation;

  restoreScroll?: boolean;
  restoreKey?: string;
  storage?: VirtualListStorageMode;

  announceRange?: boolean;
  announceTotal?: boolean;
  announceDebounce?: number;

  activeIndex?: number;
  preserveFocusedItem?: boolean;
  selectionFollowsFocus?: boolean;

  debug?: boolean;

  getKey?: (item: TItem, index: number) => string;
  renderItem?: (
    item: TItem,
    index: number,
    meta: VirtualListItemMeta
  ) => HTMLElement;
  onActivate?: (item: TItem, index: number) => void;
  onSelect?: (item: TItem, index: number) => void;
}

export interface VirtualListInstance<TItem = unknown> {
  init(): void;
  destroy(): void;

  updateItems(items: TItem[], options?: Partial<VirtualListOptions<TItem>>): void;
  updateOptions(options: Partial<VirtualListOptions<TItem>>): void;

  scrollToIndex(index: number, align?: VirtualListScrollAlign): void;

  getVisibleRange(): VirtualListRange;
  getRenderedRange(): VirtualListRange;

  setActiveIndex(index: number, options?: { scroll?: boolean }): void;
  getActiveIndex(): number;

  saveScrollPosition(): void;
  restoreScrollPosition(): void;
  clearScrollPosition(): void;
}

export interface VirtualListEventDetail<TItem = unknown> {
  instance: VirtualListInstance<TItem>;
}

export interface VirtualListRangeEventDetail<TItem = unknown>
  extends VirtualListEventDetail<TItem>,
    VirtualListRange {}

export interface VirtualListItemEventDetail<TItem = unknown>
  extends VirtualListEventDetail<TItem> {
  item: TItem;
  index: number;
  key: string;
}

export interface VirtualListErrorEventDetail<TItem = unknown>
  extends VirtualListEventDetail<TItem> {
  error: unknown;
}

type VirtualListCallbackOptions<TItem> = Pick<
  VirtualListOptions<TItem>,
  "getKey" | "renderItem" | "onActivate" | "onSelect"
>;

type NormalizedVirtualListOptions<TItem> = Required<
  Omit<VirtualListOptions<TItem>, keyof VirtualListCallbackOptions<TItem>>
> &
  VirtualListCallbackOptions<TItem>;

type RangeCalculation = {
  renderedRange: VirtualListRange;
  visibleRange: VirtualListRange;
  offsetY: number;
  totalSize: number;
};

type FocusedItemState = {
  key: string;
  index: number;
  descendantIndex: number;
  focusWasOnRow: boolean;
};

type PendingFocusRestore = FocusedItemState & {
  targetIndex: number;
};

const COMPONENT_NAME = "a11y-virtual-list";

const DEFAULT_OPTIONS = Object.freeze({
  items: [] as unknown[],
  totalCount: null as number | null,

  rowHeight: 48,
  rowHeightMode: "fixed" as VirtualListRowHeightMode,
  minRowHeight: 28,
  maxRowHeight: 240,

  overscan: 6,
  minOverscan: 2,
  maxOverscan: 30,

  navigation: "none" as VirtualListNavigationMode,
  orientation: "vertical" as VirtualListOrientation,

  restoreScroll: true,
  restoreKey: "",
  storage: "session" as VirtualListStorageMode,

  announceRange: true,
  announceTotal: true,
  announceDebounce: 180,

  activeIndex: 0,
  preserveFocusedItem: true,
  selectionFollowsFocus: false,

  debug: false
});

const SELECTORS = Object.freeze({
  root: "[data-a11y-virtual-list]",
  viewport: "[data-a11y-virtual-list-viewport]",
  spacer: "[data-a11y-virtual-list-spacer]",
  items: "[data-a11y-virtual-list-items]",
  item: "[data-a11y-virtual-list-item]",
  status: "[data-a11y-virtual-list-status]"
});

const CLASSES = Object.freeze({
  initialized: "is-initialized",
  ready: "is-ready",
  scrolling: "is-scrolling",
  restoring: "is-restoring",
  keyboardMode: "is-keyboard-mode",
  itemActive: "is-active",
  itemFocused: "is-focused",
  itemSelected: "is-selected"
});

const ATTRIBUTES = Object.freeze({
  activeDescendant: "aria-activedescendant",
  atomic: "aria-atomic",
  label: "aria-label",
  live: "aria-live",
  orientation: "aria-orientation",
  posInSet: "aria-posinset",
  role: "role",
  selected: "aria-selected",
  setSize: "aria-setsize",
  tabIndex: "tabindex"
});

const EVENTS = Object.freeze({
  init: `${COMPONENT_NAME}:init`,
  ready: `${COMPONENT_NAME}:ready`,
  rangeChange: `${COMPONENT_NAME}:range-change`,
  render: `${COMPONENT_NAME}:render`,
  itemActive: `${COMPONENT_NAME}:item-active`,
  itemActivate: `${COMPONENT_NAME}:item-activate`,
  select: `${COMPONENT_NAME}:select`,
  scrollSave: `${COMPONENT_NAME}:scroll-save`,
  scrollRestore: `${COMPONENT_NAME}:scroll-restore`,
  update: `${COMPONENT_NAME}:update`,
  error: `${COMPONENT_NAME}:error`,
  destroy: `${COMPONENT_NAME}:destroy`
});

const ROW_HEIGHT_MODES = ["fixed", "estimated"] as const;
const NAVIGATION_MODES = ["none", "roving", "listbox"] as const;
const ORIENTATIONS = ["vertical"] as const;
const STORAGE_MODES = ["session", "local", "none"] as const;
const SCROLL_ALIGNS = ["start", "center", "end", "nearest"] as const;

const INTERACTIVE_CONTROL_SELECTOR = [
  "a[href]",
  "button",
  "input",
  "select",
  "textarea",
  "summary",
  "label",
  "audio[controls]",
  "video[controls]",
  "[contenteditable]:not([contenteditable='false'])",
  "[tabindex]:not([tabindex='-1'])",
  "[role='button']",
  "[role='checkbox']",
  "[role='combobox']",
  "[role='link']",
  "[role='menuitem']",
  "[role='menuitemcheckbox']",
  "[role='menuitemradio']",
  "[role='radio']",
  "[role='slider']",
  "[role='spinbutton']",
  "[role='switch']",
  "[role='tab']",
  "[role='textbox']"
].join(", ");

let instanceCounter = 0;

function toSafeBoolean(
  value: boolean | string | undefined,
  fallback: boolean
): boolean {
  if (typeof value === "boolean") {
    return value;
  }

  if (typeof value !== "string") {
    return fallback;
  }

  const normalized = value.trim().toLowerCase();

  if (["true", "1", "yes", "on"].includes(normalized)) {
    return true;
  }

  if (["false", "0", "no", "off"].includes(normalized)) {
    return false;
  }

  return fallback;
}

function toSafeInteger(
  value: number | string | undefined,
  fallback: number,
  options: { min?: number; max?: number } = {}
): number {
  const parsed =
    typeof value === "number"
      ? value
      : typeof value === "string" && value.trim() !== ""
        ? Number(value)
        : Number.NaN;

  if (!Number.isFinite(parsed)) {
    return fallback;
  }

  return clampNumber(Math.round(parsed), options.min, options.max);
}

function toSafeString(value: string | undefined, fallback: string): string {
  if (typeof value !== "string") {
    return fallback;
  }

  const trimmed = value.trim();

  return trimmed === "" ? fallback : trimmed;
}

function toSafeEnum<TValue extends string>(
  value: unknown,
  allowed: readonly TValue[],
  fallback: TValue
): TValue {
  if (typeof value !== "string") {
    return fallback;
  }

  return (allowed as readonly string[]).includes(value) ? (value as TValue) : fallback;
}

function clampNumber(value: number, min = Number.NEGATIVE_INFINITY, max = Number.POSITIVE_INFINITY): number {
  return Math.min(Math.max(value, min), max);
}

function createEmptyRange(totalCount = 0): VirtualListRange {
  return {
    startIndex: 0,
    endIndex: -1,
    visibleStartIndex: 0,
    visibleEndIndex: -1,
    totalCount
  };
}

function isHTMLElement(value: unknown): value is HTMLElement {
  return typeof HTMLElement !== "undefined" && value instanceof HTMLElement;
}

function isElement(value: unknown): value is Element {
  return typeof Element !== "undefined" && value instanceof Element;
}

function isStoredState(value: unknown): value is VirtualListStoredState {
  if (typeof value !== "object" || value === null) {
    return false;
  }

  const state = value as Record<string, unknown>;

  return (
    typeof state.scrollTop === "number" &&
    Number.isFinite(state.scrollTop) &&
    typeof state.activeIndex === "number" &&
    Number.isFinite(state.activeIndex) &&
    typeof state.timestamp === "number" &&
    Number.isFinite(state.timestamp)
  );
}

function sanitizeDomId(value: string): string {
  const normalized = value.trim().replace(/[^a-zA-Z0-9_-]+/g, "-");

  return normalized === "" ? "item" : normalized;
}

function normalizeOptions<TItem>(
  options: Partial<VirtualListOptions<TItem>>
): NormalizedVirtualListOptions<TItem> {
  const rawOptions = options as Record<string, unknown>;
  const rawItems = rawOptions.items;
  const items = Array.isArray(rawItems) ? ([...rawItems] as TItem[]) : [];
  const minRowHeight = toSafeInteger(
    rawOptions.minRowHeight as number | string | undefined,
    DEFAULT_OPTIONS.minRowHeight,
    { min: 1 }
  );
  const maxRowHeight = Math.max(
    minRowHeight,
    toSafeInteger(
      rawOptions.maxRowHeight as number | string | undefined,
      DEFAULT_OPTIONS.maxRowHeight,
      { min: minRowHeight }
    )
  );
  const rowHeight = toSafeInteger(
    rawOptions.rowHeight as number | string | undefined,
    DEFAULT_OPTIONS.rowHeight,
    { min: minRowHeight, max: maxRowHeight }
  );
  const minOverscan = toSafeInteger(
    rawOptions.minOverscan as number | string | undefined,
    DEFAULT_OPTIONS.minOverscan,
    { min: 0 }
  );
  const maxOverscan = Math.max(
    minOverscan,
    toSafeInteger(
      rawOptions.maxOverscan as number | string | undefined,
      DEFAULT_OPTIONS.maxOverscan,
      { min: minOverscan }
    )
  );
  const rawTotalCount = rawOptions.totalCount;
  const totalCount =
    rawTotalCount === null ||
    rawTotalCount === undefined ||
    (typeof rawTotalCount === "string" && rawTotalCount.trim() === "")
      ? null
      : toSafeInteger(rawTotalCount as number | string | undefined, items.length, {
          min: 0
        });

  return {
    items,
    totalCount,
    rowHeight,
    rowHeightMode: toSafeEnum(
      rawOptions.rowHeightMode,
      ROW_HEIGHT_MODES,
      DEFAULT_OPTIONS.rowHeightMode
    ),
    minRowHeight,
    maxRowHeight,
    overscan: toSafeInteger(
      rawOptions.overscan as number | string | undefined,
      DEFAULT_OPTIONS.overscan,
      { min: minOverscan, max: maxOverscan }
    ),
    minOverscan,
    maxOverscan,
    navigation: toSafeEnum(
      rawOptions.navigation,
      NAVIGATION_MODES,
      DEFAULT_OPTIONS.navigation
    ),
    orientation: toSafeEnum(
      rawOptions.orientation,
      ORIENTATIONS,
      DEFAULT_OPTIONS.orientation
    ),
    restoreScroll: toSafeBoolean(
      rawOptions.restoreScroll as boolean | string | undefined,
      DEFAULT_OPTIONS.restoreScroll
    ),
    restoreKey: toSafeString(
      rawOptions.restoreKey as string | undefined,
      DEFAULT_OPTIONS.restoreKey
    ),
    storage: toSafeEnum(rawOptions.storage, STORAGE_MODES, DEFAULT_OPTIONS.storage),
    announceRange: toSafeBoolean(
      rawOptions.announceRange as boolean | string | undefined,
      DEFAULT_OPTIONS.announceRange
    ),
    announceTotal: toSafeBoolean(
      rawOptions.announceTotal as boolean | string | undefined,
      DEFAULT_OPTIONS.announceTotal
    ),
    announceDebounce: toSafeInteger(
      rawOptions.announceDebounce as number | string | undefined,
      DEFAULT_OPTIONS.announceDebounce,
      { min: 0, max: 5000 }
    ),
    activeIndex: toSafeInteger(
      rawOptions.activeIndex as number | string | undefined,
      DEFAULT_OPTIONS.activeIndex,
      { min: 0 }
    ),
    preserveFocusedItem: toSafeBoolean(
      rawOptions.preserveFocusedItem as boolean | string | undefined,
      DEFAULT_OPTIONS.preserveFocusedItem
    ),
    selectionFollowsFocus: toSafeBoolean(
      rawOptions.selectionFollowsFocus as boolean | string | undefined,
      DEFAULT_OPTIONS.selectionFollowsFocus
    ),
    debug: toSafeBoolean(
      rawOptions.debug as boolean | string | undefined,
      DEFAULT_OPTIONS.debug
    ),
    getKey: typeof options.getKey === "function" ? options.getKey : undefined,
    renderItem: typeof options.renderItem === "function" ? options.renderItem : undefined,
    onActivate: typeof options.onActivate === "function" ? options.onActivate : undefined,
    onSelect: typeof options.onSelect === "function" ? options.onSelect : undefined
  };
}

export class A11yVirtualList<TItem = unknown>
  implements VirtualListInstance<TItem>
{
  private static readonly instances = new WeakMap<
    HTMLElement,
    A11yVirtualList<unknown>
  >();

  private readonly root!: HTMLElement;
  private readonly viewport!: HTMLElement;
  private readonly spacer!: HTMLElement;
  private readonly itemsContainer!: HTMLElement;
  private readonly status!: HTMLElement | null;
  private readonly managedAttributes = new Map<
    HTMLElement,
    Map<string, string | null>
  >();
  private readonly numberFormatter = new Intl.NumberFormat();

  private options!: NormalizedVirtualListOptions<TItem>;
  private items: TItem[] = [];
  private activeIndex = 0;
  private selectedIndex = -1;
  private isInitialized = false;

  private frameId = 0;
  private measurementFrameId = 0;
  private announceTimerId = 0;
  private scrollSaveTimerId = 0;

  private visibleRange!: VirtualListRange;
  private renderedRange!: VirtualListRange;

  private resizeObserver: ResizeObserver | null = null;
  private itemResizeObserver: ResizeObserver | null = null;

  private measuredHeights = new Map<number, number>();
  private averageMeasuredHeight = 0;
  private pendingFocusRestore: PendingFocusRestore | null = null;

  private readonly idPrefix!: string;

  private readonly handleScroll!: EventListener;
  private readonly handleClick!: EventListener;
  private readonly handleKeyDown!: EventListener;
  private readonly handleResize!: EventListener;

  constructor(root: HTMLElement, options: VirtualListOptions<TItem> = {}) {
    if (!isHTMLElement(root)) {
      throw new TypeError(`${COMPONENT_NAME}: root must be an HTMLElement.`);
    }

    const existing = A11yVirtualList.instances.get(root);

    if (existing) {
      return existing as A11yVirtualList<TItem>;
    }

    this.root = root;
    this.viewport = this.queryRequiredElement(root, SELECTORS.viewport);
    this.spacer = this.queryRequiredElement(root, SELECTORS.spacer);
    this.itemsContainer = this.queryRequiredElement(root, SELECTORS.items);
    this.status = this.queryOptionalElement(root, SELECTORS.status);

    const datasetOptions = A11yVirtualList.optionsFromDataset(
      root
    ) as Partial<VirtualListOptions<TItem>>;

    this.options = normalizeOptions<TItem>({
      ...datasetOptions,
      ...options
    });
    this.items = [...this.options.items];
    this.activeIndex = this.clampIndex(this.options.activeIndex);
    this.selectedIndex = this.options.selectionFollowsFocus ? this.activeIndex : -1;
    this.visibleRange = createEmptyRange(this.getTotalCount());
    this.renderedRange = createEmptyRange(this.getTotalCount());
    this.idPrefix = `${COMPONENT_NAME}-${++instanceCounter}`;

    this.handleScroll = this.onScroll.bind(this) as EventListener;
    this.handleClick = this.onClick.bind(this) as EventListener;
    this.handleKeyDown = this.onKeyDown.bind(this) as EventListener;
    this.handleResize = this.onResize.bind(this) as EventListener;

    A11yVirtualList.instances.set(root, this as A11yVirtualList<unknown>);
    this.init();
  }

  public init(): void {
    if (this.isInitialized) {
      return;
    }

    this.isInitialized = true;
    this.root.classList.add(CLASSES.initialized);
    this.setManagedAttribute(this.viewport, ATTRIBUTES.tabIndex, "0");
    this.applyContainerSemantics();
    this.prepareStatus();

    this.viewport.addEventListener("scroll", this.handleScroll, {
      passive: true
    });
    this.viewport.addEventListener("click", this.handleClick);
    this.viewport.addEventListener("keydown", this.handleKeyDown);
    this.getWindow().addEventListener("resize", this.handleResize);

    if (typeof ResizeObserver !== "undefined") {
      this.resizeObserver = new ResizeObserver(() => this.scheduleRender());
      this.resizeObserver.observe(this.viewport);
    }

    this.dispatch(EVENTS.init, { instance: this });
    this.renderNow();
    this.clearTimer("announce");
    this.updateStatus();

    if (this.options.restoreScroll) {
      this.restoreScrollPosition();
    }

    this.root.classList.add(CLASSES.ready);
    this.dispatch(EVENTS.ready, { instance: this });
  }

  public destroy(): void {
    if (!this.isInitialized) {
      return;
    }

    this.dispatch(EVENTS.destroy, { instance: this });
    this.viewport.removeEventListener("scroll", this.handleScroll);
    this.viewport.removeEventListener("click", this.handleClick);
    this.viewport.removeEventListener("keydown", this.handleKeyDown);
    this.getWindow().removeEventListener("resize", this.handleResize);
    this.cancelScheduledFrame();
    this.cancelScheduledMeasurementFrame();
    this.clearTimer("announce");
    this.clearTimer("scrollSave");
    this.resizeObserver?.disconnect();
    this.itemResizeObserver?.disconnect();
    this.resizeObserver = null;
    this.itemResizeObserver = null;
    this.measuredHeights.clear();
    this.averageMeasuredHeight = 0;

    if (this.itemsContainer.contains(this.root.ownerDocument.activeElement)) {
      this.viewport.focus({ preventScroll: true });
    }

    this.pendingFocusRestore = null;
    this.itemsContainer.replaceChildren();
    this.spacer.style.removeProperty("--_total-size");
    this.itemsContainer.style.removeProperty("--_offset");
    this.root.classList.remove(
      CLASSES.initialized,
      CLASSES.ready,
      CLASSES.scrolling,
      CLASSES.restoring,
      CLASSES.keyboardMode
    );
    this.restoreManagedAttributes();
    this.visibleRange = createEmptyRange(this.getTotalCount());
    this.renderedRange = createEmptyRange(this.getTotalCount());
    this.isInitialized = false;
    A11yVirtualList.instances.delete(this.root);
  }

  public updateItems(
    items: TItem[],
    options: Partial<VirtualListOptions<TItem>> = {}
  ): void {
    const focusedItemState = this.captureFocusedItemState();

    this.items = [...items];
    this.options = normalizeOptions<TItem>({
      ...this.options,
      ...options,
      items: this.items
    });
    this.activeIndex = this.clampIndex(this.activeIndex);
    this.selectedIndex =
      this.selectedIndex >= 0 ? this.clampIndex(this.selectedIndex) : -1;
    this.pendingFocusRestore = this.prepareFocusRestore(focusedItemState);
    this.measuredHeights.clear();
    this.averageMeasuredHeight = 0;

    if (this.pendingFocusRestore && this.pendingFocusRestore.targetIndex >= 0) {
      this.ensureIndexVisible(this.pendingFocusRestore.targetIndex);
    } else {
      this.renderNow();
    }

    this.dispatch(EVENTS.update, { instance: this });
  }

  public updateOptions(options: Partial<VirtualListOptions<TItem>>): void {
    const previousActiveIndex = this.activeIndex;
    const shouldRefreshFocusedItem =
      Object.prototype.hasOwnProperty.call(options, "renderItem") ||
      Object.prototype.hasOwnProperty.call(options, "getKey");
    const focusedItemState = shouldRefreshFocusedItem
      ? this.captureFocusedItemState()
      : null;
    const hasActiveIndexOption = Object.prototype.hasOwnProperty.call(
      options,
      "activeIndex"
    );

    this.options = normalizeOptions<TItem>({
      ...this.options,
      ...options,
      items: this.items
    });
    this.activeIndex = this.clampIndex(
      hasActiveIndexOption ? this.options.activeIndex : previousActiveIndex
    );
    this.selectedIndex =
      this.selectedIndex >= 0 ? this.clampIndex(this.selectedIndex) : -1;

    if (this.options.selectionFollowsFocus) {
      this.selectedIndex = this.activeIndex;
    }

    this.pendingFocusRestore = this.prepareFocusRestore(focusedItemState);

    this.applyContainerSemantics();

    if (this.pendingFocusRestore && this.pendingFocusRestore.targetIndex >= 0) {
      this.ensureIndexVisible(this.pendingFocusRestore.targetIndex);
    } else if (hasActiveIndexOption) {
      this.ensureIndexVisible(this.activeIndex);
    } else {
      this.renderNow();
    }

    this.dispatch(EVENTS.update, { instance: this });
  }

  public scrollToIndex(index: number, align: VirtualListScrollAlign = "nearest"): void {
    const totalCount = this.getTotalCount();

    if (totalCount <= 0) {
      this.viewport.scrollTop = 0;
      this.renderNow();
      return;
    }

    const safeAlign = toSafeEnum(align, SCROLL_ALIGNS, "nearest");
    const targetIndex = clampNumber(Math.round(index), 0, totalCount - 1);
    const viewportHeight = this.getViewportHeight();
    const itemOffset = this.getItemOffset(targetIndex);
    const itemHeight = this.getItemSize(targetIndex);
    const currentTop = this.viewport.scrollTop;
    const currentBottom = currentTop + viewportHeight;
    let nextScrollTop = itemOffset;

    if (safeAlign === "center") {
      nextScrollTop = itemOffset - (viewportHeight - itemHeight) / 2;
    } else if (safeAlign === "end") {
      nextScrollTop = itemOffset - viewportHeight + itemHeight;
    } else if (safeAlign === "nearest") {
      if (itemOffset >= currentTop && itemOffset + itemHeight <= currentBottom) {
        this.renderNow();
        return;
      }

      nextScrollTop =
        itemOffset < currentTop ? itemOffset : itemOffset - viewportHeight + itemHeight;
    }

    this.viewport.scrollTop = clampNumber(
      Math.round(nextScrollTop),
      0,
      Math.max(0, this.getTotalSize() - viewportHeight)
    );
    this.renderNow();
  }

  public getVisibleRange(): VirtualListRange {
    return { ...this.visibleRange };
  }

  public getRenderedRange(): VirtualListRange {
    return { ...this.renderedRange };
  }

  public setActiveIndex(index: number, options: { scroll?: boolean } = {}): void {
    const totalCount = this.getTotalCount();

    if (totalCount <= 0) {
      this.activeIndex = 0;
      this.updateActiveDescendant();
      return;
    }

    const nextIndex = this.clampIndex(index);
    const changed = nextIndex !== this.activeIndex;
    this.activeIndex = nextIndex;

    if (this.options.selectionFollowsFocus) {
      this.selectedIndex = nextIndex;
    }

    if (options.scroll !== false) {
      this.ensureIndexVisible(nextIndex);
    } else {
      this.renderNow();
    }

    this.updateActiveDescendant();

    if (changed) {
      this.dispatchItemEvent(EVENTS.itemActive, nextIndex);
    }
  }

  public getActiveIndex(): number {
    return this.activeIndex;
  }

  public saveScrollPosition(): void {
    const storage = this.getStorage();
    const storageKey = this.getStorageKey();

    if (!storage || !storageKey) {
      return;
    }

    const state: VirtualListStoredState = {
      scrollTop: this.viewport.scrollTop,
      activeIndex: this.activeIndex,
      timestamp: Date.now()
    };

    try {
      storage.setItem(storageKey, JSON.stringify(state));
      this.dispatch(EVENTS.scrollSave, { instance: this });
    } catch (error) {
      this.dispatch(EVENTS.error, { instance: this, error });
    }
  }

  public restoreScrollPosition(): void {
    const storage = this.getStorage();
    const storageKey = this.getStorageKey();

    if (!storage || !storageKey) {
      return;
    }

    try {
      const rawState = storage.getItem(storageKey);

      if (!rawState) {
        return;
      }

      const parsedState: unknown = JSON.parse(rawState);

      if (!isStoredState(parsedState)) {
        return;
      }

      this.root.classList.add(CLASSES.restoring);
      this.activeIndex = this.clampIndex(parsedState.activeIndex);
      this.viewport.scrollTop = clampNumber(
        parsedState.scrollTop,
        0,
        Math.max(0, this.getTotalSize() - this.getViewportHeight())
      );
      this.renderNow();
      this.root.classList.remove(CLASSES.restoring);
      this.dispatch(EVENTS.scrollRestore, { instance: this });
    } catch (error) {
      this.root.classList.remove(CLASSES.restoring);
      this.dispatch(EVENTS.error, { instance: this, error });
    }
  }

  public clearScrollPosition(): void {
    const storage = this.getStorage();
    const storageKey = this.getStorageKey();

    if (!storage || !storageKey) {
      return;
    }

    try {
      storage.removeItem(storageKey);
    } catch (error) {
      this.dispatch(EVENTS.error, { instance: this, error });
    }
  }

  private static optionsFromDataset(
    root: HTMLElement
  ): Partial<VirtualListOptions<unknown>> {
    const datasetOptions: Record<string, unknown> = {
      rowHeight: root.dataset.rowHeight,
      rowHeightMode: root.dataset.rowHeightMode,
      overscan: root.dataset.overscan,
      totalCount: root.dataset.totalCount,
      navigation: root.dataset.navigation,
      restoreScroll: root.dataset.restoreScroll,
      restoreKey: root.dataset.restoreKey,
      storage: root.dataset.storage,
      announceRange: root.dataset.announceRange,
      announceTotal: root.dataset.announceTotal,
      announceDebounce: root.dataset.announceDebounce
    };

    return datasetOptions as Partial<VirtualListOptions<unknown>>;
  }

  private queryRequiredElement(root: HTMLElement, selector: string): HTMLElement {
    const element = root.querySelector(selector);

    if (!isHTMLElement(element)) {
      throw new Error(`${COMPONENT_NAME}: missing required child ${selector}.`);
    }

    return element;
  }

  private queryOptionalElement(root: HTMLElement, selector: string): HTMLElement | null {
    const element = root.querySelector(selector);

    return isHTMLElement(element) ? element : null;
  }

  private getWindow(): Window {
    const ownerWindow = this.root.ownerDocument.defaultView;

    if (ownerWindow) {
      return ownerWindow;
    }

    if (typeof window !== "undefined") {
      return window;
    }

    throw new Error(`${COMPONENT_NAME}: root must belong to a windowed document.`);
  }

  private dispatch<TDetail extends object>(type: string, detail: TDetail): void {
    const win = this.getWindow();
    const CustomEventConstructor = (win as Window & typeof globalThis).CustomEvent;

    this.root.dispatchEvent(
      new CustomEventConstructor<TDetail>(type, {
        bubbles: true,
        detail
      })
    );
  }

  private dispatchItemEvent(type: string, index: number): void {
    const item = this.items[index] as TItem;
    const key = this.getItemKey(item, index);

    this.dispatch<VirtualListItemEventDetail<TItem>>(type, {
      instance: this,
      item,
      index,
      key
    });
  }

  private rememberAttribute(element: HTMLElement, attribute: string): void {
    let attributes = this.managedAttributes.get(element);

    if (!attributes) {
      attributes = new Map<string, string | null>();
      this.managedAttributes.set(element, attributes);
    }

    if (!attributes.has(attribute)) {
      attributes.set(attribute, element.getAttribute(attribute));
    }
  }

  private setManagedAttribute(
    element: HTMLElement,
    attribute: string,
    value: string | null
  ): void {
    this.rememberAttribute(element, attribute);

    if (value === null) {
      element.removeAttribute(attribute);
      return;
    }

    element.setAttribute(attribute, value);
  }

  private restoreManagedAttribute(element: HTMLElement, attribute: string): void {
    const attributes = this.managedAttributes.get(element);

    if (!attributes || !attributes.has(attribute)) {
      return;
    }

    const originalValue = attributes.get(attribute);

    if (originalValue === null || originalValue === undefined) {
      element.removeAttribute(attribute);
    } else {
      element.setAttribute(attribute, originalValue);
    }

    attributes.delete(attribute);
  }

  private restoreManagedAttributes(): void {
    this.managedAttributes.forEach((attributes, element) => {
      attributes.forEach((originalValue, attribute) => {
        if (originalValue === null) {
          element.removeAttribute(attribute);
        } else {
          element.setAttribute(attribute, originalValue);
        }
      });
    });
    this.managedAttributes.clear();
  }

  private applyContainerSemantics(): void {
    this.restoreManagedAttribute(this.viewport, ATTRIBUTES.orientation);

    if (this.options.navigation === "listbox") {
      const label =
        this.viewport.getAttribute(ATTRIBUTES.label) ??
        this.itemsContainer.getAttribute(ATTRIBUTES.label) ??
        "Virtual list options";

      this.setManagedAttribute(this.viewport, ATTRIBUTES.role, "listbox");
      this.setManagedAttribute(this.viewport, ATTRIBUTES.label, label);
      this.setManagedAttribute(
        this.viewport,
        ATTRIBUTES.orientation,
        this.options.orientation
      );
      this.setManagedAttribute(this.itemsContainer, ATTRIBUTES.role, "presentation");
      this.restoreManagedAttribute(this.itemsContainer, ATTRIBUTES.label);
      this.root.classList.add(CLASSES.keyboardMode);
      return;
    }

    this.restoreManagedAttribute(this.itemsContainer, ATTRIBUTES.role);
    this.restoreManagedAttribute(this.itemsContainer, ATTRIBUTES.label);
    this.restoreManagedAttribute(this.viewport, ATTRIBUTES.label);
    this.setManagedAttribute(this.viewport, ATTRIBUTES.role, "group");

    if (this.options.navigation === "roving") {
      this.root.classList.add(CLASSES.keyboardMode);
    } else {
      this.root.classList.remove(CLASSES.keyboardMode);
      this.restoreManagedAttribute(this.viewport, ATTRIBUTES.activeDescendant);
    }
  }

  private prepareStatus(): void {
    if (!this.status) {
      return;
    }

    this.setManagedAttribute(this.status, ATTRIBUTES.role, "status");
    this.setManagedAttribute(this.status, ATTRIBUTES.live, "polite");
    this.setManagedAttribute(this.status, ATTRIBUTES.atomic, "true");
  }

  private onScroll(): void {
    if (!this.isInitialized) {
      return;
    }

    this.root.classList.add(CLASSES.scrolling);
    this.scheduleRender();
    this.scheduleScrollSave();
  }

  private onResize(): void {
    if (!this.isInitialized) {
      return;
    }

    this.scheduleRender();
  }

  private onClick(event: MouseEvent): void {
    if (this.options.navigation === "none" || this.getTotalCount() <= 0) {
      return;
    }

    const target = event.target;

    if (!isElement(target)) {
      return;
    }

    const row = target.closest(SELECTORS.item);

    if (
      !isHTMLElement(row) ||
      !this.itemsContainer.contains(row) ||
      this.isInteractiveDescendant(target, row)
    ) {
      return;
    }

    const index = this.readItemIndex(row);

    if (index < 0 || index >= this.getTotalCount()) {
      return;
    }

    this.setActiveIndex(index, { scroll: false });
    this.viewport.focus({ preventScroll: true });
    this.activateCurrentItem();
  }

  private onKeyDown(event: KeyboardEvent): void {
    if (
      this.options.navigation === "none" ||
      this.getTotalCount() <= 0 ||
      this.isEventFromInteractiveControl(event)
    ) {
      return;
    }

    const visibleCount = this.getVisibleCount();
    let nextIndex = this.activeIndex;
    let handled = true;

    switch (event.key) {
      case "ArrowDown":
        nextIndex += 1;
        break;
      case "ArrowUp":
        nextIndex -= 1;
        break;
      case "Home":
        nextIndex = 0;
        break;
      case "End":
        nextIndex = this.getTotalCount() - 1;
        break;
      case "PageDown":
        nextIndex += visibleCount;
        break;
      case "PageUp":
        nextIndex -= visibleCount;
        break;
      case "Enter":
        this.activateCurrentItem();
        break;
      case " ":
      case "Spacebar":
        this.activateCurrentItem();
        break;
      default:
        handled = false;
        break;
    }

    if (!handled) {
      return;
    }

    event.preventDefault();

    if (nextIndex !== this.activeIndex) {
      this.setActiveIndex(nextIndex);
    }
  }

  private activateCurrentItem(): void {
    const totalCount = this.getTotalCount();

    if (totalCount <= 0) {
      return;
    }

    const index = this.clampIndex(this.activeIndex);
    const item = this.items[index] as TItem;

    if (this.options.navigation === "listbox") {
      this.selectedIndex = index;
      this.renderNow();
      this.options.onSelect?.(item, index);
      this.dispatchItemEvent(EVENTS.select, index);
      return;
    }

    this.options.onActivate?.(item, index);
    this.dispatchItemEvent(EVENTS.itemActivate, index);
  }

  private isEventFromInteractiveControl(event: KeyboardEvent): boolean {
    const target = event.target;

    if (!isElement(target) || target === this.viewport) {
      return false;
    }

    return Boolean(target.closest(INTERACTIVE_CONTROL_SELECTOR));
  }

  private isInteractiveDescendant(target: Element, row: HTMLElement): boolean {
    const control = target.closest(INTERACTIVE_CONTROL_SELECTOR);

    return isElement(control) && control !== row && row.contains(control);
  }

  private scheduleRender(): void {
    if (this.frameId !== 0) {
      return;
    }

    const win = this.getWindow();

    this.frameId = win.requestAnimationFrame(() => {
      this.frameId = 0;
      this.renderNow();
    });
  }

  private cancelScheduledFrame(): void {
    if (this.frameId === 0) {
      return;
    }

    this.getWindow().cancelAnimationFrame(this.frameId);
    this.frameId = 0;
  }

  private cancelScheduledMeasurementFrame(): void {
    if (this.measurementFrameId === 0) {
      return;
    }

    this.getWindow().cancelAnimationFrame(this.measurementFrameId);
    this.measurementFrameId = 0;
  }

  private renderNow(): void {
    if (!this.isInitialized) {
      return;
    }

    const previousVisibleRange = this.visibleRange;
    const calculation = this.calculateRange();

    this.visibleRange = calculation.visibleRange;
    this.renderedRange = calculation.renderedRange;

    this.spacer.style.setProperty("--_total-size", `${calculation.totalSize}px`);
    this.itemsContainer.style.setProperty("--_offset", `${calculation.offsetY}px`);
    this.renderRows();
    this.updateActiveDescendant();

    const rangeChanged = this.hasVisibleRangeChanged(previousVisibleRange, this.visibleRange);

    if (rangeChanged) {
      this.dispatch<VirtualListRangeEventDetail<TItem>>(EVENTS.rangeChange, {
        instance: this,
        ...this.renderedRange
      });
      this.scheduleStatusUpdate();
    }

    this.dispatch<VirtualListRangeEventDetail<TItem>>(EVENTS.render, {
      instance: this,
      ...this.renderedRange
    });

    if (this.options.rowHeightMode === "estimated") {
      this.scheduleMeasurement();
    }
  }

  private calculateRange(): RangeCalculation {
    const totalCount = this.getTotalCount();

    if (totalCount <= 0) {
      const emptyRange = createEmptyRange(0);

      return {
        renderedRange: emptyRange,
        visibleRange: emptyRange,
        offsetY: 0,
        totalSize: 0
      };
    }

    return this.options.rowHeightMode === "estimated"
      ? this.calculateEstimatedRange(totalCount)
      : this.calculateFixedRange(totalCount);
  }

  private calculateFixedRange(totalCount: number): RangeCalculation {
    const viewportHeight = this.getViewportHeight();
    const totalSize = totalCount * this.options.rowHeight;
    const scrollTop = clampNumber(
      this.viewport.scrollTop,
      0,
      Math.max(0, totalSize - viewportHeight)
    );
    const visibleStartIndex = clampNumber(
      Math.floor(scrollTop / this.options.rowHeight),
      0,
      totalCount - 1
    );
    const visibleCount = this.getVisibleCount();
    const visibleEndIndex = clampNumber(
      visibleStartIndex + visibleCount - 1,
      0,
      totalCount - 1
    );
    const renderedStartIndex = clampNumber(
      visibleStartIndex - this.options.overscan,
      0,
      totalCount - 1
    );
    const renderedEndIndex = clampNumber(
      visibleEndIndex + this.options.overscan,
      0,
      totalCount - 1
    );

    return this.applyRangeSafety({
      renderedRange: {
        startIndex: renderedStartIndex,
        endIndex: renderedEndIndex,
        visibleStartIndex,
        visibleEndIndex,
        totalCount
      },
      visibleRange: {
        startIndex: visibleStartIndex,
        endIndex: visibleEndIndex,
        visibleStartIndex,
        visibleEndIndex,
        totalCount
      },
      offsetY: renderedStartIndex * this.options.rowHeight,
      totalSize
    });
  }

  private calculateEstimatedRange(totalCount: number): RangeCalculation {
    const viewportHeight = this.getViewportHeight();
    const totalSize = this.getEstimatedOffset(totalCount);
    const scrollTop = clampNumber(
      this.viewport.scrollTop,
      0,
      Math.max(0, totalSize - viewportHeight)
    );
    const visibleStartIndex = this.getEstimatedIndexAtOffset(scrollTop);
    const visibleEndIndex = this.getEstimatedIndexAtOffset(scrollTop + viewportHeight);
    const renderedStartIndex = clampNumber(
      visibleStartIndex - this.options.overscan,
      0,
      totalCount - 1
    );
    const renderedEndIndex = clampNumber(
      visibleEndIndex + this.options.overscan,
      0,
      totalCount - 1
    );

    return this.applyRangeSafety({
      renderedRange: {
        startIndex: renderedStartIndex,
        endIndex: renderedEndIndex,
        visibleStartIndex,
        visibleEndIndex,
        totalCount
      },
      visibleRange: {
        startIndex: visibleStartIndex,
        endIndex: visibleEndIndex,
        visibleStartIndex,
        visibleEndIndex,
        totalCount
      },
      offsetY: this.getEstimatedOffset(renderedStartIndex),
      totalSize
    });
  }

  private applyRangeSafety(calculation: RangeCalculation): RangeCalculation {
    const focusedItemIndex =
      this.pendingFocusRestore?.targetIndex ?? this.getFocusedItemIndex();
    const renderedRange = { ...calculation.renderedRange };

    if (
      focusedItemIndex >= 0 &&
      (this.pendingFocusRestore !== null || this.shouldPreserveItem(focusedItemIndex))
    ) {
      renderedRange.startIndex = Math.min(renderedRange.startIndex, focusedItemIndex);
      renderedRange.endIndex = Math.max(renderedRange.endIndex, focusedItemIndex);
    }

    if (
      this.options.navigation !== "none" &&
      !this.isIndexInRange(this.activeIndex, renderedRange)
    ) {
      this.activeIndex = renderedRange.visibleStartIndex;
    }

    return {
      ...calculation,
      renderedRange,
      offsetY:
        this.options.rowHeightMode === "estimated"
          ? this.getEstimatedOffset(renderedRange.startIndex)
          : renderedRange.startIndex * this.options.rowHeight
    };
  }

  private renderRows(): void {
    const totalCount = this.getTotalCount();

    if (totalCount <= 0 || this.renderedRange.endIndex < this.renderedRange.startIndex) {
      this.itemsContainer.replaceChildren();
      this.restorePendingFocus();
      this.observeRenderedItems();
      return;
    }

    const existingChildren = Array.from(this.itemsContainer.children).filter(isHTMLElement);
    const existingByIndex = new Map<number, HTMLElement>();
    const focusedIndex = this.getFocusedItemIndex();
    const nextRows: HTMLElement[] = [];

    existingChildren.forEach((child) => {
      const index = this.readItemIndex(child);

      if (index >= 0) {
        existingByIndex.set(index, child);
      }
    });

    for (let index = this.renderedRange.startIndex; index <= this.renderedRange.endIndex; index += 1) {
      const focusedExistingRow =
        this.pendingFocusRestore === null && index === focusedIndex
          ? existingByIndex.get(index)
          : undefined;
      const row = focusedExistingRow ?? this.createRow(index);

      this.prepareRow(row, index);
      nextRows.push(row);
    }

    const nextRowSet = new Set(nextRows);

    existingChildren.forEach((child) => {
      if (!nextRowSet.has(child)) {
        child.remove();
      }
    });

    nextRows.forEach((row, index) => {
      const currentRow = this.itemsContainer.children.item(index);

      if (currentRow !== row) {
        this.itemsContainer.insertBefore(row, currentRow);
      }
    });

    this.restorePendingFocus();
    this.observeRenderedItems();
  }

  private createRow(index: number): HTMLElement {
    const item = this.items[index] as TItem;
    const key = this.getItemKey(item, index);
    const meta = this.getItemMeta(index, key);

    try {
      const rendered = this.options.renderItem?.(item, index, meta) ?? this.renderDefaultItem(item, index);

      if (!isHTMLElement(rendered)) {
        throw new TypeError("renderItem must return an HTMLElement.");
      }

      return rendered;
    } catch (error) {
      this.dispatch<VirtualListErrorEventDetail<TItem>>(EVENTS.error, {
        instance: this,
        error
      });

      return this.renderDefaultItem(item, index);
    }
  }

  private renderDefaultItem(item: TItem, index: number): HTMLElement {
    const li = this.root.ownerDocument.createElement("li");
    const inner = this.root.ownerDocument.createElement("span");

    li.className = "a11y-virtual-list__item";
    li.dataset.a11yVirtualListItem = "";
    inner.className = "a11y-virtual-list__item-inner";
    inner.textContent = item === undefined || item === null ? `Item ${index + 1}` : String(item);
    li.append(inner);

    return li;
  }

  private prepareRow(row: HTMLElement, index: number): void {
    const item = this.items[index] as TItem;
    const key = this.getItemKey(item, index);
    const isActive = index === this.activeIndex;
    const isSelected = index === this.selectedIndex;
    const isPartialList =
      this.renderedRange.startIndex > 0 || this.renderedRange.endIndex < this.getTotalCount() - 1;

    row.classList.add("a11y-virtual-list__item");
    row.classList.toggle(CLASSES.itemActive, isActive);
    row.classList.toggle(CLASSES.itemSelected, isSelected);
    row.classList.toggle(CLASSES.itemFocused, this.isFocusInsideItem(index));
    row.dataset.a11yVirtualListItem = "";
    row.dataset.a11yVirtualListIndex = String(index);
    row.dataset.a11yVirtualListKey = key;
    row.id = `${this.idPrefix}-${index + 1}-${sanitizeDomId(key)}`;
    row.style.setProperty("--_row-size", `${this.getItemSize(index)}px`);

    if (isPartialList) {
      row.setAttribute(ATTRIBUTES.posInSet, String(index + 1));
      row.setAttribute(ATTRIBUTES.setSize, String(this.getTotalCount() || -1));
    } else {
      row.removeAttribute(ATTRIBUTES.posInSet);
      row.removeAttribute(ATTRIBUTES.setSize);
    }

    if (this.options.navigation === "listbox") {
      row.setAttribute("role", "option");
      row.setAttribute(ATTRIBUTES.selected, String(isSelected));
    } else if (row.getAttribute("role") === "option") {
      row.removeAttribute("role");
      row.removeAttribute(ATTRIBUTES.selected);
    }
  }

  private getItemMeta(index: number, key: string): VirtualListItemMeta {
    return {
      index,
      key,
      isActive: index === this.activeIndex,
      isSelected: index === this.selectedIndex,
      setSize: this.getTotalCount() || -1,
      posInSet: index + 1
    };
  }

  private getItemKey(item: TItem, index: number): string {
    try {
      return this.options.getKey?.(item, index) ?? String(index);
    } catch (error) {
      this.dispatch<VirtualListErrorEventDetail<TItem>>(EVENTS.error, {
        instance: this,
        error
      });

      return String(index);
    }
  }

  private updateActiveDescendant(): void {
    if (this.options.navigation === "none" || this.getTotalCount() <= 0) {
      this.restoreManagedAttribute(this.viewport, ATTRIBUTES.activeDescendant);
      return;
    }

    const activeElement = this.itemsContainer.querySelector(
      `[data-a11y-virtual-list-index="${this.activeIndex}"]`
    );

    if (isHTMLElement(activeElement)) {
      this.setManagedAttribute(
        this.viewport,
        ATTRIBUTES.activeDescendant,
        activeElement.id
      );
    } else {
      this.setManagedAttribute(this.viewport, ATTRIBUTES.activeDescendant, null);
    }
  }

  private scheduleStatusUpdate(): void {
    if (!this.status || !this.options.announceRange) {
      return;
    }

    this.clearTimer("announce");

    if (this.options.announceDebounce === 0) {
      this.updateStatus();
      return;
    }

    this.announceTimerId = this.getWindow().setTimeout(() => {
      this.announceTimerId = 0;
      this.updateStatus();
    }, this.options.announceDebounce);
  }

  private updateStatus(): void {
    if (!this.status || !this.options.announceRange) {
      return;
    }

    const totalCount = this.visibleRange.totalCount;

    if (totalCount <= 0) {
      this.status.textContent = "Showing 0 items";
      return;
    }

    const start = this.numberFormatter.format(this.visibleRange.visibleStartIndex + 1);
    const end = this.numberFormatter.format(this.visibleRange.visibleEndIndex + 1);

    if (!this.options.announceTotal) {
      this.status.textContent = `Showing items ${start}–${end}`;
      return;
    }

    this.status.textContent = `Showing items ${start}–${end} of ${this.numberFormatter.format(
      totalCount
    )}`;
  }

  private scheduleScrollSave(): void {
    this.clearTimer("scrollSave");
    this.scrollSaveTimerId = this.getWindow().setTimeout(() => {
      this.scrollSaveTimerId = 0;
      this.root.classList.remove(CLASSES.scrolling);

      if (this.options.restoreScroll) {
        this.saveScrollPosition();
      }
    }, Math.max(120, this.options.announceDebounce));
  }

  private clearTimer(name: "announce" | "scrollSave"): void {
    const timerId = name === "announce" ? this.announceTimerId : this.scrollSaveTimerId;

    if (timerId === 0) {
      return;
    }

    this.getWindow().clearTimeout(timerId);

    if (name === "announce") {
      this.announceTimerId = 0;
    } else {
      this.scrollSaveTimerId = 0;
    }
  }

  private scheduleMeasurement(): void {
    if (this.measurementFrameId !== 0) {
      return;
    }

    this.measurementFrameId = this.getWindow().requestAnimationFrame(() => {
      this.measurementFrameId = 0;
      this.measureRenderedItems();
    });
  }

  private measureRenderedItems(): void {
    if (!this.isInitialized || this.options.rowHeightMode !== "estimated") {
      return;
    }

    let changed = false;

    Array.from(this.itemsContainer.children)
      .filter(isHTMLElement)
      .forEach((child) => {
        const index = this.readItemIndex(child);

        if (index < 0) {
          return;
        }

        const measuredHeight = clampNumber(
          Math.round(
            child.getBoundingClientRect().height ||
              child.offsetHeight ||
              this.options.rowHeight
          ),
          this.options.minRowHeight,
          this.options.maxRowHeight
        );

        if (this.measuredHeights.get(index) !== measuredHeight) {
          this.measuredHeights.set(index, measuredHeight);
          changed = true;
        }
      });

    if (!changed) {
      return;
    }

    this.recalculateEstimatedSize();
  }

  private recalculateEstimatedSize(): void {
    if (this.measuredHeights.size > 0) {
      const totalMeasuredHeight = Array.from(this.measuredHeights.values()).reduce(
        (sum, height) => sum + height,
        0
      );

      this.averageMeasuredHeight = totalMeasuredHeight / this.measuredHeights.size;
    }

    this.spacer.style.setProperty("--_total-size", `${this.getTotalSize()}px`);
    this.itemsContainer.style.setProperty(
      "--_offset",
      `${this.getEstimatedOffset(this.renderedRange.startIndex)}px`
    );
  }

  private observeRenderedItems(): void {
    if (this.options.rowHeightMode !== "estimated" || typeof ResizeObserver === "undefined") {
      this.itemResizeObserver?.disconnect();
      this.itemResizeObserver = null;
      return;
    }

    this.itemResizeObserver?.disconnect();
    this.itemResizeObserver = new ResizeObserver(() => this.measureRenderedItems());

    Array.from(this.itemsContainer.children)
      .filter(isHTMLElement)
      .forEach((child) => this.itemResizeObserver?.observe(child));
  }

  private getEstimatedItemHeight(index: number): number {
    return (
      this.measuredHeights.get(index) ??
      (this.averageMeasuredHeight || this.options.rowHeight)
    );
  }

  private getEstimatedOffset(index: number): number {
    const totalCount = this.getTotalCount();
    const targetIndex = Number.isFinite(index)
      ? clampNumber(Math.round(index), 0, totalCount)
      : 0;
    const estimatedHeight = this.averageMeasuredHeight || this.options.rowHeight;
    let offset = targetIndex * estimatedHeight;

    this.measuredHeights.forEach((height, measuredIndex) => {
      if (measuredIndex >= 0 && measuredIndex < targetIndex) {
        offset += height - estimatedHeight;
      }
    });

    return Math.round(offset);
  }

  private getEstimatedIndexAtOffset(offset: number): number {
    const totalCount = this.getTotalCount();

    if (totalCount <= 0) {
      return 0;
    }

    const safeOffset = Number.isFinite(offset) ? Math.max(0, offset) : 0;

    if (safeOffset <= 0) {
      return 0;
    }

    if (safeOffset >= this.getEstimatedOffset(totalCount)) {
      return totalCount - 1;
    }

    let low = 0;
    let high = totalCount - 1;

    while (low < high) {
      const mid = Math.floor((low + high) / 2);

      if (this.getEstimatedOffset(mid + 1) > safeOffset) {
        high = mid;
      } else {
        low = mid + 1;
      }
    }

    return low;
  }

  private getFocusedItemIndex(): number {
    const activeElement = this.root.ownerDocument.activeElement;

    if (!isElement(activeElement) || !this.itemsContainer.contains(activeElement)) {
      return -1;
    }

    const item = activeElement.closest(SELECTORS.item);

    return isHTMLElement(item) ? this.readItemIndex(item) : -1;
  }

  private captureFocusedItemState(): FocusedItemState | null {
    if (!this.options.preserveFocusedItem) {
      return null;
    }

    const activeElement = this.root.ownerDocument.activeElement;

    if (!isHTMLElement(activeElement) || !this.itemsContainer.contains(activeElement)) {
      return null;
    }

    const row = activeElement.closest(SELECTORS.item);

    if (!isHTMLElement(row)) {
      return null;
    }

    const index = this.readItemIndex(row);
    const key = row.dataset.a11yVirtualListKey;

    if (index < 0 || key === undefined) {
      return null;
    }

    const focusableDescendants = Array.from(
      row.querySelectorAll<HTMLElement>(INTERACTIVE_CONTROL_SELECTOR)
    );

    return {
      key,
      index,
      descendantIndex: focusableDescendants.indexOf(activeElement),
      focusWasOnRow: activeElement === row
    };
  }

  private prepareFocusRestore(
    focusedItemState: FocusedItemState | null
  ): PendingFocusRestore | null {
    if (!focusedItemState || !this.options.preserveFocusedItem) {
      return null;
    }

    if (this.getTotalCount() <= 0) {
      return {
        ...focusedItemState,
        targetIndex: -1
      };
    }

    const keyIndex = this.items.findIndex(
      (item, index) => this.getItemKey(item, index) === focusedItemState.key
    );

    return {
      ...focusedItemState,
      targetIndex: keyIndex >= 0 ? keyIndex : this.clampIndex(focusedItemState.index)
    };
  }

  private restorePendingFocus(): void {
    const focusState = this.pendingFocusRestore;

    if (!focusState) {
      return;
    }

    this.pendingFocusRestore = null;

    if (focusState.targetIndex < 0) {
      this.viewport.focus({ preventScroll: true });
      return;
    }

    const row = this.itemsContainer.querySelector(
      `[data-a11y-virtual-list-index="${focusState.targetIndex}"]`
    );

    if (!isHTMLElement(row)) {
      this.viewport.focus({ preventScroll: true });
      return;
    }

    if (focusState.focusWasOnRow && row.tabIndex >= 0) {
      row.focus({ preventScroll: true });
      row.classList.add(CLASSES.itemFocused);
      return;
    }

    const focusableDescendants = Array.from(
      row.querySelectorAll<HTMLElement>(INTERACTIVE_CONTROL_SELECTOR)
    );
    const replacement = focusableDescendants[focusState.descendantIndex];

    if (replacement) {
      replacement.focus({ preventScroll: true });
      row.classList.add(CLASSES.itemFocused);
      return;
    }

    this.viewport.focus({ preventScroll: true });
  }

  private isFocusInsideItem(index: number): boolean {
    const activeElement = this.root.ownerDocument.activeElement;

    if (!isElement(activeElement)) {
      return false;
    }

    const item = this.itemsContainer.querySelector(
      `[data-a11y-virtual-list-index="${index}"]`
    );

    return isHTMLElement(item) && item.contains(activeElement);
  }

  private shouldPreserveItem(index: number): boolean {
    return index >= 0 && this.options.preserveFocusedItem && this.isFocusInsideItem(index);
  }

  private ensureIndexVisible(index: number, align: VirtualListScrollAlign = "nearest"): void {
    this.scrollToIndex(index, align);
  }

  private readItemIndex(element: HTMLElement): number {
    const rawIndex = element.dataset.a11yVirtualListIndex;
    const index = rawIndex ? Number.parseInt(rawIndex, 10) : Number.NaN;

    return Number.isFinite(index) ? index : -1;
  }

  private getTotalCount(): number {
    return Math.max(
      0,
      this.options.totalCount === null
        ? this.items.length
        : Math.max(this.options.totalCount, this.items.length)
    );
  }

  private getTotalSize(): number {
    const totalCount = this.getTotalCount();

    if (this.options.rowHeightMode === "estimated") {
      return this.getEstimatedOffset(totalCount);
    }

    return totalCount * this.options.rowHeight;
  }

  private getItemOffset(index: number): number {
    if (this.options.rowHeightMode === "estimated") {
      return this.getEstimatedOffset(index);
    }

    return index * this.options.rowHeight;
  }

  private getItemSize(index: number): number {
    if (this.options.rowHeightMode === "estimated") {
      return this.getEstimatedItemHeight(index);
    }

    return this.options.rowHeight;
  }

  private getViewportHeight(): number {
    const rect = this.viewport.getBoundingClientRect();

    return Math.max(this.viewport.clientHeight, rect.height, this.options.rowHeight);
  }

  private getVisibleCount(): number {
    return Math.max(1, Math.ceil(this.getViewportHeight() / this.options.rowHeight));
  }

  private clampIndex(index: number): number {
    const totalCount = this.getTotalCount();

    if (totalCount <= 0) {
      return 0;
    }

    return clampNumber(Math.round(index), 0, totalCount - 1);
  }

  private isIndexInRange(index: number, range: VirtualListRange): boolean {
    return index >= range.startIndex && index <= range.endIndex;
  }

  private hasVisibleRangeChanged(
    previousRange: VirtualListRange,
    nextRange: VirtualListRange
  ): boolean {
    return (
      previousRange.visibleStartIndex !== nextRange.visibleStartIndex ||
      previousRange.visibleEndIndex !== nextRange.visibleEndIndex ||
      previousRange.totalCount !== nextRange.totalCount
    );
  }

  private getStorageKey(): string | null {
    return this.options.restoreKey === "" ? null : `${COMPONENT_NAME}:${this.options.restoreKey}`;
  }

  private getStorage(): Storage | null {
    if (this.options.storage === "none" || this.options.restoreKey === "") {
      return null;
    }

    try {
      return this.options.storage === "local"
        ? this.getWindow().localStorage
        : this.getWindow().sessionStorage;
    } catch (error) {
      this.dispatch(EVENTS.error, { instance: this, error });
      return null;
    }
  }
}

export function createVirtualList<TItem = unknown>(
  root: HTMLElement,
  options: VirtualListOptions<TItem> = {}
): VirtualListInstance<TItem> {
  return new A11yVirtualList<TItem>(root, options);
}

export function initVirtualListAll<TItem = unknown>(
  options: VirtualListOptions<TItem> = {}
): Array<VirtualListInstance<TItem>> {
  if (typeof document === "undefined") {
    return [];
  }

  return Array.from(document.querySelectorAll<HTMLElement>(SELECTORS.root)).map((root) =>
    createVirtualList<TItem>(root, options)
  );
}
