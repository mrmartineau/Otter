//
//  LaunchLoadingView.swift
//  iOS (App)
//
//  Matches LaunchScreen.storyboard so the hand-off from the system launch image
//  to the app's first frame doesn't flash.
//

import SwiftUI

struct LaunchLoadingView: View {
    var body: some View {
        ZStack {
            Color(.systemBackground).ignoresSafeArea()

            // The logo sits dead centre, matching the launch screen, with the
            // spinner floating below it so nothing shifts on hand-off.
            Image("LargeIcon")
                .resizable()
                .frame(width: 128, height: 128)
                .accessibilityHidden(true)
                .overlay(alignment: .bottom) {
                    ProgressView()
                        .controlSize(.regular)
                        .offset(y: 56)
                }
        }
    }
}
