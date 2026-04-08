import UIKit

/// Handles launching calls via the tel:// URL scheme.
final class DialerService {

    /// Attempts to open the phone dialer for the given entry.
    /// Returns `true` if the URL was opened (system confirmation sheet will appear),
    /// or `false` if the number is invalid / cannot be opened.
    @MainActor
    @discardableResult
    func dial(entry: PhoneEntry) async -> Bool {
        let number = entry.dialableNumber
        guard !number.isEmpty else { return false }

        let urlString = "tel://\(number)"
        guard let url = URL(string: urlString) else { return false }
        guard UIApplication.shared.canOpenURL(url) else { return false }

        await UIApplication.shared.open(url)
        return true
    }

    /// Validates a raw number string — returns the dialable form or nil.
    func validate(rawNumber: String) -> String? {
        let entry = PhoneEntry(rawNumber: rawNumber)
        let dialable = entry.dialableNumber
        return dialable.isEmpty ? nil : dialable
    }
}
