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
    @State private var isAddingFeed = false
    @State private var newFeedURL = ""
    @State private var message: String?
    @Environment(\.scenePhase) private var scenePhase
    @Environment(\.openURL) private var openURL

    private var items: [FeedItem] {
        selected == "starred" ? store.starred : store.items(for: selected)
    }

    private var selectedSource: (any FeedSource)? {
        store.sources.first { $0.id == selected }
    }

    var body: some View {
        NavigationStack {
            VStack(spacing: 0) {
                sourceStrip
                Divider()
                list
            }
            .navigationTitle(selected == "starred" ? "Starred" : selectedSource?.title ?? "Feeds")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .topBarTrailing) {
                    Menu {
                        Button {
                            isAddingFeed = true
                        } label: {
                            Label("Add feed…", systemImage: "plus")
                        }
                        if selected != "starred" {
                            Button {
                                store.markAllRead(sourceID: selected)
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

    private var sourceStrip: some View {
        ScrollView(.horizontal, showsIndicators: false) {
            HStack(spacing: 6) {
                ForEach(store.sources, id: \.id) { source in
                    chip(id: source.id, title: source.title)
                }
                chip(id: "starred", title: "★ Starred")
            }
            .padding(.horizontal, 16)
            .padding(.vertical, 8)
        }
    }

    private func chip(id: String, title: String) -> some View {
        Button {
            selected = id
        } label: {
            Text(title)
                .font(.subheadline.weight(selected == id ? .semibold : .regular))
                .padding(.horizontal, 12)
                .padding(.vertical, 6)
                .background(
                    selected == id ? Color.accentColor.opacity(0.18) : Color.secondary.opacity(0.12),
                    in: Capsule()
                )
        }
        .buttonStyle(.plain)
    }

    private var list: some View {
        List {
            ForEach(items) { item in
                FeedRow(
                    item: item,
                    isRead: store.isRead(item),
                    isStarred: store.isStarred(item),
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
                            Button { open(item) } label: { Label("Open link", systemImage: "safari") }
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
                if store.refreshing.contains(selected) {
                    ProgressView()
                } else if let error = store.errorsBySource[selected] {
                    ContentUnavailableView("Couldn't load", systemImage: "exclamationmark.triangle", description: Text(error))
                } else {
                    ContentUnavailableView(
                        selected == "starred" ? "Nothing starred" : "Nothing here yet",
                        systemImage: selected == "starred" ? "star" : "newspaper",
                        description: Text(selected == "starred" ? "Swipe a story to star it." : "Pull to refresh.")
                    )
                }
            }
        }
        .refreshable {
            if let source = selectedSource { await store.refresh(source) } else { await store.refreshAll() }
        }
    }

    private func open(_ item: FeedItem) {
        store.markRead(item)
        if let url = item.linkURL { openURL(url) }
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
                    Text(item.meta)
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
