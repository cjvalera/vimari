const {
    CommandDispatcher,
    applyGlobalModifier,
    eventToToken,
    normalizeBinding
} = require("../Vimari Extension/js/command-dispatcher.js");

describe("CommandDispatcher", () => {
    beforeEach(() => jest.useFakeTimers());
    afterEach(() => jest.useRealTimers());

    function createDispatcher() {
        return new CommandDispatcher({ timeout: 1000 });
    }

    it("normalizes legacy bindings and keyboard events", () => {
        expect(normalizeBinding("g shift+G")).toEqual(["g", "shift+g"]);
        expect(applyGlobalModifier("g g", "ctrl")).toEqual(["ctrl+g", "g"]);
        expect(eventToToken({ key: "G", shiftKey: true })).toBe("shift+g");
        expect(eventToToken({ key: "?", shiftKey: true })).toBe("?");
        expect(eventToToken({ key: "ArrowDown" })).toBe("down");
        expect(eventToToken({ key: "ƒ", code: "KeyF", altKey: true })).toBe("alt+f");
    });

    it("supports strings, arrays, sequences, and global modifiers", () => {
        const called = jest.fn();
        const dispatcher = createDispatcher();
        dispatcher.register("top", ["g g", "home"], called, "ctrl");

        expect(dispatcher.handleToken("ctrl+g")).toBe(true);
        dispatcher.handleToken("g");
        expect(called).toHaveBeenCalledWith(expect.objectContaining({ binding: "ctrl+g g" }));
    });

    it("resolves overlapping commands after the timeout", () => {
        const short = jest.fn();
        const long = jest.fn();
        const dispatcher = createDispatcher();
        dispatcher.register("short", "g", short);
        dispatcher.register("long", "g g", long);

        dispatcher.handleToken("g");
        expect(short).not.toHaveBeenCalled();
        jest.advanceTimersByTime(999);
        expect(short).not.toHaveBeenCalled();
        dispatcher.handleToken("g");
        expect(long).toHaveBeenCalledTimes(1);
        expect(short).not.toHaveBeenCalled();

        dispatcher.handleToken("g");
        jest.advanceTimersByTime(1000);
        expect(short).toHaveBeenCalledTimes(1);
    });

    it("keeps gg, g0, and gt distinct", () => {
        const results = [];
        const dispatcher = createDispatcher();
        dispatcher.register("top", "g g", () => results.push("top"));
        dispatcher.register("first", "g 0", () => results.push("first"));
        dispatcher.register("next", "g t", () => results.push("next"));

        dispatcher.handleToken("g"); dispatcher.handleToken("0");
        dispatcher.handleToken("g"); dispatcher.handleToken("t");
        dispatcher.handleToken("g"); dispatcher.handleToken("g");
        expect(results).toEqual(["first", "next", "top"]);
    });

    it("applies bounded count prefixes while zero remains a command key", () => {
        const called = jest.fn();
        const zero = jest.fn();
        const dispatcher = createDispatcher();
        dispatcher.register("scroll", "j", called);
        dispatcher.register("zero", "0", zero);

        dispatcher.handleToken("1"); dispatcher.handleToken("2"); dispatcher.handleToken("0"); dispatcher.handleToken("j");
        expect(called).toHaveBeenCalledWith(expect.objectContaining({ count: 120, countProvided: true }));
        dispatcher.handleToken("9"); dispatcher.handleToken("9"); dispatcher.handleToken("9"); dispatcher.handleToken("9"); dispatcher.handleToken("j");
        expect(called).toHaveBeenLastCalledWith(expect.objectContaining({ count: 999 }));
        dispatcher.handleToken("0");
        expect(zero).toHaveBeenCalledTimes(1);
    });

    it("cancels pending counts and sequences with Escape", () => {
        const called = jest.fn();
        const dispatcher = createDispatcher();
        dispatcher.register("top", "g g", called);
        dispatcher.handleToken("3");
        expect(dispatcher.handleToken("esc")).toBe(true);
        dispatcher.handleToken("g");
        dispatcher.handleToken("esc");
        jest.advanceTimersByTime(1000);
        expect(called).not.toHaveBeenCalled();
    });

    it("expires incomplete counts and sequences", () => {
        const called = jest.fn();
        const dispatcher = createDispatcher();
        dispatcher.register("top", "g g", called);
        dispatcher.handleToken("4");
        jest.advanceTimersByTime(1000);
        dispatcher.handleToken("j");
        dispatcher.handleToken("g");
        jest.advanceTimersByTime(1000);
        dispatcher.handleToken("g");
        expect(called).not.toHaveBeenCalled();
    });
});
