//
//  ArticleReaderView.swift
//  iOS (App)
//
//  The in-app reader, mirroring the web app's `/bookmark/:id/read` route: the
//  extracted article on one tab, an AI summary of it on the other.
//
//  Two endpoints back this. `GET /api/scrape-content` returns the readable
//  article as markdown; `POST /api/ai/summarise` takes that extracted body — not
//  the URL — so the summary can only run once the article has loaded.
//

import Combine
import SwiftUI

enum ArticleReaderMode: Hashable {
    case read
    case summary
}

/// What the feed asks for when you pick "Read article" or "Summary".
struct ArticleReaderRequest: Identifiable, Hashable {
    let bookmark: Bookmark
    let mode: ArticleReaderMode

    var id: String { "\(bookmark.id)-\(mode)" }
}

@MainActor
final class ArticleReaderModel: ObservableObject {
    @Published private(set) var article: ArticleContent?
    @Published private(set) var isLoading = false
    @Published private(set) var loadError: String?

    @Published private(set) var summary: String?
    @Published private(set) var isSummarising = false
    @Published private(set) var summaryError: String?

    private let loader: () async throws -> ArticleContent

    /// Live scrape of a bookmark's URL.
    init(url: String) {
        loader = { try await OtterClient.shared.articleContent(url: url) }
    }

    /// The stored article behind a reading item, cached for offline.
    init(item: ReadingItem) {
        loader = { try await ReadingStore.shared.loadContent(for: item).articleContent }
    }

    func load() async {
        guard article == nil, !isLoading else { return }

        isLoading = true
        loadError = nil

        do {
            article = try await loader()
        } catch {
            loadError = error.localizedDescription
        }

        isLoading = false
    }

    /// Runs on demand — the summary costs an AI call, so it only happens when
    /// the tab is actually opened.
    func summarise() async {
        guard summary == nil, !isSummarising, let article, article.hasContent else { return }

        isSummarising = true
        summaryError = nil

        do {
            summary = try await OtterClient.shared.summarise(article.content)
        } catch {
            summaryError = error.localizedDescription
        }

        isSummarising = false
    }

    func retrySummary() async {
        summary = nil
        await summarise()
    }
}

struct ArticleReaderView: View {
    private let fallbackTitle: String
    private let linkURL: URL?
    /// Set when reading from the reading list: enables progress and the bottom bar.
    private let readingItemID: String?

    @StateObject private var model: ArticleReaderModel
    @ObservedObject private var store = ReadingStore.shared
    @State private var mode: ArticleReaderMode
    /// A reference, not `@State`: scroll updates must not re-render the article.
    @State private var tracker = ProgressTracker()
    @AppStorage("reader.textSize") private var textSize = ReaderTextSize.medium

    @Environment(\.dismiss) private var dismiss
    @Environment(\.openURL) private var openURL

    init(bookmark: Bookmark, mode: ArticleReaderMode = .read) {
        fallbackTitle = bookmark.displayTitle
        linkURL = bookmark.linkURL
        readingItemID = nil
        _model = StateObject(
            wrappedValue: ArticleReaderModel(url: bookmark.url ?? "")
        )
        _mode = State(initialValue: mode)
    }

    init(item: ReadingItem) {
        fallbackTitle = item.displayTitle
        linkURL = item.linkURL
        readingItemID = item.id
        _model = StateObject(wrappedValue: ArticleReaderModel(item: item))
        _mode = State(initialValue: .read)
    }

    private var readingItem: ReadingItem? {
        readingItemID.flatMap(store.item(id:))
    }

