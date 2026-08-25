# Developers

## Setup

### Local setup

1. Clone the repository:
   ```bash
   git clone git@github.com:cjvalera/vimari.git
   ```
2. Install JavaScript dependencies with `npm ci`.
3. Open `Vimari.xcodeproj` with Xcode 27 or later.
4. [Set your signing team](https://help.apple.com/xcode/mac/current/#/dev23aab79b4) for both targets (Vimari and Vimari Extension).
5. Run the project (<kbd>⌘</kbd>+<kbd>R</kbd>), then enable Vimari and grant website access in Safari's Extensions settings.

Use `npm test` for JavaScript tests. WebExtension resources can also be loaded
temporarily from the `Vimari Extension` folder while iterating in Safari.

### Local build

Run `make local-build` to create an ad-hoc signed development build at
`build/local/Vimari.app`. This uses Xcode's **Sign to Run Locally** identity, so
it does not require an Apple developer team. Run `make local-run` to build and
launch the containing app, which registers the embedded extension with Safari.

Before enabling an ad-hoc signed build, open Safari's developer settings and
turn on **Allow unsigned extensions**. Safari resets that setting whenever it
quits. Then enable Vimari from Safari's Extensions settings.

### Linting & Formatting

The repository does not currently enforce an automatic formatter or linter.

## Contributing

If you'd like to contribute to the development of Vimari you can help us out through several means:

1. Create bug reports for issues you encounter, or look trough existing bug reports and try to reproduce their problems.
2. Try out the latest beta version (if there is one) and report issues back to us.
3. Contribute ideas, if you'd like something to be added to Vimari you can create an issue describing exactly what you have in mind. Together we can help form the idea and get it into Vimari.
4. Contribute code, if you find a bug or issue that you think you can help us solve you are more than welcome to do so.

### Contributing Code

If you want to contribute to Vimari through coding you have to start by selecting an issue to work on. If you'd like to contribute something new, make an issue first to discuss the idea.

You can fork the Vimari source code and make the changes to implement your feature or solve a bug. Once finished you can create a pull request back into the Vimari repository where it can be reviewed.

After a successful review your code will be merged with the master branch and released to Vimari users in the next release. Pretty cool!
