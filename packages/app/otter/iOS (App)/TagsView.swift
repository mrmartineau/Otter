//
//  TagsView.swift
//  iOS (App)
//

import Combine
import SwiftUI

struct TagsView: View {
    @ObservedObject private var store = MetadataStore.shared
    @Environment(\.scenePhase) private var scenePhase
    @State private var query = ""

    private var filtered: [TagCount] {
        let trimmed = query.trimmingCharacters(in: .whitespacesAndNewlines).lowercased()

        guard !trimmed.isEmpty else { return store.tags }

        return store.tags.filter { ($0.tag ?? "").lowercased().contains(trimmed) }
    }

    var body: some View {
        NavigationStack {
            List(filtered, id: \.tag) { item in
                if let tag = item.tag {
                    NavigationLink(value: BookmarkFeedSource.tag(tag)) {
                        HStack {
                            Label(tag, systemImage: tag == "Untagged" ? "tray" : "number")
                            Spacer()
                            Text(item.count.map(String.init) ?? "")
                                .font(.footnote)
                                .foregroundStyle(.secondary)
                                .monospacedDigit()
                        }
                    }
                }
            }
            .listStyle(.plain)
            .searchable(text: $query, prompt: "Filter tags")
            .overlay {
                if store.isLoading, store.tags.isEmpty {
                    ProgressView()
                } else if let error = store.loadError, store.tags.isEmpty {
                    ContentUnavailableView(
                        "Couldn't load tags",
                        systemImage: "exclamationmark.triangle",
                        description: Text(error)
                    )
                } else if store.tags.isEmpty, !store.isLoading {
                    ContentUnavailableView(
                        "No tags",
                        systemImage: "number",
                        description: Text("Tags appear once you add them to bookmarks.")
                    )
                }
            }
            .refreshable { await store.refresh() }
            .navigationTitle("Tags")
            .toolbar { OtterToolbarItems() }
            .navigationDestination(for: BookmarkFeedSource.self) { source in
                BookmarkFeedView(
                    source: source,
                    emptyMessage: "Nothing saved with this tag."
                )
            }
            .task { await store.start() }
            .onChange(of: scenePhase) { _, phase in
                if phase == .active {
                    Task { await store.refreshIfStale() }
                }
            }
        }
    }
}
