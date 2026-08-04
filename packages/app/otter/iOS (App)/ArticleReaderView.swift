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

    private let url: String

    init(url: String) {
        self.url = url
    }

    func load() async {
        guard article == nil, !isLoading else { return }

        isLoading = true
        loadError = nil

        do {
            article = try await OtterClient.shared.articleContent(url: url)
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
    let bookmark: Bookmark

    @StateObject private var model: ArticleReaderModel
    @State private var mode: ArticleReaderMode

    @Environment(\.dismiss) private var dismiss
    @Environment(\.openURL) private var openURL

    init(bookmark: Bookmark, mode: ArticleReaderMode = .read) {
        self.bookmark = bookmark
        _model = StateObject(
            wrappedValue: ArticleReaderModel(url: bookmark.url ?? "")
        )
        _mode = State(initialValue: mode)
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

                        if let url = bookmark.linkURL {
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
                        if let url = bookmark.linkURL {
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

                if let url = bookmark.linkURL {
                    ToolbarItem(placement: .primaryAction) {
                        Button {
                            openURL(url)
                        } label: {
                            Label("Open in browser", systemImage: "safari")
                        }
                    }
                }
            }
            .task { await model.load() }
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

        return bookmark.displayTitle
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

            ScrollView {
                switch mode {
                case .read:
                    readBody(article)
                case .summary:
                    summaryBody
                }
            }
        }
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
