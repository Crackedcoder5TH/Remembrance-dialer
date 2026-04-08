import Foundation

enum CallStatus: String, Codable, CaseIterable {
    case pending  // Not yet called
    case calling  // tel:// was opened, awaiting return
    case called   // User returned; assumed completed
    case skipped  // User tapped Skip
    case failed   // Number invalid or manually marked failed
}
