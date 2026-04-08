import SwiftUI
import Combine

/// The core state machine for the dialer.
/// All UI rendering is a pure function of this state.
@MainActor
final class AppState: ObservableObject {

    // MARK: - Published State

    @Published var sessions: [DialSession] = []
    @Published var activeSessionID: UUID?
    @Published var dialerPhase: DialerPhase = .idle
    @Published var countdownValue: Int = 0

    // MARK: - Settings

    @AppStorage("postCallDelaySeconds") var postCallDelaySeconds: Double = 3.0
    @AppStorage("autoAdvance") var autoAdvance: Bool = true
    @AppStorage("hapticFeedback") var hapticFeedback: Bool = true

    // MARK: - Services

    private let dialerService = DialerService()
    private let persistence = PersistenceService()
    let callMonitor = CallStateMonitor()

    // MARK: - Internal State

    private var didLaunchCall = false
    private var countdownTask: Task<Void, Never>?
    private var sheetCancelDetectionTask: Task<Void, Never>?
    private var saveCancellable: AnyCancellable?

    // MARK: - Dialer Phase

    enum DialerPhase: Equatable {
        case idle               // No session loaded
        case ready              // Session loaded, not started
        case confirming         // tel:// opened, waiting for system sheet confirm
        case inCall             // Phone app is in foreground, call in progress
        case returning          // App just became active after a call
        case awaitingNextPrompt // Countdown before next call
        case paused             // User paused mid-session
        case complete           // All entries done
    }

    // MARK: - Computed

    var activeSession: DialSession? {
        get { sessions.first { $0.id == activeSessionID } }
        set {
            guard let updated = newValue else { return }
            if let idx = sessions.firstIndex(where: { $0.id == updated.id }) {
                sessions[idx] = updated
            }
        }
    }

    // MARK: - Init

    init() {
        loadSessions()
        setupAutosave()
        callMonitor.onCallEnded = { [weak self] in
            self?.handleCallEnded()
        }
    }

    // MARK: - Session Management

    func createSession(name: String, entries: [PhoneEntry]) {
        let session = DialSession(name: name, entries: entries)
        sessions.append(session)
        activeSessionID = session.id
        dialerPhase = .ready
    }

    func activateSession(_ session: DialSession) {
        activeSessionID = session.id
        dialerPhase = session.isActive ? .paused : .ready
    }

    func deleteSession(_ session: DialSession) {
        sessions.removeAll { $0.id == session.id }
        if activeSessionID == session.id {
            activeSessionID = nil
            dialerPhase = .idle
        }
    }

    func addEntries(_ entries: [PhoneEntry], to sessionID: UUID) {
        guard let idx = sessions.firstIndex(where: { $0.id == sessionID }) else { return }
        sessions[idx].entries.append(contentsOf: entries)
    }

    // MARK: - Dialing

    /// Start or resume dialing the active session.
    func startDialing() {
        guard var session = activeSession else { return }
        session.isActive = true
        activeSession = session
        dialNext()
    }

    /// Dial the current entry.
    func dialCurrentEntry() {
        guard let session = activeSession,
              let entry = session.currentEntry,
              entry.status == .pending || entry.status == .calling else { return }
        dialEntry(entry)
    }

    func skipCurrentEntry() {
        guard var session = activeSession else { return }
        session.entries[session.currentIndex].status = .skipped
        activeSession = session
        advanceToNextPending()
    }

    func markCurrentFailed() {
        guard var session = activeSession else { return }
        session.entries[session.currentIndex].status = .failed
        activeSession = session
        advanceToNextPending()
    }

    func pauseDialing() {
        countdownTask?.cancel()
        sheetCancelDetectionTask?.cancel()
        dialerPhase = .paused
    }

    func resumeDialing() {
        guard activeSession != nil else { return }
        dialerPhase = .ready
        dialCurrentEntry()
    }

    func saveNoteForCurrentEntry(_ note: String) {
        guard var session = activeSession else { return }
        session.entries[session.currentIndex].notes = note
        activeSession = session
    }

    // MARK: - Scene Lifecycle Handlers

