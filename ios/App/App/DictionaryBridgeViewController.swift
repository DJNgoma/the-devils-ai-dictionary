import Capacitor

final class DictionaryBridgeViewController: CAPBridgeViewController {
    private let currentWordPlugin = CurrentWordPlugin(manager: .shared)

    override func capacitorDidLoad() {
        super.capacitorDidLoad()
        bridge?.registerPluginInstance(currentWordPlugin)
    }
}
