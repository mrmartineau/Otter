//
//  RemoteImage.swift
//  Shared (Core)
//
//  A drop-in replacement for `AsyncImage` that downsamples while decoding and
//  keeps the result in a bounded cache.
//
//  `AsyncImage` decodes every image at its native size — a 1200×630 og:image is
//  ~3 MB of bitmap for a 52 pt thumbnail, and a 3000×2000 one is ~24 MB. It also
//  has no image cache, so a recycled list row re-decodes on every pass. Between
//  them that is enough to walk a long feed straight into a jetsam kill.
//

import ImageIO
import SwiftUI
import UIKit

/// Mirrors `AsyncImagePhase`, minus the error payload nothing here renders.
enum RemoteImagePhase {
    case loading
    case success(Image)
    case failure
}

struct RemoteImage<Content: View>: View {
    private let url: URL?
    /// Longest edge the decoded bitmap is allowed to have, in points. Anything
    /// larger is thumbnailed down to it before it ever reaches memory.
    private let maxSize: CGFloat
    private let content: (RemoteImagePhase) -> Content

    @Environment(\.displayScale) private var displayScale
    @State private var phase: RemoteImagePhase = .loading

    init(
        url: URL?,
        maxSize: CGFloat,
        @ViewBuilder content: @escaping (RemoteImagePhase) -> Content
    ) {
        self.url = url
        self.maxSize = maxSize
        self.content = content
    }

    var body: some View {
        content(phase)
            // Keyed on the URL, so an edited image field reloads and a recycled
            // row cancels the load it no longer needs.
            .task(id: url) {
                guard let url else {
                    phase = .failure
                    return
                }

                let pixels = maxSize * displayScale

                if let cached = ThumbnailLoader.shared.cachedImage(for: url, maxPixelSize: pixels) {
                    phase = .success(Image(uiImage: cached))
                    return
                }

                phase = .loading

                let image = await ThumbnailLoader.shared.image(for: url, maxPixelSize: pixels)

                guard !Task.isCancelled else { return }

                phase = image.map { .success(Image(uiImage: $0)) } ?? .failure
            }
    }
}

/// Fetches, downsamples and caches remote images. One in-flight request per
/// (URL, size) pair, so a list scrolling back over the same rows doesn't refetch.
@MainActor
final class ThumbnailLoader {
    static let shared = ThumbnailLoader()

    private let cache = NSCache<NSString, UIImage>()
    private var inFlight: [String: Task<UIImage?, Never>] = [:]
    private let session: URLSession

    private init() {
        // Costs are decoded byte counts, so this is a real memory ceiling rather
        // than an object count. `NSCache` also drops entries under pressure.
        cache.totalCostLimit = 24 * 1024 * 1024
        cache.countLimit = 400

        let configuration = URLSessionConfiguration.default
        // Deliberately not `URLSession.shared`: image bytes shouldn't evict the
        // API responses, and this cache is sized for images.
        configuration.urlCache = URLCache(
            memoryCapacity: 4 * 1024 * 1024,
            diskCapacity: 64 * 1024 * 1024,
            directory: nil
        )
        configuration.requestCachePolicy = .returnCacheDataElseLoad
        session = URLSession(configuration: configuration)
    }

    /// The already-decoded thumbnail, if we have one — lets a recycled row render
    /// without a placeholder frame.
    func cachedImage(for url: URL, maxPixelSize: CGFloat) -> UIImage? {
        cache.object(forKey: Self.key(url, maxPixelSize))
    }

    func image(for url: URL, maxPixelSize: CGFloat) async -> UIImage? {
        let key = Self.key(url, maxPixelSize)

        if let cached = cache.object(forKey: key) {
            return cached
        }

        if let existing = inFlight[key as String] {
            return await existing.value
        }

        // Detached so the download and the decode stay off the main actor.
        let task = Task.detached(priority: .utility) { [session] () -> UIImage? in
            guard let (data, response) = try? await session.data(from: url) else { return nil }

            if let http = response as? HTTPURLResponse, !(200 ..< 300).contains(http.statusCode) {
                return nil
            }

            return ThumbnailLoader.downsample(data, maxPixelSize: maxPixelSize)
        }

        inFlight[key as String] = task

        let image = await task.value

        inFlight[key as String] = nil

        if let image {
            cache.setObject(image, forKey: key, cost: image.decodedByteCount)
        }

        return image
    }

    private static func key(_ url: URL, _ maxPixelSize: CGFloat) -> NSString {
        "\(url.absoluteString)|\(Int(maxPixelSize.rounded()))" as NSString
    }

    /// Decodes straight to the size we're going to draw. `ImageIO` never
    /// materialises the full-resolution bitmap, so a huge source image costs no
    /// more than a small one.
    private nonisolated static func downsample(_ data: Data, maxPixelSize: CGFloat) -> UIImage? {
        guard let source = CGImageSourceCreateWithData(
            data as CFData,
            [kCGImageSourceShouldCache: false] as CFDictionary
        ) else {
            return nil
        }

        let options: [CFString: Any] = [
            kCGImageSourceCreateThumbnailFromImageAlways: true,
            // Honour EXIF orientation, otherwise some photos come out sideways.
            kCGImageSourceCreateThumbnailWithTransform: true,
            // Decode now, on this background task, rather than lazily on the
            // main thread when the row is first drawn.
            kCGImageSourceShouldCacheImmediately: true,
            kCGImageSourceThumbnailMaxPixelSize: max(1, maxPixelSize.rounded()),
        ]

        guard let thumbnail = CGImageSourceCreateThumbnailAtIndex(
            source,
            0,
            options as CFDictionary
        ) else {
            return nil
        }

        return UIImage(cgImage: thumbnail)
    }
}

private extension UIImage {
    /// What this image actually costs in memory, for `NSCache` accounting.
    var decodedByteCount: Int {
        guard let cgImage else { return 0 }
        return cgImage.bytesPerRow * cgImage.height
    }
}
