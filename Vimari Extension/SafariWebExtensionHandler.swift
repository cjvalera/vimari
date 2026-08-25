import SafariServices

final class SafariWebExtensionHandler: NSObject, NSExtensionRequestHandling {
    func beginRequest(with context: NSExtensionContext) {
        // Vimari uses standard WebExtension APIs and does not require native messaging.
        context.completeRequest(returningItems: nil)
    }
}
