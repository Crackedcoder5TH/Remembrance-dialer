import SwiftUI

struct RootView: View {
    var body: some View {
        TabView {
            NavigationStack {
                SessionListView()
            }
            .tabItem {
                Label("Sessions", systemImage: "phone.fill")
            }

            NavigationStack {
                SettingsView()
            }
            .tabItem {
                Label("Settings", systemImage: "gear")
            }
        }
    }
}
