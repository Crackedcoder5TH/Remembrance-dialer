import SwiftUI

struct SessionDetailView: View {
    @EnvironmentObject var appState: AppState
    let sessionID: UUID

    @State private var noteText = ""
    @State private var showAddNumbers = false
    @State private var showShareSheet = false
    @State private var csvExport: String = ""

    private var session: DialSession? {
        appState.sessions.first { $0.id == sessionID }
    }

    var body: some View {
        ScrollView {
            VStack(spacing: 20) {
                if let session {
                    progressSection(session)
                    currentEntryCard(session)
                    actionButtons(session)
                    phaseStatusView
                    upcomingSection(session)
                    completedSection(session)
                }
            }
            .padding()
        }
        .navigationTitle(session?.name ?? "Session")
        .navigationBarTitleDisplayMode(.inline)
        .toolbar {
            ToolbarItem(placement: .primaryAction) {
                Menu {
                    Button {
                        showAddNumbers = true
                    } label: {
                        Label("Add Numbers", systemImage: "plus.circle")
                    }
                    Button {
                        if let session {
                            csvExport = appState.exportSessionCSV(session)
                            showShareSheet = true
                        }
                    } label: {
                        Label("Export CSV", systemImage: "square.and.arrow.up")
                    }
                } label: {
                    Image(systemName: "ellipsis.circle")
                }
            }
        }
        .sheet(isPresented: $showAddNumbers) {
            NumberLoaderView()
        }
        .sheet(isPresented: $showShareSheet) {
            ShareSheet(text: csvExport)
        }
    }

    // MARK: - Sections

    private func progressSection(_ session: DialSession) -> some View {
        VStack(alignment: .leading, spacing: 8) {
            HStack {
                Text("Progress")
                    .font(.subheadline)
                    .foregroundStyle(.secondary)
                Spacer()
                Text("\(session.completedCount) / \(session.totalCount)")
                    .font(.subheadline)
                    .fontWeight(.semibold)
            }
            ProgressView(value: session.progress)
                .tint(session.isComplete ? .green : .blue)
                .scaleEffect(y: 1.5)
        }
        .padding()
        .background(Color(.secondarySystemBackground))
        .clipShape(RoundedRectangle(cornerRadius: 12))
    }

    @ViewBuilder
    private func currentEntryCard(_ session: DialSession) -> some View {
        if let entry = session.currentEntry {
            VStack(alignment: .leading, spacing: 10) {
                Label("Current", systemImage: "phone.arrow.up.right")
                    .font(.caption)
                    .foregroundStyle(.secondary)

                HStack {
                    VStack(alignment: .leading, spacing: 4) {
                        Text(entry.displayName)
                            .font(.title2)
                            .fontWeight(.bold)
                        if !entry.label.isEmpty {
                            Text(entry.rawNumber)
                                .font(.body)
                                .foregroundStyle(.secondary)
                        }
                    }
                    Spacer()
                    statusBadge(entry.status)
                }

                if appState.dialerPhase == .awaitingNextPrompt || appState.dialerPhase == .returning {
                    VStack(alignment: .leading, spacing: 6) {
                        Text("Notes")
                            .font(.caption)
                            .foregroundStyle(.secondary)
                        TextEditor(text: $noteText)
                            .frame(height: 60)
                            .padding(6)
                            .background(Color(.tertiarySystemBackground))
                            .clipShape(RoundedRectangle(cornerRadius: 8))
                            .onChange(of: noteText) { _, value in
                                appState.saveNoteForCurrentEntry(value)
                            }
                    }
                }
            }
            .padding()
            .background(Color(.secondarySystemBackground))
            .clipShape(RoundedRectangle(cornerRadius: 12))
            .overlay(
                RoundedRectangle(cornerRadius: 12)
                    .stroke(borderColor, lineWidth: 2)
            )
        }
    }

