//
//  SaveRequestCenter.swift
//  iOS (App)
//
//  Collects "save this URL" requests that arrive before the UI exists — from
//  the `otter://save?url=…` scheme and the Save Bookmark app intent — and
//  replays them into the SwiftUI layer.
//

import Combine
import Foundation

@MainActor
final class SaveRequestCenter: ObservableObject {
    static let shared = SaveRequestCenter()

    @Published var isRequested = false
    @Published var url: String?

    private init() {
        NotificationCenter.default.addObserver(
            forName: .saveBookmark,
            object: nil,
            queue: .main
        ) { notification in
            let url = notification.userInfo?["url"] as? String
            Task { @MainActor in
                SaveRequestCenter.shared.request(url: url)
            }
        }
    }

    func request(url: String?) {
        self.url = url
        isRequested = true
    }

    func clear() {
        isRequested = false
        url = nil
    }
}
