//
//  RootView.swift
//  iOS (App)
//

import SwiftUI

struct RootView: View {
    @StateObject private var model = OtterAppModel()
    @ObservedObject private var saveRequests = SaveRequestCenter.shared

    var body: some View {
        Group {
            if model.isRestoring {
                LaunchLoadingView()
            } else if model.isSignedIn {
                TabView {
                    BookmarksView(model: model)
                        .tabItem { Label("Bookmarks", systemImage: "bookmark") }

                    SearchView()
                        .tabItem { Label("Search", systemImage: "magnifyingglass") }

                    TagsView()
                        .tabItem { Label("Tags", systemImage: "number") }

                    TypesView()
                        .tabItem { Label("Types", systemImage: "square.grid.2x2") }

                    MoreView()
                        .tabItem { Label("More", systemImage: "ellipsis") }
                }
            } else {
                SignInView(model: model)
            }
        }
        .task { await model.restore() }
        .sheet(isPresented: $saveRequests.isRequested) {
            BookmarkFormView(url: saveRequests.url ?? "") { saved in
                saveRequests.clear()

                if saved != nil {
                    model.reloadFeed()
                    // A new bookmark changes tag, type and collection counts.
                    Task { await MetadataStore.shared.refresh() }
                }
            }
        }
    }
}