    var body: some View {
        NavigationStack {
            Group {
                if model.isLoading, model.article == nil {
                    ProgressView("Fetching article…")
                        .frame(maxWidth: .infinity, maxHeight: .infinity)
                } else if let error = model.loadError {
                    ContentUnavailableView {
                        Label("Couldn't load the article", systemImage: "doc.questionmark")
                    } description: {
                        Text(error)
                    } actions: {
                        Button("Try again") {
                            Task { await model.load() }
                        }

                        if let url = linkURL {
                            Button("Open in browser") { openURL(url) }
                        }
                    }
                } else if let article = model.article, article.hasContent {
                    content(for: article)
                } else {
                    // The scraper succeeded but found nothing readable — a video
                    // page, a paywall, an app store listing.
                    ContentUnavailableView {
                        Label("Nothing to read here", systemImage: "doc.plaintext")
                    } description: {
                        Text("Otter couldn't find article text on this page.")
                    } actions: {
                        if let url = linkURL {
                            Button("Open in browser") { openURL(url) }
                        }
                    }
                }
            }
            .navigationTitle(title)
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .cancellationAction) {
                    Button("Done") { dismiss() }
                }

                ToolbarItem(placement: .primaryAction) {
                    Menu {
                        Picker("Text size", selection: $textSize) {
                            ForEach(ReaderTextSize.allCases) { size in
                                Text(size.label).tag(size)
                            }
                        }
                        if let url = linkURL {
                            Button {
                                openURL(url)
                            } label: {
                                Label("Open in browser", systemImage: "safari")
                            }
                        }
                    } label: {
                        Label("Options", systemImage: "textformat.size")
                    }
                }

                if let item = readingItem {
                    ToolbarItemGroup(placement: .bottomBar) {
                        Button {
                            item.isArchived ? store.unarchive(item) : store.archive(item)
                            dismiss()
                        } label: {
                            Label(
                                item.isArchived ? "Unarchive" : "Archive",
                                systemImage: item.isArchived ? "tray.and.arrow.up" : "archivebox"
                            )
                        }
                        Spacer()
                        Button {
                            Task { await store.toggleStar(item) }
                        } label: {
                            Label("Star", systemImage: item.star ? "star.fill" : "star")
                        }
                        Spacer()
                        if let url = linkURL {
                            ShareLink(item: url) {
                                Label("Share", systemImage: "square.and.arrow.up")
                            }
                            Spacer()
                            Button {
                                openURL(url)
                            } label: {
                                Label("Open original", systemImage: "safari")
                            }
                        }
                    }
                }
            }
            .task { await model.load() }
            .onDisappear {
                tracker.flush?.cancel()
                if let item = readingItem { store.setProgress(item, progress: tracker.value) }
            }
            // Covers both landing on Summary directly and switching to it later.
            .task(id: summaryTrigger) {
                if mode == .summary {
                    await model.summarise()
                }
            }
        }
    }

    /// The extracted title once we have one — it's usually cleaner than the
    /// stored bookmark title, which may be whatever the scraper first saw.
    private var title: String {
        if let extracted = model.article?.title, !extracted.isEmpty {
            return extracted
        }

        return fallbackTitle
    }

    /// Changes when the tab or the loaded article does, so the summary kicks off
    /// as soon as both line up.
    private var summaryTrigger: String {
        "\(mode)-\(model.article?.hasContent == true)"
    }

    private func content(for article: ArticleContent) -> some View {
        VStack(spacing: 0) {
            Picker("View", selection: $mode) {
                Text("Read").tag(ArticleReaderMode.read)
                Text("Summary").tag(ArticleReaderMode.summary)
            }
            .pickerStyle(.segmented)
            .padding(.horizontal, 16)
            .padding(.vertical, 8)

            Divider()

            GeometryReader { viewport in
                ScrollView {
                    Group {
                        switch mode {
                        case .read:
                            readBody(article)
                        case .summary:
                            summaryBody
                        }
                    }
                    .background(
                        GeometryReader { content in
                            Color.clear.preference(
                                key: ScrollProgressKey.self,
                                value: Self.progress(
                                    offset: -content.frame(in: .named("reader")).minY,
                                    content: content.size.height,
                                    viewport: viewport.size.height
                                )
                            )
                        }
                    )
                }
                .coordinateSpace(name: "reader")
                .onPreferenceChange(ScrollProgressKey.self) { value in
                    guard mode == .read, let item = readingItem, value > tracker.value else { return }
                    tracker.value = value
                    tracker.flush?.cancel()
                    tracker.flush = Task { @MainActor in
                        try? await Task.sleep(for: .seconds(1))
                        guard !Task.isCancelled else { return }
                        store.setProgress(item, progress: tracker.value)
                    }
                }
            }
        }
        .dynamicTypeSize(textSize.dynamicTypeSize)
    }

    /// 0 at the top, 1 once the end of the article is on screen.
    static func progress(offset: CGFloat, content: CGFloat, viewport: CGFloat) -> Double {
        let scrollable = content - viewport
        guard scrollable > 0 else { return content > 0 ? 1 : 0 }
        return Double(min(1, max(0, offset / scrollable)))
    }

    private func readBody(_ article: ArticleContent) -> some View {
        VStack(alignment: .leading, spacing: 16) {
            if !article.byline.isEmpty {
                Text(article.byline)
                    .font(.caption)
                    .foregroundStyle(.secondary)
            }

            MarkdownContentView(markdown: article.content)
        }
        .textSelection(.enabled)
        .padding(16)
        .frame(maxWidth: .infinity, alignment: .leading)
    }

    @ViewBuilder
    private var summaryBody: some View {
        VStack(alignment: .leading, spacing: 16) {
            if model.isSummarising {
                HStack(spacing: 8) {
                    ProgressView()
                    Text("Generating summary…")
                        .foregroundStyle(.secondary)
                }
                .frame(maxWidth: .infinity, alignment: .center)
                .padding(.top, 40)
            } else if let error = model.summaryError {
                VStack(alignment: .leading, spacing: 10) {
                    Text("Couldn't generate a summary. \(error)")
                        .foregroundStyle(.red)

                    Button("Try again") {
                        Task { await model.retrySummary() }
                    }
                    .font(.footnote.weight(.semibold))
                }
            } else if let summary = model.summary {
                MarkdownContentView(markdown: summary)
                    .textSelection(.enabled)
            }
        }
        .padding(16)
        .frame(maxWidth: .infinity, alignment: .leading)
    }
}

@MainActor
private final class ProgressTracker {
    var value: Double = 0
    var flush: Task<Void, Never>?
}

private struct ScrollProgressKey: PreferenceKey {
    static let defaultValue: Double = 0
    static func reduce(value: inout Double, nextValue: () -> Double) {
        value = nextValue()
    }
}

/// Reader text size, stored in `AppStorage` and shared with Settings.
enum ReaderTextSize: String, CaseIterable, Identifiable {
    case small, medium, large, extraLarge

    var id: String { rawValue }

    var label: String {
        switch self {
        case .small: return "Small"
        case .medium: return "Medium"
        case .large: return "Large"
        case .extraLarge: return "Extra large"
        }
    }

    var dynamicTypeSize: DynamicTypeSize {
        switch self {
        case .small: return .small
        case .medium: return .large
        case .large: return .xLarge
        case .extraLarge: return .xxxLarge
        }
    }
}
