export function showHelp() {
    console.log(`
Usage:
  npx quickjs-native help
  npx quickjs-native bundle <script.js> [--platform <target>] [--app] [--scheme <scheme>] [--icon <png>] [--output-dir <directory>]

Commands:
  help      Show this help
  bundle    Create platform-specific executables containing the script

The bundle command writes executables into ./release by default. Without
--platform, it creates one for every supported target.
To create only one:
--platform linux | linux-32 | macos | macos-intel | macos-universal | windows | windows-32

On macOS, --app also creates <name>.app from the selected macOS target. If
--platform is omitted, the app uses the universal macOS executable. The app
is created in addition to the executable files. It registers a URI scheme
derived from the app name; use --scheme to choose one explicitly. The Swift
launcher forwards the URL using --args mode. The bundle runs normally and
exposes forwarded values in the JavaScript global scriptArgs array. The
universal launcher is downloaded automatically if it is missing from the
package's release directory.

Use --icon <png> to add an icon to Windows executables and macOS apps (with
--app). Windows PE icon resources are injected using JavaScript, so this also
works when bundling from macOS or Linux. The icon option is not supported for
Linux targets.

Platform executables are read from the package's release directory. JavaScript
source and QuickJS bytecode input are both accepted.`);
}
