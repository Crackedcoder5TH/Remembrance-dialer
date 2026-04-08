import Foundation

struct PhoneEntry: Identifiable, Codable, Hashable {
    var id: UUID = UUID()
    var rawNumber: String
    var label: String
    var status: CallStatus
    var calledAt: Date?
    var notes: String = ""

    init(rawNumber: String, label: String = "", status: CallStatus = .pending) {
        self.rawNumber = rawNumber
        self.label = label
        self.status = status
    }

    /// Stripped to digits only (preserving a leading +)
    var dialableNumber: String {
        let stripped = rawNumber.filter { $0.isNumber || $0 == "+" }
        // Only keep a leading +
        if let first = stripped.first, first == "+" {
            return "+" + stripped.dropFirst().filter { $0.isNumber }
        }
        return stripped.filter { $0.isNumber }
    }

    var displayName: String {
        label.isEmpty ? rawNumber : label
    }

    var isDialable: Bool {
        !dialableNumber.isEmpty
    }
}
