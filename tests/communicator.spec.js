const WebExtensionCommunicator = require("../Vimari Extension/js/WebExtensionCommunicator.js");

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
            [{ action: "tabs.next" }],
            [{ action: "tabs.previous" }],
            [{ action: "tabs.close" }],
            [{ action: "tabs.openBackground", url: "https://example.com" }]
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
