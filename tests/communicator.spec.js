const WebExtensionCommunicator = require("../Vimkit Extension/js/WebExtensionCommunicator.js");

describe("WebExtension communicator", () => {
    beforeEach(() => {
        jest.clearAllMocks();
        browser.runtime.sendMessage.mockResolvedValue({ ok: true });
    });

    it("maps navigation methods to runtime actions", async () => {
        const communicator = WebExtensionCommunicator();

        await communicator.requestTabForward();
        await communicator.requestTabBackward();
        await communicator.requestCloseTab();
        await communicator.requestOpenLinkInBackground("https://example.com");

        expect(browser.runtime.sendMessage.mock.calls).toEqual([
            [{ action: "tabs.next", count: 1 }],
            [{ action: "tabs.previous", count: 1 }],
            [{ action: "tabs.close" }],
            [{ action: "tabs.openBackground", url: "https://example.com" }]
        ]);
    });

    it("maps the extended native tab operations", async () => {
        const communicator = WebExtensionCommunicator();
        await communicator.requestTabForward(3);
        await communicator.requestTabIndex(4);
        await communicator.requestFirstTab();
        await communicator.requestLastTab();
        await communicator.requestPreviousActiveTab();
        await communicator.requestCreateTab("https://example.com/new");
        await communicator.requestDuplicateTab();
        await communicator.requestTabs();
        await communicator.requestActivateTab(12);
        await communicator.requestRestoreTab();
        await communicator.requestMoveTab(-2);
        await communicator.requestReloadTab(true);

        expect(browser.runtime.sendMessage.mock.calls).toEqual([
            [{ action: "tabs.next", count: 3 }],
            [{ action: "tabs.activateIndex", index: 4 }],
            [{ action: "tabs.first" }],
            [{ action: "tabs.last" }],
            [{ action: "tabs.previousActive" }],
            [{ action: "tabs.create", url: "https://example.com/new" }],
            [{ action: "tabs.duplicate" }],
            [{ action: "tabs.list" }],
            [{ action: "tabs.activate", tabId: 12 }],
            [{ action: "tabs.restore" }],
            [{ action: "tabs.move", offset: -2 }],
            [{ action: "tabs.reload", bypassCache: true }]
        ]);
    });

    it("turns rejected actions into an error response", async () => {
        browser.runtime.sendMessage.mockRejectedValue(new Error("Safari unavailable"));

        await expect(WebExtensionCommunicator().requestCloseTab()).resolves.toEqual({
            ok: false,
            error: "Safari unavailable"
        });
    });
});
