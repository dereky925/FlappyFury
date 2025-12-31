# Flappy Fury 🛩️

A Flappy Bird-inspired game featuring the Anduril Fury collaborative combat aircraft! Navigate through obstacles, survive as long as you can, and beat your high score.

![Flappy Fury](https://img.shields.io/badge/Game-Flappy%20Fury-blue?style=for-the-badge)
![HTML5](https://img.shields.io/badge/HTML5-Canvas-orange?style=flat-square)
![JavaScript](https://img.shields.io/badge/JavaScript-ES6+-yellow?style=flat-square)

## 🎮 Play the Game

### Mobile/Desktop
Go to the link:
```
https://dereky925.github.io/FlappyFury/
```

### Online
Simply open `index.html` in any modern web browser - no server required!

### Local Development
```bash
# Clone the repository
git clone https://github.com/yourusername/FlappyFury.git

# Open in browser
open index.html
# or just double-click index.html
```

## ✨ Features

- **🛩️ Anduril Fury Plane**: Pixel-art styled stealth drone as the player character
- **🧱 Mario-Style Obstacles**: Brick walls and green pipes inspired by classic Mario games
- **🌅 Dynamic Day/Night Cycle**: Watch the sun rise and set as you play
- **🌙 Night Sky**: Moon, twinkling stars, and shooting stars at night
- **✈️ Background Traffic**: Other Fury drones and planes flying by in the background
- **🏙️ Animated Cityscape**: Buildings with lit windows at night
- **☁️ Moving Clouds**: Parallax cloud layers
- **🔊 Retro Sound Effects**: Synthesized 8-bit style sounds (no audio files needed)
- **🏅 Medal System**: Earn bronze, silver, gold, or platinum medals
- **💾 High Score**: Automatically saved to local storage
- **📱 Mobile Friendly**: Works on phones, tablets, and desktops

## 🎯 How to Play

- **Tap** (mobile) or press **Spacebar/Arrow Up** (desktop) to flap and fly
- Avoid the brick walls and pipes
- Each obstacle passed = 1 point
- Try to beat your high score!

## 🏆 Medals

| Medal | Score Required |
|-------|----------------|
| 🥉 Bronze | 10+ |
| 🥈 Silver | 20+ |
| 🥇 Gold | 30+ |
| 💎 Platinum | 40+ |

## 📁 Project Structure

```
FlappyFury/
├── index.html      # Main HTML file
├── style.css       # Styling and animations
├── game.js         # Game engine and logic
└── README.md       # This file
```

## 🛠️ Technical Details

- **Pure HTML5 Canvas** - No external game frameworks
- **Vanilla JavaScript** - No dependencies
- **Web Audio API** - Synthesized sound effects
- **Responsive Design** - Scales to any screen size
- **60 FPS** - Smooth gameplay using requestAnimationFrame

## 🎨 Customization

You can easily modify these values in `game.js`:

```javascript
const gapHeight = 150;       // Space between obstacles
const obstacleSpeed = 2.5;   // How fast obstacles move
const obstacleInterval = 100; // Frames between new obstacles
player.gravity = 0.5;        // How fast player falls
player.flapStrength = -8;    // Jump power
```

## 📱 Browser Support

- Chrome (recommended)
- Firefox
- Safari
- Edge
- Mobile browsers (iOS Safari, Chrome for Android)

## 🤝 Contributing

Feel free to fork this project and add your own features! Some ideas:
- Different plane skins
- Power-ups
- Leaderboard
- More obstacle types
- Particle effects

## 📄 License

MIT License - feel free to use and modify!

---

Made with ❤️ and way too much caffeine ☕
