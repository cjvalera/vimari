const {
    MAX_CLOSED_TABS,
    STATE_KEY,
    cacheClosedTab,
    handleRuntimeMessage,
    initializeState,
    preferredStorageArea,
    recordActivation,
    requireSenderTab
} = require("../Vimari Extension/js/background.js");
const background = require("../Vimari Extension/js/background.js");

describe("WebExtension background actions", () => {
    const sender = { tab: { id: 2, windowId: 8 } };

    beforeEach(() => {
        jest.clearAllMocks();
        background.state.activationHistory = {};
        background.state.closedTabs = [];
        Object.keys(__vimariMocks.storedSession).forEach(key => delete __vimariMocks.storedSession[key]);
    });

    it("moves to the next tab and wraps", async () => {
        browser.tabs.query.mockResolvedValue([
            { id: 1, windowId: 8, index: 0 },
            { id: 2, windowId: 8, index: 1 },
            { id: 3, windowId: 8, index: 2 }
        ]);

        await expect(handleRuntimeMessage({ action: "tabs.next" }, sender)).resolves.toEqual({ ok: true });
        expect(browser.tabs.query).toHaveBeenCalledWith({ windowId: 8 });
        expect(browser.tabs.update).toHaveBeenCalledWith(3, { active: true });

        await handleRuntimeMessage({ action: "tabs.next" }, { tab: { id: 3, windowId: 8 } });
        expect(browser.tabs.update).toHaveBeenLastCalledWith(1, { active: true });

        await handleRuntimeMessage({ action: "tabs.next", count: 2 }, sender);
        expect(browser.tabs.update).toHaveBeenLastCalledWith(1, { active: true });
    });

    it("moves to the previous tab and wraps", async () => {
        browser.tabs.query.mockResolvedValue([
            { id: 1, windowId: 8, index: 0 },
            { id: 2, windowId: 8, index: 1 },
            { id: 3, windowId: 8, index: 2 }
        ]);

        await handleRuntimeMessage({ action: "tabs.previous" }, { tab: { id: 1, windowId: 8 } });
        expect(browser.tabs.update).toHaveBeenCalledWith(3, { active: true });
    });

    it("does not reactivate the only tab", async () => {
        browser.tabs.query.mockResolvedValue([{ id: 2, windowId: 8 }]);

        await handleRuntimeMessage({ action: "tabs.next" }, sender);
        expect(browser.tabs.update).not.toHaveBeenCalled();
    });

    it("closes the sender tab", async () => {
        await expect(handleRuntimeMessage({ action: "tabs.close" }, sender)).resolves.toEqual({ ok: true });
        expect(browser.tabs.remove).toHaveBeenCalledWith(2);
    });

    it("activates first, last, direct, and previous-active tabs", async () => {
        browser.tabs.query.mockResolvedValue([
            { id: 1, windowId: 8, index: 0, title: "One", url: "https://one.test" },
            { id: 2, windowId: 8, index: 1, title: "Two", url: "https://two.test" },
            { id: 3, windowId: 8, index: 2, title: "Three", url: "https://three.test" }
        ]);
        await handleRuntimeMessage({ action: "tabs.first" }, sender);
        expect(browser.tabs.update).toHaveBeenLastCalledWith(1, { active: true });
        await handleRuntimeMessage({ action: "tabs.last" }, sender);
        expect(browser.tabs.update).toHaveBeenLastCalledWith(3, { active: true });
        await handleRuntimeMessage({ action: "tabs.activateIndex", index: 1 }, sender);
        expect(browser.tabs.update).toHaveBeenLastCalledWith(2, { active: true });

        await recordActivation({ tabId: 1, windowId: 8 });
        await recordActivation({ tabId: 2, windowId: 8 });
        await handleRuntimeMessage({ action: "tabs.previousActive" }, sender);
        expect(browser.tabs.update).toHaveBeenLastCalledWith(1, { active: true });
    });

    it("lists and activates only tabs in the sender window", async () => {
        browser.tabs.query.mockResolvedValue([
            { id: 2, windowId: 8, index: 0, title: "Docs", url: "https://docs.test" },
            { id: 9, windowId: 8, index: 1, title: "Mail", url: "https://mail.test" }
        ]);
        await expect(handleRuntimeMessage({ action: "tabs.list" }, sender)).resolves.toEqual({
            ok: true,
            tabs: [
                { id: 2, title: "Docs", url: "https://docs.test" },
                { id: 9, title: "Mail", url: "https://mail.test" }
            ]
        });
        await handleRuntimeMessage({ action: "tabs.activate", tabId: 9 }, sender);
        expect(browser.tabs.update).toHaveBeenCalledWith(9, { active: true });
        await expect(handleRuntimeMessage({ action: "tabs.activate", tabId: 99 }, sender))
            .resolves.toMatchObject({ ok: false });
    });

    it("opens a URL in a background tab in the sender window", async () => {
        await expect(handleRuntimeMessage({
            action: "tabs.openBackground",
            url: "https://example.com/path"
        }, sender)).resolves.toEqual({ ok: true });

        expect(browser.tabs.create).toHaveBeenCalledWith({
            url: "https://example.com/path",
            active: false,
            windowId: 8
        });
    });

    it("uses native create and duplicate tab APIs", async () => {
        await handleRuntimeMessage({ action: "tabs.create", url: "https://example.com/new" }, sender);
        expect(browser.tabs.create).toHaveBeenCalledWith({
            url: "https://example.com/new", active: true, windowId: 8
        });
        await handleRuntimeMessage({ action: "tabs.duplicate" }, sender);
        expect(browser.tabs.duplicate).toHaveBeenCalledWith(2);

        const duplicate = browser.tabs.duplicate;
        browser.tabs.duplicate = undefined;
        await expect(handleRuntimeMessage({ action: "tabs.duplicate" }, sender))
            .resolves.toEqual({ ok: true });
        expect(browser.tabs.create).toHaveBeenLastCalledWith({
            url: "https://example.com/",
            active: true,
            windowId: 8,
            index: 2
        });
        browser.tabs.duplicate = duplicate;
    });

    it("caps closed-tab state and restores URL plus approximate position", async () => {
        for (let index = 0; index < MAX_CLOSED_TABS + 2; index += 1) {
            await cacheClosedTab({
                id: index, windowId: 8, index, title: `Tab ${index}`, url: `https://example.com/${index}`
            });
        }
        expect(background.state.closedTabs).toHaveLength(MAX_CLOSED_TABS);
        await handleRuntimeMessage({ action: "tabs.restore" }, sender);
        expect(browser.tabs.create).toHaveBeenCalledWith({
            url: `https://example.com/${MAX_CLOSED_TABS + 1}`,
            active: true,
            windowId: 8,
            index: MAX_CLOSED_TABS + 1
        });
        expect(background.state.closedTabs).toHaveLength(MAX_CLOSED_TABS - 1);
    });

    it("falls back to a new window context when the cached window is gone", async () => {
        await cacheClosedTab({ windowId: 99, index: 3, url: "https://restore.test" });
        browser.tabs.create.mockRejectedValueOnce(new Error("window missing")).mockResolvedValueOnce();
        await expect(handleRuntimeMessage({ action: "tabs.restore" }, sender)).resolves.toEqual({ ok: true });
        expect(browser.tabs.create).toHaveBeenLastCalledWith({ url: "https://restore.test", active: true });
    });

    it("hydrates persisted state after a service-worker restart and prefers session storage", async () => {
        __vimariMocks.storedSession[STATE_KEY] = {
            activationHistory: { 8: [7, 2] },
            closedTabs: [{ url: "https://persisted.test", windowId: 8, index: 1 }]
        };
        expect(preferredStorageArea()).toBe(browser.storage.session);
        await initializeState();
        expect(background.state.activationHistory[8]).toEqual([7, 2]);
        expect(background.state.closedTabs[0].url).toBe("https://persisted.test");
    });

    it("returns errors for malformed requests", async () => {
        await expect(handleRuntimeMessage({ action: "tabs.openBackground", url: "not a url" }, sender))
            .resolves.toMatchObject({ ok: false });
        await expect(handleRuntimeMessage({ action: "tabs.close" }, {}))
            .resolves.toEqual({ ok: false, error: "The request did not originate from a browser tab." });
        expect(() => requireSenderTab({})).toThrow("did not originate");
    });
});
