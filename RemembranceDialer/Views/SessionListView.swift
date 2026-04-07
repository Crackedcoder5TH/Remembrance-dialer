import SwiftUI

struct SessionListView: View {
    @EnvironmentObject var appState: AppState
    @State private var showNewSession = false

    var body: some View {
        Group {
            if appState.sessions.isEmpty {
                emptyState
            } else {
                List {
                    ForEach(appState.sessions) { session in
                        NavigationLink(value: session.id) {
                            SessionRowView(session: session)
                        }
                    }
                    .onDelete { indexSet in
                        indexSet.forEach { appState.deleteSession(appState.sessions[$0]) }
                    }
                }
            }
        }
        .navigationTitle("Remembrance Dialer")
        .toolbar {
            ToolbarItem(placement: .primaryAction) {
                Button {
                    showNewSession = true
                } label: {
                    Image(systemName: "plus")
                }
            }
        }
        .navigationDestination(for: UUID.self) { sessionID in
            if let session = appState.sessions.first(where: { $0.id == sessionID }) {
                SessionDetailView(sessionID: session.id)
                    .onAppear { appState.activateSession(session) }
            }
        }
        .sheet(isPresented: $showNewSession) {
            NumberLoaderView()
        }
    }

    private var emptyState: some View {
        VStack(spacing: 16) {
            Image(systemName: "phone.badge.plus")
                .font(.system(size: 64))
                .foregroundStyle(.secondary)
            Text("No sessions yet")
                .font(.title2)
                .fontWeight(.semibold)
            Text("Create a session to start dialing a list of numbers one by one.")
                .font(.body)
                .foregroundStyle(.secondary)
                .multilineTextAlignment(.center)
                .padding(.horizontal, 32)
            Button("New Session") {
                showNewSession = true
            }
            .buttonStyle(.borderedProminent)
        }
    }
}

struct SessionRowView: View {
    let session: DialSession

    var body: some View {
        VStack(alignment: .leading, spacing: 6) {
            HStack {
                Text(session.name)
                    .font(.headline)
                Spacer()
                if session.isActive {
                    Label("Active", systemImage: "record.circle")
                        .font(.caption)
                        .foregroundStyle(.orange)
                }
            }

            ProgressView(value: session.progress)
                .tint(progressColor)

            HStack {
                Text("\(session.completedCount) / \(session.totalCount) calls")
                    .font(.caption)
                    .foregroundStyle(.secondary)
                Spacer()
                Text(session.createdAt, style: .date)
                    .font(.caption)
                    .foregroundStyle(.secondary)
            }
        }
        .padding(.vertical, 4)
    }

    private var progressColor: Color {
        if session.isComplete { return .green }
        if session.isActive { return .orange }
        return .blue
    }
}
