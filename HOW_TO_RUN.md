# How to Run Project Aegis

## 1. Navigate to the Project Directory
Open your terminal and navigate to the project folder:
```bash
cd /Users/rik_mac/Desktop/MAD/Aegis
```

## 2. Start the Development Server
To start the Expo development server, run:
```bash
npm start
```
*Alternatively, you can run `npx expo start`.*

## 3. Clear the Cache (Important after config changes)
If you recently installed new packages, updated `babel.config.js`, or encounter persistent errors (like the `__reanimatedLoggerConfig` issue), you should always start with a clean Metro bundler cache:
```bash
npm run start:clear
```
*Alternatively, you can run `npx expo start -c`.*

## 4. Running with a Tunnel (For Strict Wi-Fi Networks)
If your computer and mobile device are on a network that blocks local LAN connections (e.g., a university or corporate Wi-Fi), you must run Expo through a tunnel. This routes the connection through ngrok:
```bash
npx expo start --tunnel
```
*Note: This may require installing `@expo/ngrok` globally (`npm i -g @expo/ngrok`) if you haven't already.*

## 5. Viewing the App
- **On a Physical Device:** Download the **Expo Go** app on your iOS or Android device. Scan the QR code that appears in your terminal.
- **On an iOS Simulator:** Press `i` in the terminal after starting the server.
- **On an Android Emulator:** Press `a` in the terminal after starting the server.

## 6. Building Native Code
If you add native modules that are not supported by Expo Go, you will need to build the native app:
- **Android:** `npm run android`
- **iOS:** `npm run ios`
