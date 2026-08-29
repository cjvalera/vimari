const VimkitAction = Object.freeze({
    activateTab: "tabs.activate",
    activateTabIndex: "tabs.activateIndex",
    closeTab: "tabs.close",
    createTab: "tabs.create",
    duplicateTab: "tabs.duplicate",
    firstTab: "tabs.first",
    lastTab: "tabs.last",
    listTabs: "tabs.list",
    nextTab: "tabs.next",
    openBackgroundTab: "tabs.openBackground",
    previousActiveTab: "tabs.previousActive",
    previousTab: "tabs.previous",
    restoreTab: "tabs.restore"
});

const STATE_KEY = "vimkitTabState";
const MAX_CLOSED_TABS = 10;
const MAX_ACTIVATION_HISTORY = 20;
const tabSnapshots = new Map();
const explicitlyClosedTabs = new Set();
let state = { activationHistory: {}, closedTabs: [] };

function hasFunction(object, name) {
    return Boolean(object && typeof object[name] === "function");
}

function preferredStorageArea() {
    if (browser.storage && browser.storage.session &&
        hasFunction(browser.storage.session, "get") && hasFunction(browser.storage.session, "set")) {
        return browser.storage.session;
    }
    return browser.storage && browser.storage.local;
}

async function readPersistedState() {
    const preferred = preferredStorageArea();
    try {
        const stored = preferred && await preferred.get(STATE_KEY);
        return stored && stored[STATE_KEY];
    } catch (_error) {
        if (preferred !== browser.storage.local && browser.storage.local) {
            const stored = await browser.storage.local.get(STATE_KEY);
            return stored && stored[STATE_KEY];
        }
        return null;
    }
}

async function persistState() {
    const value = { [STATE_KEY]: state };
    const preferred = preferredStorageArea();
    try {
        if (preferred) await preferred.set(value);
    } catch (_error) {
        if (preferred !== browser.storage.local && browser.storage.local) await browser.storage.local.set(value);
    }
}

function snapshotTab(tab) {
    if (!tab || tab.id == null) return;
    const previous = tabSnapshots.get(tab.id) || {};
    tabSnapshots.set(tab.id, Object.assign({}, previous, {
        id: tab.id,
        index: Number.isInteger(tab.index) ? tab.index : previous.index,
        title: typeof tab.title === "string" ? tab.title : previous.title,
        url: typeof tab.url === "string" ? tab.url : previous.url,
        windowId: tab.windowId == null ? previous.windowId : tab.windowId
    }));
}

function isRestorableUrl(url) {
    return typeof url === "string" && url.length > 0 && url !== "about:blank";
}

async function cacheClosedTab(tab) {
    if (!tab || !isRestorableUrl(tab.url)) return null;
    const closedTab = {
        url: tab.url,
        title: tab.title || "",
        index: Number.isInteger(tab.index) ? tab.index : undefined,
        windowId: tab.windowId,
        closedAt: Date.now()
    };
    state.closedTabs.unshift(closedTab);
    state.closedTabs = state.closedTabs.slice(0, MAX_CLOSED_TABS);
    await persistState();
    return closedTab;
}

async function recordActivation(activeInfo) {
    if (!activeInfo || activeInfo.tabId == null || activeInfo.windowId == null) return;
    const key = String(activeInfo.windowId);
    const history = (state.activationHistory[key] || []).filter(id => id !== activeInfo.tabId);
    history.unshift(activeInfo.tabId);
    state.activationHistory[key] = history.slice(0, MAX_ACTIVATION_HISTORY);
    if (hasFunction(browser.tabs, "get")) {
        try { snapshotTab(await browser.tabs.get(activeInfo.tabId)); } catch (_error) { /* Tab disappeared. */ }
    }
    await persistState();
}

async function initializeState() {
    const stored = await readPersistedState();
    if (stored && typeof stored === "object") {
        state.activationHistory = stored.activationHistory && typeof stored.activationHistory === "object"
            ? stored.activationHistory : {};
        state.closedTabs = Array.isArray(stored.closedTabs) ? stored.closedTabs.slice(0, MAX_CLOSED_TABS) : [];
    }
    if (hasFunction(browser.tabs, "query")) {
        try {
            const tabs = await browser.tabs.query({});
            tabs.forEach(tab => {
                snapshotTab(tab);
                if (tab.active && tab.windowId != null) {
                    const key = String(tab.windowId);
                    const history = (state.activationHistory[key] || []).filter(id => id !== tab.id);
                    state.activationHistory[key] = [tab.id].concat(history).slice(0, MAX_ACTIVATION_HISTORY);
                }
            });
        } catch (_error) { /* Some implementations reject an empty query. */ }
    }
}

