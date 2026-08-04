//#region src/index.ts
const COMPONENT_NAME = "a11y-virtual-list";
const DEFAULT_OPTIONS = Object.freeze({
	items: [],
	totalCount: null,
	rowHeight: 48,
	rowHeightMode: "fixed",
	minRowHeight: 28,
	maxRowHeight: 240,
	overscan: 6,
	minOverscan: 2,
	maxOverscan: 30,
	navigation: "none",
	orientation: "vertical",
	restoreScroll: true,
	restoreKey: "",
	storage: "session",
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
const ROW_HEIGHT_MODES = ["fixed", "estimated"];
const NAVIGATION_MODES = [
	"none",
	"roving",
	"listbox"
];
const ORIENTATIONS = ["vertical"];
const STORAGE_MODES = [
	"session",
	"local",
	"none"
];
const SCROLL_ALIGNS = [
	"start",
	"center",
	"end",
	"nearest"
];
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
function toSafeBoolean(value, fallback) {
	if (typeof value === "boolean") return value;
	if (typeof value !== "string") return fallback;
	const normalized = value.trim().toLowerCase();
	if ([
		"true",
		"1",
		"yes",
		"on"
	].includes(normalized)) return true;
	if ([
		"false",
		"0",
		"no",
		"off"
	].includes(normalized)) return false;
	return fallback;
}
function toSafeInteger(value, fallback, options = {}) {
	const parsed = typeof value === "number" ? value : typeof value === "string" && value.trim() !== "" ? Number(value) : NaN;
	if (!Number.isFinite(parsed)) return fallback;
	return clampNumber(Math.round(parsed), options.min, options.max);
}
function toSafeString(value, fallback) {
	if (typeof value !== "string") return fallback;
	const trimmed = value.trim();
	return trimmed === "" ? fallback : trimmed;
}
function toSafeEnum(value, allowed, fallback) {
	if (typeof value !== "string") return fallback;
	return allowed.includes(value) ? value : fallback;
}
function clampNumber(value, min = Number.NEGATIVE_INFINITY, max = Number.POSITIVE_INFINITY) {
	return Math.min(Math.max(value, min), max);
}
function createEmptyRange(totalCount = 0) {
	return {
		startIndex: 0,
		endIndex: -1,
		visibleStartIndex: 0,
		visibleEndIndex: -1,
		totalCount
	};
}
function isHTMLElement(value) {
	return typeof HTMLElement !== "undefined" && value instanceof HTMLElement;
}
function isElement(value) {
	return typeof Element !== "undefined" && value instanceof Element;
}
function isStoredState(value) {
	if (typeof value !== "object" || value === null) return false;
	const state = value;
	return typeof state.scrollTop === "number" && Number.isFinite(state.scrollTop) && typeof state.activeIndex === "number" && Number.isFinite(state.activeIndex) && typeof state.timestamp === "number" && Number.isFinite(state.timestamp);
}
function sanitizeDomId(value) {
	const normalized = value.trim().replace(/[^a-zA-Z0-9_-]+/g, "-");
	return normalized === "" ? "item" : normalized;
}
function normalizeOptions(options) {
	const rawOptions = options;
	const rawItems = rawOptions.items;
	const items = Array.isArray(rawItems) ? [...rawItems] : [];
	const minRowHeight = toSafeInteger(rawOptions.minRowHeight, DEFAULT_OPTIONS.minRowHeight, { min: 1 });
	const maxRowHeight = Math.max(minRowHeight, toSafeInteger(rawOptions.maxRowHeight, DEFAULT_OPTIONS.maxRowHeight, { min: minRowHeight }));
	const rowHeight = toSafeInteger(rawOptions.rowHeight, DEFAULT_OPTIONS.rowHeight, {
		min: minRowHeight,
		max: maxRowHeight
	});
	const minOverscan = toSafeInteger(rawOptions.minOverscan, DEFAULT_OPTIONS.minOverscan, { min: 0 });
	const maxOverscan = Math.max(minOverscan, toSafeInteger(rawOptions.maxOverscan, DEFAULT_OPTIONS.maxOverscan, { min: minOverscan }));
	const rawTotalCount = rawOptions.totalCount;
	return {
		items,
		totalCount: rawTotalCount === null || rawTotalCount === void 0 || typeof rawTotalCount === "string" && rawTotalCount.trim() === "" ? null : toSafeInteger(rawTotalCount, items.length, { min: 0 }),
		rowHeight,
		rowHeightMode: toSafeEnum(rawOptions.rowHeightMode, ROW_HEIGHT_MODES, DEFAULT_OPTIONS.rowHeightMode),
		minRowHeight,
		maxRowHeight,
		overscan: toSafeInteger(rawOptions.overscan, DEFAULT_OPTIONS.overscan, {
			min: minOverscan,
			max: maxOverscan
		}),
		minOverscan,
		maxOverscan,
		navigation: toSafeEnum(rawOptions.navigation, NAVIGATION_MODES, DEFAULT_OPTIONS.navigation),
		orientation: toSafeEnum(rawOptions.orientation, ORIENTATIONS, DEFAULT_OPTIONS.orientation),
		restoreScroll: toSafeBoolean(rawOptions.restoreScroll, DEFAULT_OPTIONS.restoreScroll),
		restoreKey: toSafeString(rawOptions.restoreKey, DEFAULT_OPTIONS.restoreKey),
		storage: toSafeEnum(rawOptions.storage, STORAGE_MODES, DEFAULT_OPTIONS.storage),
		announceRange: toSafeBoolean(rawOptions.announceRange, DEFAULT_OPTIONS.announceRange),
		announceTotal: toSafeBoolean(rawOptions.announceTotal, DEFAULT_OPTIONS.announceTotal),
		announceDebounce: toSafeInteger(rawOptions.announceDebounce, DEFAULT_OPTIONS.announceDebounce, {
			min: 0,
			max: 5e3
		}),
		activeIndex: toSafeInteger(rawOptions.activeIndex, DEFAULT_OPTIONS.activeIndex, { min: 0 }),
		preserveFocusedItem: toSafeBoolean(rawOptions.preserveFocusedItem, DEFAULT_OPTIONS.preserveFocusedItem),
		selectionFollowsFocus: toSafeBoolean(rawOptions.selectionFollowsFocus, DEFAULT_OPTIONS.selectionFollowsFocus),
		debug: toSafeBoolean(rawOptions.debug, DEFAULT_OPTIONS.debug),
		getKey: typeof options.getKey === "function" ? options.getKey : void 0,
		renderItem: typeof options.renderItem === "function" ? options.renderItem : void 0,
		onActivate: typeof options.onActivate === "function" ? options.onActivate : void 0,
		onSelect: typeof options.onSelect === "function" ? options.onSelect : void 0
	};
}
var A11yVirtualList = class A11yVirtualList {
	static instances = /* @__PURE__ */ new WeakMap();
	root;
	viewport;
	spacer;
	itemsContainer;
	status;
	managedAttributes = /* @__PURE__ */ new Map();
	numberFormatter = new Intl.NumberFormat();
	options;
	items = [];
	activeIndex = 0;
	selectedIndex = -1;
	isInitialized = false;
	frameId = 0;
	measurementFrameId = 0;
	announceTimerId = 0;
	scrollSaveTimerId = 0;
	visibleRange;
	renderedRange;
	resizeObserver = null;
	itemResizeObserver = null;
	measuredHeights = /* @__PURE__ */ new Map();
	averageMeasuredHeight = 0;
	pendingFocusRestore = null;
	idPrefix;
	handleScroll;
	handleClick;
	handleKeyDown;
	handleResize;
	constructor(root, options = {}) {
		if (!isHTMLElement(root)) throw new TypeError(`${COMPONENT_NAME}: root must be an HTMLElement.`);
		const existing = A11yVirtualList.instances.get(root);
		if (existing) return existing;
		this.root = root;
		this.viewport = this.queryRequiredElement(root, SELECTORS.viewport);
		this.spacer = this.queryRequiredElement(root, SELECTORS.spacer);
		this.itemsContainer = this.queryRequiredElement(root, SELECTORS.items);
		this.status = this.queryOptionalElement(root, SELECTORS.status);
		const datasetOptions = A11yVirtualList.optionsFromDataset(root);
		this.options = normalizeOptions({
			...datasetOptions,
			...options
		});
		this.items = [...this.options.items];
		this.activeIndex = this.clampIndex(this.options.activeIndex);
		this.selectedIndex = this.options.selectionFollowsFocus ? this.activeIndex : -1;
		this.visibleRange = createEmptyRange(this.getTotalCount());
		this.renderedRange = createEmptyRange(this.getTotalCount());
		this.idPrefix = `${COMPONENT_NAME}-${++instanceCounter}`;
		this.handleScroll = this.onScroll.bind(this);
		this.handleClick = this.onClick.bind(this);
		this.handleKeyDown = this.onKeyDown.bind(this);
		this.handleResize = this.onResize.bind(this);
		A11yVirtualList.instances.set(root, this);
		this.init();
	}
	init() {
		if (this.isInitialized) return;
		this.isInitialized = true;
		this.root.classList.add(CLASSES.initialized);
		this.setManagedAttribute(this.viewport, ATTRIBUTES.tabIndex, "0");
		this.applyContainerSemantics();
		this.prepareStatus();
		this.viewport.addEventListener("scroll", this.handleScroll, { passive: true });
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
		if (this.options.restoreScroll) this.restoreScrollPosition();
		this.root.classList.add(CLASSES.ready);
		this.dispatch(EVENTS.ready, { instance: this });
	}
	destroy() {
		if (!this.isInitialized) return;
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
		if (this.itemsContainer.contains(this.root.ownerDocument.activeElement)) this.viewport.focus({ preventScroll: true });
		this.pendingFocusRestore = null;
		this.itemsContainer.replaceChildren();
		this.spacer.style.removeProperty("--_total-size");
		this.itemsContainer.style.removeProperty("--_offset");
		this.root.classList.remove(CLASSES.initialized, CLASSES.ready, CLASSES.scrolling, CLASSES.restoring, CLASSES.keyboardMode);
		this.restoreManagedAttributes();
		this.visibleRange = createEmptyRange(this.getTotalCount());
		this.renderedRange = createEmptyRange(this.getTotalCount());
		this.isInitialized = false;
		A11yVirtualList.instances.delete(this.root);
	}
	updateItems(items, options = {}) {
		const focusedItemState = this.captureFocusedItemState();
		this.items = [...items];
		this.options = normalizeOptions({
			...this.options,
			...options,
			items: this.items
		});
		this.activeIndex = this.clampIndex(this.activeIndex);
		this.selectedIndex = this.selectedIndex >= 0 ? this.clampIndex(this.selectedIndex) : -1;
		this.pendingFocusRestore = this.prepareFocusRestore(focusedItemState);
		this.measuredHeights.clear();
		this.averageMeasuredHeight = 0;
		if (this.pendingFocusRestore && this.pendingFocusRestore.targetIndex >= 0) this.ensureIndexVisible(this.pendingFocusRestore.targetIndex);
		else this.renderNow();
		this.dispatch(EVENTS.update, { instance: this });
	}
	updateOptions(options) {
		const previousActiveIndex = this.activeIndex;
		const focusedItemState = Object.prototype.hasOwnProperty.call(options, "renderItem") || Object.prototype.hasOwnProperty.call(options, "getKey") ? this.captureFocusedItemState() : null;
		const hasActiveIndexOption = Object.prototype.hasOwnProperty.call(options, "activeIndex");
		this.options = normalizeOptions({
			...this.options,
			...options,
			items: this.items
		});
		this.activeIndex = this.clampIndex(hasActiveIndexOption ? this.options.activeIndex : previousActiveIndex);
		this.selectedIndex = this.selectedIndex >= 0 ? this.clampIndex(this.selectedIndex) : -1;
		if (this.options.selectionFollowsFocus) this.selectedIndex = this.activeIndex;
		this.pendingFocusRestore = this.prepareFocusRestore(focusedItemState);
		this.applyContainerSemantics();
		if (this.pendingFocusRestore && this.pendingFocusRestore.targetIndex >= 0) this.ensureIndexVisible(this.pendingFocusRestore.targetIndex);
		else if (hasActiveIndexOption) this.ensureIndexVisible(this.activeIndex);
		else this.renderNow();
		this.dispatch(EVENTS.update, { instance: this });
	}
	scrollToIndex(index, align = "nearest") {
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
		if (safeAlign === "center") nextScrollTop = itemOffset - (viewportHeight - itemHeight) / 2;
		else if (safeAlign === "end") nextScrollTop = itemOffset - viewportHeight + itemHeight;
		else if (safeAlign === "nearest") {
			if (itemOffset >= currentTop && itemOffset + itemHeight <= currentBottom) {
				this.renderNow();
				return;
			}
			nextScrollTop = itemOffset < currentTop ? itemOffset : itemOffset - viewportHeight + itemHeight;
		}
		this.viewport.scrollTop = clampNumber(Math.round(nextScrollTop), 0, Math.max(0, this.getTotalSize() - viewportHeight));
		this.renderNow();
	}
	getVisibleRange() {
		return { ...this.visibleRange };
	}
	getRenderedRange() {
		return { ...this.renderedRange };
	}
	setActiveIndex(index, options = {}) {
		if (this.getTotalCount() <= 0) {
			this.activeIndex = 0;
			this.updateActiveDescendant();
			return;
		}
		const nextIndex = this.clampIndex(index);
		const changed = nextIndex !== this.activeIndex;
		this.activeIndex = nextIndex;
		if (this.options.selectionFollowsFocus) this.selectedIndex = nextIndex;
		if (options.scroll !== false) this.ensureIndexVisible(nextIndex);
		else this.renderNow();
		this.updateActiveDescendant();
		if (changed) this.dispatchItemEvent(EVENTS.itemActive, nextIndex);
	}
	getActiveIndex() {
		return this.activeIndex;
	}
	saveScrollPosition() {
		const storage = this.getStorage();
		const storageKey = this.getStorageKey();
		if (!storage || !storageKey) return;
		const state = {
			scrollTop: this.viewport.scrollTop,
			activeIndex: this.activeIndex,
			timestamp: Date.now()
		};
		try {
			storage.setItem(storageKey, JSON.stringify(state));
			this.dispatch(EVENTS.scrollSave, { instance: this });
		} catch (error) {
			this.dispatch(EVENTS.error, {
				instance: this,
				error
			});
		}
	}
	restoreScrollPosition() {
		const storage = this.getStorage();
		const storageKey = this.getStorageKey();
		if (!storage || !storageKey) return;
		try {
			const rawState = storage.getItem(storageKey);
			if (!rawState) return;
			const parsedState = JSON.parse(rawState);
			if (!isStoredState(parsedState)) return;
			this.root.classList.add(CLASSES.restoring);
			this.activeIndex = this.clampIndex(parsedState.activeIndex);
			this.viewport.scrollTop = clampNumber(parsedState.scrollTop, 0, Math.max(0, this.getTotalSize() - this.getViewportHeight()));
			this.renderNow();
			this.root.classList.remove(CLASSES.restoring);
			this.dispatch(EVENTS.scrollRestore, { instance: this });
		} catch (error) {
			this.root.classList.remove(CLASSES.restoring);
			this.dispatch(EVENTS.error, {
				instance: this,
				error
			});
		}
	}
	clearScrollPosition() {
		const storage = this.getStorage();
		const storageKey = this.getStorageKey();
		if (!storage || !storageKey) return;
		try {
			storage.removeItem(storageKey);
		} catch (error) {
			this.dispatch(EVENTS.error, {
				instance: this,
				error
			});
		}
	}
	static optionsFromDataset(root) {
		return {
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
	}
	queryRequiredElement(root, selector) {
		const element = root.querySelector(selector);
		if (!isHTMLElement(element)) throw new Error(`${COMPONENT_NAME}: missing required child ${selector}.`);
		return element;
	}
	queryOptionalElement(root, selector) {
		const element = root.querySelector(selector);
		return isHTMLElement(element) ? element : null;
	}
	getWindow() {
		const ownerWindow = this.root.ownerDocument.defaultView;
		if (ownerWindow) return ownerWindow;
		if (typeof window !== "undefined") return window;
		throw new Error(`${COMPONENT_NAME}: root must belong to a windowed document.`);
	}
	dispatch(type, detail) {
		const CustomEventConstructor = this.getWindow().CustomEvent;
		this.root.dispatchEvent(new CustomEventConstructor(type, {
			bubbles: true,
			detail
		}));
	}
	dispatchItemEvent(type, index) {
		const item = this.items[index];
		const key = this.getItemKey(item, index);
		this.dispatch(type, {
			instance: this,
			item,
			index,
			key
		});
	}
	rememberAttribute(element, attribute) {
		let attributes = this.managedAttributes.get(element);
		if (!attributes) {
			attributes = /* @__PURE__ */ new Map();
			this.managedAttributes.set(element, attributes);
		}
		if (!attributes.has(attribute)) attributes.set(attribute, element.getAttribute(attribute));
	}
	setManagedAttribute(element, attribute, value) {
		this.rememberAttribute(element, attribute);
		if (value === null) {
			element.removeAttribute(attribute);
			return;
		}
		element.setAttribute(attribute, value);
	}
	restoreManagedAttribute(element, attribute) {
		const attributes = this.managedAttributes.get(element);
		if (!attributes || !attributes.has(attribute)) return;
		const originalValue = attributes.get(attribute);
		if (originalValue === null || originalValue === void 0) element.removeAttribute(attribute);
		else element.setAttribute(attribute, originalValue);
		attributes.delete(attribute);
	}
	restoreManagedAttributes() {
		this.managedAttributes.forEach((attributes, element) => {
			attributes.forEach((originalValue, attribute) => {
				if (originalValue === null) element.removeAttribute(attribute);
				else element.setAttribute(attribute, originalValue);
			});
		});
		this.managedAttributes.clear();
	}
	applyContainerSemantics() {
		this.restoreManagedAttribute(this.viewport, ATTRIBUTES.orientation);
		if (this.options.navigation === "listbox") {
			const label = this.viewport.getAttribute(ATTRIBUTES.label) ?? this.itemsContainer.getAttribute(ATTRIBUTES.label) ?? "Virtual list options";
			this.setManagedAttribute(this.viewport, ATTRIBUTES.role, "listbox");
			this.setManagedAttribute(this.viewport, ATTRIBUTES.label, label);
			this.setManagedAttribute(this.viewport, ATTRIBUTES.orientation, this.options.orientation);
			this.setManagedAttribute(this.itemsContainer, ATTRIBUTES.role, "presentation");
			this.restoreManagedAttribute(this.itemsContainer, ATTRIBUTES.label);
			this.root.classList.add(CLASSES.keyboardMode);
			return;
		}
		this.restoreManagedAttribute(this.itemsContainer, ATTRIBUTES.role);
		this.restoreManagedAttribute(this.itemsContainer, ATTRIBUTES.label);
		this.restoreManagedAttribute(this.viewport, ATTRIBUTES.label);
		this.setManagedAttribute(this.viewport, ATTRIBUTES.role, "group");
		if (this.options.navigation === "roving") this.root.classList.add(CLASSES.keyboardMode);
		else {
			this.root.classList.remove(CLASSES.keyboardMode);
			this.restoreManagedAttribute(this.viewport, ATTRIBUTES.activeDescendant);
		}
	}
	prepareStatus() {
		if (!this.status) return;
		this.setManagedAttribute(this.status, ATTRIBUTES.role, "status");
		this.setManagedAttribute(this.status, ATTRIBUTES.live, "polite");
		this.setManagedAttribute(this.status, ATTRIBUTES.atomic, "true");
	}
	onScroll() {
		if (!this.isInitialized) return;
		this.root.classList.add(CLASSES.scrolling);
		this.scheduleRender();
		this.scheduleScrollSave();
	}
	onResize() {
		if (!this.isInitialized) return;
		this.scheduleRender();
	}
	onClick(event) {
		if (this.options.navigation === "none" || this.getTotalCount() <= 0) return;
		const target = event.target;
		if (!isElement(target)) return;
		const row = target.closest(SELECTORS.item);
		if (!isHTMLElement(row) || !this.itemsContainer.contains(row) || this.isInteractiveDescendant(target, row)) return;
		const index = this.readItemIndex(row);
		if (index < 0 || index >= this.getTotalCount()) return;
		this.setActiveIndex(index, { scroll: false });
		this.viewport.focus({ preventScroll: true });
		this.activateCurrentItem();
	}
	onKeyDown(event) {
		if (this.options.navigation === "none" || this.getTotalCount() <= 0 || this.isEventFromInteractiveControl(event)) return;
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
		if (!handled) return;
		event.preventDefault();
		if (nextIndex !== this.activeIndex) this.setActiveIndex(nextIndex);
	}
	activateCurrentItem() {
		if (this.getTotalCount() <= 0) return;
		const index = this.clampIndex(this.activeIndex);
		const item = this.items[index];
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
	isEventFromInteractiveControl(event) {
		const target = event.target;
		if (!isElement(target) || target === this.viewport) return false;
		return Boolean(target.closest(INTERACTIVE_CONTROL_SELECTOR));
	}
	isInteractiveDescendant(target, row) {
		const control = target.closest(INTERACTIVE_CONTROL_SELECTOR);
		return isElement(control) && control !== row && row.contains(control);
	}
	scheduleRender() {
		if (this.frameId !== 0) return;
		const win = this.getWindow();
		this.frameId = win.requestAnimationFrame(() => {
			this.frameId = 0;
			this.renderNow();
		});
	}
	cancelScheduledFrame() {
		if (this.frameId === 0) return;
		this.getWindow().cancelAnimationFrame(this.frameId);
		this.frameId = 0;
	}
	cancelScheduledMeasurementFrame() {
		if (this.measurementFrameId === 0) return;
		this.getWindow().cancelAnimationFrame(this.measurementFrameId);
		this.measurementFrameId = 0;
	}
	renderNow() {
		if (!this.isInitialized) return;
		const previousVisibleRange = this.visibleRange;
		const calculation = this.calculateRange();
		this.visibleRange = calculation.visibleRange;
		this.renderedRange = calculation.renderedRange;
		this.spacer.style.setProperty("--_total-size", `${calculation.totalSize}px`);
		this.itemsContainer.style.setProperty("--_offset", `${calculation.offsetY}px`);
		this.renderRows();
		this.updateActiveDescendant();
		if (this.hasVisibleRangeChanged(previousVisibleRange, this.visibleRange)) {
			this.dispatch(EVENTS.rangeChange, {
				instance: this,
				...this.renderedRange
			});
			this.scheduleStatusUpdate();
		}
		this.dispatch(EVENTS.render, {
			instance: this,
			...this.renderedRange
		});
		if (this.options.rowHeightMode === "estimated") this.scheduleMeasurement();
	}
	calculateRange() {
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
		return this.options.rowHeightMode === "estimated" ? this.calculateEstimatedRange(totalCount) : this.calculateFixedRange(totalCount);
	}
	calculateFixedRange(totalCount) {
		const viewportHeight = this.getViewportHeight();
		const totalSize = totalCount * this.options.rowHeight;
		const scrollTop = clampNumber(this.viewport.scrollTop, 0, Math.max(0, totalSize - viewportHeight));
		const visibleStartIndex = clampNumber(Math.floor(scrollTop / this.options.rowHeight), 0, totalCount - 1);
		const visibleEndIndex = clampNumber(visibleStartIndex + this.getVisibleCount() - 1, 0, totalCount - 1);
		const renderedStartIndex = clampNumber(visibleStartIndex - this.options.overscan, 0, totalCount - 1);
		const renderedEndIndex = clampNumber(visibleEndIndex + this.options.overscan, 0, totalCount - 1);
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
	calculateEstimatedRange(totalCount) {
		const viewportHeight = this.getViewportHeight();
		const totalSize = this.getEstimatedOffset(totalCount);
		const scrollTop = clampNumber(this.viewport.scrollTop, 0, Math.max(0, totalSize - viewportHeight));
		const visibleStartIndex = this.getEstimatedIndexAtOffset(scrollTop);
		const visibleEndIndex = this.getEstimatedIndexAtOffset(scrollTop + viewportHeight);
		const renderedStartIndex = clampNumber(visibleStartIndex - this.options.overscan, 0, totalCount - 1);
		const renderedEndIndex = clampNumber(visibleEndIndex + this.options.overscan, 0, totalCount - 1);
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
	applyRangeSafety(calculation) {
		const focusedItemIndex = this.pendingFocusRestore?.targetIndex ?? this.getFocusedItemIndex();
		const renderedRange = { ...calculation.renderedRange };
		if (focusedItemIndex >= 0 && (this.pendingFocusRestore !== null || this.shouldPreserveItem(focusedItemIndex))) {
			renderedRange.startIndex = Math.min(renderedRange.startIndex, focusedItemIndex);
			renderedRange.endIndex = Math.max(renderedRange.endIndex, focusedItemIndex);
		}
		if (this.options.navigation !== "none" && !this.isIndexInRange(this.activeIndex, renderedRange)) this.activeIndex = renderedRange.visibleStartIndex;
		return {
			...calculation,
			renderedRange,
			offsetY: this.options.rowHeightMode === "estimated" ? this.getEstimatedOffset(renderedRange.startIndex) : renderedRange.startIndex * this.options.rowHeight
		};
	}
	renderRows() {
		if (this.getTotalCount() <= 0 || this.renderedRange.endIndex < this.renderedRange.startIndex) {
			this.itemsContainer.replaceChildren();
			this.restorePendingFocus();
			this.observeRenderedItems();
			return;
		}
		const existingChildren = Array.from(this.itemsContainer.children).filter(isHTMLElement);
		const existingByIndex = /* @__PURE__ */ new Map();
		const focusedIndex = this.getFocusedItemIndex();
		const nextRows = [];
		existingChildren.forEach((child) => {
			const index = this.readItemIndex(child);
			if (index >= 0) existingByIndex.set(index, child);
		});
		for (let index = this.renderedRange.startIndex; index <= this.renderedRange.endIndex; index += 1) {
			const row = (this.pendingFocusRestore === null && index === focusedIndex ? existingByIndex.get(index) : void 0) ?? this.createRow(index);
			this.prepareRow(row, index);
			nextRows.push(row);
		}
		const nextRowSet = new Set(nextRows);
		existingChildren.forEach((child) => {
			if (!nextRowSet.has(child)) child.remove();
		});
		nextRows.forEach((row, index) => {
			const currentRow = this.itemsContainer.children.item(index);
			if (currentRow !== row) this.itemsContainer.insertBefore(row, currentRow);
		});
		this.restorePendingFocus();
		this.observeRenderedItems();
	}
	createRow(index) {
		const item = this.items[index];
		const key = this.getItemKey(item, index);
		const meta = this.getItemMeta(index, key);
		try {
			const rendered = this.options.renderItem?.(item, index, meta) ?? this.renderDefaultItem(item, index);
			if (!isHTMLElement(rendered)) throw new TypeError("renderItem must return an HTMLElement.");
			return rendered;
		} catch (error) {
			this.dispatch(EVENTS.error, {
				instance: this,
				error
			});
			return this.renderDefaultItem(item, index);
		}
	}
	renderDefaultItem(item, index) {
		const li = this.root.ownerDocument.createElement("li");
		const inner = this.root.ownerDocument.createElement("span");
		li.className = "a11y-virtual-list__item";
		li.dataset.a11yVirtualListItem = "";
		inner.className = "a11y-virtual-list__item-inner";
		inner.textContent = item === void 0 || item === null ? `Item ${index + 1}` : String(item);
		li.append(inner);
		return li;
	}
	prepareRow(row, index) {
		const item = this.items[index];
		const key = this.getItemKey(item, index);
		const isActive = index === this.activeIndex;
		const isSelected = index === this.selectedIndex;
		const isPartialList = this.renderedRange.startIndex > 0 || this.renderedRange.endIndex < this.getTotalCount() - 1;
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
	getItemMeta(index, key) {
		return {
			index,
			key,
			isActive: index === this.activeIndex,
			isSelected: index === this.selectedIndex,
			setSize: this.getTotalCount() || -1,
			posInSet: index + 1
		};
	}
	getItemKey(item, index) {
		try {
			return this.options.getKey?.(item, index) ?? String(index);
		} catch (error) {
			this.dispatch(EVENTS.error, {
				instance: this,
				error
			});
			return String(index);
		}
	}
	updateActiveDescendant() {
		if (this.options.navigation === "none" || this.getTotalCount() <= 0) {
			this.restoreManagedAttribute(this.viewport, ATTRIBUTES.activeDescendant);
			return;
		}
		const activeElement = this.itemsContainer.querySelector(`[data-a11y-virtual-list-index="${this.activeIndex}"]`);
		if (isHTMLElement(activeElement)) this.setManagedAttribute(this.viewport, ATTRIBUTES.activeDescendant, activeElement.id);
		else this.setManagedAttribute(this.viewport, ATTRIBUTES.activeDescendant, null);
	}
	scheduleStatusUpdate() {
		if (!this.status || !this.options.announceRange) return;
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
	updateStatus() {
		if (!this.status || !this.options.announceRange) return;
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
		this.status.textContent = `Showing items ${start}–${end} of ${this.numberFormatter.format(totalCount)}`;
	}
	scheduleScrollSave() {
		this.clearTimer("scrollSave");
		this.scrollSaveTimerId = this.getWindow().setTimeout(() => {
			this.scrollSaveTimerId = 0;
			this.root.classList.remove(CLASSES.scrolling);
			if (this.options.restoreScroll) this.saveScrollPosition();
		}, Math.max(120, this.options.announceDebounce));
	}
	clearTimer(name) {
		const timerId = name === "announce" ? this.announceTimerId : this.scrollSaveTimerId;
		if (timerId === 0) return;
		this.getWindow().clearTimeout(timerId);
		if (name === "announce") this.announceTimerId = 0;
		else this.scrollSaveTimerId = 0;
	}
	scheduleMeasurement() {
		if (this.measurementFrameId !== 0) return;
		this.measurementFrameId = this.getWindow().requestAnimationFrame(() => {
			this.measurementFrameId = 0;
			this.measureRenderedItems();
		});
	}
	measureRenderedItems() {
		if (!this.isInitialized || this.options.rowHeightMode !== "estimated") return;
		let changed = false;
		Array.from(this.itemsContainer.children).filter(isHTMLElement).forEach((child) => {
			const index = this.readItemIndex(child);
			if (index < 0) return;
			const measuredHeight = clampNumber(Math.round(child.getBoundingClientRect().height || child.offsetHeight || this.options.rowHeight), this.options.minRowHeight, this.options.maxRowHeight);
			if (this.measuredHeights.get(index) !== measuredHeight) {
				this.measuredHeights.set(index, measuredHeight);
				changed = true;
			}
		});
		if (!changed) return;
		this.recalculateEstimatedSize();
	}
	recalculateEstimatedSize() {
		if (this.measuredHeights.size > 0) {
			const totalMeasuredHeight = Array.from(this.measuredHeights.values()).reduce((sum, height) => sum + height, 0);
			this.averageMeasuredHeight = totalMeasuredHeight / this.measuredHeights.size;
		}
		this.spacer.style.setProperty("--_total-size", `${this.getTotalSize()}px`);
		this.itemsContainer.style.setProperty("--_offset", `${this.getEstimatedOffset(this.renderedRange.startIndex)}px`);
	}
	observeRenderedItems() {
		if (this.options.rowHeightMode !== "estimated" || typeof ResizeObserver === "undefined") {
			this.itemResizeObserver?.disconnect();
			this.itemResizeObserver = null;
			return;
		}
		this.itemResizeObserver?.disconnect();
		this.itemResizeObserver = new ResizeObserver(() => this.measureRenderedItems());
		Array.from(this.itemsContainer.children).filter(isHTMLElement).forEach((child) => this.itemResizeObserver?.observe(child));
	}
	getEstimatedItemHeight(index) {
		return this.measuredHeights.get(index) ?? (this.averageMeasuredHeight || this.options.rowHeight);
	}
	getEstimatedOffset(index) {
		const totalCount = this.getTotalCount();
		const targetIndex = Number.isFinite(index) ? clampNumber(Math.round(index), 0, totalCount) : 0;
		const estimatedHeight = this.averageMeasuredHeight || this.options.rowHeight;
		let offset = targetIndex * estimatedHeight;
		this.measuredHeights.forEach((height, measuredIndex) => {
			if (measuredIndex >= 0 && measuredIndex < targetIndex) offset += height - estimatedHeight;
		});
		return Math.round(offset);
	}
	getEstimatedIndexAtOffset(offset) {
		const totalCount = this.getTotalCount();
		if (totalCount <= 0) return 0;
		const safeOffset = Number.isFinite(offset) ? Math.max(0, offset) : 0;
		if (safeOffset <= 0) return 0;
		if (safeOffset >= this.getEstimatedOffset(totalCount)) return totalCount - 1;
		let low = 0;
		let high = totalCount - 1;
		while (low < high) {
			const mid = Math.floor((low + high) / 2);
			if (this.getEstimatedOffset(mid + 1) > safeOffset) high = mid;
			else low = mid + 1;
		}
		return low;
	}
	getFocusedItemIndex() {
		const activeElement = this.root.ownerDocument.activeElement;
		if (!isElement(activeElement) || !this.itemsContainer.contains(activeElement)) return -1;
		const item = activeElement.closest(SELECTORS.item);
		return isHTMLElement(item) ? this.readItemIndex(item) : -1;
	}
	captureFocusedItemState() {
		if (!this.options.preserveFocusedItem) return null;
		const activeElement = this.root.ownerDocument.activeElement;
		if (!isHTMLElement(activeElement) || !this.itemsContainer.contains(activeElement)) return null;
		const row = activeElement.closest(SELECTORS.item);
		if (!isHTMLElement(row)) return null;
		const index = this.readItemIndex(row);
		const key = row.dataset.a11yVirtualListKey;
		if (index < 0 || key === void 0) return null;
		return {
			key,
			index,
			descendantIndex: Array.from(row.querySelectorAll(INTERACTIVE_CONTROL_SELECTOR)).indexOf(activeElement),
			focusWasOnRow: activeElement === row
		};
	}
	prepareFocusRestore(focusedItemState) {
		if (!focusedItemState || !this.options.preserveFocusedItem) return null;
		if (this.getTotalCount() <= 0) return {
			...focusedItemState,
			targetIndex: -1
		};
		const keyIndex = this.items.findIndex((item, index) => this.getItemKey(item, index) === focusedItemState.key);
		return {
			...focusedItemState,
			targetIndex: keyIndex >= 0 ? keyIndex : this.clampIndex(focusedItemState.index)
		};
	}
	restorePendingFocus() {
		const focusState = this.pendingFocusRestore;
		if (!focusState) return;
		this.pendingFocusRestore = null;
		if (focusState.targetIndex < 0) {
			this.viewport.focus({ preventScroll: true });
			return;
		}
		const row = this.itemsContainer.querySelector(`[data-a11y-virtual-list-index="${focusState.targetIndex}"]`);
		if (!isHTMLElement(row)) {
			this.viewport.focus({ preventScroll: true });
			return;
		}
		if (focusState.focusWasOnRow && row.tabIndex >= 0) {
			row.focus({ preventScroll: true });
			row.classList.add(CLASSES.itemFocused);
			return;
		}
		const replacement = Array.from(row.querySelectorAll(INTERACTIVE_CONTROL_SELECTOR))[focusState.descendantIndex];
		if (replacement) {
			replacement.focus({ preventScroll: true });
			row.classList.add(CLASSES.itemFocused);
			return;
		}
		this.viewport.focus({ preventScroll: true });
	}
	isFocusInsideItem(index) {
		const activeElement = this.root.ownerDocument.activeElement;
		if (!isElement(activeElement)) return false;
		const item = this.itemsContainer.querySelector(`[data-a11y-virtual-list-index="${index}"]`);
		return isHTMLElement(item) && item.contains(activeElement);
	}
	shouldPreserveItem(index) {
		return index >= 0 && this.options.preserveFocusedItem && this.isFocusInsideItem(index);
	}
	ensureIndexVisible(index, align = "nearest") {
		this.scrollToIndex(index, align);
	}
	readItemIndex(element) {
		const rawIndex = element.dataset.a11yVirtualListIndex;
		const index = rawIndex ? Number.parseInt(rawIndex, 10) : NaN;
		return Number.isFinite(index) ? index : -1;
	}
	getTotalCount() {
		return Math.max(0, this.options.totalCount === null ? this.items.length : Math.max(this.options.totalCount, this.items.length));
	}
	getTotalSize() {
		const totalCount = this.getTotalCount();
		if (this.options.rowHeightMode === "estimated") return this.getEstimatedOffset(totalCount);
		return totalCount * this.options.rowHeight;
	}
	getItemOffset(index) {
		if (this.options.rowHeightMode === "estimated") return this.getEstimatedOffset(index);
		return index * this.options.rowHeight;
	}
	getItemSize(index) {
		if (this.options.rowHeightMode === "estimated") return this.getEstimatedItemHeight(index);
		return this.options.rowHeight;
	}
	getViewportHeight() {
		const rect = this.viewport.getBoundingClientRect();
		return Math.max(this.viewport.clientHeight, rect.height, this.options.rowHeight);
	}
	getVisibleCount() {
		return Math.max(1, Math.ceil(this.getViewportHeight() / this.options.rowHeight));
	}
	clampIndex(index) {
		const totalCount = this.getTotalCount();
		if (totalCount <= 0) return 0;
		return clampNumber(Math.round(index), 0, totalCount - 1);
	}
	isIndexInRange(index, range) {
		return index >= range.startIndex && index <= range.endIndex;
	}
	hasVisibleRangeChanged(previousRange, nextRange) {
		return previousRange.visibleStartIndex !== nextRange.visibleStartIndex || previousRange.visibleEndIndex !== nextRange.visibleEndIndex || previousRange.totalCount !== nextRange.totalCount;
	}
	getStorageKey() {
		return this.options.restoreKey === "" ? null : `${COMPONENT_NAME}:${this.options.restoreKey}`;
	}
	getStorage() {
		if (this.options.storage === "none" || this.options.restoreKey === "") return null;
		try {
			return this.options.storage === "local" ? this.getWindow().localStorage : this.getWindow().sessionStorage;
		} catch (error) {
			this.dispatch(EVENTS.error, {
				instance: this,
				error
			});
			return null;
		}
	}
};
function createVirtualList(root, options = {}) {
	return new A11yVirtualList(root, options);
}
function initVirtualListAll(options = {}) {
	if (typeof document === "undefined") return [];
	return Array.from(document.querySelectorAll(SELECTORS.root)).map((root) => createVirtualList(root, options));
}
//#endregion
export { A11yVirtualList, createVirtualList, initVirtualListAll };

//# sourceMappingURL=index.js.map