//
//  BackgroundRefresh.swift
//  iOS (App)
//
//  Warms the on-disk caches while the app is suspended, so a cold launch opens
//  on current data instead of yesterday's.
//

import BackgroundTasks
import Foundation

enum BackgroundRefresh {
    /// Must match `BGTaskSchedulerPermittedIdentifiers` in Info.plist.
    static let taskIdentifier = "zander.martineau.otter.refresh"

    /// The floor iOS applies is much larger in practice; this is just a hint.
    private static let minimumInterval: TimeInterval = 30 * 60

    static func register() {
        BGTaskScheduler.shared.register(
            forTaskWithIdentifier: taskIdentifier,
            using: nil
        ) { task in
            guard let task = task as? BGAppRefreshTask else { return }
            handle(task)
        }
    }

    /// Call whenever the app leaves the foreground — a submitted request is
    /// consumed once it runs, so it has to be re-submitted each time.
    static func schedule() {
        let request = BGAppRefreshTaskRequest(identifier: taskIdentifier)
        request.earliestBeginDate = Date(timeIntervalSinceNow: minimumInterval)

        do {
            try BGTaskScheduler.shared.submit(request)
        } catch {
            // Simulators and devices with Background App Refresh switched off
            // reject this; the app still refreshes on foreground.
            print("Background refresh not scheduled: \(error.localizedDescription)")
        }
    }

    private static func handle(_ task: BGAppRefreshTask) {
        // Always queue the next one, whatever happens to this run.
        schedule()

        let work = Task {
            await refreshCaches()
            task.setTaskCompleted(success: true)
        }

        task.expirationHandler = {
            work.cancel()
            task.setTaskCompleted(success: false)
        }
    }

    /// Refetches the first page of bookmarks and the metadata blob. Both calls
    /// write straight to the disk caches, so the next launch reads them.
    static func refreshCaches() async {
        guard await OtterClient.shared.isSignedIn() else { return }

        _ = try? await OtterClient.shared.bookmarks(source: .all, limit: 25, offset: 0)

        guard !Task.isCancelled else { return }

        _ = try? await OtterClient.shared.meta()
    }
}
