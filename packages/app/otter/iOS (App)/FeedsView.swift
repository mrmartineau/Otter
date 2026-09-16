//
//  FeedsView.swift
//  iOS (App)
//
//  The Feeds tab: one list, a strip of sources above it. Saving a story to
//  Read later is the moment the app asks for an account.
//

import SwiftUI

struct FeedsView: View {
    @ObservedObject var model: OtterAppModel
    @ObservedObject private var store = FeedStore.shared
    @ObservedObject private var reading = ReadingStore.shared

    /// "starred" is a virtual source: everything starred across feeds.
    @AppStorage("feeds.selected") private var selected = "hn"
    @State private var commentsItem: FeedItem?
    @State private var readerItem: FeedItem?
    /// Feed stories are usually articles; the reader shows "Open in browser"
    /// when a page turns out not to be one.
    @AppStorage("feeds.openInReader") private var openInReader = true
    @State private var isAddingFeed = false
    @State private var newFeedURL = ""
    @State private var message: String?
    @Environment(\.scenePhase) private var scenePhase
    @Environment(\.openURL) private var openURL

    /// What the list shows. Sources by id, plus virtual views: "starred",
    /// "all" (every subscription merged) and "folder:<name>".
    private var current: String {
        if selected == "starred" || selected == "all" { return selected }
        if selected.hasPrefix("folder:"), store.folders.contains(String(selected.dropFirst(7))) { return selected }
        if store.sources.contains(where: { $0.id == selected }) { return selected }
        return store.sources.first?.id ?? "starred"
    }

    private var currentFolder: String? {
        current.hasPrefix("folder:") ? String(current.dropFirst(7)) : nil
    }

    /// Merged views mix feeds, so rows say which feed a story came from.
    private var isMerged: Bool {
        current == "all" || current == "starred" || currentFolder != nil
    }

    private var items: [FeedItem] {
        switch current {
        case "starred": return store.starred
        case "all": return store.mergedItems(all: true)
        default:
            if let currentFolder { return store.mergedItems(folder: currentFolder) }
            return store.items(for: current)
        }
    }

    private var selectedSource: (any FeedSource)? {
        store.sources.first { $0.id == current }
    }

    private var currentTitle: String {
        switch current {
        case "starred": return "Starred"
        case "all": return "All feeds"
        default: return currentFolder ?? selectedSource?.title ?? "Feeds"
        }
    }