    func handleAppBecameActive() {
        guard didLaunchCall else { return }
        didLaunchCall = false
        sheetCancelDetectionTask?.cancel()

        guard var session = activeSession else { return }

        session.entries[session.currentIndex].status = .called
        session.entries[session.currentIndex].calledAt = Date()
        activeSession = session

        dialerPhase = .returning

        if hapticFeedback {
            UINotificationFeedbackGenerator().notificationOccurred(.success)
        }

        countdownTask = Task {
            try? await Task.sleep(for: .milliseconds(500))
            guard !Task.isCancelled else { return }
            await startPostCallCountdown()
        }
    }

    func handleAppEnteredBackground() {
        if dialerPhase == .confirming {
            didLaunchCall = true
            sheetCancelDetectionTask?.cancel()
            dialerPhase = .inCall
        }
    }

    // MARK: - Private

    private func dialEntry(_ entry: PhoneEntry) {
        guard var session = activeSession else { return }
        session.entries[session.currentIndex].status = .calling
        activeSession = session
        dialerPhase = .confirming

        sheetCancelDetectionTask = Task {
            try? await Task.sleep(for: .seconds(6))
            guard !Task.isCancelled else { return }
            if dialerPhase == .confirming {
                didLaunchCall = false
                session.entries[session.currentIndex].status = .pending
                activeSession = session
                dialerPhase = .ready
            }
        }

        Task {
            let success = await dialerService.dial(entry: entry)
            if !success {
                sheetCancelDetectionTask?.cancel()
                var s = activeSession ?? session
                s.entries[s.currentIndex].status = .failed
                activeSession = s
                dialerPhase = .ready
                advanceToNextPending()
            }
        }
    }

    private func dialNext() {
        guard let session = activeSession else {
            dialerPhase = .complete
            return
        }

        if let entry = session.currentEntry, entry.status == .pending {
            dialEntry(entry)
        } else if let nextIdx = session.nextPendingIndex {
            var s = session
            s.currentIndex = nextIdx
            activeSession = s
            if let entry = s.currentEntry {
                dialEntry(entry)
            }
        } else {
            var s = session
            s.isActive = false
            activeSession = s
            dialerPhase = .complete
        }
    }

    private func advanceToNextPending() {
        guard var session = activeSession else {
            dialerPhase = .complete
            return
        }

        if let nextIdx = session.nextPendingIndex {
            session.currentIndex = nextIdx
            activeSession = session
            dialerPhase = .ready
        } else if session.isComplete {
            session.isActive = false
            activeSession = session
            dialerPhase = .complete
        } else {
            if let firstPending = session.entries.indices.first(where: { session.entries[$0].status == .pending }) {
                session.currentIndex = firstPending
                activeSession = session
                dialerPhase = .ready
            } else {
                session.isActive = false
                activeSession = session
                dialerPhase = .complete
            }
        }
    }

    private func startPostCallCountdown() async {
        guard autoAdvance else {
            dialerPhase = .awaitingNextPrompt
            return
        }

        let delay = Int(postCallDelaySeconds)
        dialerPhase = .awaitingNextPrompt
        countdownValue = delay

        for remaining in stride(from: delay, through: 1, by: -1) {
            guard !Task.isCancelled else { return }
            countdownValue = remaining
            try? await Task.sleep(for: .seconds(1))
        }

        guard !Task.isCancelled else { return }
        countdownValue = 0

        if hapticFeedback {
            UIImpactFeedbackGenerator(style: .medium).impactOccurred()
        }

        dialNext()
    }

    private func handleCallEnded() {
        guard dialerPhase == .inCall else { return }
        dialerPhase = .returning
    }

    // MARK: - Persistence

    private func loadSessions() {
        do {
            sessions = try persistence.load()
        } catch {
            print("[AppState] Failed to load sessions: \(error)")
            sessions = []
        }
    }

    private func setupAutosave() {
        saveCancellable = $sessions
            .debounce(for: .milliseconds(500), scheduler: RunLoop.main)
            .sink { [weak self] sessions in
                guard let self else { return }
                do {
                    try self.persistence.save(sessions)
                } catch {
                    print("[AppState] Failed to save sessions: \(error)")
                }
            }
    }

    func exportSessionCSV(_ session: DialSession) -> String {
        persistence.exportCSV(session: session)
    }
}
