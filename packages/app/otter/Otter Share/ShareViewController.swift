//
//  ShareViewController.swift
//  Otter Share
//
//  Created by Zander Martineau on 20/02/2026.
//

import SwiftUI
import UIKit
import UniformTypeIdentifiers

// Share extension entry point: takes the shared URL and saves it through
// Otter's REST API, reusing the credentials the app stored in the shared
// keychain.
class ShareViewController: UIViewController {

    override func viewDidLoad() {
        super.viewDidLoad()

        view.backgroundColor = .systemBackground

        if let sheet = sheetPresentationController {
            sheet.detents = [.medium(), .large()]
            sheet.prefersGrabberVisible = true
        }

        extractURL { [weak self] url in
            guard let self else { return }

            guard let url else {
                self.close()
                return
            }

            self.present(url: url.absoluteString)
        }
    }

    private func present(url: String) {
        let hosting = UIHostingController(
            rootView: BookmarkFormView(
                url: url,
                onOpenApp: { [weak self] in
                    // Extensions can't use UIApplication.open, so hand the URL to
                    // the host via the extension context.
                    guard let self, let appURL = URL(string: "otter://") else { return }
                    self.extensionContext?.open(appURL)
                    self.close()
                }
            ) { [weak self] _ in
                self?.close()
            }
        )

        addChild(hosting)
        hosting.view.translatesAutoresizingMaskIntoConstraints = false
        view.addSubview(hosting.view)

        NSLayoutConstraint.activate([
            hosting.view.topAnchor.constraint(equalTo: view.topAnchor),
            hosting.view.leadingAnchor.constraint(equalTo: view.leadingAnchor),
            hosting.view.trailingAnchor.constraint(equalTo: view.trailingAnchor),
            hosting.view.bottomAnchor.constraint(equalTo: view.bottomAnchor),
        ])

        hosting.didMove(toParent: self)
    }

    private func extractURL(completion: @escaping (URL?) -> Void) {
        // Share extensions receive data through extensionContext input items.
        guard let items = extensionContext?.inputItems as? [NSExtensionItem] else {
            completion(nil)
            return
        }

        for item in items {
            for provider in item.attachments ?? [] {
                guard provider.hasItemConformingToTypeIdentifier(UTType.url.identifier) else {
                    continue
                }

                provider.loadItem(forTypeIdentifier: UTType.url.identifier) { data, _ in
                    DispatchQueue.main.async {
                        completion(data as? URL)
                    }
                }
                return
            }
        }

        completion(nil)
    }

    private func close() {
        // Signals to the host app that the extension finished successfully.
        extensionContext?.completeRequest(returningItems: nil, completionHandler: nil)
    }
}
