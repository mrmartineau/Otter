//
//  OtterOAuth.swift
//  Shared (Core)
//
//  OAuth 2.1 (PKCE + dynamic client registration) against an Otter instance's
//  better-auth OAuth provider. Networking only — the UI half of the flow lives
//  in the app target, because app extensions cannot present a web auth session.
//

import CryptoKit
import Foundation

nonisolated enum OtterError: LocalizedError {
    case invalidInstanceURL
    case notSignedIn
    case signInCancelled
    case invalidResponse
    case server(String)
    /// Otter answered, but with a 5xx — a cold Worker or a blip, worth retrying.
    case serverUnavailable(String)
    /// The refresh token was rejected outright — the grant is genuinely gone.
    case invalidGrant

    var errorDescription: String? {
        switch self {
        case .invalidInstanceURL:
            return "That doesn't look like a valid Otter address."
        case .notSignedIn:
            return "Sign in to Otter first."
        case .signInCancelled:
            return "Sign in was cancelled."
        case .invalidResponse:
            return "Unexpected response from Otter."
        case let .server(message):
            return message
        case let .serverUnavailable(message):
            return message
        case .invalidGrant:
            return "Otter rejected the saved sign-in. Sign in again."
        }
    }
}

nonisolated enum OtterOAuth {
    static let redirectURI = "otter://oauth-callback"
    static let callbackScheme = "otter"
    static let scope = [
        "openid",
        "email",
        "offline_access",
        "bookmarks:read",
        "bookmarks:write",
        "profile:read",
    ].joined(separator: " ")

    /// Accepts `otter.example.com`, `https://otter.example.com/` etc. and
    /// returns the canonical origin with no trailing slash — the same string the
    /// instance uses as its OAuth audience.
    static func normalizeInstanceURL(_ raw: String) -> URL? {
        var text = raw.trimmingCharacters(in: .whitespacesAndNewlines)

        guard !text.isEmpty else { return nil }

        if !text.contains("://") {
            text = "https://" + text
        }

        while text.hasSuffix("/") {
            text.removeLast()
        }

        guard let url = URL(string: text), url.scheme != nil, url.host != nil else {
            return nil
        }

        return url
    }

    // MARK: - PKCE

    struct PKCE {
        let verifier: String
        let challenge: String

        static func generate() -> PKCE {
            let verifier = randomURLSafeString(byteCount: 32)
            let digest = SHA256.hash(data: Data(verifier.utf8))
            return PKCE(verifier: verifier, challenge: base64URLEncode(Data(digest)))
        }
    }

    static func randomURLSafeString(byteCount: Int) -> String {
        var bytes = [UInt8](repeating: 0, count: byteCount)
        _ = SecRandomCopyBytes(kSecRandomDefault, byteCount, &bytes)
        return base64URLEncode(Data(bytes))
    }

    private static func base64URLEncode(_ data: Data) -> String {
        data.base64EncodedString()
            .replacingOccurrences(of: "+", with: "-")
            .replacingOccurrences(of: "/", with: "_")
            .replacingOccurrences(of: "=", with: "")
    }

    // MARK: - Endpoints

    static func authURL(_ instanceURL: URL, _ path: String) -> URL {
        instanceURL.appendingPathComponent("api/auth/oauth2").appendingPathComponent(path)
    }

    /// RFC 7591 dynamic client registration: each install registers itself once
    /// per instance, so there is no client ID to configure by hand.
    static func registerClient(instanceURL: URL) async throws -> String {
        struct Registration: Encodable {
            let client_name: String
            let redirect_uris: [String]
            let grant_types: [String]
            let response_types: [String]
            let token_endpoint_auth_method: String
            let scope: String
        }

        struct Response: Decodable {
            let client_id: String
        }

        var request = URLRequest(url: authURL(instanceURL, "register"))
        request.httpMethod = "POST"
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")
        request.httpBody = try JSONEncoder().encode(
            Registration(
                client_name: "Otter for iOS",
                redirect_uris: [redirectURI],
                grant_types: ["authorization_code", "refresh_token"],
                response_types: ["code"],
                token_endpoint_auth_method: "none",
                scope: scope
            )
        )

        let data: Data

        do {
            data = try await send(request)
        } catch let OtterError.server(message) {
            // The instance has `allowDynamicClientRegistration` off, so there is
            // no way for this device to obtain a client ID.
            throw OtterError.server(
                "\(message) Update and deploy your Otter instance so the app can register itself."
            )
        }

        guard let response = try? JSONDecoder().decode(Response.self, from: data) else {
            throw OtterError.invalidResponse
        }

        return response.client_id
    }

    static func authorizationURL(
        instanceURL: URL,
        clientID: String,
        state: String,
        codeChallenge: String
    ) -> URL? {
        var components = URLComponents(
            url: authURL(instanceURL, "authorize"),
            resolvingAgainstBaseURL: false
        )
        components?.queryItems = [
            URLQueryItem(name: "response_type", value: "code"),
            URLQueryItem(name: "client_id", value: clientID),
            URLQueryItem(name: "redirect_uri", value: redirectURI),
            URLQueryItem(name: "scope", value: scope),
            URLQueryItem(name: "state", value: state),
            URLQueryItem(name: "code_challenge", value: codeChallenge),
            URLQueryItem(name: "code_challenge_method", value: "S256"),
        ]
        return components?.url
    }

    // MARK: - Tokens

    struct TokenResponse: Decodable {
        let accessToken: String
        let refreshToken: String?
        let expiresIn: Int?

        enum CodingKeys: String, CodingKey {
            case accessToken = "access_token"
            case refreshToken = "refresh_token"
            case expiresIn = "expires_in"
        }

        var expiresAt: Date? {
            expiresIn.map { Date(timeIntervalSinceNow: TimeInterval($0)) }
        }
    }

    static func exchangeCode(
        _ code: String,
        verifier: String,
        clientID: String,
        instanceURL: URL
    ) async throws -> TokenResponse {
        try await postToken(
            instanceURL: instanceURL,
            clientID: clientID,
            fields: [
                "grant_type": "authorization_code",
                "code": code,
                "code_verifier": verifier,
                "redirect_uri": redirectURI,
            ]
        )
    }

    static func refresh(
        _ refreshToken: String,
        clientID: String,
        instanceURL: URL
    ) async throws -> TokenResponse {
        try await postToken(
            instanceURL: instanceURL,
            clientID: clientID,
            fields: [
                "grant_type": "refresh_token",
                "refresh_token": refreshToken,
            ]
        )
    }

    private static func postToken(
        instanceURL: URL,
        clientID: String,
        fields: [String: String]
    ) async throws -> TokenResponse {
        var body = fields
        body["client_id"] = clientID
        // Asking for the instance itself as the resource yields a JWT access
        // token, which is what Otter's API middleware verifies.
        body["resource"] = instanceURL.absoluteString

        // Encode by hand: URLComponents leaves `+` unescaped, which a form-encoded
        // body would decode as a space.
        let unreserved = CharacterSet.alphanumerics.union(CharacterSet(charactersIn: "-._~"))
        let encoded = body
            .map { key, value in
                let name = key.addingPercentEncoding(withAllowedCharacters: unreserved) ?? key
                let escaped = value.addingPercentEncoding(withAllowedCharacters: unreserved) ?? value
                return "\(name)=\(escaped)"
            }
            .joined(separator: "&")

        var request = URLRequest(url: authURL(instanceURL, "token"))
        request.httpMethod = "POST"
        request.setValue("application/x-www-form-urlencoded", forHTTPHeaderField: "Content-Type")
        request.httpBody = Data(encoded.utf8)
        // Well inside `OtterRefreshLock.staleAfter`, so a refresh still running
        // can never have its lock broken out from under it. The default of 60s
        // would leave that window wide open.
        request.timeoutInterval = 20

        let (data, urlResponse) = try await URLSession.shared.data(for: request)
        let status = (urlResponse as? HTTPURLResponse)?.statusCode ?? 0

        guard (200 ..< 300).contains(status) else {
            let message = errorMessage(from: data) ?? "Otter returned \(status)."
            let contentType = (urlResponse as? HTTPURLResponse)?
                .value(forHTTPHeaderField: "Content-Type")

            // OAuth reports a spent or revoked grant as `invalid_grant`; anything
            // else (network, 5xx, rate limit) is transient and must not be treated
            // as a sign-out.
            if isInvalidGrant(data: data, status: status, contentType: contentType) {
                throw OtterError.invalidGrant
            }

            throw status >= 500
                ? OtterError.serverUnavailable(message)
                : OtterError.server(message)
        }

        guard let response = try? JSONDecoder().decode(TokenResponse.self, from: data) else {
            throw OtterError.invalidResponse
        }

        return response
    }

    private static func isInvalidGrant(
        data: Data,
        status: Int,
        contentType: String?
    ) -> Bool {
        struct Failure: Decodable {
            let error: String?
        }

        let code = (try? JSONDecoder().decode(Failure.self, from: data))?.error

        if let code {
            return code == "invalid_grant" || code == "invalid_client" || code == "unauthorized_client"
        }

        // No machine-readable code, so the status is all there is to go on — and
        // it's only worth trusting when the answer actually came from the token
        // endpoint. A captive portal, a proxy or an edge error page can return
        // 401 with an HTML body, and signing out over one of those costs the
        // user their whole sign-in for what is really a network blip.
        guard contentType?.localizedCaseInsensitiveContains("json") == true else {
            return false
        }

        return status == 400 || status == 401
    }

    // MARK: - Transport

    private static func send(_ request: URLRequest) async throws -> Data {
        let (data, response) = try await URLSession.shared.data(for: request)
        let status = (response as? HTTPURLResponse)?.statusCode ?? 0

        guard (200 ..< 300).contains(status) else {
            throw OtterError.server(errorMessage(from: data) ?? "Otter returned \(status).")
        }

        return data
    }

    /// better-auth reports failures as `{ error, error_description }`, the Otter
    /// API as `{ error, reason }`.
    static func errorMessage(from data: Data) -> String? {
        struct Failure: Decodable {
            let error: String?
            let errorDescription: String?
            let reason: String?
            let message: String?

            enum CodingKeys: String, CodingKey {
                case error
                case errorDescription = "error_description"
                case reason
                case message
            }
        }

        guard let failure = try? JSONDecoder().decode(Failure.self, from: data) else {
            return nil
        }

        return failure.errorDescription ?? failure.reason ?? failure.message ?? failure.error
    }
}
