# Couple Game - Interactive Games for Couples

[English](README.md) | [中文](README.zh.md) | [日本語](README.ja.md)

> ⚠️ **18+ Content Warning**
> This application contains adult-oriented interactive content and is recommended for adult couples. Some tasks and game content may involve intimate interactions.

A multiplayer interactive game application designed for couples, supporting various game modes including Flying Chess, Lucky Wheel, Minesweeper, and Draw & Guess. Offers both **online multiplayer** and **local LAN** gameplay options. Enhance interaction and understanding between couples through fun games and task systems.

## ✨ Features

- 🎮 **Multiple Game Modes**
  - **Flying Chess**: Classic two-player board game with task challenges on special tiles
  - **Lucky Wheel**: Fun lottery wheel that randomly draws surprise tasks or penalties
  - **Minesweeper Battle**: Two-player competitive minesweeper, compete in speed and luck
  - **Draw & Guess**: Creative drawing game where one draws and the other guesses

- 🤖 **AI-Powered Features**
  - **AI Word Generation**: Intelligent word generation for Draw & Guess game
  - **AI Task Creation**: Automatically generate personalized couple tasks
  - **Multi-language Support**: AI adapts to your selected language
  - **Customizable**: Configure your own AI service (OpenAI-compatible APIs)

- 🌐 **Flexible Connection Options**
  - **LAN Mode**: Play locally on the same WiFi without internet, low latency
  - **Online Mode**: Remote multiplayer via server, play together even when apart

- 🎯 **Task System**
  - Rich built-in couple interaction task library
  - Support custom task sets for personalized game experience
  - Various task types: Q&A, actions, intimate interactions, etc.
  - Difficulty grading system (Easy/Medium/Hard)
  - **AI-Generated Tasks**: Create unlimited unique tasks with AI

- 🌍 **Multi-Platform Support**
  - iOS native app
  - Android native app
  - Web version (PWA support)

- 🎨 **User-Friendly**
  - Clean and beautiful interface design
  - Smooth animation effects
  - Complete internationalization support (English/中文/日本語)

## 🎲 Game Modes

### Flying Chess ✈️
Classic two-player flying chess game. Roll the dice to move forward, first to reach the end wins.
- Land on **Task Tiles**: Draw random tasks to complete challenges
- Land on **Opponent's Piece**: Send opponent back to start
- Supports LAN and online battles

### Lucky Wheel 🎡
Exciting lottery wheel game, test your luck!
- Spin the wheel, pointer position determines the task
- Multiple task types mixed, full of surprises
- Take turns, increase game interaction

### Minesweeper Battle 💣
Two-player competitive minesweeper, compete in speed and strategy.
- Share the same minefield, compete to reveal more safe tiles
- Hit mines lose points, reveal numbers gain points
- Real-time battle, intense and exciting

### Draw & Guess 🎨
Creative drawing game that unleashes imagination!
- **Drawing Phase**: One player draws the given word
- **Guessing Phase**: Other player guesses what's being drawn
- **AI Word Generation**: Intelligent word generation based on difficulty
- **Scoring System**: Points based on guessing speed and accuracy
- **Multiple Difficulties**: Easy/Medium/Hard with different time limits
- Perfect for couples to have fun and laugh together

### Task System 📝
Core system throughout all games:
- **Q&A Type**: Enhance understanding, answer questions about each other
- **Action Type**: Fun challenges, complete specified actions
- **Intimate Type**: Sweet interactions that enhance feelings (18+)
- **Custom Type**: Create exclusive tasks for personalized experience
- **AI-Generated**: Use AI to create unlimited unique tasks tailored to your preferences

## 🤖 AI Features

### AI Word Generation (Draw & Guess)
- Automatically generates drawing words based on selected difficulty
- Adapts to your language preference
- Ensures varied and interesting words for each game
- Fallback to built-in word library when AI is unavailable

### AI Task Generation
- Generate personalized couple tasks with AI
- Customize task difficulty and type
- Create unlimited unique tasks
- Support multiple languages

### AI Configuration
Configure your own AI service in settings:
- **API URL**: OpenAI-compatible API endpoint
- **API Key**: Your API key
- **Model Name**: Specify the model to use
- Works with OpenAI, Azure OpenAI, or compatible services

## 💡 Use Cases

