class GameScene extends Phaser.Scene {
  constructor() {
    super('GameScene');
  }

  preload() {
    //Spritesheets and images
    this.load.spritesheet('player', 'assets/player.png', { frameWidth: 350, frameHeight: 150 });
    this.load.spritesheet('bullet', 'assets/bullet.png', { frameWidth: 211, frameHeight: 92 });
    this.load.spritesheet('playerBullet', 'assets/playerBullet.png', { frameWidth: 211, frameHeight: 92 });
    this.load.image('enemy', 'assets/enemy1.png');
    this.load.image('enemy2', 'assets/enemy2.png');
    this.load.spritesheet('explosion', 'assets/explosion-sheet-50.png', { frameWidth: 200, frameHeight: 150 });

    // Parallax layers
    this.load.image('sky', 'assets/parallaxcitysky.png');
    this.load.image('mountainsFar', 'assets/bgMountainsFar.png');
    this.load.image('mountainsMid', 'assets/bgMountainsMid.png');
    this.load.image('water', 'assets/bgWater.png');
    this.load.image('city', 'assets/bgCity.png');
    this.load.image('reflection', 'assets/bgReflection.png');
    this.load.image('front', 'assets/bgFront.png');

    // Sounds and music
    this.load.audio('bgMusic', 'assets/action_theme.ogg');
    this.load.audio('enemyExplosion', 'assets/sfx_enemy_explode.wav');
    this.load.audio('playerExplosion', 'assets/sfx_player_explode.wav');
  }

  create() {
    this.initGame();

    // === Centralized hitbox tuning ===
    this.configureHitboxes();

    this.anims.create({
      key: 'bullet_anim',
      frames: this.anims.generateFrameNumbers('bullet', { start: 0, end: 1 }),
      frameRate: 10,
      repeat: -1
    });

    this.anims.create({
      key: 'playerBullet_anim',
      frames: this.anims.generateFrameNumbers('playerBullet', { start: 0, end: 1 }),
      frameRate: 10,
      repeat: -1
    });



    this.input.keyboard.on('keydown-R', () => {
      if (this.bgMusic && this.bgMusic.isPlaying) {
        this.bgMusic.stop(); //  Properly stop the currently playing bgMusic
      }
    
      this.scene.restart(); //  Restart the scene cleanly
    });

    this.bgMusic = this.sound.add('bgMusic', {
      volume: 0.5,
      loop: true
    });
    this.bgMusic.play();

    this.input.keyboard.on('keydown-D', () => {
      this.toggleDebugMode();
    });

    if (this.physics.world.debugGraphic) {
      this.physics.world.debugGraphic.clear(); // Clear from previous scene
    }
    
    if (this.debugMode && !this.physics.world.debugGraphic) {
      this.physics.world.createDebugGraphic(); // Only create if toggled on
    }
    
    
    
    this.anims.create({
      key: 'explode',
      frames: this.anims.generateFrameNumbers('explosion', { start: 0, end: 6 }),
      frameRate: 15,
      hideOnComplete: true
    });
    
  }

