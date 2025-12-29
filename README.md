# PennyWise - Expense Tracker

> **Every Dollar Counts** - A modern mobile expense tracking app that makes financial management engaging rather than tedious.

[![React Native](https://img.shields.io/badge/React%20Native-0.81.5-blue.svg)](https://reactnative.dev/)
[![Expo](https://img.shields.io/badge/Expo-54.0.0-000020.svg)](https://expo.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.9.2-blue.svg)](https://www.typescriptlang.org/)
[![Supabase](https://img.shields.io/badge/Supabase-2.77.0-3ECF8E.svg)](https://supabase.com/)

## 📱 About

PennyWise is a cross-platform mobile application designed to help users take control of their budgets through intuitive expense tracking, powerful analytics, and smart budget management features.

### Key Features

- 💰 **Expense Tracking** - Quick entry with categories, receipts, and recurring expenses
- 📊 **Budget Management** - Overall and category-specific budgets with real-time monitoring
- 📈 **Analytics** - Visual insights with charts, trends, and spending patterns
- 🎯 **Goals** - Financial goal setting and tracking with progress indicators
- 🌍 **Multi-Currency** - Support for multiple currencies with automatic conversion
- 📤 **Data Export** - CSV and PDF reports for financial records
- ☁️ **Cloud Sync** - Real-time synchronization across devices via Supabase
- 🔒 **Secure** - Row-level security (RLS) policies for data protection
- 📴 **Offline Support** - Works offline with automatic sync when online

## 🏗️ Tech Stack

### Frontend
- **Framework**: React Native 0.81.5 with React 19.1.0
- **Build System**: Expo SDK 54.0.0
- **Router**: Expo Router 6.0.10 (file-based routing)
- **Language**: TypeScript 5.9.2 (strict mode)
- **Styling**: NativeWind (Tailwind CSS for React Native)
- **State Management**: Zustand 4.5.1
- **Animations**: React Native Reanimated 4.1.1

### Backend
- **Database**: Supabase (PostgreSQL)
- **Authentication**: Supabase Auth
- **Real-time**: Supabase Realtime
- **Storage**: AsyncStorage (local), Supabase Storage (cloud)

### Development Tools
- **Linting**: ESLint 9.25.1
- **Formatting**: Prettier 3.2.5
- **Type Checking**: TypeScript strict mode

## 🚀 Getting Started

### Prerequisites

- Node.js 18+ and npm
- Expo CLI
- iOS Simulator (macOS) or Android Studio (for Android development)
- Supabase account (for cloud features)

### Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd pennywise-tracker
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up environment variables**
   
   Create a `.env` file in the root directory:
   ```env
   # Supabase Configuration
   SUPABASE_URL=your_supabase_project_url
   SUPABASE_ANON_KEY=your_supabase_anon_key
   
   # App Configuration
   IOS_BUNDLE_ID=com.tracker.pennywise
   ANDROID_PACKAGE_NAME=com.tracker.pennywise
   
   # Database Backup (Optional)
   SUPABASE_DB_URL=your_database_connection_string
   SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
   ```

4. **Set up Supabase**
   
   Run the SQL migrations in your Supabase project:
   ```bash
   # Navigate to Supabase SQL Editor and run:
   # 1. supabase/migrations/*.sql (in order)
   # 2. supabase/seed.sql (optional, for test data)
   ```

### Development

```bash
# Start Expo development server
npm start

# Run on iOS simulator
npm run ios

# Run on Android emulator
npm run android

# Run in web browser
npm run web
```

### Code Quality

```bash
# Run linter and formatter checks
npm run lint

# Auto-fix linting and formatting issues
npm run format
```

### Building

```bash
# Generate native projects
npm run prebuild

# Build for production (requires EAS CLI)
eas build --platform ios
eas build --platform android
```

## 📁 Project Structure

```
pennywise-tracker/
├── app/                      # Expo Router screens (file-based routing)
│   ├── (auth)/              # Authentication screens
│   ├── (modals)/            # Modal screens
│   ├── (onboarding)/        # Onboarding flow
│   ├── (tabs)/              # Main tab navigation
│   ├── _layout.tsx          # Root layout
│   └── index.tsx            # Home screen
├── components/              # Reusable UI components
├── services/                # Business logic and API services
│   ├── auth/               # Authentication service
│   ├── migration/          # Data migration service
│   ├── network/            # Network connectivity
│   ├── supabase/           # Supabase client and operations
│   └── sync/               # Offline sync service
├── store/                   # Zustand state management
│   ├── authStore.ts        # Authentication state
│   ├── transactionsStore.ts # Transactions state
│   ├── budgetStore.ts      # Budget state
│   ├── goalsStore.ts       # Goals state
│   └── settingsStore.ts    # Settings state
├── hooks/                   # Custom React hooks
├── utils/                   # Utility functions
├── types/                   # TypeScript type definitions
├── constants/               # App constants
├── assets/                  # Static assets (images, fonts)
├── supabase/               # Supabase migrations and schemas
├── scripts/                # Utility scripts (backups, etc.)
└── .kiro/                  # Development specifications
```

### Supabase Setup

1. Create a new Supabase project
2. Run migrations from `supabase/migrations/`
3. Configure Row Level Security (RLS) policies
4. Set up authentication providers (email, OAuth)

### Backup & Restore

```bash
# Backup database via API
node scripts/backup-via-api.js

# Backup database via CLI (requires Supabase CLI)
npm run backup:db

# Backup RLS policies
node scripts/backup-rls-policies.js
```

See `scripts/README.md` for detailed backup instructions.

## 🧪 Testing

### Manual Testing Checklist

- [ ] Guest mode: Create transactions, budgets, goals
- [ ] Sign up: Verify data migration from guest to authenticated
- [ ] Sign in: Load user data from cloud
- [ ] Offline mode: Create data offline, sync when online
- [ ] Sign out: Verify data cleanup
- [ ] User switching: Verify data isolation between users

## 🚢 Deployment

### Expo Application Services (EAS)

1. Install EAS CLI:
   ```bash
   npm install -g eas-cli
   ```

2. Configure EAS:
   ```bash
   eas build:configure
   ```

3. Build for production:
   ```bash
   # iOS
   eas build --platform ios --profile production
   
   # Android
   eas build --platform android --profile production
   ```

4. Submit to stores:
   ```bash
   eas submit --platform ios
   eas submit --platform android
   ```

