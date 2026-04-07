import SwiftUI

@main
struct RemembranceDialerApp: App {
    @StateObject private var appState = AppState()
    @Environment(\.scenePhase) private var scenePhase

    var body: some Scene {
        WindowGroup {
            RootView()
                .environmentObject(appState)
        }
        .onChange(of: scenePhase) { _, newPhase in
            switch newPhase {
            case .active:
                appState.handleAppBecameActive()
            case .background:
                appState.handleAppEnteredBackground()
            case .inactive:
                break
            @unknown default:
                break
            }
        }
    }
}
