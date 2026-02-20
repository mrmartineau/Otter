//
//  ShareViewController.swift
//  Otter Share
//
//  Created by Zander Martineau on 20/02/2026.
//

import UIKit
import WebKit

class ShareViewController: UIViewController {

    private var webView: WKWebView!

    override func viewDidLoad() {
        super.viewDidLoad()

        view.backgroundColor = .systemBackground

        if let sheet = self.sheetPresentationController {
            sheet.detents = [.medium(), .large()]
            sheet.prefersGrabberVisible = true
            sheet.prefersEdgeAttachedInCompactHeight = true
        }

        webView = WKWebView(frame: .zero)
        webView.translatesAutoresizingMaskIntoConstraints = false
        view.addSubview(webView)

        let closeButton = UIButton(type: .close)
        closeButton.translatesAutoresizingMaskIntoConstraints = false
        closeButton.addTarget(self, action: #selector(cancel), for: .touchUpInside)
        view.addSubview(closeButton)

        NSLayoutConstraint.activate([
            webView.topAnchor.constraint(equalTo: view.topAnchor),
            webView.leadingAnchor.constraint(equalTo: view.leadingAnchor),
            webView.trailingAnchor.constraint(equalTo: view.trailingAnchor),
            webView.bottomAnchor.constraint(equalTo: view.bottomAnchor),

            closeButton.topAnchor.constraint(equalTo: view.safeAreaLayoutGuide.topAnchor, constant: 8),
            closeButton.trailingAnchor.constraint(equalTo: view.safeAreaLayoutGuide.trailingAnchor, constant: -8),
        ])

        extractURL { [weak self] url in
            guard let self = self, let url = url else {
                self?.close()
                return
            }
            let base = "https://otter3.zander.wtf/new/bookmark?bookmarklet=true&url="
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
