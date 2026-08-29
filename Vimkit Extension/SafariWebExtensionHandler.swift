import SafariServices

final class SafariWebExtensionHandler: NSObject, NSExtensionRequestHandling {
    func beginRequest(with context: NSExtensionContext) {
        // Vimkit uses standard WebExtension APIs and does not require native messaging.
        context.completeRequest(returningItems: nil)
    }
}
