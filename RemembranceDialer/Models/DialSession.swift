import Foundation

struct DialSession: Identifiable, Codable {
    var id: UUID = UUID()
    var name: String
    var createdAt: Date = Date()
    var entries: [PhoneEntry]
    var currentIndex: Int = 0
    var isActive: Bool = false

    init(name: String, entries: [PhoneEntry] = []) {
        self.name = name
        self.entries = entries
    }

    var currentEntry: PhoneEntry? {
        guard currentIndex < entries.count else { return nil }
        return entries[currentIndex]
    }

    var nextPendingIndex: Int? {
        entries.indices.first(where: { $0 > currentIndex && entries[$0].status == .pending })
    }

    var completedCount: Int {
        entries.filter { $0.status != .pending }.count
    }

    var totalCount: Int {
        entries.count
    }

    var progress: Double {
        guard totalCount > 0 else { return 0 }
        return Double(completedCount) / Double(totalCount)
    }

    var isComplete: Bool {
        entries.allSatisfy { $0.status != .pending }
    }

    var pendingEntries: [PhoneEntry] {
        entries.filter { $0.status == .pending }
    }

    var upcomingEntries: [PhoneEntry] {
        guard currentIndex + 1 < entries.count else { return [] }
        return Array(entries[(currentIndex + 1)...].filter { $0.status == .pending }.prefix(5))
    }

    var completedEntries: [PhoneEntry] {
        entries.filter { $0.status == .called || $0.status == .skipped || $0.status == .failed }
    }
}
