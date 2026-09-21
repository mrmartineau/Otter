//
//  RootView.swift
//  iOS (App)
//
//  Reader first: Read later and Feeds are the front door, the bookmark manager
//  is the Library tab. Feeds need no account; the sign-in sheet appears the
//  first time something does.
//

import SwiftUI

struct RootView: View {
    @StateObject private var model = OtterAppModel()
    @ObservedObject private var saveRequests = SaveRequestCenter.shared
    @Environment(\.scenePhase) private var scenePhase
    /// Reopens on the last tab used.
    @AppStorage("tab") private var tab = "read"

    var body: some View {
        themedBody.otterTheme()
    }

    private var themedBody: some View {
        Group {
            if model.isRestoring {
                LaunchLoadingView()
            } else {
                TabView(selection: $tab) {
                    ReadingListView(model: model)
                        .tabItem { Label("Read later", systemImage: "book") }
                        .tag("read")

                    FeedsView(model: model)
                        .tabItem { Label("Feeds", systemImage: "newspaper") }
                        .tag("feeds")

                    LibraryView(model: model)
                        .tabItem { Label("Library", systemImage: "books.vertical") }
                        .tag("library")

                    SettingsView(model: model)
                        .tabItem { Label("Settings", systemImage: "gearshape") }
                        .tag("settings")
                }
            }
        }
        .task { await model.restore() }
        .onChange(of: scenePhase) { _, phase in
            guard phase == .active else { return }

            // Saving from the share sheet can rotate the grant in the extension's
            // process. Re-read before this one makes a request, so it doesn't
            // present the token that rotation retired.
            Task { await OtterClient.shared.reloadCredentials() }
        }
        .sheet(isPresented: $model.isSignInPresented) {
            SignInView(model: model)
        }
        .sheet(isPresented: $saveRequests.isRequested) {
            if model.isSignedIn {
                BookmarkFormView(url: saveRequests.url ?? "") { saved in
                    saveRequests.clear()

                    if saved != nil {
                        model.reloadFeed()
                        // A new bookmark changes tag, type and collection counts.
                        Task { await MetadataStore.shared.refresh() }
                    }
                }
            } else {
                SignInView(model: model)
            }
        }
    }
}
