//
//  BookmarkFormView.swift
//  Shared (Core)
//
//  The bookmark form: URL, scrape, title/description (with AI rewrites),
//  tags (with AI classification), note, image, type and duplicate warnings.
//  Creates a bookmark or edits an existing one. Used as a sheet in the app and
//  as the whole UI of the share extension.
//

import SwiftUI
import UIKit

struct BookmarkFormView: View {
    /// The saved bookmark, or `nil` when the form was dismissed without saving.
    let onFinish: (Bookmark?) -> Void
    /// Set by the share extension, which can't present a sign-in flow itself.
    var onOpenApp: (() -> Void)?

    @StateObject private var model: BookmarkFormModel
    @FocusState private var isURLFocused: Bool
    /// An existing match being edited from its detail view.
    @State private var editingMatch: Bookmark?

    /// New bookmark, optionally pre-filled with a URL from the share sheet.
    init(
        url: String,
        onOpenApp: (() -> Void)? = nil,
        onFinish: @escaping (Bookmark?) -> Void
    ) {
        _model = StateObject(wrappedValue: BookmarkFormModel(url: url))
        self.onFinish = onFinish
        self.onOpenApp = onOpenApp
        self.autofocusURL = url.isEmpty
    }

    /// Edit an existing bookmark, pre-filled with its stored values.
    init(bookmark: Bookmark, onFinish: @escaping (Bookmark?) -> Void) {
        _model = StateObject(wrappedValue: BookmarkFormModel(bookmark: bookmark))
        self.onFinish = onFinish
        self.autofocusURL = false
    }

    private let autofocusURL: Bool

    private var title: String {
        if model.isSaved {
            return "Saved"
        }

        return model.mode.isEdit ? "Edit bookmark" : "Save to Otter"
    }

    var body: some View {
        themedBody.otterTheme()
    }

