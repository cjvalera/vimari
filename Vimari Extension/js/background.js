const VimariAction = Object.freeze({
    nextTab: "tabs.next",
    previousTab: "tabs.previous",
    closeTab: "tabs.close",
    openBackgroundTab: "tabs.openBackground"
});

function requireSenderTab(sender) {
    if (!sender || !sender.tab || sender.tab.id == null || sender.tab.windowId == null) {
        throw new Error("The request did not originate from a browser tab.");
    }

    return sender.tab;
}

async function activateRelativeTab(sender, offset) {
    const currentTab = requireSenderTab(sender);
    const tabs = await browser.tabs.query({ windowId: currentTab.windowId });

    if (tabs.length === 0) {
        throw new Error("No tabs are available in the current window.");
    }

    const currentIndex = tabs.findIndex(tab => tab.id === currentTab.id);
    if (currentIndex < 0) {
        throw new Error("The current tab is no longer available.");
    }

    const nextIndex = (currentIndex + offset + tabs.length) % tabs.length;
    if (tabs[nextIndex].id !== currentTab.id) {
        await browser.tabs.update(tabs[nextIndex].id, { active: true });
    }
}

async function handleRuntimeMessage(request, sender) {
    try {
        switch (request && request.action) {
        case VimariAction.nextTab:
            await activateRelativeTab(sender, 1);
            break;
        case VimariAction.previousTab:
            await activateRelativeTab(sender, -1);
            break;
        case VimariAction.closeTab: {
            const currentTab = requireSenderTab(sender);
            await browser.tabs.remove(currentTab.id);
            break;
        }
        case VimariAction.openBackgroundTab: {
            const currentTab = requireSenderTab(sender);
            if (typeof request.url !== "string" || request.url.trim().length === 0) {
                throw new Error("A valid URL is required.");
            }

            new URL(request.url);
            await browser.tabs.create({
                url: request.url,
                active: false,
                windowId: currentTab.windowId
            });
            break;
        }
        default:
            throw new Error(`Unsupported action: ${request && request.action}`);
        }

        return { ok: true };
    } catch (error) {
        return {
            ok: false,
            error: error instanceof Error ? error.message : String(error)
        };
    }
}

browser.runtime.onMessage.addListener(handleRuntimeMessage);
browser.action.onClicked.addListener(() => browser.runtime.openOptionsPage());

if (typeof module !== "undefined") {
    module.exports = {
        VimariAction,
        activateRelativeTab,
        handleRuntimeMessage,
        requireSenderTab
    };
}
