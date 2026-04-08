import SwiftUI
import UniformTypeIdentifiers

struct NumberLoaderView: View {
    @EnvironmentObject var appState: AppState
    @Environment(\.dismiss) private var dismiss

    @State private var selectedTab = 0
    @State private var pasteText = ""
    @State private var manualNumber = ""
    @State private var manualLabel = ""
    @State private var manualEntries: [PhoneEntry] = []
    @State private var sessionName = "New Session"
    @State private var showImporter = false
    @State private var parsedEntries: [PhoneEntry] = []
    @State private var showPreview = false

    var body: some View {
        NavigationStack {
            VStack(spacing: 0) {
                TextField("Session name", text: $sessionName)
                    .textFieldStyle(.roundedBorder)
                    .padding()

                Picker("Input method", selection: $selectedTab) {
                    Text("Paste").tag(0)
                    Text("Manual").tag(1)
                    Text("Import").tag(2)
                }
                .pickerStyle(.segmented)
                .padding(.horizontal)

                Divider().padding(.top, 8)

                TabView(selection: $selectedTab) {
                    pasteTab.tag(0)
                    manualTab.tag(1)
                    importTab.tag(2)
                }
                .tabViewStyle(.page(indexDisplayMode: .never))
            }
            .navigationTitle("Load Numbers")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .cancellationAction) {
                    Button("Cancel") { dismiss() }
                }
                ToolbarItem(placement: .confirmationAction) {
                    Button("Create") { createSession() }
                        .disabled(allEntries.isEmpty || sessionName.isEmpty)
                }
            }
        }
        .fileImporter(
            isPresented: $showImporter,
            allowedContentTypes: [.plainText, .commaSeparatedText, .json],
            allowsMultipleSelection: false
        ) { result in
            handleImport(result)
        }
    }

    // MARK: - Tabs

    private var pasteTab: some View {
        VStack(alignment: .leading, spacing: 8) {
            Text("Paste numbers \u2014 one per line. Optionally follow a number with a tab and a name.")
                .font(.caption)
                .foregroundStyle(.secondary)
                .padding(.horizontal)
                .padding(.top, 12)

            TextEditor(text: $pasteText)
                .font(.system(.body, design: .monospaced))
                .frame(maxWidth: .infinity, maxHeight: .infinity)
                .padding(8)
                .background(Color(.secondarySystemBackground))
                .clipShape(RoundedRectangle(cornerRadius: 8))
                .padding(.horizontal)

            if !pastedEntries.isEmpty {
                Text("\(pastedEntries.count) number\(pastedEntries.count == 1 ? "" : "s") found")
                    .font(.caption)
                    .foregroundStyle(.green)
                    .padding(.horizontal)
            }
        }
    }

    private var manualTab: some View {
        VStack(spacing: 12) {
            Form {
                Section("Add Number") {
                    TextField("Phone number", text: $manualNumber)
                        .keyboardType(.phonePad)
                    TextField("Label (optional)", text: $manualLabel)

                    Button("Add to List") {
                        guard !manualNumber.isEmpty else { return }
                        let entry = PhoneEntry(rawNumber: manualNumber, label: manualLabel)
                        manualEntries.append(entry)
                        manualNumber = ""
                        manualLabel = ""
                    }
                    .disabled(manualNumber.isEmpty)
                }

                if !manualEntries.isEmpty {
                    Section("Numbers (\(manualEntries.count))") {
                        ForEach(manualEntries) { entry in
                            EntryRowView(entry: entry)
                        }
                        .onDelete { manualEntries.remove(atOffsets: $0) }
                    }
                }
            }
        }
    }

    private var importTab: some View {
        VStack(spacing: 16) {
            Spacer()
            Image(systemName: "doc.text")
                .font(.system(size: 48))
                .foregroundStyle(.secondary)
            Text("Import a .txt, .csv, or .json file")
                .font(.headline)
            Text("CSV: first column = number, second = label\nJSON: [{\"number\": \"...\", \"label\": \"...\"}]\nTXT: one number per line")
                .font(.caption)
                .foregroundStyle(.secondary)
                .multilineTextAlignment(.center)
                .padding(.horizontal)

            Button("Choose File") {
                showImporter = true
            }
            .buttonStyle(.bordered)

            if !parsedEntries.isEmpty {
                Text("\(parsedEntries.count) numbers loaded from file")
                    .font(.caption)
                    .foregroundStyle(.green)
            }
            Spacer()
        }
    }

    // MARK: - Helpers

    private var pastedEntries: [PhoneEntry] {
        NumberParser.parse(text: pasteText)
    }

    private var allEntries: [PhoneEntry] {
        switch selectedTab {
        case 0: return pastedEntries
        case 1: return manualEntries
        case 2: return parsedEntries
        default: return []
        }
    }

    private func createSession() {
        let name = sessionName.isEmpty ? "Session \(Date().formatted(.dateTime.month().day()))" : sessionName
        appState.createSession(name: name, entries: allEntries)
        dismiss()
    }

    private func handleImport(_ result: Result<[URL], Error>) {
        guard case .success(let urls) = result, let url = urls.first else { return }
        guard url.startAccessingSecurityScopedResource() else { return }
        defer { url.stopAccessingSecurityScopedResource() }

        do {
            let content = try String(contentsOf: url, encoding: .utf8)
            let ext = url.pathExtension.lowercased()
            switch ext {
            case "csv":
                parsedEntries = NumberParser.parseCSV(text: content)
            case "json":
                parsedEntries = NumberParser.parseJSON(text: content)
            default:
                parsedEntries = NumberParser.parse(text: content)
            }
        } catch {
            print("[NumberLoaderView] Import error: \(error)")
        }
    }
}