    private var themedBody: some View {
        NavigationStack {
            Form {
                if model.isSignedIn {
                    urlSection
                    duplicatesSection
                    titleSection
                    descriptionSection
                    tagsSection
                    noteSection
                    imageSection
                    typeSection
                    errorSection
                    footerSection
                } else {
                    Section {
                        Text("Sign in to Otter to save bookmarks.")
                            .foregroundStyle(.secondary)

                        if let onOpenApp {
                            Button("Open Otter", action: onOpenApp)
                        }
                    }

                    // A failed refresh explains itself here rather than leaving a
                    // dead end with a disabled Save button.
                    if let errorMessage = model.errorMessage {
                        Section {
                            Text(errorMessage).foregroundStyle(.red)
                        }
                    }
                }
            }
            .otterTheme()
            .navigationTitle(title)
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .cancellationAction) {
                    Button("Cancel") { onFinish(nil) }
                }
                ToolbarItem(placement: .confirmationAction) {
                    if model.isSaving {
                        ProgressView()
                    } else {
                        Button("Save") {
                            Task { await save() }
                        }
                        .disabled(!model.canSave)
                    }
                }
            }
            .task {
                await model.start()
                isURLFocused = autofocusURL

                // Duplicate warnings only make sense for a new bookmark.
                if !model.mode.isEdit {
                    model.checkForDuplicates()
                }
            }
            // Pushed, not presented: back returns here with the form intact.
            .navigationDestination(for: Bookmark.self) { match in
                BookmarkDetailView(bookmark: match) {
                    editingMatch = match
                }
            }
        }
        .sheet(item: $editingMatch) { match in
            // Editing an existing match — adding a tag to a link already saved,
            // say. The edit form takes no duplicates section of its own, so this
            // can't nest any further.
            BookmarkFormView(bookmark: match) { saved in
                editingMatch = nil

                if saved != nil {
                    // The match has changed; refresh so the detail view behind
                    // this sheet isn't showing stale values.
                    model.checkForDuplicates()
                }
            }
        }
    }

    // MARK: - URL

    private var urlSection: some View {
        Section {
            TextField("https://…", text: $model.url, axis: .vertical)
                .textInputAutocapitalization(.never)
                .autocorrectionDisabled()
                .keyboardType(.URL)
                .font(.callout)
                .focused($isURLFocused)
                .onSubmit {
                    Task { await model.scrapeIfURLChanged() }
                }
                .onChange(of: model.url) { _, _ in
                    if !model.mode.isEdit {
                        model.checkForDuplicates()
                    }
                }
        } header: {
            SectionHeader(
                title: "URL",
                symbol: "arrow.down.circle",
                hint: "Scrape this URL",
                isBusy: model.isScraping,
                isEnabled: model.normalizedURL != nil
            ) {
                Task { await model.scrape() }
            }
        } footer: {
            if model.hasUnusableURL {
                Text("Add a web address to save this bookmark.")
                    .foregroundStyle(.secondary)
            } else if let scrapeError = model.scrapeError {
                // Explicitly not a blocker: a link that 404s, isn't published
                // yet, or was invented on the spot is still worth saving.
                RetryNotice(
                    message: "Couldn't fetch details for this link — you can still save it. \(scrapeError)",
                    label: "Try again"
                ) {
                    Task { await model.scrape() }
                }
            }
        }
    }

    // MARK: - Duplicates

    @ViewBuilder
    private var duplicatesSection: some View {
        if !model.matchingBookmarks.isEmpty {
            Section("Possible matching items") {
                // Tappable: push the match's detail view, so you can check
                // whether it's really the same link — and edit it from there,
                // e.g. to add a tag — then come back to this form untouched.
                ForEach(model.matchingBookmarks.prefix(5)) { bookmark in
                    NavigationLink(value: bookmark) {
                        VStack(alignment: .leading, spacing: 2) {
                            Text(bookmark.displayTitle)
                                .font(.footnote)
                                .lineLimit(1)
                            if let url = bookmark.url {
                                Text(url)
                                    .font(.caption2)
                                    .foregroundStyle(.secondary)
                                    .lineLimit(1)
                            }
                        }
                    }
                }
            }
        }
    }

    // MARK: - Title & description

    private var titleSection: some View {
        Section {
            TextField("Title", text: $model.title, axis: .vertical)

            if let suggestion = model.titleSuggestion {
                SuggestionRow(text: suggestion) { model.title = suggestion }
            }
        } header: {
            SectionHeader(
                title: "Title",
                symbol: "sparkles",
                hint: "Fix with AI",
                isBusy: model.isRewritingTitle,
                isEnabled: !model.title.isEmpty
            ) {
                Task { await model.rewriteTitle() }
            }
        }
    }

    private var descriptionSection: some View {
        Section {
            TextField("Description", text: $model.descriptionText, axis: .vertical)
                .lineLimit(2 ... 8)

            if let suggestion = model.descriptionSuggestion {
                SuggestionRow(text: suggestion) { model.descriptionText = suggestion }
            }
        } header: {
            SectionHeader(
                title: "Description",
                symbol: "sparkles",
                hint: "Fix with AI",
                isBusy: model.isRewritingDescription,
                isEnabled: !model.descriptionText.isEmpty
            ) {
                Task { await model.rewriteDescription() }
            }
        }
    }

    // MARK: - Tags

    private var tagsSection: some View {
        Section {
            if !model.tags.isEmpty {
                ChipLayout {
                    ForEach(model.tags, id: \.self) { tag in
                        Button {
                            model.removeTag(tag)
                        } label: {
                            HStack(spacing: 4) {
                                if model.newTagNames.contains(tag) {
                                    Image(systemName: "circle.fill")
                                        .font(.system(size: 6))
                                        .foregroundStyle(.purple)
                                }
                                Text(tag)
                                Image(systemName: "xmark")
                                    .font(.caption2)
                            }
                        }
                        .buttonStyle(.plain)
                        .chipStyle(isSelected: true)
                    }
                }
            }

            TextField("Add a tag", text: $model.tagQuery)
                .textInputAutocapitalization(.never)
                .autocorrectionDisabled()
                .onSubmit { model.commitTagQuery() }

            if !model.tagSuggestions.isEmpty {
                ChipLayout {
                    ForEach(model.tagSuggestions, id: \.self) { tag in
                        Button {
                            model.addTag(tag)
                        } label: {
                            Text(tag)
                        }
                        .buttonStyle(.plain)
                        .chipStyle(isSelected: false)
                    }
                }
            }
        } header: {
            SectionHeader(
                title: "Tags",
                symbol: "sparkles",
                hint: "Find matching tags",
                isBusy: model.isClassifying,
                isEnabled: model.normalizedURL != nil || !model.title.isEmpty
            ) {
                Task { await model.classify() }
            }
        } footer: {
            if model.isClassifying {
                Text("Finding tags…")
            } else if model.isLoadingTags {
                Text("Loading your tags…")
            } else if let tagsError = model.tagsError {
                RetryNotice(
                    message: "Couldn't load your existing tags, so suggestions are unavailable. \(tagsError)",
                    label: "Retry"
                ) {
                    Task { await model.loadTags() }
                }
            }
        }
    }

    // MARK: - Note

    @ViewBuilder
    private var noteSection: some View {
        if model.showNote || !model.note.isEmpty {
            Section("Note") {
                TextField("Note", text: $model.note, axis: .vertical)
                    .lineLimit(3 ... 8)
            }
        } else {
            Section {
                Button("Add note") { model.showNote = true }
            }
        }
    }

    // MARK: - Image

    @ViewBuilder
    private var imageSection: some View {
        if let preview = model.imagePreviewURL {
            Section("Image") {
                // Capped at roughly a full-width row rather than decoded at the
                // source resolution, which for a hero image can be tens of MB.
                RemoteImage(url: preview, maxSize: 420) { phase in
                    switch phase {
                    case let .success(image):
                        image
                            .resizable()
                            .aspectRatio(contentMode: .fit)
                            .frame(maxWidth: .infinity)
                            .clipShape(RoundedRectangle(cornerRadius: 8))
                    case .failure:
                        // A broken preview shouldn't leave an empty gap.
                        EmptyView()
                    case .loading:
                        ProgressView().frame(maxWidth: .infinity)
                    }
                }

                TextField("Image URL", text: $model.image, axis: .vertical)
                    .textInputAutocapitalization(.never)
                    .autocorrectionDisabled()
                    .font(.caption)
            }
        }
    }

    // MARK: - Type

    private var typeSection: some View {
        Section("Type") {
            ChipLayout {
                ForEach(typeOptions, id: \.self) { option in
                    Button {
                        model.type = option
                    } label: {
                        HStack(spacing: 4) {
                            Image(systemName: BookmarkTypes.symbol(for: option))
                            Text(BookmarkTypes.label(for: option))
                        }
                    }
                    .buttonStyle(.plain)
                    .chipStyle(isSelected: model.type == option)
                }
            }
        }
    }

    /// The fixed list, plus whatever the classifier picked if it isn't on it.
    private var typeOptions: [String] {
        BookmarkTypes.all.contains(model.type)
            ? BookmarkTypes.all
            : BookmarkTypes.all + [model.type]
    }

    // MARK: - Error & footer

    @ViewBuilder
    private var errorSection: some View {
        if let errorMessage = model.errorMessage {
            Section {
                Text(errorMessage).foregroundStyle(.red)
            }
        }
    }

    private var footerSection: some View {
        Section {
            Button("Reset", role: .destructive) { model.reset() }
        }
    }

    private func save() async {
        guard let saved = await model.save() else { return }

        UINotificationFeedbackGenerator().notificationOccurred(.success)
        // Let the "Saved" title land before the sheet goes away.
        try? await Task.sleep(nanoseconds: 500_000_000)
        onFinish(saved)
    }
}

