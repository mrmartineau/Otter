//
//  ShareViewController.swift
//  Otter Share
//
//  Created by Zander Martineau on 20/02/2026.
//

import UIKit
import WebKit

// Share extension entry point:
// receives a URL from another app and opens Otter's bookmark UI in a web view.
class ShareViewController: UIViewController, WKNavigationDelegate, WKUIDelegate {

    private var webView: WKWebView!

    override func viewDidLoad() {
        super.viewDidLoad()

        view.backgroundColor = .systemBackground

        // Present as a resizable bottom sheet when supported.
        if let sheet = self.sheetPresentationController {
            sheet.detents = [.large()]
            sheet.prefersGrabberVisible = true
            sheet.prefersEdgeAttachedInCompactHeight = false
            if #available(iOS 16.0, *) {
                sheet.selectedDetentIdentifier = .large
            }
        }

        // Full-screen web view hosting the bookmark creation flow.
        webView = WKWebView(frame: .zero)
        webView.navigationDelegate = self
        webView.uiDelegate = self
        webView.scrollView.contentInsetAdjustmentBehavior = .never
        webView.translatesAutoresizingMaskIntoConstraints = false
        view.addSubview(webView)

        // Manual close control for dismissing the extension.
        let closeButton = UIButton(type: .system)
        closeButton.translatesAutoresizingMaskIntoConstraints = false

        // Use a plain configuration so we can control content insets and background.
        var config = UIButton.Configuration.plain()
        config.contentInsets = NSDirectionalEdgeInsets(top: 3, leading: 3, bottom: 3, trailing: 3)
        config.baseForegroundColor = .label
        config.image = UIImage(systemName: "xmark")
        config.preferredSymbolConfigurationForImage = UIImage.SymbolConfiguration(pointSize: 10, weight: .semibold)
        closeButton.configuration = config

        // Background styling to create a circular button with subtle border.
        closeButton.backgroundColor = .secondarySystemBackground
        closeButton.layer.cornerRadius = 13
        closeButton.layer.borderWidth = 1
        closeButton.layer.borderColor = UIColor.label.withAlphaComponent(0.15).cgColor
        closeButton.clipsToBounds = true

        closeButton.addTarget(self, action: #selector(cancel), for: .touchUpInside)
        view.addSubview(closeButton)

        NSLayoutConstraint.activate([
            webView.topAnchor.constraint(equalTo: view.topAnchor),
            webView.leadingAnchor.constraint(equalTo: view.leadingAnchor),
            webView.trailingAnchor.constraint(equalTo: view.trailingAnchor),
            webView.bottomAnchor.constraint(equalTo: view.bottomAnchor),

            // Move ~6pt down and ~6pt left from the previous placement.
            closeButton.topAnchor.constraint(equalTo: view.safeAreaLayoutGuide.topAnchor, constant: 14),
            closeButton.trailingAnchor.constraint(equalTo: view.safeAreaLayoutGuide.trailingAnchor, constant: -14),
            closeButton.widthAnchor.constraint(equalToConstant: 26),
            closeButton.heightAnchor.constraint(equalToConstant: 26),
        ])

        // Pull the shared URL from NSExtensionItem attachments, then open
        // Otter's new-bookmark route with that URL in the query string.
        extractURL { [weak self] url in
            guard let self = self, let url = url else {
                self?.close()
                return
            }
            let base = "https://otter.zander.wtf/new/bookmark?bookmarklet=true&url="
            let encoded = url.absoluteString.addingPercentEncoding(withAllowedCharacters: .urlQueryAllowed) ?? ""
            if let bookmarkURL = URL(string: base + encoded) {
                self.webView.load(URLRequest(url: bookmarkURL))
            }
        }
    }

    private func extractURL(completion: @escaping (URL?) -> Void) {
        // Share extensions receive data through extensionContext input items.
        guard let items = extensionContext?.inputItems as? [NSExtensionItem] else {
            completion(nil)
            return
        }

        for item in items {
            guard let attachments = item.attachments else { continue }
            for provider in attachments {
                // Prefer URL payloads from any attachment provider.
                if provider.hasItemConformingToTypeIdentifier("public.url") {
                    provider.loadItem(forTypeIdentifier: "public.url", options: nil) { data, _ in
                        DispatchQueue.main.async {
                            // UI and completion handling stay on main thread.
                            completion(data as? URL)
                        }
                    }
                    return
                }
            }
        }
        completion(nil)
    }

    @objc private func cancel() {
        close()
    }

    private func close() {
        // Signals to the host app that the extension finished successfully.
        extensionContext?.completeRequest(returningItems: nil, completionHandler: nil)
    }
}

// MARK: - WKNavigationDelegate & WKUIDelegate
extension ShareViewController {
    // Allow navigation within the web view, but open external links in the system browser.
    func webView(_ webView: WKWebView, decidePolicyFor navigationAction: WKNavigationAction, decisionHandler: @escaping (WKNavigationActionPolicy) -> Void) {
        // Only intercept user-initiated link activations.
        if navigationAction.navigationType == .linkActivated, let url = navigationAction.request.url {
            // Attempt to open externally. In an extension, use the shared application via selector to avoid direct API restrictions.
            #if os(iOS)
            // Use UIApplication if available (Share extension has limited APIs, so performSelector to avoid direct reference).
            if let app = NSClassFromString("UIApplication")?.value(forKeyPath: "sharedApplication") as? NSObject,
               app.responds(to: NSSelectorFromString("openURL:")) {
                _ = app.perform(NSSelectorFromString("openURL:"), with: url)
            }
            #elseif os(macOS)
            NSWorkspace.shared.open(url)
            #endif
            decisionHandler(.cancel)
            return
        }
        decisionHandler(.allow)
    }
    // Handle target=_blank or window.open by opening externally instead of creating a new web view.
    func webView(_ webView: WKWebView, createWebViewWith configuration: WKWebViewConfiguration, for navigationAction: WKNavigationAction, windowFeatures: WKWindowFeatures) -> WKWebView? {
        if let url = navigationAction.request.url {
            #if os(iOS)
            if let app = NSClassFromString("UIApplication")?.value(forKeyPath: "sharedApplication") as? NSObject,
               app.responds(to: NSSelectorFromString("openURL:")) {
                _ = app.perform(NSSelectorFromString("openURL:"), with: url)
            }
            #elseif os(macOS)
            NSWorkspace.shared.open(url)
            #endif
        }
        return nil
    }
}

