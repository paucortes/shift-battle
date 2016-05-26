/* global Eureca, Phaser */


var myId=0;

var map;
var layer;

var localPlayerSprite;
var localPlayer;
var playersList;
// var explosions;

var speed = 5;

var ready = false;
var eurecaServer;

var keys;

var healthView;

function updatePlayerState(id, state)
	{
		
		if (playersList[id] && id != myId)  {

			playersList[id].cursor = state;
			playersList[id].playerSprite.x = state.x;
			playersList[id].playerSprite.y = state.y;
			playersList[id].playerSprite.angle = state.angle;
			playersList[id].playerSprite.rotation = state.rot;
			
			playersList[id].update();
		}
	}


//this function will handle client communication with the server
var eurecaClientSetup = function() {
	//create an instance of eureca.io client
	var eurecaClient = new Eureca.Client();
	
	eurecaClient.ready(function (proxy) {		
		eurecaServer = proxy;
	});
	
	//methods defined under "exports" namespace become available in the server side
	
	eurecaClient.exports.setId = function(id) 
	{
		//create() is moved here to make sure nothing is created before uniq id assignation
		myId = id;
		create();
		eurecaServer.handshake(myId);
		ready = true;
	};

	
	eurecaClient.exports.kill = function(id)
	{	
		
		
		if (playersList[id]) {
			playersList[id].destroy();
			console.log('Removing ', id, playersList[id], " from the game");
		}
	};
	
	eurecaClient.exports.spawnEnemy = function(i, x, y)
	{

		if (i === myId) return; //this is me
		
		console.log('SPAWN', i);
		var plyr = new Player(i, game, localPlayerSprite, x, y);
		playersList[i] = plyr;
		plyr.update();

	};
	
	// eurecaClient.exports.updateState = function(id, state, playerAlive)
	eurecaClient.exports.updateState = updatePlayerState;
};


function Player(index, game, user, x, y) {
	this.cursor = {
		left:false,
		right:false,
		up:false,
		fire:false,
		down: false,
		alive: true,
		visible: true,
		exists: true
	};

    // var x = 0;
    // var y = 0;

    this.game = game;
    this.health = 5;
    this.user = user;
    this.bullets = game.add.group();
    this.bullets.enableBody = true;
    this.bullets.physicsBodyType = Phaser.Physics.ARCADE;
    
    // create 20-30 bullets per clip, maybe carry 4-5 clips and then have a reload function added
    this.bullets.createMultiple(200, 'bullet', 0, false);
    
    // anchoring for the small bullet
    // this.bullets.setAll('anchor.x', -15);
    // this.bullets.setAll('anchor.y', -2);
    
    // anchoring for the large bullet
    // this.bullets.setAll('anchor.x', -3.2);
    // this.bullets.setAll('anchor.y', -0.4);
    
    this.bullets.setAll('anchor.x', 0);
    this.bullets.setAll('anchor.y', -0.3);
    
    this.bullets.setAll('outOfBoundsKill', true);
    this.bullets.setAll('checkWorldBounds', true);
	
	// this should be set to 500 for normal gameplay, 100 for 'Codrin' gameplay
    this.fireRate = 1;
    this.nextFire = 100;
    this.alive = true;
	
	
    this.playerSprite = game.add.sprite(x || 0, y || 0, 'player');
    

    this.playerSprite.anchor.set(0.5);
    
    this.playerSprite.animations.add('move', [0], 20, false);
  	this.playerSprite.animations.add('attack', [1, 2, 3], 10, false);

    // this.playerSprite.addChild(game.add.sprite(-15, 10, 'hitbox'));

    this.playerSprite.id = index;
    game.physics.enable(this.playerSprite, Phaser.Physics.ARCADE);
    this.playerSprite.body.setSize(30, 30);
    this.playerSprite.body.immovable = false;
    this.playerSprite.body.collideWorldBounds = true;
    this.playerSprite.body.bounce.setTo(0, 0);
    
    this.playerSprite.angle = 0;
}