// MARK: - Building blocks

/// A section header with a trailing icon action, like the web form's label suffix.
private struct SectionHeader: View {
    let title: String
    let symbol: String
    let hint: String
    let isBusy: Bool
    let isEnabled: Bool
    let action: () -> Void

    var body: some View {
        HStack {
            Text(title)
            Spacer()
            if isBusy {
                ProgressView().controlSize(.mini)
            } else {
                Button(action: action) {
                    Image(systemName: symbol)
                        .imageScale(.medium)
                }
                .buttonStyle(.plain)
                .disabled(!isEnabled)
                .accessibilityLabel(hint)
            }
        }
    }
}

/// An inline failure with a way to try again, for the parts of the form that
/// fetch on their own. Sits in the section footer that owns the request, so it's
/// obvious which piece is missing.
private struct RetryNotice: View {
    let message: String
    let label: String
    let action: () -> Void

    var body: some View {
        VStack(alignment: .leading, spacing: 6) {
            Text(message)
                .foregroundStyle(.red)

            Button(label, action: action)
                .font(.footnote.weight(.semibold))
                .buttonStyle(.plain)
                .foregroundStyle(Color.accentColor)
        }
        .padding(.top, 2)
    }
}

private struct SuggestionRow: View {
    let text: String
    let onUse: () -> Void

