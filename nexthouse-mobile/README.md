# NextHouse Mobile

React Native + Expo mobile app for Android and iOS.

## Setup

```bash
cd nexthouse-mobile
npm install
```

## Run

```bash
# In Expo Go (scan QR code from your phone)
npm start

# Android emulator
npm run android

# iOS simulator (Mac only)
npm run ios
```

## Configuration

**Backend URL** — edit `src/lib/apiClient.ts`:

```ts
export const BASE_URL = 'http://10.0.2.2:8080'; // Android emulator → localhost
// For real device: use your computer's local IP, e.g. 'http://192.168.1.100:8080'
// For production: 'https://api.yourdomain.com'
```

## Testing on a real phone

1. Install **Expo Go** from App Store / Play Store
2. Start with `npm start`
3. Scan the QR code
4. Make sure your phone and computer are on the same Wi-Fi
5. Change `BASE_URL` to your computer's local IP address

## Screens

| Screen | Route |
|---|---|
| Login | `/(auth)/login` |
| Register | `/(auth)/register` |
| Feed | `/(tabs)` |
| Search/Explore | `/(tabs)/explore` |
| Chat Inbox | `/(tabs)/chat` |
| Notifications | `/(tabs)/notifications` |
| My Profile | `/(tabs)/profile` |
| Post Detail | `/post/[id]` |
| User Profile | `/user/[id]` |
| Chat Room | `/chat/[roomId]` |
| Marketplace | `/marketplace` |
| Safety Alerts | `/safety` |
| Neighbours | `/neighbours` |
| Communities | `/communities` |
| Activities | `/activities` |
| Borrow Requests | `/borrow` |
| Saved Posts | `/saved` |
| Create Post | `/post/create` |
| Create Story | `/stories/create` |
| Settings | `/settings` |
