//
//  BookmarkFeedView.swift
//  iOS (App)
//
//  The bookmark list, shared by the Bookmarks tab, tag screens and collections.
//

import SwiftUI

struct BookmarkFeedView: View {
    @StateObject private var model: BookmarkFeedModel
    @State private var editing: Bookmark?
    @Environment(\.scenePhase) private var scenePhase

    /// Chips shown above the list — a collection's tags, mirroring the web sub-nav.
    private let relatedTags: [String]
    private let emptyMessage: String
    private let titleOverride: String?

    init(
        source: BookmarkFeedSource,
        filter: BookmarkFilter = .none,
        title: String? = nil,
        relatedTags: [String] = [],
        emptyMessage: String
    ) {
        _model = StateObject(wrappedValue: BookmarkFeedModel(source: source, filter: filter))
        self.relatedTags = relatedTags
        self.emptyMessage = emptyMessage
        self.titleOverride = title
    }

    var body: some View {
        List {
            if !relatedTags.isEmpty {
                Section {
                    ScrollView(.horizontal, showsIndicators: false) {
                        HStack(spacing: 6) {
                            ForEach(relatedTags, id: \.self) { tag in
                                NavigationLink(value: BookmarkFeedSource.tag(tag)) {
                                    Text(tag)
                                        .font(.footnote)
                                        .padding(.horizontal, 10)
                                        .padding(.vertical, 6)
                                        .background(Color.secondary.opacity(0.12), in: Capsule())
                                }
                                .buttonStyle(.plain)
                            }
                        }
                        .padding(.vertical, 2)
                    }
                }
            }

            ForEach(model.bookmarks) { bookmark in
                BookmarkListRow(
                    bookmark: bookmark,
                    onEdit: { editing = bookmark },
                    onTrash: { Task { await model.trash(bookmark) } }
                )
            }

            if model.canLoadMore {
                HStack {
                    Spacer()
                    ProgressView()
                    Spacer()
                }
                .task { await model.loadMore() }
            }
        }
        .listStyle(.plain)
        .overlay {
            if model.isLoading, model.bookmarks.isEmpty {
                ProgressView()
            } else if let error = model.loadError, model.bookmarks.isEmpty {
                ContentUnavailableView(
                    "Couldn't load bookmarks",
                    systemImage: "exclamationmark.triangle",
                    description: Text(error)
                )
            } else if model.bookmarks.isEmpty, !model.isLoading {
                ContentUnavailableView(
                    "No bookmarks",
                    systemImage: "bookmark",
                    description: Text(emptyMessage)
                )
            }
        }
        .refreshable { await model.load() }
        .navigationTitle(titleOverride ?? model.source.title)
        .toolbar {
            OtterToolbarItems()

            if model.source.supportsFilters {
                ToolbarItem(placement: .topBarTrailing) {
                    BookmarkFilterMenu(
                        filter: Binding(
                            get: { model.filter },
                            set: { newValue in
                                Task { await model.applyFilter(newValue) }
                            }
                        )
                    )
                }
            }
        }
        .task { await model.start() }
        .onChange(of: scenePhase) { _, phase in
            if phase == .active {
                Task { await model.refreshIfStale() }
            }
        }
        .sheet(item: $editing) { bookmark in
            BookmarkFormView(bookmark: bookmark) { saved in
                editing = nil

                if let saved {
                    model.replace(saved)
                }
            }
        }
        .alert(
            "Couldn't update bookmark",
            isPresented: Binding(
                get: { model.actionError != nil },
                set: { if !$0 { model.actionError = nil } }
            )
        ) {
            Button("OK") { model.actionError = nil }
        } message: {
            Text(model.actionError ?? "")
        }
    }
}

/// A tappable row with Mail-style swipe actions: swipe left to edit, swipe
/// right to move to the trash.
struct BookmarkListRow: View {
    let bookmark: Bookmark
    let onEdit: () -> Void
    let onTrash: () -> Void

    @Environment(\.openURL) private var openURL