    private func actionButtons(_ session: DialSession) -> some View {
        HStack(spacing: 12) {
            switch appState.dialerPhase {
            case .idle, .ready:
                Button {
                    noteText = ""
                    appState.startDialing()
                } label: {
                    Label("Start Dialing", systemImage: "phone.fill")
                        .frame(maxWidth: .infinity)
                }
                .buttonStyle(.borderedProminent)
                .disabled(session.isComplete)

            case .confirming:
                Button {} label: {
                    Label("Waiting for confirmation...", systemImage: "ellipsis")
                        .frame(maxWidth: .infinity)
                }
                .buttonStyle(.bordered)
                .disabled(true)

            case .inCall:
                VStack(spacing: 4) {
                    Image(systemName: "phone.fill")
                        .font(.title)
                        .foregroundStyle(.green)
                        .symbolEffect(.pulse)
                    Text("In call \u2014 return to app when done")
                        .font(.caption)
                        .foregroundStyle(.secondary)
                }
                .frame(maxWidth: .infinity)

            case .returning, .awaitingNextPrompt:
                VStack(spacing: 8) {
                    if appState.autoAdvance && appState.countdownValue > 0 {
                        Text("Next call in \(appState.countdownValue)...")
                            .font(.caption)
                            .foregroundStyle(.secondary)
                    }
                    HStack(spacing: 12) {
                        Button {
                            noteText = ""
                            appState.startDialing()
                        } label: {
                            Label("Call Now", systemImage: "phone.fill")
                                .frame(maxWidth: .infinity)
                        }
                        .buttonStyle(.borderedProminent)

                        Button {
                            appState.skipCurrentEntry()
                            noteText = ""
                        } label: {
                            Label("Skip", systemImage: "forward.fill")
                        }
                        .buttonStyle(.bordered)

                        Button {
                            appState.pauseDialing()
                        } label: {
                            Label("Pause", systemImage: "pause.fill")
                        }
                        .buttonStyle(.bordered)
                        .tint(.orange)
                    }
                }

            case .paused:
                HStack(spacing: 12) {
                    Button {
                        noteText = ""
                        appState.resumeDialing()
                    } label: {
                        Label("Resume", systemImage: "play.fill")
                            .frame(maxWidth: .infinity)
                    }
                    .buttonStyle(.borderedProminent)

                    Button {
                        appState.skipCurrentEntry()
                    } label: {
                        Label("Skip", systemImage: "forward.fill")
                    }
                    .buttonStyle(.bordered)
                }

            case .complete:
                VStack(spacing: 8) {
                    Label("All done!", systemImage: "checkmark.circle.fill")
                        .font(.headline)
                        .foregroundStyle(.green)
                    Text("\(session.completedCount) calls completed")
                        .font(.caption)
                        .foregroundStyle(.secondary)
                }
                .frame(maxWidth: .infinity)
                .padding()
                .background(Color.green.opacity(0.1))
                .clipShape(RoundedRectangle(cornerRadius: 12))
            }
        }
    }

    @ViewBuilder
    private var phaseStatusView: some View {
        switch appState.dialerPhase {
        case .confirming:
            InfoBanner(
                icon: "info.circle",
                message: "Tap \"Call\" on the system prompt to place the call. The app will detect when you return.",
                color: .blue
            )
        case .inCall:
            InfoBanner(
                icon: "phone.fill",
                message: "Call in progress. When you're done, end the call and you'll be brought back here automatically.",
                color: .green
            )
        default:
            EmptyView()
        }
    }

    private func upcomingSection(_ session: DialSession) -> some View {
        Group {
            if !session.upcomingEntries.isEmpty {
                VStack(alignment: .leading, spacing: 8) {
                    Text("Up Next")
                        .font(.subheadline)
                        .fontWeight(.semibold)
                        .foregroundStyle(.secondary)
                    ForEach(session.upcomingEntries) { entry in
                        EntryRowView(entry: entry)
                        Divider()
                    }
                    if session.pendingEntries.count > session.upcomingEntries.count {
                        Text("+ \(session.pendingEntries.count - session.upcomingEntries.count) more...")
                            .font(.caption)
                            .foregroundStyle(.tertiary)
                    }
                }
                .padding()
                .background(Color(.secondarySystemBackground))
                .clipShape(RoundedRectangle(cornerRadius: 12))
            }
        }
    }

    private func completedSection(_ session: DialSession) -> some View {
        Group {
            if !session.completedEntries.isEmpty {
                VStack(alignment: .leading, spacing: 8) {
                    Text("Completed")
                        .font(.subheadline)
                        .fontWeight(.semibold)
                        .foregroundStyle(.secondary)
                    ForEach(session.completedEntries.reversed()) { entry in
                        EntryRowView(entry: entry)
                        Divider()
                    }
                }
                .padding()
                .background(Color(.secondarySystemBackground))
                .clipShape(RoundedRectangle(cornerRadius: 12))
            }
        }
    }

    // MARK: - Helpers

    private var borderColor: Color {
        switch appState.dialerPhase {
        case .confirming: return .blue
        case .inCall: return .green
        case .returning, .awaitingNextPrompt: return .orange
        default: return .clear
        }
    }

    private func statusBadge(_ status: CallStatus) -> some View {
        Text(status.rawValue.capitalized)
            .font(.caption)
            .fontWeight(.medium)
            .padding(.horizontal, 8)
            .padding(.vertical, 4)
            .background(badgeColor(status).opacity(0.15))
            .foregroundStyle(badgeColor(status))
            .clipShape(Capsule())
    }

    private func badgeColor(_ status: CallStatus) -> Color {
        switch status {
        case .pending: return .secondary
        case .calling: return .orange
        case .called: return .green
        case .skipped: return .yellow
        case .failed: return .red
        }
    }
}

// MARK: - Supporting Views

struct InfoBanner: View {
    let icon: String
    let message: String
    let color: Color

    var body: some View {
        HStack(alignment: .top, spacing: 10) {
            Image(systemName: icon)
                .foregroundStyle(color)
            Text(message)
                .font(.caption)
                .foregroundStyle(.secondary)
        }
        .padding()
        .background(color.opacity(0.08))
        .clipShape(RoundedRectangle(cornerRadius: 10))
    }
}

struct ShareSheet: UIViewControllerRepresentable {
    let text: String

    func makeUIViewController(context: Context) -> UIActivityViewController {
        let temp = FileManager.default.temporaryDirectory
            .appendingPathComponent("export.csv")
        try? text.write(to: temp, atomically: true, encoding: .utf8)
        return UIActivityViewController(activityItems: [temp], applicationActivities: nil)
    }

    func updateUIViewController(_ uvc: UIActivityViewController, context: Context) {}
}
