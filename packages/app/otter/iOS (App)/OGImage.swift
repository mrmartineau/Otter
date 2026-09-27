//
//  OGImage.swift
//  iOS (App)
//
//  Thumbnails for feed stories. Feeds carry no images and need no account, so
//  the app reads the story page's og:image itself — only for rows on screen,
//  only the page's <head>, and once per URL.
//

import SwiftUI

@MainActor
final class OGImageStore {
    static let shared = OGImageStore()

    /// Page URL → image URL, or "" for a page that has none.
    private var found: [String: String]
    private var inFlight: [String: Task<String, Never>] = [:]
    private let cache = DiskCache(fileName: "og-images.json")
    private var saveTask: Task<Void, Never>?

    private init() {
        found = cache.load([String: String].self) ?? [:]
        // ponytail: dropped wholesale past 3000 pages; feeds move on long before that.
        if found.count > 3000 { found = [:] }
    }

    func cached(for page: URL) -> URL? {
        found[page.absoluteString].flatMap { $0.isEmpty ? nil : URL(string: $0) }
    }

    func image(for page: URL) async -> URL? {
        let key = page.absoluteString
        if let known = found[key] { return known.isEmpty ? nil : URL(string: known) }

        let task = inFlight[key] ?? Task.detached(priority: .utility) {
            await Self.fetch(page) ?? ""
        }
        inFlight[key] = task
        let value = await task.value
        inFlight[key] = nil

        found[key] = value
        scheduleSave()
        return value.isEmpty ? nil : URL(string: value)
    }

    /// One write for a burst of rows, not one per row.
    private func scheduleSave() {
        saveTask?.cancel()
        saveTask = Task {
            try? await Task.sleep(for: .seconds(2))
            guard !Task.isCancelled else { return }
            cache.store((try? JSONEncoder().encode(found)) ?? Data())
        }
    }

    /// Reads up to the end of <head>, capped at 256 KB, then stops downloading.
    private nonisolated static func fetch(_ page: URL) async -> String? {
        guard ["http", "https"].contains(page.scheme ?? "") else { return nil }
        var request = URLRequest(url: page, timeoutInterval: 15)
        request.setValue("Mozilla/5.0 (compatible; OtterReader/1.0)", forHTTPHeaderField: "User-Agent")
        request.setValue("text/html", forHTTPHeaderField: "Accept")

        guard let (bytes, response) = try? await URLSession.shared.bytes(for: request),
              (response as? HTTPURLResponse).map({ (200 ..< 300).contains($0.statusCode) }) ?? false
        else { return nil }

        var data = Data()
        do {
            for try await byte in bytes {
                data.append(byte)
                if data.count >= 256 * 1024 { break }
                // Check now and then, not on every byte.
                if data.count % 4096 == 0, headEnded(data) { break }
            }
        } catch {}

        let html = String(decoding: data, as: UTF8.self)
        return imageURL(inHTML: html, base: page)?.absoluteString
    }

    private nonisolated static func headEnded(_ data: Data) -> Bool {
        data.range(of: Data("</head>".utf8)) != nil || data.range(of: Data("</HEAD>".utf8)) != nil
    }

    /// Same keys, same order as the web scraper's image rule.
    private nonisolated static let keys = [
        "og:image", "og:image:url", "og:image:secure_url",
        "twitter:image:src", "twitter:image",
    ]

    nonisolated private static let metaTag = try! NSRegularExpression(pattern: #"<meta\s[^>]*>"#, options: .caseInsensitive)
    nonisolated private static let attribute = try! NSRegularExpression(pattern: #"([a-zA-Z:-]+)\s*=\s*(?:"([^"]*)"|'([^']*)')"#)

    /// Finds the first og/twitter image, whichever of `property` or `name` the
    /// page used, and resolves it against the page.
    nonisolated static func imageURL(inHTML html: String, base: URL) -> URL? {
        var byKey: [String: String] = [:]
        let range = NSRange(html.startIndex..., in: html)

        for match in metaTag.matches(in: html, range: range) {
            guard let tagRange = Range(match.range, in: html) else { continue }
            let tag = String(html[tagRange])
            var attrs: [String: String] = [:]
            for attr in attribute.matches(in: tag, range: NSRange(tag.startIndex..., in: tag)) {
                guard let name = Range(attr.range(at: 1), in: tag) else { continue }
                let value = Range(attr.range(at: 2), in: tag) ?? Range(attr.range(at: 3), in: tag)
                attrs[tag[name].lowercased()] = value.map { String(tag[$0]) }
            }
            guard let key = (attrs["property"] ?? attrs["name"])?.lowercased(),
                  let content = attrs["content"]?.trimmingCharacters(in: .whitespaces), !content.isEmpty,
                  byKey[key] == nil
            else { continue }
            byKey[key] = HTMLText.decodeEntities(content)
        }

        for key in keys {
            if let value = byKey[key], let url = URL(string: value, relativeTo: base)?.absoluteURL,
               ["http", "https"].contains(url.scheme ?? "") {
                return url
            }
        }
        return nil
    }
}

/// A story's og:image as a row thumbnail. Draws nothing until one turns up.
struct FeedThumbnail: View {
    let page: URL?
    @State private var image: URL?

    var body: some View {
        Group {
            if let image {
                RowThumbnail(url: image)
            } else {
                // Something must be on screen for `.task` to run.
                Color.clear.frame(width: 0, height: 0)
            }
        }
            .task(id: page) {
                guard let page else { return }
                image = OGImageStore.shared.cached(for: page)
                if image == nil { image = await OGImageStore.shared.image(for: page) }
            }
    }
}
