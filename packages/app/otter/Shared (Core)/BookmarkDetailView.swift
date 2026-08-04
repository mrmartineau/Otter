//
//  BookmarkDetailView.swift
//  Shared (Core)
//
//  Everything a feed row has to leave out — the note, the full tag list, the
//  whole URL. Reached by long-pressing a row, or by tapping one of the possible
//  matches the bookmark form warns about.
//
//  Deliberately owns no `NavigationStack`, so it works both pushed onto an
//  existing stack and presented in a sheet the caller wraps.
//

import SwiftUI
import UIKit

struct BookmarkDetailView: View {
    let bookmark: Bookmark
    let onEdit: () -> Void

    @Environment(\.openURL) private var openURL

    /// Flips the copy button to a confirmation for a moment, so a tap that
    /// otherwise changes nothing on screen still reads as having worked.
    @State private var didCopy = false

    var body: some View {
        List {
            imageSection
            linkSection
            descriptionSection
            noteSection
            tagsSection
            detailsSection
        }
        .navigationTitle(bookmark.displayTitle)
        .navigationBarTitleDisplayMode(.inline)
        .toolbar {
            ToolbarItem(placement: .primaryAction) {
                Button("Edit", action: onEdit)
            }
        }
    }

    // MARK: - Sections

    @ViewBuilder
    private var imageSection: some View {
        if let imageURL = bookmark.imageURL {
            Section {
                RemoteImage(url: imageURL, maxSize: 420) { phase in
                    switch phase {
                    case let .success(image):
                        image
                            .resizable()
                            .aspectRatio(contentMode: .fit)
                            .frame(maxWidth: .infinity)
                    case .failure:
                        EmptyView()
                    case .loading:
                        ProgressView().frame(maxWidth: .infinity, minHeight: 80)
                    }
                }
                .listRowInsets(EdgeInsets())
            }
        }
    }

    private var linkSection: some View {
        Section("Link") {
            Text(bookmark.displayTitle)
                .font(.headline)

            if let url = bookmark.linkURL {
                Button {
                    openURL(url)
                } label: {
                    HStack(alignment: .top, spacing: 8) {
                        Text(url.absoluteString)
                            .font(.footnote)
                            .foregroundStyle(.secondary)
                            // The whole link, not the row's truncated host.
                            .textSelection(.enabled)

                        Spacer(minLength: 0)

                        Image(systemName: "arrow.up.right.square")
                            .foregroundStyle(Color.accentColor)
                    }
                }
                .buttonStyle(.plain)

                Button {
                    copyLink(url)
                } label: {
                    Label(
                        didCopy ? "Copied" : "Copy link",
                        systemImage: didCopy ? "checkmark" : "doc.on.doc"
                    )
                }
            }
        }
    }

    @ViewBuilder
    private var descriptionSection: some View {
        if let description = bookmark.description, !description.isEmpty {
            Section("Description") {
                Text(description)
                    .textSelection(.enabled)
            }
        }
    }

    @ViewBuilder
    private var noteSection: some View {
        if let note = bookmark.note, !note.isEmpty {
            Section("Note") {
                Text(note)
                    .textSelection(.enabled)
            }
        }
    }

    @ViewBuilder
    private var tagsSection: some View {
        if let tags = bookmark.tags, !tags.isEmpty {
            Section("Tags") {
                FlowLayout(spacing: 6) {
                    ForEach(tags, id: \.self) { tag in
                        Text(tag)
                            .font(.footnote)
                            .padding(.horizontal, 10)
                            .padding(.vertical, 6)
                            .background(Color.secondary.opacity(0.12), in: Capsule())
                    }
                }
                .padding(.vertical, 2)
            }
        }
    }

    private var detailsSection: some View {
        Section("Details") {
            if let type = bookmark.type, !type.isEmpty {
                LabeledContent("Type") {
                    Label(
                        BookmarkTypes.label(for: type),
                        systemImage: BookmarkTypes.symbol(for: type)
                    )
                }
            }

            if let created = bookmark.createdAt {
                LabeledContent("Added") {
                    Text(created, format: .dateTime.day().month(.wide).year())
                }
            }

            LabeledContent("Starred") {
                Text(bookmark.star ? "Yes" : "No")
            }

            LabeledContent("Public") {
                Text(bookmark.isPublic ? "Yes" : "No")
            }

            if bookmark.status != "active" {
                LabeledContent("Status") {
                    Text(bookmark.status.capitalized)
                }
            }
        }
    }

    // MARK: - Actions

    private func copyLink(_ url: URL) {
        UIPasteboard.general.string = url.absoluteString
        UINotificationFeedbackGenerator().notificationOccurred(.success)

        didCopy = true

        Task {
            try? await Task.sleep(nanoseconds: 1_500_000_000)
            didCopy = false
        }
    }
}
