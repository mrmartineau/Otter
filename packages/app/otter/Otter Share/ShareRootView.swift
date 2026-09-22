//
//  ShareRootView.swift
//  Otter Share
//
//  Three actions: Quick save (one tap, the server scrapes and classifies),
//  Read later (one tap, runs extraction) and Bookmark (the full form). All
//  three talk to the API directly with the shared keychain token.
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
                            .buttonStyle(.borderedProminent)
                    } else {
                        Button {
                            Task { await save(.quickSave) }
                        } label: {
                            if savingAction == .quickSave {
                                ProgressView().frame(maxWidth: .infinity)
                            } else {
                                Label("Quick save", systemImage: "bolt").frame(maxWidth: .infinity)
                            }
                        }
                        .buttonStyle(.borderedProminent)
                        .controlSize(.large)
                        .disabled(isSaving)

                        Button {
                            Task { await save(.readLater) }
                        } label: {
                            if savingAction == .readLater {
                                ProgressView().frame(maxWidth: .infinity)
                            } else {
                                Label("Read later", systemImage: "book").frame(maxWidth: .infinity)
                            }
                        }
                        .buttonStyle(.bordered)
                        .controlSize(.large)
                        .disabled(isSaving)

                        Button {
                            showForm = true
                        } label: {
                            Label("Bookmark with details…", systemImage: "bookmark").frame(maxWidth: .infinity)
                        }
                        .buttonStyle(.bordered)
                        .controlSize(.large)
                        .disabled(isSaving)
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
                .task { isSignedIn = await OtterClient.shared.isSignedIn() }
            }
        }
    }

    private func save(_ action: Action) async {
        isSaving = true
        savingAction = action
        error = nil
        do {
            switch action {
            case .quickSave:
                _ = try await OtterClient.shared.quickSave(url: url)
            case .readLater:
                _ = try await OtterClient.shared.saveForLater(url: url)
            }
            onFinish()
        } catch {
            self.error = error.localizedDescription
        }
        isSaving = false
        savingAction = nil
    }
}