    var body: some View {
        NavigationStack {
            list
            .navigationTitle(currentTitle)
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .topBarLeading) {
                    sourceMenu
                }

                ToolbarItem(placement: .topBarTrailing) {
                    Menu {
                        Button {
                            isAddingFeed = true
                        } label: {
                            Label("Add feed…", systemImage: "plus")
                        }
                        if selectedSource != nil {
                            Button {
                                store.markAllRead(sourceID: current)
                            } label: {
                                Label("Mark all as read", systemImage: "checkmark.circle")
                            }
                        }
                        Button {
                            Task { await store.refreshAll() }
                        } label: {
                            Label("Refresh all", systemImage: "arrow.clockwise")
                        }
                    } label: {
                        Image(systemName: "ellipsis.circle")
                    }
                }
            }
            .navigationDestination(item: $commentsItem) { item in
                CommentsView(item: item)
            }
            .sheet(item: $readerItem) { item in
                if let url = item.linkURL {
                    ArticleReaderView(url: url, title: item.title)
                }
            }
            .task { await store.refreshIfStale() }
            .onChange(of: scenePhase) { _, phase in
                if phase == .active { Task { await store.refreshIfStale() } }
            }
            .alert("Add feed", isPresented: $isAddingFeed) {
                TextField("https://example.com/feed.xml", text: $newFeedURL)
                    .textInputAutocapitalization(.never)
                    .keyboardType(.URL)
                Button("Add") {
                    let url = newFeedURL
                    newFeedURL = ""
                    Task {
                        do {
                            let subscription = try await store.subscribe(url: url)
                            selected = subscription.id
                        } catch {
                            message = error.localizedDescription
                        }
                    }
                }
                Button("Cancel", role: .cancel) { newFeedURL = "" }
            }
            .alert("Feeds", isPresented: Binding(get: { message != nil }, set: { if !$0 { message = nil } })) {
                Button("OK") {}
            } message: {
                Text(message ?? "")
            }
        }
    }

    /// The feed tree: built-ins, then folders as submenus, then loose feeds.
    private var sourceMenu: some View {
        Menu {
            Section {
                ForEach(FeedStore.builtIn.filter(store.isEnabled), id: \.id) { source in
                    pick(source.id, source.title, systemImage: "newspaper")
                }
                pick("starred", "Starred", systemImage: "star")
            }

            if !store.subscriptions.isEmpty {
                Section {
                    pick("all", "All feeds", systemImage: "tray.full")

                    ForEach(store.folders, id: \.self) { folder in
                        Menu {
                            pick("folder:\(folder)", "All in \(folder)", systemImage: "tray.full")
                            Divider()
                            ForEach(store.subscriptions(in: folder)) { subscription in
                                pick(subscription.id, subscription.title, systemImage: "dot.radiowaves.up.forward")
                            }
                        } label: {
                            Label(folder, systemImage: "folder")
                        }
                    }

                    ForEach(store.subscriptions(in: nil)) { subscription in
                        pick(subscription.id, subscription.title, systemImage: "dot.radiowaves.up.forward")
                    }
                }
            }
        } label: {
            Label(currentTitle, systemImage: "line.3.horizontal")
        }
        .accessibilityLabel("Choose feed")
    }

    private func pick(_ id: String, _ title: String, systemImage: String) -> some View {
        Button {
            selected = id
        } label: {
            if current == id {
                Label(title, systemImage: "checkmark")
            } else {
                Label(title, systemImage: systemImage)
            }
        }
    }

    private var list: some View {
        List {
            ForEach(items) { item in
                FeedRow(
                    item: item,
                    isRead: store.isRead(item),
                    isStarred: store.isStarred(item),
                    sourceTitle: isMerged ? store.title(forSource: item.sourceID) : nil,
                    onComments: { commentsItem = item }
                )
                    .contentShape(Rectangle())
                    .onTapGesture { open(item) }
                    .swipeActions(edge: .trailing) {
                        Button {
                            readLater(item)
                        } label: {
                            Label("Read later", systemImage: "book")
                        }
                        .tint(.accentColor)

                        Button {
                            store.toggleStar(item)
                        } label: {
                            Label(store.isStarred(item) ? "Unstar" : "Star", systemImage: store.isStarred(item) ? "star.slash" : "star")
                        }
                        .tint(.yellow)
                    }
                    .swipeActions(edge: .leading) {
                        Button {
                            store.markRead(item, read: !store.isRead(item))
                        } label: {
                            Label(
                                store.isRead(item) ? "Unread" : "Read",
                                systemImage: store.isRead(item) ? "circle" : "checkmark.circle"
                            )
                        }
                        .tint(.gray)
                    }
                    .contextMenu {
                        if let url = item.linkURL {
                            Button {
                                store.markRead(item)
                                openURL(url)
                            } label: {
                                Label("Open in browser", systemImage: "safari")
                            }
                            Button {
                                UIPasteboard.general.string = url.absoluteString
                            } label: {
                                Label("Copy link", systemImage: "doc.on.doc")
                            }
                            ShareLink(item: url) { Label("Share", systemImage: "square.and.arrow.up") }
                        }
                        if item.commentsRef != nil {
                            Button { commentsItem = item } label: { Label("Comments", systemImage: "bubble.left.and.bubble.right") }
                        }
                        Button { readLater(item) } label: { Label("Read later", systemImage: "book") }
                    }
            }
        }
        .listStyle(.plain)
        .overlay {
            if items.isEmpty {
                if store.refreshing.contains(current) {
                    ProgressView()
                } else if let error = store.errorsBySource[current], selectedSource != nil {
                    ContentUnavailableView("Couldn't load", systemImage: "exclamationmark.triangle", description: Text(error))
                } else {
                    ContentUnavailableView(
                        current == "starred" ? "Nothing starred" : "Nothing here yet",
                        systemImage: current == "starred" ? "star" : "newspaper",
                        description: Text(current == "starred" ? "Swipe a story to star it." : "Pull to refresh.")
                    )
                }
            }
        }
        .refreshable {
            if let source = selectedSource { await store.refresh(source) } else { await store.refreshAll() }
        }
    }

    /// Discussion-only posts (Ask HN, Lobsters text posts) open their thread.
    /// Anything else opens in the reader when signed in, else the browser.
    private func open(_ item: FeedItem) {
        store.markRead(item)
        guard let url = item.linkURL else { return }

        if item.commentsRef != nil, item.url == item.commentsURL {
            commentsItem = item
        } else if openInReader, model.isSignedIn, ["http", "https"].contains(url.scheme ?? "") {
            readerItem = item
        } else {
            openURL(url)
        }
    }

    /// The signup moment. Feeds never needed an account; saving does.
    private func readLater(_ item: FeedItem) {
        guard model.isSignedIn else {
            model.isSignInPresented = true
            return
        }
        guard let url = item.url else { return }
        store.markRead(item)
        Task {
            do {
                try await reading.save(url: url)
                message = "Saved to Read later."
            } catch {
                message = error.localizedDescription
            }
        }
    }
}

struct FeedRow: View {
    let item: FeedItem
    let isRead: Bool
    let isStarred: Bool
    /// Shown in merged views, where stories come from several feeds.
    var sourceTitle: String?
    let onComments: () -> Void

    var body: some View {
        HStack(alignment: .top, spacing: 10) {
            VStack(alignment: .leading, spacing: 4) {
                Text(item.title)
                    .font(.body.weight(isRead ? .regular : .medium))
                    .foregroundStyle(isRead ? .secondary : .primary)
                    .lineLimit(3)

                if let summary = item.summary, !summary.isEmpty, item.commentsRef == nil {
                    Text(summary)
                        .font(.subheadline)
                        .foregroundStyle(.secondary)
                        .lineLimit(2)
                }

                HStack(spacing: 6) {
                    if isStarred {
                        Image(systemName: "star.fill").foregroundStyle(.yellow)
                    }
                    Text([sourceTitle, item.meta].compactMap { $0 }.filter { !$0.isEmpty }.joined(separator: " · "))
                }
                .font(.caption)
                .foregroundStyle(.secondary)
            }

            Spacer(minLength: 0)

            if item.commentsRef != nil {
                // Comments open natively; the row itself opens the link.
                Button(action: onComments) {
                    VStack(spacing: 2) {
                        Image(systemName: "bubble.left.and.bubble.right")
                        Text("\(item.commentCount ?? 0)")
                            .font(.caption2)
                    }
                    .foregroundStyle(.secondary)
                    .padding(.horizontal, 6)
                    .padding(.vertical, 4)
                }
                .buttonStyle(.plain)
            }
        }
        .padding(.vertical, 4)
    }
}
