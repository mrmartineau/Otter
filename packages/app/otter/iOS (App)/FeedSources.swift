//
//  FeedSources.swift
//  iOS (App)
//
//  One protocol, four implementations. A new source is one type.
//

import Foundation

nonisolated protocol FeedSource: Sendable {
    var id: String { get }
    var title: String { get }
    func fetch() async throws -> [FeedItem]
}

nonisolated enum FeedHTTP {
    static let session: URLSession = {
        let config = URLSessionConfiguration.default
        config.httpAdditionalHeaders = [
            "User-Agent": "OtterReader/1.0 (+https://github.com/mrmartineau/otter)",
            // `reloadIgnoringLocalCacheData` only skips *this* device's cache.
            // Feeds sit behind CDNs, so ask those to revalidate too.
            "Cache-Control": "no-cache",
        ]
        config.timeoutIntervalForRequest = 20
        // Feeds ship long `Cache-Control` lifetimes, so the default protocol
        // cache keeps handing back the copy it already has — pull to refresh
        // included. Always go to the network; the parsed items are the cache.
        config.requestCachePolicy = .reloadIgnoringLocalCacheData
        config.urlCache = nil
        return URLSession(configuration: config)
    }()

    static func get(_ url: URL) async throws -> Data {
        let (data, response) = try await session.data(from: url)
        let status = (response as? HTTPURLResponse)?.statusCode ?? 0
        guard (200 ..< 300).contains(status) else { throw FeedError.http(status) }
        return data
    }
}

/// Front page via Algolia — one call, no per-item fetches.
nonisolated struct HackerNewsSource: FeedSource {
    let id = "hn"
    let title = "Hacker News"

    private struct Response: Decodable {
        struct Hit: Decodable {
            let objectID: String
            let title: String?
            let url: String?
            let points: Int?
            let numComments: Int?
            let author: String?
            let createdAt: String?

            enum CodingKeys: String, CodingKey {
                case objectID, title, url, points, author
                case numComments = "num_comments"
                case createdAt = "created_at"
            }
        }
        let hits: [Hit]
    }

    func fetch() async throws -> [FeedItem] {
        let data = try await FeedHTTP.get(URL(string: "https://hn.algolia.com/api/v1/search?tags=front_page&hitsPerPage=60")!)
        let response = try JSONDecoder().decode(Response.self, from: data)
        return response.hits.compactMap { hit in
            guard let hnID = Int(hit.objectID) else { return nil }
            let commentsURL = "https://news.ycombinator.com/item?id=\(hnID)"
            return FeedItem(
                id: "hn:\(hnID)",
                sourceID: id,
                title: hit.title ?? "Untitled",
                url: hit.url ?? commentsURL,
                commentsURL: commentsURL,
                commentsRef: .hackerNews(hnID),
                points: hit.points,
                commentCount: hit.numComments,
                author: hit.author,
                summary: nil,
                publishedAt: hit.createdAt.flatMap(FeedDates.parse)
            )
        }
    }
}

nonisolated struct LobstersSource: FeedSource {
    let id = "lobsters"
    let title = "Lobsters"

    private struct Story: Decodable {
        let shortID: String
        let title: String
        let url: String?
        let score: Int?
        let commentCount: Int?
        let commentsURL: String?
        let createdAt: String?
        let description: String?

        enum CodingKeys: String, CodingKey {
            case title, url, score, description
            case shortID = "short_id"
            case commentCount = "comment_count"
            case commentsURL = "comments_url"
            case createdAt = "created_at"
        }
    }

    func fetch() async throws -> [FeedItem] {
        let data = try await FeedHTTP.get(URL(string: "https://lobste.rs/hottest.json")!)
        let stories = try JSONDecoder().decode([Story].self, from: data)
        return stories.map { story in
            let commentsURL = story.commentsURL ?? "https://lobste.rs/s/\(story.shortID)"
            return FeedItem(
                id: "lobsters:\(story.shortID)",
                sourceID: id,
                title: story.title,
                url: story.url?.isEmpty == false ? story.url : commentsURL,
                commentsURL: commentsURL,
                commentsRef: .lobsters(story.shortID),
                points: story.score,
                commentCount: story.commentCount,
                author: nil,
                summary: story.description.flatMap { HTMLText.oneLine($0) },
                publishedAt: story.createdAt.flatMap(FeedDates.parse)
            )
        }
    }
}

/// RSS, Atom or JSON Feed at a URL. Techmeme is just one of these.
nonisolated struct RSSSource: FeedSource {
    let id: String
    let title: String
    let url: URL

    static let techmeme = RSSSource(id: "techmeme", title: "Techmeme", url: URL(string: "https://www.techmeme.com/feed.xml")!)
    static let pinboard = RSSSource(id: "pinboard", title: "Pinboard popular", url: URL(string: "https://feeds.pinboard.in/rss/popular/")!)

    func fetch() async throws -> [FeedItem] {
        try await RSSSource.load(url, sourceID: id).items
    }

    static func load(_ url: URL, sourceID: String) async throws -> ParsedFeed {
        let data = try await FeedHTTP.get(url)
        return try FeedParser.parse(data, sourceID: sourceID)
    }
}
