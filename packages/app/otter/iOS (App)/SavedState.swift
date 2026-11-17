//
//  SavedState.swift
//  iOS (App)
//
//  The app keeps its place for a few minutes. iOS can end it while it sits in
//  the background, and a fresh launch would otherwise land on each tab's first
//  screen, with every search box and filter empty.
//
//  One timestamp covers everything. Each change is saved as it happens, so the
//  saved state always matches what was on screen when you left.
//

import SwiftUI

enum SavedState {
    static let maxAge: TimeInterval = 5 * 60
    private static let savedAtKey = "state.savedAt"

    /// The saved value, or nil when nothing is saved or it is older than `maxAge`.
    /// Views call this from their initialisers, so keep it cheap.
    static func load<Value: Decodable>(
        _ type: Value.Type,
        key: String,
        now: Date = .now,
        defaults: UserDefaults = .standard
    ) -> Value? {
        let age = now.timeIntervalSince1970 - defaults.double(forKey: savedAtKey)

        guard age < maxAge, let data = defaults.data(forKey: "state.\(key)") else { return nil }

        return try? JSONDecoder().decode(type, from: data)
    }

    static func save<Value: Encodable>(
        _ value: Value?,
        key: String,
        now: Date = .now,
        defaults: UserDefaults = .standard
    ) {
        defaults.set(value.flatMap { try? JSONEncoder().encode($0) }, forKey: "state.\(key)")
        touch(now: now, defaults: defaults)
    }

    /// Restarts the five minutes. Called as the app goes to the background, so
    /// the clock runs from the moment you leave.
    static func touch(now: Date = .now, defaults: UserDefaults = .standard) {
        defaults.set(now.timeIntervalSince1970, forKey: savedAtKey)
    }
}

/// `@State` that comes back after a relaunch, for as long as `SavedState` allows.
///
/// A tab's screen stack uses it too: `@Restored("path.feeds") var path: [FeedDestination] = []`.
/// The stack is a typed list rather than a `NavigationPath`, because a
/// `NavigationPath` can't turn a saved screen back into its type after a cold
/// start.
@propertyWrapper
struct Restored<Value: Codable>: DynamicProperty {
    @State private var value: Value
    private let key: String

    init(wrappedValue: Value, _ key: String) {
        _value = State(initialValue: SavedState.load(Value.self, key: key) ?? wrappedValue)
        self.key = key
    }

    var wrappedValue: Value {
        get { value }
        nonmutating set {
            value = newValue
            SavedState.save(newValue, key: key)
        }
    }

    var projectedValue: Binding<Value> {
        Binding(get: { value }, set: { wrappedValue = $0 })
    }
}
