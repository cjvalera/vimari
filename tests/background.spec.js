const {
    handleRuntimeMessage,
    requireSenderTab
} = require("../Vimari Extension/js/background.js");

describe("WebExtension background actions", () => {
    const sender = { tab: { id: 2, windowId: 8 } };

    beforeEach(() => {
        jest.clearAllMocks();
    });

    it("moves to the next tab and wraps", async () => {
        browser.tabs.query.mockResolvedValue([
            { id: 1, windowId: 8 },
            { id: 2, windowId: 8 },
            { id: 3, windowId: 8 }
        ]);

        await expect(handleRuntimeMessage({ action: "tabs.next" }, sender)).resolves.toEqual({ ok: true });
        expect(browser.tabs.query).toHaveBeenCalledWith({ windowId: 8 });
        expect(browser.tabs.update).toHaveBeenCalledWith(3, { active: true });

        await handleRuntimeMessage({ action: "tabs.next" }, { tab: { id: 3, windowId: 8 } });
        expect(browser.tabs.update).toHaveBeenLastCalledWith(1, { active: true });
    });

    it("moves to the previous tab and wraps", async () => {
        browser.tabs.query.mockResolvedValue([
            { id: 1, windowId: 8 },
            { id: 2, windowId: 8 },
            { id: 3, windowId: 8 }
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

    it("returns errors for malformed requests", async () => {
        await expect(handleRuntimeMessage({ action: "tabs.openBackground", url: "not a url" }, sender))
            .resolves.toMatchObject({ ok: false });
        await expect(handleRuntimeMessage({ action: "tabs.close" }, {}))
            .resolves.toEqual({ ok: false, error: "The request did not originate from a browser tab." });
        expect(() => requireSenderTab({})).toThrow("did not originate");
    });
});
