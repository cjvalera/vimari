const defaultSettings = require("../json/defaultSettings.json");

const listeners = [];
const storedSettings = { settings: JSON.parse(JSON.stringify(defaultSettings)) };
const storedSession = {};
const tabListeners = {
    activated: [],
    created: [],
    removed: [],
    updated: []
};

function eventMock(collection) {
    return {
        addListener: jest.fn(listener => collection.push(listener)),
        removeListener: jest.fn(listener => {
            const index = collection.indexOf(listener);
            if (index >= 0) collection.splice(index, 1);
        })
    };
}

global.fetch = jest.fn(() => Promise.resolve({
    ok: true,
    json: () => Promise.resolve(JSON.parse(JSON.stringify(defaultSettings)))
}));

global.browser = {
    action: {
        onClicked: { addListener: jest.fn() }
    },
    runtime: {
        getURL: jest.fn(path => `safari-web-extension://vimari/${path}`),
        onMessage: { addListener: jest.fn() },
        openOptionsPage: jest.fn(() => Promise.resolve()),
        sendMessage: jest.fn(() => Promise.resolve({ ok: true }))
    },
    storage: {
        session: {
            get: jest.fn(key => Promise.resolve(key ? { [key]: storedSession[key] } : JSON.parse(JSON.stringify(storedSession)))),
            set: jest.fn(value => {
                Object.assign(storedSession, JSON.parse(JSON.stringify(value)));
                return Promise.resolve();
            })
        },
        local: {
            get: jest.fn(key => {
                if (typeof key === "string") return Promise.resolve({ [key]: storedSettings[key] });
                return Promise.resolve(JSON.parse(JSON.stringify(storedSettings)));
            }),
            set: jest.fn(value => {
                Object.assign(storedSettings, JSON.parse(JSON.stringify(value)));
                return Promise.resolve();
            })
        },
        onChanged: {
            addListener: jest.fn(listener => listeners.push(listener)),
            removeListener: jest.fn(listener => {
                const index = listeners.indexOf(listener);
                if (index >= 0) listeners.splice(index, 1);
            })
        }
    },
    tabs: {
        create: jest.fn(() => Promise.resolve()),
        duplicate: jest.fn(() => Promise.resolve()),
        get: jest.fn(id => Promise.resolve({ id, windowId: 8, index: 1, title: "Tab", url: "https://example.com/" })),
        onActivated: eventMock(tabListeners.activated),
        onCreated: eventMock(tabListeners.created),
        onRemoved: eventMock(tabListeners.removed),
        onUpdated: eventMock(tabListeners.updated),
        query: jest.fn(() => Promise.resolve([])),
        remove: jest.fn(() => Promise.resolve()),
        update: jest.fn(() => Promise.resolve())
    }
};

global.__vimariMocks = { defaultSettings, listeners, storedSession, storedSettings, tabListeners };