  initGame() {
    this.debugMode = false;
    this.score = 0;
    this.playerHealth = 3;
    this.lastFired = 0;
    this.enemySpawnTimer = 0;
  
    // === WAVE SYSTEM ===
    this.waveNumber = 1;
    this.waveEnemyCount = 15;
    this.enemiesRemaining = this.waveEnemyCount;

    this.heavyEnemies = this.physics.add.group();
    this.heavyEnemySpawnTimer = 0;
    this.heavyEnemyMax = 3;
    this.heavyEnemiesSpawned = 0;

  
    const width = this.sys.game.config.width;
    const height = this.sys.game.config.height;
    const backgroundOriginalWidth = 3800;
    const backgroundOriginalHeight = 1200;
  
    const zoomOutFactor = 1;
    const scale = Math.max(width / backgroundOriginalWidth, height / backgroundOriginalHeight) * zoomOutFactor;
  
    // Background
    this.bgWater = this.add.tileSprite(0, 0, backgroundOriginalWidth * scale, backgroundOriginalHeight * scale, 'water').setOrigin(0).setScale(zoomOutFactor);
    this.bgSky = this.add.tileSprite(0, 0, backgroundOriginalWidth * scale, backgroundOriginalHeight * scale, 'sky').setOrigin(0).setScale(zoomOutFactor);
    this.bgMountainsFar = this.add.tileSprite(0, 0, backgroundOriginalWidth * scale, backgroundOriginalHeight * scale, 'mountainsFar').setOrigin(0).setScale(zoomOutFactor);
    this.bgMountainsMid = this.add.tileSprite(0, 0, backgroundOriginalWidth * scale, backgroundOriginalHeight * scale, 'mountainsMid').setOrigin(0).setScale(zoomOutFactor);
    this.bgCity = this.add.tileSprite(0, 0, backgroundOriginalWidth * scale, backgroundOriginalHeight * scale, 'city').setOrigin(0).setScale(zoomOutFactor);
    this.bgReflection = this.add.tileSprite(0, 0, backgroundOriginalWidth * scale, backgroundOriginalHeight * scale, 'reflection').setOrigin(0).setScale(zoomOutFactor);
    this.bgFront = this.add.tileSprite(0, 0, backgroundOriginalWidth * scale, backgroundOriginalHeight * scale, 'front').setOrigin(0).setScale(zoomOutFactor);
  
    // Player
    this.cursors = this.input.keyboard.createCursorKeys();
    this.player = this.physics.add.sprite(100, height / 2, 'player', 3).setScale(0.75);
    this.player.setCollideWorldBounds(true);
    this.playerInvincible = false;
    this.playerDead = false;

  
    this.bullets = this.physics.add.group({ classType: Phaser.Physics.Arcade.Sprite, maxSize: 10, runChildUpdate: true });
    this.enemies = this.physics.add.group();
    this.enemyBullets = this.physics.add.group();
  
    this.scoreText = this.add.text(16, 16, 'Score: 0', { fontSize: '30px', fill: '#fff' });
    this.healthText = this.add.text(16, 40, 'Health: 3', { fontSize: '30px', fill: '#fff' });
  
    this.initialWaveSpawnDone = false;
    this.wavePhaseEnemiesSpawned = 0;
    this.wavePhaseEnemiesDefeated = 0;
      
    this.showWaveMessage();
  }

  update(time) {
    this.bgSky.tilePositionX += 0.2;
    this.bgMountainsFar.tilePositionX += 0.4;
    this.bgMountainsMid.tilePositionX += 0.6;
    this.bgWater.tilePositionX += 0.8;
    this.bgCity.tilePositionX += 1.0;
    this.bgReflection.tilePositionX += 1.0;
    this.bgFront.tilePositionX += 1.2;

    this.handlePlayerMovement(time);
    this.spawnEnemies(time);

    this.spawnHeavyEnemies(time);
    this.updateHeavyEnemies(time);

    this.bullets.children.iterate(b => {
      if (b && b.x > 1900) b.destroy();
    });
    this.enemyBullets.children.iterate(b => {
      if (b && b.x < -10) b.destroy();
    });

    this.physics.overlap(this.bullets, this.enemies, this.bulletHitsEnemy, null, this);
    this.physics.overlap(this.enemyBullets, this.player, this.enemyHitsPlayer, null, this);
    this.physics.overlap(this.bullets, this.heavyEnemies, this.bulletHitsEnemy, null, this);
    this.physics.overlap(this.player, this.enemies, this.enemyCollidesWithPlayer, null, this);
    this.physics.overlap(this.player, this.heavyEnemies, this.heavyCollidesWithPlayer, null, this);


  }

  handlePlayerMovement(time) {
    this.player.setVelocity(0);

    const FRAMES = {
      STRONG_UP: 0,
      SLIGHT_UP: 1,
      IDLE: 3,
      SLIGHT_DOWN: 5,
      STRONG_DOWN: 6
    };

    if (this.cursors.up.isDown) {
      this.player.setVelocityY(-320);
      this.player.setFrame(FRAMES.STRONG_UP);
    } else if (this.cursors.down.isDown) {
      this.player.setVelocityY(320);
      this.player.setFrame(FRAMES.STRONG_DOWN);
    } else {
      this.player.setFrame(FRAMES.IDLE);
    }

    if (this.cursors.space.isDown && this.time.now > this.lastFired) {
      // Limit to 3 active bullets
      const activeBullets = this.bullets.countActive(true);
      if (activeBullets >= 3) return;
    
      const bullet = this.bullets.get(this.player.x + 20, this.player.y, 'playerBullet');
      if (bullet) {
        bullet.setActive(true)
          .setVisible(true)
          .setVelocityX(800)
          .setScale(0.6)
          bullet.play('playerBullet_anim');
    
        bullet.body.setSize(80, 20);
        bullet.body.setOffset(100, 35);
    
        this.lastFired = this.time.now + 300;
      }
    }
    
  }

