var GAME = new (function() {

	if (LOADED === true) return;
	
	// Globals
	this.mobId = 0;
	var Mobs = [];

	$(document).ready(function() {
		Mobs.push(new Zombie(Paths[0]), new Zombie(Paths[1]));
	});

	this.testPath = function(path) {
		Mobs.push(new Zombie(path));
	}

	// Handles user interactions
	var Controls = new (function() {
		this.keyDown = {
			up: false,
			down: false,
			left: false,
			right: false
		}
		this.init = function() {
			$('.world .actionbar').click(function(e) {
				e.stopPropagation();
			});
			$(document).bind('keydown', function(e) {
				if (Moves.Casting && e.keyCode != 49) {
					Errors.add("Interrupted!");
					Moves.Cancel();
				}
				if(e.keyCode == 37 || e.keyCode == 65) {
					Controls.keyDown.left = true;
					Animate.Sprites.facing = "left";
				} else if(e.keyCode == 38 || e.keyCode == 87) {
					Controls.keyDown.up = true;
				} else if(e.keyCode == 39 || e.keyCode == 68) {
					Controls.keyDown.right = true;
					Animate.Sprites.facing = "right";
				} else if(e.keyCode == 40 || e.keyCode == 83) {
					Controls.keyDown.down = true;
				} else if(e.keyCode == 49) {
					$('.world .actionbar a.fire').addClass('active');
					if (!Moves.Casting) Moves.Flame.start();
				} else if(e.keyCode == 50) {
					$('.world .actionbar a.freeze').addClass('active');
					if (!Moves.Casting) Moves.Freeze.start();
				} else if(e.keyCode == 27) {
					if (Dude.target !== false) Mobs[Dude.target].resetTarget();
				}
				if (Controls.keyDown.up || Controls.keyDown.down || Controls.keyDown.right || Controls.keyDown.left || e.keyCode == 49) {
					Dude.clickMoving = false;
					Dude.resetCssData();
				}
				if (Animate.Sprites.facing == 'left') $('.dude').addClass('facingLeft');
				else $('.dude').removeClass('facingLeft');
			});
			$(document).bind('keyup', function(e) {
				if(e.keyCode == 37 || e.keyCode == 65) {
					Controls.keyDown.left = false;
				} else if(e.keyCode == 38 || e.keyCode == 87) {
					Controls.keyDown.up = false;
				} else if(e.keyCode == 39 || e.keyCode == 68) {
					Controls.keyDown.right = false;
				} else if(e.keyCode == 40 || e.keyCode == 83) {
					Controls.keyDown.down = false;
				} else if(e.keyCode == 49) {
					$('.world .actionbar a.fire').removeClass('active');
				} else if(e.keyCode == 50) {
					$('.world .actionbar a.freeze').removeClass('active');
				}
			});
			$('.world').bind('contextmenu', function() {return false;});
			$('.world').bind('mousedown', function(e) {
				if (e.which === 3 && e.target.className == "buildings") {
					if (Moves.Casting) {
						Errors.add("Interrupted!");
						Moves.Cancel();
					}
					Dude.clickMoving = true;
					var offsetX = e.pageX - parseInt($('.world').css('left'));
					var offsetY = e.pageY - parseInt($('.world').css('top'));
					var clickLeft = offsetX - 30;
					var clickTop = offsetY - 40;
					var horizontalDistance = parseInt($('.dude').css('left')) - clickLeft;
					var verticalDistance = parseInt($('.dude').css('top')) - clickTop;
					if (horizontalDistance < 0) {
						Dude.moving = "right";
						Animate.Sprites.facing = "right";
					} else if (horizontalDistance > 0) {
						Dude.moving = "left";
						Animate.Sprites.facing = "left";
					} else if (verticalDistance > 0) {
						Dude.moving = "up";
					} else {
						Dude.moving = "down";
					}
					horizontalDistance = Math.abs(horizontalDistance);
					verticalDistance = Math.abs(verticalDistance);
					var distance = Math.sqrt(horizontalDistance*horizontalDistance + verticalDistance*verticalDistance);
					$('.dude').stop(true,false).animate({'left':clickLeft, 'top':clickTop}, distance*13, 'linear', function() {
						Dude.clickMoving = false;
						Dude.resetCssData();
					});
					$('.world .clickarrows').show().css({'left':offsetX-12, 'top':offsetY-15});;
					setTimeout(function() {
						$('.world .clickarrows').css({'backgroundPosition':'-25px 0px'});
					}, 750);
					setTimeout(function() {
						$('.world .clickarrows').css({'backgroundPosition':'-50px 0px'});
					}, 150);
					setTimeout(function() {
						$('.world .clickarrows').css({'backgroundPosition':'0px 0px'}).hide();
					}, 225);
				}
			});
			$('.actionbar a').bind('mousedown', function() {
				var id = $('.actionbar a').index($(this));
				if (id === 0) {
					if (!Moves.Casting) Moves.Flame.start();
				} else if (id === 1) {
					if (!Moves.Casting) Moves.Freeze.start();
				}
			});
		}
		$(document).ready(this.init);
	});

	// Mob class for zombies
	var Zombie = function(path) {
		var self = this;
		this.health = 100;
		this.Path = path;
		this.inCombat = false;
		this.pathId = 0;
		this.pathTimeout = {};
		this.pathSpeed = 4500;
		this.pathDelay = 5000;
		this.id = GAME.mobId++;
		this.addToField = function() {
			var html = "\
				<div class='zombie' id='"+self.id+"'>\
					<div class='character_highlight'></div>\
					<div class='body'>\
						<div class='flame'></div>\
						<div class='freeze'></div>\
					</div>\
					<div class='nametag'>\
						<p>Zombie</p>\
						<div class='health'><div class='percent'></div><div class='amount'>"+self.health+"</div></div>\
					</div>\
				</div>\
			";
			$('.dude').after(html);
		}
		this.nextPath = function(time) {
			if (self.health <= 0) return;
			if (self.inCombat) {
				var zombieLeft = parseInt($('.zombie#'+self.id).css('left'));
				var zombieTop = parseInt($('.zombie#'+self.id).css('top'));
				var dudeLeft = parseInt($('.dude').css('left'));
				var dudeTop = parseInt($('.dude').css('top'));
				var triggerDistance = 5;
				var finishDistance = 0;
				$('.zombie#'+self.id+' .body').attr({'data-face':"0"});
				if (zombieTop < dudeTop - triggerDistance) {
					var top = dudeTop - finishDistance;
					$('.zombie#'+self.id+' .body').attr({'data-face':"up"});
				} else if (zombieTop > dudeTop + triggerDistance) {
					var top = dudeTop + finishDistance;
					$('.zombie#'+self.id+' .body').attr({'data-face':"down"});
				} else {
					var top = zombieTop;
				}
				if (zombieLeft < dudeLeft - triggerDistance) {
					var left = dudeLeft - finishDistance;
					$('.zombie#'+self.id+' .body').attr({'data-face':"right"});
				} else if (zombieLeft > dudeLeft + triggerDistance) {
					var left = dudeLeft + finishDistance;
					$('.zombie#'+self.id+' .body').attr({'data-face':"left"});
				} else {
					var left = zombieLeft;
				}
				var distance = Math.sqrt(Math.abs(zombieLeft - dudeLeft) * Math.abs(zombieLeft - dudeLeft) + Math.abs(zombieTop - dudeTop) * Math.abs(zombieTop - dudeTop));
				time = distance*20;
				if (left != zombieLeft || top != zombieTop) {
					$('.zombie#'+self.id+'').stop(true,false).animate({'left':left, 'top':top}, time, 'linear');
				}
				if (distance < 50) Dude.getAttacked(10, self.id);
				if (time < 200) time = 200;
			} else {
				if (!(time >= 0)) time = self.pathSpeed;
				$('.zombie#'+self.id+'').stop(true, false).animate({'left':self.Path[self.pathId].x, 'top':self.Path[self.pathId].y}, 
					time, "linear", function() {
						$('.zombie#'+self.id+' .body').attr({'data-face':"0"});
					});
				$('.zombie#'+self.id+' .body').attr({'data-face':self.Path[self.pathId].face});
				self.pathId++; if(self.pathId >= self.Path.length) self.pathId = 0;
				if (time > 0) time += self.pathDelay;
			}
			clearTimeout(self.pathTimeout);
			self.pathTimeout = setTimeout(self.nextPath, time);
		}
		this.getAttacked = function(amount) {
			self.inCombat = true;
			if (self.health <= 0) return;
			self.health -= amount;
			if (self.health <= 0) {
				self.health = 0;
				Errors.add("Zombie dies!");
				$('.zombie#'+self.id+'').stop(true,false).delay(500).animate({'opacity':0}, 1500, function() {
					$(this).hide();
				});
				var id = "corpseId" + Arena.corpseId++;
				$('.zombie#'+self.id).after('<div class="corpse active" id="'+id+'"></div>');
				var left = parseInt($('.zombie#'+self.id).css('left')) + 18;
				var top = parseInt($('.zombie#'+self.id).css('top')) + 40;
				$('#'+id).css({'left':left, 'top':top, opacity: 0}).delay(500).animate({'opacity':1}, 1500).delay(90000).animate({'opacity':0}, 500, function() {$(this).remove();});
				$('#'+id).click(function() {
					$('.zombie#'+self.id).css({'opacity':1}).show();
					setTimeout(function() {$('.zombie#'+self.id).click();}, 75);
					self.inCombat = false;
					self.health = 100;
					$('.zombie#'+self.id+' .health .percent').stop(true,false).animate({'width':self.health}, 500);
					$('.zombie#'+self.id+' .health .amount').html(self.health);
					self.nextPath();
					$(this).stop(true,false).animate({'opacity':0}, 500, function() {$(this).remove();});
				});
			}
			$('.zombie#'+self.id+' .health .percent').stop(true,false).animate({'width':self.health}, 500);
			$('.zombie#'+self.id+' .health .amount').html(self.health);
		}
		this.init = function() {
			self.addToField();
			self.nextPath(0);
			$('.zombie#'+self.id+' .nametag').hide();
			$('.zombie#'+self.id+' .character_highlight').hide();
			$('.zombie#'+self.id+'').click(function(e) {
				e.stopPropagation();
				self.setTarget();
			});
			$(document).click(function() {
				self.resetTarget();
			})
		}
		this.setTarget = function() {
			self.resetTarget();
			Dude.target = self.id;
			$('.zombie#'+self.id+' .nametag').show();
			$('.zombie#'+self.id+' .character_highlight').show();
		}
		this.resetTarget = function() {
			Dude.target = false;
			$('.zombie .nametag').hide();
			$('.zombie .character_highlight').hide();
		}
		$(document).ready(this.init);
	}
	var Moves = new (function() {
		this.Casting = false;
		this.Flame = {
			time: 1500,
			start: function() {
				if (Dude.health <= 0) {
					Errors.add("You are dead!");
					return;
				}
				if (Dude.target === false) {
					Errors.add("You don't have a target!");
					return;
				}
				if (Mobs[Dude.target].health <= 0) {
					Errors.add("Your target is dead!");
					return;
				}
				if (Controls.keyDown.up || Controls.keyDown.down || Controls.keyDown.right || Controls.keyDown.left) {
					Errors.add("You cannot cast while moving!");
					return;
				}
				if (Arena.getDistance($('.dude'), $('.zombie#'+Dude.target)) > 450) {
					Errors.add("Target too far away!");
					return;
				}
				$('.dude .flame').show();
				$('.world .castbar').show();
				Moves.Casting = true;
				$('.world .castbar .percent').stop(true,false).css({'width':0}).animate({'width':250}, 2000, 'linear', function() {
					Moves.Cancel();
					var left = $('.dude').offset().left - $('.zombie#'+Dude.target).offset().left;
					var top = $('.dude').offset().top - $('.zombie#'+Dude.target).offset().top;
					$('.zombie#'+Dude.target+' .flame').stop(true,false).show().css({'top': top, 'left': left}).animate({'top': 0, 'left': 10}, 700, 'linear', function() {
						$(this).hide();
						Mobs[Dude.target].getAttacked(25);
						Mobs[Dude.target].nextPath();
					});
				});
			}
		}
		this.Freeze = {
			time: 0,
			duration: 4000,
			cooldown: 24000,
			onCooldown: false,
			start: function() {
				if (Moves.Freeze.onCooldown) {
					Errors.add("That move is still on cooldown");
					return;
				}
				Moves.Freeze.onCooldown = true; setTimeout(function() {Moves.Freeze.onCooldown = false;}, Moves.Freeze.cooldown);
				if (Dude.health <= 0) {
					Errors.add("You are dead!");
					return;
				}
				for (var i = 0; typeof Mobs[i] == 'object'; i++) {
					var mob = $('.zombie#'+Mobs[i].id);
					if (Arena.getDistance(mob, $('.dude')) < 400 && Mobs[i].health > 0) {
						mob.find('.freeze').show();
						setTimeout(function(mob) {
							mob.find('.freeze').hide();
						}, Moves.Freeze.duration, mob);
						if (Dude.target === false) {
							Mobs[i].setTarget();
						}
						mob.stop(true,false);
						//var time = mob.pathSpeed + mob.pathDelay;
						clearTimeout(Mobs[i].pathTimeout);
						Mobs[i].pathTimeout = setTimeout(Mobs[i].nextPath, Moves.Freeze.duration);
						mob.find('.body').attr({'data-face':"0"});
						Mobs[i].getAttacked(10);
					}
				}
				$('.dude .freeze').show();
				Animate.Sprites.freezePos = 1;
				Animate.Sprites.runFreezeSprite($('.dude'));
			}
		}
		this.Cancel = function() {
			Moves.Casting = false;
			$('.dude .flame').hide();
			$('.world .castbar .percent').stop(true,false).css({'width':0});
			$('.world .castbar').hide();
		}
	});
	var Errors = new (function() {
		var idCounter = 0;
		this.add = function(msg) {
			var id = 'errorMsg'+idCounter;
			$('.world .errormsg').prepend('<p id="'+id+'">'+msg+'</p>');
			$('.world .errormsg #'+id).delay(2000).animate({'opacity':0}, 500, function() {$(this).remove();});
		}
	});
	var Arena = new (function() {
		this.getDistance = function(first, second) {
			var firstLeft = parseInt(first.css('left'));
			var firstTop = parseInt(first.css('top'));
			var secondLeft = parseInt(second.css('left'));
			var secondTop = parseInt(second.css('top'));
			return Math.sqrt(Math.abs(firstLeft - secondLeft) * Math.abs(firstLeft - secondLeft) + Math.abs(firstTop - secondTop) * Math.abs(firstTop - secondTop));
		}
		this.corpseId = 0;
		this.Window = {
			width: false,
			height: false
		}
		this.World = {
			width: false,
			height: false,
			startLeft: 0,
			startTop: false
		}
		this.Dude = {
			width: false,
			height: false,
			startLeft: 570,
			startTop: false
		}
		this.init = function() {
			var world = $('.world');
			var dude = $('.dude');
			Arena.Window.width = parseInt($(window).width());
			Arena.Window.height = parseInt($(window).height());
			Arena.World.width = parseInt(world.width());
			Arena.World.height = parseInt(world.height());
			Arena.Dude.width = parseInt(dude.width());
			Arena.Dude.height = parseInt(dude.height());
			Arena.World.startLeft = (Arena.World.startLeft === 0 || Arena.World.startLeft > 0) ? Arena.World.startLeft : -(Arena.World.width-Arena.Window.width)/2;
			Arena.World.startTop = (Arena.World.startTop === 0 || Arena.World.startTop > 0) ? Arena.World.startTop : -(Arena.World.height-Arena.Window.height)/2;
			Arena.Dude.startLeft = (Arena.Dude.startLeft === 0 || Arena.Dude.startLeft > 0) ? Arena.Dude.startLeft : (Arena.World.width-Arena.Dude.width)/2;
			Arena.Dude.startTop = (Arena.Dude.startTop === 0 || Arena.Dude.startTop > 0) ? Arena.Dude.startTop : (Arena.World.height-Arena.Dude.height)/2;
			world.data({left: Arena.World.startLeft, top: Arena.World.startTop}).css({left: Arena.World.startLeft, top: Arena.World.startTop});
			dude.data({left: Arena.Dude.startLeft, top: Arena.Dude.startTop}).css({left: Arena.Dude.startLeft, top: Arena.Dude.startTop});
			for (var i = 0; typeof Buildings[i] == 'object'; i++) {
				var ele = $("<img src='img/building.png' />").css({left:Buildings[i].left, top:Buildings[i].top, width:Buildings[i].width, height:Buildings[i].height})
				$('.world .buildings').append(ele);
			}
		}
		this.resize = function() {
			Arena.Window.width = parseInt($(window).width());
			Arena.Window.height = parseInt($(window).height());
		}
		$(window).resize(this.resize);
		$(document).ready(this.init);
	});
	var Dude = new (function() {
		this.target = false;
		this.health = 100;
		this.moving = false;
		this.getAttacked = function(amount, from) {
			Dude.health -= amount;
			if (Dude.health <= 0) {
				Dude.health = 0;
				if (Moves.Casting) Moves.Cancel();
				Errors.add("You died!");
				$('.dude').stop(true,false).animate({'opacity':0.5}, 1500);
				var id = "corpseId" + Arena.corpseId++;
				$('.dude').after('<div class="corpse active" id="'+id+'"></div>');
				var left = parseInt($('.dude').css('left')) + 18;
				var top = parseInt($('.dude').css('top')) + 40;
				$('#'+id).css({'left':left, 'top':top, opacity: 0}).delay(500).animate({'opacity':1}, 500).delay(90000).animate({'opacity':0}, 500, function() {$(this).remove();});
				$('#'+id).click(function() {
					Dude.health = 100;
					$('.dude .health .percent').stop(true,false).animate({'width':Dude.health}, 500);
					$('.dude .health .amount').html(Dude.health);
					$('.dude').stop(true,false).animate({'opacity':1}, 500);
					$(this).stop(true,false).animate({'opacity':0}, 500, function() {$(this).remove();});
				});
				Mobs[from].inCombat = false;
				Mobs[from].nextPath();
			}
			$('.dude .health .percent').stop(true,false).animate({'width':Dude.health}, 500);
			$('.dude .health .amount').html(Dude.health);
		}
		this.resetCssData = function() {
			var left = parseInt($('.dude').css('left'));
			var top = parseInt($('.dude').css('top'));
			$('.dude').data({left:left, top:top});
		}
	});
	var Animate = new (function() {
		this.Settings = {
			Speed : 12
		}
		this.Sprites = {
			leftPos: 1,
			flamePos: 1,
			freezePos: 1,
			speed: 150,
			timeout: {},
			facing: "right",
			nums: [
				"One",
				"Two",
				"Three",
				"Four"
			],
			nextSprite: function() {
				var backgroundPosition = (Animate.Sprites.facing == "right" ? "0" : "-20") + "px 0px";
				var dude = $('.dude .body');
				dude.css({'backgroundPosition':backgroundPosition});

				if (Controls.keyDown.right && !Controls.keyDown.left || (Dude.clickMoving && Dude.moving == "right")) Animate.Sprites.runRightSprite(dude);
				else if (Controls.keyDown.left && !Controls.keyDown.right || (Dude.clickMoving && Dude.moving == "left")) Animate.Sprites.runLeftSprite(dude);
				else if (Controls.keyDown.up || Controls.keyDown.down && !Controls.keyDown.left && !Controls.keyDown.right || (Dude.clickMoving && (Dude.moving == "up" || Dude.moving == "down"))) Animate.Sprites.runUpSprite(dude);

				Animate.Sprites.runFlameSprite($('.world'));
				Animate.Sprites.flamePos += 1; if (Animate.Sprites.flamePos > 3) Animate.Sprites.flamePos = 1;

				for (var id = 0; id < $('.zombie').length; id++) {
					var zombie = $('.zombie#'+id+' .body');
					var facing = zombie.attr('data-face');
					backgroundPosition = (true || facing == "right" ? "0" : "-20") + "px 0px";
					zombie.css({'backgroundPosition':backgroundPosition});
					if (facing == "right") Animate.Sprites.runRightSprite(zombie);
					else if (facing == "left") Animate.Sprites.runLeftSprite(zombie);
					else if (facing == "up" || facing == "down") Animate.Sprites.runUpSprite(zombie);
				}

				Animate.Sprites.leftPos += 1; if (Animate.Sprites.leftPos > 4) Animate.Sprites.leftPos = 1;
				clearTimeout(Animate.Sprites.timeout);
				Animate.Sprites.timeout = setTimeout(Animate.Sprites.nextSprite, Animate.Sprites.speed);
			},
			runRightSprite: function(ele) {
				var backgroundPosition = (Animate.Sprites.leftPos - 1) * 20;
				backgroundPosition = "-" + backgroundPosition + "px -35px";
				ele.css({'backgroundPosition':backgroundPosition});
			},
			runLeftSprite: function(ele) {
				var backgroundPosition = (Animate.Sprites.leftPos - 1) * 20;
				backgroundPosition = "-" + backgroundPosition + "px -70px";
				ele.css({'backgroundPosition':backgroundPosition});
			},
			runUpSprite: function(ele) {
				var backgroundPosition = (Animate.Sprites.leftPos - 1) * 20;
				backgroundPosition = "-" + backgroundPosition + "px -105px";
				ele.css({'backgroundPosition':backgroundPosition});
			},
			runFlameSprite: function(ele) {
				var backgroundPosition = (Animate.Sprites.flamePos - 1) * 20;
				backgroundPosition = "-" + backgroundPosition + "px 0px";
				ele.find('.flame').css({'backgroundPosition':backgroundPosition});
			},
			runFreezeSprite: function(ele) {
				var backgroundPosition = (Animate.Sprites.freezePos - 1) * 400;
				backgroundPosition = "-" + backgroundPosition + "px 0px";
				ele.find('.freeze').css({'backgroundPosition':backgroundPosition});
				Animate.Sprites.freezePos += 1;
				if (Animate.Sprites.freezePos > 4) {
					Animate.Sprites.freezePos = 1;
					$('.dude .freeze').hide();
				} else {
					setTimeout(function() {
						Animate.Sprites.runFreezeSprite(ele);
					}, 115);
				}
			},
			init: function() {
				this.nextSprite();
			}
		}
		this.clickMoving = false;
		this.exectimeout = {};
		this.exec = function() {

			clearTimeout(Animate.exectimeout);
			Animate.exectimeout = setTimeout(function() {Animate.exec();}, 150);

			if (Dude.clickMoving) Dude.resetCssData();

			var dude = $('.dude');
			var world = $('.world');
			var dudeTop = parseInt(dude.data('top'));
			var dudeLeft = parseInt(dude.data('left'));
			var worldTop = parseInt(world.data('top'));
			var worldLeft = parseInt(world.data('left'));

			var middleTop = dudeTop-(Arena.Window.height-Arena.Dude.height)/2;
			var middleLeft = dudeLeft-(Arena.Window.width-Arena.Dude.width)/2;

			if(Controls.keyDown.up) {
				var speed = (Controls.keyDown.left || Controls.keyDown.right) ? Animate.Settings.Speed * 0.7 : Animate.Settings.Speed;
				dudeTop -= speed;
			}
			if(Controls.keyDown.down) {
				var speed = (Controls.keyDown.left || Controls.keyDown.right) ? Animate.Settings.Speed * 0.7 : Animate.Settings.Speed;
				dudeTop += Animate.Settings.Speed;
			}
			if(Controls.keyDown.left) {
				var speed = (Controls.keyDown.up || Controls.keyDown.down) ? Animate.Settings.Speed * 0.7 : Animate.Settings.Speed;
				dudeLeft -= speed;
			}
			if(Controls.keyDown.right) {
				var speed = (Controls.keyDown.up || Controls.keyDown.down) ? Animate.Settings.Speed * 0.7 : Animate.Settings.Speed;
				dudeLeft += speed;
			}
			worldTop = (0-dudeTop) + (Arena.Window.height / 2) - 50;
			worldLeft = (0-dudeLeft) + (Arena.Window.width / 2) - 25;

			if(dudeTop < 0) {dudeTop = 0;}
			if(dudeTop > Arena.World.height - Arena.Dude.height) {dudeTop = Arena.World.height - Arena.Dude.height;}
			if(dudeLeft < 0) {dudeLeft = 0;}
			if(dudeLeft > Arena.World.width - Arena.Dude.width) {dudeLeft = Arena.World.width - Arena.Dude.width;}

			if(worldTop > 0) {worldTop = 0;}
			if(worldTop < -Arena.World.height + Arena.Window.height) {worldTop = (Arena.World.height > Arena.Window.height) ? -Arena.World.height + Arena.Window.height : (Arena.Window.height - Arena.World.height)/2;}
			if(worldLeft > 0) {worldLeft = 0;}
			if(worldLeft < -Arena.World.width + Arena.Window.width) {worldLeft = (Arena.World.width > Arena.Window.width) ? -Arena.World.width + Arena.Window.width : (Arena.Window.width - Arena.World.width)/2;}

			for (var i = 0; typeof Buildings[i] == 'object'; i++) {

				// var ele = $("<img src='img/building.png' />").css({left:Buildings[i].left, top:Buildings[i].top, width:Buildings[i].width, height:Buildings[i].height})
				// $('.world .buildings').append(ele);
			}

			if (!Dude.clickMoving) dude.stop(true,false).data({left:dudeLeft, top:dudeTop}).animate({left:dudeLeft, top:dudeTop}, 200);
			world.stop(true,false).data({left:worldLeft, top:worldTop}).animate({left:worldLeft, top:worldTop}, 200);
		}
		this.init = function() {
			Animate.exec();
			Animate.Sprites.init();
		}
		$(document).ready(this.init);
	});

	var Buildings = [
		{
			left: 853,
			top: 567,
			width: 680,
			height: 488
		},
		{
			left: 853,
			top: 1374,
			width: 680,
			height: 441
		},
		{
			left: 2018,
			top: 567,
			width: 533,
			height: 488
		},
		{
			left: 2018,
			top: 1374,
			width: 533,
			height: 441
		}
	];

	var Paths = [
		[
			{x: 225, y: 460, face: "left"},
			{x: 60, y: 540, face: "left"},
			{x: 60, y: 820, face: "down"},
			{x: 240, y: 980, face: "right"},
			{x: 150, y: 1035, face: "left"},
			{x: 355, y: 1130, face: "right"},
			{x: 330, y: 725, face: "up"}
		],
		[
			{x: 225, y: 1060, face: "left"},
			{x: 60, y: 1140, face: "left"},
			{x: 60, y: 1420, face: "down"},
			{x: 240, y: 1580, face: "right"},
			{x: 150, y: 1635, face: "left"},
			{x: 355, y: 1730, face: "right"},
			{x: 330, y: 1325, face: "up"}
		]
	];

})();

var LOADED = true;