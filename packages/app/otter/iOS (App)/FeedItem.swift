//
//  FeedItem.swift
//  iOS (App)
//
//  One story from any feed source, plus the tiny HTML-to-text helper every
//  source needs. Feeds run on-device: no server, no account.
//

import Foundation

/// Where a native comment thread comes from.
nonisolated enum CommentsRef: Hashable, Codable {
    case hackerNews(Int)
    case lobsters(String)
}

nonisolated struct FeedItem: Identifiable, Hashable, Codable {
    let id: String
    let sourceID: String
    let title: String
    let url: String?
    let commentsURL: String?
    let commentsRef: CommentsRef?
    let points: Int?
    let commentCount: Int?
    let author: String?
    let summary: String?
    let publishedAt: Date?

    var linkURL: URL? { url.flatMap(URL.init(string:)) }

    var host: String? {
        guard let url, let host = URLComponents(string: url)?.host else { return nil }
        return host.hasPrefix("www.") ? String(host.dropFirst(4)) : host
    }

    /// "142 points · 87 comments · example.com · 3h"
    var meta: String {
        var parts: [String] = []
        if let points { parts.append("\(points) points") }
        if let commentCount { parts.append("\(commentCount) comments") }
        if let host { parts.append(host) }
        if let publishedAt {
            parts.append(publishedAt.formatted(.relative(presentation: .numeric, unitsStyle: .abbreviated)))
        }
        return parts.joined(separator: " · ")
    }
}

/// A subscribed RSS/Atom/JSON feed.
nonisolated struct FeedSubscription: Identifiable, Hashable, Codable {
    let id: String
    var url: String
    var title: String
    /// OPML folder, e.g. "Design". Nested folders join with " / ".
    var folder: String?
}

nonisolated enum HTMLText {
    /// Good enough for feed summaries and comment bodies: block tags become
    /// line breaks, everything else is dropped, entities are decoded.
    static func plain(_ html: String) -> String {
        var text = html
        for tag in ["</p>", "<br>", "<br/>", "<br />", "</li>", "</blockquote>", "</pre>", "</div>"] {
            text = text.replacingOccurrences(of: tag, with: "\n", options: .caseInsensitive)
        }
        text = text.replacingOccurrences(of: "<p>", with: "\n", options: .caseInsensitive)
        text = text.replacingOccurrences(of: "<[^>]+>", with: "", options: .regularExpression)
        text = decodeEntities(text)
        text = text.replacingOccurrences(of: "\n{3,}", with: "\n\n", options: .regularExpression)
        return text.trimmingCharacters(in: .whitespacesAndNewlines)
    }

    /// A summary is one line: block breaks become spaces.
    static func oneLine(_ html: String, limit: Int = 300) -> String? {
        let text = plain(html).replacingOccurrences(of: "\\s+", with: " ", options: .regularExpression)
        return text.isEmpty ? nil : String(text.prefix(limit))
    }

    private static let named: [String: String] = [
        "amp": "&", "lt": "<", "gt": ">", "quot": "\"", "apos": "'", "#39": "'", "#x27": "'",
        "nbsp": "\u{00A0}", "#x2F": "/", "#47": "/", "mdash": "—", "ndash": "–", "hellip": "…",
        "rsquo": "’", "lsquo": "‘", "rdquo": "”", "ldquo": "“",
    ]

    static func decodeEntities(_ text: String) -> String {
        guard text.contains("&") else { return text }
        var result = ""
        var rest = Substring(text)
        while let amp = rest.firstIndex(of: "&") {
            result += rest[..<amp]
            rest = rest[amp...]
            guard let semi = rest.firstIndex(of: ";"), rest.distance(from: rest.startIndex, to: semi) <= 8 else {
                result += "&"
                rest = rest.dropFirst()
                continue
            }
            let name = String(rest[rest.index(after: rest.startIndex)..<semi])
            if let known = named[name] {
                result += known
            } else if name.hasPrefix("#x"), let code = UInt32(name.dropFirst(2), radix: 16), let scalar = Unicode.Scalar(code) {
                result.unicodeScalars.append(scalar)
            } else if name.hasPrefix("#"), let code = UInt32(name.dropFirst()), let scalar = Unicode.Scalar(code) {
                result.unicodeScalars.append(scalar)
            } else {
                result += rest[...semi]
            }
            rest = rest[rest.index(after: semi)...]
        }
        return result + rest
    }
}
