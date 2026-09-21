//
//  SettingsView.swift
//  iOS (App)
//

import SwiftUI

struct SettingsView: View {
    @ObservedObject var model: OtterAppModel
    @AppStorage("reader.textSize") private var textSize = ReaderTextSize.medium
    @AppStorage("reader.font") private var fontDesign = ReaderFont.system
    @AppStorage("feeds.openInReader") private var openInReader = true
    @AppStorage(DarkTheme.storageKey) private var darkTheme = DarkTheme.soft

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

                Section {
                    Picker("Dark mode", selection: $darkTheme) {
                        ForEach(DarkTheme.allCases) { Text($0.label).tag($0) }
                    }
                    .pickerStyle(.segmented)
                } header: {
                    Text("Appearance")
                } footer: {
                    Text(darkTheme.detail)
                }

                Section {
                    Picker("Font", selection: $fontDesign) {
                        ForEach(ReaderFont.allCases) { Text($0.label).tag($0) }
                    }
                    Picker("Text size", selection: $textSize) {
                        ForEach(ReaderTextSize.allCases) { Text($0.label).tag($0) }
                    }
                    // A live sample, so you can see the choice without opening an article.
                    Text("The quick brown fox jumps over the lazy dog.")
                        .font(.body)
                        .fontDesign(fontDesign.design)
                        .dynamicTypeSize(textSize.dynamicTypeSize)
                        .foregroundStyle(.secondary)
                } header: {
                    Text("Reading")
                }

                Section {
                    NavigationLink("Subscriptions") { FeedSubscriptionsView() }
                    Toggle("Open stories in the reader", isOn: $openInReader)
                } header: {
                    Text("Feeds")
                } footer: {
                    Text("Needs an Otter account, which extracts the article. Off, stories open in the browser.")
                }

                Section("About") {
                    LabeledContent(
                        "Version",
                        value: Bundle.main.infoDictionary?["CFBundleShortVersionString"] as? String ?? "–"
                    )
                    Link("Otter on GitHub", destination: URL(string: "https://github.com/mrmartineau/otter")!)
                }
            }
            .otterTheme()
            .navigationTitle("Settings")
        }
    }
}
