//
//  ReadingListView.swift
//  iOS (App)
//
//  The Read later tab: unread and archived articles, swipe to archive, pull to
//  sync. Signed-out users see the sign-in prompt here — saving is the moment
//  an account becomes necessary.
//

import SwiftUI

struct ReadingListView: View {
    @ObservedObject var model: OtterAppModel
    @ObservedObject private var store = ReadingStore.shared

    @State private var showArchived = false
    @State private var query = ""
    @State private var reader: ReadingItem?
    @State private var isAdding = false
    @State private var newURL = ""
    @State private var saveError: String?
    @Environment(\.scenePhase) private var scenePhase

    /// A search covers both lists; otherwise the picker decides.
    private var visible: [ReadingItem] {
        let term = query.trimmingCharacters(in: .whitespaces).lowercased()
        guard !term.isEmpty else { return showArchived ? store.archived : store.unread }
        return store.items.filter {
            $0.displayTitle.lowercased().contains(term)
                || ($0.description ?? "").lowercased().contains(term)
                || ($0.host ?? "").contains(term)
        }
    }

    var body: some View {
        NavigationStack {
            Group {
                if !model.isSignedIn {
                    ContentUnavailableView {
                        Label("Read later", systemImage: "book")
                    } description: {
                        Text("Sign in to Otter to save articles and read them anywhere.")
                    } actions: {
                        Button("Sign in") { model.isSignInPresented = true }
                            .buttonStyle(.borderedProminent)
                    }
                } else {
                    VStack(spacing: 0) {
                        Picker("Show", selection: $showArchived) {
                            Text("Unread").tag(false)
                            Text("Archive").tag(true)
                        }
                        .pickerStyle(.segmented)
                        .padding(.horizontal, 16)
                        .padding(.vertical, 8)

                        list
                    }
                    .searchable(text: $query, prompt: "Search saved articles")
                }
            }
            .navigationTitle("Read later")
            .toolbar {
                ToolbarItem(placement: .topBarTrailing) {
                    Button {
                        isAdding = true
                    } label: {
                        Label("Save article", systemImage: "plus")
                    }
                    .disabled(!model.isSignedIn)
                }
            }
            .task(id: model.isSignedIn) { await store.start() }
            .onChange(of: scenePhase) { _, phase in
                if phase == .active { Task { await store.sync() } }
            }
            .sheet(item: $reader) { item in
                ArticleReaderView(item: item)
            }
            .alert("Save article", isPresented: $isAdding) {
                TextField("https://example.com/article", text: $newURL)
                    .textInputAutocapitalization(.never)
                    .keyboardType(.URL)
                Button("Save") {
                    let url = newURL
                    newURL = ""
                    Task {
                        do { try await store.save(url: url) } catch { saveError = error.localizedDescription }
                    }
                }
                Button("Cancel", role: .cancel) { newURL = "" }
            }
            .alert("Couldn't save", isPresented: Binding(
                get: { saveError != nil },
                set: { if !$0 { saveError = nil } }
            )) {
                Button("OK") {}
            } message: {
                Text(saveError ?? "")
            }
        }
    }

    private var list: some View {
        List {
            ForEach(visible) { item in
                ReadingRow(item: item)
                    .contentShape(Rectangle())
                    .onTapGesture { reader = item }
                    .swipeActions(edge: .trailing) {
                        Button {
                            showArchived ? store.unarchive(item) : store.archive(item)
                        } label: {
                            Label(
                                showArchived ? "Unarchive" : "Archive",
                                systemImage: showArchived ? "tray.and.arrow.up" : "archivebox"
                            )
                        }
                        .tint(.indigo)

                        Button {
                            Task { await store.toggleStar(item) }
                        } label: {
                            Label(item.star ? "Unstar" : "Star", systemImage: item.star ? "star.slash" : "star")
                        }
                        .tint(.yellow)
                    }
                    .swipeActions(edge: .leading) {
                        Button(role: .destructive) {
                            store.delete(item)
                        } label: {
                            Label("Remove", systemImage: "trash")
                        }
                    }
                    .contextMenu {
                        if let url = item.linkURL {
                            Link(destination: url) { Label("Open original", systemImage: "safari") }
                            Button {
                                UIPasteboard.general.string = url.absoluteString
                            } label: {
                                Label("Copy link", systemImage: "doc.on.doc")
                            }
                        }
                        if item.isFailed {
                            Button {
                                Task { try? await store.reextract(item) }
                            } label: {
                                Label("Try extracting again", systemImage: "arrow.clockwise")
                            }
                        }
                    }
            }
        }
        .listStyle(.plain)
        .overlay {
            if visible.isEmpty {
                if !query.isEmpty {
                    ContentUnavailableView.search(text: query)
                } else if store.isSyncing, store.items.isEmpty {
                    ProgressView()
                } else if let error = store.lastError, store.items.isEmpty {
                    ContentUnavailableView("Couldn't sync", systemImage: "exclamationmark.triangle", description: Text(error))
                } else {
                    ContentUnavailableView(
                        showArchived ? "Nothing archived" : "Nothing to read",
                        systemImage: showArchived ? "archivebox" : "book",
                        description: Text(
                            showArchived
                                ? "Articles you finish land here."
                                : "Share a link to Otter and pick Read later, or save one from Feeds."
                        )
                    )
                }
            }
        }
        .refreshable { await store.sync() }
    }
}

struct ReadingRow: View {
    let item: ReadingItem

    var body: some View {
        HStack(alignment: .top, spacing: 12) {
            VStack(alignment: .leading, spacing: 4) {
                Text(item.displayTitle)
                    .font(.body.weight(.medium))
                    .lineLimit(3)

                if let description = item.description, !description.isEmpty {
                    Text(description)
                        .font(.subheadline)
                        .foregroundStyle(.secondary)
                        .lineLimit(2)
                }

                HStack(spacing: 6) {
                    if item.star {
                        Image(systemName: "star.fill")
                            .foregroundStyle(.yellow)
                    }
                    Text(item.subtitle)
                }
                .font(.caption)
                .foregroundStyle(item.isFailed ? .orange : .secondary)

                if item.progress > 0, item.progress < 1 {
                    ProgressView(value: item.progress)
                        .tint(.secondary)
                        .padding(.top, 2)
                }
            }

            Spacer(minLength: 0)

            if let imageURL = item.imageURL {
                RemoteImage(url: imageURL, maxSize: 120) { phase in
                    if case let .success(image) = phase {
                        image
                            .resizable()
                            .aspectRatio(contentMode: .fill)
                            .frame(width: 60, height: 60)
                            .clipShape(RoundedRectangle(cornerRadius: 8, style: .continuous))
                    }
                }
            }
        }
        .padding(.vertical, 4)
    }
}
