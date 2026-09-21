//
//  OtterTheme.swift
//  Shared (Core)
//
//  Dark mode in two strengths. Light mode is the system's, and stays untouched.
//

import SwiftUI
import UIKit

/// Which dark palette the app draws with.
///
/// `soft` is the web app's — Radix mauve, a grey with a little violet in it.
/// `contrast` is what iOS does on its own: pure black behind white.
enum DarkTheme: String, CaseIterable, Identifiable {
    case soft
    case contrast

    /// Shared by the setting and every view that reads it.
    static let storageKey = "appearance.darkTheme"

    var id: String { rawValue }

    var label: String {
        switch self {
        case .soft: return "Soft"
        case .contrast: return "High contrast"
        }
    }

    /// The footer under the picker in Settings.
    var detail: String {
        switch self {
        case .soft:
            return "Otter's web colours: a mauve-grey background behind off-white text. Dark mode only."
        case .contrast:
            return "Pure black behind white, the way iOS draws it. Kinder to an OLED battery. Dark mode only."
        }
    }

    // MARK: - Palette
    //
    // The hex values are the web app's dark `--mauve-*` tokens, so both apps
    // read as one product. See packages/web/src/styles/colors.css.

    /// The page — `--mauve-1`.
    var background: UIColor { dark(0x12_11_13, or: .systemBackground) }

    /// Body text — `--mauve-12`.
    var text: UIColor { dark(0xEE_EE_F0, or: .label) }

    /// Otter's colour in dark mode, the system's in light — one colour either way.
    private func dark(_ hex: UInt32, or system: UIColor) -> UIColor {
        guard self == .soft else { return system }

        return UIColor { traits in
            traits.userInterfaceStyle == .dark
                ? UIColor(hex: hex)
                : system.resolvedColor(with: traits)
        }
    }
}

extension View {
    /// Paints Otter's dark palette over the system's.
    ///
    /// Put it on every `List` and `Form`, and on the root of anything shown as
    /// a sheet. A `NavigationStack` is a `UINavigationController` underneath,
    /// and that paints its own background over anything set further out — so
    /// one call at the app's root is not enough. A new screen needs its own.
    ///
    /// Rows in a plain list need `.listRowBackground(Color.clear)` as well: a
    /// cell fills itself with `systemBackground` whatever sits behind it, so
    /// without that the colour shows around the rows but never under them.
    /// Clearing a row changes nothing when the theme is off — what shows
    /// through is the colour the cell would have painted anyway.
    func otterTheme() -> some View {
        modifier(OtterThemeModifier())
    }
}

private struct OtterThemeModifier: ViewModifier {
    @AppStorage(DarkTheme.storageKey) private var theme = DarkTheme.soft
    @Environment(\.colorScheme) private var colorScheme

    @ViewBuilder
    func body(content: Content) -> some View {
        // High contrast *is* the system's dark mode, and light mode is shared
        // by both themes, so each is left exactly as it was.
        if theme == .soft, colorScheme == .dark {
            content
                // Lists and forms paint their own background; hiding it lets
                // the one below show through, descendants included.
                .scrollContentBackground(.hidden)
                .background(Color(uiColor: theme.background).ignoresSafeArea())
                .presentationBackground(Color(uiColor: theme.background))
                .foregroundStyle(Color(uiColor: theme.text))
        } else {
            content
        }
    }
}

private extension UIColor {
    /// `0xRRGGBB`, so the values can be pasted straight from the web app's CSS.
    convenience init(hex: UInt32) {
        self.init(
            red: CGFloat((hex >> 16) & 0xFF) / 255,
            green: CGFloat((hex >> 8) & 0xFF) / 255,
            blue: CGFloat(hex & 0xFF) / 255,
            alpha: 1
        )
    }
}
