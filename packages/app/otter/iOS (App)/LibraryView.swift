//
//  LibraryView.swift
//  iOS (App)
//
//  The Otter bookmark manager, one tab. Signed out, it asks for an account.
//

import SwiftUI

struct LibraryView: View {
    @ObservedObject var model: OtterAppModel

    var body: some View {
        if model.isSignedIn {
            BookmarksView(model: model)
        } else {
            ContentUnavailableView {
                Label("Library", systemImage: "books.vertical")
            } description: {
                Text("Your Otter bookmarks, tags and collections live here once you sign in.")
            } actions: {
                Button("Sign in") { model.isSignInPresented = true }
                    .buttonStyle(.borderedProminent)
            }
        }
    }
}
