//
//  TypesView.swift
//  iOS (App)
//

import Combine
import SwiftUI

struct TypesView: View {
    @ObservedObject private var store = MetadataStore.shared
    @Environment(\.scenePhase) private var scenePhase

    var body: some View {
        NavigationStack {
            List(store.types, id: \.type) { item in
                if let type = item.type {
                    NavigationLink(value: BookmarkFeedSource.type(type)) {
                        HStack {
                            Label(
                                BookmarkTypes.label(for: type),
                                systemImage: BookmarkTypes.symbol(for: type)
                            )
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
            .overlay {
                if store.isLoading, store.types.isEmpty {
                    ProgressView()
                } else if let error = store.loadError, store.types.isEmpty {
                    ContentUnavailableView(
                        "Couldn't load types",
                        systemImage: "exclamationmark.triangle",
                        description: Text(error)
                    )
                } else if store.types.isEmpty, !store.isLoading {
                    ContentUnavailableView(
                        "No types",
                        systemImage: "square.grid.2x2",
                        description: Text("Types are set when you save a bookmark.")
                    )
                }
            }
            .refreshable { await store.refresh() }
            .navigationTitle("Types")
            .toolbar { OtterToolbarItems() }
            .navigationDestination(for: BookmarkFeedSource.self) { source in
                BookmarkFeedView(
                    source: source,
                    emptyMessage: "Nothing saved with this type."
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
