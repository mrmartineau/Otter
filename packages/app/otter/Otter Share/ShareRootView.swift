//
//  ShareRootView.swift
//  Otter Share
//
//  Three actions: Quick save (one tap, the server scrapes and classifies),
//  Read later (one tap, runs extraction) and Bookmark (the full form). All
//  three talk to the API directly with the shared keychain token.
//
//  The buttons are Liquid Glass. This target is iOS 26.2 and up, so the glass
//  styles need no availability gating. They share a GlassEffectContainer
//  because glass cannot sample other glass: without it, three stacked glass
//  buttons each sample their own region and read inconsistently.
//
//  Before any button works, the sheet asks the API whether this page is
//  already saved, so a duplicate needs a deliberate "Save again". A quick
//  save keeps the sheet open with a link to the new bookmark.
//
//  ponytail: no offline queue — the extension has no App Group container. A
//  failed save shows the error; add the queue when an App Group exists.
//

import SwiftUI

struct ShareRootView: View {
    /// Which one-tap button is spinning, so only that button shows progress.
    private enum Action { case quickSave, readLater }

    let url: String
    let onOpenApp: () -> Void
    let onFinish: () -> Void

    @State private var showForm = false
    @State private var isSaving = false
    @State private var savingAction: Action?
    @State private var isSignedIn = true
    @State private var error: String?
    @State private var isChecking = true
    @State private var existing: Bookmark?
    @State private var saved: Bookmark?
    @State private var editing: Bookmark?

    var body: some View {
        if showForm {
            BookmarkFormView(url: url, onOpenApp: onOpenApp) { _ in onFinish() }
        } else {
            NavigationStack {
                VStack(spacing: 20) {
                    VStack(spacing: 6) {
                        Image("LargeIcon")
                            .resizable()
                            .frame(width: 56, height: 56)
                        Text(url)
                            .font(.footnote)
                            .foregroundStyle(.secondary)
                            .lineLimit(2)
                            .multilineTextAlignment(.center)
                    }
                    .padding(.top, 8)

                    if !isSignedIn {
                        Text("Sign in to Otter to save this page.")
                            .foregroundStyle(.secondary)
                        Button("Open Otter", action: onOpenApp)
                            .buttonStyle(.glassProminent)
                            .controlSize(.large)
                    } else if let saved {
                        bookmarkLink(saved, title: "Saved. View in Otter", systemImage: "checkmark.circle.fill")
                        Button(action: onFinish) {
                            Text("Done").frame(maxWidth: .infinity)
                        }
                        .buttonStyle(.glassProminent)
                        .controlSize(.large)
                    } else {
                        if isChecking {
                            HStack(spacing: 8) {
                                ProgressView().controlSize(.small)
                                Text("Checking if this page is saved…")
                            }
                            .font(.footnote)
                            .foregroundStyle(.secondary)
                        } else if let existing {
                            bookmarkLink(existing, title: "Already saved. View in Otter", systemImage: "bookmark.fill")
                        }

                        GlassEffectContainer(spacing: 12) {
                            VStack(spacing: 12) {
                                Button {
                                    Task { await save(.quickSave) }
                                } label: {
                                    buttonLabel(
                                        existing == nil ? "Quick save" : "Save again",
                                        systemImage: "bolt",
                                        isSpinning: savingAction == .quickSave
                                    )
                                }
                                .buttonStyle(.glassProminent)
                                .controlSize(.large)

                                Button {
                                    Task { await save(.readLater) }
                                } label: {
                                    buttonLabel("Read later", systemImage: "book", isSpinning: savingAction == .readLater)
                                }
                                .buttonStyle(.glass)
                                .controlSize(.large)

                                Button {
                                    showForm = true
                                } label: {
                                    buttonLabel("Bookmark with details…", systemImage: "bookmark", isSpinning: false)
                                }
                                .buttonStyle(.glass)
                                .controlSize(.large)
                            }
                        }
                        // Locked while checking, so a fast tap can't save a
                        // duplicate before "Already saved" shows.
                        .disabled(isSaving || isChecking)
                    }

                    if let error {
                        Text(error)
                            .font(.footnote)
                            .foregroundStyle(.red)
                            .multilineTextAlignment(.center)
                    }

                    Spacer()
                }
                .padding(20)
                .navigationTitle("Save to Otter")
                .navigationBarTitleDisplayMode(.inline)
                .toolbar {
                    ToolbarItem(placement: .cancellationAction) {
                        Button("Cancel", action: onFinish)
                    }
                }
                .task { await check() }
                // Pushed, not presented: back returns to the buttons.
                .navigationDestination(for: Bookmark.self) { bookmark in
                    BookmarkDetailView(bookmark: bookmark) { editing = bookmark }
                }
                .sheet(item: $editing) { bookmark in
                    BookmarkFormView(bookmark: bookmark) { updated in
                        editing = nil
                        guard let updated else { return }
                        if saved?.id == updated.id { saved = updated }
                        if existing?.id == updated.id { existing = updated }
                    }
                }
            }
        }
    }

    /// The label stays in place under the spinner, so the button keeps its
    /// size: a bare ProgressView is taller than a large button's text.
    private func buttonLabel(_ title: String, systemImage: String, isSpinning: Bool) -> some View {
        Label(title, systemImage: systemImage)
            .opacity(isSpinning ? 0 : 1)
            .overlay {
                if isSpinning { ProgressView().controlSize(.small) }
            }
            .frame(maxWidth: .infinity)
    }

    private func bookmarkLink(_ bookmark: Bookmark, title: String, systemImage: String) -> some View {
        NavigationLink(value: bookmark) {
            Label(title, systemImage: systemImage)
                .font(.footnote.weight(.semibold))
        }
    }

    private func check() async {
        isSignedIn = await OtterClient.shared.isSignedIn()
        // A failed check unlocks the buttons: the save itself reports errors.
        if isSignedIn, let pageURL = URL(string: url) {
            existing = (try? await OtterClient.shared.matchingBookmarks(for: pageURL))?.first
        }
        isChecking = false
    }

    private func save(_ action: Action) async {
        isSaving = true
        savingAction = action
        error = nil
        do {
            switch action {
            case .quickSave:
                // Stay open so the new bookmark can be checked.
                saved = try await OtterClient.shared.quickSave(url: url)
            case .readLater:
                _ = try await OtterClient.shared.saveForLater(url: url)
                onFinish()
            }
        } catch {
            self.error = error.localizedDescription
        }
        isSaving = false
        savingAction = nil
    }
}
