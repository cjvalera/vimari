import Cocoa

@NSApplicationMain
class AppDelegate: NSObject, NSApplicationDelegate {
    private enum Link {
        static let help = "https://github.com/cjvalera/vimkit#usage"
        static let privacy = "https://github.com/cjvalera/vimkit/blob/master/PRIVACY.md"
        static let acknowledgments = "https://github.com/cjvalera/vimkit/blob/master/ACKNOWLEDGMENTS.md"
    }

    func applicationDidFinishLaunching(_: Notification) {
        // Insert code here to initialize your application
    }

    func applicationWillTerminate(_: Notification) {
        // Insert code here to tear down your application
    }

    func applicationShouldTerminateAfterLastWindowClosed(_: NSApplication) -> Bool {
        return true
    }

    private func open(_ urlString: String) {
        guard let url = URL(string: urlString) else { return }
        NSWorkspace.shared.open(url)
    }

    @IBAction func openHelpUrl(_ sender: Any) {
        open(Link.help)
    }

    @IBAction func openPrivacyPolicy(_ sender: Any) {
        open(Link.privacy)
    }

    @IBAction func openAcknowledgments(_ sender: Any) {
        open(Link.acknowledgments)
    }
}
