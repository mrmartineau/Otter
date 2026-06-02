//
//  ShareViewController.swift
//  Otter Share
//
//  Share-extension entry point: receives a URL from another app and opens
//  Otter's new-bookmark flow in a web view. Ported from the existing native
//  Otter app (packages/app/otter) so behaviour stays identical.
//

import UIKit
import WebKit

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
            sheet.selectedDetentIdentifier = .large
        }

        // Persist cookies so a session logged-in in the main app carries over.
        let config = WKWebViewConfiguration()
        config.websiteDataStore = .default()

        // Full-screen web view hosting the bookmark creation flow.
        webView = WKWebView(frame: .zero, configuration: config)
        webView.navigationDelegate = self
        webView.uiDelegate = self
        webView.scrollView.contentInsetAdjustmentBehavior = .never
        webView.translatesAutoresizingMaskIntoConstraints = false
        view.addSubview(webView)

        // Manual close control for dismissing the extension.
        let closeButton = UIButton(type: .system)
        closeButton.translatesAutoresizingMaskIntoConstraints = false

        var buttonConfig = UIButton.Configuration.plain()
        buttonConfig.contentInsets = NSDirectionalEdgeInsets(top: 3, leading: 3, bottom: 3, trailing: 3)
        buttonConfig.baseForegroundColor = .label
        buttonConfig.image = UIImage(systemName: "xmark")
        buttonConfig.preferredSymbolConfigurationForImage = UIImage.SymbolConfiguration(pointSize: 10, weight: .semibold)
        closeButton.configuration = buttonConfig

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
        guard let items = extensionContext?.inputItems as? [NSExtensionItem] else {
            completion(nil)
            return
        }

        for item in items {
            guard let attachments = item.attachments else { continue }
            for provider in attachments {
                if provider.hasItemConformingToTypeIdentifier("public.url") {
                    provider.loadItem(forTypeIdentifier: "public.url", options: nil) { data, _ in
                        DispatchQueue.main.async {
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
        extensionContext?.completeRequest(returningItems: nil, completionHandler: nil)
    }
}

// MARK: - WKNavigationDelegate & WKUIDelegate
extension ShareViewController {
    // Allow navigation within the web view, but open external links in Safari.
    func webView(_ webView: WKWebView, decidePolicyFor navigationAction: WKNavigationAction, decisionHandler: @escaping (WKNavigationActionPolicy) -> Void) {
        if navigationAction.navigationType == .linkActivated, let url = navigationAction.request.url {
            // Share extensions have limited APIs; reach UIApplication via selector.
            if let app = NSClassFromString("UIApplication")?.value(forKeyPath: "sharedApplication") as? NSObject,
               app.responds(to: NSSelectorFromString("openURL:")) {
                _ = app.perform(NSSelectorFromString("openURL:"), with: url)
            }
            decisionHandler(.cancel)
            return
        }
        decisionHandler(.allow)
    }

    // Handle target=_blank / window.open by opening externally.
    func webView(_ webView: WKWebView, createWebViewWith configuration: WKWebViewConfiguration, for navigationAction: WKNavigationAction, windowFeatures: WKWindowFeatures) -> WKWebView? {
        if let url = navigationAction.request.url {
            if let app = NSClassFromString("UIApplication")?.value(forKeyPath: "sharedApplication") as? NSObject,
               app.responds(to: NSSelectorFromString("openURL:")) {
                _ = app.perform(NSSelectorFromString("openURL:"), with: url)
            }
        }
        return nil
    }
}