    var body: some View {
        Button(action: onUse) {
            VStack(alignment: .leading, spacing: 2) {
                Text("Use scraped value")
                    .font(.caption2)
                    .foregroundStyle(.secondary)
                Text(text)
                    .font(.footnote)
                    .lineLimit(2)
            }
        }
        .buttonStyle(.plain)
    }
}

/// Wrapping row of chips.
private struct ChipLayout<Content: View>: View {
    @ViewBuilder var content: Content

    var body: some View {
        FlowLayout(spacing: 6) { content }
            .padding(.vertical, 2)
    }
}

private extension View {
    func chipStyle(isSelected: Bool) -> some View {
        font(.footnote)
            .padding(.horizontal, 10)
            .padding(.vertical, 6)
            .background(
                isSelected ? Color.accentColor.opacity(0.18) : Color.secondary.opacity(0.12),
                in: Capsule()
            )
            .foregroundStyle(isSelected ? Color.accentColor : Color.primary)
    }
}

/// Minimal flow layout — SwiftUI has no wrapping stack.
struct FlowLayout: Layout {
    var spacing: CGFloat = 6

    func sizeThatFits(proposal: ProposedViewSize, subviews: Subviews, cache: inout ()) -> CGSize {
        let maxWidth = proposal.width ?? .infinity
        var rowWidth: CGFloat = 0
        var rowHeight: CGFloat = 0
        var totalHeight: CGFloat = 0

        for subview in subviews {
            let size = subview.sizeThatFits(.unspecified)

            if rowWidth > 0, rowWidth + spacing + size.width > maxWidth {
                totalHeight += rowHeight + spacing
                rowWidth = size.width
                rowHeight = size.height
            } else {
                rowWidth += rowWidth > 0 ? spacing + size.width : size.width
                rowHeight = max(rowHeight, size.height)
            }
        }

        return CGSize(width: maxWidth == .infinity ? rowWidth : maxWidth, height: totalHeight + rowHeight)
    }

    func placeSubviews(
        in bounds: CGRect,
        proposal: ProposedViewSize,
        subviews: Subviews,
        cache: inout ()
    ) {
        var x = bounds.minX
        var y = bounds.minY
        var rowHeight: CGFloat = 0

        for subview in subviews {
            let size = subview.sizeThatFits(.unspecified)

            if x > bounds.minX, x + size.width > bounds.maxX {
                x = bounds.minX
                y += rowHeight + spacing
                rowHeight = 0
            }

            subview.place(at: CGPoint(x: x, y: y), proposal: ProposedViewSize(size))
            x += size.width + spacing
            rowHeight = max(rowHeight, size.height)
        }
    }
}
