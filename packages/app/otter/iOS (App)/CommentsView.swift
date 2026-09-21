//
//  CommentsView.swift
//  iOS (App)
//
//  Native collapsible threads for Hacker News (Algolia returns the whole tree
//  in one call) and Lobsters (`/s/:id.json` includes the comments).
//

import Combine
import SwiftUI

nonisolated struct Comment: Identifiable, Hashable {
    let id: String
    let author: String
    let text: String
    let createdAt: Date?
    let children: [Comment]

    /// The thread as rows, so `List` can render it flat and collapse subtrees.
    func flattened(depth: Int = 0, collapsed: Set<String>) -> [(comment: Comment, depth: Int)] {
        var rows = [(self, depth)]
        if !collapsed.contains(id) {
            for child in children {
                rows += child.flattened(depth: depth + 1, collapsed: collapsed)
            }
        }
        return rows
    }

    var descendantCount: Int {
        children.reduce(children.count) { $0 + $1.descendantCount }
    }
}

@MainActor
final class CommentsModel: ObservableObject {
    @Published private(set) var comments: [Comment] = []
    @Published private(set) var isLoading = false
    @Published private(set) var error: String?
    @Published var collapsed: Set<String> = []

    func load(_ ref: CommentsRef) async {
        guard comments.isEmpty, !isLoading else { return }
        isLoading = true
        error = nil
        do {
            switch ref {
            case let .hackerNews(id): comments = try await Self.hackerNews(id)
            case let .lobsters(id): comments = try await Self.lobsters(id)
            }
        } catch {
            self.error = error.localizedDescription
        }
        isLoading = false
    }

    func toggle(_ comment: Comment) {
        if collapsed.contains(comment.id) { collapsed.remove(comment.id) } else { collapsed.insert(comment.id) }
    }

    // MARK: Hacker News

    private struct HNItem: Decodable {
        let id: Int
        let author: String?
        let text: String?
        let createdAt: String?
        let children: [HNItem]

        enum CodingKeys: String, CodingKey {
            case id, author, text, children
            case createdAt = "created_at"
        }

        var comment: Comment? {
            // Deleted comments come back with no author and no text.
            guard author != nil || text != nil else { return nil }
            return Comment(
                id: String(id),
                author: author ?? "[deleted]",
                text: HTMLText.plain(text ?? ""),
                createdAt: createdAt.flatMap(FeedDates.parse),
                children: children.compactMap(\.comment)
            )
        }
    }

    private static func hackerNews(_ id: Int) async throws -> [Comment] {
        let data = try await FeedHTTP.get(URL(string: "https://hn.algolia.com/api/v1/items/\(id)")!)
        let story = try JSONDecoder().decode(HNItem.self, from: data)
        return story.children.compactMap(\.comment)
    }

    // MARK: Lobsters

    private struct LobstersStory: Decodable {
        struct Entry: Decodable {
            let shortID: String
            let comment: String?
            let commentingUser: String?
            let parentComment: String?
            let createdAt: String?

            enum CodingKeys: String, CodingKey {
                case comment
                case shortID = "short_id"
                case commentingUser = "commenting_user"
                case parentComment = "parent_comment"
                case createdAt = "created_at"
            }
        }
        let comments: [Entry]
    }

    private static func lobsters(_ id: String) async throws -> [Comment] {
        let data = try await FeedHTTP.get(URL(string: "https://lobste.rs/s/\(id).json")!)
        let story = try JSONDecoder().decode(LobstersStory.self, from: data)

        // Flat list with parent pointers → tree, preserving the site's order.
        var childrenOf: [String?: [LobstersStory.Entry]] = [:]
        for entry in story.comments {
            childrenOf[entry.parentComment, default: []].append(entry)
        }

        func build(_ parent: String?) -> [Comment] {
            (childrenOf[parent] ?? []).map { entry in
                Comment(
                    id: entry.shortID,
                    author: entry.commentingUser ?? "[deleted]",
                    text: HTMLText.plain(entry.comment ?? ""),
                    createdAt: entry.createdAt.flatMap(FeedDates.parse),
                    children: build(entry.shortID)
                )
            }
        }

        return build(nil)
    }
}

struct CommentsView: View {
    let item: FeedItem

    @StateObject private var model = CommentsModel()
    @Environment(\.openURL) private var openURL

    private var rows: [(comment: Comment, depth: Int)] {
        model.comments.flatMap { $0.flattened(collapsed: model.collapsed) }
    }

    var body: some View {
        List {
            Section {
                VStack(alignment: .leading, spacing: 6) {
                    Text(item.title).font(.headline)
                    Text(item.meta).font(.caption).foregroundStyle(.secondary)
                }
                .padding(.vertical, 4)
                .listRowBackground(Color.clear)
            }

            ForEach(rows, id: \.comment.id) { row in
                CommentRow(comment: row.comment, depth: row.depth, isCollapsed: model.collapsed.contains(row.comment.id))
                    .contentShape(Rectangle())
                    .listRowBackground(Color.clear)
                    .onTapGesture { withAnimation(.snappy) { model.toggle(row.comment) } }
            }
        }
        .listStyle(.plain)
        .otterTheme()
        .overlay {
            if model.isLoading {
                ProgressView()
            } else if let error = model.error {
                ContentUnavailableView("Couldn't load comments", systemImage: "exclamationmark.triangle", description: Text(error))
            } else if model.comments.isEmpty {
                ContentUnavailableView("No comments yet", systemImage: "bubble.left")
            }
        }
        .navigationTitle("Comments")
        .navigationBarTitleDisplayMode(.inline)
        .toolbar {
            ToolbarItemGroup(placement: .topBarTrailing) {
                if let url = item.linkURL {
                    Button { openURL(url) } label: { Label("Open link", systemImage: "safari") }
                }
                if let comments = item.commentsURL.flatMap(URL.init(string:)) {
                    ShareLink(item: comments) { Label("Share", systemImage: "square.and.arrow.up") }
                }
            }
        }
        .task {
            if let ref = item.commentsRef { await model.load(ref) }
        }
    }
}

private struct CommentRow: View {
    let comment: Comment
    let depth: Int
    let isCollapsed: Bool

    var body: some View {
        HStack(alignment: .top, spacing: 8) {
            if depth > 0 {
                Rectangle()
                    .fill(Self.colors[depth % Self.colors.count].opacity(0.5))
                    .frame(width: 2)
            }

            VStack(alignment: .leading, spacing: 4) {
                HStack(spacing: 6) {
                    Text(comment.author).font(.caption.weight(.semibold))
                    if let date = comment.createdAt {
                        Text(date.formatted(.relative(presentation: .numeric, unitsStyle: .abbreviated)))
                    }
                    Spacer()
                    if isCollapsed, comment.descendantCount > 0 {
                        Text("+\(comment.descendantCount)")
                    }
                    Image(systemName: isCollapsed ? "chevron.right" : "chevron.down")
                        .font(.caption2)
                }
                .font(.caption)
                .foregroundStyle(.secondary)

                if !isCollapsed {
                    Text(comment.text)
                        .font(.subheadline)
                        .textSelection(.enabled)
                }
            }
        }
        .padding(.leading, CGFloat(min(depth, 8)) * 12)
        .padding(.vertical, 2)
    }

    private static let colors: [Color] = [.clear, .orange, .blue, .green, .purple, .pink, .teal]
}