// MARK: - Number Parser

enum NumberParser {
    static func parse(text: String) -> [PhoneEntry] {
        text
            .components(separatedBy: .newlines)
            .flatMap { $0.components(separatedBy: ",") }
            .map { $0.trimmingCharacters(in: .whitespacesAndNewlines) }
            .filter { !$0.isEmpty }
            .compactMap { line -> PhoneEntry? in
                let parts = line.components(separatedBy: "\t")
                let number = parts[0].trimmingCharacters(in: .whitespaces)
                guard !number.isEmpty else { return nil }
                let label = parts.count > 1 ? parts[1].trimmingCharacters(in: .whitespaces) : ""
                let entry = PhoneEntry(rawNumber: number, label: label)
                return entry.isDialable ? entry : nil
            }
    }

    static func parseCSV(text: String) -> [PhoneEntry] {
        let lines = text.components(separatedBy: .newlines).dropFirst()
        return lines.compactMap { line -> PhoneEntry? in
            let cols = line.components(separatedBy: ",")
            guard let number = cols.first?.trimmingCharacters(in: .whitespacesAndNewlines),
                  !number.isEmpty else { return nil }
            let label = cols.count > 1 ? cols[1].trimmingCharacters(in: .whitespacesAndNewlines) : ""
            let entry = PhoneEntry(rawNumber: number, label: label)
            return entry.isDialable ? entry : nil
        }
    }

    static func parseJSON(text: String) -> [PhoneEntry] {
        guard let data = text.data(using: .utf8),
              let array = try? JSONSerialization.jsonObject(with: data) as? [[String: String]]
        else { return [] }
        return array.compactMap { dict -> PhoneEntry? in
            guard let number = dict["number"], !number.isEmpty else { return nil }
            let label = dict["label"] ?? ""
            let entry = PhoneEntry(rawNumber: number, label: label)
            return entry.isDialable ? entry : nil
        }
    }
}

extension UTType {
    static let commaSeparatedText = UTType(importedAs: "public.comma-separated-values-text")
}
