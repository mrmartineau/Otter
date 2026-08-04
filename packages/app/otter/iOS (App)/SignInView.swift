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

            registerFooter

            Spacer()
        }
        .padding(24)
    }

    /// Otter is self-hosted, so there's no one sign-up address to point at — the
    /// link follows whatever instance has been typed above.
    @ViewBuilder
    private var registerFooter: some View {
        if let registerURL {
            VStack(spacing: 4) {
                Text("Don't have an account?")
                    .font(.footnote)
                    .foregroundStyle(.secondary)

                // Opens in the browser, which is also where the sign-in flow
                // runs — so the session created here carries straight over.
                Link("Create one on this instance", destination: registerURL)
                    .font(.footnote.weight(.semibold))
            }
            .multilineTextAlignment(.center)
        }
    }

    private var registerURL: URL? {
        guard let instance = OtterOAuth.normalizeInstanceURL(model.instanceText) else {
            return nil
        }

        return instance.appending(path: "register")
    }
}
