//
//  ReadingItem.swift
//  Shared (Core)
//
//  A row from `GET /api/reader/items`: a bookmark of type `article` joined with
//  its reading state. `content` only arrives from `GET /api/reader/items/:id`.
//

import Foundation

nonisolated struct ReadingItem: Identifiable, Hashable, Codable {
    let id: String
    let bookmarkId: String
    var state: String
    var progress: Double
    let url: String?
    let title: String?
    let description: String?
    let image: String?
    let author: String?
    let siteName: String?
    let wordCount: Int
    let readingTimeS: Int
    var star: Bool
    /// When it was saved as a bookmark (ISO 8601).
    let createdAt: String
    let updatedAt: String
    let deletedAt: String?
    var content: String?

    enum CodingKeys: String, CodingKey {
        case id
        case bookmarkId = "bookmark_id"
        case state
        case progress
        case url
        case title
        case description
        case image
        case author
        case siteName = "site_name"
        case wordCount = "word_count"
        case readingTimeS = "reading_time_s"
        case star
        case createdAt = "created_at"
        case updatedAt = "updated_at"
        case deletedAt = "deleted_at"
        case content = "content_md"
    }

    init(from decoder: Decoder) throws {
        let c = try decoder.container(keyedBy: CodingKeys.self)
        id = try c.decode(String.self, forKey: .id)
        bookmarkId = try c.decode(String.self, forKey: .bookmarkId)
        state = try c.decodeIfPresent(String.self, forKey: .state) ?? "pending"
        progress = try c.decodeIfPresent(Double.self, forKey: .progress) ?? 0
        url = try c.decodeIfPresent(String.self, forKey: .url)
        title = try c.decodeIfPresent(String.self, forKey: .title)
        description = try c.decodeIfPresent(String.self, forKey: .description)
        image = try c.decodeIfPresent(String.self, forKey: .image)
        author = try c.decodeIfPresent(String.self, forKey: .author)
        siteName = try c.decodeIfPresent(String.self, forKey: .siteName)
        wordCount = try c.decodeIfPresent(Int.self, forKey: .wordCount) ?? 0
        readingTimeS = try c.decodeIfPresent(Int.self, forKey: .readingTimeS) ?? 0
        star = try c.decodeIfPresent(Bool.self, forKey: .star) ?? false
        createdAt = try c.decodeIfPresent(String.self, forKey: .createdAt) ?? ""
        updatedAt = try c.decodeIfPresent(String.self, forKey: .updatedAt) ?? ""
        deletedAt = try c.decodeIfPresent(String.self, forKey: .deletedAt)
        content = try c.decodeIfPresent(String.self, forKey: .content)
    }

    var isArchived: Bool { state == "archived" }
    var isDeleted: Bool { deletedAt != nil }
    var isFailed: Bool { state == "failed" }

    var displayTitle: String {
        if let title, !title.isEmpty { return title }
        return host ?? url ?? "Untitled"
    }

    var host: String? {
        guard let url, let host = URLComponents(string: url)?.host else { return nil }
        return host.hasPrefix("www.") ? String(host.dropFirst(4)) : host
    }

    var linkURL: URL? { url.flatMap(URL.init(string:)) }

    var imageURL: URL? {
        guard let image, !image.isEmpty else { return nil }
        return URL(string: image)
    }

    var savedDate: Date? { Bookmark.parseTimestamp(createdAt) }

    /// "example.com · 6 min · 15 Sept 2026" for the row subtitle.
    var subtitle: String {
        var parts: [String] = []
        if let siteName, !siteName.isEmpty { parts.append(siteName) } else if let host { parts.append(host) }
        if readingTimeS > 0 { parts.append("\(max(1, readingTimeS / 60)) min") }
        if isFailed { parts.append("couldn't extract") }
        if let savedDate {
            parts.append(savedDate.formatted(date: .abbreviated, time: .omitted))
        }
        return parts.joined(separator: " · ")
    }

    /// The reader's content model, so the stored article renders through the
    /// same view as a live scrape.
    var articleContent: ArticleContent {
        ArticleContent(
            title: title ?? "",
            author: author ?? "",
            domain: siteName ?? host ?? "",
            content: content ?? "",
            wordCount: wordCount,
            published: "",
            image: image
        )
    }
}

/// Envelope for `GET /api/reader/items`. `nextSince` is the server clock to
/// send back as `?since=` on the next sync.
nonisolated struct ReadingPage: Decodable {
    let data: [ReadingItem]
    let nextSince: String?

    enum CodingKeys: String, CodingKey {
        case data
        case nextSince = "next_since"
    }
}