const stateReady = initializeState().catch(error => {
    console.error("Unable to initialize Vimkit tab state:", error);
});

function requireSenderTab(sender) {
    if (!sender || !sender.tab || sender.tab.id == null || sender.tab.windowId == null) {
        throw new Error("The request did not originate from a browser tab.");
    }
    return sender.tab;
}

async function tabsInSenderWindow(sender) {
    const currentTab = requireSenderTab(sender);
    if (!hasFunction(browser.tabs, "query")) throw new Error("Tab queries are not supported by this browser.");
    const tabs = await browser.tabs.query({ windowId: currentTab.windowId });
    if (!tabs.length) throw new Error("No tabs are available in the current window.");
    tabs.forEach(snapshotTab);
    return { currentTab, tabs: tabs.slice().sort((a, b) => a.index - b.index) };
}

async function activateRelativeTab(sender, offset) {
    const { currentTab, tabs } = await tabsInSenderWindow(sender);
    const currentIndex = tabs.findIndex(tab => tab.id === currentTab.id);
    if (currentIndex < 0) throw new Error("The current tab is no longer available.");
    const normalizedOffset = Number.isFinite(offset) ? Math.trunc(offset) : 1;
    const nextIndex = ((currentIndex + normalizedOffset) % tabs.length + tabs.length) % tabs.length;
    if (tabs[nextIndex].id !== currentTab.id) await browser.tabs.update(tabs[nextIndex].id, { active: true });
}

async function activateTabIndex(sender, index) {
    const { tabs } = await tabsInSenderWindow(sender);
    const normalized = Math.max(0, Math.min(tabs.length - 1, Math.trunc(index)));
    await browser.tabs.update(tabs[normalized].id, { active: true });
}

async function activatePreviousTab(sender) {
    const currentTab = requireSenderTab(sender);
    const { tabs } = await tabsInSenderWindow(sender);
    const available = new Set(tabs.map(tab => tab.id));
    const history = state.activationHistory[String(currentTab.windowId)] || [];
    const previousId = history.find(id => id !== currentTab.id && available.has(id));
    if (previousId == null) throw new Error("No previously active tab is available.");
    await browser.tabs.update(previousId, { active: true });
}

async function getCurrentTab(sender) {
    const senderTab = requireSenderTab(sender);
    if (senderTab.url) return senderTab;
    if (hasFunction(browser.tabs, "get")) return browser.tabs.get(senderTab.id);
    const { tabs } = await tabsInSenderWindow(sender);
    return tabs.find(tab => tab.id === senderTab.id) || senderTab;
}

function requireUrl(url) {
    if (typeof url !== "string" || url.trim().length === 0) throw new Error("A valid URL is required.");
    new URL(url);
    return url;
}

async function restoreLastTab() {
    await stateReady;
    const restored = state.closedTabs.shift();
    if (!restored) throw new Error("There is no recently closed tab to restore.");
    const createProperties = { url: restored.url, active: true };
    if (restored.windowId != null) createProperties.windowId = restored.windowId;
    if (Number.isInteger(restored.index)) createProperties.index = restored.index;
    try {
        await browser.tabs.create(createProperties);
    } catch (error) {
        try {
            await browser.tabs.create({ url: restored.url, active: true });
        } catch (_fallbackError) {
            state.closedTabs.unshift(restored);
            throw error;
        }
    }
    await persistState();
}

