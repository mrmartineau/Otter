//
//  SignInView.swift
//  iOS (App)
//

import SwiftUI

struct SignInView: View {
    @ObservedObject var model: OtterAppModel

    var body: some View {
        VStack(spacing: 24) {
            Spacer()

            Image("LargeIcon")
                .resizable()
                .frame(width: 96, height: 96)

            VStack(spacing: 8) {
                Text("Otter")
                    .font(.largeTitle.bold())
                Text("Sign in to your Otter instance.")
                    .font(.subheadline)
                    .foregroundStyle(.secondary)
            }

            VStack(alignment: .leading, spacing: 6) {
                Text("Instance address")
                    .font(.caption)
                    .foregroundStyle(.secondary)
                TextField("https://otter.example.com", text: $model.instanceText)
                    .textFieldStyle(.roundedBorder)
                    .textInputAutocapitalization(.never)
                    .autocorrectionDisabled()
                    .keyboardType(.URL)
            }

            Button {
                Task { await model.signIn() }
            } label: {
                if model.isSigningIn {
                    ProgressView()
                        .frame(maxWidth: .infinity)
                } else {
                    Text("Sign in")
                        .frame(maxWidth: .infinity)
                }
            }
            .buttonStyle(.borderedProminent)
            .controlSize(.large)
            .disabled(model.isSigningIn)

            if let error = model.signInError {
                Text(error)
                    .font(.footnote)
                    .foregroundStyle(.red)
                    .multilineTextAlignment(.center)
            }

            Spacer()
        }
        .padding(24)
    }
}
