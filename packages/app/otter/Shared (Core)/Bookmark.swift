//
//  Bookmark.swift
//  Shared (Core)
//

import Foundation

/// A row from `GET /api/bookmarks`. Only the fields the app renders are decoded.
nonisolated struct Bookmark: Identifiable, Hashable, Decodable {
    let id: String
    let url: String?
    let title: String?
    let description: String?
    let image: String?
    let note: String?
    let tags: [String]?
    let type: String?
    /// `var` so a swipe action can flip it optimistically before the PATCH lands.
    var star: Bool
    var isPublic: Bool
    let status: String
    let createdAt: Date?

    enum CodingKeys: String, CodingKey {
        case id
        case url
        case title
        case description
        case image
        case note
        case tags
        case type
        case star
        case isPublic = "public"
        case status
        case createdAt = "created_at"
    }

    init(from decoder: Decoder) throws {
        let container = try decoder.container(keyedBy: CodingKeys.self)
        id = try container.decode(String.self, forKey: .id)
        url = try container.decodeIfPresent(String.self, forKey: .url)
        title = try container.decodeIfPresent(String.self, forKey: .title)
        description = try container.decodeIfPresent(String.self, forKey: .description)
        image = try container.decodeIfPresent(String.self, forKey: .image)
        note = try container.decodeIfPresent(String.self, forKey: .note)
        tags = try container.decodeIfPresent([String].self, forKey: .tags)
        type = try container.decodeIfPresent(String.self, forKey: .type)
        star = try container.decodeIfPresent(Bool.self, forKey: .star) ?? false
        isPublic = try container.decodeIfPresent(Bool.self, forKey: .isPublic) ?? false
        status = try container.decodeIfPresent(String.self, forKey: .status) ?? "active"
        createdAt = try container
            .decodeIfPresent(String.self, forKey: .createdAt)
            .flatMap(Bookmark.parseTimestamp)
    }

    var displayTitle: String {
        if let title, !title.isEmpty { return title }
        if let host { return host }
        return url ?? "Untitled"
    }

    var host: String? {
        guard let url, let components = URLComponents(string: url), let host = components.host else {
            return nil
        }
        return host.hasPrefix("www.") ? String(host.dropFirst(4)) : host
    }

    var linkURL: URL? {
        guard let url else { return nil }
        return URL(string: url)
    }

    var imageURL: URL? {
        guard let image, !image.isEmpty else { return nil }
        return URL(string: image)
    }

    /// The site's favicon, via the same DuckDuckGo service the web app's
    /// `<Favicon>` uses — keyed on the bare hostname, as `simpleUrl` produces.
    var faviconURL: URL? {
        guard let host else { return nil }
        return URL(string: "https://icons.duckduckgo.com/ip3/\(host).ico")
    }

    /// Otter serialises timestamps with fractional seconds, which
    /// `ISO8601DateFormatter` only handles when explicitly asked.
    ///
    /// Both formatters are shared: building one per bookmark meant two
    /// allocations of a notoriously expensive object for every row decoded.
    /// `ISO8601DateFormatter` is documented as thread-safe for parsing, and
    /// neither is mutated after setup, hence `nonisolated(unsafe)`.
    nonisolated(unsafe) private static let fractionalFormatter: ISO8601DateFormatter = {
        let formatter = ISO8601DateFormatter()
        formatter.formatOptions = [.withInternetDateTime, .withFractionalSeconds]
        return formatter
    }()

    nonisolated(unsafe) private static let plainFormatter = ISO8601DateFormatter()

    static func parseTimestamp(_ value: String) -> Date? {
        if let date = fractionalFormatter.date(from: value) { return date }

        return plainFormatter.date(from: value)
    }
}

/// The envelope Otter's paginated endpoints return. `/api/collections/:name`
/// omits the paging echo, so those fields are optional.
nonisolated struct BookmarkPage: Decodable {
    let data: [Bookmark]
    let count: Int
    let limit: Int?
    let offset: Int?
}
