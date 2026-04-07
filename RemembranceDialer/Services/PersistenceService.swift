import Foundation

/// Persists sessions as JSON to the app's Documents directory.
/// Files are visible in Files.app when UIFileSharingEnabled = YES.
final class PersistenceService {

    private let sessionsURL: URL

    init() {
        let docs = FileManager.default
            .urls(for: .documentDirectory, in: .userDomainMask)[0]
        sessionsURL = docs.appendingPathComponent("sessions.json")
    }

    func save(_ sessions: [DialSession]) throws {
        let encoder = JSONEncoder()
        encoder.dateEncodingStrategy = .iso8601
        encoder.outputFormatting = .prettyPrinted
        let data = try encoder.encode(sessions)
        try data.write(to: sessionsURL, options: .atomic)
    }

    func load() throws -> [DialSession] {
        guard FileManager.default.fileExists(atPath: sessionsURL.path) else {
            return []
        }
        let data = try Data(contentsOf: sessionsURL)
        let decoder = JSONDecoder()
        decoder.dateDecodingStrategy = .iso8601
        return try decoder.decode([DialSession].self, from: data)
    }

    /// Exports a single session as CSV text.
    func exportCSV(session: DialSession) -> String {
        var lines = ["Number,Label,Status,CalledAt,Notes"]
        for entry in session.entries {
            let calledAt = entry.calledAt.map {
                ISO8601DateFormatter().string(from: $0)
            } ?? ""
            let notes = entry.notes.replacingOccurrences(of: ",", with: ";")
            lines.append("\(entry.rawNumber),\(entry.label),\(entry.status.rawValue),\(calledAt),\(notes)")
        }
        return lines.joined(separator: "\n")
    }
}
