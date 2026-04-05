## CMDBench terminal

A desktop terminal application built on Tauri. Allows you to create, organize, and quickly execute commands with parameters, synchronize them, and customize the interface to your needs.

### Key Features

- **Command management** — create, edit, and group commands with parameters
- **Synchronization** — save/load commands and command groups in JSON files
- **Multiple terminals** — work with several terminal tabs simultaneously
- **Settings** — customize appearance, hotkeys, and shell profiles

### Release

1. Set the new version:
   ```bash
   npm run set-version <version>
   ```
2. Commit and push the version update:
   ```bash
   git add -A && git commit -m "v<version>" && git push
   ```
3. Create and push a tag to trigger deploy:
   ```bash
   git tag v<version> && git push origin v<version>
   ```