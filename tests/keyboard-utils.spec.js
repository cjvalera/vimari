const { getKeyChar, isEscape } = require("../Vimkit Extension/js/keyboard-utils.js");

describe("keyboard utilities", () => {
    it("uses modern KeyboardEvent.key values for Orion and Safari", () => {
        expect(getKeyChar({ key: "A" })).toBe("a");
        expect(getKeyChar({ key: "ArrowDown" })).toBe("down");
        expect(getKeyChar({ key: "Backspace" })).toBe("backspace");
    });

    it("recognizes modern Escape and the Ctrl-[ alias", () => {
        expect(isEscape({ key: "Escape", keyCode: 0 })).toBe(true);
        expect(isEscape({ key: "[", keyCode: 0, ctrlKey: true })).toBe(true);
    });

    it("retains the legacy keyIdentifier fallback", () => {
        expect(getKeyChar({ keyIdentifier: "U+0046", keyCode: 70, shiftKey: false })).toBe("f");
    });
});
