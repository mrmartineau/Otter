//
//  MarkdownContentView.swift
//  iOS (App)
//
//  Renders the markdown that `/api/scrape-content` returns.
//
//  `AttributedString(markdown:)` on its own only interprets *inline* syntax, so
//  an article's headings, lists, quotes and code blocks would all come out as
//  flat body text. This splits the source into blocks and styles each one,
//  leaving the inline formatting inside a block to AttributedString.
//

import SwiftUI

struct MarkdownContentView: View {
    let markdown: String

    // Scale with the reader's text size, so larger type keeps the same rhythm.
    @ScaledMetric(relativeTo: .body) private var lineSpacing: CGFloat = 6
    @ScaledMetric(relativeTo: .body) private var blockSpacing: CGFloat = 20
    @ScaledMetric(relativeTo: .title2) private var headingLineSpacing: CGFloat = 3

    var body: some View {
        VStack(alignment: .leading, spacing: blockSpacing) {
            ForEach(Array(MarkdownBlock.parse(markdown).enumerated()), id: \.offset) { _, block in
                view(for: block)
            }
        }
        .frame(maxWidth: .infinity, alignment: .leading)
    }

    @ViewBuilder
    private func view(for block: MarkdownBlock) -> some View {
        switch block {
        case let .heading(level, text):
            Self.inline(text)
                .font(Self.headingFont(for: level))
                .lineSpacing(headingLineSpacing)
                .padding(.top, 6)

        case let .paragraph(text):
            Self.inline(text)
                .font(.body)
                .lineSpacing(lineSpacing)

        case let .bullet(text):
            HStack(alignment: .firstTextBaseline, spacing: 8) {
                Text("•")
                Self.inline(text)
            }
            .font(.body)
            .lineSpacing(lineSpacing)

        case let .numbered(index, text):
            HStack(alignment: .firstTextBaseline, spacing: 8) {
                Text("\(index).")
                    .monospacedDigit()
                Self.inline(text)
            }
            .font(.body)
            .lineSpacing(lineSpacing)

        case let .quote(text):
            HStack(alignment: .top, spacing: 10) {
                Rectangle()
                    .fill(Color.secondary.opacity(0.4))
                    .frame(width: 3)
                Self.inline(text)
                    .font(.body)
                    .lineSpacing(lineSpacing)
                    .foregroundStyle(.secondary)
            }
            .fixedSize(horizontal: false, vertical: true)

        case let .code(text):
            // Long lines scroll rather than forcing the page wide.
            ScrollView(.horizontal, showsIndicators: false) {
                Text(text)
                    .font(.footnote.monospaced())
                    .lineSpacing(lineSpacing)
                    .padding(10)
            }
            .background(Color(.secondarySystemBackground), in: RoundedRectangle(cornerRadius: 8))

        case .rule:
            Divider()

        case let .image(url, alt):
            VStack(alignment: .leading, spacing: 4) {
                RemoteImage(url: url, maxSize: 420) { phase in
                    switch phase {
                    case let .success(image):
                        image
                            .resizable()
                            .aspectRatio(contentMode: .fit)
                            .clipShape(RoundedRectangle(cornerRadius: 8))
                    case .failure:
                        EmptyView()
                    case .loading:
                        RoundedRectangle(cornerRadius: 8)
                            .fill(Color(.tertiarySystemFill))
                            .frame(height: 160)
                    }
                }

                if !alt.isEmpty {
                    Text(alt)
                        .font(.caption)
                        .foregroundStyle(.secondary)
                }
            }
        }
    }

    private static func headingFont(for level: Int) -> Font {
        switch level {
        case 1: return .title2.bold()
        case 2: return .title3.bold()
        case 3: return .headline
        default: return .subheadline.bold()
        }
    }

    /// Bold, italics, links and inline code within a single block.
    private static func inline(_ text: String) -> Text {
        guard let attributed = try? AttributedString(
            markdown: text,
            options: .init(interpretedSyntax: .inlineOnlyPreservingWhitespace)
        ) else {
            return Text(text)
        }

        return Text(attributed)
    }
}

// MARK: - Parsing

enum MarkdownBlock {
    case heading(level: Int, text: String)
    case paragraph(String)
    case bullet(String)
    case numbered(index: String, text: String)
    case quote(String)
    case code(String)
    case rule
    case image(url: URL, alt: String)