Player.prototype.update = function() {
	
	//cursor value is now updated by eurecaClient.exports.updateState method
	
	
	if (this.cursor.left) {
		if (this.cursor.up) {
			this.playerSprite.body.x -= speed;
			this.playerSprite.body.y -= speed;
			this.playerSprite.animations.play('move');
		}
		else if (this.cursor.down) {
			this.playerSprite.body.x -= speed;
			this.playerSprite.body.y += speed;
			this.playerSprite.animations.play('move');
		}
		else {
			this.playerSprite.body.x -= speed;
			this.playerSprite.animations.play('move');
		}
	}
	else if (this.cursor.right) {
		if (this.cursor.up) {
			this.playerSprite.body.x += speed;
			this.playerSprite.body.y -= speed;
			this.playerSprite.animations.play('move');
		}
		else if (this.cursor.down) {
			this.playerSprite.body.x += speed;
			this.playerSprite.body.y += speed;
			this.playerSprite.animations.play('move');
		}
		else {
			this.playerSprite.body.x += speed;
			this.playerSprite.animations.play('move');
		}
	}
	else if (this.cursor.up) {
			this.playerSprite.body.y -= speed;
			this.playerSprite.animations.play('move');
	}
	else if (this.cursor.down) {
		this.playerSprite.body.y += speed;
		this.playerSprite.animations.play('move');
	}
	 if (this.cursor.fire) {
		this.fire({
			x: this.cursor.tx,
			y: this.cursor.ty
		});
		this.playerSprite.animations.play('attack');
	}
	
};

Player.prototype.fire = function(target) {
		if (!this.playerSprite.alive) return;
        if (this.game.time.now > this.nextFire && this.bullets.countDead() > 0)
        {
            this.nextFire = this.game.time.now + this.fireRate;
            var bullet = this.bullets.getFirstDead();
            bullet.reset((this.playerSprite.x + (73*Math.cos(this.playerSprite.rotation))), (this.playerSprite.y + (73*Math.sin(this.playerSprite.rotation))), this.playerSprite.rotation);
			bullet.rotation = this.playerSprite.rotation;      
            game.physics.arcade.velocityFromRotation(this.playerSprite.rotation, 1000, bullet.body.velocity); 

        }
};

Player.prototype.damage = function(){
    console.log(this.playerSprite.id, " IS GETTING POUNDED BY ", localPlayerSprite.id);
    this.health--;

    if (this.health <= 0) {

        console.log(localPlayerSprite.id, " JUST KILLED ", this.playerSprite.id);
        console.log(this.playerSprite, " this is the playerSprite in the Player.prototype.damage function");
        
        this.death();
    }
};

Player.prototype.death = function() {
	var that= this;
	this.playerSprite.kill();
	
	eurecaServer.handleKeys({
		alive: false,
		exists: false,
		visible: false});
		
	setTimeout(function() {
		console.log("RESPAWN TIMEOUT FUNCTION")
		that.respawn();
	}, 5000);

};

Player.prototype.respawn = function() {
	console.log("RESPAWNING AFTER DEATH");
	this.playerSprite.reset(200, 200);
};

Player.prototype.destroy = function() {
	console.log("Destroying ", this);
	this.playerSprite.destroy();
};


var game = new Phaser.Game(1200, 800, Phaser.AUTO, 'phaser-example', { preload: preload, create: eurecaClientSetup, update: update, render: render });

function preload () {
    game.load.tilemap('simplemap', 'assets/simplemap.json', null, Phaser.Tilemap.TILED_JSON);
    game.load.image('desert64', 'assets/desert64.png');
    game.load.image('wall64', 'assets/wall64.png');

    game.load.spritesheet('player', 'assets/test_guy.png', 150, 150);
    game.load.spritesheet('enemy', 'assets/test_guy.png', 150, 150);
    game.load.image('earth', 'assets/scorched_earth.png');
    // game.load.spritesheet('kaboom', 'assets/explosion.png', 64, 64, 23);
    
    // small bullet. the anchoring is different for each bullet!
    // game.load.image('bullet', 'assets/bullet4.png');
    
    // large bullet. the anchoring is different for each bullet!
    game.load.image('bullet', 'assets/bullet2.png');
    game.load.image('hitbox', 'assets/93x16.png');
}



