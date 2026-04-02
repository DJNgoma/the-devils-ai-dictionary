#if os(iOS)
import OSLog
import UIKit
import UserNotifications

final class AppDelegate: UIResponder, UIApplicationDelegate, UNUserNotificationCenterDelegate {
    private let logger = Logger(
        subsystem: "com.djngoma.devilsaidictionary",
        category: "AppDelegate"
    )

    func application(
        _ application: UIApplication,
        didFinishLaunchingWithOptions launchOptions: [UIApplication.LaunchOptionsKey: Any]? = nil
    ) -> Bool {
        UNUserNotificationCenter.current().delegate = self
        PhoneCurrentWordManager.shared.configureForCurrentPlatform()
        return true
    }

    func application(_ application: UIApplication, didRegisterForRemoteNotificationsWithDeviceToken deviceToken: Data) {
        Task { @MainActor in
            PhoneCurrentWordManager.shared.registerDeviceToken(deviceToken)
        }
    }

    func application(_ application: UIApplication, didFailToRegisterForRemoteNotificationsWithError error: Error) {
        logger.error("APNs registration failed: \(error.localizedDescription, privacy: .public)")
    }

    func application(
        _ application: UIApplication,
        open url: URL,
        options: [UIApplication.OpenURLOptionsKey: Any] = [:]
    ) -> Bool {
        PhoneCurrentWordManager.shared.handleIncomingURL(url)
    }

    func application(
        _ application: UIApplication,
        continue userActivity: NSUserActivity,
        restorationHandler: @escaping ([UIUserActivityRestoring]?) -> Void
    ) -> Bool {
        guard let url = userActivity.webpageURL else {
            return false
        }

        return PhoneCurrentWordManager.shared.handleIncomingURL(url)
    }

    func userNotificationCenter(
        _ center: UNUserNotificationCenter,
        willPresent notification: UNNotification,
        withCompletionHandler completionHandler: @escaping (UNNotificationPresentationOptions) -> Void
    ) {
        completionHandler([.banner, .badge, .list, .sound])
    }

    func userNotificationCenter(
        _ center: UNUserNotificationCenter,
        didReceive response: UNNotificationResponse,
        withCompletionHandler completionHandler: @escaping () -> Void
    ) {
        Task { @MainActor in
            await PhoneCurrentWordManager.shared.handleRemoteNotificationResponse(
                userInfo: response.notification.request.content.userInfo
            )
            completionHandler()
        }
    }
}
#endif
