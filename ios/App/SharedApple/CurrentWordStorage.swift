import Foundation

#if canImport(DevilsAIDictionaryCore)
import DevilsAIDictionaryCore
#endif

struct CurrentWordStorage {
    private enum Keys {
        static let currentWord = "current-word-record"
        static let pendingNavigationPath = "current-word-pending-navigation-path"
        static let pushDeviceToken = "current-word-push-device-token"
    }

    let defaults: UserDefaults

    init(defaults: UserDefaults = .standard) {
        self.defaults = defaults
    }

    func loadCurrentWord() -> CurrentWordRecord? {
        decode(CurrentWordRecord.self, forKey: Keys.currentWord)
    }

    func saveCurrentWord(_ record: CurrentWordRecord) {
        encode(record, forKey: Keys.currentWord)
    }

    func loadPendingNavigationPath() -> String? {
        defaults.string(forKey: Keys.pendingNavigationPath)
    }

    func savePendingNavigationPath(_ path: String?) {
        defaults.set(path, forKey: Keys.pendingNavigationPath)
    }

    func loadPushDeviceToken() -> String? {
        defaults.string(forKey: Keys.pushDeviceToken)
    }

    func savePushDeviceToken(_ token: String?) {
        defaults.set(token, forKey: Keys.pushDeviceToken)
    }

    private func decode<T: Decodable>(_ type: T.Type, forKey key: String) -> T? {
        guard let data = defaults.data(forKey: key) else {
            return nil
        }

        return try? JSONDecoder().decode(type, from: data)
    }

    private func encode<T: Encodable>(_ value: T, forKey key: String) {
        guard let data = try? JSONEncoder().encode(value) else {
            return
        }

        defaults.set(data, forKey: key)
    }
}
