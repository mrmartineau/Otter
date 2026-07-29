//
//  MoreView.swift
//  iOS (App)
//
//  Overflow tab: collections plus the saved views that don't warrant a tab of
//  their own.
//

import SwiftUI

struct MoreView: View {
    /// The destinations reachable from here.
    private enum Destination: Hashable {
        case collections
        case stars
        case publicItems
        case top
    }

    var body: some View {
        NavigationStack {
            List {
                NavigationLink(value: Destination.collections) {
                    Label("Collections", systemImage: "folder")
                }
                NavigationLink(value: Destination.stars) {
                    Label("Stars", systemImage: "star")
                }
                NavigationLink(value: Destination.publicItems) {
                    Label("Public", systemImage: "eye")
                }
                NavigationLink(value: Destination.top) {
                    Label("Top links", systemImage: "chart.line.uptrend.xyaxis")
                }
            }
            .navigationTitle("More")
            .toolbar { OtterToolbarItems() }
            .navigationDestination(for: Destination.self) { destination in
                switch destination {
                case .collections:
                    CollectionsList()
                case .stars:
                    BookmarkFeedView(
                        source: .all,
                        filter: BookmarkFilter(star: true),
                        title: "Stars",
                        emptyMessage: "Star a bookmark to see it here."
                    )
                case .publicItems:
                    BookmarkFeedView(
                        source: .all,
                        filter: BookmarkFilter(isPublic: true),
                        title: "Public",
                        emptyMessage: "Nothing is shared publicly yet."
                    )
                case .top:
                    BookmarkFeedView(
                        source: .top,
                        title: "Top links",
                        emptyMessage: "Links you open most often show up here."
                    )
                }
            }
            // Collections drill into a feed, which can drill into a tag.
            .navigationDestination(for: OtterCollection.self) { collection in
                BookmarkFeedView(
                    source: .collection(collection.collection),
                    relatedTags: collection.tags,
                    emptyMessage: "Nothing saved in this collection."
                )
            }
            .navigationDestination(for: BookmarkFeedSource.self) { source in
                BookmarkFeedView(
                    source: source,
                    emptyMessage: "Nothing saved with this tag."
                )
            }
        }
    }
}