- 🏠 **Home Dating**: Use LAN mode, no data usage, low latency, high experience
- 🌃 **Long Distance**: Play together anytime, anywhere through online mode
- 🎉 **Party Fun**: Interactive mini-games for friend gatherings
- 💑 **Enhance Relationship**: Get to know each other better through task system
- 🎁 **Special Occasions**: Romantic interactions for anniversaries, birthdays, etc.

> 💡 **Recommended: LAN Mode**
>
> Use LAN mode on the same WiFi to enjoy:
> - ⚡ Zero-latency game experience
> - 🔒 More private data transmission
> - 📱 No mobile data consumption
> - 🌐 No dependency on external servers

## 🚀 Quick Start

### Local Development

```bash
# Clone repository
git clone https://github.com/yourusername/couple-game-rn.git
cd couple-game-rn

# Install dependencies
npm install

# Start development server
npm start

# iOS
npm run ios

# Android
npm run android

# Web
npm run web
```

### Server Deployment

For detailed deployment guide, see: [📖 Deployment Guide](https://github.com/JYuYuan/coupon-game-server/blob/main/README.md)

## 📦 Download & Install

### Download from GitHub Releases

Visit the [Releases](https://github.com/JYuYuan/couple-game-rn/releases) page to download the latest version:

- **Android**: `couple-game.apk`
- **iOS**: `couple-game-unsigned.ipa` (requires signing tool to install)
- **Web**: Visit online or download `couple-game-web.zip` for offline deployment

### Web Online Experience

Visit: `https://qq.cpflying.top`

## 🛠 Tech Stack

### Client
- **Framework**: React Native + Expo
- **Routing**: Expo Router
- **State Management**: Zustand
- **Internationalization**: i18next
- **UI**: React Native Reanimated + Expo Vector Icons
- **Networking**: Socket.IO Client
- **AI Integration**: OpenAI-compatible API support

### Server
- **Runtime**: Node.js
- **Framework**: Express
- **Real-time Communication**: Socket.IO
- **Language**: TypeScript

## 📱 Supported Platforms

| Platform | Support Status | Notes |
|----------|---------------|-------|
| iOS | ✅ Supported | Requires iOS 13.0+ |
| Android | ✅ Supported | Requires Android 5.0+ |
| Web | ✅ Supported | Modern browsers |

## 🔧 Project Structure

```
couple-game-rn/
├── app/                    # Application pages
│   ├── (tabs)/            # Tab navigation pages
│   └── _layout.tsx        # Root layout
├── components/            # Reusable components
├── constants/             # Constants configuration
├── hooks/                 # Custom Hooks
├── i18n/                  # Internationalization config
│   └── locales/          # Language files (en, zh, ja)
├── services/              # Business services
│   └── ai/               # AI service integration
├── store/                 # State management
├── types/                 # TypeScript types
├── server/                # Socket.IO server
│   ├── core/             # Core game logic
│   ├── games/            # Game implementations
│   └── index.ts          # Server entry
└── .github/              # GitHub Actions workflows
    └── workflows/        # CI/CD configuration
```

## 📖 Documentation

- [Deployment Guide](https://github.com/JYuYuan/coupon-game-server/blob/main/DEPLOYMENT.md) - Server and client deployment
- [Server Documentation](https://github.com/JYuYuan/coupon-game-server/blob/main/DEPLOYMENT.md) - Server configuration details
- [Server README](https://github.com/JYuYuan/coupon-game-server/blob/main/README.md) - Game simulator usage
- [AI Integration Guide](./AI_INTEGRATION.md) - How to configure AI features

## 🤝 Contributing

Issues and Pull Requests are welcome!

## 📄 License

MIT License

## 🎯 Roadmap

- [x] Flying Chess game mode
- [x] Lucky Wheel game mode
- [x] Minesweeper Battle mode
- [x] Draw & Guess game mode
- [x] AI word generation for Draw & Guess
- [x] AI task generation
- [x] Multi-language support (English/中文/日本語)
- [ ] More game modes
- [ ] Leaderboard system
- [ ] Social features
- [ ] Achievement system
- [ ] Skin shop
- [ ] Voice chat

## 📞 Contact

For questions or suggestions, please contact us through:
- GitHub Issues: [Create Issue](https://github.com/JYuYuan/couple-game-rn/issues)

---

Made with ❤️ for couples