    static func parse(_ markdown: String) -> [MarkdownBlock] {
        var blocks: [MarkdownBlock] = []
        var paragraph: [String] = []
        var fenced: [String]?

        func flushParagraph() {
            let text = paragraph.joined(separator: " ")
                .trimmingCharacters(in: .whitespaces)

            if !text.isEmpty {
                blocks.append(.paragraph(text))
            }

            paragraph = []
        }

        for rawLine in markdown.components(separatedBy: .newlines) {
            let line = rawLine.trimmingCharacters(in: .whitespaces)

            if line.hasPrefix("```") {
                if let open = fenced {
                    blocks.append(.code(open.joined(separator: "\n")))
                    fenced = nil
                } else {
                    flushParagraph()
                    fenced = []
                }
                continue
            }

            // Inside a fence, take the line exactly as written.
            if fenced != nil {
                fenced?.append(rawLine)
                continue
            }

            if line.isEmpty {
                flushParagraph()
                continue
            }

            if line == "---" || line == "***" || line == "___" {
                flushParagraph()
                blocks.append(.rule)
                continue
            }

            let hashes = line.prefix { $0 == "#" }.count

            if hashes > 0, hashes <= 6, line.dropFirst(hashes).hasPrefix(" ") {
                flushParagraph()
                blocks.append(
                    .heading(
                        level: hashes,
                        text: line.dropFirst(hashes).trimmingCharacters(in: .whitespaces)
                    )
                )
                continue
            }

            // Images come inline, mid-sentence or wrapped in a link. Lift each
            // one out as its own block and keep the surrounding text.
            if let (before, image, after) = splitImage(line) {
                if !before.isEmpty { paragraph.append(before) }
                flushParagraph()
                blocks.append(image)
                if !after.isEmpty { paragraph.append(after) }
                continue
            }

            if line.hasPrefix(">") {
                flushParagraph()
                blocks.append(.quote(line.dropFirst().trimmingCharacters(in: .whitespaces)))
                continue
            }

            if let marker = ["- ", "* ", "+ "].first(where: { line.hasPrefix($0) }) {
                flushParagraph()
                blocks.append(.bullet(String(line.dropFirst(marker.count))))
                continue
            }

            if let item = orderedItem(line) {
                flushParagraph()
                blocks.append(.numbered(index: item.index, text: item.text))
                continue
            }

            paragraph.append(line)
        }

        // An unterminated fence still shouldn't swallow the rest of the article.
        if let fenced {
            blocks.append(.code(fenced.joined(separator: "\n")))
        }

        flushParagraph()

        return blocks
    }

    private static func orderedItem(_ line: String) -> (index: String, text: String)? {
        let digits = line.prefix(while: \.isNumber)

        guard !digits.isEmpty else { return nil }

        let rest = line.dropFirst(digits.count)

        guard rest.hasPrefix(". ") else { return nil }

        return (String(digits), String(rest.dropFirst(2)))
    }

    /// `[![alt](src)](href)` or `![alt](src "title")`, anywhere in the line.
    nonisolated(unsafe) private static let imagePattern = try! NSRegularExpression(
        pattern: #"(?:\[)?!\[([^\]]*)\]\(\s*(\S+?)(?:\s+"[^"]*")?\s*\)(?:\]\([^)]*\))?"#
    )

    /// Splits the first image out of a line: text before, the image, text after.
    private static func splitImage(_ line: String) -> (String, MarkdownBlock, String)? {
        let range = NSRange(line.startIndex..., in: line)
        guard let match = imagePattern.firstMatch(in: line, range: range),
              let whole = Range(match.range, in: line),
              let altRange = Range(match.range(at: 1), in: line),
              let srcRange = Range(match.range(at: 2), in: line),
              let url = URL(string: String(line[srcRange])),
              url.scheme?.hasPrefix("http") == true
        else {
            return nil
        }

        let before = line[..<whole.lowerBound].trimmingCharacters(in: .whitespaces)
        let after = line[whole.upperBound...].trimmingCharacters(in: .whitespaces)
        return (before, .image(url: url, alt: String(line[altRange])), after)
    }
}