    var body: some View {
        Button {
            if let url = bookmark.linkURL { openURL(url) }
        } label: {
            BookmarkRow(bookmark: bookmark)
        }
        .buttonStyle(.plain)
        .swipeActions(edge: .trailing) {
            Button {
                onEdit()
            } label: {
                Label("Edit", systemImage: "pencil")
            }
            .tint(.blue)
        }
        .swipeActions(edge: .leading) {
            // Not `role: .destructive` — this only moves the bookmark to the
            // trash (status `inactive`), it never deletes anything.
            Button {
                onTrash()
            } label: {
                Label("Trash", systemImage: "trash")
            }
            .tint(.orange)
        }
    }
}

/// Laid out like a Mail message row: a status gutter, a headline with the date
/// trailing it, then secondary preview and metadata lines.
struct BookmarkRow: View {
    let bookmark: Bookmark

    private static let gutterWidth: CGFloat = 14

    var body: some View {
        HStack(alignment: .top, spacing: 0) {
            gutter

            VStack(alignment: .leading, spacing: 3) {
                HStack(alignment: .firstTextBaseline, spacing: 8) {
                    Text(bookmark.displayTitle)
                        .font(.headline)
                        .foregroundStyle(.primary)
                        .lineLimit(2)

                    Spacer(minLength: 0)

                    if let created = bookmark.createdAt {
                        Text(created, format: .relative(presentation: .named))
                            .font(.subheadline)
                            .foregroundStyle(.secondary)
                            .lineLimit(1)
                            .layoutPriority(1)
                    }
                }

                HStack(alignment: .top, spacing: 12) {
                    VStack(alignment: .leading, spacing: 3) {
                        if let description = bookmark.description, !description.isEmpty {
                            Text(description)
                                .font(.subheadline)
                                .foregroundStyle(.secondary)
                                .lineLimit(2)
                                // Without this the row only budgets a single line.
                                .fixedSize(horizontal: false, vertical: true)
                        }

                        if let footnote {
                            Text(footnote)
                                .font(.caption)
                                .foregroundStyle(.tertiary)
                                .lineLimit(1)
                        }
                    }
                    .frame(maxWidth: .infinity, alignment: .leading)

                    thumbnail
                }
            }
            // Separators start at the text, not under the gutter — as in Mail.
            .alignmentGuide(.listRowSeparatorLeading) { $0[.leading] }
        }
        .padding(.vertical, 4)
        .contentShape(Rectangle())
    }

    /// Mail keeps the unread dot in a fixed leading gutter; a star sits here instead.
    @ViewBuilder
    private var gutter: some View {
        ZStack {
            if bookmark.star {
                Image(systemName: "star.fill")
                    .font(.system(size: 9))
                    .foregroundStyle(.yellow)
            }
        }
        .frame(width: Self.gutterWidth, alignment: .leading)
        .padding(.top, 5)
        .accessibilityLabel(bookmark.star ? "Starred" : "")
    }

    /// Host and tags on one quiet line.
    private var footnote: String? {
        var parts: [String] = []

        if let host = bookmark.host {
            parts.append(host)
        }

        if let tags = bookmark.tags, !tags.isEmpty {
            parts.append(tags.map { "#\($0)" }.joined(separator: " "))
        }

        return parts.isEmpty ? nil : parts.joined(separator: "  ·  ")
    }

    @ViewBuilder
    private var thumbnail: some View {
        if let imageURL = bookmark.imageURL {
            AsyncImage(url: imageURL) { phase in
                switch phase {
                case let .success(image):
                    image
                        .resizable()
                        .aspectRatio(contentMode: .fill)
                        .frame(width: 52, height: 52)
                        .clipShape(RoundedRectangle(cornerRadius: 8, style: .continuous))
                        .overlay(
                            RoundedRectangle(cornerRadius: 8, style: .continuous)
                                .strokeBorder(Color.primary.opacity(0.08))
                        )
                case .failure:
                    // A dead image URL shouldn't leave an empty grey box.
                    EmptyView()
                default:
                    RoundedRectangle(cornerRadius: 8, style: .continuous)
                        .fill(Color(.tertiarySystemFill))
                        .frame(width: 52, height: 52)
                }
            }
        }
    }
}
