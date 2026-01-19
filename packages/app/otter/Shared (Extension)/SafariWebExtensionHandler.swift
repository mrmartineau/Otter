//
//  SafariWebExtensionHandler.swift
//  Shared (Extension)
//
//  Created by Zander Martineau on 08/10/2025.
//

import SafariServices
import os.log

/// Handler for Safari Web Extension requests that processes messages from the browser extension
/// and provides responses back to the extension context.
class SafariWebExtensionHandler: NSObject, NSExtensionRequestHandling {

    /// Processes incoming requests from the Safari Web Extension
    /// - Parameter context: The extension context containing the request data
    func beginRequest(with context: NSExtensionContext) {
        // Extract the first input item from the request
        let request = context.inputItems.first as? NSExtensionItem

        // Extract the profile UUID using the appropriate key based on OS version
        let profile: UUID?
        if #available(iOS 17.0, macOS 14.0, *) {
            profile = request?.userInfo?[SFExtensionProfileKey] as? UUID
        } else {
            profile = request?.userInfo?["profile"] as? UUID
        }

        // Extract the message content using the appropriate key based on OS version
        let message: Any?
        if #available(iOS 15.0, macOS 11.0, *) {
            message = request?.userInfo?[SFExtensionMessageKey]
        } else {
            message = request?.userInfo?["message"]
        }

        // Log the received message and profile information
        os_log(.default, "Received message from browser.runtime.sendNativeMessage: %@ (profile: %@)", String(describing: message), profile?.uuidString ?? "none")

        // Create a response that echoes back the received message
        let response = NSExtensionItem()
        if #available(iOS 15.0, macOS 11.0, *) {
            response.userInfo = [ SFExtensionMessageKey: [ "echo": message ] ]
        } else {
            response.userInfo = [ "message": [ "echo": message ] ]
        }

        // Complete the request by returning the response
        context.completeRequest(returningItems: [ response ], completionHandler: nil)
    }

}