  spawnEnemies(time) {
    if (
      this.enemiesRemaining > 0 &&
      time > this.enemySpawnTimer &&
      (
        (!this.initialWaveSpawnDone && this.wavePhaseEnemiesSpawned < Math.floor(this.waveEnemyCount / 2)) ||
        this.initialWaveSpawnDone
      )
    ) {    
      const enemy = this.enemies.create(1900, Phaser.Math.Between(125, 1100), 'enemy').setScale(1);
      enemy.startY = enemy.y;
      enemy.startTime = time;
      enemy.frequency = Phaser.Math.FloatBetween(0.002, 0.004);
      enemy.amplitude = Phaser.Math.Between(50, 100);
      enemy.setData('state', 'normal'); // states: normal → waiting → dashing
      enemy.setData('pauseTimer', null);

  
      // Optional hitbox adjustment if needed
      enemy.body.setSize(enemy.width, enemy.height);
      enemy.body.setOffset(0, 0);
  
      this.enemiesRemaining--;
      this.wavePhaseEnemiesSpawned++;

  
      this.time.addEvent({
        delay: 4000,
        callback: () => {
          if (!enemy.active) return;
          const bullet = this.enemyBullets.create(enemy.x - 20, enemy.y, 'bullet');
          bullet.setVelocityX(-600);
          bullet.setScale(0.5);
          bullet.setFlipX(true);
          bullet.play('bullet_anim');
          bullet.body.setSize(80, 20);
          bullet.body.setOffset(40, 35);
        },
        callbackScope: this,
        loop: true
      });
  
      this.enemySpawnTimer = time + 1000;
    }
  
    this.enemies.children.iterate(enemy => {
      if (enemy) {
        enemy.y = enemy.startY + Math.sin(enemy.startTime + this.time.now * enemy.frequency) * enemy.amplitude;
        let state = enemy.getData('state');

        if (state === 'normal') {
          enemy.x -= 2;

          if (enemy.x <= 1425) {
            enemy.setData('state', 'waiting');
            enemy.setVelocityX(0); // pause
            const timer = this.time.delayedCall(500, () => {
              if (enemy.active) {
                enemy.setData('state', 'dashing');
              }
            });
            enemy.setData('pauseTimer', timer);
          }
        }

        else if (state === 'dashing') {
          enemy.x -= 10; // dash speed
        }

        if (enemy.x < -50) {
          // Cancel pending pause timer if enemy was removed early
          const timer = enemy.getData('pauseTimer');
          if (timer) timer.remove(false);

          enemy.x = 1950;
          enemy.y = Phaser.Math.Between(125, 1100);
          enemy.startY = enemy.y;
          enemy.startTime = this.time.now;
          enemy.frequency = Phaser.Math.FloatBetween(0.002, 0.004);
          enemy.amplitude = Phaser.Math.Between(50, 100);
          enemy.setData('state', 'normal');
          enemy.setData('pauseTimer', null);
        }        
      }
    });
  }

  spawnHeavyEnemies(time) {
    if (
      !this.initialWaveSpawnDone || //  Do not spawn heavies yet
      this.heavyEnemies.countActive(true) >= this.heavyEnemyMax || 
      this.heavyEnemiesSpawned >= this.heavyEnemyMax || 
      time < this.heavyEnemySpawnTimer
    ) return;

    const y = Phaser.Math.Between(150, 1050);
    const x = 2000; // Always spawn off right edge
  
    const heavy = this.heavyEnemies.create(x, y, 'enemy2').setScale(1);
    heavy.setData('state', 'entering');
    heavy.setData('hp', 5);
    heavy.setData('invincible', false);
    heavy.setData('originalX', 1700); // where it settles to idle
    heavy.setData('lastDash', time);
    heavy.setData('fireCooldown', time);
  
    heavy.setVelocityX(-120); // creep in from right

    this.heavyEnemiesSpawned++;

  
    this.heavyEnemySpawnTimer = time + 4000;
  }
  

