const VimkitSettings = require("../Vimkit Extension/js/settings.js");
const defaults = require("../Vimkit Extension/json/defaultSettings.json");

describe("Vimkit settings", () => {
    beforeEach(() => {
        jest.clearAllMocks();
        __vimkitMocks.storedSettings.settings = JSON.parse(JSON.stringify(defaults));
    });

    it("merges partial settings with defaults and nested bindings", () => {
        const merged = VimkitSettings.merge(defaults, {
            scrollSize: 300,
            bindings: { scrollDown: "n" }
        });

        expect(merged.scrollSize).toBe(300);
        expect(merged.bindings.scrollDown).toBe("n");
        expect(merged.bindings.scrollUp).toBe(defaults.bindings.scrollUp);
        expect(merged.bindings.enterFindMode).toBe("/");
        expect(merged.bindings.restoreTab).toBe("shift+x");
    });

    it("accepts strings and arrays for bindings", () => {
        const result = VimkitSettings.validate({
            bindings: {
                scrollDown: ["j", "ctrl+j"]
            }
        }, defaults);

        expect(result.valid).toBe(true);
        expect(result.value.bindings.scrollDown).toEqual(["j", "ctrl+j"]);
    });

    it("rejects invalid field types and empty bindings", () => {
        const result = VimkitSettings.validate({
            smoothScroll: "yes",
            bindings: { scrollDown: [] }
        }, defaults);

        expect(result.valid).toBe(false);
        expect(result.errors).toContain("smoothScroll must be true or false.");
        expect(result.errors[1]).toContain("bindings.scrollDown");
    });

    it("rejects a non-object bindings value", () => {
        const result = VimkitSettings.validate({ bindings: [] }, defaults);

        expect(result.valid).toBe(false);
        expect(result.errors).toContain("bindings must be a JSON object.");
    });

    it("saves validated settings and resets defaults", async () => {
        const saved = await VimkitSettings.save({ scrollSize: 220 });
        expect(saved.scrollSize).toBe(220);
        expect(browser.storage.local.set).toHaveBeenCalledWith({ settings: saved });

        const reset = await VimkitSettings.reset();
        expect(reset).toEqual(defaults);
        expect(browser.storage.local.set).toHaveBeenLastCalledWith({ settings: defaults });
    });
});
