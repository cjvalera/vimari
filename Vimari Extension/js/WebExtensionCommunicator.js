var WebExtensionCommunicator = (function () {
    "use strict";

    function send(action, details) {
        return browser.runtime.sendMessage(Object.assign({ action: action }, details || {}))
            .then(function (response) {
                if (!response || !response.ok) {
                    throw new Error(response && response.error ? response.error : `Unable to perform ${action}.`);
                }
                return response;
            })
            .catch(function (error) {
                console.error("Vimari WebExtension request failed:", error);
                return { ok: false, error: error.message || String(error) };
            });
    }

    return function () {
        return {
            requestTabForward: function () {
                return send("tabs.next");
            },
            requestTabBackward: function () {
                return send("tabs.previous");
            },
            requestCloseTab: function () {
                return send("tabs.close");
            },
            requestOpenLinkInBackground: function (url) {
                return send("tabs.openBackground", { url: url });
            }
        };
    };
})();

if (typeof module !== "undefined") {
    module.exports = WebExtensionCommunicator;
    global.WebExtensionCommunicator = WebExtensionCommunicator;
}
