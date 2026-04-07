import SwiftUI

struct EntryRowView: View {
    let entry: PhoneEntry
    var isCurrent: Bool = false

    var body: some View {
        HStack(spacing: 12) {
            statusIcon
                .frame(width: 24, height: 24)

            VStack(alignment: .leading, spacing: 2) {
                Text(entry.displayName)
                    .font(.body)
                    .fontWeight(isCurrent ? .semibold : .regular)
                if !entry.label.isEmpty {
                    Text(entry.rawNumber)
                        .font(.caption)
                        .foregroundStyle(.secondary)
                }
                if !entry.notes.isEmpty {
                    Text(entry.notes)
                        .font(.caption2)
                        .foregroundStyle(.tertiary)
                        .lineLimit(1)
                }
            }

            Spacer()

            if let calledAt = entry.calledAt {
                Text(calledAt, style: .time)
                    .font(.caption)
                    .foregroundStyle(.secondary)
            }
        }
        .padding(.vertical, 4)
    }

    @ViewBuilder
    private var statusIcon: some View {
        switch entry.status {
        case .pending:
            Image(systemName: "circle")
                .foregroundStyle(.secondary)
        case .calling:
            Image(systemName: "phone.fill")
                .foregroundStyle(.orange)
                .symbolEffect(.pulse)
        case .called:
            Image(systemName: "checkmark.circle.fill")
                .foregroundStyle(.green)
        case .skipped:
            Image(systemName: "forward.fill")
                .foregroundStyle(.yellow)
        case .failed:
            Image(systemName: "xmark.circle.fill")
                .foregroundStyle(.red)
        }
    }
}
