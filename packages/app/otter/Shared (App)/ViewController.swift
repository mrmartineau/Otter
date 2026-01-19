//
//  ViewController.swift
//  Shared (App)
//
//  Created by Zander Martineau on 08/10/2025.
//

import WebKit

#if os(iOS)
import UIKit
typealias PlatformViewController = UIViewController
#elseif os(macOS)
import Cocoa
import SafariServices
typealias PlatformViewController = NSViewController
#endif

/// Bundle identifier for the Safari Web Extension
let extensionBundleIdentifier = "zander.martineau.otter.Extension"

/// Main view controller for the Otter Safari Extension app that manages the web-based UI
/// and handles communication between the app and Safari extension system.
class ViewController: PlatformViewController, WKNavigationDelegate, WKScriptMessageHandler {

    /// The web view that displays the extension's HTML interface
    @IBOutlet var webView: WKWebView!

    /// Called after the controller's view is loaded into memory
    override func viewDidLoad() {
        super.viewDidLoad()

        // Set up web view navigation delegate to handle page load events
        self.webView.navigationDelegate = self

#if os(iOS)
        // Disable scrolling on iOS to maintain fixed layout
        self.webView.scrollView.isScrollEnabled = false
#endif

        // Add message handler to receive messages from JavaScript
        self.webView.configuration.userContentController.add(self, name: "controller")

        // Load the main HTML file from the app bundle
        self.webView.loadFileURL(Bundle.main.url(forResource: "Main", withExtension: "html")!, allowingReadAccessTo: Bundle.main.resourceURL!)
    }

    /// Called when the web view finishes loading a page
    /// - Parameters:
    ///   - webView: The web view that finished loading
    ///   - navigation: The navigation object for the load operation
    func webView(_ webView: WKWebView, didFinish navigation: WKNavigation!) {
#if os(iOS)
        // Initialize the UI for iOS platform
        webView.evaluateJavaScript("show('ios')")
#elseif os(macOS)
        // Initialize the UI for macOS platform
        webView.evaluateJavaScript("show('mac')")

        // Check the current state of the Safari extension
        SFSafariExtensionManager.getStateOfSafariExtension(withIdentifier: extensionBundleIdentifier) { (state, error) in
            guard let state = state, error == nil else {
                // Insert code to inform the user that something went wrong.
                return
            }

            DispatchQueue.main.async {
                // Update UI based on extension state and macOS version
                // macOS 13+ uses "Settings" instead of "Preferences"
                if #available(macOS 13, *) {
                    webView.evaluateJavaScript("show('mac', \(state.isEnabled), true)")
                } else {
                    webView.evaluateJavaScript("show('mac', \(state.isEnabled), false)")
                }
            }
        }
#endif
    }

    /// Handles messages received from JavaScript in the web view
    /// - Parameters:
    ///   - userContentController: The user content controller that received the message
    ///   - message: The script message containing the message body and other information
    func userContentController(_ userContentController: WKUserContentController, didReceive message: WKScriptMessage) {
#if os(macOS)
        // Only handle "open-preferences" messages on macOS
        if (message.body as! String != "open-preferences") {
            return
        }

        // Open Safari preferences/settings for the extension
        SFSafariApplication.showPreferencesForExtension(withIdentifier: extensionBundleIdentifier) { error in
            guard error == nil else {
                // Insert code to inform the user that something went wrong.
                return
            }

            // Terminate the app after opening preferences
            DispatchQueue.main.async {
                NSApp.terminate(self)
            }
        }
#endif
    }

}
