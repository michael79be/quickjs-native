import AppKit
import Foundation

final class Launcher: NSObject, NSApplicationDelegate {
    private var childProcesses: [Int32: Process] = [:]

    override init() {
        super.init()
        NSAppleEventManager.shared().setEventHandler(
            self,
            andSelector: #selector(handleGetURLEvent(_:withReplyEvent:)),
            forEventClass: AEEventClass(kInternetEventClass),
            andEventID: AEEventID(kAEGetURL)
        )
    }

    func applicationDidFinishLaunching(_ notification: Notification) {
        NSApplication.shared.setActivationPolicy(.accessory)
    }

    @objc private func handleGetURLEvent(
        _ event: NSAppleEventDescriptor,
        withReplyEvent replyEvent: NSAppleEventDescriptor
    ) {
        guard
            let urlString = event.paramDescriptor(forKeyword: AEKeyword(keyDirectObject))?.stringValue,
            let url = URL(string: urlString),
            let executableURL = Bundle.main.executableURL
        else {
            NSLog("launcher: received an invalid URL event")
            return
        }

        let launcherName = executableURL.lastPathComponent
        let launcherSuffix = "-launcher"
        guard launcherName.hasSuffix(launcherSuffix) else {
            NSLog("launcher: executable name must end with %@", launcherSuffix)
            return
        }
        let runtimeName = String(launcherName.dropLast(launcherSuffix.count))
        let runtimeURL = executableURL.deletingLastPathComponent()
            .appendingPathComponent(runtimeName)
        let process = Process()
        process.executableURL = runtimeURL
        process.arguments = ["--args", url.absoluteString]
        process.terminationHandler = { [weak self] process in
            DispatchQueue.main.async {
                self?.childProcesses.removeValue(forKey: process.processIdentifier)
                if self?.childProcesses.isEmpty == true {
                    NSApplication.shared.terminate(nil)
                }
            }
        }

        do {
            try process.run()
            childProcesses[process.processIdentifier] = process
        } catch {
            NSLog("launcher: unable to run %@: %@", runtimeURL.path, error.localizedDescription)
        }
    }
}

@main
struct LauncherMain {
    static func main() {
        let application = NSApplication.shared
        let launcher = Launcher()
        application.delegate = launcher
        application.run()
    }
}