  updateHeavyEnemies(time) {
    this.heavyEnemies.children.iterate(heavy => {
      if (!heavy.active) return;
  
      const state = heavy.getData('state');
      const originalX = heavy.getData('originalX');
  
      if (state === 'entering') {
        if (heavy.x <= originalX) {
          heavy.setVelocityX(0);
          heavy.setX(originalX);
          heavy.setData('state', 'idle');
          heavy.setData('idleSince', time); // track when it entered idle
          heavy.setData('hasFired', false); // will fire only once per idle
        }
        
      }
  
      if (state === 'idle') {
        const idleTime = time - heavy.getData('idleSince');
      
        if (!heavy.getData('hasFired') && idleTime >= 1000) {
          // Fire barrage
          for (let i = 0; i < 5; i++) {
            this.time.delayedCall(i * 200, () => {
              if (!heavy.active || !this.player.active) return;
      
              const bullet = this.enemyBullets.create(heavy.x, heavy.y, 'bullet');
              this.physics.moveToObject(bullet, this.player, 1200);
              bullet.setScale(0.5);
              bullet.play('bullet_anim');
              bullet.setFlipX(true);
              bullet.body.setSize(80, 20);
              bullet.body.setOffset(40, 35);
            });
          }
      
          heavy.setData('hasFired', true);
        }
      
        if (idleTime >= 2000 && heavy.getData('hasFired')) {
          heavy.setVelocityX(-800);
          heavy.setData('state', 'dashing');
        }
      }
      
  
      if (state === 'dashing') {
        if (heavy.x < -150) {
          // Reset to right edge and restart entry
          const newY = Phaser.Math.Between(150, 1050);
          heavy.setPosition(2000, newY);
          heavy.setVelocityX(-40);
          heavy.setData('state', 'entering');
          heavy.setData('lastDash', time);
          // heavy.setData('hp', 5); // Optional: reset health if desired
        }
      }
    });
  }
  
  playExplosion(x, y, scale = 1) {
    if (typeof x !== 'number' || typeof y !== 'number' || isNaN(x) || isNaN(y)) {
      console.warn('Invalid explosion coordinates:', x, y);
      return;
    }
  
    const explosion = this.add.sprite(x, y, 'explosion').setScale(scale);
    explosion.play('explode');
  }
  

  bulletHitsEnemy(bullet, enemy) {
    bullet.destroy();
  
    if (enemy.texture.key === 'enemy2') {
      let hp = enemy.getData('hp') - 1;
  
      if (hp <= 0) {
        if (enemy.active) {
          this.playExplosion(enemy.x, enemy.y, 1.2);
          this.sound.play('enemyExplosion');
          enemy.destroy();
        }
        this.score += 500;
      } else {
        enemy.setData('hp', hp);
      }
  
    } else if (enemy.texture.key === 'enemy') {
      if (enemy.active) {
        this.playExplosion(enemy.x, enemy.y, 1.2);
        this.sound.play('enemyExplosion', {
          volume: 0.6,
          rate: 3 // 🔊 Higher pitch + faster playback
        });
        enemy.destroy();
      }
      this.score += 100;

      this.wavePhaseEnemiesDefeated++;

      if (
        !this.initialWaveSpawnDone &&
        this.wavePhaseEnemiesDefeated >= Math.ceil(Math.floor(this.waveEnemyCount / 2) / 2)
      ) {
        this.initialWaveSpawnDone = true;
      
        // Store the message reference
        this.reinforcementText = this.add.text(this.scale.width / 2, 100, 'Reinforcements Incoming!', {
          fontSize: '32px',
          fill: '#fff'
        }).setOrigin(0.5).setDepth(100);
      
        //  Auto-destroy after 2 seconds
        this.time.delayedCall(2000, () => {
          if (this.reinforcementText) {
            this.reinforcementText.destroy();
            this.reinforcementText = null;
          }
        });
      }
      


  
      if (this.enemiesRemaining === 0 && this.enemies.countActive(true) === 0) {
        this.startNextWave();
      }
    }
  
    this.scoreText.setText('Score: ' + this.score);
  }
  
  
  

  configureHitboxes() {
    // === Player Hitbox ===
    if (this.player?.body) {
      const playerHitboxWidth = 130;
      const playerHitboxHeight = 20;
  
      // const scaledWidth = this.player.displayWidth;
      // const scaledHeight = this.player.displayHeight;
  
      // const offsetX = (scaledWidth - playerHitboxWidth) / 2;
      // const offsetY = (scaledHeight - playerHitboxHeight) / 2;
  
      this.player.body.setSize(220, 20);
      this.player.body.setOffset(70, 60); // ← Tune these values to center the hitbox visually

    }
  
    // === Bullets ===
    this.bullets.children.iterate(b => {
      if (b?.body) b.body.setSize(105, 46).setOffset(0, 0);
    });
  
    this.enemyBullets.children.iterate(b => {
      if (b?.body) b.body.setSize(60, 20).setOffset(40, 15); // ← Tuned manually
    });
  
    // === Enemies ===
    this.enemies.children.iterate(e => {
      if (e?.body) e.body.setSize(e.width, e.height).setOffset(0, 0);
    });
  }

  
  toggleDebugMode() {
    this.debugMode = !this.debugMode;
    this.physics.world.drawDebug = this.debugMode;
  
    if (this.debugMode) {
      if (!this.physics.world.debugGraphic) {
        this.physics.world.createDebugGraphic();
      }
    } else {
      if (this.physics.world.debugGraphic) {
        this.physics.world.debugGraphic.clear();
        this.physics.world.debugGraphic.destroy();
        this.physics.world.debugGraphic = null;
      }
    }
  
    console.log(`Debug mode ${this.debugMode ? 'enabled' : 'disabled'}`);
  }
  


