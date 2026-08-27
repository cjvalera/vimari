const linkHints = require("../Vimari Extension/js/link-hints.js");
const defaults = require("../Vimari Extension/json/defaultSettings.json");

describe("link hint actions", () => {
    function addVisibleLink(url) {
        const link = document.createElement("a");
        link.href = url;
        link.textContent = "Example";
        link.getClientRects = () => [{ top: 12, left: 12, width: 80, height: 20 }];
        document.body.appendChild(link);
        document.elementFromPoint = jest.fn(() => link);
        return link;
    }

    function pressHintKey(key) {
        const event = {
            key,
            keyCode: key.toUpperCase().charCodeAt(0),
            preventDefault: jest.fn(),
            stopPropagation: jest.fn()
        };
        linkHints.onKeyDownInLinkHintsMode(event);
        return event;
    }

    beforeEach(() => {
        document.body.innerHTML = "";
        global.settings = JSON.parse(JSON.stringify(defaults));
        global.currentZoomLevel = 100;
        global.linkHintCss = {};
        global.addCssToPage = jest.fn();
        global.overlays = { showStatus: jest.fn() };
        global.clipboardController = { copy: jest.fn(() => Promise.resolve(true)) };
        global.extensionCommunicator = {
            requestOpenLinkInBackground: jest.fn(() => Promise.resolve({ ok: true }))
        };
        linkHints.deactivateLinkHintsMode();
    });

    afterEach(() => linkHints.deactivateLinkHintsMode());

    it("keeps queued hints open while opening each link in the background", () => {
        addVisibleLink("https://example.com/queued");
        linkHints.activateLinkHintsModeWithQueue();
        const event = pressHintKey(defaults.linkHintCharacters[0]);

        expect(extensionCommunicator.requestOpenLinkInBackground)
            .toHaveBeenCalledWith("https://example.com/queued");
        expect(document.querySelector("#vimiumHintMarkerContainer")).not.toBeNull();
        expect(event.preventDefault).toHaveBeenCalled();
    });

    it("copies a hinted URL and exits hint mode", () => {
        addVisibleLink("https://example.com/copied");
        linkHints.activateLinkHintsModeToCopyUrl();
        pressHintKey(defaults.linkHintCharacters[0]);

        expect(clipboardController.copy).toHaveBeenCalledWith("https://example.com/copied", "Link URL");
        expect(extensionCommunicator.requestOpenLinkInBackground).not.toHaveBeenCalled();
        expect(document.querySelector("#vimiumHintMarkerContainer")).toBeNull();
    });
});