function create () {
	game.physics.startSystem(Phaser.Physics.ARCADE);
	map = game.add.tilemap('simplemap');
	layer = map.createLayer('Tile Layer 1');
	map.addTilesetImage('desert64', 'desert64');
	map.addTilesetImage('wall64', 'wall64');
	map.setCollision([2]);
	layer.resizeWorld();
	layer.bouncePadding = 0;
	map.fixedToCamera = true;

    
    playersList = {};
	
	localPlayer = new Player(myId, game, localPlayerSprite);
	playersList[myId] = localPlayer;
	localPlayerSprite = localPlayer.playerSprite;
	localPlayerSprite.x=0;
	localPlayerSprite.y=0;


    localPlayerSprite.bringToTop();

    game.camera.follow(localPlayerSprite);
    game.camera.deadzone = new Phaser.Rectangle(150, 150, 500, 300);
    game.camera.focusOnXY(0, 0);

	keys = { 
		up: game.input.keyboard.addKey(Phaser.Keyboard.W),
		down: game.input.keyboard.addKey(Phaser.Keyboard.S),
		left: game.input.keyboard.addKey(Phaser.Keyboard.A),
		right: game.input.keyboard.addKey(Phaser.Keyboard.D)
	};
	
}

function update () {
	//do not update if client not ready
	if (!ready) return;
	

	var input = {
		left: keys.left.isDown,
		right: keys.right.isDown,
		up: keys.up.isDown,
		down: keys.down.isDown,
		fire: game.input.activePointer.isDown,
		tx: game.input.x + game.camera.x,
		ty: game.input.y + game.camera.y
	};
	
	localPlayerSprite.rotation = game.physics.arcade.angleToPointer(localPlayerSprite);

	var inputChanged = (
		localPlayer.cursor.left != input.left ||
		localPlayer.cursor.right != input.right ||
		localPlayer.cursor.up != input.up ||
		localPlayer.cursor.down != input.down ||
		localPlayer.cursor.fire != input.fire ||
		localPlayer.cursor.rot != localPlayerSprite.rotation ||
		localPlayer.cursor.alive != localPlayer.alive
		
	);
	
	if (inputChanged){

		// send latest valid state to the server
		input.x = localPlayerSprite.x;
		input.y = localPlayerSprite.y;
		input.angle = localPlayerSprite.angle;
		input.rot = localPlayerSprite.rotation;

		eurecaServer.handleKeys(input);
		localPlayer.cursor = input;
	}
	
	
	// This loop checks who should be killed
    for (var i in playersList)
    {
        if (!playersList[i]) continue;
        var curBullets = playersList[i].bullets;
        var curPlayer = playersList[i].playerSprite;

        for (var j in playersList)
        {
            if (!playersList[j]) continue;
            if (j!=i) 
            {
            
                var targetPlayer = playersList[j].playerSprite;
                // game.physics.arcade.collide(player, playersList[i].player);
                game.physics.arcade.overlap(curBullets, targetPlayer, bulletHitPlayer, null, this);
                game.physics.arcade.collide(curBullets, layer, bulletHitWall, null, this);
            
            }
        }
    }
    
    // This loop updates all the players
    for (var i  in playersList) {
            if (playersList[i].alive)
            {
                playersList[i].update();
            }           
    }
    
    game.physics.arcade.collide(localPlayerSprite, layer);
    // game.physics.arcade.collide(localPlayerSprite.children[0], layer);
    
}

function bulletHitWall (bullet) {
    bullet.kill();
}

function bulletHitPlayer (player, bullet) {
    bullet.kill();
    playersList[player.id].damage();
    
}

function render () {
	// this.game.debug.spriteInfo(localPlayerSprite, 150, 150);
}
