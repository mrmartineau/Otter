//
//  BookmarkFeedSource.swift
//  Shared (Core)
//

import Foundation

nonisolated extension Notification.Name {
    /// Posted when stored credentials are dropped, by the user or by a failed refresh.
    static let otterSignedOut = Notification.Name("otterSignedOut")
}

/// Where a list of bookmarks comes from. Each case maps to one API endpoint.
nonisolated enum BookmarkFeedSource: Hashable {
    case all
    case tag(String)
    case collection(String)
    case search(String)
    case type(String)
    case top

    var title: String {
        switch self {
        case .all: return "Bookmarks"
        case let .tag(tag): return tag
        case let .collection(name): return name
        case .search: return "Search"
        case let .type(type): return BookmarkTypes.label(for: type)
        case .top: return "Top links"
        }
    }

    /// Only the unfiltered feed is worth caching for launch.
    var isCacheable: Bool {
        self == .all
    }

    /// Search has no star/public/window support on the API.
    var supportsFilters: Bool {
        if case .search = self { return false }
        return true
    }
}

/// One entry of `types` in `GET /api/meta`.
nonisolated struct TypeCount: Decodable {
    let type: String?
    let count: Int?
}

/// The slice of `GET /api/meta` the app reads: one request covers tags, types
/// and collections.
nonisolated struct OtterMeta: Decodable {
    let tags: [TagCount]
    let types: [TypeCount]
    let collections: [OtterCollection]

    enum CodingKeys: String, CodingKey {
        case tags
        case types
        case collections
    }

    init(from decoder: Decoder) throws {
        let container = try decoder.container(keyedBy: CodingKeys.self)
        tags = try container.decodeIfPresent([TagCount].self, forKey: .tags) ?? []
        types = try container.decodeIfPresent([TypeCount].self, forKey: .types) ?? []
        collections = try container.decodeIfPresent([OtterCollection].self, forKey: .collections) ?? []
    }
}

/// A row from `GET /api/collections-tags` — a `prefix:` namespace across tags.
nonisolated struct OtterCollection: Decodable, Identifiable, Hashable {
    let collection: String
    let bookmarkCount: Int
    let tags: [String]

    var id: String { collection }

    enum CodingKeys: String, CodingKey {
        case collection
        case bookmarkCount = "bookmark_count"
        case tags
    }

    init(from decoder: Decoder) throws {
        let container = try decoder.container(keyedBy: CodingKeys.self)
        collection = try container.decodeIfPresent(String.self, forKey: .collection) ?? ""
        bookmarkCount = try container.decodeIfPresent(Int.self, forKey: .bookmarkCount) ?? 0
        tags = try container.decodeIfPresent([String].self, forKey: .tags) ?? []
    }
}

/// The toggles the web feed header offers, applied on top of a feed source.
nonisolated struct BookmarkFilter: Hashable {
    var star = false
    var isPublic = false
    /// 0 = off, 1 = last 7 days, 2 = 8–14 days ago, and so on.
    var window = 0

    static let none = BookmarkFilter()

    var isActive: Bool {
        self != .none
    }

    var queryItems: [URLQueryItem] {
        var items: [URLQueryItem] = []

        if star {
            items.append(URLQueryItem(name: "star", value: "true"))
        }

        if isPublic {
            items.append(URLQueryItem(name: "public", value: "true"))
        }

        if window > 0 {
            items.append(URLQueryItem(name: "window", value: String(window)))
        }

        return items
    }

    /// "Last 7 days", then "8–14 days ago" and so on, matching the web wording.
    var windowLabel: String {
        window > 1 ? "\((window - 1) * 7 + 1)–\(window * 7) days ago" : "Last 7 days"
    }
}
