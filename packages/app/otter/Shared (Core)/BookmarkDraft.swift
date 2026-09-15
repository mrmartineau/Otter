//
//  BookmarkDraft.swift
//  Shared (Core)
//
//  The payload and helper responses behind the new-bookmark form, mirroring
//  `packages/web/src/components/BookmarkForm.tsx`.
//

import Foundation

/// Body for `POST /api/bookmarks`. The API only writes the keys that are
/// present, so every optional field is omitted when empty.
nonisolated struct BookmarkDraft: Encodable {
    var url: String
    var title: String?
    var description: String?
    var image: String?
    var note: String?
    var tags: [String]?
    var type: String?
    var feed: String?
}

/// `GET /api/scrape?url=…`
nonisolated struct ScrapeMetadata: Decodable {
    let title: String?
    let description: String?
    let image: String?
    let url: String?
    let cleanedURL: String?
    let feeds: [String]
    let urlType: String?

    enum CodingKeys: String, CodingKey {
        case title
        case description
        case image
        case url
        case cleanedURL = "cleaned_url"
        case feeds
        case urlType
    }

    init(from decoder: Decoder) throws {
        let container = try decoder.container(keyedBy: CodingKeys.self)
        title = try container.decodeIfPresent(String.self, forKey: .title)
        description = try container.decodeIfPresent(String.self, forKey: .description)
        image = try container.decodeIfPresent(String.self, forKey: .image)
        url = try container.decodeIfPresent(String.self, forKey: .url)
        cleanedURL = try container.decodeIfPresent(String.self, forKey: .cleanedURL)
        urlType = try container.decodeIfPresent(String.self, forKey: .urlType)

        // The scraper collects every feed link, but older payloads used a single
        // string, so accept both shapes.
        if let list = try? container.decodeIfPresent([String].self, forKey: .feeds) {
            feeds = list
        } else if let single = try? container.decodeIfPresent(String.self, forKey: .feeds) {
            feeds = [single]
        } else {
            feeds = []
        }
    }

    /// The scraper may report a canonical URL that differs from the one we sent.
    var resolvedURL: String? {
        if let cleanedURL, !cleanedURL.isEmpty { return cleanedURL }
        return url
    }
}

/// `GET /api/scrape-content?url=…` — the readable article, extracted and
/// converted to markdown by the Worker's `xtractr`.
nonisolated struct ArticleContent: Decodable {
    let title: String
    let author: String
    let domain: String
    /// Markdown, not HTML.
    let content: String
    let wordCount: Int
    let published: String
    let image: String?

    enum CodingKeys: String, CodingKey {
        case title
        case author
        case domain
        case content
        case wordCount
        case published
        case image
    }

    init(title: String, author: String, domain: String, content: String, wordCount: Int, published: String, image: String?) {
        self.title = title
        self.author = author
        self.domain = domain
        self.content = content
        self.wordCount = wordCount
        self.published = published
        self.image = image
    }

    init(from decoder: Decoder) throws {
        let container = try decoder.container(keyedBy: CodingKeys.self)
        title = try container.decodeIfPresent(String.self, forKey: .title) ?? ""
        author = try container.decodeIfPresent(String.self, forKey: .author) ?? ""
        domain = try container.decodeIfPresent(String.self, forKey: .domain) ?? ""
        content = try container.decodeIfPresent(String.self, forKey: .content) ?? ""
        wordCount = try container.decodeIfPresent(Int.self, forKey: .wordCount) ?? 0
        published = try container.decodeIfPresent(String.self, forKey: .published) ?? ""
        image = try container.decodeIfPresent(String.self, forKey: .image)
    }

    var hasContent: Bool {
        !content.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty
    }

    /// "1,234 words · example.com", the byline under the title.
    var byline: String {
        var parts: [String] = []

        if !author.isEmpty { parts.append(author) }
        if !domain.isEmpty { parts.append(domain) }
        if wordCount > 0 { parts.append("\(wordCount) words") }

        return parts.joined(separator: "  ·  ")
    }
}

/// The scraper reports failures as HTTP 200 with an `error` key, so a 2xx alone
/// doesn't mean it worked.
nonisolated struct ScrapeFailure: Decodable {
    let error: String?
}

/// `POST /api/ai/classify`
nonisolated struct ClassifyResult: Decodable {
    struct Tag: Decodable {
        let name: String
        let isNew: Bool
    }

    let tags: [Tag]
    let type: String?
}

/// `GET /api/tags`
nonisolated struct TagCount: Decodable {
    let tag: String?
    let count: Int?
}

/// The types the web form offers, in the same order.
nonisolated enum BookmarkTypes {
    static let all = [
        "link",
        "article",
        "video",
        "audio",
        "recipe",
        "image",
        "document",
        "product",
        "game",
        "note",
        "event",
        "place",
    ]

    static func symbol(for type: String) -> String {
        switch type {
        case "article": return "newspaper"
        case "video": return "play.rectangle"
        case "audio": return "waveform"
        case "recipe": return "fork.knife"
        case "image": return "photo"
        case "document": return "doc.text"
        case "product": return "bag"
        case "game": return "gamecontroller"
        case "note": return "note.text"
        case "event": return "calendar"
        case "place": return "mappin.and.ellipse"
        case "book": return "book"
        case "film": return "film"
        case "tv": return "tv"
        case "podcast": return "mic"
        case "music": return "music.note"
        default: return "link"
        }
    }

    static func label(for type: String) -> String {
        type.prefix(1).uppercased() + type.dropFirst()
    }
}
