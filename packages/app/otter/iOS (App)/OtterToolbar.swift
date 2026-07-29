//
//  OtterToolbar.swift
//  iOS (App)
//
//  The account menu and add button that every screen carries, so a bookmark can
//  be saved from anywhere.
//

import SwiftUI

struct OtterToolbarItems: ToolbarContent {
    var body: some ToolbarContent {
        ToolbarItem(placement: .topBarLeading) {
            Menu {
                Button(role: .destructive) {
                    // Clearing credentials posts `.otterSignedOut`, which the app
                    // model listens for — no view state to thread through here.
                    Task { await OtterClient.shared.signOut() }
                } label: {
                    Label("Sign out", systemImage: "rectangle.portrait.and.arrow.right")
                }
            } label: {
                Image(systemName: "person.crop.circle")
            }
            .accessibilityLabel("Account")
        }

        ToolbarItem(placement: .topBarTrailing) {
            Button {
                SaveRequestCenter.shared.request(url: nil)
            } label: {
                Label("Add bookmark", systemImage: "plus")
            }
        }
    }
}

/// The three-dot filter menu shown on bookmark feeds, mirroring the toggles in
/// the web app's listing header.
struct BookmarkFilterMenu: View {
    @Binding var filter: BookmarkFilter

    var body: some View {
        Menu {
            Toggle(isOn: $filter.star) {
                Label("Stars", systemImage: "star")
            }

            Toggle(isOn: $filter.isPublic) {
                Label("Public", systemImage: "eye")
            }

            Section {
                Button {
                    // Each tap steps back another week, as on the web.
                    filter.window += 1
                } label: {
                    Label(
                        filter.window > 0 ? filter.windowLabel : "Last 7 days",
                        systemImage: "clock.arrow.circlepath"
                    )
                }

                if filter.window > 0 {
                    Button {
                        filter.window = 0
                    } label: {
                        Label("Clear date filter", systemImage: "xmark")
                    }
                }
            }

            if filter.isActive {
                Section {
                    Button(role: .destructive) {
                        filter = .none
                    } label: {
                        Label("Reset filters", systemImage: "arrow.counterclockwise")
                    }
                }
            }
        } label: {
            Image(
                systemName: filter.isActive
                    ? "ellipsis.circle.fill"
                    : "ellipsis.circle"
            )
        }
        .accessibilityLabel("Feed options")
    }
}
