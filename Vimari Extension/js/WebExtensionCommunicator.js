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
            requestTabForward: function (count) {
                return send("tabs.next", { count: count || 1 });
            },
            requestTabBackward: function (count) {
                return send("tabs.previous", { count: count || 1 });
            },
            requestCloseTab: function () {
                return send("tabs.close");
            },
            requestOpenLinkInBackground: function (url) {
                return send("tabs.openBackground", { url: url });
            },
            requestCreateTab: function (url) {
                return send("tabs.create", { url: url });
            },
            requestDuplicateTab: function () {
                return send("tabs.duplicate");
            },
            requestFirstTab: function () {
                return send("tabs.first");
            },
            requestLastTab: function () {
                return send("tabs.last");
            },
            requestTabIndex: function (index) {
                return send("tabs.activateIndex", { index: index });
            },
            requestPreviousActiveTab: function () {
                return send("tabs.previousActive");
            },
            requestTabs: function () {
                return send("tabs.list");
            },
            requestActivateTab: function (tabId) {
                return send("tabs.activate", { tabId: tabId });
            },
            requestRestoreTab: function () {
                return send("tabs.restore");
            }
        };
    };
})();

if (typeof module !== "undefined") {
    module.exports = WebExtensionCommunicator;
    global.WebExtensionCommunicator = WebExtensionCommunicator;
}
