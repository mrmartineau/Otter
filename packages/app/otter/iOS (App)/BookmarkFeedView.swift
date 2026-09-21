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
    @State private var detail: Bookmark?
    @State private var reader: ArticleReaderRequest?
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
                    .listRowBackground(Color.clear)
                }
            }

            ForEach(model.bookmarks) { bookmark in
                BookmarkListRow(
                    bookmark: bookmark,
                    onEdit: { editing = bookmark },
                    onShowDetail: { detail = bookmark },
                    onOpenReader: { mode in
                        reader = ArticleReaderRequest(bookmark: bookmark, mode: mode)
                    },
                    onToggleStar: { Task { await model.toggleStar(bookmark) } },
                    onTogglePublic: { Task { await model.togglePublic(bookmark) } },
                    onTrash: { Task { await model.trash(bookmark) } }
                )
                .listRowBackground(Color.clear)
            }

            if model.canLoadMore {
                HStack {
                    Spacer()
                    ProgressView()
                    Spacer()
                }
                .task { await model.loadMore() }
                .listRowBackground(Color.clear)
            }
        }
        .listStyle(.plain)
        .otterTheme()
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
        .sheet(item: $reader) { request in
            ArticleReaderView(bookmark: request.bookmark, mode: request.mode)
        }
        .sheet(item: $detail) { bookmark in
            NavigationStack {
                BookmarkDetailView(bookmark: bookmark) {
                    detail = nil
                    // Let the detail sheet finish dismissing before the editor
                    // takes its place, otherwise the second one never appears.
                    Task {
                        try? await Task.sleep(nanoseconds: 350_000_000)
                        editing = bookmark
                    }
                }
                .toolbar {
                    ToolbarItem(placement: .cancellationAction) {
                        Button("Done") { detail = nil }
                    }
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
    let onShowDetail: () -> Void
    let onOpenReader: (ArticleReaderMode) -> Void
    let onToggleStar: () -> Void
    let onTogglePublic: () -> Void
    let onTrash: () -> Void

    @Environment(\.openURL) private var openURL

    var body: some View {
        Button {
            if let url = bookmark.linkURL {
                openURL(url)
            } else {
                // A note has nothing to open, so the row's content *is* the details.
                onShowDetail()
            }
        } label: {
            BookmarkRow(bookmark: bookmark)
        }
        .buttonStyle(.plain)
        // Edit stays first, so it keeps the full-swipe gesture it already had.
        .swipeActions(edge: .trailing) {
            Button {
                onEdit()
            } label: {
                Label("Edit", systemImage: "pencil")
            }
            .tint(.blue)

            Button {
                onToggleStar()
            } label: {
                Label(
                    bookmark.star ? "Unstar" : "Star",
                    systemImage: bookmark.star ? "star.slash" : "star"
                )
            }
            .tint(.yellow)

            Button {
                onTogglePublic()
            } label: {
                Label(
                    bookmark.isPublic ? "Make private" : "Make public",
                    systemImage: bookmark.isPublic ? "eye.slash" : "eye"
                )
            }
            .tint(.indigo)
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
        // Long press for everything the row has no room for.
        .contextMenu {
            if let url = bookmark.linkURL {
                Button {
                    openURL(url)
                } label: {
                    Label("Open link", systemImage: "safari")
                }

                Button {
                    UIPasteboard.general.string = url.absoluteString
                    UINotificationFeedbackGenerator().notificationOccurred(.success)
                } label: {
                    Label("Copy link", systemImage: "doc.on.doc")
                }
            }

            Divider()

            Button {
                onOpenReader(.read)
            } label: {
                Label("Read article", systemImage: "doc.richtext")
            }

            Button {
                onOpenReader(.summary)
            } label: {
                Label("Summarise", systemImage: "sparkles")
            }

            Divider()

            Button {
                onShowDetail()
            } label: {
                Label("Details", systemImage: "info.circle")
            }

            Button {
                onEdit()
            } label: {
                Label("Edit", systemImage: "pencil")
            }

            Button {
                onToggleStar()
            } label: {
                Label(
                    bookmark.star ? "Unstar" : "Star",
                    systemImage: bookmark.star ? "star.slash" : "star"
                )
            }

            Button {
                onTogglePublic()
            } label: {
                Label(
                    bookmark.isPublic ? "Make private" : "Make public",
                    systemImage: bookmark.isPublic ? "eye.slash" : "eye"
                )
            }

            Divider()

            // As with the swipe action, this only moves the bookmark to the trash.
            Button {
                onTrash()
            } label: {
                Label("Move to Trash", systemImage: "trash")
            }
        } preview: {
            BookmarkPreview(bookmark: bookmark)
        }
    }
}

/// The hard-press preview: the row's content with room to breathe, so the
/// description and tags are readable before you pick an action.
private struct BookmarkPreview: View {
    let bookmark: Bookmark

    var body: some View {
        VStack(alignment: .leading, spacing: 10) {
            if let imageURL = bookmark.imageURL {
                RemoteImage(url: imageURL, maxSize: 320) { phase in
                    switch phase {
                    case let .success(image):
                        image
                            .resizable()
                            .aspectRatio(contentMode: .fill)
                            .frame(height: 140)
                            .clipped()
                    case .failure:
                        EmptyView()
                    case .loading:
                        Rectangle()
                            .fill(Color(.tertiarySystemFill))
                            .frame(height: 140)
                    }
                }
            }

            VStack(alignment: .leading, spacing: 6) {
                Text(bookmark.displayTitle)
                    .font(.headline)
                    .lineLimit(3)

                if let description = bookmark.description, !description.isEmpty {
                    Text(description)
                        .font(.subheadline)
                        .foregroundStyle(.secondary)
                        .lineLimit(4)
                }

                if let note = bookmark.note, !note.isEmpty {
                    Text(note)
                        .font(.footnote)
                        .foregroundStyle(.secondary)
                        .lineLimit(3)
                }

                if let host = bookmark.host {
                    Text(host)
                        .font(.caption)
                        .foregroundStyle(.tertiary)
                }
            }
            .padding(.horizontal, 14)
            .padding(.bottom, 14)
            .frame(maxWidth: .infinity, alignment: .leading)
        }
        .frame(width: 280)
    }
}

/// Laid out like a Mail message row: a status gutter, a headline with the date
/// trailing it, then secondary preview and metadata lines.
struct BookmarkRow: View {
    let bookmark: Bookmark

    private static let gutterWidth: CGFloat = 14
    private static let thumbnailSize: CGFloat = 52
    private static let faviconSize: CGFloat = 14

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
                            HStack(spacing: 4) {
                                favicon

                                Text(footnote)
                                    .font(.caption)
                                    .foregroundStyle(.tertiary)
                                    .lineLimit(1)
                            }
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

    /// The site's icon, sitting to the left of the host. The slot keeps its size
    /// in every state, so a favicon arriving doesn't shove the line sideways.
    @ViewBuilder
    private var favicon: some View {
        if let faviconURL = bookmark.faviconURL {
            // Decoded well above the drawn size: the service hands back icons at
            // assorted resolutions, and this leaves room for the larger ones.
            RemoteImage(url: faviconURL, maxSize: Self.faviconSize * 2) { phase in
                switch phase {
                case let .success(image):
                    image
                        .resizable()
                        .aspectRatio(contentMode: .fit)
                        .frame(width: Self.faviconSize, height: Self.faviconSize)
                        .clipShape(Circle())
                case .failure:
                    // No icon for this domain — a neutral mark keeps the row aligned.
                    Image(systemName: "globe")
                        .font(.system(size: Self.faviconSize - 2))
                        .foregroundStyle(.tertiary)
                        .frame(width: Self.faviconSize, height: Self.faviconSize)
                case .loading:
                    Circle()
                        .fill(Color(.tertiarySystemFill))
                        .frame(width: Self.faviconSize, height: Self.faviconSize)
                }
            }
        }
    }

    /// Host, type and tags on one quiet line.
    private var footnote: String? {
        var parts: [String] = []

        if let host = bookmark.host {
            parts.append(host)
        }

        if let type = bookmark.type, !type.isEmpty {
            parts.append(BookmarkTypes.label(for: type))
        }

        if let tags = bookmark.tags, !tags.isEmpty {
            parts.append(tags.map { "#\($0)" }.joined(separator: " "))
        }

        return parts.isEmpty ? nil : parts.joined(separator: "  ·  ")
    }

    @ViewBuilder
    private var thumbnail: some View {
        if let imageURL = bookmark.imageURL {
            // Decoded at `maxSize`, not at whatever the source happens to be —
            // og:images run to several thousand pixels a side. The cap is well
            // above 52 pt because `.fill` crops to the *shortest* edge, so a
            // wide image still needs 52 pt of height to cover the square.
            RemoteImage(url: imageURL, maxSize: Self.thumbnailSize * 2) { phase in
                switch phase {
                case let .success(image):
                    image
                        .resizable()
                        .aspectRatio(contentMode: .fill)
                        .frame(width: Self.thumbnailSize, height: Self.thumbnailSize)
                        .clipShape(RoundedRectangle(cornerRadius: 8, style: .continuous))
                        .overlay(
                            RoundedRectangle(cornerRadius: 8, style: .continuous)
                                .strokeBorder(Color.primary.opacity(0.08))
                        )
                case .failure:
                    // A dead image URL shouldn't leave an empty grey box.
                    EmptyView()
                case .loading:
                    RoundedRectangle(cornerRadius: 8, style: .continuous)
                        .fill(Color(.tertiarySystemFill))
                        .frame(width: Self.thumbnailSize, height: Self.thumbnailSize)
                }
            }
        }
    }
}
