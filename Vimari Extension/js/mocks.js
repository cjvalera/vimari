const defaultSettings = require("../json/defaultSettings.json");

const listeners = [];
const storedSettings = { settings: JSON.parse(JSON.stringify(defaultSettings)) };

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
        local: {
            get: jest.fn(() => Promise.resolve(JSON.parse(JSON.stringify(storedSettings)))),
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
        query: jest.fn(() => Promise.resolve([])),
        remove: jest.fn(() => Promise.resolve()),
        update: jest.fn(() => Promise.resolve())
    }
};

global.__vimariMocks = { defaultSettings, listeners, storedSettings };
