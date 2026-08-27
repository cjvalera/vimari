var VimariCommandDispatcher = (function () {
    "use strict";

    var MODIFIER_ORDER = ["ctrl", "alt", "meta", "shift"];

    function normalizeKeyName(key) {
        var aliases = {
            " ": "space",
            arrowdown: "down",
            arrowleft: "left",
            arrowright: "right",
            arrowup: "up",
            control: "ctrl",
            escape: "esc",
            esc: "esc",
            os: "meta"
        };
        var normalized = String(key || "").toLowerCase();
        return aliases[normalized] || normalized;
    }

    function normalizeToken(token) {
        var parts = String(token || "").trim().toLowerCase().split("+").filter(Boolean);
        if (parts.length === 0) return "";

        var key = normalizeKeyName(parts.pop());
        var modifiers = new Set(parts.map(normalizeKeyName));
        var ordered = MODIFIER_ORDER.filter(function (modifier) { return modifiers.has(modifier); });
        return ordered.concat(key).join("+");
    }

    function normalizeBinding(binding) {
        return String(binding || "")
            .trim()
            .split(/\s+/)
            .map(normalizeToken)
            .filter(Boolean);
    }

    function eventToToken(event) {
        var key = normalizeKeyName(event.key);
        // macOS Option combinations can report a composed character (for
        // example Option-F as ƒ). Recover the binding key from code so
        // Alt-based shortcuts remain portable between Safari and Orion.
        if (event.altKey && event.code && /^Key[A-Z]$/.test(event.code) && !/^[a-z]$/.test(key)) {
            key = event.code.slice(3).toLowerCase();
        }
        if (!key || MODIFIER_ORDER.indexOf(key) >= 0) return "";

        var modifiers = [];
        if (event.ctrlKey) modifiers.push("ctrl");
        if (event.altKey) modifiers.push("alt");
        if (event.metaKey) modifiers.push("meta");

        // Shift is represented explicitly for letters and named keys. For punctuation,
        // event.key already contains the shifted character (for example ? and ^).
        if (event.shiftKey && (/^[a-z]$/.test(key) || key.length > 1)) modifiers.push("shift");
        return modifiers.concat(key).join("+");
    }

    function applyGlobalModifier(binding, modifier) {
        var tokens = normalizeBinding(binding);
        var normalizedModifier = normalizeToken(modifier);
        if (!normalizedModifier || tokens.length === 0) return tokens;

        var modifierParts = normalizedModifier.split("+");
        var firstParts = tokens[0].split("+");
        var key = firstParts.pop();
        tokens[0] = MODIFIER_ORDER
            .filter(function (item) {
                return modifierParts.indexOf(item) >= 0 || firstParts.indexOf(item) >= 0;
            })
            .concat(key)
            .join("+");
        return tokens;
    }

    function createNode() {
        return { children: new Map(), command: null, binding: null };
    }

    function CommandDispatcher(options) {
        options = options || {};
        this.timeout = options.timeout == null ? 1000 : options.timeout;
        this.setTimer = options.setTimer || setTimeout;
        this.clearTimer = options.clearTimer || clearTimeout;
        this.onPending = options.onPending || function () {};
        this.root = createNode();
        this.reset();
    }

    CommandDispatcher.prototype.register = function (name, bindings, handler, modifier) {
        var self = this;
        var values = Array.isArray(bindings) ? bindings : [bindings];
        values.forEach(function (binding) {
            var tokens = applyGlobalModifier(binding, modifier);
            if (tokens.length === 0) return;
            var node = self.root;
            tokens.forEach(function (token) {
                if (!node.children.has(token)) node.children.set(token, createNode());
                node = node.children.get(token);
            });
            node.command = { name: name, handler: handler };
            node.binding = tokens.join(" ");
        });
    };

    CommandDispatcher.prototype.cancelTimer = function () {
        if (this.timer != null) this.clearTimer(this.timer);
        this.timer = null;
    };

    CommandDispatcher.prototype.reset = function () {
        this.cancelTimer();
        this.node = this.root;
        this.sequence = [];
        this.countText = "";
        this.onPending("");
    };

    CommandDispatcher.prototype.execute = function (node) {
        var countProvided = this.countText.length > 0;
        var count = countProvided ? Math.min(999, parseInt(this.countText, 10)) : 1;
        var meta = {
            binding: node.binding,
            count: count,
            countProvided: countProvided,
            sequence: this.sequence.slice()
        };
        var command = node.command;
        this.reset();
        command.handler(meta);
    };

    CommandDispatcher.prototype.scheduleExactMatch = function (node) {
        var self = this;
        this.cancelTimer();
        this.timer = this.setTimer(function () {
            self.timer = null;
            self.execute(node);
        }, this.timeout);
    };

    CommandDispatcher.prototype.scheduleCancellation = function () {
        var self = this;
        this.cancelTimer();
        this.timer = this.setTimer(function () { self.reset(); }, this.timeout);
    };

    CommandDispatcher.prototype.handleToken = function (token) {
        token = normalizeToken(token);
        if (!token) return false;
        if (token === "esc" || token === "ctrl+[") {
            var hadPendingInput = this.sequence.length > 0 || this.countText.length > 0;
            this.reset();
            return hadPendingInput;
        }

        if (this.sequence.length === 0 && /^\d$/.test(token)) {
            if (token === "0" && this.countText.length === 0) {
                // Zero is a command key unless a count is already in progress.
            } else {
                if (this.countText.length < 3) this.countText += token;
                this.onPending(this.countText);
                this.scheduleCancellation();
                return true;
            }
        }

        this.cancelTimer();
        var next = this.node.children.get(token);
        if (!next) {
            // A failed continuation should get one chance to start a new command.
            var rootNext = this.root.children.get(token);
            this.node = this.root;
            this.sequence = [];
            if (!rootNext) {
                this.countText = "";
                this.onPending("");
                return false;
            }
            next = rootNext;
        }

        this.node = next;
        this.sequence.push(token);
        this.onPending([this.countText].concat(this.sequence).filter(Boolean).join(" "));

        if (next.command && next.children.size === 0) {
            this.execute(next);
        } else if (next.command) {
            this.scheduleExactMatch(next);
        } else {
            this.scheduleCancellation();
        }
        return true;
    };

    CommandDispatcher.prototype.handleEvent = function (event) {
        return this.handleToken(eventToToken(event));
    };

    return {
        CommandDispatcher: CommandDispatcher,
        applyGlobalModifier: applyGlobalModifier,
        eventToToken: eventToToken,
        normalizeBinding: normalizeBinding,
        normalizeToken: normalizeToken
    };
})();

if (typeof module !== "undefined") {
    module.exports = VimariCommandDispatcher;
    global.VimariCommandDispatcher = VimariCommandDispatcher;
}
