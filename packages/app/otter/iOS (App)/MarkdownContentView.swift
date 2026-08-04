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

    var body: some View {
        VStack(alignment: .leading, spacing: 14) {
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
                .padding(.top, 6)

        case let .paragraph(text):
            Self.inline(text)
                .font(.body)

        case let .bullet(text):
            HStack(alignment: .firstTextBaseline, spacing: 8) {
                Text("•")
                Self.inline(text)
            }
            .font(.body)

        case let .numbered(index, text):
            HStack(alignment: .firstTextBaseline, spacing: 8) {
                Text("\(index).")
                    .monospacedDigit()
                Self.inline(text)
            }
            .font(.body)

        case let .quote(text):
            HStack(alignment: .top, spacing: 10) {
                Rectangle()
                    .fill(Color.secondary.opacity(0.4))
                    .frame(width: 3)
                Self.inline(text)
                    .font(.body)
                    .foregroundStyle(.secondary)
            }
            .fixedSize(horizontal: false, vertical: true)

        case let .code(text):
            // Long lines scroll rather than forcing the page wide.
            ScrollView(.horizontal, showsIndicators: false) {
                Text(text)
                    .font(.footnote.monospaced())
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

            if let image = imageBlock(line) {
                flushParagraph()
                blocks.append(image)
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

    /// A line that is nothing but `![alt](url)`.
    private static func imageBlock(_ line: String) -> MarkdownBlock? {
        guard line.hasPrefix("!["), line.hasSuffix(")"),
              let closeBracket = line.firstIndex(of: "]")
        else {
            return nil
        }

        let afterBracket = line.index(after: closeBracket)

        guard afterBracket < line.endIndex, line[afterBracket] == "(" else { return nil }

        let alt = String(line[line.index(line.startIndex, offsetBy: 2) ..< closeBracket])
        let target = line[line.index(after: afterBracket) ..< line.index(before: line.endIndex)]
        // Markdown allows a title after the URL: ![alt](src "title")
        let source = target.components(separatedBy: " ").first ?? String(target)

        guard let url = URL(string: source) else { return nil }

        return .image(url: url, alt: alt)
    }
}
