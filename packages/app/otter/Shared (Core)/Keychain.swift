//
//  Keychain.swift
//  Shared (Core)
//
//  Minimal keychain wrapper used to share OAuth credentials between the
//  Otter app and its share extension.
//

import Foundation
import Security

/// Team-prefixed keychain access group shared by the app and its extensions.
/// Must stay in sync with `keychain-access-groups` in the entitlements files.
nonisolated let otterKeychainAccessGroup = "C49QLB3U49.zander.martineau.otter"

nonisolated struct Keychain {
    let service: String
    let accessGroup: String?

    private func query(account: String) -> [String: Any] {
        var query: [String: Any] = [
            kSecClass as String: kSecClassGenericPassword,
            kSecAttrService as String: service,
            kSecAttrAccount as String: account,
        ]

        if let accessGroup {
            query[kSecAttrAccessGroup as String] = accessGroup
        }

        return query
    }

    func read(account: String) -> Data? {
        var readQuery = query(account: account)
        readQuery[kSecReturnData as String] = true
        readQuery[kSecMatchLimit as String] = kSecMatchLimitOne

        var item: CFTypeRef?
        guard SecItemCopyMatching(readQuery as CFDictionary, &item) == errSecSuccess else {
            return nil
        }

        return item as? Data
    }

    func write(_ data: Data, account: String) {
        let itemQuery = query(account: account)
        // The share extension reads credentials while the device may be locked
        // in the background, so allow access after the first unlock.
        let attributes: [String: Any] = [
            kSecValueData as String: data,
            kSecAttrAccessible as String: kSecAttrAccessibleAfterFirstUnlock,
        ]
        let status = SecItemUpdate(itemQuery as CFDictionary, attributes as CFDictionary)

        if status == errSecItemNotFound {
            var insertQuery = itemQuery
            insertQuery.merge(attributes) { current, _ in current }
            _ = SecItemAdd(insertQuery as CFDictionary, nil)
        }
    }

    func delete(account: String) {
        _ = SecItemDelete(query(account: account) as CFDictionary)
    }
}
