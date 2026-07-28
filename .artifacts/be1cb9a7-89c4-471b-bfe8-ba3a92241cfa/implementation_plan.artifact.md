# HTML to App Conversion Plan

This plan outlines the steps to convert the existing Android project into a hybrid app that loads a local `index.html` file as its primary interface.

## User Review Required

> [!IMPORTANT]
> The app will use a `WebView` to render HTML content. Ensure that any external resources (CSS, JS, Images) referenced in your HTML files are either placed in the `assets` folder or that the app has appropriate network permissions.

## Proposed Changes

### Project Configuration

#### [MODIFY] [AndroidManifest.xml](file:///Users/tanutripathi/PiXelArena/app/src/main/AndroidManifest.xml)
- Add `<uses-permission android:name="android.permission.INTERNET" />` to allow the WebView to load external resources if needed.

### Assets

#### [NEW] [index.html](file:///Users/tanutripathi/PiXelArena/app/src/main/assets/index.html)
- Create a boilerplate `index.html` file in the `app/src/main/assets/` directory.

### UI Implementation

#### [MODIFY] [MainActivity.kt](file:///Users/tanutripathi/PiXelArena/app/src/main/java/com/pranav/pixel_arena/MainActivity.kt)
- Replace the existing Jetpack Compose UI with an `AndroidView` that hosts a `WebView`.
- Configure the `WebView` to enable JavaScript and load `file:///android_asset/index.html`.
- Implement basic back-button handling so the WebView can navigate back through its history.

## Verification Plan

### Automated Tests
- Build the project to ensure there are no compilation errors.

### Manual Verification
- Deploy the app to a device/emulator and verify that the content of `index.html` is displayed.
- Test navigation if additional HTML files are added.
