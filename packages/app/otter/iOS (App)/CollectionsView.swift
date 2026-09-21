//
//  CollectionsView.swift
//  iOS (App)
//
//  Collections are the `prefix:` namespaces across your tags — the same
//  grouping the web app shows.
//

import Combine
import SwiftUI

/// The collections list. Hosted inside the More tab's navigation stack.
struct CollectionsList: View {
    @ObservedObject private var store = MetadataStore.shared
    @Environment(\.scenePhase) private var scenePhase

    var body: some View {
        List(store.collections) { collection in
            NavigationLink(value: collection) {
                VStack(alignment: .leading, spacing: 4) {
                    HStack {
                        Label(collection.collection, systemImage: "folder")
                        Spacer()
                        Text("\(collection.bookmarkCount)")
                            .font(.footnote)
                            .foregroundStyle(.secondary)
                            .monospacedDigit()
                    }

                    if !collection.tags.isEmpty {
                        Text(collection.tags.joined(separator: " · "))
                            .font(.caption2)
                            .foregroundStyle(.secondary)
                            .lineLimit(1)
                    }
                }
            }
            .listRowBackground(Color.clear)
        }
        .listStyle(.plain)
        .otterTheme()
        .overlay {
            if store.isLoading, store.collections.isEmpty {
                ProgressView()
            } else if let error = store.loadError, store.collections.isEmpty {
                ContentUnavailableView(
                    "Couldn't load collections",
                    systemImage: "exclamationmark.triangle",
                    description: Text(error)
                )
            } else if store.collections.isEmpty, !store.isLoading {
                ContentUnavailableView(
                    "No collections",
                    systemImage: "folder",
                    description: Text("Prefix tags with a colon — like dev:react — to group them.")
                )
            }
        }
        .refreshable { await store.refresh() }
        .navigationTitle("Collections")
        .toolbar { OtterToolbarItems() }
        .task { await store.start() }
        .onChange(of: scenePhase) { _, phase in
            if phase == .active {
                Task { await store.refreshIfStale() }
            }
        }
    }
}
