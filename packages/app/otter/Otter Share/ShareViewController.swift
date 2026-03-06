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
class ShareViewController: UIViewController {

    private var webView: WKWebView!

    override func viewDidLoad() {
        super.viewDidLoad()

        view.backgroundColor = .systemBackground

        // Present as a resizable bottom sheet when supported.
        if let sheet = self.sheetPresentationController {
            sheet.detents = [.medium(), .large()]
            sheet.prefersGrabberVisible = true
            sheet.prefersEdgeAttachedInCompactHeight = true
        }

        // Full-screen web view hosting the bookmark creation flow.
        webView = WKWebView(frame: .zero)
        webView.translatesAutoresizingMaskIntoConstraints = false
        view.addSubview(webView)

        // Manual close control for dismissing the extension.
        let closeButton = UIButton(type: .close)
        closeButton.translatesAutoresizingMaskIntoConstraints = false
        closeButton.backgroundColor = .secondarySystemBackground
        // Match the 26x26 frame below so the control stays perfectly circular.
        closeButton.layer.cornerRadius = 13
        closeButton.layer.borderWidth = 1
        closeButton.layer.borderColor = UIColor.label.withAlphaComponent(0.15).cgColor
        // Shrink the xmark and add breathing room from the border.
        closeButton.setPreferredSymbolConfiguration(
            UIImage.SymbolConfiguration(pointSize: 10, weight: .semibold),
            forImageIn: .normal
        )
        closeButton.contentEdgeInsets = UIEdgeInsets(top: 3, left: 3, bottom: 3, right: 3)
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
