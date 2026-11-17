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
nonisolated enum LibraryDestination: Hashable, Codable {
    case tags
    case types
    case collections
    case stars
    case publicItems
    case top
    /// A tag or type feed, reached from a list or a chip.
    case feed(BookmarkFeedSource)
    case collection(OtterCollection)
    case reader(ArticleReaderRequest)
}

/// Lets a feed push the article reader onto the Library stack, so the reader
/// is saved with it. Unset inside the search sheet, whose stack isn't saved.
private struct OpenReaderKey: EnvironmentKey {
    static let defaultValue: ((ArticleReaderRequest) -> Void)? = nil
}

extension EnvironmentValues {
    var openReader: ((ArticleReaderRequest) -> Void)? {
        get { self[OpenReaderKey.self] }
        set { self[OpenReaderKey.self] = newValue }
    }
}

struct BookmarksView: View {
    @ObservedObject var model: OtterAppModel
    @Restored("library.searching") private var isSearching = false
    @Restored("path.library") private var path: [LibraryDestination] = []

    var body: some View {
        NavigationStack(path: $path) {
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
            .sheet(isPresented: $isSearching, onDismiss: {
                // The query only comes back after a relaunch, not on the next open.
                SavedState.save(String?.none, key: "search.query")
            }) {
                SearchView()
                    .environment(\.openReader, nil)
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
                case let .feed(source):
                    BookmarkFeedView(
                        source: source,
                        emptyMessage: "Nothing saved here yet."
                    )
                // Collections drill into a feed, which can drill into a tag.
                case let .collection(collection):
                    BookmarkFeedView(
                        source: .collection(collection.collection),
                        relatedTags: collection.tags,
                        emptyMessage: "Nothing saved in this collection."
                    )
                case let .reader(request):
                    ArticleReaderView(bookmark: request.bookmark, mode: request.mode)
                }
            }
        }
        .environment(\.openReader) { path.append(.reader($0)) }
    }
}
