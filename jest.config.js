module.exports = {
  testEnvironment: "jsdom",
  setupFiles: [
    "./Vimari Extension/js/mocks.js",
    "./Vimari Extension/js/lib/mousetrap.js",
    "./Vimari Extension/js/settings.js",
    "./Vimari Extension/js/WebExtensionCommunicator.js",
    "./Vimari Extension/js/injected.js"
  ]
};
