//
//  SettingsView.swift
//  iOS (App)
//

import SwiftUI

struct SettingsView: View {
    @ObservedObject var model: OtterAppModel
    @AppStorage("reader.textSize") private var textSize = ReaderTextSize.medium

    var body: some View {
        NavigationStack {
            Form {
                Section("Account") {
                    if model.isSignedIn {
                        LabeledContent("Instance", value: model.instanceText)
                        Button("Sign out", role: .destructive) {
                            Task { await model.signOut() }
                        }
                    } else {
                        Button("Sign in to Otter") { model.isSignInPresented = true }
                        Text("Feeds work without an account. Sign in to save articles for later and use your bookmarks.")
                            .font(.footnote)
                            .foregroundStyle(.secondary)
                    }
                }

                Section("Reading") {
                    Picker("Text size", selection: $textSize) {
                        ForEach(ReaderTextSize.allCases) { Text($0.label).tag($0) }
                    }
                }

                Section("Feeds") {
                    NavigationLink("Subscriptions") { FeedSubscriptionsView() }
                }

                Section("About") {
                    LabeledContent(
                        "Version",
                        value: Bundle.main.infoDictionary?["CFBundleShortVersionString"] as? String ?? "–"
                    )
                    Link("Otter on GitHub", destination: URL(string: "https://github.com/mrmartineau/otter")!)
                }
            }
            .navigationTitle("Settings")
        }
    }
}
