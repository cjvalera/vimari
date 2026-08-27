module.exports = {
  testEnvironment: "jsdom",
  setupFiles: [
    "./Vimari Extension/js/mocks.js",
    "./Vimari Extension/js/lib/mousetrap.js",
    "./Vimari Extension/js/settings.js",
    "./Vimari Extension/js/WebExtensionCommunicator.js",
    "./Vimari Extension/js/content-features.js",
    "./Vimari Extension/js/keyboard-utils.js",
    "./Vimari Extension/js/link-hints.js",
    "./Vimari Extension/js/injected.js"
  ]
};
