
const config = {
  type: Phaser.AUTO,
  width: 1900, // These act as the base resolution
  height: 1200,
  scale: {
    mode: Phaser.Scale.FIT, // Auto-resize to fit screen
    autoCenter: Phaser.Scale.CENTER_BOTH // Center the canvas
  },
  physics: {
    default: 'arcade',
    arcade: {
      gravity: { y: 0 },
      debug: false
    }
  },
  scene: GameScene
};


new Phaser.Game(config);
