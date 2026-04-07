import SwiftUI

struct SettingsView: View {
    @EnvironmentObject var appState: AppState

    var body: some View {
        Form {
            Section("Auto-Dial") {
                Toggle("Auto-advance after call", isOn: $appState.autoAdvance)

                if appState.autoAdvance {
                    VStack(alignment: .leading, spacing: 6) {
                        HStack {
                            Text("Delay between calls")
                            Spacer()
                            Text("\(Int(appState.postCallDelaySeconds))s")
                                .foregroundStyle(.secondary)
                                .monospacedDigit()
                        }
                        Slider(
                            value: $appState.postCallDelaySeconds,
                            in: 0...15,
                            step: 1
                        )
                    }
                }
            }

            Section("Feedback") {
                Toggle("Haptic feedback", isOn: $appState.hapticFeedback)
            }

            Section("About") {
                LabeledContent("Version", value: "1.0.0")
                LabeledContent("iOS", value: "16.0+")
                Text("Sessions are saved to your Files app (Documents/sessions.json) and can be backed up or transferred.")
                    .font(.caption)
                    .foregroundStyle(.secondary)
            }

            Section("How It Works") {
                VStack(alignment: .leading, spacing: 8) {
                    HowItWorksStep(
                        number: "1",
                        text: "Create a session and load your numbers (paste, type, or import a file)."
                    )
                    HowItWorksStep(
                        number: "2",
                        text: "Tap \"Start Dialing\". iOS will show a confirmation prompt before each call \u2014 tap \"Call\" to confirm."
                    )
                    HowItWorksStep(
                        number: "3",
                        text: "After the call ends, return to this app. The next number will be dialed automatically after the delay."
                    )
                    HowItWorksStep(
                        number: "4",
                        text: "Add notes for each call, skip numbers, or pause anytime. Export results as CSV when done."
                    )
                }
                .padding(.vertical, 4)
            }
        }
        .navigationTitle("Settings")
    }
}

struct HowItWorksStep: View {
    let number: String
    let text: String

    var body: some View {
        HStack(alignment: .top, spacing: 12) {
            Text(number)
                .font(.caption)
                .fontWeight(.bold)
                .foregroundStyle(.white)
                .frame(width: 20, height: 20)
                .background(Color.blue)
                .clipShape(Circle())
            Text(text)
                .font(.caption)
                .foregroundStyle(.secondary)
        }
    }
}
