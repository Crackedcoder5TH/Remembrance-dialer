import CallKit

/// Wraps CXCallObserver to detect call state changes.
///
/// Important: CXCallObserver fires for ALL calls on the device, including
/// incoming calls from third parties. Only act on events when the
/// AppState's dialerPhase is `.inCall` to avoid false triggers.
final class CallStateMonitor: NSObject, CXCallObserverDelegate, ObservableObject {

    private let observer = CXCallObserver()
    private(set) var hasActiveCall = false

    /// Called when a call ends (hasEnded == true).
    var onCallEnded: (() -> Void)?

    override init() {
        super.init()
        observer.setDelegate(self, queue: .main)
    }

    func callObserver(_ callObserver: CXCallObserver, callChanged call: CXCall) {
        if call.hasConnected && !call.hasEnded {
            hasActiveCall = true
        }
        if call.hasEnded {
            hasActiveCall = false
            onCallEnded?()
        }
    }
}
