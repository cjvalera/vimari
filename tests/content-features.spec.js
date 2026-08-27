const {
    ClipboardController,
    FindMode,
    OverlayManager,
    TabPicker,
    parentUrl,
    visibleTextMatches
} = require("../Vimari Extension/js/content-features.js");

describe("content features", () => {
    function makeVisible(element) {
        element.getClientRects = () => [{ top: 0, left: 0, width: 20, height: 10 }];
        element.scrollIntoView = jest.fn();
    }

    beforeEach(() => {
        document.body.innerHTML = "";
        jest.restoreAllMocks();
    });

    it("finds visible DOM text while excluding controls and hidden/script content", () => {
        document.body.innerHTML = `<p>Alpha beta alpha</p><div style="display:none">alpha</div><script>alpha</script><textarea>alpha</textarea>`;
        makeVisible(document.querySelector("p"));
        document.querySelector("div").getClientRects = () => [{ top: 0 }];
        expect(visibleTextMatches(document, window, "ALPHA")).toHaveLength(2);
    });

    it("updates incrementally and wraps forward and backward across dynamic DOM", () => {
        document.body.innerHTML = "<p>one match and another match</p>";
        makeVisible(document.querySelector("p"));
        const overlays = new OverlayManager(document, window);
        const find = new FindMode(document, window, overlays);
        find.open();
        find.update("match");
        expect(find.matches).toHaveLength(2);
        expect(find.index).toBe(0);
        find.move(-1);
        expect(find.index).toBe(1);
        find.move(1);
        expect(find.index).toBe(0);

        const added = document.createElement("p");
        added.textContent = "dynamic match";
        makeVisible(added);
        document.body.appendChild(added);
        find.move(1);
        expect(find.matches).toHaveLength(3);
        find.close();
    });

    it("shows a no-match state and closes on Escape", () => {
        document.body.innerHTML = "<p>only hay</p>";
        makeVisible(document.querySelector("p"));
        const find = new FindMode(document, window, new OverlayManager(document, window));
        find.open();
        find.update("needle");
        expect(find.count.textContent).toBe("No matches");
        find.input.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape", bubbles: true }));
        expect(find.isOpen()).toBe(false);
    });

    it("uses the async clipboard and then the textarea fallback", async () => {
        const overlays = { showStatus: jest.fn() };
        const navigatorObject = { clipboard: { writeText: jest.fn().mockResolvedValue() } };
        const clipboard = new ClipboardController(document, navigatorObject, overlays);
        await expect(clipboard.copy("https://example.com", "URL")).resolves.toBe(true);
        expect(navigatorObject.clipboard.writeText).toHaveBeenCalledWith("https://example.com");

        navigatorObject.clipboard.writeText.mockRejectedValue(new Error("denied"));
        document.execCommand = jest.fn(() => true);
        await expect(clipboard.copy("fallback", "Link")).resolves.toBe(true);
        expect(document.execCommand).toHaveBeenCalledWith("copy");
        expect(document.querySelector("textarea")).toBeNull();
    });

    it("computes parent and origin URLs without retaining search or hash", () => {
        expect(parentUrl("https://example.com/a/b/?q=1#hash", false)).toBe("https://example.com/a/");
        expect(parentUrl("https://example.com/a", false)).toBe("https://example.com/");
        expect(parentUrl("https://example.com/a/b", true)).toBe("https://example.com/");
    });

    it("filters the tab picker by title and URL and activates a result", () => {
        const overlays = new OverlayManager(document, window);
        const picker = new TabPicker(document, overlays);
        const select = jest.fn();
        picker.open([
            { id: 1, title: "Documentation", url: "https://docs.example.com" },
            { id: 2, title: "Inbox", url: "https://mail.example.com" }
        ], select);
        const root = picker.host.shadowRoot;
        const input = root.querySelector("input");
        input.value = "mail";
        input.dispatchEvent(new Event("input", { bubbles: true }));
        expect(root.querySelectorAll("button.tab")).toHaveLength(1);
        root.querySelector("button.tab").click();
        expect(select).toHaveBeenCalledWith(expect.objectContaining({ id: 2 }));
        expect(picker.host).toBeNull();
    });

    it("reports a visible clipboard error when both paths fail", async () => {
        const overlays = { showStatus: jest.fn() };
        document.execCommand = jest.fn(() => false);
        const clipboard = new ClipboardController(document, {}, overlays);
        await expect(clipboard.copy("nope", "URL")).resolves.toBe(false);
        expect(overlays.showStatus).toHaveBeenCalledWith(expect.stringContaining("clipboard"), "error");
    });
});
