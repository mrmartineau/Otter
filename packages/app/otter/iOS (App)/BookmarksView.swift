//
//  BookmarksView.swift
//  iOS (App)
//
//  The Library tab: the bookmark feed, with everything else one level down.
//  Tags, types, collections and the saved views live in the More menu; search
//  opens as a sheet. All navigation destinations are declared here, once.
//

import SwiftUI

/// The screens the More menu reaches.
enum LibraryDestination: Hashable {
    case tags
    case types
    case collections
    case stars
    case publicItems
    case top
}

struct BookmarksView: View {
    @ObservedObject var model: OtterAppModel
    @State private var isSearching = false

    var body: some View {
        NavigationStack {
            BookmarkFeedView(
                source: .all,
                emptyMessage: "Save a link from Safari or with the + button."
            )
            .id(model.feedReloadToken)
            .toolbar {
                ToolbarItem(placement: .topBarLeading) {
                    Menu {
                        NavigationLink(value: LibraryDestination.tags) {
                            Label("Tags", systemImage: "number")
                        }
                        NavigationLink(value: LibraryDestination.types) {
                            Label("Types", systemImage: "square.grid.2x2")
                        }
                        NavigationLink(value: LibraryDestination.collections) {
                            Label("Collections", systemImage: "folder")
                        }
                        Divider()
                        NavigationLink(value: LibraryDestination.stars) {
                            Label("Stars", systemImage: "star")
                        }
                        NavigationLink(value: LibraryDestination.publicItems) {
                            Label("Public", systemImage: "eye")
                        }
                        NavigationLink(value: LibraryDestination.top) {
                            Label("Top links", systemImage: "chart.line.uptrend.xyaxis")
                        }
                    } label: {
                        Image(systemName: "line.3.horizontal")
                    }
                    .accessibilityLabel("More")
                }

                ToolbarItem(placement: .topBarTrailing) {
                    Button {
                        isSearching = true
                    } label: {
                        Label("Search", systemImage: "magnifyingglass")
                    }
                }
            }
            .sheet(isPresented: $isSearching) {
                SearchView()
            }
            .navigationDestination(for: LibraryDestination.self) { destination in
                switch destination {
                case .tags:
                    TagsView()
                case .types:
                    TypesView()
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
            .navigationDestination(for: BookmarkFeedSource.self) { source in
                BookmarkFeedView(
                    source: source,
                    emptyMessage: "Nothing saved here yet."
                )
            }
            // Collections drill into a feed, which can drill into a tag.
            .navigationDestination(for: OtterCollection.self) { collection in
                BookmarkFeedView(
                    source: .collection(collection.collection),
                    relatedTags: collection.tags,
                    emptyMessage: "Nothing saved in this collection."
                )
            }
        }
    }
}