async function handleRuntimeMessage(request, sender) {
    try {
        await stateReady;
        switch (request && request.action) {
        case VimkitAction.nextTab:
            await activateRelativeTab(sender, Math.max(1, Math.trunc(request.count || 1)));
            break;
        case VimkitAction.previousTab:
            await activateRelativeTab(sender, -Math.max(1, Math.trunc(request.count || 1)));
            break;
        case VimkitAction.activateTabIndex:
            await activateTabIndex(sender, Number(request.index));
            break;
        case VimkitAction.firstTab:
            await activateTabIndex(sender, 0);
            break;
        case VimkitAction.lastTab: {
            const { tabs } = await tabsInSenderWindow(sender);
            await browser.tabs.update(tabs[tabs.length - 1].id, { active: true });
            break;
        }
        case VimkitAction.previousActiveTab:
            await activatePreviousTab(sender);
            break;
        case VimkitAction.listTabs: {
            const { tabs } = await tabsInSenderWindow(sender);
            return { ok: true, tabs: tabs.map(tab => ({ id: tab.id, title: tab.title || "", url: tab.url || "" })) };
        }
        case VimkitAction.activateTab: {
            const { tabs } = await tabsInSenderWindow(sender);
            const requested = tabs.find(tab => tab.id === request.tabId);
            if (!requested) throw new Error("The selected tab is no longer available.");
            await browser.tabs.update(requested.id, { active: true });
            break;
        }
        case VimkitAction.closeTab: {
            const currentTab = await getCurrentTab(sender);
            const cachedTab = await cacheClosedTab(currentTab);
            explicitlyClosedTabs.add(currentTab.id);
            try { await browser.tabs.remove(currentTab.id); }
            catch (error) {
                explicitlyClosedTabs.delete(currentTab.id);
                if (cachedTab) {
                    state.closedTabs = state.closedTabs.filter(item => item !== cachedTab);
                    await persistState();
                }
                throw error;
            }
            break;
        }
        case VimkitAction.openBackgroundTab: {
            const currentTab = requireSenderTab(sender);
            await browser.tabs.create({ url: requireUrl(request.url), active: false, windowId: currentTab.windowId });
            break;
        }
        case VimkitAction.createTab: {
            const currentTab = requireSenderTab(sender);
            await browser.tabs.create({ url: requireUrl(request.url), active: true, windowId: currentTab.windowId });
            break;
        }
        case VimkitAction.duplicateTab: {
            const currentTab = await getCurrentTab(sender);
            if (hasFunction(browser.tabs, "duplicate")) {
                await browser.tabs.duplicate(currentTab.id);
            } else {
                const createProperties = {
                    url: requireUrl(currentTab.url),
                    active: true,
                    windowId: currentTab.windowId
                };
                if (Number.isInteger(currentTab.index)) createProperties.index = currentTab.index + 1;
                await browser.tabs.create(createProperties);
            }
            break;
        }
        case VimkitAction.restoreTab:
            await restoreLastTab();
            break;
        default:
            throw new Error(`Unsupported action: ${request && request.action}`);
        }
        return { ok: true };
    } catch (error) {
        return { ok: false, error: error instanceof Error ? error.message : String(error) };
    }
}

if (browser.runtime && browser.runtime.onMessage) browser.runtime.onMessage.addListener(handleRuntimeMessage);
if (browser.action && browser.action.onClicked) browser.action.onClicked.addListener(() => browser.runtime.openOptionsPage());
if (browser.tabs.onCreated) browser.tabs.onCreated.addListener(snapshotTab);
if (browser.tabs.onUpdated) browser.tabs.onUpdated.addListener((tabId, changeInfo, tab) => snapshotTab(tab || Object.assign({ id: tabId }, changeInfo)));
if (browser.tabs.onActivated) browser.tabs.onActivated.addListener(activeInfo => {
    recordActivation(activeInfo).catch(error => console.error("Unable to store Vimkit tab activation:", error));
});
if (browser.tabs.onRemoved) browser.tabs.onRemoved.addListener((tabId, removeInfo) => {
    const snapshot = tabSnapshots.get(tabId);
    tabSnapshots.delete(tabId);
    Object.keys(state.activationHistory).forEach(key => {
        state.activationHistory[key] = state.activationHistory[key].filter(id => id !== tabId);
    });
    if (explicitlyClosedTabs.delete(tabId) || (removeInfo && removeInfo.isWindowClosing)) {
        persistState().catch(() => {});
        return;
    }
    cacheClosedTab(snapshot).catch(error => console.error("Unable to cache a closed Vimkit tab:", error));
});

if (typeof module !== "undefined") {
    module.exports = {
        MAX_CLOSED_TABS,
        STATE_KEY,
        VimkitAction,
        activateRelativeTab,
        activateTabIndex,
        cacheClosedTab,
        handleRuntimeMessage,
        initializeState,
        preferredStorageArea,
        recordActivation,
        requireSenderTab,
        snapshotTab,
        state
    };
}
