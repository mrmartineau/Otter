//
//  BookmarksView.swift
//  iOS (App)
//

import SwiftUI

struct BookmarksView: View {
    @ObservedObject var model: OtterAppModel

    var body: some View {
        NavigationStack {
            BookmarkFeedView(
                source: .all,
                emptyMessage: "Save a link from Safari or with the + button."
            )
            .id(model.feedReloadToken)
            .navigationDestination(for: BookmarkFeedSource.self) { source in
                BookmarkFeedView(
                    source: source,
                    emptyMessage: "Nothing saved with this tag."
                )
            }
        }
    }
}
