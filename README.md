# MBet-Adera - Delivery Management System 📦

MBet-Adera is a modern delivery management system built with Expo, React Native, and Supabase. It provides a seamless experience for managing deliveries across Ethiopia, supporting both mobile (Android & iOS) and web platforms.

## Features

- 🔐 Secure authentication with Google OAuth
- 📍 Real-time location tracking
- 📱 Cross-platform support (iOS, Android, Web)
- 💳 Multiple payment options (YenePay, TeleBirr, Wallet)
- 💬 In-app chat system
- 🚚 Comprehensive delivery management

## Project Structure

```
src/
├── components/     # Reusable UI components
├── screens/        # Screen components
├── navigation/     # Navigation configuration
├── services/       # API and third-party services
├── utils/          # Utility functions
├── hooks/          # Custom React hooks
├── types/          # TypeScript type definitions
├── constants/      # Constants and configuration
└── assets/         # Images, fonts, etc.
```

## Getting Started

1. Install dependencies:
   ```bash
   npm install
   ```

2. Configure environment variables:
   - Create a `.env` file in the root directory
   - Add your Supabase configuration:
     ```
     SUPABASE_URL=your_supabase_url
     SUPABASE_ANON_KEY=your_supabase_key
     ```

3. Start the development server:
   ```bash
   npx expo start
   ```

## Development Stack

- **Frontend Framework**: React Native with Expo
- **Backend**: Supabase
- **State Management**: React Context + Hooks
- **Maps**: React Native Maps
- **Payments**: YenePay & TeleBirr Integration
- **Real-time Features**: Supabase Realtime

## Contributing

Please read our contributing guidelines before submitting pull requests.

## License

This project is proprietary and confidential. All rights reserved.
# mbetadera1
