//
//  FeedParser.swift
//  iOS (App)
//
//  RSS 2.0, Atom and JSON Feed with Foundation's XMLParser — no dependency.
//

import Foundation

nonisolated struct ParsedFeed {
    var title: String?
    var items: [FeedItem]
}

nonisolated enum FeedParser {
    static func parse(_ data: Data, sourceID: String) throws -> ParsedFeed {
        if let first = data.first(where: { !" \t\r\n".utf8.contains($0) }), first == UInt8(ascii: "{") {
            return try parseJSONFeed(data, sourceID: sourceID)
        }

        let parser = XMLFeedParser(sourceID: sourceID)
        let xml = XMLParser(data: data)
        xml.delegate = parser
        xml.shouldProcessNamespaces = false
        guard xml.parse() || !parser.items.isEmpty else {
            throw FeedError.unreadable(xml.parserError?.localizedDescription ?? "Not a feed")
        }
        return ParsedFeed(title: parser.feedTitle, items: parser.items)
    }

    // MARK: JSON Feed

    private struct JSONFeed: Decodable {
        struct Item: Decodable {
            let id: String?
            let url: String?
            let title: String?
            let contentText: String?
            let contentHtml: String?
            let summary: String?
            let datePublished: String?

            enum CodingKeys: String, CodingKey {
                case id, url, title, summary
                case contentText = "content_text"
                case contentHtml = "content_html"
                case datePublished = "date_published"
            }
        }

        let title: String?
        let items: [Item]
    }

    private static func parseJSONFeed(_ data: Data, sourceID: String) throws -> ParsedFeed {
        let feed = try JSONDecoder().decode(JSONFeed.self, from: data)
        let items = feed.items.map { item in
            let summary = item.summary ?? item.contentText ?? item.contentHtml
            return FeedItem(
                id: "\(sourceID):\(item.id ?? item.url ?? UUID().uuidString)",
                sourceID: sourceID,
                title: item.title ?? item.url ?? "Untitled",
                url: item.url,
                commentsURL: nil,
                commentsRef: nil,
                points: nil,
                commentCount: nil,
                author: nil,
                summary: summary.flatMap { HTMLText.oneLine($0) },
                publishedAt: item.datePublished.flatMap(FeedDates.parse)
            )
        }
        return ParsedFeed(title: feed.title, items: items)
    }
}

nonisolated enum FeedError: LocalizedError {
    case unreadable(String)
    case http(Int)

    var errorDescription: String? {
        switch self {
        case let .unreadable(reason): return "Couldn't read that feed. \(reason)"
        case let .http(status): return "The feed returned \(status)."
        }
    }
}

nonisolated enum FeedDates {
    nonisolated(unsafe) private static let iso: ISO8601DateFormatter = {
        let f = ISO8601DateFormatter()
        f.formatOptions = [.withInternetDateTime, .withFractionalSeconds]
        return f
    }()
    nonisolated(unsafe) private static let isoPlain = ISO8601DateFormatter()
    private static let rfc822: [DateFormatter] = [
        "EEE, dd MMM yyyy HH:mm:ss Z",
        "EEE, dd MMM yyyy HH:mm:ss zzz",
        "dd MMM yyyy HH:mm:ss Z",
        "EEE, dd MMM yyyy HH:mm Z",
    ].map { format in
        let f = DateFormatter()
        f.locale = Locale(identifier: "en_US_POSIX")
        f.dateFormat = format
        return f
    }

    static func parse(_ text: String) -> Date? {
        let trimmed = text.trimmingCharacters(in: .whitespacesAndNewlines)
        if let date = iso.date(from: trimmed) ?? isoPlain.date(from: trimmed) { return date }
        for formatter in rfc822 {
            if let date = formatter.date(from: trimmed) { return date }
        }
        return nil
    }
}

/// RSS `<item>` and Atom `<entry>` share one walker: both are a flat set of
/// child elements under a repeating container.
nonisolated private final class XMLFeedParser: NSObject, XMLParserDelegate {
    let sourceID: String
    var feedTitle: String?
    var items: [FeedItem] = []

    private var inItem = false
    private var path: [String] = []
    private var text = ""
    private var current: [String: String] = [:]
    private var atomLink: String?

    init(sourceID: String) {
        self.sourceID = sourceID
    }

    func parser(_ parser: XMLParser, didStartElement name: String, namespaceURI: String?, qualifiedName: String?, attributes: [String: String] = [:]) {
        path.append(name)
        text = ""

        if name == "item" || name == "entry" {
            inItem = true
            current = [:]
            atomLink = nil
        } else if inItem, name == "link", let href = attributes["href"] {
            // Atom: prefer rel="alternate" (or no rel) over enclosures and self links.
            let rel = attributes["rel"] ?? "alternate"
            if rel == "alternate" || atomLink == nil { atomLink = href }
        }
    }

    func parser(_ parser: XMLParser, foundCharacters string: String) {
        text += string
    }

    func parser(_ parser: XMLParser, foundCDATA CDATABlock: Data) {
        text += String(data: CDATABlock, encoding: .utf8) ?? ""
    }

    func parser(_ parser: XMLParser, didEndElement name: String, namespaceURI: String?, qualifiedName: String?) {
        defer { path.removeLast() }
        let value = text.trimmingCharacters(in: .whitespacesAndNewlines)

        if !inItem {
            // <channel><title> or <feed><title>, but not an item's.
            if name == "title", feedTitle == nil, path.count <= 3 { feedTitle = value }
            return
        }

        if name == "item" || name == "entry" {
            inItem = false
            items.append(makeItem())
            return
        }

        // First value wins, so <content> doesn't overwrite <summary>.
        if current[name] == nil, !value.isEmpty { current[name] = value }
    }

    private func makeItem() -> FeedItem {
        let url = current["link"].flatMap { $0.isEmpty ? nil : $0 } ?? atomLink
        let guid = current["guid"] ?? current["id"] ?? url ?? UUID().uuidString
        let raw = current["description"] ?? current["summary"] ?? current["content"] ?? current["content:encoded"]
        let date = (current["pubDate"] ?? current["published"] ?? current["updated"] ?? current["dc:date"]).flatMap(FeedDates.parse)

        return FeedItem(
            id: "\(sourceID):\(guid)",
            sourceID: sourceID,
            title: HTMLText.plain(current["title"] ?? url ?? "Untitled"),
            url: url,
            commentsURL: current["comments"],
            commentsRef: nil,
            points: nil,
            commentCount: nil,
            author: current["dc:creator"] ?? current["author"] ?? current["name"],
            summary: raw.flatMap { HTMLText.oneLine($0) },
            publishedAt: date
        )
    }
}
