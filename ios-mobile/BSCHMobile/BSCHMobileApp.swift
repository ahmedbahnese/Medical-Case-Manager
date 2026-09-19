import SwiftUI
import WebKit
import AVFoundation

@main
struct BSCHMobileApp: App {
    var body: some Scene { WindowGroup { MobileServerView() } }
}

struct MobileServerView: View {
    @AppStorage("serverURL") private var serverURL = "http://192.168.1.100:3000"
    @State private var inputURL = "http://192.168.1.100:3000"
    @State private var connected = false

    var body: some View {
        VStack(spacing: 0) {
            if !connected {
                VStack(alignment: .trailing, spacing: 16) {
                    Text("BSCH Mobile").font(.title2).bold()
                    Text("اكتب عنوان السيرفر داخل شبكة المستشفى").foregroundStyle(.secondary)
                    TextField("http://192.168.1.25:3000", text: $inputURL)
                        .textInputAutocapitalization(.never).autocorrectionDisabled().textFieldStyle(.roundedBorder)
                        .multilineTextAlignment(.leading)
                    Button("اتصال") {
                        var value = inputURL.trimmingCharacters(in: .whitespacesAndNewlines)
                        if !value.hasPrefix("http://") && !value.hasPrefix("https://") { value = "http://" + value }
                        serverURL = value; inputURL = value; connected = true
                    }.buttonStyle(.borderedProminent)
                }.padding(24).frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .top)
            } else {
                MobileWebView(url: URL(string: serverURL)!, onDisconnect: { connected = false })
                    .ignoresSafeArea(.container, edges: [.bottom])
            }
        }.onAppear { inputURL = serverURL; requestMicrophone() }
    }

    private func requestMicrophone() {
        AVAudioSession.sharedInstance().requestRecordPermission { _ in }
    }
}

struct MobileWebView: UIViewRepresentable {
    let url: URL
    let onDisconnect: () -> Void

    func makeCoordinator() -> Coordinator { Coordinator(onDisconnect: onDisconnect) }
    func makeUIView(context: Context) -> WKWebView {
        let config = WKWebViewConfiguration()
        config.allowsInlineMediaPlayback = true
        config.mediaTypesRequiringUserActionForPlayback = []
        let view = WKWebView(frame: .zero, configuration: config)
        view.navigationDelegate = context.coordinator
        view.uiDelegate = context.coordinator
        view.customUserAgent = (view.value(forKey: "userAgent") as? String ?? "") + " BSCH-Mobile-App"
        view.load(URLRequest(url: url))
        return view
    }
    func updateUIView(_ view: WKWebView, context: Context) {}

    final class Coordinator: NSObject, WKNavigationDelegate, WKUIDelegate {
        let onDisconnect: () -> Void
        init(onDisconnect: @escaping () -> Void) { self.onDisconnect = onDisconnect }
        func webView(_ webView: WKWebView, decidePolicyFor action: WKNavigationAction, decisionHandler: @escaping (WKNavigationActionPolicy) -> Void) {
            decisionHandler(["http", "https"].contains(action.request.url?.scheme?.lowercased() ?? "") ? .allow : .cancel)
        }
        @available(iOS 15.4, *)
        func webView(_ webView: WKWebView, requestMediaCapturePermissionFor origin: WKSecurityOrigin, initiatedByFrame frame: WKFrameInfo, type: WKMediaCaptureType) async -> WKPermissionDecision {
            type == .microphone ? .grant : .deny
        }
    }
}