  enemyHitsPlayer(player, bullet) {
    bullet.destroy();
    if (!this.playerInvincible) {
      this.takePlayerDamage();
    }
    this.healthText.setText('Health: ' + this.playerHealth);

    if (this.playerHealth <= 0) {
      this.physics.pause();
      this.add.text(850, 600, 'Game Over\nPress R to Restart', {
        fontSize: '32px',
        fill: '#fff',
        align: 'center'
      }).setOrigin(0.5);
    }
  }

  enemyCollidesWithPlayer(player, enemy) {
    if (this.playerDead) return;
    enemy.destroy();
    if (!this.playerInvincible) {
      this.takePlayerDamage();
    }
    this.healthText.setText('Health: ' + this.playerHealth);
  
    if (this.playerHealth <= 0) {
      this.physics.pause();
      this.add.text(850, 600, 'Game Over\nPress R to Restart', {
        fontSize: '32px',
        fill: '#fff',
        align: 'center'
      }).setOrigin(0.5);
    }
  }

  heavyCollidesWithPlayer(player, heavy) {
    if (heavy.getData('invincible')) return;
    if (this.playerDead) return;
  
    const hp = heavy.getData('hp');
  
    if (hp > 1) {
      heavy.setData('hp', hp - 1);
    } else {
      heavy.setData('hp', 1); // never kill from collision
    }
  
    heavy.setData('invincible', true);
    // heavy.setAlpha(0.5); // Optional visual cue
  
    this.time.delayedCall(1000, () => {
      if (heavy.active) {
        heavy.setData('invincible', false);
        heavy.setAlpha(1);
      }
    });
  
    if (!this.playerInvincible) {
      this.takePlayerDamage();
      this.sound.play('enemyExplosion');
    }
  }
  

  takePlayerDamage() {
    if (this.playerDead) return;
    this.playerHealth--;
    this.healthText.setText('Health: ' + this.playerHealth);
  
    this.playerInvincible = true;
    this.player.setAlpha(0.5); // visual indicator
  
    this.time.delayedCall(1000, () => {
      this.playerInvincible = false;
      this.player.setAlpha(1);
    });

    this.sound.play('playerExplosion', {
      volume: 0.5,
      rate: 5 // Faster and higher-pitched for hit effect
    });
  
    if (this.playerHealth <= 0) {
      this.playExplosion(this.player.x, this.player.y, 1.5);

      this.sound.play('playerExplosion'); 
      this.player.setVisible(false);
      this.playerDead = true;
      this.physics.pause();
      this.player.setAlpha(1);

      if (this.bgMusic) {
        this.tweens.add({
          targets: this.bgMusic,
          volume: 0,
          duration: 1000,
          onComplete: () => this.bgMusic.pause()
        });
      }

      this.add.text(850, 600, 'Game Over\nPress R to Restart', {
        fontSize: '32px',
        fill: '#fff',
        align: 'center'
      }).setOrigin(0.5);
    }
  }
  
  

  startNextWave() {
    this.waveNumber++;
    this.waveEnemyCount = 15 + (this.waveNumber - 1) * 5;
    this.enemiesRemaining = this.waveEnemyCount;
  
    // === delay reinforcements ===
    this.initialWaveSpawnDone = false;
    this.wavePhaseEnemiesSpawned = 0;
    this.wavePhaseEnemiesDefeated = 0;
  
    // === reset heavy spawn count AFTER delaying ===
    this.heavyEnemyMax = 3 + Math.floor((this.waveNumber - 1) / 2);
    this.heavyEnemiesSpawned = this.heavyEnemyMax; // 🚫 temporarily block spawning
  
    if (this.reinforcementText) {
      this.reinforcementText.destroy();
      this.reinforcementText = null;
    }
  
    this.showWaveMessage();
  
    //  allow heavies to spawn AFTER reinforcements unlocked
    this.time.delayedCall(100, () => {
      this.heavyEnemiesSpawned = 0;
    });
  }
  
  
  
  showWaveMessage() {
    const text = this.add.text(this.scale.width / 2, 100, `Wave ${this.waveNumber}`, {
      fontSize: '64px',
      fill: '#fff'
    }).setOrigin(0.5);
  
    this.time.delayedCall(2000, () => text.destroy());
  }
  

}