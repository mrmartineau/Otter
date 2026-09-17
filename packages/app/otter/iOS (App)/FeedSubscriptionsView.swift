//
//  FeedSubscriptionsView.swift
//  iOS (App)
//
//  Manage RSS subscriptions: add, remove, OPML in and out.
//

import SwiftUI
import UniformTypeIdentifiers

struct FeedSubscriptionsView: View {
    @ObservedObject private var store = FeedStore.shared
    @State private var isAdding = false
    @State private var newURL = ""
    @State private var isImporting = false
    @State private var message: String?
    @State private var confirmRemoveAll = false

    var body: some View {
        List {
            Section {
                ForEach(FeedStore.builtIn, id: \.id) { source in
                    Toggle(isOn: Binding(
                        get: { store.isEnabled(source) },
                        set: { store.setEnabled($0, source: source) }
                    )) {
                        Label(source.title, systemImage: "newspaper")
                    }
                }
            } header: {
                Text("Built in")
            } footer: {
                Text("Switch off the ones you don't read. They disappear from the Feeds tab.")
            }

            // One section per folder, loose feeds first.
            ForEach([nil] + store.folders.map(Optional.some), id: \.self) { folder in
                let feeds = store.subscriptions(in: folder)
                if !feeds.isEmpty || folder == nil {
                    Section {
                        ForEach(feeds) { subscription in
                            VStack(alignment: .leading, spacing: 2) {
                                Text(subscription.title)
                                Text(subscription.url).font(.caption).foregroundStyle(.secondary).lineLimit(1)
                            }
                        }
                        .onDelete { offsets in
                            for index in offsets { store.unsubscribe(feeds[index]) }
                        }

                        if folder == nil {
                            Button {
                                isAdding = true
                            } label: {
                                Label("Add feed", systemImage: "plus")
                            }
                        }
                    } header: {
                        Text(folder ?? "Subscriptions")
                    } footer: {
                        if folder == nil, store.subscriptions.isEmpty {
                            Text("RSS, Atom and JSON Feed. Import an OPML file to bring feeds over from another reader; its folders are kept.")
                        }
                    }
                }
            }

            if !store.subscriptions.isEmpty {
                Section {
                    Button("Remove all subscriptions", role: .destructive) {
                        confirmRemoveAll = true
                    }
                } footer: {
                    Text("Hacker News, Lobsters, Techmeme and Pinboard stay. Starred stories stay.")
                }
            }

            Section("OPML") {
                Button {
                    isImporting = true
                } label: {
                    Label("Import OPML…", systemImage: "square.and.arrow.down")
                }
                ShareLink(
                    item: store.exportOPML(),
                    preview: SharePreview("Otter Reader subscriptions.opml")
                ) {
                    Label("Export OPML", systemImage: "square.and.arrow.up")
                }
                .disabled(store.subscriptions.isEmpty)
            }
        }
        .navigationTitle("Feeds")
        .confirmationDialog(
            "Remove all \(store.subscriptions.count) subscriptions?",
            isPresented: $confirmRemoveAll,
            titleVisibility: .visible
        ) {
            Button("Remove all", role: .destructive) { store.unsubscribeAll() }
        }
        .alert("Add feed", isPresented: $isAdding) {
            TextField("https://example.com/feed.xml", text: $newURL)
                .textInputAutocapitalization(.never)
                .keyboardType(.URL)
            Button("Add") {
                let url = newURL
                newURL = ""
                Task {
                    do { try await store.subscribe(url: url) } catch { message = error.localizedDescription }
                }
            }
            Button("Cancel", role: .cancel) { newURL = "" }
        }
        .fileImporter(
            isPresented: $isImporting,
            allowedContentTypes: [.xml, UTType("org.opml.opml") ?? .xml, .data]
        ) { result in
            guard case let .success(url) = result else { return }
            let accessed = url.startAccessingSecurityScopedResource()
            defer { if accessed { url.stopAccessingSecurityScopedResource() } }
            guard let data = try? Data(contentsOf: url) else {
                message = "Couldn't read that file."
                return
            }
            Task {
                let result = await store.importOPML(data)
                message = "Added \(result.added) feed\(result.added == 1 ? "" : "s")."
                    + (result.failed > 0 ? " \(result.failed) couldn't be loaded." : "")
            }
        }
        .alert("Feeds", isPresented: Binding(get: { message != nil }, set: { if !$0 { message = nil } })) {
            Button("OK") {}
        } message: {
            Text(message ?? "")
        }
    }
}
