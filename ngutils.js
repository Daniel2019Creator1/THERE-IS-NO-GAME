/* jshint esversion: 6 */
if (typeof(ngutils) === typeof(undefined)) {
	var ngutils = {};
	ngutils.blacked_out = false;

	(function($) {
		var www_root = PHP.get('www_root','/');
		var referrer = PHP.get('referrer',www_root);
		var login_container, notification_bar, notification_shim;
		var is_mobile = PHP.get('ismobile') ? true:false;

		ngutils.input = {
			lastX: null,
			lastY: null,
			getMouse: function(e) {
				var input = is_mobile ? e.originalEvent.touches[0] : e;
				if (!input) {
					return {x:this.lastX, y:this.lastY};
				}

				this.lastX = input.pageX;
				this.lastY = input.pageY;

				return {x:input.pageX, y:input.pageY};
			}
		};
		if (is_mobile) {
			ngutils.input.mouseDown = "touchstart";
			ngutils.input.mouseUp = "touchend";
			ngutils.input.mouseMove = "touchmove";
		} else {
			ngutils.input.mouseDown = "mousedown";
			ngutils.input.mouseUp = "mouseup";
			ngutils.input.mouseMove = "mousemove";
		}

		$(function() {

			login_container = $('#user_login_container');
			notification_bar = $('#notification-bar');
			notification_shim = $('#notification-shim');

			ngutils.media.smartscale.autodetect();
			ngutils.element.autoCondense();
			ngutils.initScrollFixColumn();
			ngutils.ieHacks();
			ngutils.grids.init();
			ngutils.media.smartload.autodetect();
			ngutils.forms.fakeSelect.autodetect();
			ngutils.forms.selectLinks.autodetect();
			ngutils.forms.selectAltLabels.autodetect();

			var noscroll = function(e) {
				if (ngutils.screen_lock) {
					e.preventDefault();
					return false;
				}
				return true;
			};

			$('#body-main').on('touchmove', noscroll);
			$('#notification-bar').on('touchmove', noscroll);
		});

		ngutils.ajaxOnClick = (event, link, complete_event, fail_event) => {
			event.preventDefault();
			let $link = $(link);

			if ($link.attr('data-confirm') && !confirm($link.attr('data-confirm'))) return;

			$.get($link.attr('href'), (result)=>{
				if (complete_event) ngutils.event.dispatch(complete_event, result);
			}).fail((result)=>{
				if (fail_event) ngutils.event.dispatch(fail_event, result);
			});
		};

		ngutils.onAjaxComplete = function() {
			setTimeout(function() {
				ngutils.media.smartscale.autodetect();
				ngutils.element.autoCondense();
				ngutils.media.smartload.autodetect();
				ngutils.forms.fakeSelect.autodetect();
				ngutils.forms.selectLinks.autodetect();
				ngutils.forms.selectAltLabels.autodetect();
			}, 3);
		};

		$(document).ajaxComplete(function() {
			ngutils.onAjaxComplete();
		});

		ngutils.screen_lock = false;

		ngutils.activeTasks = {

			increment: 0,
			tasks: {},
			$saving: null,

			activeTaskInterrupt: function(e) {
				for(var i in ngutils.activeTasks.tasks) {
					let message = ngutils.activeTasks.tasks[i].saving ? 'Your changes are still saving.\n\nAre you sure you want to leave?' : 'You have unsaved changes.\n\nAre you sure you want to leave the page?';
					e.returnValue = message;
					return message;
				}
			},

			checkTasks: function() {
				window.removeEventListener("beforeunload", ngutils.activeTasks.activeTaskInterrupt);

				let task = null;
				let saving = false;
				for(var i in ngutils.activeTasks.tasks) {
					task = ngutils.activeTasks.tasks[i];
					console.log(task);
					if (task.saving) saving = true;
				}
				if (task) {
					window.addEventListener("beforeunload", ngutils.activeTasks.activeTaskInterrupt);
				}
				if (saving) {
					if (!ngutils.activeTasks.$saving) {
						ngutils.activeTasks.$saving = $('#activetask-saving-msg');
					}
					ngutils.activeTasks.$saving.fadeIn();
				} else if (ngutils.activeTasks.$saving) {
					ngutils.activeTasks.$saving.fadeOut();
				}
			},

			addTask: function(saving, $element) {
				return new ngutils.activeTasks.task(saving, $element);
			},

			task: function(saving, $element) {
				let _this = this;
				ngutils.activeTasks.increment++;

				this.name = "task"+ngutils.activeTasks.increment;
				this.complete = false;

				this._saving = saving ? true:false;

				ngutils.activeTasks.tasks[this.name] = this;

				// detect if this task is attached to a blackout

				// if we have any form element passed, we can see if it's in a blackout
				if ($element) {
					console.log('Blackout from element');
					this.blackout = ngutils.blackout.getByChild($element);

				// otherwise, look to see if there is an open blackout
				} else {
					console.log('Blackout from lastlayer');
					this.blackout = ngutils.blackout.getTop();
				}
				console.log(this.blackout);

				this.completed = function() {
					delete ngutils.activeTasks.tasks[this.name];
					ngutils.activeTasks.checkTasks();

					_this.completed = function() {
						return false;
					};

					_this.complete = true;
					ngutils.event.dispatch(ngutils.event.taskCompleted, _this);
					return true;
				};

				ngutils.activeTasks.checkTasks();
				ngutils.event.dispatch(ngutils.event.taskStarted, this);
			},

			endTask: function(name) {
				if (ngutils.activeTasks.tasks[name]) ngutils.activeTasks.tasks[name].endTask();
			}
		};

		ngutils.activeTasks.task.prototype = {
			_saving: false,

			get saving() {
				return this._saving;
			},

			set saving(s) {
				this._saving = s ? true:false;
				ngutils.activeTasks.checkTasks();
			}
		};

		ngutils.slugify = (str)=>{
			str = str.replace(/^\s+|\s+$/g, '');
			str = str.toLowerCase();

			var from = "ÁÄÂÀÃÅČÇĆĎÉĚËÈÊẼĔȆÍÌÎÏŇÑÓÖÒÔÕØŘŔŠŤÚŮÜÙÛÝŸŽáäâàãåčçćďéěëèêẽĕȇíìîïňñóöòôõøðřŕšťúůüùûýÿžþÞĐđßÆa·/_,:;";
			var to   = "AAAAAACCCDEEEEEEEEIIIINNOOOOOORRSTUUUUUYYZaaaaaacccdeeeeeeeeiiiinnooooooorrstuuuuuyyzbBDdBAa------";

			for (var i=0, l=from.length ; i<l ; i++) {
				str = str.replace(new RegExp(from.charAt(i), 'g'), to.charAt(i));
			}

			str = str.replace(/[^a-z0-9 -]/g, '').replace(/\s+/g, '-').replace(/-+/g, '-');
			return str;
		};

		ngutils.event = {
			resize: 'resize',
			closeall: 'closeall',
			closeMenus: 'closeMenus',
			newNotifications: 'newNotifications',
			topMenuOpen: 'topMenuOpen',
			userBlockUpdated: 'user-block-updated',
			userBlocksUpdated: 'user-blocks-updated',
			emoteSetChanged: 'emote-set-changed',
			emoteSelectLoaded: 'emote-select-loaded',
			tagsUpdated: 'tag-collection-updated',
			taskStarted: 'task-started',
			taskCompleted: 'task-completed',
			blackoutClosed: 'blackout-closed',

			listeners: [],

			addListener: function(event, listener) {
				if (typeof(ngutils.event.listeners[event]) === typeof(undefined)) ngutils.event.listeners[event] = [];
				ngutils.event.listeners[event].unshift(listener);
			},

			removeListener: function(event, listener) {
				if (typeof(ngutils.event.listeners[event]) === typeof(undefined)) return;
				var index = ngutils.event.listeners[event].indexOf(listener);
				if (index >= 0) ngutils.event.listeners[event].splice(index,1);
			},

			removeAll: function(event) {
				if (typeof(ngutils.event.listeners[event]) === typeof(undefined)) return;
				ngutils.event.listeners[event] = [];
			},

			dispatch: function(event, data) {
				var i;

				if (typeof(ngutils.event.listeners[event]) === typeof(undefined)) return;

				// just in case listeners are removed when executed, we want a copy of the array to maintain it's length, etc...
				var queue = ngutils.event.listeners[event].slice(0);
				for(i=0; i < queue.length; i++) {
					if (queue[i](data) === false) return;
				}

				return true;
			}
		};

		$(function() {
			setTimeout(function() {
				$( window ).resize(function() {
					ngutils.event.dispatch(ngutils.event.resize);
				});

				var selector = is_mobile ? '#body-main':'body';
				$(selector).click(function() {
					ngutils.event.dispatch(ngutils.event.closeall);
				});

				var scrollTop = $(window).scrollTop();
				var nb_dir =  1;
				var nb = $('#notification-bar');
				nb.css('position','absolute').css('top','0px');
				var to;

				var nb_height = nb.outerHeight();

				function showNotificationBar(force, skip_animation) {
					var st = $(window).scrollTop();
					nb_dir = 0;

					if (force === true || st > 200) {
						if (!skip_animation) {
							nb.css('position','fixed').css('top',"-"+nb_height+"px");
							nb.animate({top: '0px'}, 200);
						} else {
							nb.css('position','fixed').css('top',"0px");
						}
					} else {
						nb.css('position','absolute').css('top',"0px");
					}

					clearTimeout(to);
					to = setTimeout(function() {
						nb_dir = -1;
					}, 600);
				}

				ngutils.event.addListener(ngutils.event.newNotifications, function() {
					showNotificationBar(true, false);
				});

				ngutils.event.addListener(ngutils.event.topMenuOpen, function() {
					showNotificationBar(true, true);
				});

				$(window).scroll(function(e) {

					if (ngutils.notification_controller.open_menu) return;

					var st = $(window).scrollTop();
					if (st === scrollTop) return;

					var moved = scrollTop - st;
					scrollTop = st;

					if (nb_dir === -1 && moved < 0) {

						if (st <= 200) {
							nb.css('position','absolute').css('top','0px');
							nb_dir = 1;
							return;
						} else {

							nb_dir = 0;

							nb.css('position','fixed').css('top','0px');
							nb.stop();
							nb.css('background-color','');
							nb.animate({top: "-"+nb_height+"px"}, 200, function() {
								nb.css('position','absolute').css('top','0px');
							});
						}

						clearTimeout(to);
						to = setTimeout(function() {
							nb_dir = 1;
						}, 600);

					} else if (nb_dir === 1 && moved > 0) {

						showNotificationBar(false, false);

					}
				});
			}, 500);
		});

		ngutils.logOut = function(element) {
      // Matomo / Analytics
			var _paq = window._paq || [];
			_paq.push(["setDocumentTitle", document.domain + "/" + document.title]);
			_paq.push(["setCookieDomain", "*.newgrounds.com"]);
			_paq.push(["setDomains", ["*.newgrounds.com"]]);
			_paq.push(['resetUserId']);
			_paq.push(['trackPageView']);
			_paq.push(['enableLinkTracking']);

			(function() {
				var u="https://analytics.ngfiles.com/";
				_paq.push(['setTrackerUrl', u+'js/']);
				_paq.push(['setSiteId', '1']);
				var d=document, g=d.createElement('script'), s=d.getElementsByTagName('script')[0];
				g.type='text/javascript'; g.async=true; g.defer=true; g.src=u+'js/'; s.parentNode.insertBefore(g,s);
			})();
      // END Matomo / Analytics

			var action = $(element).attr('data-url');
			var $form = $('<form>').attr('action',action).attr('method','post');
			$('body').prepend($form);
			$form.submit();
			return false;
		};

		ngutils.search = {
			initMobile: function(element_id, shim_id, button_id, transition_speed, auto_open) {
				var waiting = false;
				var open = auto_open ? true:false;
				var element = $('#'+element_id);
				var shim = $('#'+shim_id);
				var button = $('#'+button_id);

				var textfield = element.find('input').first();
				element.show();
				var eheight = element.outerHeight();

				if (open) {
					element.css('top', shim.outerHeight());
				} else {
					element.hide();
				}

				button.click(function() {
					if (waiting) return false;
					ngutils.event.dispatch(ngutils.event.closeall, 'topsearch');

					var nheight = shim.outerHeight();
					var anchor = nheight - eheight;

					waiting = true;
					var from = open ? nheight : anchor;
					var to = open ? anchor : nheight;

					open = !open;
					element.css('top',from);

					element.show();
					if (open) textfield.focus();

					element.animate({top:to}, transition_speed, function() {
						waiting = false;
						if (!open) element.hide();
					});
					return false;
				});

				ngutils.event.addListener(ngutils.event.resize, function() {
					if (open) {
						element.stop();
						var nheight = shim.outerHeight();
						element.css('top', nheight);
					}
				});

				ngutils.event.addListener(ngutils.event.closeall, function(source) {

					ngutils.screen_lock = false;

					if (source != 'topsearch' && open) {
						element.stop();
						var nheight = shim.outerHeight();
						var anchor = nheight - eheight;
						open = false;
						waiting = true;

						element.animate({top:anchor}, transition_speed, function() {
							waiting = false;
							element.hide();
						});
					}
				});
			}
		};

		ngutils.desktop = {
			register_menu: function(menu_id) {
				var menu = $('#'+menu_id);

				$('button', menu).click(function() {
					var li = $(this).parent();
					if (li.hasClass('collapsed')) {
						li.removeClass('collapsed');
						li.addClass('expanded');
						$(this).html("&ndash;");
					} else {
						li.removeClass('expanded');
						li.addClass('collapsed');
						$(this).html("+");
					}
					return false;
				});
			}
		};

		ngutils.mobile = {
			last_id: 0
		};

		ngutils.mobile.menuController = function(container_id, button_id, default_menu) {
			var i;
			var controller = this;
			this.id = ngutils.mobile.last_id;
			ngutils.mobile.last_id++;
			this.container = $("#"+container_id);
			this.button = $("#"+button_id);
			var waiting = false;
			var open = false;

			this.container.show();
			this.width = this.container.outerWidth();

			this.direction = this.container.hasClass('right-menu') ? 1:-1;
			this.background = $('div.mobile-menu-background', this.container).first();
			this.anchor = this.width * this.direction;

			this.background.css('left', this.anchor);
			this.container.hide();

			this.transition_speed = 250;
			this.menus = {};

			this.default_menu = null;
			this.current = null;
			this.width = this.container.outerWidth();

			var touchat = null;
			var startPos = null;
			var sceolling = false;

			var noscroll = function(e) {

				var touchpos = e.originalEvent.touches[0].clientY;
				var maxScroll = controller.current.$element.prop('scrollHeight') - controller.container.innerHeight();

				// this menu doesn't scroll
				if (maxScroll < 1) {
					e.preventDefault();
					return false;
				}

				var moved = touchpos - touchat;
				touchat = touchpos;

				var scrollTop = controller.current.$element.scrollTop();
				if (scrollTop != startPos && !scrolling) scrolling = true;

				if ((moved > 0 && scrollTop < 1) || (moved < 0 && scrollTop >= maxScroll)) {
					if (!scrolling) {
						e.preventDefault();
						return false;
					}
				}

				return true;
			};

			//this.container.bind('touchmove', noscroll);
			//this.container.bind('touchstart', function(e) {

			// updated for jquery 3
			this.container.on('touchmove', noscroll);
			this.container.on('touchstart', function(e) {
				touchat = e.originalEvent.touches[0].clientY;
				startPos = controller.current.$element.scrollTop();
				scrolling = false;
			});

			if (typeof(_params) == 'object') {
				for(i in _params) {
					this[i] = _params[i];
				}
			}

			$("*[data-menu-id]", this.container).each(function() {
				var menu = new ngutils.mobile.menu($(this), controller);
				if (default_menu) {
					if (menu.id == default_menu) controller.default_menu = menu;
				} else if (menu.isRoot()) {
					controller.default_menu = menu;
				}
				controller.menus[menu.id] = menu;
			});

			this.setMenu = function(menu_id, animate, direction) {
				if (animate && waiting) return false;

				if (!direction) direction = 1;
				var menu = this.menus[menu_id];
				var to, from, anchor=0;

				if (this.current) {
					anchor = this.anchor * direction;
					if (animate === true) {
						waiting = true;
						var $last = this.current.$element;
						to = anchor;
						this.current.$element.animate({left:to}, this.transition_speed, function() {
							waiting = false;
							$last.hide();
						});
					} else {
						this.current.$element.hide();
					}
				}

				this.current = menu;
				if (!menu) return;

				this.current.$element.show();
				this.current.$element.scrollTop(0);

				if (animate === true) {
					from = anchor * -1;
					to = 0;
					waiting = true;
					this.current.$element.css('left',from);
					this.current.$element.animate({left:to}, this.transition_speed, function() {
						waiting = false;
					});
				} else {
					this.current.$element.css('left',0);
				}
			};

			this.button.click(function() {
				if (waiting) return false;
				ngutils.event.dispatch(ngutils.event.closeall, 'menuController'+controller.id);
				waiting = true;

				var from = open ? 0 : controller.anchor;
				var to = open ? controller.anchor : 0;
				open = !open;

				if (open) controller.setMenu(controller.default_menu.id, false);

				controller.background.css('left', from);
				controller.container.show();

				controller.background.animate({left:to}, controller.transition_speed, function() {
					waiting = false;
					if (!open) {
						controller.container.hide();
					} else {
						ngutils.screen_lock = true;
					}
				});
				return false;
			});

			ngutils.event.addListener(ngutils.event.closeall, function(source) {
				if (open && source !== 'menuController'+controller.id) {
					controller.background.stop();
					var to = controller.anchor;
					waiting = true;
					open = false;
					controller.background.animate({left:to}, controller.transition_speed, function() {
						waiting = false;
						controller.container.hide();
					});
				}
			});
		};

		ngutils.mobile.menu = function($element, controller) {
			this.controller = controller;
			this.$element = $element;
			this.id = $element.attr('data-menu-id');
			this.parent_id = $element.attr('data-parent-id');
			this.parent = null;
			this.$element.hide();

			$("*[data-open-menu]").each(function() {
				var opens = $(this).attr('data-open-menu');
				var dir = $(this).attr('data-direction') == '-1' ? -1:1;
				$(this).click(function() {
					controller.setMenu(opens, true, dir);
					return false;
				});
			});
		};

		ngutils.mobile.menu.prototype = {
			children: [],
			addChild: function(child) {
				this.children.push(child);
			},

			isRoot: function() {
				return !(this.parent_id && this.parent_id != this.id);
			}
		};


		ngutils.footer = {
			buttons: [], // set in footer (just in case these get reordered)
			selected: null,
			init: function(button_id_array) {
				this.buttons = button_id_array;
				var $container = $('#footer-feature-buttons');

				$('button', $container).click(function() {
					ngutils.footer.changeTo($(this).attr('id'));
					return false;
				});
				$('#featureshift-left').click(function() {
					ngutils.footer.previous();
					return false;
				});
				$('#featureshift-right').click(function() {
					ngutils.footer.next();
					return false;
				});
				this.selected = $('button.selected', $container).first().attr('id');
			},

			changeTo: function(button_id) {
				var $container = $('#footer-feature-buttons');
				var $items = $('#footer-featured-items');

				var $button = $("#"+button_id, $container);
				if (!$button) return;

				$('button.selected', $container).removeClass('selected');
				$button.addClass('selected');

				this.selected = button_id;

				var footer_feature = button_id.split("-").pop();
				$.get("/footer-feature/"+footer_feature, function(data) {
					$items.html(data);
				});
			},

			next: function() {
				var index = this.buttons.indexOf(this.selected);
				index++;
				if (index >= this.buttons.length) index = 0;
				this.changeTo(this.buttons[index]);
			},

			previous: function() {
				var index = this.buttons.indexOf(this.selected);
				index--;
				if (index < 0) index = this.buttons.length - 1;
				this.changeTo(this.buttons[index]);
			}
		};

		// hopefully we don't need many of these, but we should at least make things work in IE 11.
		ngutils.ieHacks = function() {
			var ua = window.navigator.userAgent;
			var msie = ua.indexOf("MSIE ");
			if (msie > 0 || !!navigator.userAgent.match(/Trident.*rv\:11\./)) {
				var outer = $('#outer-skin');
				var fixOuter = function() {
					$(outer).height($(document).height());
				};
				ngutils.event.addListener(ngutils.event.resize, fixOuter);
				fixOuter();
			}
		};

		ngutils.grids = {
			_initialized: false,

			init: function() {
				this.update();
				if (!this._initialized) ngutils.event.addListener(ngutils.event.resize, this.update);
				this._initialized = true;
			},

			init_grids_with_max_rows: function() {
				$("*[data-max-rows]").each(function() {
					var $grid = $(this);
					var max_rows = parseInt($grid.attr('data-max-rows'));
					ngutils.grids.setMaxRows($grid, max_rows);
				});
			},

			update: function() {
				ngutils.grids.init_grids_with_max_rows();
			},

			setMaxRows: function($grid, max_rows) {
				var left = -9999;
				var row = 1;
				$grid.children().each(function() {
					$(this).show();
					var l = $(this).offset().left;
					if (l <= left) {
						row++;
					}
					left = l;
					if (row > max_rows) $(this).hide();
				});
			}
		};

		// This is not the same as NiGhtBox, it adds new blackout elements vs
		// relying on the one in the header_common partial.
		ngutils.blackout = function(config) {

			ngutils.blackout.autoID++;

			this.id = ngutils.blackout.autoID;

			// set this to true if you want hide() to remove the elements from the dom vs just hiding them.
			this.remove_on_hide = false;

			this.fade_in = true;
			this.fade_out = true;

			this.loaded = false;
			this.visible = false;
			this.$elements = {};

			this._onfail = null;
			this._onfail_context = this;

			this._onload = null;
			this._onload_context = this;

			this._onshow = null;
			this._onshow_context = this;

			this._onhide = null;
			this._onhide_context = this;

			this._onremove = null;
			this._onremove_context = this;

			this.$container = null;

			if (typeof(config) === 'object') {
				for (var i in config) {
					this[i] = config[i];
				}
			}

			var _this = this;

			$(document).keyup(function(e) {
				if (_this.visible && e.key === 'Escape') _this.hide();
			});
		};

		ngutils.blackout.prototype = {

			// event handlers:
			/*onFail: function(callback, thisArg) {
				this._onfail = typeof(callback) === 'function' ? callback : null;
				this._onfail_context = thisArg ? thisArg : this;

			},*/

			onLoad: function(callback, thisArg) {
				this._onload = typeof(callback) === 'function' ? callback : null;
				this._onload_context = thisArg ? thisArg : this;
			},

			onShow: function(callback, thisArg) {
				this._onshow = typeof(callback) === 'function' ? callback : null;
				this._onshow_context = thisArg ? thisArg : this;
			},

			onHide: function(callback, thisArg) {
				this._onhide = typeof(callback) === 'function' ? callback : null;
				this._onhide_context = thisArg ? thisArg : this;
			},

			onRemove: function(callback, thisArg) {
				this._onremove = typeof(callback) === 'function' ? callback : null;
				this._onremove_context = thisArg ? thisArg : this;
			},

			// load content for a blackout via ajax
			load: function(url, data, jQuery_success) {
				var _this = this;
				this.loaded = false;
				this.show(ngutils.blackout.spinner);
				if (typeof(data) === 'function') {
					jQuery_success = data;
					data = {};
				}

				$.getXD(url, data, function(data, textStatus, jqXHR) {
					_this.loaded = true;
					_this.show(data);
					ngutils.onAjaxComplete();

					if (typeof(jQuery_success) === 'function') {
						jQuery_success.call(this, data, textStatus, jqXHR);
					}

					if (_this._onload) {
						_this._onload.call(_this._onload_context);
					}
				}).fail(function(jqXHR, textStatus, errorThrown) {
					if (_this._onfail) {
						_this._onfail.call(_this._onfail_context);
					}
				});
			},

			createElements: function() {

				var $hover, $inner, $bookend, $bookshelf, $centered, $dimmer;
				var $body = $('body').first();
				var _this = this;

				$hover = $("<div>");
				$hover.addClass('blackout-hover');
				$hover.attr('data-id', this.id);

				$dimmer = $('<div>').addClass('page-dimmer');
				$hover.append($dimmer);

				var checkReset = function(id) {
					if (id === _this.id) {
						_this.initButtons();
					}
				};

				ngutils.event.addListener('blackout-refresh', checkReset);
				$hover.on('remove', function() {
					$hover.off('remove');
					ngutils.event.removeListener('blackout-refresh', checkReset);
				});

				$inner = $("<div>");
				$inner.addClass('blackout-inner');

				$bookend = $("<div>");
				$bookend.addClass('blackout-bookend');

				$bookshelf = $("<div>");
				$bookshelf.addClass('blackout-bookshelf');

				$centered = $("<div>");
				$centered.addClass('blackout-center');

				$bookshelf.append($bookend.clone().addClass('shimmed'));
				$bookshelf.append($centered);
				$bookshelf.append($bookend.clone().addClass('shimmed'));

				$inner.append($bookend.clone());
				$inner.append($bookshelf);
				$inner.append($bookend.clone());

				$hover.append($inner);

				$body.append($hover);

				_this.$elements.hover = $hover;
				_this.$elements.inner = $inner;
				_this.$elements.centered = $centered;

				// make the outer background close this when clicked
				$('div.blackout-bookend', _this.$elements.inner).click(function() {
					_this.hide();
				});
			},

			// removes this item from the layer list
			removeLayer: function() {
				var layered_at = ngutils.blackout.layers.indexOf(this);
				if (layered_at > -1) ngutils.blackout.layers.splice(layered_at,1);
			},

			getZIndex: function() {
				return (ngutils.blackout.layers.length * 2) + ngutils.blackout.zIndex;
			},

			initButtons: function() {
				var _this = this;

				var $btn = $('[data-action="blackout-close"]', _this.$elements.inner);
				// prevent duplicate click events on any close buttons
				$btn.off('click');

				$btn.show();

				var in_blackout = $btn.parents('.blackout-hover').length > 0;

				if (!in_blackout) {
					$btn.remove();
					return;
				}

				// handle close buttons
				$btn.click(function() {
					_this.hide();
				});

				$btn.removeAttr('data-action');
			},

			hiding: false,
			timeout: null,

			show: function(data) {

				var _this = this;

				this.hiding = false;

				// if this item is already in the layer list, temporarily remove it
				this.removeLayer();

				ngutils.blackout.lockLastLayer();

				// add this item to the end of the layer list
				ngutils.blackout.layers.push(this);

				var $body = $('body').first();

				if (!_this.$elements.centered) {
					_this.createElements();
				}

				_this.$elements.centered.hide();

				if (!data && !$.trim(_this.$elements.centered.html())) {
					data = ngutils.blackout.spinner;
				}

				if (data) {

					_this.setBody(data);

				}

				if (!ngutils.blackout.$background) {
					ngutils.blackout.$background = $("<div>");
					ngutils.blackout.$background.addClass('blackout');
					$body.append(ngutils.blackout.$background);
				}

				for(var e in this.$elements) {
					if (e != 'centered') this.$elements[e].show();
				}

				var $inner = _this.$elements.inner;
				$inner.css('height', '');

				var zIndex = _this.getZIndex();
				ngutils.blackout.$background.css('z-index', zIndex);


				if (this.fade_in && !ngutils.blackout.$background.__visible) {
					ngutils.blackout.$background.hide();
					ngutils.blackout.$background.fadeIn(200);
				} else {
					ngutils.blackout.$background.show();
				}
				ngutils.blackout.$background.__visible = true;

				if (_this.timeout) clearTimeout(_this.timeout);

				_this.timeout = setTimeout(function() {

					var $centered = _this.$elements.centered;
					var $hover = _this.$elements.hover;
					if ($centered.outerHeight() <= $hover.outerHeight()) {
						$inner.css('height', '100%');
					}

					$hover.css('z-index', zIndex+1);

					$centered.show();

					_this.visible = true;
					if (_this._onshow) _this._onshow.call(_this._onshow_context);

				}, 1);
			},

			setBody: function(data) {
				var _this = this;

				if (!_this.$elements.centered) {
					_this.createElements();
				}

				if (data instanceof jQuery) {
					_this.$elements.centered.html('');
					_this.$elements.centered.append(data);
				} else {
					_this.$elements.centered.html(data);
				}
				_this.initButtons();
			},

			unlinkTask: function() {
				for(var i in ngutils.activeTasks.tasks) {
					if (ngutils.activeTasks.tasks[i].blackout == this) {
						ngutils.activeTasks.tasks[i].blackout = null;
					}
				}
			},

			locked: false,

			lock: function() {
				this.locked = true;
				return this;
			},

			unlock: function() {
				this.locked = false;
				return this;
			},

			ignore_active_tasks: false,

			hide: function() {

				if (this.locked) return false;

				let activetask = null;
				let savingtask = false;

				if (!this.ignore_active_tasks) {
					for(var i in ngutils.activeTasks.tasks) {
						if (ngutils.activeTasks.tasks[i].blackout == this) {
							if (ngutils.activeTasks.tasks[i].saving) savingtask = true;
							activetask = true;
						}
					}
				}

				if (activetask && !activetask.complete) {
					message = savingtask ? 'Your changes are still saving.\n\nAre you sure you want to close this?' : 'You have unsaved changes.\n\nAre you sure you want to close this?';
					if (!confirm(message)) return;
				}

				this.removeLayer();
				var _this = this;

				ngutils.blackout.unlockLastLayer();
				if (this.hiding) return;
				this.hiding = false;

				if (ngutils.blackout.$background) {
					ngutils.blackout.$background.css('z-index', this.getZIndex());

					if (ngutils.blackout.layers.length < 1) {

						if (!this.fade_out || !ngutils.blackout.$background.__visible) {
							ngutils.blackout.$background.hide();
						} else {
							_this.hiding = true;
							ngutils.blackout.$background.fadeOut(200, function() {
								_this.hiding = false;
							});
						}
						ngutils.blackout.$background.__visible = false;
					}
				}

				if (this.$elements.hover) this.$elements.hover.scrollTop(0);

				for(var e in this.$elements) {
					this.$elements[e].hide();
				}
				this.visible = false;
				ngutils.event.dispatch(ngutils.event.blackoutClosed, this);
				if (this.remove_on_hide) return this.remove();

				if (this._onhide) this._onhide.call(this._onhide_context);
			},

			toggle: function() {
				if (this.locked) return false;
				if (this.visible) this.hide();
				else this.show();
			},

			remove: function() {
				if (this.locked) return false;
				for(var e in this.$elements) {
					this.$elements[e].remove();
				}
				this.$elements = {};
				this.loaded = false;
				this.visible = false;
				if (this._onremove) this._onremove.call(this._onremove_context);
			},

			getLayerElement: function() {
				var $hover;
				if (this.$elements && this.$elements.hover) $hover = this.$elements.hover;
				return $hover;
			}

		};

		ngutils.blackout.prototype.constructor = ngutils.blackout;

		ngutils.blackout.zIndex = 11000;
		ngutils.blackout.layers = [];
		ngutils.blackout.$background = null;
		ngutils.blackout.spinner = '<em class="fa fa-spinner fa-spin" style="font-size: 2em"></em>';

		ngutils.blackout.fromOnClick = function(event, $element, options, callback) {
			event.preventDefault();

			$element = $($element);

			if (!$element.attr('href')) {
				console.error('onClick element requires href attribute');
				return;
			}

			if (typeof(options) == 'function') {
				callback = options;
				options = null;
			}

			if (!options) {
				options = {remove_on_hide: true};
			}

			var blackout = new ngutils.blackout(options);
			if (typeof(callback) == 'function') callback(blackout);

			blackout.show(ngutils.blackout.spinner);
			var params = {userkey:PHP.get('uek')};
			if (PHP.get('ng_design')) params.___ng_design = PHP.get('ng_design');
			blackout.load($element.attr('href'), params);

			return false;
		};

		ngutils.blackout.getTop = function() {
			if (ngutils.blackout.layers < 1) return null;
			let i = ngutils.blackout.layers.length - 1;
			return ngutils.blackout.layers[i];
		};

		ngutils.blackout.getByChild = function($child) {
			var $hover = $child.closest(".blackout-hover");

			if ($hover.length < 1) return null;

			var id = parseInt($hover.attr('data-id'));

			if (!id) return null;

			for(var i=0; i<ngutils.blackout.layers.length; i++) {
				if (ngutils.blackout.layers[i] && ngutils.blackout.layers[i].id === id) return ngutils.blackout.layers[i];
			}
			return null;
		};

		ngutils.blackout.getLastLayer = function() {
			var $layer;
			if (ngutils.blackout.layers.length < 1) {
				$layer = $('body').first();
			} else {
				var blackout = ngutils.blackout.layers[ngutils.blackout.layers.length-1];
				if (blackout) $layer = blackout.getLayerElement();
			}
			return $layer;
		};

		ngutils.blackout.lockLastLayer = function() {
			ngutils.layer_element.lock(ngutils.blackout.getLastLayer());
		};

		ngutils.blackout.unlockLastLayer = function() {
			ngutils.layer_element.unlock(ngutils.blackout.getLastLayer());
		};

		ngutils.blackout.autoID = 0;

		ngutils.blackout.refresh = function(id) {
			if (!id) return;
			id = parseInt(id);
			ngutils.event.dispatch('blackout-refresh',id);
		};

		ngutils.blackout._currentDim = null;

		ngutils.blackout.dim = function($container) {
			if (ngutils.blackout._currentDim) ngutils.blackout.undim();
			ngutils.blackout._currentDim = ngutils.blackout.getLastLayer();
			ngutils.blackout._currentDim.addClass('dimmed');
		};

		ngutils.blackout.undim = function() {
			if (ngutils.blackout._currentDim) ngutils.blackout._currentDim.removeClass('dimmed');
			ngutils.blackout._currentDim = null;
		};

		ngutils.scrollBarWidth = 0;

		ngutils.layer_element = {};

		// intended for use on fixed/global elements like blackout layers or the body tag, that are left justified and 100% width
		ngutils.layer_element.lock = function($element) {

			// calculate the browser's scrollbar width on-the-fly;
			if (!is_mobile && !ngutils.scrollBarWidth) {
				var $body = $('body').first();
				var width_with_scroll = $body.outerWidth();
				$body.css('overflow','hidden');
				var width_without_scroll = $body.outerWidth();
				$body.css('overflow','');
				ngutils.scrollBarWidth = width_without_scroll - width_with_scroll;
			}

			if (!$element || $element.length < 1) return;
			if ($element.is('[data-locked-layer]')) return;

			$element.attr('data-locked-layer',1);

			$element.css('overflow','hidden');

			// adds padding to simulate the space a scrollbar would occupy so elements don't visually shift when scrolling is locked
			var applyScrollShim = function($element) {
				// shrink the element to it's width WITH a scrollbar
				$element.css('width', 'calc(100% - '+ngutils.scrollBarWidth+'px)');
				// add a margin to fill the missing scrollbar space
				$element.css('margin-right', ngutils.scrollBarWidth+'px');
			};

			// if we have a scrollbar that affects page rendering when removed, we need to add a shim
			if (ngutils.scrollBarWidth) {

				// shimming doesn't work well on the body tag, so we'll apply it to our outer wrappers
				if ($element.is('body')) {
					applyScrollShim($('#outer-skin'));
					applyScrollShim($('#notification-bar'));
					$('div.skin-wrapper.fixed').css('left',"-"+(ngutils.scrollBarWidth/2)+"px");

				// other elements should shim just fine
				} else {
					applyScrollShim($element);
				}
			}
		};

		ngutils.layer_element.unlock = function($element) {
			if (!$element || $element.length < 1) return;
			if (!$element.is('[data-locked-layer]')) return;

			$element.removeAttr('data-locked-layer');
			$element.css('overflow','');

			// remove styles used to make the shim effect
			var removeShim = function($element) {
				$element.css('width', '');
				$element.css('margin-right', '');
			};

			if (ngutils.scrollBarWidth) {
				// shimming doesn't work well on the body tag, so we will have applied it to our outer wrappers
				if ($element.is('body')) {
					removeShim($('#outer-skin'));
					removeShim($('#notification-bar'));
					$('div.skin-wrapper.fixed').css('left','');

				} else {
					removeShim($element);
				}
			}
		};

		ngutils.form_draft = function($element, options) {
			var self = this;
			self.$element = $element;
			self.options = options || {};

			// methods to add non-form fields during update. Must return
			// {name: name, value: value}
			self.field_callbacks = [];

			self.generic_id = null;
			self.type_id = null;
			self.extra_id = null;

			self.interval = null;

			self.task = null;

			// when we're removed for whatever reason (e.g.
			// fired from an ajax event and then closed),
			// ensure that the activeTask and friends are gone
			$element.on('remove', function() {
				self.complete();
			});


			if ('generic_id' in self.options) {
				self.generic_id = self.options.generic_id;
				delete self.options.generic_id;
			}

			if ('type_id' in self.options) {
				self.type_id = self.options.type_id;
				delete self.options.type_id;
			}

			if ('extra_id' in self.options) {
				self.extra_id = self.options.extra_id;
				delete self.options.extra_id;
			}

			self.addFieldCallback = function(f) {
				self.field_callbacks.push(f);
			};

			var updateIfNecessary = function() {
				var prev = $(this).data('previous');
				var val = $(this).val().trim();

				if (val.length && prev !== val) {
					console.log("New val "+ val);
					$(this).data('previous', val);

					self.update();
				}
			};

			self.registerOnBlurElements = function($element_or_elements) {
				$element_or_elements.each(function(index) {
					$(this).blur(updateIfNecessary);
				});

				return self;
			};

			// register any elements that should trigger an update
			// on change
			self.registerOnChangeElements = function($element_or_elements) {
				$element_or_elements.each(function(index) {
					$(this).change(updateIfNecessary);
				});

				return self;
			};

			// use this in fields such as the quill editor to begin
			// periodically updating any drafts
			self.begin = function() {
				if (null !== self.interval) {
					return self;
				}

				self.interval = setInterval(self.update.bind(self), 20000);

				return self;
			};

			self.end = function() {
				if (null === self.interval) {
					return self;
				}

				clearInterval(self.interval);
				self.interval = null;
				//self.updateTask(false);

				return self;
			};

			/**
			 * "You may be lose unsaved work" - call this
			 * when you're done with the draft
			 */
			self.complete = function() {
				// tie off the interval if it still exists
				self.end();

				if (self.task) {
					self.task.completed();
					self.task = null;
				}

				return self;
			};

			self.getUrl = function(action) {
				let url = '/form/' + action + '/draft/' + self.generic_id + '/' + self.type_id;
				if (null !== self.extra_id) {
					url = url + '/' + self.extra_id;
				}

				return url;
			};

			self.fetch = function(callback) {
				if (null === self.generic_id || null === self.type_id) {
					return false;
				}

				$.get(self.getUrl('get'), callback);

				return self;
			};

			self.update = function() {
				if (null === self.generic_id || null === self.type_id) {
					return false;
				}

				if (null === self.task) {
					self.task = ngutils.activeTasks.addTask(false, $element);
				}

				let url = self.getUrl('save');

				let params;
				if (self.$element.is('form')) {
					params = self.$element.serializeArray();
				} else {
					params = [];
				}

				if (self.field_callbacks.length) {
					for (let callback, i=0, len=self.field_callbacks.length; i<len; ++i) {
						params.push(self.field_callbacks[i](this));
					}
				}

				$.post(url, params);

				return self;
			};

			self.updateTask = function(saving) {
				if (self.task) self.task.saving = saving;
				return self;
			};
		};

		ngutils.form_draft.prototype.constructor = ngutils.form_draft;

		ngutils.notification_controller = {

			open_menu: null,
			interval: 30000,
			timer: null,

			// when focus is removed from the window, halt
			// any checks
			window_active: true,
			active: true,

			// datetime of start of window inactivity
			inactive_start: null,

			containers: {},

			init: function() {
				var container = $('#notification_icons');
				this.notification_bar = $('#notification-bar');
				this.bar_color = this.notification_bar.css('backgroundColor');
				this.flash_color = "#fc0";
				if (container) {
					$("a[id^='notify']").each(function() {
						$(this).show();
						var info = $(this).attr('id').split("_");
						var mode = info.shift();
						var item = info.join("_");
						ngutils.notification_controller.containers[item] = {toggles:(mode == 'notifyonly'), element:$(this), value:0};
					});
				}

				var data = PHP.get("notification_init_values", null);
				if (data) {
					ngutils.notification_controller.parse(data, false);
				}

				/**
				 * When the user removes focus from the window, ignore
				 * any other requests until they return to it.
				 */
				$(window).blur(function() {
					ngutils.notification_controller.active = false;
					ngutils.notification_controller.inactive_start = new Date();
				});

				/**
				 * Once they return focus, update immediately with
				 * any notifications if we've been waiting more
				 * than the alloted interval time
				 */
				$(window).focus(function() {
					var ms_diff = new Date() - ngutils.notification_controller.inactive_start;

					ngutils.notification_controller.active = true;
					ngutils.notification_controller.inactive_start = null;

					if (ms_diff > ngutils.notification_controller.interval) {
						// fire immediately
						ngutils.notification_controller.begin();
					}
				});

				this.begin();
			},

			begin: function() {
				if (ngutils.notification_controller.timer) {
					clearInterval(ngutils.notification_controller.timer);
				}

				// make the intial request
				ngutils.notification_controller.makeRequest();

				// then fire off the timer
				ngutils.notification_controller.timer = setInterval(ngutils.notification_controller.load.bind(this), ngutils.notification_controller.interval);
			},

			makeRequest: function() {

				// skip this if a menu is currently open
				if (ngutils.notification_controller.open_menu) return;

				$.getJSON(PHP.get('notification_ajax_url', '/checknotifications'), function(data) {
					ngutils.notification_controller.parse(data, true);
				});
			},

			load: function() {
				if (ngutils.notification_controller.active) {
					ngutils.notification_controller.makeRequest();
				}
			},

			parse: function(data, animated) {
				var changed = false;
				var _this = this;

				if (!data) {
					return false;
				}

				for(var item in data) {
					if (this.update(item, data[item], animated)) changed = true;
				}

				if (animated && changed && this.bar_color && this.flash_color) {
					this.notification_bar.stop();
					ngutils.event.dispatch(ngutils.event.newNotifications);
					this.notification_bar.css('background-color', this.flash_color);
					this.notification_bar.animate({'background-color': this.bar_color}, 1000, function() {
						_this.notification_bar.css('background-color', '');
					});
				}
			},

			update: function(item, value) {

				ngutils.notification_controller.values[item] = value;

				if (!this.containers[item]) return;
				var element = this.containers[item].element;
				var toggles = this.containers[item].toggles;
				var oldval = this.containers[item].value;
				var span = $('span',element);
				this.containers[item].value = value;
				if (value == "0") value = "";

				span.html(value ? value:"");

				return value > oldval;
			}
		};

		ngutils.notification_controller.values = {
			messages: 0,
			interactions: 0
		};

		ngutils.notification_controller.setInteractionButton = function($button) {
			var interaction_blackout = new ngutils.blackout();
			var is_open = false;

			interaction_blackout.onHide(function() {
				is_open = false;
			});

			$button.click(function() {

				if (is_open) {
					interaction_blackout.hide();
				} else {
					is_open = true;
					interaction_blackout.show(ngutils.blackout.spinner);
					var url = $button.attr('href');
					//var context = ngutils.notification_controller.values.interactions > 0 ? 'header-new':'header';
					var context = 'header';
					$.getXD(url, "context=header", function(data) {
						interaction_blackout.show(data);
					});

					ngutils.notification_controller.clearCount($button);
				}
				return false;
			});
		};

		// this is a temporary way of loading items into a generic drop menu
		// currently only used by the pm system, and should be replaced with
		// an updated PM system that opens in a blackout
		ngutils.notification_controller.button = function($button, $default_body) {
			var menuspeed = 250;

			this.$button = $($button);
			var detail = this.$button.attr('data-detail');
			var $nbar = $('#notification-buttons');

			var $template = $('#header-dropdown-template').clone();

			var $menu_body = $('.menu-body', $template).first();
			var $menu_footer = $('.menu-footer', $template).first();
			var $view_all = $('a', $menu_footer).first();
			$view_all.attr('href', this.$button.attr('href'));

			var $menu_scroll = $('.menu-scroll', $template).first();

			var $loading_spinner = $('.loading-spinner', $template).first();
			$loading_spinner.remove();

			if (!$default_body) {
				$default_body = $loading_spinner;
			}
			else {
				$default_body.show().detach();
			}
			this.is_open = false;

			var _this = this;

			this.open = function() {
				if (_this.is_open) return;

				ngutils.notification_controller.clearCount(this.$button);

				_this.is_open = true;
				ngutils.notification_controller.open_menu = _this;
				ngutils.event.dispatch(ngutils.event.topMenuOpen);

				$('body').append($template);

				$menu_body.html('').append($default_body);

				var right = $nbar.offset().left + $nbar.outerWidth();
				$template
					.show()
					.css('left', right - $template.outerWidth())
				;
				$template.height('');
				var h = $menu_body.outerHeight();
				$template.height(0);

				$template.animate({height: h+"px"}, menuspeed);

				$menu_footer.hide();
				$menu_scroll.css('height','100%');

				// if we have a detail attribute, we need to load the menu body via AJAX
				if (detail) {
					$.getJSON('/checknotifications', {detail:detail}, function(json) {
						if (json.has) {
							$menu_footer.show();
						} else {
							$menu_footer.hide();
							if (json.redirect) {
								window.location.href = json.redirect;
								return;
							}
						}
						$menu_scroll.css('height','');

						$menu_body.html(json.partial);
						$template.stop();
						var h1 = $template.height();
						$template.height('');
						var h2 = $template.height();
						var h3 = $menu_body.innerHeight() + $menu_footer.outerHeight();
						if (h3 < h2) h2 = h3;
						$template.height(h1);

						$template.animate({height: h2}, menuspeed);
					});
				}

				$template.off('click').on('click', function(e) {
					e.stopPropagation();
				});
				$menu_scroll.off('mousewheel DOMMouseScroll').on('mousewheel DOMMouseScroll', function(e) {
					e.stopPropagation();
					e.preventDefault();

					var st = $menu_scroll.scrollTop();
					if (e.originalEvent.wheelDelta > 0 || e.originalEvent.detail < 0) {
						$menu_scroll.scrollTop(st - 12);
					}
					else {
						$menu_scroll.scrollTop(st + 12);
					}

				});
			};

			this.close = function() {
				if (!_this.is_open) return;
				_this.is_open = false;

				ngutils.notification_controller.open_menu = null;

				$template.animate({height: 0}, 100, function() {
					$template.detach();
					$template.height('');
				});
			};

			$(window).resize(this.close);

			_this.$button.off('click').on('click', function(e) {
				e.preventDefault();

				if (ngutils.notification_controller.open_menu && ngutils.notification_controller.open_menu !== _this) {
					ngutils.notification_controller.open_menu.close();
				}

				if (_this.is_open) _this.close();
				else _this.open();
				return false;
			});

			_this.$button.clickOutside(function(source) {
				_this.close();
			});
		};

		ngutils.notification_controller.clearCount = function($button) {
			$('span',$button).html('');
		};

		$(function() {
			if (PHP.get('activeuser')) ngutils.notification_controller.init();
			ngutils.checkDataAttributes();
		});

		ngutils.checkDataAttributes = function() {

			$('*[data-exec-script]').click(function() {
				var handler = $(this).attr('data-exec-script');
				var params = $(this).attr('data-exec-params');
				try {
					if (params) {
						params = JSON.parse(params);
					}
				}
				catch(e) {
					console.error('Bad JSON in data-exec-params="'+params+'"');
					return false;
				}

				return ngutils.click_watcher.execute(handler, params);
			});

			$('a[data-post-on-click]').each(function() {
				var params = $(this).attr('data-post-on-click');
				if (params.indexOf("{") !== 0) {
					params = {};
				} else {
					try {
						var jsp = JSON.parse(params);
						params = jsp;
					}
					catch(e) {
						console.error('Bad JSON in data-post-on-click="'+params+'"');
						return false;
					}
				}
				params.XD = true;
				$(this).formifyLink(params);
			});
		};

		// used to execute scripts from elements with a data-exec-script attribute.
		ngutils.click_watcher = {
			handlers: {ngutils:ngutils},
			addHandler: function(handler, alias) {
				this.handlers[alias] = handler;
			},
			execute: function(alias,param_obj) {
				var obj = null;
				var chain = alias.split(".");
				var a;
				var thisobj = window;

				function doError(a) {
					console.error("data-exec-script='"+alias+"' refers to undefined or unregistered object at '"+a+"'.");
				}

				while(chain.length > 0) {
					a = chain.shift();
					if (!obj) {
						if (!this.handlers[a]) {
							doError(a);
							return false;
						}
						obj = this.handlers[a];
					} else {
						if (!obj[a]) {
							doError(a);
							return false;
						}
						obj = obj[a];
					}
					if (chain.length > 0) thisobj = obj;
				}
				if (typeof(obj) != 'function') {
					console.error("data-exec-script='"+alias+"' refers to "+typeof(obj)+". Must be a function.");
				}
				if (!param_obj) {
					return obj();
				} else if (Array.isArray(param_obj)) {
					return obj.apply(thisobj, param_obj);
				} else {
					return obj(param_obj);
				}
			}
		};

		ngutils.review = {};
		ngutils.review.blackout = null;

		ngutils.review.form = {};
		ngutils.review.form.blackout = null;
		ngutils.review.form.launch = false;
		ngutils.review.form.votebar = null;

		/**
		 * By default, the review form is hidden - but it's in the page
		 * accompanying the vote bar.
		 */
		ngutils.review.form.show_fields = function(callback) {
			if (callback && $.isNumeric(callback)) {
				var review_id = callback;

				callback = function() {
					var $existing = ngutils.review.getExisting(review_id);

					if ($existing && $existing.exists()) {
						$existing.hide();
					}
				};
			}

			if ($('#review_fields').hasClass('collapsed')) {
				$('#review_fields').removeClass('collapsed');
				if (typeof(callback) === 'function') {
					callback();
				}
			} else if (typeof(callback) === 'function')  {
				callback();
			}
		};

		ngutils.review.form.hide_fields = function(callback) {
			if (callback && $.isNumeric(callback)) {
				var review_id = callback;

				callback = function() {
					var $existing = ngutils.review.getExisting(review_id);

					if ($existing && $existing.exists()) {
						$existing.show();

						if (!$('#review_fields').hasClass('notempt')) {
							$('#review_fields').addClass('notempt');
						}
					}
				};
			}

			if (!$('#review_fields').hasClass('collapsed')) {
				$('#review_fields').addClass('collapsed');
				if (typeof(callback) === 'function') {
					callback();
				}
			} else if (typeof(callback) === 'function')  {
				callback();
			}

		};

		/**
		 * Gets the review's ORM id
		 */
		ngutils.review.getId = function($element) {
			return $element.attr('data-review-id');
		};

		/**
		 * Pluck a review out of a pod by its id
		 */
		ngutils.review.getExisting = function(id) {
			return $('div.pod').find('.review[data-review-id="' + id + '"]');
		};

		/**
		 * Initialize the form and set any callbacks - we could be
		 * submitting from a portal view page, or potentially
		 * somewhere else as yet unaccounted for.
		 */
		ngutils.review.form.watch = function(review_id) {
			var $container = $('#review_vote');
			var $form = $('form', $container);
			var $fields = $('#review_fields');

			var generic_id = $('input[name="generic_id"]', $form).val();
			var type_id = $('input[name="type_id"]', $form).val();

			var getExisting = function(id) {
				return ngutils.review.getExisting(id);
			};

			var callback = function(response) {
				if ($('#review_vote').exists()) {
					// scroll to the thing
					ngutils.review.form.hide_fields(function() {
						// replace the form, if they hadn't previously
						$('#review_vote').replaceWith($(response.edit));
					});
				}
			};

			$form.submit(function(e) {
				var $agreed = $('#review_agreed');

				if ($agreed.exists() && !$agreed.is(':checked')) {
					alert("You haven't agreed to the terms and conditions!");
					return false;
				}

				$(this).ajaxSubmit(callback);
				return false;
			});

			$form.find('button.cancel').off().click(function() {
				var $element = $(this);
				ngutils.review.form.hide_fields($element.attr('data-review-id'));

				return false;
			});


			// when the form is collapsed, focusing on the textarea
			// should remove the class and therefore reveal all
			$('textarea', $fields).focus(function() {
				if ($fields.hasClass('collapsed')) {
					$fields.removeClass('collapsed');
				}
			});

			/*$('textarea', $fields).blur(function() {
				if (!$(this).val().length) {
					$fields.addClass('collapsed');
				}
			});*/

			$(document).click(function(event) {
				if (!$(event.target).closest($fields).length) {
					if (!$('textarea', $fields).val().length && !$fields.hasClass('collapsed')) {
						$fields.addClass('collapsed');
					}
				}
			});

		};

		/**
		 * Get blackout instance (initialize if not set).
		 *
		 * @return ngutils.blackout
		 */
		ngutils.review.getBlackout = function() {
			if (null === ngutils.review.blackout) {
				ngutils.review.blackout = new ngutils.blackout({
					"remove_on_hide": true
				});
			}

			return ngutils.review.blackout;
		};

		ngutils.review.paginate = function($pod, update_location) {
			var watchLinks = function() {
				$('.pagenav[id^="review-navigation-"] a').off().click(function() {
					var url = this.href;

					if (url && url.length) {
						fetchReviews(url);
					}

					return false;
				});

			};

			var fetchReviews = function(url) {
				var fetch_url = url;

				if (window.location.pathname.indexOf('/reviews') === 0) {
					fetch_url = fetch_url + '?include-title';
				}

				$.get(fetch_url, function(response) {
					$pod.replaceWith(response);

					if (update_location) {
						history.pushState({page: url}, null, url);
					} else {
						history.pushState({page: url}, null, null);
					}
				});

			};

			/*window.onpopstate = function(event) {
				if (event.state && event.state.page) {
					fetchReviews(event.state.page);
				}
			};*/
			watchLinks();

		};

		ngutils.review.registered = {};

		/**
		 * Initialize all the button clicks for a review itself, including
		 * edit, delete and respond. These will have different actions
		 * according to where they've been called from. For example,
		 * in the portal, we will edit in the page itself. Otherwise,
		 * the edit will be a separate blackout call.
		 *
		 */
		ngutils.review.register = function($element, launch) {
			var self = this;
			self.launch = launch === true ? true : false;

			if (typeof($element) === 'string') {
				$element = $($element);
			}

			if ($element.attr('id') in ngutils.review.registered) {
				$element.off();
			}

			ngutils.review.registered[$element.attr('id')] = $element;

			var parts = $element.attr('id').split('_');
			var review_id = parseInt(parts.pop(), 10);

			// contains all reviews
			var $container = $element.parents('.pod');

			// contains the review itself
			var $review_body = $('.review-body', $element);

			// options area
			var $review_options = $('.review-options', $element);

			// contains each of the review responses
			var $response_container = $('.rev-resp-container', $element);

			var $edit_link = $('a[class$="pencil"]', $review_options);
			var $delete_link = $('a[class$="trash"]', $review_options);
			var $moderate_link = $('a[class$="moderate"]', $review_options);

			var $response_link = $('a[class="comment-count"]', $element);

			// formatting for date/time
			$('time', $element).couNtinGDate({'format': 'longDate'});

			//$('#review_time_11745707').couNtinGDate('2015-07-28 15:07:55', '2018-08-06 11:00:51', {format: 'longDate'});

			$delete_link.off().ajaxifyLink({
				confirmation: "Are you sure you want to delete this review?",
				success_func: function(response) {
					var $rv = $('#review_vote');

					if (response && response.edit && $rv.exists()) {
						$rv.replaceWith($(response.edit));
					}

					// our message to indicate this has been done
					var $success = $(response.success).find('.pod-body');

					// replace review with it
					$element.replaceWith($success);

					// when we remove the success pod, remove
					// container if there's nothing left in it
					$success.on('remove', function(e) {
						$(this).off();

						// if the parent pod is a review event,
						// remove the entire pod - otherwise, check how many
						// reviews are left inside the pod and remove it
						if ($container.attr('id') && $container.attr('id').indexOf('review_event_') === 0) {
							$container.remove();
						} else {
							var remaining = $('.pod-body.review', $container).length;
							if (!remaining) {
								$container.remove();
							}
						}

						var $fields = $('#review_fields');

						if ($fields.exists()) {
							$fields.removeClass('notempt');
						}
					});
				}
			});

			// deals with the pencil button in the review - clicking it
			// loads the review to edit either in a page (portal) or as
			// a blackout
			$edit_link.off().click(function() {
				// dealing with in-page editing via the portal?
				if (false === self.launch) {
					$element.hide();
					ngutils.review.form.show_fields();
				} else {
					ngutils.review.form.blackout = new ngutils.blackout();

					ngutils.review.form.blackout.load(this.href);

					// TODO - replace review in background
					ngutils.review.form.blackout._onhide = function() {
						window.location.href = window.location.href;
					};
				}

				return false;
			});

			// loads a moderation overlay
			$moderate_link.off().click(function() {
				ngutils.review.getBlackout().load(this.href, null, function(data) {
					var $element = $(data);
					//ngutils.review.register($('div', $element).first());
				});

				return false;
			});

			// gets the response form, inserts into the DOM and then
			// watches for any actions from the user
			var fetchResponseForm = function(response, $existing_response) {
				if (typeof($existing_response) === typeof(undefined)) {
					$existing_response = false;

				}

				var $response_element = $(response.response_form);

				// hide the response(s) that's already there.
				if ($existing_response) {
					$response_container.hide();
				}

				$response_element.insertAfter($element);
				ngutils.review.watch_response_form($('form', $response_element), ngutils.review.form.launch);

			};

			// the individual response link
			$response_link.off().click(function() {
				var $element = $(this);
				$.get(this.href, function(response) {
					$element.remove();
					return fetchResponseForm(response);
				});
				return false;

			});

			// editing and removing responses
			if ($response_container.exists()) {
				// watch response edits
				$('a[class$="pencil"]', $response_container).click(function() {
					var $self = $(this);

					$.get(this.href, function(response) {
						fetchResponseForm(response, $self.parents('.authresponse'));
					});

					return false;
				});

				$('a[class$="trash"]', $response_container).ajaxifyLink({
					confirmation: "Are you sure you want to remove this response?",
					success_func: function(response) {
						var $review = $(response.review);
						var review_id = $review.attr('data-review-id');
                        var $existing = ngutils.review.getExisting(review_id);
						$existing.replaceWith($review);
					}
				});
			}

		};

		ngutils.review.watch_response_form = function($element) {
			var makeReplacement = function(response) {
				$element.parent().remove();

				var $review = $(response.review);
				var review_id = $review.attr('data-review-id');
				var $existing = ngutils.review.getExisting(review_id);

				$existing.replaceWith($review);
			};

			$element.find('button[class="cancel"]').off().click(function() {
				$.get($element.attr('action'), makeReplacement);

				return false;
			});

			$element.off().on('submit', function() {
				$(this).ajaxSubmit(makeReplacement);

				return false;

			});
		};


		// handles the 'Steve' face in our votebar
		ngutils.votebar = function($element, vote) {
			var votebar = this;
			locked = false;

			if (typeof($element) === 'string') {
				$element = $($element);
			}

			if (typeof(vote) === typeof(undefined)) {
				vote = null;
			}


			var $form = $element.parents('form');
			var $reaction = $('div.star-reaction', $element).first();
			var $xp_info;


			// overwrite as necessary
			this.voteCallback = function(response) {};

			this.getSelectedInput = function() {
				return $('input[type=radio]:checked', $element);
			};

			this.getRealValue = function() {
				var $input = this.getSelectedInput();
				if ($input) {
					return parseInt($input.val(), 10);
				}

				return null;
			};

			this.getValue = function() {
				var val = this.getRealValue();

				return parseInt(val);
			};
			var last_score = this.getRealValue();
			var $selected_input = this.getSelectedInput();
			/**
			 * Flashes up message about XP gain after vote.
			 */
			this.showXp = function() {
				if (!$xp_info.exists()) {
					return false;
				}

				var score = parseInt($xp_info.attr('data-attr-vote'), 10);

				var $zero = $('label[for="votebar-0"]', $element);

				var star_width = $zero.width();
				var star_height = $zero.height();

				var closest = (score > 0 && score % 2 === 0) ? score - 1 : score;

				var $target = $('label[for="votebar-' + closest + '"]', $element);
				var offset = $target.offset();

				// positioning for the xp
				var tw = $target.width();
				var th = $target.height();
				var xw = $xp_info.width();
				var xh = $xp_info.height();
				var x_top = offset.top;

				if (!is_mobile) {
					x_top = x_top - xh;
				} else {
					x_top = x_top + (xh / 2);
				}

				var x_left = offset.left;

				if (score > 0) {
					x_left = offset.left + (Math.floor(((score-1) / 10) * 5) * star_width);
				}

				x_left += (star_width - xw) / 2;

				$('body:first').append($xp_info);

				$xp_info.css({
					'top':  x_top + 'px',
					'left': x_left + 'px'
				});

				// flash effect -> fade out
				$({brightness:5}).animate({brightness:1}, {
					duration: 500,
					easing: 'swing',
					step: function() {
						$xp_info.css({
							"-webkit-filter": 'brightness('+this.brightness+')',
							"filter": 'brightness('+this.brightness+')'
						});
					},
					complete: function() {
						$xp_info.fadeOut(100, function() {
							$xp_info.remove();
						});
					}
				});

				// movement effect
				$xp_info.animate({top:(x_top-40)}, {
						duration: 500,
						easing: 'swing'
					}
				);
			};

			this.clickHandler = function(event, $clicked, record) {
				var score = $('#' + $clicked.attr('for')).val();
				if (this.castVote(event, score)) {
					this.showFromLabel($clicked, record);
				}
			};

			/**
			 * previous_score denotes what the score was originally set
			 * to in case of failure.
			 */
			this.castVote = function(event, score) {


				score = parseInt(score, 10);

				if (!$form.exists()) return false;

				if (locked || score === last_score) {
					this.getSelectedInput().prop('checked',false);
					$selected_input.prop('checked',true);
					return false;
				}

				var data = {
					show_fields: ($('textarea', $form).exists() && $('textarea', $form).is(':visible')) ? 1 : 0,
					vote: score,
					userkey: PHP.get('uek')
				};

				//var url = "/content/vote/" + data.generic_id + "/" + data.type_id;
				var url = $element.attr('data-attr-url');

				// store anything they'd begun writing etc.
				// TODO: simplify this
				var review_progress = {};

				$('input[type="checkbox"], textarea', $form).each(function() {

					if ($(this).is('textarea')) {
						review_progress[this.name] = this.value;
					} else {
						review_progress[this.name] = this.checked;
					}
				});


				var success = function(response) {

					last_score = score;
					$selected_input = votebar.getSelectedInput();
					locked = false;

					var id = '#sidestats_' + data.generic_id + '_' + data.type_id;

					var composite_id = data.generic_id + '_' + data.type_id;

					var search = 'dl.sidestats[data-statistics="' + composite_id  + '"]';
					var $existing = $(search);
					var $replacement;

					if ($existing.exists()) {
						// update the scores on the left hand side
						// of the portal view page
						var $sidestats = $(response.sidestats);
						$replacement = $sidestats.filter(search);

						$existing.replaceWith($replacement);
					}

					/* Old way - this was updating all the scores with whatever new html came back...

					// check reviews now...
					if ($('#review_vote').exists() && response.edit) {

						$replacement = $(response.edit);
						$('#review_vote').replaceWith($replacement);

						// anything they'd started writing needs
						// replacing
						$.each(review_progress, function(k, v) {
							var $el = $replacement.find('[name="' + k + '"]');
							if (typeof(v) === 'string') {
								$el.val(v);
							} else {
								$el.prop('checked', v);
							}
						});


						var $review = $('.review', $('#review_vote'));
						if ($review.exists()) {
							if (data.show_fields) {
								$review.hide();
							}
						}


					} else if (response.review) {
						$replacement = $(response.review);

						$existing = ngutils.review.getExisting($replacement.attr('data-review-id'));

						if ($existing.exists()) {
							$existing.replaceWith($(response.review));
						}
					}
					*/

					// New way:  We already know the score value, so just update all the star votes
					// TODO - put the review id in the json response so it's easier to get to.
					if (response.edit && response.edit.length) {
						var $response_html = $(response.edit);

						var rid = $('[data-review-id]:first', $response_html).attr('data-review-id');
						$stars = $('.star-score', $('[data-review-id="'+rid+'"]'));
						$('span:first',$stars).css('width', (score * 10)+"%");
						$stars.attr('title', (score/2).toFixed(2)+"/5.00");

						if ($xp_info) $xp_info.remove();
						$xp_info = $('.xp-info', $response_html);
						if ($xp_info.exists()) votebar.showXp();
					}

					if (response.replace_sidestats) {
						$('#sidestats').replaceWith(response.sidestats);
					}

					// blam/protect messages
					if (response.info && response.info.length) {
						var info = response.info;
						var blackout = new ngutils.blackout();


						var $pod = $(info.pod);
						$('.pod-body', $pod).append($(info.contents));

						if (info.blam || info.protect) {
							blackout._onhide = function() {
								window.location.href = info.redirect;
							};

						}

						$pod.click(function() {
							blackout.hide();
						});

						blackout.show($pod);
					}

					// any callback we've set
					votebar.voteCallback(response);
				};

				locked = true;

				$.post(url, data, success).fail(function() {
					locked = false;
				});

				return true;
			};

			this.showFromLabel = function($label, record) {
				var $radio = $('#'+$label.attr('for'));
				var v = parseInt($radio.attr('value'));

				if (record) {
					vote = v;
					var brightness = 5;
					var setBrightness = function(b) {
						var f = b > 1 ? "brightness("+b+")" : "";

						$label.css({
							'filter':f,
							'-webkit-filter':f
						});
					};

					setBrightness(brightness);

					$({brightness: brightness}).animate({brightness: 1}, {
						duration: 300,
						easing: 'swing', // or "linear"
						step: function() {
							setBrightness(this.brightness);
							brightness = this.brightness;
						}
					});
				}

				this.show(v);
			};

			this.clear = function() {
				this.show(vote);
			};

			this.show = function(v) {
				var c = 'star-reaction';
				if (v !== null) c += " reaction-"+v;
				$reaction.attr('class', c);
			};

			if (!is_mobile) {

				$('label', $element).click(function(e) {
					votebar.clickHandler(e, $(this), true);
				});

				$('label', $element).hover(
					function() {
						votebar.showFromLabel($(this));
					},
					function() {
						votebar.clear();
					}
				);

			} else {

				var over = null;
				var compare = [];

				var initTouch = function() {
					compare = [];
					$('label',$element).each(function() {
						var right = $(this).offset().left + $(this).outerWidth();
						compare.push({
							label: $(this),
							right: right
						});
					});
					compare.sort(function(a,b) {
						return a.right > b.right ? 1:-1;
					});
				};

				var checkTouch = function(e) {

					e.preventDefault();
					e.stopPropagation();

					if (over) {
						over.removeClass('hover');
					}

					over = compare[compare.length-1].label;

					var x = e.originalEvent.touches[0].pageX;

					for (var i=compare.length-1; i >=0; i--) {
						if (x <= compare[i].right) {
							over = compare[i].label;
						} else {
							break;
						}
					}

					if (over) {
						over.addClass('hover');
					}

					votebar.showFromLabel(over);
				};

				$element.on('touchstart', function(e) {
					initTouch();
					checkTouch(e);
				});

				$element.on('touchmove', function(e) {
					checkTouch(e);
				});

				$(document).off('touchend').on('touchend', function(e) {
					$('#'+over.attr('for'), $element).prop('checked',true);
					votebar.clickHandler(e, over, true);
					over = null;
					compare = [];
					$('label',$element).removeClass('hover');
				});
			}

			$element.on('remove', function() {
				$(this).off();
			});
		};

		ngutils.color = {};

		ngutils.color.picker = function($element) {

			var _this = this;
			var last_value;

			if (typeof($element) == 'string') $element = $($element);

			var updating = false;
			var $input = $('input[type="text"]', $element).first();

			ngutils.color.autoid++;
			var id = '__color_picker_swatch'+ngutils.color.autoid;

			var $picker = $('<input />');
			$picker.attr('type','color');

			if (ngutils.color.supportsColorInput()) {
				$picker.attr('id',id);
			} else {
				if ($input.is('[id]')) id = $input.attr('id');
				else ($input.attr('id',id));
			}

			var $label = $('<label />');

			$label.attr('for',id);

			var $wrapper = $('<div />');
			$wrapper.attr('class','color-picker-swatch');

			$picker.appendTo($wrapper);
			$label.appendTo($wrapper);
			$wrapper.appendTo($element);

			$picker.outerHeight($input.outerHeight());
			$picker.outerWidth(30);

			this.sync = function(value) {
				updating = true;
				$input.val(value);
				$picker.val(value);
				$label.css('background-color',value);
				last_value = value;
				updating = false;
			};

			this.onChange = function(newval) {
			};

			this.value = function(value) {
				if (typeof(value) == typeof(undefined)) return $input.val();

				if (value == last_value) return;
				this.sync(value);
				this.onChange(this.value());
			};

			$input.on("change keyup paste", function() {
				if (updating) return;

				var val = $input.val();
				$input.removeClass('notation');

				if (!ngutils.color.isValidHexCode(val)) {
					$input.addClass('notation');
					return;
				}
				if (val == last_value) return;
				_this.sync(val);
				_this.onChange(_this.value());
			});

			$picker.on("change", function() {
				if (updating) return;
				var val = $picker.val();
				if (val == last_value) return;
				_this.sync(val);
				_this.onChange(_this.value());
			});

			last_value = $input.val();
			if (!last_value || !ngutils.color.isValidHexCode(last_value)) last_value = "#000000";
			this.sync(last_value);
		};

		ngutils.color.autoid = 0;

		ngutils.color.isValidHexCode = function(hex) {
			return  /(^#[0-9A-F]{6}$)|(^#[0-9A-F]{3}$)/i.test(hex);
		};

		ngutils.color.supportsColorInput = function() {
			var colorInput = $('<input type="color" value="!" />')[0];
			return colorInput.type === 'color' && colorInput.value !== '!';
		};


		ngutils.dropmenu = function($btn, $menu) {

			if (typeof($btn) == 'string') $btn = $($btn);
			if (typeof($menu) == 'string') $menu = $($menu);

			var $body = $btn.closest(".blackout-hover");
			if ($body.length < 1) $body = $('body').first();

			$menu.hide().remove();
			$body.append($menu);

			var menu_open = false;

			$('a', $menu).off('click');
			$('a', $menu).click(function() {
				return false;
			});

			var self = this;

			this.closeMenu = function(source) {
				if (source !== self) {
					menu_open = false;
					$menu.animate({height: 0}, 100, function() {
						$menu.hide();
					});
				}
			};

			$menu.off('clickOutside');
			$menu.clickOutside(this.closeMenu);
			ngutils.event.removeListener(ngutils.event.closeMenus, this.closeMenu);
			ngutils.event.addListener(ngutils.event.closeMenus, this.closeMenu);

			/* if our button gets removed, say from an ajax update, clean up the menu and any listeners that jQuery won't handle */
			$btn.on("remove", function() {
				$menu.remove();
				ngutils.event.removeListener(ngutils.event.closeMenus, this.closeMenu);
			});

			$btn.off('click');
			$btn.click(function(e) {
				ngutils.dropmenu.closeOpenMenus(self);

				if (!menu_open) {
					$menu.show();

					var full_height = $menu.height('auto').height();
					$menu.height(0);

					$menu.css('left', $btn.offset().left + $btn.outerWidth() - $menu.outerWidth());
					$menu.css('top', $btn.offset().top + $btn.outerHeight());
					$menu.css('position','absolute');
					$menu.css('z-index',10002);
					$menu.attr("tabindex", -1).focus();

					$menu.animate({height: full_height}, 100, function() {
						$menu.height('auto');
					});
					menu_open = true;
				} else {
					self.closeMenu();
				}

				return false;
			});
		};

		ngutils.dropmenu.closeOpenMenus = function(source_btn) {
			ngutils.event.dispatch(ngutils.event.closeMenus, source_btn);
		};

		ngutils.hovertext = {};
		ngutils.hovertext.register = function($target_element, $hover_element) {
			var $e,$h;

			$e = (typeof($target_element) == 'string') ? $($target_element) : $target_element;
			$h = (typeof($hover_element) == 'string') ? $($hover_element) : $hover_element;

			$h.remove();
			$h.css('position','absolute');
			$h.css('z-index',500);
			$('body').first().append($h);
			$h.hide();

			var on_hover = false;
			var on_element = false;

			function showHover() {
				var a = 42; // offset of hover arrow from right side of hover bubble;
				var c = $e.offset().left + ($e.outerWidth()/2);
				var s = 5; // height of bubble's drop shadow

				var pb = parseInt($h.css('padding-bottom'), 10);

				$h.css('top', $e.offset().top - $h.outerHeight() - s + pb);
				$h.css('left', c - $h.outerWidth() + a);
				$h.show();
			}

			function hideHover() {
				if (!on_element && !on_hover) {
					$h.hide();
				}
			}

			$e.mouseover(function() {
				on_element = true;
				showHover();
			});

			$e.mouseout(function() {
				on_element = false;
				setTimeout(hideHover, 5);
			});

			$e.on('remove', function() {
				on_element = false;
				setTimeout(function() {
					hideHover();
					$h.remove();
				}, 5);
			});

			$h.mouseover(function() {
				on_hover = true;
			});

			$h.mouseout(function() {
				on_hover = false;
				setTimeout(hideHover, 5);
			});

		};

		ngutils.friendship = {};

		ngutils.friendship.registerRequestForm = function(form_id) {

			var $form = $('#'+form_id);
			var action = $form.attr('action');

			function onSubmit(e) {
				var params = $form.serializeArray();
				params.push({name:'userkey', value:PHP.get('uek')});

				var old = $form.html();
				$form.html("<em>Please wait...</em>");

				$.post(action, params, function(data) {
					$form.replaceWith(data);
				}).fail(function() {
					$form.html(old);
					$('[type="submit"]', $form).click(onSubmit);
				});
				return false;
			}

			$('[type="submit"]', $form).click(onSubmit);

			var $cont = $('[data-action="manage"]', $form);
			var event_name = 'remove-friend-'+$('input[name="uid"]', $form).val();

			ngutils.event.addListener(event_name, function() {
				$cont.html('<p><em class="notation">Un-friended...</em></p>');
			});

			$('a', $cont).click(function(e) {
				e.preventDefault();

				var bo = new ngutils.blackout({remove_on_hide: true});
				bo.show(ngutils.blackout.spinner);
				bo.load($(this).attr('href'));

				return false;
			});
		};

		ngutils.friendship.registerManageButtons = function($container) {
			if (typeof($container) == 'string') $container = $($container);
			$container.removeAttr('id');

			var _user = $container.attr('data-friend');

			$manage = $('[data-action="manage"]', $container);
			$unfriend = $('[data-action="unfriend"]', $container);

			$manage.click(function() {
				var blackout = new ngutils.blackout({remove_on_hide: true});
				blackout.show(ngutils.blackout.spinner);
				blackout.load($(this).attr('href'));

				return false;
			});
			$unfriend.click(function() {
				if (confirm("Are you sure you want to unfriend "+_user+"?")) {
					$.post($(this).attr('href'), {userkey:PHP.get('uek')});
					ngutils.element.fancyRemove($container);
				}
				return false;
			});
		};

		ngutils.fave_follow = function(fave_type, selector, user_key, button_key) {
			var _this = this;
			var $element = $(selector);
			var waiting = false;

			this.common = null;

			var $reaction_button = $(".reaction-button", $element);
			var $reaction_options = $(".reaction-options", $element);
			var $reaction_emote = $(".reaction-emote", $element);
			var $reaction_text = $(".reaction-text", $element);

			var reaction_options_visible = false;
			var reactions_blackout = is_mobile ? new ngutils.blackout() : null;

			this.onRefresh = function(data, target) {};

			function showReactionOptions(e) {
				if (e) e.stopPropagation();
				$reaction_options.show();
				reaction_options_visible = true;

				if (is_mobile) {
					$reaction_options.remove();
					reactions_blackout.show($reaction_options);
					reactions_blackout.onHide(function() {
						if (reaction_options_visible) hideReactionOptions();
					});
					initEmoteButtons($reaction_options);
				}

				if (_this.common && _this.common.closeLinked) _this.common.closeLinked();
				return false;
			}

			function hideReactionOptions(e) {
				if (e) e.stopPropagation();

				var was_visible = reaction_options_visible;

				$reaction_options.hide();
				reaction_options_visible = false;

				if (is_mobile && was_visible) {
					reactions_blackout.hide();
				}
				return false;
			}

			this.hideReactionOptions = function() { hideReactionOptions(); };

			$reaction_button.click(function(e) {
				return reaction_options_visible ? hideReactionOptions(e) : showReactionOptions(e);
			});

			if (!is_mobile) $element.hover(showReactionOptions,hideReactionOptions);

			function initEmoteButtons($container) {

				var $add_button = $("a[data-action='add']", $container);
				var $remove_button = $("a[data-action='remove']", $container);
				$add_button.off('click');
				$remove_button.off('click');

				$add_button.on('click', function(e) {

					e.stopPropagation();
					if (waiting) return false;

					var extra_id = parseInt($(this).attr('data-extra-id'));

					waiting = true;

					var ajax_url = "/favorites/"+ngutils.fave_follow.types[fave_type]+"/add/"+button_key;

					if (typeof(extra_id) != 'undefined') ajax_url += "/extra/"+extra_id;

					var data = {
						fave_type: ngutils.fave_follow.types[fave_type],
						emote_text: $(this).attr('title'),
						emote_class: $('span', $(this)).first().attr('class')
					};


					ngutils.fave_follow.refreshListeners(button_key, true, extra_id, data, _this);

					var params = {userkey:user_key};
					if (PHP.get('ng_design')) params.___ng_design = PHP.get('ng_design');

					$.getJSON(ajax_url, params, function(data) {
						waiting = false;
						ngutils.fave_follow.refreshListeners(button_key, true, extra_id, data, _this);
						ngutils.reactions.refreshListeners(data.count_key, data, _this);
					}).fail(function() {
						waiting = false;
						ngutils.fave_follow.refreshListeners(button_key, false, extra_id, data, _this);
					});

					hideReactionOptions();
					return false;
				});

				$remove_button.on ('click', function(e) {
					e.stopPropagation();
					if (waiting) return false;

					waiting = true;

					var ajax_url = "/favorites/"+ngutils.fave_follow.types[fave_type]+"/remove/"+button_key;

					var data = {
						fave_type: ngutils.fave_follow.types[fave_type],
						emote_text: "React",
						emote_class: $('span',$(this)).first().attr('class')
					};

					ngutils.fave_follow.refreshListeners(button_key, false, 0, data, _this);

					var params = {userkey:user_key};
					if (PHP.get('ng_design')) params.___ng_design = PHP.get('ng_design');

					$.getJSON(ajax_url, params, function(data) {
						waiting = false;
						ngutils.fave_follow.refreshListeners(button_key, false, 0, data, _this);
						ngutils.reactions.refreshListeners(data.count_key, data, _this);
					}).fail(function() {
						waiting = false;
					});

					hideReactionOptions();
					return false;
				});
			}
			initEmoteButtons($element);

			this.refresh = function(active, extra_id, data, target) {
				if (data.fave_type === 'reaction') {
					$reaction_emote.attr('class', data.emote_class + " reaction-emote");
					$reaction_text.html(data.emote_text);

					if (!active) $reaction_text.removeClass('active');
					else $reaction_text.addClass('active');

					$('a.active', $reaction_options).removeClass('active');
					$('a[data-extra-id="'+extra_id+'"]', $element).addClass('active');

				} else {
					if (typeof(extra_id) === typeof(undefined) || isNaN(extra_id)) {
						$element.removeAttr('data-extra-id');
					} else {
						$element.attr('data-extra-id', extra_id);
					}
					if (active) $element.addClass('active');
					else $element.removeClass('active');
				}

				this.onRefresh(data, target);
			};

			ngutils.fave_follow.listeners[button_key] = ngutils.fave_follow.listeners[button_key] || [];
			ngutils.fave_follow.listeners[button_key].push(this);
		};

		ngutils.fave_follow.listeners = {};
		ngutils.fave_follow.FOLLOW = 1;
		ngutils.fave_follow.FAVORITE = 2;
		ngutils.fave_follow.REACTION = 3;

		ngutils.fave_follow.types = {};
		ngutils.fave_follow.types[ngutils.fave_follow.FOLLOW] = 'follow';
		ngutils.fave_follow.types[ngutils.fave_follow.FAVORITE] = 'favorite';
		ngutils.fave_follow.types[ngutils.fave_follow.REACTION] = 'reaction';

		ngutils.fave_follow.refreshListeners = function(button_key, active, extra_id, data, target) {
			if (ngutils.fave_follow.listeners[button_key]) {
				for (var i = 0, len = ngutils.fave_follow.listeners[button_key].length; i < len; i++) {
					ngutils.fave_follow.listeners[button_key][i].refresh(active, extra_id, data, target);
				}
			}
			if (data.dispatchEvent && data.dispatchEvent.event) {
				ngutils.event.dispatch(data.dispatchEvent.event, data.dispatchEvent.data);
			}
		};

		ngutils.initFollowButton = function(selector, user_key, button_key) {
			return new ngutils.fave_follow(ngutils.fave_follow.FOLLOW, selector, user_key, button_key);
		};

		ngutils.initFavoriteButton = function(selector, user_key, button_key) {
			return new ngutils.fave_follow(ngutils.fave_follow.FAVORITE, selector, user_key, button_key);
		};

		ngutils.initReactionButton = function(selector, user_key, button_key, common_id) {
			var ff = new ngutils.fave_follow(ngutils.fave_follow.REACTION, selector, user_key, button_key);
			ff.common = ngutils.initReactionLink(common_id, 'button', ff);
			return ff;
		};

		ngutils.reactions = {};
		ngutils.reactions.totals = {};

		ngutils.reactions.linked = [];

		ngutils.initReactionLink = function(common_id, prop, val) {
			if (!common_id) return null;
			if (!ngutils.reactions.linked[common_id]) ngutils.reactions.linked[common_id] = {};
			ngutils.reactions.linked[common_id][prop] = val;

			return ngutils.reactions.linked[common_id];
		};

		ngutils.reactions.refreshListeners = function(key, data, target) {
			if (ngutils.reactions.totals[key] && ngutils.reactions.totals[key].length > 0) {
				for(var i=0; i< ngutils.reactions.totals[key].length; i++) {
					var rt = ngutils.reactions.totals[key][i];

					rt.onAjaxUpdate(data);
				}
			}
		};

		ngutils.reactionBlackout = null;

		ngutils.initReactionTotals = function(selector, item_type, item_id, common_id, extra_id) {

			var key = item_type + "-" + item_id;

			if (!ngutils.reactions.totals[key]) ngutils.reactions.totals[key] = [];

			var $total = $(selector);

			var common = ngutils.initReactionLink(common_id, 'totals', $total);

			ngutils.reactions.totals[key].push($total);

			function hideTotals(e) {
				if (ngutils.reactionBlackout) {
					ngutils.reactionBlackout.onHide(null);
					ngutils.reactionBlackout.hide();
				}
				return false;
			}

			common.closeLinked = $total.closeDetails = function() {
				hideTotals();
			};

			function showTotals(e) {

				if (e) e.stopPropagation();

				if (common && common.button) common.button.hideReactionOptions();

				var base_url = "/favorites/reactions/type/"+item_type+"/id/"+item_id;

				if (ngutils.reactionBlackout) ngutils.reactionBlackout.hide();
				ngutils.reactionBlackout = new ngutils.blackout({remove_on_hide: true});
				ngutils.reactionBlackout.show(ngutils.blackout.spinner);
				ngutils.reactionBlackout.onHide(hideTotals);

				$.get(base_url, function(data) {

					if (!data) return;

					$child = $(data);
					ngutils.reactionBlackout.show($child);

					ngutils.initReactionUsers(item_type, item_id, $child);
				});

				return false;
			}

			$total.click(function(e) {

				if (extra_id === null) {
					return showTotals(e);
				}

				ngutils.showReactionUsers(item_type, item_id, extra_id);
				return false;
			});

			$total.onAjaxUpdate = function(data) {
				extra_id = data.inner_extra_id;
				$total.html(data.count_html);
				$total.closeDetails();
			};
		};

		ngutils.showReactionUsers = function(item_type, item_id, extra_id) {
			if (ngutils.reactionBlackout) {
				ngutils.reactionBlackout.fade_out = false;
				ngutils.reactionBlackout.hide();
			}
			ngutils.reactionBlackout = new ngutils.blackout({remove_on_hide: true, fade_in: false});

			var url = "/favorites/reactions/type/"+item_type+"/id/"+item_id+"/reaction/"+extra_id;
			ngutils.reactionBlackout.show(ngutils.blackout.spinner);
			ngutils.reactionBlackout.load(url);
		};

		ngutils.initReactionUsers = function(item_type, item_id, $child) {
			if (!$child) $child = $('body').first();
			else if (typeof($child) == 'string') $child = $($child);

			$('[data-extra-id]', $child).click(function(e) {
				if (e) {
					e.preventDefault();
					e.stopPropagation();
				}
				var extra_id = $(this).attr('data-extra-id');

				ngutils.showReactionUsers(item_type, item_id, extra_id);
				return false;
			});
		};

		ngutils.emote = {};

		ngutils.emote.clickSelector = function($input,$icon,event) {
			if (event) event.preventDefault();

			$input = $($input);
			$icon = $($icon);
			let selected = $input.val();

			let uri = "/emoteselect";
			if (selected) uri += "/" + selected;

			let bo = new ngutils.blackout({remove_on_hide:true});
			let $selector;

			let init = function() {
				let $inputs = $("input[type='radio']", $selector);

				$inputs.change(() => {
					let $checked = $('input[type="radio"]:checked', $selector).first();
					$input.val($checked.val());
					let _for = $checked.attr('id');
					let $label = $('label[for="'+_for+'"]', $selector);
					let $span = $('span',$label);
					$icon.attr('class', $span.attr('class'));
					bo.hide();
				});

				// forums listen for this
				ngutils.event.dispatch(ngutils.event.emoteSelectLoaded, $inputs);
			};

			bo.load(uri, function() {
				$selector = $('#active-emote-selector', bo.getLayerElement()).removeAttr('id');
				init();

				ngutils.event.addListener(ngutils.event.emoteSetChanged, function($select) {
					if ($selector.has($select)) init();
				});

			});
		};

		/**
		 *
		 */
		ngutils.flagging_options = {};
		ngutils.flagging_options.blackout = new ngutils.blackout({
			"remove_on_hide": true
		});

		ngutils.flagging_options.close = function(callback) {

			if (PHP.get('nodimming')) {
				PHP.get('nodimming').addClass('nodimming');
			}

			if (typeof callback === 'function') {
				callback();
			} else {
				ngutils.flagging_options.blackout.hide();
				return false;
			}
		};

		ngutils.flagging_options.watchFormPage = function() {

			var commentIsRequired = function() {
				return $.rInArray(parseInt($('#flag_form input[type="radio"]:checked').val(), 10), PHP.get('flag_types_needing_comment'));
			};

			var setUpCommentRequired = function() {
				if (commentIsRequired()) {
					$('#flag_form span.required').show();
					$('#flag_comment').attr('required', true);
				} else {
					$('#flag_comment').removeAttr('required');
					$('#flag_form span.required').hide();
				}

				return true;
			};


			var that;

			if ($('#flag_comment').exists()) {
				$('#flag_comment').on('focus blur', setUpCommentRequired).focus();
			}

			$('#flag_form input[type="radio"]').off('click').on('click', setUpCommentRequired);

			$('#flag_form').on('submit', function() {
				that = $(this);

				$(this).ajaxSubmit(function(response) {
					var element = $('#' + PHP.get('flag_element_clicker'));

					if (response && response.url) {
						element.attr('href', response.url);
					// this could be a private message, which doesn't get an edit url...
					// they can only flag once
					} else if (element && element.exists()) {
						element.remove();
					}

					ngutils.flagging_options.close(function() {
						if (response.success) {
							ngutils.flagging_options.blackout.show($(response.success));
						} else {
							alert("Your report has been submitted!");
							ngutils.flagging_options.blackout.hide();
						}
					});
				});

				return false;
			});

			// when they exit out of the window itself
			$('#flag_close').on('click', ngutils.flagging_options.close);
		};

		ngutils.flagging_options.register = function(object, data) {
			data = data || {};

			$(object).on('click', function() {
				// we have to store this, it conflicts with loading in content
				if ($('.nodimming').exists()) {
					PHP.set('nodimming', $('.nodimming'));
				}

				// keep track of which element clicked this
				PHP.set('flag_element_clicker', $(this).attr('id'));


				ngutils.flagging_options.blackout.load(this.href, data, function(response) {
					if ($('.nodimming').exists()) {
						$('.nodimming').removeClass('nodimming');
					}
					// start watching click options etc
					ngutils.flagging_options.watchFormPage();
				});

				return false;
			});
		};

		/**
		 * This is a set of methods that apply to shared content links -
		 * at the moment these are just in the head section of pods
		 * for items in each of the portals.
		 */
		ngutils.sharebox = {};
		ngutils.sharebox.blackout = null;

		/**
		 * Watches the form that's opened and listens for any close clicks,
		 * copying of text to the clipboard, etc.
		 *
		 */
		ngutils.sharebox.watch = function() {
			var iOS = /iPad|iPhone|iPod/g.test(navigator.userAgent) && !window.MSStream;

			var iOSCopyText = function(el) {
				var n, contentEditable = el.contentEditable, readOnly = el.readOnly, d = el.disabled;

				el.contentEditable = true;
				el.readOnly = false;
				el.disabled = false;


				var range = document.createRange();
				range.selectNodeContents(el);

				var s = window.getSelection();
				s.removeAllRanges();
				s.addRange(range);

				el.setSelectionRange(0, 999999);

				el.contentEditable = contentEditable;
				el.readOnly = readOnly;
				el.disabled = d;

				document.execCommand('copy');
			};

			var copyText = function($select_input, $confirmation_object) {
				var content = $select_input.val();

				// select, copy, then deselect the field
				if (!iOS) {
					$select_input.select();
					document.execCommand("copy");
					$select_input.selectionEnd = $select_input.selectionStart;
					$select_input.blur();
				} else {
					iOSCopyText($select_input[0]);
				}

				if ($confirmation_object && $confirmation_object.length) {
					$confirmation_object.show();
					setTimeout(function() {
						$confirmation_object.fadeOut(500);
					}, 750);
				}
			};

			var pod = $('#share_content_pod');

			$("[data-action='copy-input']").each(function() {
				var $element = $(this);
				$element.removeAttr('data-action');

				var $input = $('input', $element);
				var $a = $('a',$element);

				var doCopy = function() {
					copyText($input, $(".check-fader", $a));
				};

				if (iOS) {
					// prevent the keyboard from firing
					$input.prop('readonly', true);

					// prevent selection of the text
					$input.css( {
						'-webkit-touch-callout': 'none',
						'-webkit-user-select': 'none',
						'-webkit-tap-highlight-color': 'rgba(0,0,0,0)'
					});
				}

				$input.click(doCopy);
				$a.click(doCopy);

				// any attempt to change this will revert the value
				$input.keypress(function() {
					return false;
				});

			});

		};


		/**
		 * Add an html element to watch for clicks - this opens up the
		 * share pod.
		 */
		ngutils.sharebox.register = function($el) {
			if (null === ngutils.sharebox.blackout) {
				ngutils.sharebox.blackout = new ngutils.blackout({
					"remove_on_hide": true
				});
			}

			$el.click(function() {
				var h = this.href;
				ngutils.sharebox.blackout.load(h, null, function(response) {
					ngutils.sharebox.watch();
				});

				return false;
			});
		};

		/**
		 * Playlist launcher and handler for the launched form.
		 */
		ngutils.playlist_form = {};
		ngutils.playlist_form.blackout = null;

		ngutils.playlist_form.watch = function() {
			var pod = $('#playlist_add');
			var myform = $('form', pod);

			myform.submit(function() {
				$(this).ajaxSubmit(function(response) {
					if (response && response.url) {
						window.location.href = response.url;
					} else {
						ngutils.playlist_form.blackout.hide();
					}
				});
			});

			$('a.icon-close', pod).click(function() {
				ngutils.playlist_form.blackout.hide();
			});
		};

		ngutils.playlist_form.register = function($el) {
			if (null === ngutils.playlist_form.blackout) {
				ngutils.playlist_form.blackout = new ngutils.blackout({
					"remove_on_hide": true
				});
			}

			$el.click(function() {
				var h = this.href;
				ngutils.playlist_form.blackout.load(h, null, function(response) {
					ngutils.playlist_form.watch();
				});

				return false;
			});
		};


		ngutils.forms = {};

		// This is a hack to get around date inputs not having any placeholders on mobile
		ngutils.forms.registerDateInput = function(input) {
			var $input = $(input);

			if ($input.attr('data-registered')) return;

			function onChange() {
				if ($input.val()) {
					$input.addClass('date-focused');
				} else {
					$input.removeClass('date-focused');
				}
			}

			$input.attr('data-registered', 1);
			$input.change(onChange);

			onChange();
		};

		ngutils.forms.selectAltLabels = {};
		ngutils.forms.selectAltLabels.autodetect = function() {
			$(".select-wrapper.alternate-label").each(function() {
				let $select = $('select',$(this));
				let $label = $('span.label',$(this));
				function updateMe() {
					let $option = $('option[value="'+$select.val()+'"]', $select);
					let txt;
					if ($option.is('[data-label]')) {
						txt = $option.attr('data-label');
					} else {
						txt = $option.html();
					}
					$label.html(txt);
				}

				$select.change(function() {
					updateMe();
				});

				updateMe();
			});
		};

		ngutils.forms.selectLinks = {};
		ngutils.forms.selectLinks.autodetect = function() {
			$('[data-select-links]').change(function() {
				var url = ($(this).val());
				if (url) {
					window.location = url;
				}
			});
		};

		ngutils.forms.fakeSelect = {};

		ngutils.forms.fakeSelect.autodetect = function() {
			$('.faux-select:not(.ready)').each(function() {
				$(this).addClass('ready');
				var select = $(this);
				var options = $('span.options', select);
				var bubble = true;

				ngutils.event.addListener(ngutils.event.closeall, function() {
					if (bubble) select.removeClass('expanded');
					bubble = true;
				});

				$('a',$(this)).click(function() {
					bubble = false;
				});

				$('ul',$(this)).click(function() {
					if (bubble) return false;
				});

				$(this).click(function() {

					if ($(this).hasClass('expanded')) {
						$(this).removeClass('expanded');
					} else {
						ngutils.event.dispatch(ngutils.event.closeall);
						$(this).addClass('expanded');

						options.outerWidth(select.outerWidth());
					}
					if (bubble) return false;
				});

				$(window).scroll(function() {
					if (select.hasClass('expanded')) {
						select.removeClass('expanded');
					}
				});
			});
		};

		ngutils.image = {
			view: (src, event)=>{
				if (event) event.preventDefault();

				let img = new Image();
				img.onload = ()=>{

					let start_at = {};
					let drag = false;
					let $container;

					let bo = new ngutils.blackout({remove_on_hide:true});
					bo.show(img);

					if (is_mobile) {
						$(img).click(()=>{ bo.hide(); });
					} else {
						bo.onRemove(()=>{
							$(img).off(ngutils.input.mouseDown, startDrag);
							$(document).off(ngutils.input.mouseMove, doDrag);
							$(document).off(ngutils.input.mouseUp, endDrag);
						});

						let doDrag = (e)=>{
							if (drag) {
								let mx = e.pageX - drag.x;
								let my = e.pageY - drag.y;
								drag = {x: e.pageX, y: e.pageY};

								bo.$elements.hover.scrollLeft(bo.$elements.hover.scrollLeft() - mx);
								bo.$elements.hover.scrollTop(bo.$elements.hover.scrollTop() - my);
							}
						};
						let startDrag = (e)=>{
							start_at.x = e.pageX;
							start_at.y = e.pageY;
							drag = start_at;
							return false;
						};
						let endDrag = (e)=>{
							drag = false;
							if (start_at.x === e.pageX && start_at.y === e.pageY) bo.hide();
						};

						$(img).on(ngutils.input.mouseDown, startDrag);
						$(document).on(ngutils.input.mouseMove, doDrag);
						$(document).on(ngutils.input.mouseUp, endDrag);
					}
				};
				img.src = src;
			}
		};

		ngutils.element = {};

		// note: $element needs to be in the dom before calling this
		ngutils.element.fancyAdd = function($element, callback, delay) {
			let height = $element.height();
			$element.show();
			$element.height(0);
			$element.hide();

			if (typeof(callback) === 'number') {
				delay = callback;
				callback = null;
			}

			let doFancyAdd = function() {
				$element.show().css('visibility','hidden');
				$element.animate({height: height}, 150, function() {
					$element.hide().css('height','').css('visibility','').fadeIn(300, ()=>{
						if (callback) callback();
					});
				});
			};

			if (delay) {
				setTimeout(doFancyAdd, delay);
			} else {
				doFancyAdd();
			}
		};

		ngutils.element.fancyHide = function($element, callback, delay) {
			if (typeof(callback) === 'number') {
				delay = callback;
				callback = null;
			}

			if (delay) {
				setTimeout(()=>{
					ngutils.element.fancyRemove($element, callback);
				}, delay);
				return;
			}
			$element.fadeOut(300, function() {
				$element.show();
				$element.css('visibility','hidden');
				$element.animate({height: 0}, 150, function() {
					$element.css('visibility','').css('height','').hide();
					if (callback) callback();
				});
			});
		};

		ngutils.element.fancyRemove = function($element, callback, delay) {

			if (typeof(callback) === 'number') {
				delay = callback;
				callback = null;
			}

			if (delay) {
				setTimeout(()=>{
					ngutils.element.fancyRemove($element, callback);
				}, delay);
				return;
			}
			$element.fadeOut(300, function() {
				$element.show();
				$element.css('visibility','hidden');
				$element.animate({height: 0}, 150, function() {
					$element.remove();
					if (callback) callback();
				});
			});
		};

		ngutils.element.isOnScreen = function($element, buffer, fixed) {
			if (!buffer) buffer = 0;
			$element = $($element);

			var eTop;
			if (fixed) eTop = $element.position().top;
			else eTop = $element.offset().top;

			var eBot = eTop + $element.outerHeight();

			var wTop = fixed ? 0 : $(window).scrollTop();
			var wBot = wTop + $(window).height();

			return ((eTop - buffer < wBot) && (eBot + buffer > wTop));
		};

		ngutils.element.loadWhenOnscreen = function($element, ajax_url, scroll_buffer, $container) {
			$element = $($element);

			var _this = this;
			this.onReady = function() {};
			this.onScrolledTo = function() {};
			this.onLoaded = function() {};
			this.onComplete = function() {};
			this.onFailed = function() {};

			var wos = ngutils.element.whenOnscreen($element, function() {
				if (_this.onScrolledTo() === false) {
					_this.onComplete();
					return;
				}

				if (ajax_url) {
					$.get(ajax_url, function(data) {
						if (_this.onLoaded(data) === false) {
							_this.onComplete();
							return;
						}

						$element.replaceWith(data);
						$('body').hide().show(0); /* hack for chrome. forces screen redraw */
						_this.onComplete();

					}).fail(function(e) {
						_this.onFailed(e);
					});
				}
			}, scroll_buffer, $container);

			setTimeout(function() {
				wos.onReady = _this.onReady;
			}, 3);

			return this;
		};

		ngutils.element.whenOnscreen = function($element, callback, scroll_buffer, $container) {

			$element = $($element);
			var _this = this;
			this.onReady = function() {};

			if (!$container) {
				$container = $element.closest(".blackout-hover");
				if ($container.length < 1) $container = $(window);
			}
			var fixed = $container[0] !== window;

			function onScroll(e) {
				if (ngutils.element.isOnScreen($element, scroll_buffer, fixed)) {

					$container.off('scroll',onScroll);

					if (callback) callback();
				}
			}

			setTimeout(function() {
				if ($element.length === 1) {

					if (_this.onReady() === false) return;

					$container.on('scroll',onScroll);
					onScroll();
				} else {
					console.warn("Invalid element");
				}
			}, 5);

			return this;
		};

		ngutils.element.autoCondense = function() {
			$('.condensed').each(function() {
				ngutils.element.condense($(this));
			});
		};

		ngutils.element.condense = function(element, more_text) {
			var $condensed = $(element);
			if (!$condensed || $condensed.length < 1) return;

			var $parent = $condensed.parent();
			var position = $parent.css('position').toLowerCase();
			if (position != 'fixed' && position != 'absolute' && position != 'relative') {
				$parent.css('position','relative');
			}

			// grab the current max height
			var max_height = parseInt($condensed.css('max-height').replace(/[^-\d\.]/g, ''));

			// set the element to full height
			$condensed.removeClass('condensed');
			$condensed.css('max-height', "100%");

			if (isNaN(max_height) || max_height < 1) return;

			var full_height = $condensed.height();

			var height_allowance = 140; // this is how far past max_height we can go and still skip the collapse functionality.

			if (full_height - height_allowance <= max_height) return; // this pod is short enough to skip the collapse functionality.

			$condensed.addClass('condensed-processed'); // we use this class to avoid duplicate processing
			$condensed.css('max-height', max_height);


			if (!more_text) more_text = $condensed.attr("data-expand-text");
			if (!more_text) more_text = "Read More...";

			var $expand = $("<div>", {class: "expand-condensed", html: more_text});
			$expand.click(function() {
				$condensed.css("max-height", "100%");
				$condensed.trigger('expanded');
				$(this).remove();
			});
			$condensed.after($expand);
		};

		ngutils.element.editable = function(element, editing) {
			var $e = $(element);
			var editable = this;
			var $toggle_btn;
			var toggle_params = [null,null];

			this._editing = editing ? true:false;

			this.setEditing = function(ed) {
				$e.removeClass('edit-on').removeClass('edit-off');
				if (ed) $e.addClass('edit-on');
				else $e.addClass('edit-off');
				editable._editing = ed ? true:false;

				if ($toggle_btn && $toggle_btn.length > 0) {
					var i = editable._editing ? 1:0;
					$toggle_btn.html(toggle_params[i]);
				}
				return this;
			};

			this.toggle = function() {
				if (editable._editing) this.setEditing(false);
				else this.setEditing(true);
				return this;
			};

			this.setToggleButton = function(button, edit_text, noedit_text, callback, thisArg) {
				$toggle_btn = $(button);

				if (!noedit_text) noedit_text = $toggle_btn.html();
				if (!edit_text) edit_text = noedit_text;

				toggle_params[0] = noedit_text;
				toggle_params[1] = edit_text;
				toggle_params[2] = typeof(callback) == 'function' ? callback : null;
				toggle_params[3] = thisArg ? thisArg : $toggle_btn;

				this.setEditing(this._editing);

				$toggle_btn.click(function(e) {
					editable.toggle();
					if (toggle_params[2]) {
						return toggle_params[2].call(toggle_params[3], e);
					} else {
						return false;
					}
				});

				return this;
			};

			if (editing) this.setEditing(editable._editing);
			else if ($e.hasClass('edit-on')) this.setEditing(true);
			else this.setEditing(false);
		};
		ngutils.element.editable.prototype = {
			get editing() {
				return this._editing;
			},
			set editing(editing) {
				this.setEditing(editing);
			}
		};

		ngutils.media = {};

		ngutils.media.smartscale = function($element) {

			if (!$element.attr('data-smart-scale')) return;
			var dimensions = $element.attr('data-smart-scale').split(",");

			var width = dimensions[0].indexOf("%") < 0 ? parseInt(dimensions[0]) : dimensions[0];
			var height = dimensions[1].indexOf("%") < 0 ? parseInt(dimensions[1]) : dimensions[1];
			var cw = null;

			var $closest = $element.parent();

			var parent_selectors = ['.scale-to-this','.blog-embed-left', 'p', '.blog-post-body', '.ql-body', '.pod-body'];
			var s, $p;

			for(s=0; s<parent_selectors.length; s++) {
				$p = $element.closest(parent_selectors[s]);
				if ($p && $p.length > 0 && ($p.width() > 0 || $p.attr('data-scale-width'))) {
					$closest = $p;
					break;
				}
			}

			// we can't scale this, it might need to try again
			if (!$closest.width() && !$closest.attr('data-scale-width')) {
				// just to get the image showing at all...
				$element.css('width','100%');
				return false;
			}

			$element.removeAttr('data-smart-scale');

			function setDimensions() {
				var pw = $closest.attr('data-scale-width') ? parseFloat($closest.attr('data-scale-width')) : $closest.width();
				$closest.removeAttr('data-scale-width');

				if (pw === cw) return;

				var nw = width;
				var nh = height;

				if (typeof(nw) == 'number' && pw < width) {
					nw = pw;

					if (typeof(nh) == 'number') {
						var scale = pw/width;
						nh = Math.round(height * scale);
					}
				}

				if (nw == cw) return;

				var css_class = 'media-block-center';

				var css_inline = {
					'width': nw,
					'height': nh
				};

				if (!is_mobile && pw > nw && nw < pw/2)	css_class = 'media-inline-auto';

				$element.removeClass('media-inline-auto');
				$element.removeClass('media-block-center');

				// if the image is centered, and located inside an ng-img-container element, apply the class to that instead of the image.
				var $media_element = $element;
				if (css_class == 'media-block-center') {
					var $img_container = $element.parent('.ng-img-container').first();
					if ($img_container.length > 0) {
						$media_element = $img_container;
					}
				}
				$media_element.addClass(css_class);
				$element.css(css_inline);

				cw = nw;
				$element[0].dispatchEvent(new Event('rescaled'));
			}

			if (is_mobile) {
				$(window).resize(setDimensions);
			}

			setDimensions();

			this.refresh = function() {
				setDimensions();
			};
		};

		ngutils.media.smartscale.autodetect = function() {
			$('[data-smart-scale]').each(function() {
				new ngutils.media.smartscale($(this));
			});
		};

		ngutils.media.smartload = function($element) {
			var self = this;
			var src = $element.attr('data-smartload-src');
			var y_buffer = 400;
			var $container = $element.closest("div[class^='condensed']");
			if (!$container || $container.length < 1) $container = null;

			if ($container) {
				var cropped_at = $container.offset().top + $container.innerHeight();

				if ($element.offset().top < cropped_at) $container = null;
			}

			$element.removeAttr('data-smartload-src');
			ngutils.element.whenOnscreen($element, ()=>{
				$element.attr('src',src);
				if ($element.attr('data-smartload-event')) {
					ngutils.event.dispatch($element.attr('data-smartload-event'), $element);
				}
			}, y_buffer);

		};

		ngutils.media.smartload.autodetect = function() {
			$('[data-smartload-src]').each(function() {
				new ngutils.media.smartload($(this));
			});
		};

		ngutils.media.item = function(id) {
			this.id = id ? id:null;
			this.sources = {};
		};

		ngutils.media.item.prototype = {
			qualities: [],
			addSource: function(src, type, quality) {

				if (!quality) quality = this.qualities[0];
				if (this.qualities.indexOf(quality) < 0) console.error("Invalid media quality: "+quality);

				if (!this.sources[quality]) this.sources[quality] = [];
				this.sources[quality].push({src:src, type:type});
			},
			getAvailableQualities: function() {
				var qs = [];
				for(var i=0;i<this.qualities.length;i++) {
					if (this.sources[this.qualities[i]]) qs.push(this.qualities[i]);
				}
				return qs;
			}
		};

		ngutils.media.audio = function(){
			ngutils.media.item.apply(this, arguments);
			this.qualities = ['mp3'];
			this.type = 'audio';
			this.html = "";

			var self = this;
			var base_url = "/audio/load/";

			// should only be used by global player, standalone players can set properties in advance
			this.load = function(callback) {

				var data = {};
				if (PHP.get('ismobile')) data.isMobile = true;

				$.ajax({
					dataType: "json",
					url: base_url + this.id,
					async: true,
					data: data,
					success: function(data) {

						if (data.error) {

							console.error(data.error);

						} else if (data.html && data.sources) {

							for(var i=0; i<data.sources.length; i++) {
								self.addSource(data.sources[i].src, data.sources[i].type);
							}
							self.html = data.html;

							if (typeof(callback) == 'function') callback();
						} else {
							console.error("Unexpected Server Response from "+base_url+self.id, data);
						}
					}
				});
			};
		};
		ngutils.media.audio.prototype = Object.create(ngutils.media.item.prototype);
		ngutils.media.audio.prototype.constructor = ngutils.media.audio;

		Object.defineProperty(ngutils.media.audio, 'volume', {

			get: function() {
				var vol = ngutils.local.getItem('ng-audio-vol', 1);
				vol = parseFloat(vol);
				if (isNaN(vol)) vol = 1;
				return vol;
			},
			set: function(vol) {
				vol = parseFloat(vol);
				if (isNaN(vol)) vol = 1;
				ngutils.local.setItem('ng-audio-vol', vol);
			}

		});

		ngutils.media.video = function(){
			ngutils.media.item.apply(this, arguments);
			this.qualities = ['1080p','720p','360p'];
			this.type = 'video';
		};
		ngutils.media.video.prototype = Object.create(ngutils.media.item.prototype);
		ngutils.media.video.prototype.constructor = ngutils.media.video;


		ngutils.media.playlist = function(type) {
			this._items = [];
			this._shuffled = [];
			this._shuffle = false;
			this._current_index = 0;
			this.type = type;
		};

		ngutils.media.playlist.prototype = {
			addMedia: function(title, callback) {
				var source;
				switch(this.type) {
					case 'audio':
						source = new ngutils.media.video(title);
						break;
					case 'video':
						source = new ngutils.media.audio(title);
						break;
					default:
						throw("Invalid media type: "+this.type);
				}

				if (typeof(callback) == 'function') callback(source);

				this.add(source);
				return this;
			},
			add: function(media_item) {
				var i = this._items.length;
				this._items.push(media_item);
			},
			clear: function() {
				this._items = [];
				this._shuffled = [];
				this._shuffle = false;
				this._current_index = 0;
			},
			_doshuffle: function() {
				this._shuffled = [];

				var j, x, i;

				for (i = 0; i<this._items.length; i++) {
					if (this._shuffled.length) {
						x = Math.floor(Math.random() * this._shuffled.length);
						this._shuffled.splice(x, 0, i);
					} else {
						this._shuffled.push(i);
					}
				}
			},
			toggleShuffle: function() {
				this.shuffle(!this._shuffle);
				if (this._shuffle) this._doshuffle();
			},
			shuffle: function(shuffle) {
				if (typeof(shuffle) === typeof(undefined)) return this._shuffle;

				shuffle = shuffle ? true:false;
				if (shuffle != this._shuffle) {
					this._current_index = 0;
					this._shuffle = shuffle;
					if (this._shuffle) this._doshuffle();
				}
				return this;
			},
			setCurrentItem: function(media) {
				var bookmark = this._current_index;
				for(this._current_index=0; this._current_index<this._items.length; this._current_index++) {
					if (this.getCurrentItem() == media) {
						return true;
					}
				}
				this._current_index = bookmark;
				return false;
			},
			getCurrentItem: function() {
				if (this._current_index < 0 || this._current_index >= this._items.length) return null;

				if (this._shuffle) {
					return this._items[this._shuffled[this._current_index]];
				}
				return this._items[this._current_index];
			},
			forward: function(can_loop) {
				if (this._current_index >= 0) this._current_index++;
				else this._current_index = 0;

				if (this._current_index >= this._items.length) {
					if (!can_loop) {
						return null;
					}
					this._current_index = 0;
				}
				return this.getCurrentItem();
			},
			reverse: function(can_loop) {
				if (this._current_index < this._items.length) this._current_index--;
				else this._current_index = this._items.length-1;

				if (this._current_index < 0) {
					if (!can_loop) {
						return null;
					}
					this._current_index = this._items.length-1;
				}
				return this.getCurrentItem();
			}
		};

		ngutils.media.getPlaylist = function(type) {
			var playlist = new ngutils.media.playlist();
			playlist.type = type == 'video' ? 'video':'audio';
			return playlist;
		};

		ngutils.media.player = function($player_element, $controls_element, $display_element) {

			this.wait_for_async = false;
			this.$player_element = null;
			this.$controls_element = null;
			this.$display_element = null;
			this.controls = null;
			this.type = null;
			this.autoplay = false;
			this._loop = false;
			this._shuffle = false;
			this.active = false;
			this.playing = false;
			this.paused = false;
			this.skip_forward_time = 15;
			this.skip_back_time = 15;
			this.media_playlist = null;
			this.current_media_item = null;
			this.quality = "default";

			if (!$player_element) throw('Missing $player_element');
			if (typeof($player_element) == 'string') $player_element = $("#"+$player_element);

			if (!$controls_element && !$player_element.is('audio')) {
				$controls_element = $player_element;
				$player_element = $('audio', $controls_element).first();
			}
			if (!$display_element) {
				$display_element = $('.media-player-display', $controls_element).first();
			}

			// event functions associated with control interface
			this.onPressPlay = function() {};
			this.onPressStop = function() {};
			this.onPressPause = function() {};
			this.onPressSkipForward = function() {};
			this.onPressSkipBack = function() {};
			this.onPressPlayNext = function() {};
			this.onPressPlayPrevious = function() {};
			this.onPressLoop = function() {};
			this.onPressFullscreen = function() {};
			this.onPressShuffle = function() {};
			this.onTimeChange = function(newtime) {};
			this.onVolumeChange = function(newvolume) {};

			// event functions associated with playback
			this.onPlaybackStarted = function() {}; // player has started playing first media item
			this.onPlaybackEnded = function() {}; // player has stopped playing any media
			this.onLoopEnabled = function() {}; // looping has been enabled
			this.onLoopDisabled = function() {}; // looping has been disabled
			this.onShuffleEnabled = function() {}; // suffling has been enabled
			this.onShuffleDisabled = function() {}; // suffling has been disabled
			this.onMediaPaused = function(media) {}; // a specific media file was paused
			this.onMediaUnpaused = function(media) {}; // a specific media file was unpaused
			this.onMediaStarted = function(media) { }; // a specific media file has started playing
			this.onMediaEnded = function(media) { }; // a specific media file has ended
			this.onMediaLoaded = function(media) { }; // a specific media file was loaded

			this.setCurrentTitle = function(){}; // gets overriden when a control UI is registered

			this.registerAudioElement($player_element);
			if ($controls_element) this.registerControls($controls_element);
			if ($display_element) this.registerDisplay($display_element);
		};

		ngutils.media.player.prototype = {

			activate: function() {
				this.active = true;
				this.$controls_element.addClass('active');
			},

			deactivate: function() {
				this.active = false;
				this.$controls_element.removeClass('active');
			},

			loop: function(loop) {
				if (typeof(loop) === typeof(undefined)) {
					return this._loop;
				}
				this._loop = loop ? true:false;
				if (this._loop) {
					this.onLoopEnabled();
				} else {
					this.onLoopDisabled();
				}

				this.updateControls();
				return this;
			},

			/* this needs work */
			shuffle: function(shuffle) {
				if (typeof(shuffle) === typeof(undefined)) {
					return this._shuffle;
				}

				this._shuffle = shuffle ? true:false;
				if (this._shuffle) {
					this.onShuffleEnabled();
				} else {
					this.onShuffleDisabled();
				}

				if (this.media_playlist) this.media_playlist.shuffle(this._shuffle);
				this.updateControls();
				return this;
			},

			endMedia: function() {

				// media was just stopped
				if (this.playing || this.paused) {
					this.onMediaEnded(this.current_media_item);
				}
				this.playing = false;
				this.paused = false;
			},

			updateControls: function() {
				this.controls.play.removeClass('active');
				this.controls.pause.removeClass('active');
				this.controls.play_pause.removeClass('active');
				this.controls.play_pause.removeClass('paused');
				this.controls.shuffle.removeClass('active');
				this.controls.loop.removeClass('active');
				this.controls.fullscreen.removeClass('active');

				if (this.playing) {
					this.controls.play.addClass('active');
					this.controls.play_pause.addClass('active');
				} else if (this.paused) {
					this.controls.play_pause.addClass('active');
					this.controls.play_pause.addClass('paused');
					this.controls.pause.addClass('active');
				}

				if (this.media_playlist) {
					this.controls.play_next.show();
					this.controls.play_previous.show();
					this.controls.shuffle.show();
				} else {
					this.controls.play_next.hide();
					this.controls.play_previous.hide();
					this.controls.shuffle.hide();
				}

				if (this.loop()) {
					this.controls.loop.addClass('active');
				}

				if (this.shuffle()) {
					this.controls.shuffle.addClass('active');
				}

				if (this.controls.position_bar) this.controls.position_bar.updateBarBounds();
			},

			setDisplay: function(html) {
				if (this.$display_element) this.$display_element.html(html);
			},

			setStopped: function() {

				this.endMedia();

				if (this.active) {
					this.onPlaybackEnded();
				}
				this.deactivate();
				this.updateControls();
			},

			setPlaying: function() {
				// media was unpaused
				if (!this.active) {
					this.onPlaybackStarted();
				}
				if (!this.playing && this.paused) {
					this.onMediaUnpaused(this.current_media_item);
				} else if (!this.playing) {
					this.onMediaStarted(this.current_media_item);
				}

				this.activate();
				this.playing = true;
				this.paused = false;
				this.updateControls();
			},

			setPaused: function() {
				// media was just paused
				if (this.playing && !this.paused) {
					this.onMediaPaused(this.current_media_item);
				}
				this.playing = false;
				this.paused = true;
				this.updateControls();
			},

			setMedia: function(media_item) {

				var $player = this.$player_element;
				var self = this;

				if (!$player || $player.length < 1) return false;

				if (this.current_media_item == media_item) return false;

				this.initForAsynch(function() {
					media_item.load(function() {
						self.onMediaLoaded(media_item);
						self.doSetMedia(media_item);
					});
				});
			},

			initForAsynch: function(callback) {
				var $player = this.$player_element;
				var self = this;

				if ($('source', $player).length < 1) {

					// apparently (on mobile) you have to force a source during the click event even if it will not play...
					var sources = [];
					if ($player.is('audio')) {
						sources.push({src:PHP.get('www_root')+"/content/micro.mp3", type:"audio/mpeg"});
					}
					if (sources.length > 0) {
						this.wait_for_async = true;
						this.setCurrentSources(sources);
						setTimeout(function() {
							//$player[0].play(); this apparently doesn't need to actually happen, WTF
							self.wait_for_async = false;

							callback();
						}, 150);
						return;
					}
				}

				callback();
			},

			setCurrentSources: function(sources) {
				var $player = this.$player_element;
				$player.html("");

				var $source;
				for(i=0; i<sources.length; i++) {
					$source = $("<source/>");
					$source.attr('src', sources[i].src);
					$source.attr('type', sources[i].type);
					$player.append($source);
				}

				$player[0].pause();
				$player[0].load();
				$player[0].currentTime = 0;
			},

			doSetMedia: function(media_item) {

				this.current_media_item = media_item;

				var $player = this.$player_element;
				var i, q = null;
				// get quality that matches player setting, or highest quality available if no match is found
				var qa = media_item.getAvailableQualities();
				for(i=0;i<qa.length;i++) {
					if (!q) q = qa[i];
					if (qa[i] == this.quality) {
						q = qa[i];
						break;
					}
				}
				var sources = media_item.sources[q];

				this.setCurrentSources(sources);
				this.setCurrentTitle(media_item.title);

				var self = this;
				if ((!this.playing && self.autoplay) || this.playing) {
					setTimeout(function() {
						self.play();
					}, 150);
				}

				return (sources.length > 0);
			},

			setPlaylist: function(media_playlist) {
				this.media_playlist = media_playlist;
				if (media_playlist)	{
					media_playlist.shuffle(this.shuffle());
					this.setMedia(media_playlist.getCurrentItem());
				}
			},

			canPlay: function() {
				var $player = this.$player_element;
				if (!$player || $player.length < 1) return false;

				var canplay = false;
				$('source', $player).each(function() {
					var format = $(this).attr('type');
					var c = $player[0].canPlayType(format);
					if (c == 'probably' || c == 'maybe') canplay = c;
				});

				return canplay ? canplay:false;
			},

			initVolume: function() {
				var volume = ngutils.media.audio.volume;
				this.$player_element[0].volume = volume;
				this.controls.volume_bar.setPosition(volume);
			},

			setVolume: function(volume) {
				if (volume > 1) volume = 1;
				else if (volume < 0) volume = 0;

				this.$player_element[0].volume = volume;

				ngutils.media.audio.volume = volume;
				this.onVolumeChange(volume);
			},

			play: function() {
				if (!this.canPlay()) return false;
				this.$player_element[0].play();

				this.setPlaying();
				return true;
			},

			pause: function() {
				if (!this.canPlay()) return false;
				this.$player_element[0].pause();

				this.setPaused();
				return true;
			},

			stop: function() {
				if (!this.canPlay()) return false;

				this.$player_element[0].pause();
				this.$player_element[0].currentTime = 0;

				this.setStopped();
				return true;
			},

			skip_forward: function() {
				if (!this.canPlay()) return false;
				var mt = this.$player_element[0].currentTime + this.skip_forward_time;
				if (mt > this.$player_element[0].duration) mt = this.$player_element[0].duration;
				this.$player_element[0].currentTime = mt;
				return true;
			},

			skip_back: function() {
				if (!this.canPlay()) return false;
				var mt = this.$player_element[0].currentTime - this.skip_back_time;
				if (mt < 0) mt = 0;
				this.$player_element[0].currentTime = mt;
				return true;
			},
			play_next: function() {

				var media = false;
				if (this.media_playlist) {
					media = this.media_playlist.forward(this.loop());
				}
				if (media) {
					this.endMedia();
					this.current_media_item = null;
					this.setMedia(media);
					return media;
				}
				this.stop();
				return false;
			},

			play_previous: function() {

				var media = false;
				if (this.media_playlist) {
					media = this.media_playlist.reverse(this.loop());
				}
				if (media) {
					this.endMedia();
					this.current_media_item = null;
					this.setMedia(media);
					return media;
				}
				this.stop();
				return false;
			},

			end: function() {
				this.setStopped();
			},

			getTimeFormat: function(s,ms_length) {
				var seconds = s;
				if (isNaN(seconds)) return [0,0,0,0];

				var hours = Math.floor(seconds / 60 / 60);
				seconds -= hours * 60 * 60;

				var minutes = Math.floor(seconds / 60);
				seconds -= minutes * 60;

				var format = [];

				// number of hour characters
				if (hours > 0) {
					hours = ""+hours;
					format.push(hours.length);

					// we can assume the rest of the format and just return it now
					format.push(2);
					format.push(2);
					return format;
				} else {
					format.push(0);
				}


				// number of minute characters
				if (minutes >=10) {
					format.push(2);
				} else {
					format.push(1);
				}

				format.push(2);

				format.push(ms_length ? ms_length:0);

				return format;
			},

			formatTime: function(s, format) {
				var seconds = s;

				if (isNaN(seconds)) return "--:--:--";
				if (!format) format = this.getTimeFormat(seconds);

				var hours = Math.floor(seconds / 60 / 60);
				seconds -= hours * 60 * 60;

				var minutes = Math.floor(seconds / 60);
				seconds -= minutes * 60;

				seconds = Math.round(seconds * 100);
				var ms = (seconds % 100);
				seconds = ((seconds - ms)/100);

				time = "";

				if (format[0] > 0) {
					hours = ""+hours;
					while (hours.length < format[0]) {
						hours = "0"+hours;
					}
					time = time+hours+":";
				}

				if (format[1] > 0) {
					minutes = ""+minutes;
					while (minutes.length < format[1]) {
						minutes = "0"+minutes;
					}
					time = time+minutes+":";
				}

				if (format[2] > 0) {
					seconds = ""+seconds;
					while (seconds.length < format[2]) {
						seconds = "0"+seconds;
					}
					time = time+seconds;
				}

				if (format[3] > 0) {
					ms = ""+ms;
					while (ms.length < format[3]) {
						ms = ms+"0";
					}
					time = time+"."+ms;
				}

				return time ? time : "--:--:--";
			},

			handleMediaEnded: function() {

				if (this.wait_for_async) return;

				if (this.media_playlist) {
					this.play_next();
				} else if (this.loop()) {
					this.play();
				} else {
					this.end();
				}
			},

			registerAudioElement: function($player_element) {
				if (typeof($player_element) == 'string') $player_element = $("#"+$player_element);
				if ($player_element.is('audio')) {
					this.type = 'audio';
				} else if ($player_element.is('video')) {
					this.type = 'video';
				} else {
					throw("Invalid $player_element");
				}

				var self = this;
				$player_element.on('ended', function() {
					self.handleMediaEnded();
				});
				this.$player_element = $player_element;
			},

			refreshTime: function() {

				var ct = this.$player_element[0].currentTime;
				var d = this.$player_element[0].duration;
				var format = this.getTimeFormat(d);
				this.controls.current_time.html(this.formatTime(ct, format));
				this.controls.duration.html(this.formatTime(d, format));
				this.onTimeChange(ct);
			},

			toggleFullScreen: function() {

				var fs = document.fullscreenElement || document.mozFullScreenElement || document.webkitFullscreenElement;
				var elem, req;

				if (fs) {
					elem = document;
					req = elem.exitFullScreen || elem.webkitExitFullscreen || elem.mozCancelFullScreen;
				} else {
					elem = this.$controls_element[0];
					req = elem.requestFullScreen || elem.webkitRequestFullscreen || elem.mozRequestFullScreen;
				}
				if (req) req.call(elem);
			},

			registerDisplay: function($display_element) {
				if (typeof($display_element) == 'string') $display_element = $("#"+$display_element);
				this.$display_element = $display_element;
			},

			registerControls: function($controls_element) {
				if (typeof($controls_element) == 'string') $controls_element = $("#"+$controls_element);
				this.$controls_element = $controls_element;

				if (this.controls) {
					for(var i in this.controls) {
						this.controls[i].off();
					}
				}


				var controls = {
					title: $(".media-player-title", $controls_element).first(),

					play: $(".media-player-play", $controls_element).first(),
					pause: $(".media-player-pause", $controls_element).first(),
					play_pause: $(".media-player-play-pause", $controls_element).first(),
					stop: $(".media-player-stop", $controls_element).first(),

					skip_forward: $(".media-player-skip-forward", $controls_element).first(),
					skip_back: $(".media-player-skip-back", $controls_element).first(),

					play_next: $(".media-player-play-next", $controls_element).first(),
					play_previous: $(".media-player-play-previous", $controls_element).first(),

					loop: $(".media-player-loop", $controls_element).first(),
					shuffle: $(".media-player-shuffle", $controls_element).first(),
					quality: $(".media-player-quality", $controls_element).first(),
					fullscreen: $(".media-player-fullscreen", $controls_element).first(),

					current_time: $(".media-player-current-time", $controls_element).first(),
					duration: $(".media-player-duration", $controls_element).first()
				};

				var sbar, sbutton;

				sbar = $(".media-player-position-bar", $controls_element).first();
				sbutton = $(".media-player-position-button", $controls_element).first();

				if (sbar && sbutton && sbar.length > 0 && sbutton.length > 0) {
					controls.position_bar = new ngutils.ui.slider({
						bar: sbar,
						button: sbutton,
						fill: $(".media-player-position-fill", $controls_element).first(),
					});
				}

				sbar = $(".media-player-volume-bar", $controls_element).first();
				sbutton = $(".media-player-volume-button", $controls_element).first();

				if (sbar && sbutton && sbar.length > 0 && sbutton.length > 0) {
					controls.volume_bar = new ngutils.ui.slider({
						direction: 'up',
						bar: sbar,
						button: sbutton,
						fill: $(".media-player-volume-fill", $controls_element).first(),
						add: $(".media-player-volume-up", $controls_element).first(),
						subtract: $(".media-player-volume-down", $controls_element).first(),
						toggle: $(".media-player-volume-toggle", $controls_element).first(),
						select: $(".media-player-volume-select", $controls_element).first(),
						lock_bar: true
					});
				}

				var $player = this.$player_element;
				var self = this;

				this.setCurrentTitle = function(title) {
					controls.title.html(title);
				};


				controls.loop.click(function() {
					self.loop(!self._loop);
					self.onPressLoop();
					return false;
				});

				controls.shuffle.click(function() {
					self.shuffle(!self._shuffle);
					self.onPressShuffle();
					return false;
				});

				controls.play.click(function() {
					self.play();
					self.onPressPlay();
					return false;
				});

				controls.pause.click(function() {
					self.pause();
					self.onPressPause();
					return false;
				});

				controls.play_pause.click(function() {
					if (self.paused || !self.playing) {
						self.play();
						self.onPressPlay();
					} else {
						self.pause();
						self.onPressPause();
					}
					return false;
				});

				controls.stop.click(function() {
					self.stop();
					self.onPressStop();
					return false;
				});

				controls.skip_forward.click(function() {
					self.skip_forward();
					self.onPressSkipForward();
					return false;
				});

				controls.skip_back.click(function() {
					self.skip_back();
					self.onPressSkipBack();
					return false;
				});

				controls.play_next.click(function() {
					self.play_next();
					self.onPressPlayNext();
					return false;
				});

				controls.play_previous.click(function() {
					self.play_previous();
					self.onPressPlayPrevious();
					return false;
				});

				controls.fullscreen.click(function() {
					self.toggleFullScreen();
					self.onPressFullscreen();
					return false;
				});

				function onTimeUpdate() {
					var p = $player[0].currentTime / $player[0].duration;
					if (controls.position_bar) controls.position_bar.setPosition(p);
					self.refreshTime();
				}

				$player.on('timeupdate', function(e) {
					onTimeUpdate();
				});

				function setPlayPosition(p) {
					if (!isNaN($player[0].duration)) $player[0].currentTime = $player[0].duration * p;
				}

				if (controls.position_bar) {
					controls.position_bar.onStopDrag = function(p) {
						setPlayPosition(p);
					};
				}

				if (controls.volume_bar) {
					controls.volume_bar.onPositionChanged = function(pos) {
						self.setVolume(pos);
					};
				}

				this.controls = controls;

				if (controls.volume_bar) {
					self.initVolume();
				}
			}
		};

		ngutils.local = {

			getItem: function(item, default_val) {

				value = localStorage.getItem(item);

				if (value) {
					value = JSON.parse(value);
				}
				else if (default_val) {
					value = default_val;
				}
				else {
					value = null;
				}

				return value;
			},

			setItem: function(item, value) {
				var result = localStorage.setItem(item, JSON.stringify(value));
				return result;
			}
		};

		ngutils.components = {

			auto_id: 0,

			nextAutoID: function() {
				this.auto_id++;
				return "ngutils-components-autoid-"+this.auto_id;
			},

			idFor: function($element) {
				var id = $element.attr('id');
				if (!id) {
					id = this.nextAutoID();
					$element.attr('id', id);
				}
				return id;
			}

		};

		ngutils.components.audio = {

			global_player: null,

			playback_items: {},

			playlists: {},

			current_playlist: null,

			registerPlaybackItem: function($playback_element) {
				if (typeof($playback_element) == 'string') $playback_element = $("#"+$playback_element);
				if ($playback_element.attr('data-registered')) return this;

				var item = new ngutils.components.audio.playbackItem($playback_element);
				return this;
			},

			registerPlaylistWrapper: function($wrapper_element) {
				if (typeof($wrapper_element) == 'string') $wrapper_element = $("#"+$wrapper_element);
				if ($wrapper_element.attr('data-registered')) return this;

				var list = new ngutils.components.audioList($wrapper_element);
				return this;
			},

			registerGlobalPlayer: function($audio_element, $control_element, $display_element) {
				var self = this;

				var player = new ngutils.media.player($audio_element, $control_element, $display_element);
				player.autoplay = true;

				$('[data-audio-playback]').each(function() {
					self.registerPlaybackItem($(this));
				});

				if (!ngutils.components.audioList.global) {
					$('[data-audio-playlist]').each(function() {
						self.registerPlaylistWrapper($(this));
					});
				}

				function onMediaLoaded(media) {
					player.setDisplay(media.html);
				}

				function onStartMedia(media) {
					if (media.playbackItem && media.playbackItem.$element) {
						media.playbackItem.$element.addClass('playing');
						media.playbackItem.$element.removeClass('paused');
					}
				}

				function onEndMedia(media) {
					if (media.playbackItem && media.playbackItem.$element) {
						media.playbackItem.$element.removeClass('playing');
						media.playbackItem.$element.removeClass('paused');
					}
				}

				function onPauseMedia(media) {
					if (media.playbackItem && media.playbackItem.$element) {
						media.playbackItem.$element.removeClass('playing');
						media.playbackItem.$element.addClass('paused');
					}
				}

				function onUnpauseMedia(media) {
					if (media.playbackItem && media.playbackItem.$element) {
						media.playbackItem.$element.addClass('playing');
						media.playbackItem.$element.removeClass('paused');
					}
				}

				var $volumeControl = $('#global-audio-player-volume');
				var $volumeToggle = $('.media-player-volume-toggle a', $volumeControl).first();

				function onChangeVolume(volume) {
					if ($volumeControl && $volumeControl.length > 0) {
						$volumeToggle.removeClass('fa-volume-up');
						$volumeToggle.removeClass('fa-volume-down');
						$volumeToggle.removeClass('fa-volume-off');
						if (volume > 0.5) {
							$volumeToggle.addClass('fa-volume-up');
						} else if (volume <= 0) {
							$volumeToggle.addClass('fa-volume-off');
						} else {
							$volumeToggle.addClass('fa-volume-down');
						}
					}
				}

				player.onMediaLoaded = onMediaLoaded;
				player.onMediaStarted = onStartMedia;
				player.onMediaEnded = onEndMedia;
				player.onMediaPaused = onPauseMedia;
				player.onMediaUnpaused = onUnpauseMedia;
				player.onVolumeChange = onChangeVolume;

				onChangeVolume(ngutils.media.audio.volume);

				this.global_player = player;
			}
		};

		ngutils.components.audio.playbackItem = function($playback_element) {
			if (typeof($playback_element) == 'string') $playback_element = $("#"+$playback_element);
			this.$element = $playback_element;

			this.$element.attr('data-registered',1);

			var audio_id = this.$element.attr('data-audio-playback');

			audio_id = parseInt(audio_id);
			if (!audio_id || isNaN(audio_id)) {
				console.error("Invalid data-audio-playback value", this.$element.attr('data-audio-playback'));
				return;
			}

			this.id = ngutils.components.idFor(this.$element);
			this.media = new ngutils.media.audio(audio_id);
			this.media.playbackItem = this;

			this.valid = true;
			var self = this;

			this.$element.show();

			this.$element.off('click');

			this.$element.click(function() {
				self.play();
				return false;
			});

			ngutils.components.audio.playback_items[this.id] = this;

			if (ngutils.components.audioList.global !== null) {
				ngutils.components.audioList.global.addPlaybackItem(this);
			}
		};

		ngutils.components.audio.playbackItem.prototype = {
			valid: false,
			media: null,
			id: null,
			getPlaylist: function() {
				var id = this.$element.attr('data-audio-playlist-id');
				return id ? ngutils.components.audio.playlists[id] : null;
			},
			play: function() {
				var self = this;

				if (ngutils.components.audio.global_player.current_media_item == this.media) {
					if (ngutils.components.audio.global_player.playing) {
						ngutils.components.audio.global_player.pause();
					} else {
						ngutils.components.audio.global_player.play();
					}
					return;
				}

				var playlist = this.getPlaylist();
				if (playlist) {
					playlist.setCurrentItem(this.media);
					playlist.play();
				} else {
					if (ngutils.components.audio.global_player) {
						ngutils.components.audio.global_player.stop();
						ngutils.components.audio.global_player.setPlaylist(null);
						ngutils.components.audio.global_player.setMedia(this.media);
					}
				}
			}
		};

		ngutils.components.audioList = function($wrapper_element) {

			var self = this;
			this.list = ngutils.media.getPlaylist('audio');

			if ($wrapper_element != 'global') {

				if (typeof($wrapper_element) == 'string') $wrapper_element = $("#"+$wrapper_element);

				this.$element = $wrapper_element;
				this.$element.attr('data-registered',1);
				this.id = ngutils.components.idFor(this.$element);


				$("[data-audio-playback]", this.$element).each(function() {
					var media_id = $(this).attr('id');
					var item = ngutils.components.audio.playback_items[media_id];
					self.addPlaybackItem(item);
				});

			} else {
				this.id = 'ngutils.components.audioList.global';
				this.$element = null;
			}

			ngutils.components.audio.playlists[this.id] = this;
		};

		ngutils.components.audioList.global = null;

		ngutils.components.audioList.enableGlobalPlaylist = function(enable) {
			return;
			/*if (enable === false) {
				ngutils.components.audioList.global = null;
			} else if (ngutils.components.audioList.global === null) {
				ngutils.components.audioList.global = new ngutils.components.audioList('global');
			}*/
		};

		ngutils.components.audioList.clearGlobalPlaylist = function() {
			return;
			/*if (ngutils.components.audioList.global) {
				ngutils.components.audio.global_player.stop();
				ngutils.components.audioList.global.clear();
			}*/
		};

		ngutils.components.audioList.prototype = {
			addPlaybackItem: function(item) {
				if (item && item.media) {
					this.list.add(item.media);
					item.$element.attr('data-audio-playlist-id', this.id);
				}
			},

			setCurrentItem: function(media) {

				if (!this.list) {
					console.error("This playlist wrapper has not been registered.");
				} else {
					this.list.setCurrentItem(media);
				}

				return this;
			},

			play: function() {
				if (ngutils.components.audio.global_player) {
					ngutils.components.audio.global_player.stop();
					ngutils.components.audio.global_player.setPlaylist(this.list);
				}
			},

			clear: function() {
				this.list.clear();
			}
		};

		ngutils.ui = {};

		ngutils.ui.slider = function(config) {

			this._dragging = false;

			this.onStartDrag = function(position) {};
			this.onStopDrag = function(position) {};
			this.onPositionChanged = function(position) {};

			function missingRequired(bit) {
				console.error("Could not initialize slider with missing/invalid '"+bit+"' value.");
			}

			function getJquery(value) {
				value = typeof(value) == 'string' ? $('#'+value) : value;
				if (!value || !(value instanceof jQuery) || value.length < 1) value = null;
				return value;
			}

			this.$bar = getJquery(config.bar);
			this.$button = getJquery(config.button);

			if (!this.$bar) missingRequired('bar');
			if (!this.$button) missingRequired('button');

			this.$fill = getJquery(config.fill);
			this.$add = getJquery(config.add);
			this.$subtract = getJquery(config.subtract);
			this.$toggle = getJquery(config.toggle);
			this.$select = getJquery(config.select);

			this.$bar.css('position','relative');
			this.$button.css('position','absolute');
			if (this.$fill) this.$fill.css('position','absolute');

			this._position = parseFloat(config.position);

			var self = this;

			if (this.$add || this.$subtract) {
				this._increment = parseFloat(config.increment);
				if (isNaN(this._increment) || !this._increment || this._increment <= 0) this._increment = 0.05;
			}

			if (this.$add) this.$add.click(function() {
				self.setPosition(self._position + self._increment);
				return false;
			});

			if (this.$subtract) this.$subtract.click(function() {
				self.setPosition(self._position - self._increment);
				return false;
			});

			var $document = $(document);

			if (this.$toggle && this.$select) {
				this.$toggle.on(ngutils.input.mouseUp, function() {
					self.updateBarBounds();
					self.$select.toggle();
					self.$toggle.blur();
					self.$select.focus();
					return false;
				});
				$document.on(ngutils.input.mouseUp, function() {
					self.$select.hide();
				});
			}

			this._left = 0;
			this._width = 0;
			this._offset = 0;

			this._lock_bar = config.lock_bar ? true:false;

			var directions = ['up','down','left','right'];

			if (config.direction) {
				this._direction = typeof(config.direction) == 'string' && directions.indexOf(config.direction.toLowerCase()) >= 0 ? config.direction.toLowerCase():'right';
			} else {
				this._direction = 'right';
			}
			if (this.$fill) { switch(this._direction) {

				case 'up':
					this.$fill.css('bottom','0px');
					break;
				case 'down':
					this.$fill.css('top','0px');
					break;
				case 'left':
					this.$fill.css('right','0px');
					break;
				case 'right':
					this.$fill.css('left','0px');
					break;

			} }

			function getMousePosition(e) {
				var mouse, bar, size, pos, input;
				input = ngutils.input.getMouse(e);

				if (self._direction == 'down' || self._direction == 'up') {
					mouse = input.y;
					start = self._top;
					size = self._height;
				} else {
					mouse = input.x;
					start = self._left;
					size = self._width;
				}

				pos = mouse - (self._offset + start);

				if (pos < 0) pos = 0;
				else if (pos > size) pos = size;

				pos = pos/size;
				if (self._direction == 'up' || self._direction == 'left') pos = 1-pos;
				return pos;
			}

			if (is_mobile) {
				$( window ).resize(function() {
					self.updateBarBounds();
					self.updateFill();
					self.updateButton();
				});
			}

			this.updateBarBounds();
			this.updateFill();
			this.updateButton();

			function handleDrag(e) {
				e.preventDefault();

				if (self._lock_bar) {
					self.setPosition(getMousePosition(e));
				} else {
					self.updateButton(getMousePosition(e));
				}
			}

			function startDrag(e) {
				e.preventDefault();

				self._dragging = true;
				self.onStartDrag(self._position);
				handleDrag(e);

				$document.off(ngutils.input.mouseUp, endDrag);
				$document.on(ngutils.input.mouseUp, endDrag);
				$document.off(ngutils.input.mouseMove, handleDrag);
				$document.on(ngutils.input.mouseMove, handleDrag);
				self.$bar.blur();
			}

			function endDrag(e) {
				e.preventDefault();

				self._dragging = false;
				$document.off(ngutils.input.mouseMove, handleDrag);
				$document.off(ngutils.input.mouseUp, endDrag);
				self.setPosition(getMousePosition(e));
				self.onStopDrag(self._position);
			}

			this.$bar.on(ngutils.input.mouseDown, function(e) {
				startDrag(e);
				return false;
			});
		};

		ngutils.ui.slider.prototype = {

			updateBarBounds: function() {
				var self = this;

				var toggle_select = (self.$select && self.$select.is(':hidden'));

				if (toggle_select) self.$select.show();

				var button_width = self.$button.outerWidth();
				var button_height = self.$button.outerHeight();
				self._left = self.$bar.offset().left;
				self._top = self.$bar.offset().top;
				self._width = self.$bar.innerWidth() - button_width;
				self._height = self.$bar.innerHeight() - button_height;

				if (this._direction == 'down' || this._direction == 'up') {
					self._offset = Math.round(button_height / 2);
				} else {
					self._offset = Math.round(button_width / 2);
				}

				if (toggle_select) self.$select.hide();
			},

			setPosition: function(position) {

				position = parseFloat(position);
				if (isNaN(position) || position < 0) position = 0;
				else if (position > 1) position = 1;

				if (position !== this._position) {
					this._position = position;
					if (!this._dragging || this._lock_bar) {
						this.updateButton();
					}
					this.updateFill();
					this.onPositionChanged(this._position);
				}
			},

			updateButton: function(position) {
				if (typeof(position) === typeof(undefined)) position = this._position;
				var fix;
				if (this._direction == 'down' || this._direction == 'up') {
					position = Math.round((this._height * position) * 10)/10;
					fix = this._direction == 'up' ? 'bottom':'top';
				} else {
					position = Math.round((this._width * position) * 10)/10;
					fix = this._direction == 'left' ? 'right':'left';
				}
				this.$button.css(fix, position);
			},

			updateFill: function() {
				if (this.$fill) {
					var position;

					if (this._direction == 'down' || this._direction == 'up') {
						position = Math.round((this._height * this._position) * 10)/10;
						position += this._offset;
						this.$fill.css('height', position);
					} else {
						position = Math.round((this._width * this._position) * 10)/10;
						position += this._offset;
						this.$fill.css('width', position);
					}
				}
			}

		};

		/*
		 * Attach to a link in the format: /spam/akismet?generic_id=X&type_id=Y
		 * Sends a report off to akismet.
		 *
		 * Check console for response.
		 */
		ngutils.report_akismet_spam = function(selector) {
			var _this = this;
			var that = selector;

			if (that.is('a')) {
				that.on('click', function() {
					var href = that.attr('href');

					$.post(href, function(response) {
						that.on('click', function() {
							return false;
						});

						that.html('Reported spam');
					});

					return false;
				});
			}
		};

		ngutils.toc = function($list_element, $content_element) {
			if (typeof($list_element) == 'string') $list_element = $('#'+$list_element);
			if (typeof($content_element) == 'string') $content_element = $('#'+$content_element);

			if (!$list_element.attr('class')) {
				$list_element.addClass('table-of-contents');
			}

			$('h2, h3, h4', $content_element).each(function() {
				var $heading = $(this);
				var tag, indent = 0;

				if ($heading.is('h3')) {
					indent = 1;
				} else if ($heading.is('h4')) {
					indent = 2;
				}

				if (!$heading.attr('id')) {
					tag = "ngutils-toc-" + ngutils.toc.getNextIndex();
					$heading.attr('id',tag);
				} else {
					tag = $heading.attr('id');
				}

				var $a = $('<a>').attr('href',"#"+tag).text($heading.text());
				var $li = $("<li>");
				$li.addClass('indent-'+indent);
				$li.append($a);
				$list_element.append($li);
			});
		};
		ngutils.toc.last_index = 0;
		ngutils.toc.getNextIndex = function() {
			ngutils.toc.last_index++;
			return ngutils.toc.last_index;
		};

		ngutils.clearSelection = function() {
			if(document.selection && document.selection.empty) {
				document.selection.empty();
			} else if(window.getSelection) {
				var sel = window.getSelection();
				sel.removeAllRanges();
			}
		};

		ngutils.initScrollFixColumn = function() {
			var $column = $(".scrollfix-column").first();
			if (!$column || $column.length < 1) return;

			var fixed = false;

			var $notification_bar = $('#notification-bar');

			var $shim = $("<div></div>");
			$shim.attr('class', $column.attr('class'));
			$shim.attr('id', 'scrollfix-shim');
			$shim.hide();
			$column.after($shim);
			var $body = $(window);

			var native_y = $column.offset().top;
			//var fixed_y = $notification_bar.outerHeight();
			var fixed_y = 0;

			var native_position = $column.css('position');
			//var fix_at = native_y - fixed_y;
			var fix_at = native_y;

			function fix() {
				fixed = true;
				$column.css('position','fixed');
				$column.css('top',fixed_y);
				$shim.width($column.outerWidth());
				$shim.height($column.outerHeight());
				$shim.show();
			}

			function unfix() {
				fixed = false;
				$shim.hide();
				$column.css('position',native_position);
			}

			function checkScrollFixPosition() {
				var pos = $body.scrollTop();
				var fixme = (pos >= fix_at);

				if (fixed && !fixme) unfix();
				else if (!fixed && fixme) fix();
			}

			checkScrollFixPosition();
			$(document).scroll(checkScrollFixPosition);
		};

		ngutils.bytesToString = function(bytes) {

			var sizeSymbols = [ "KB", "MB", "GB", "TB", "PB", "EB" ];

			if (bytes === 0) {
				return bytes + sizeSymbols[0];
			}
			var i = -1;
			do {
				bytes = bytes / 1e3;
				i++;
			} while (bytes > 999);
			return Math.max(bytes, 0.1).toFixed(1) + sizeSymbols[i];
		};

		ngutils.uploadEvent = function(event, uploader, target, data) {
			this.event = event;
			this.uploader = uploader;
			this.target = target;
			this.data = data;
		};

		ngutils.uploadEvent.onSubmit = "ngutils.uploadEvent.onSubmit";
		ngutils.uploadEvent.onUpload = "ngutils.uploadEvent.onUpload";
		ngutils.uploadEvent.onCancel = "ngutils.uploadEvent.onCancel";
		ngutils.uploadEvent.onDeleted = "ngutils.uploadEvent.onDeleted";
		ngutils.uploadEvent.onError = "ngutils.uploadEvent.onError";
		ngutils.uploadEvent.onProgress = "ngutils.uploadEvent.onProgress";

		ngutils.uploader = function(element_selector, endpoint, config) {

			var _uploader = this;

			var webImageTypes = ['gif','jpg','jpeg','png'];

			if (!config) config = {};

			// for extra debugging in the console, set to true
			var debug = config.debug ? true:false;

			// single file only by default
			var multi = typeof(config.multiple) === typeof(undefined) ? false : (config.multiple ? true:false);

			// chunking enabled by default
			var chunking = typeof(config.chunking) === typeof(undefined) ? true : (config.chunking ? true:false);
			var chunkSize = config.chunkSize ? config.chunkSize : 5000000;

			// this is the number of total, concurrent connections (chunks count as individual connections)
			var maxConnections = config.maxConnections ? config.maxConnections : 3;

			// an array of valid file extensions
			var allowedExtensions = config.allowedExtensions ? config.allowedExtensions : webImageTypes;

			// template id to use
			var template = config.template ? config.template : "upload_template_default";

			// max filesize
			var sizeLimit = config.sizeLimit ? config.sizeLimit : 2e+9;

			// if set to true, and server returns a 'redirect' property, the uploader will automatically redirect to the defined URL.
			var redirectsEnabled = config.redirectsEnabled ? config.redirectsEnabled : true;

			// if you need to handle any of he upload events outside of the generic uploader, do that here
			_uploader.onPreviewImage = config.onPreviewImage ? config.onPreviewImage : null;
			_uploader.onSelect = config.onSelect ? config.onSelect : null;
			_uploader.onError = config.onError ? config.onError : null;
			_uploader.onComplete = config.onComplete ? config.onComplete : null;
			_uploader.onCancel = config.onCancel ? config.onCancel : null;

			var liveUpdate = config.liveUpdate ? config.liveUpdate : false;

			var $uploader = $(element_selector);

			this.id = config.id ? config.id : $uploader.attr('id');

			var $droparea, $drop_area_text, $uploader_inner, $preview_img;

			function hideDroparea() {
				$droparea.hide();
			}

			function showDroparea() {
				$droparea.show();
			}

			var minImageWidth = typeof(config.minImageWidth) == 'number' ? config.minImageWidth : null;
			var maxImageWidth = typeof(config.maxImageWidth) == 'number' ? config.maxImageWidth : null;
			var minImageHeight = typeof(config.minImageHeight) == 'number' ? config.minImageHeight : null;
			var maxImageHeight = typeof(config.maxImageHeight) == 'number' ? config.maxImageHeight : null;
			var maxGIFHeight = typeof(config.maxGIFHeight) == 'number' ? config.maxGIFHeight : maxImageHeight;
			var maxGIFWidth = typeof(config.maxGIFWidth) == 'number' ? config.maxGIFWidth : maxImageWidth;

			var fuconfig = {
				messages: {},
				maxConnections: maxConnections,
				template: template,
				element: $uploader[0],
				multiple: multi,
				text: {
					fileInputTitle: " "
				},
				request: {
					endpoint: endpoint
				},
				chunking: {
					enabled: chunking
				},
				callbacks: {
					onSubmit: function(id, name) {
						var _fu = this;
						var is_gif = name.split(".").pop().toLowerCase() == 'gif';

						return new Promise((proceed, stop) => {
							var event = new ngutils.uploadEvent(ngutils.uploadEvent.onSubmit, _uploader, null, {id:id,name:name});
							ngutils.event.dispatch(event.event, event);

							function checkOnSelect() {

								if (typeof(_uploader.onSelect) == 'function') {
									let success = _uploader.onSelect.call(_fu, id, name);
									if (typeof(success) === 'boolean') {
										if (success) {
											proceed();
										} else {
											stop();
										}
									} else {
										success.then(proceed).catch(stop);
									}
								} else {
									proceed();
								}
							}

							function validateGIF(gif) {
								if (minImageWidth !== null && gif.width < minImageWidth) {
									alert("GIF images may not be less than "+minImageWidth+"px wide");
									return false;
								}
								if (minImageHeight !== null && gif.height < minImageHeight) {
									alert("GIF images may not be less than "+minImageHeight+"px tall");
									return false;
								}
								if (maxGIFWidth !== null && gif.width > maxGIFWidth) {
									alert("GIF images may not be more than "+maxGIFWidth+"px wide");
									return false;
								}
								if (maxGIFHeight !== null && gif.height > maxGIFHeight) {
									alert("GIF images may not be more than "+maxGIFHeight+"px tall");
									return false;
								}

								return true;
							}

							if (typeof(_uploader.onPreviewImage) === 'function') {

								let $thumb = $('<img>');
								_fu.drawThumbnail(id, $thumb[0]).then(function() {

									if (
										is_gif &&
										(
											minImageWidth !== null ||
											minImageHeight !== null ||
											maxGIFWidth !== null ||
											maxGIFHeight !== null
										) &&
										!validateGIF($thumb[0])
									) {
										stop();
										return;
									}

									let success = _uploader.onPreviewImage.call(_fu,$thumb,id,name);

									if (typeof(success) === 'boolean') {
										if (success) {
											proceed();
										} else {
											stop();
										}
									} else {
										success.then(proceed).catch(stop);
									}
								},function() {
									alert('Error: Invalid image!');
									stop();
								});

							} else if (is_gif && (minImageWidth !== null || minImageHeight !== null || maxGIFWidth !== null || maxGIFHeight !== null)) {
								let $thumb = $('<img>');
								_fu.drawThumbnail(id, $thumb[0]).then(function() {

									if (is_gif && !validateGIF($thumb[0])) {
										stop();
									} else {
										checkOnSelect();
									}
								},function() {
									alert('Error: Invalid image!');
									stop();
								});
							} else {
								checkOnSelect();
							}
						});
					},
					onUpload: function(id, name) {
						$(".qq-error", $(this.getItemByFileId(id))).first().text('');

						$uploader_inner.addClass('uploading');

						var params = {userkey: PHP.get('uek','')};
						if (config.component && config.component.path) {
							params.component = config.component;
						}
						this.setParams(params);

						var $file = $(this.getItemByFileId(id));

						this.setUuid(id,PHP.get('uuid_prefix','uuid')+this.getUuid(id));

						var ext = name.toLowerCase().split(".").pop();
						var image_types = ['gif','jpg','jpeg','png','bmp','tif','tiff'];

						if (image_types.indexOf(ext) < 0) {
							$('span.ng-upload-thumbnail-selector', $file).first()
								.addClass("icon-dumpfile-"+ext)
								.removeClass("ng-upload-thumbnail-selector")
							;

						}

						if (!multi) hideDroparea();

						var event = new ngutils.uploadEvent(ngutils.uploadEvent.onUpload, _uploader, $file, {id:id,name:name});
						ngutils.event.dispatch(event.event, event);
					},
					onProgress: function(id, name, updatedBytes, totalBytes) {
						var $file = $(this.getItemByFileId(id));
						var event = new ngutils.uploadEvent(ngutils.uploadEvent.onProgress, _uploader, $file, {id:id,name:name,updatedBytes:updatedBytes,totalBytes:totalBytes});
						ngutils.event.dispatch(event.event, event);
						if (typeof(_uploader.onProgress) == 'function') _uploader.onProgress.call(this, id,name,updatedBytes,totalBytes);
					},
					onComplete: function(id, name, response) {

						if (redirectsEnabled && response.redirect) {
							window.location.href = response.redirect;
							return false;
						}

						$uploader_inner.removeClass('uploading');

						var $file = $(this.getItemByFileId(id));
						var parked_id;

						if (response.parked_id) {
							$("input.ng-id-selector", $file).first().val(response.parked_id);
							parked_id = response.parked_id;
						}

						if (response.parked_url) {
							$("input.ng-url-selector", $file).first().val(response.parked_url);
						}

						if (response.image_url) {
							var extension = response.image_url.split(".").pop().toLowerCase();

							if (liveUpdate && webImageTypes.indexOf(extension) >= 0 && $preview_img.length > 0) {
								$preview_img.attr('src', response.image_url);
								if (response.image_width) $preview_img.attr('height', response.image_width);
								if (response.image_height) $preview_img.attr('width', response.image_height);
							}
						}

						if (response.delete_url) {
							var $delete_button = $(".ng-upload-delete-seletor", $file).first();
							$delete_button.show();
							$delete_button.click(function() {
								$delete_button.disable();
								var params = (config.component && config.component.path) ? {component:config.component} : {};
								params.userkey = PHP.get('uek','');

								$.post(response.delete_url, params, function(response) {
									var event = new ngutils.uploadEvent(ngutils.uploadEvent.onDeleted, _uploader, $file, {id:id,name:name,response:response});
									ngutils.event.dispatch(event.event, event);
									$file.remove();
								});
							});
						}
						if (!multi) showDroparea();

						var event = new ngutils.uploadEvent(ngutils.uploadEvent.onComplete, _uploader, $file, {id:id,name:name,response:response});
						ngutils.event.dispatch(event.event, event);
						if (typeof(_uploader.onComplete) == 'function') _uploader.onComplete.call(this, id,name,response);
					},
					onCancel: function(id, name) {

						$uploader_inner.removeClass('uploading');
						if (!multi) showDroparea();

						var $file = $(this.getItemByFileId(id));
						var event = new ngutils.uploadEvent(ngutils.uploadEvent.onCancel, _uploader, $file, {id:id,name:name});
						ngutils.event.dispatch(event.event, event);

						if (typeof(_uploader.onCancel) == 'function') return _uploader.onCancel.call(this, id,name);
					},
					onError: function(id, name, errorMsg) {

						var $file = $(this.getItemByFileId(id));
						$uploader_inner.removeClass('uploading');
						if (!multi) showDroparea();

						var $error = $(".qq-error", $(this.getItemByFileId(id))).first();

						if (typeof(_uploader.onError) == 'function') {
							_uploader.onError.call(this, id,name,errorMsg);
						} else if ($error.length > 0) {
							$error.text(errorMsg);
						} else {
							alert(errorMsg);
						}
						var event = new ngutils.uploadEvent(ngutils.uploadEvent.onError, _uploader, $file, {id:id,name:name,errorMsg:errorMsg});
						ngutils.event.dispatch(event.event, event);

						return false;
					}
				},
				validation: {
					sizeLimit: sizeLimit,
					allowedExtensions: allowedExtensions
				},
				autoUpload: true,
				debug: debug
			};

			if (chunking) {
				fuconfig.chunking.concurrent = {enabled: true};
				fuconfig.chunking.partSize = chunkSize;
				fuconfig.chunking.mandatory = false;
				fuconfig.chunking.success = {endpoint: endpoint};
			}

			if (minImageWidth !== null || maxImageWidth !== null || minImageHeight !== null || maxImageHeight !== null) {
				fuconfig.validation.image = {};
				if (minImageWidth !== null) {
					fuconfig.validation.image.minWidth = minImageWidth;
					fuconfig.messages.minWidthImageError = "Image must be at least "+minImageWidth+"px wide!";
				}
				if (maxImageWidth !== null) {
					fuconfig.validation.image.maxWidth = maxImageWidth;
					fuconfig.messages.maxWidthImageError = "Image can not be wider than "+maxImageWidth+"px!";
				}
				if (minImageHeight !== null) {
					fuconfig.validation.image.minHeight = minImageHeight;
					fuconfig.messages.minHeightImageError = "Image must be at least "+minImageHeight+"px tall!";
				}
				if (maxImageHeight !== null) {
					fuconfig.validation.image.maxHeight = maxImageHeight;
					fuconfig.messages.maxHeightImageError = "Image can not be taller than "+maxImageHeight+"px!";
				}
			}

			if (debug) console.log("Uploader config for '"+element_selector+"'", fuconfig);

			var fu = new qq.FineUploader(fuconfig);
			$droparea = $('.qq-upload-drop-area', $uploader).first();
			$drop_area_text = $('.drop-area-text', $uploader).first();
			$uploader_inner = $('.qq-uploader-selector', $uploader).first();
			$preview_img = $('.ng-preview-image', $uploader).first();

			if (typeof(config.dropAreaText) == 'string') $drop_area_text.html(config.dropAreaText);

			var text;

			if (!config.fileTypesText) {
				text = allowedExtensions && allowedExtensions.length > 0 ? "Allowed extensions: "+allowedExtensions.join(", ") : "Files";
				text += " up to "+ngutils.bytesToString(sizeLimit);
			} else {
				text = $.trim(config.fileTypesText);
			}

			if (text) {
				$('.ng-file-rules-text', $uploader).first().html(text);
			} else {
				$('.ng-file-rules-text', $uploader).hide();
			}

			this.setComponent = function(path, params) {
				this.setComponentPath(path);
				if (params) this.setComponentParams(params);
			};

			this.setComponentPath = function(path) {
				if (typeof(config.component) == typeof(undefined)) config.component = {};
				config.component.path = path;
			};

			this.setComponentParam = function(name, value) {
				if (typeof(config.component) == typeof(undefined)) config.component = {};
				if (typeof(config.component.data) == typeof(undefined)) config.component.data = {};
				config.component.data[name] = value;
			};

			this.setComponentParams = function(params) {
				if (typeof(config.component) == typeof(undefined)) config.component = {};
				config.component.data = params;
			};

			this.getComponentParam = function(name) {
				let params = getComponentParams();
				if (typeof(params[name]) == typeof(undefined)) return null;
				return params[name];
			};

			this.getComponentParams = function() {
				if (typeof(config.component) == typeof(undefined) || typeof(config.component.data) == typeof(undefined)) {
					return config.component.data;
				}
				return {};
			};

			this.getComponentPath = function() {
				if (typeof(config.component) == typeof(undefined) || typeof(config.component.path) == typeof(undefined)) {
					return config.component.path;
				}
				return null;
			};

		};

		// crop tool used by smaller icons
		ngutils.croptool = function(config) {

			var id = config.id;
			this.id = id;

			ngutils.croptool.ids[id] = this;

			var $body = $('body').first();
			var croptool = this;
			var $template = $('#'+id);
			var $ui = $('<div>');
			$body.append($ui);
			$ui.html($template.html());

			var $frame = $('[data-crop-frame]', $ui).first();
			var $image = $('[data-cropping-image]', $ui).first();
			var $save_btn = $('[data-btn-save]', $ui).first();
			var $cancel_btn = $('[data-btn-cancel]', $ui).first();
			var $save_txt = $('[data-saving-text]', $ui).first();
			var $slider_bar = $('[data-scale-slider-container]', $ui).first();

			var $slider = $('[data-scale-slider]', $ui).first();

			this.startSave = function() {
				saving = true;
				$save_btn.disable();
				$cancel_btn.disable();
				$save_txt.show();
				$slider_bar.hide();
			};
			this.endSave = function() {
				saving = false;
				$save_btn.enable();
				$cancel_btn.enable();
				$save_txt.hide();
				$slider_bar.show();
			};

			var width = config.width;
			var height = config.height;
			var imgLoader = new Image();


			var anchor, minscale, maxscale, scale, scalerange;

			var maxzoom = config.maxZoom ? config.maxZoom : 'auto';
			var saving = false;

			$ui.css('display','none');

			$image.css('position','absolute');

			this.reset = function() {
				anchor = {x:0,y:0};
				minscale = 1;
				maxscale = 2;
				scale = 1;
				scalerange = 1;
				$image.removeAttr('src');
				$(imgLoader).removeAttr('src');
				$slider.slider('value',0);
			};

			this.onCancel = function() {};
			this.onSave = function(crop, frame) {};

			this.hide = function() {
				$body.css('overflow','');
				$ui.css('display','none');
				ngutils.croptool.current = null;
				this.reset();
			};

			this.show = function() {
				if (ngutils.croptool.current) ngutils.croptool.current.hide();
				ngutils.croptool.current = this;
				$body.css('overflow','hidden');
				$ui.css('display','');
			};

			this.update = function() {
				var iw = imgLoader.width * scale;
				var ih = imgLoader.height * scale;
				var l = Math.round((width/2) - (anchor.x * scale));
				var t =  Math.round((height/2) - (anchor.y * scale));

				$image.css('width', iw).css('height', ih).css('left',l).css('top',t);
			};

			this.newImage = function() {
				$image.attr('src',imgLoader.src);
				var wscale = width / imgLoader.width;
				var hscale = height / imgLoader.height;

				var _maxzoom = maxzoom;
				if (maxzoom === 'auto') {
					var xz = (imgLoader.width / width);
					var yz = (imgLoader.height / height);
					_maxzoom = xz > yz ? xz : yz;
				}
				minscale = wscale > hscale ? wscale : hscale;
				maxscale = minscale * _maxzoom;
				scale = minscale;
				scalerange = maxscale - minscale;
				anchor.x = Math.floor(imgLoader.width / 2);
				anchor.y = Math.floor(imgLoader.height / 2);
				croptool.update();
			};

			this.showImage = function(src) {
				$image.removeAttr('src');
				$image.attr('src',imgLoader.src);
				imgLoader.src = src;
				croptool.show();
			};

			this.onDragged = function(moved) {

				anchor.x -= moved.x / scale;
				anchor.y -= moved.y / scale;
				this.checkAnchor();

				this.update();
			};

			this.checkAnchor = function() {
				var fh = (height/2) / scale;
				var fw = (width/2) / scale;

				if (anchor.y < fh) anchor.y = fh;
				else if (anchor.y > imgLoader.height - fh) anchor.y = imgLoader.height - fh;

				if (anchor.x < fw) anchor.x = fw;
				else if (anchor.x > imgLoader.width - fw) anchor.x = imgLoader.width - fw;
			};

			$(imgLoader).on('load', this.newImage);

			var dragging = false;
			var mousePos = {x:0, y:0};

			$slider.slider({
				value: 0,
				min: 0,
				max: 1,
				step: 0.001,
				slide: function( event, ui ) {
					scale = minscale + (scalerange * ui.value);
					croptool.checkAnchor();
					croptool.update();
				}
			});

			$cancel_btn.click(function() {
				croptool.hide();
				croptool.onCancel();
			});

			$save_btn.click(function() {

				croptool.startSave();

				var crop = {};
				var fh = (height/2) / scale;
				var fw = (width/2) / scale;

				crop.top = Math.ceil(anchor.y - fh);
				crop.left = Math.ceil(anchor.x - fw);
				crop.width = Math.floor(fw * 2);
				crop.height = Math.floor(fh * 2);
				crop.right = crop.left + crop.width;
				crop.bottom = crop.top + crop.height;

				if (croptool.onSave(crop, {width:width, height:height}) === true) croptool.hide();
			});

			$image.on(ngutils.input.mouseDown, function(e) {
				dragging = true;
				var posObj = e.changedTouches ? e.changedTouches[0] : e;
				mousePos = {x: posObj.screenX, y: posObj.screenY};
			});
			$(document).on(ngutils.input.mouseUp, function() {
				dragging = false;
			}).on(ngutils.input.mouseMove, function(e) {
				if (!dragging || saving) return;

				var posObj = e.changedTouches ? e.changedTouches[0] : e;
				var newPos = {x: posObj.screenX, y: posObj.screenY};
				if (mousePos) {
					croptool.onDragged({x:newPos.x - mousePos.x, y:newPos.y - mousePos.y});
				}
				mousePos = newPos;
				return false;
			});

			if (config.src) {
				imgLoader.src = config.src;
			}
			this.reset();
		};

		ngutils.croptool.current = null;
		ngutils.croptool.ids = {};
		ngutils.croptool.get = function(id) {
			return typeof(ngutils.croptool.ids[id]) != 'undefined' ? ngutils.croptool.ids[id]:null;
		};

		ngutils.croptool.prototype.constructor = ngutils.croptool;

		ngutils.croppable_image = function(selector, config) {

			this.onSaved = function() {};
			this.onCancel = function() {};

			this.parked_id = null;
			this.parked_url = '';

			var skip_crop = false;
			var image_crop = this;
			var image = new Image();
			var $container = $(selector);
			var $aimage = $('[data-image-frame]', $container).first();
			var $img = $('img',$aimage).first();

			var $spinner = $('[data-image-spinner]', $container).first();
			var $save_text = $('[data-saving-text]', $container).first();

			var $upload = $('div[data-image-upload]', $container).first();
			var $upload_container = $('div[data-image-upload-toggle]', $container).first();

			var parkEndpoint = config.parkEndpoint ? config.parkEndpoint : "/parkfile";
			var saveEndpoint = config.saveEndpoint ? config.saveEndpoint : null;
			var liveCrop = config.liveCrop ? config.liveCrop : false;
			var saveParams = config.saveParams ? config.saveParams : null;
			var stretchToFit = typeof(config.stretchToFit) !== typeof(undefined) ? config.stretchToFit : true;

			var fileTypesText = config.fileTypesText ? config.fileTypesText : null;
			var dropAreaText = config.dropAreaText ? config.dropAreaText : "Drop Image, or Click Here";

			function unstretchImage() {
				if (stretchToFit) return;

				setTimeout(function() {
					if ($img[0].naturalWidth < $img[0].width) {
						$img[0].width = $img[0].naturalWidth;
						$img[0].height = $img[0].naturalHeight;
						$img.removeAttr('style');
					}
				}, 100);
			}
			$img[0].onload = unstretchImage;

			var canEdit = $upload.length > 0;

			var $crop_ui = $('[data-crop-ui]', $container).first();

			if (!canEdit) {
				$crop_ui.remove();
			} else {
				$crop_ui.addClass('nodim');
			}

			var $slider_container = $('[data-scale-slider-container]', $crop_ui).first();

			if (!config.frame) {
				config.frame = {};
			}else {
				if (config.frame.width) config.frame.maxWidth = config.frame.minWidth = config.frame.width;
				if (config.frame.height) config.frame.maxHeight = config.frame.minHeight = config.frame.height;
			}

			this.maxFrameWidth = config.frame.maxWidth ? config.frame.maxWidth : 1080;
			this.maxFrameHeight = config.frame.maxHeight ? config.frame.maxHeight : 360;
			this.minFrameWidth = config.frame.minWidth ? config.frame.minWidth : 480;
			this.minFrameHeight = config.frame.minHeight ? config.frame.minHeight : 240;
			this.fillScale = config.fillScale ? config.fillScale : 1;
			this.keepAspect = config.frame.keepAspect ? config.frame.keepAspect : false;

			if (canEdit) {

				var uconfig = {
					template: "croppable_image_template",
					fileTypesText: fileTypesText,
					dropAreaText: dropAreaText,
					multiple: false,
					allowedExtensions: [
						"png",
						"jpeg",
						"jpg",
						"gif"
					],
					onComplete: function(id,filename,response) {
						if (typeof(id) == 'number') $(this.getItemByFileId(id)).remove();

						if (skip_crop) {
							startSaving();
							var output = {
								nocrop: true,
								parked_id: response.parked_id
							};

							for(var i in saveParams) {
								output[i] = saveParams[i];
							}

							$.post(saveEndpoint, output, function(result) {
								image_crop.oldSrc = result.image_url;
								image_crop.clearEdit();
								image_crop.onSaved(result);
							}, 'json').fail(function() {
								image_crop.clearEdit();
								endSaving();
							});

						} else {
							image_crop.parked_id = response.parked_id;
							image_crop.parked_url = response.parked_url;
							image_crop.newImage(image_crop.parked_url);
						}
					}
				};

				if (config.sizeLimit) uconfig.sizeLimit = config.sizeLimit;
				if (config.maxWidth) uconfig.maxImageWidth = config.maxWidth;
				if (config.maxHeight) uconfig.maxImageHeight = config.maxHeight;
				if (config.minWidth) uconfig.minImageWidth = config.minWidth;
				if (config.minHeight) uconfig.minImageHeight = config.minHeight;
				uconfig.maxGIFWidth = this.maxFrameWidth;
				uconfig.maxGIFHeight = this.maxFrameHeight;

				if (config.debug) uconfig.debug = true;

				if (liveCrop) {
					uconfig.autoUpload = false;

					uconfig.onPreviewImage = function($thumb, id, name) {
						let _fu = this;

						return new Promise((proceed, reject) => {

								if ($thumb[0].naturalWidth <= image_crop.maxFrameWidth && $thumb[0].naturalHeight <= image_crop.maxFrameHeight) {
									$thumb = null;
									skip_crop = true;
									return proceed();
								}

								skip_crop = false;

								function complete() {
									reject();
									image.width = $img[0].naturalWidth;
									image.height = $img[0].naturalHeight;
									image.src = $img.attr('src');
									uconfig.onComplete.call(_fu, null, null, {parked_id:0,parked_url:image.src});
								}

								if ($thumb[0].naturalWidth < image_crop.maxFrameWidth) {
									let canvas = document.createElement('canvas');
									let context2d = canvas.getContext('2d');
									canvas.width = image_crop.maxFrameWidth;
									canvas.height = $thumb[0].naturalHeight;
									context2d.drawImage($thumb[0],Math.round((canvas.width - $thumb[0].naturalWidth)/2),0,$thumb[0].naturalWidth,$thumb[0].naturalHeight);
									$thumb = null;

									$tmp = $("<img>");
									$tmp[0].onload = function() {
										$img[0].src = $tmp[0].src;
										complete();
									};
									$tmp.attr('src',canvas.toDataURL('image/jpeg', 0.8));
								} else {
									$img[0].src = $thumb[0].src;
									complete();
								}
						});
					};
				}
				var uploader = new ngutils.uploader($upload, parkEndpoint, uconfig);
				setTimeout(unstretchImage,300);
			}

			this.dragMove = null;

			// only show the spinner on updates
			var first_load = true;
			function updateSrc(src) {
				if (!first_load) $spinner.show();
				first_load = false;
				image.src = src;
			}

			var mode = 'view';

			var dragging = false;
			mousePos = null;

			if (canEdit) {
				$aimage.on(ngutils.input.mouseDown, function(e) {
					dragging = mode !== 'view' ? true:false;
					var posObj = e.changedTouches ? e.changedTouches[0] : e;
					mousePos = {x: posObj.screenX, y: posObj.screenY};
				});
				$(document).on(ngutils.input.mouseUp, function() {
					dragging = false;
				}).on(ngutils.input.mouseMove, function(e) {
					if (!dragging || saving) return;

					var posObj = e.changedTouches ? e.changedTouches[0] : e;
					var newPos = {x: posObj.screenX, y: posObj.screenY};
					if (mousePos) {
						image_crop.onDragged({x:newPos.x - mousePos.x, y:newPos.y - mousePos.y});
					}
					mousePos = newPos;
					return false;
				});
			}

			this.src = config.src ? config.src : null;
			this.oldSrc = this.src;

			this.updateHeight = function() {
				if (image_crop.keepAspect) {
					var cWidth = $aimage.width();
					var cHeight = $aimage.height();

					var aspectScale = cWidth / image_crop.maxFrameWidth;
					cHeight = Math.floor(image_crop.maxFrameHeight * aspectScale);
					$aimage.height(cHeight);
				}
			};

			// with aspect on our frame will always have the same aspect ratio, so we no longer need minimum values for width and height
			if (this.keepAspect) {
				this.minFrameWidth = this.maxFrameWidth;
				this.minFrameHeight = this.maxFrameHeight;
				this.updateHeight();
			}

			// these will get recalculated based on our actual image size
			this.minScale = 1;
			this.maxScale = 2;
			this.anchor = {x:0, y:0};

			var frame = {
				width: this.maxFrameWidth,
				height: Math.ceil(this.maxFrameHeight / (this.minFrameWidth/ this.maxFrameWidth))
			};


			var $save = $('[data-btn-save]', $crop_ui).first();
			var $cancel = $('[data-btn-cancel]', $crop_ui).first();
			var saving = false;

			function startSaving() {
				saving = true;
				$cancel.disable();
				$save.disable();
				$slider_container.hide();
				$save_text.show();
			}
			function endSaving() {
				saving = false;
				$cancel.enable();
				$save.enable();
				$slider_container.show();
				$save_text.hide();
			}
			endSaving();

			if (canEdit) {
				$cancel.click(function() {
					image_crop.cancelEdit();
				});

				$save.click(function() {

					if (liveCrop) {
						let $img = $('img',$aimage).first();
						var src = $img.attr('src');

						if (!src) {
							alert('Please upload an image first!');
							return false;
						}
						startSaving();

						var doLiveCrop = function() {
							let canvas = document.createElement('canvas');
							let context2d = canvas.getContext('2d');
							let scale;

							canvas.width = image_crop.maxFrameWidth;
							canvas.height = image_crop.maxFrameHeight;
							if ($aimage.width() < image_crop.maxFrameWidth) {
								scale = image_crop.maxFrameWidth / $aimage.width();
							} else {
								scale = 1;
							}

							context2d.drawImage($img[0], $img.position().left*scale, $img.position().top*scale, $img.width()*scale, $img.height()*scale);

							let base64 = canvas.toDataURL('image/jpeg', 0.8).split(",").pop();
							var blob = ngutils.b64toBlob(base64, 'image/jpeg');

							var formData = new FormData();
							formData.append("qquuid","auto");
							formData.append("qqfile",blob);
							formData.append("qqfilename",'qqCanvasImage.jpg');

							if (saveParams) {
								for(var param in saveParams) {
									formData.append(param,saveParams[param]);
								}
							}

							$.ajax({
								url: saveEndpoint,
								type: "POST",
								data: formData,
								contentType: false,
								cache: false,
								processData:false,
								dataType:"json",
								error: function(err)
								{
									alert("There was an error uploading your image:\n\n"+err);
									endSaving();
								},
								success: function(result)
								{
									image_crop.oldSrc = result.image_url;
									image_crop.clearEdit();
									image_crop.onSaved(result);
								}
							});
							endSaving();
						};

						if ($img.naturalWidth === 0) {
							$img[0].onload = function() {
								doLiveCrop();
							};
						} else {
							doLiveCrop();
						}

					} else {
						startSaving();
						var output = {
							crop: image_crop.crop,
							frame: frame,
							parked_id: image_crop.parked_id
						};

						for(var i in saveParams) {
							output[i] = saveParams[i];
						}

						//console.log('posting',output,'to',saveEndpoint);

						$.post(saveEndpoint, output, function(result) {
							image_crop.oldSrc = result.image_url;
							image_crop.clearEdit();
							image_crop.onSaved(result);
						}, 'json').fail(function() {
							endSaving();
						});
					}
				});
			}

			this.cancelEdit = function() {
				image_crop.clearEdit();
				image_crop.onCancel();
			};

			this.clearEdit = function() {
				ngutils.blackout.undim();
				$crop_ui.hide();
				endSaving();
				mode = 'view';
				$container.removeClass('nodim');
				$container.removeClass('img-edit');
				$upload_container.addClass('can-upload');
				updateSrc(image_crop.oldSrc);
			};

			this.newImage = function(url) {
				mode = 'new';
				updateSrc(url);
				$container.addClass('img-edit');

				var rando = Math.random();

				var $slider = $('[data-scale-slider]', $crop_ui).first();

				$slider.slider({
					value: 0,
					min: 0,
					max: 1,
					step: 0.001,
					slide: function( event, ui ) {
						image_crop.fillScale = image_crop.minScale + ((image_crop.maxScale - image_crop.minScale) * ui.value);
						image_crop.draw();
					}
				});

				$crop_ui.show();
				$container.addClass('nodim');
				ngutils.blackout.dim();
				$upload_container.removeClass('can-upload');
			};

			this.onDragged = function(dragged) {
				this.dragMove = dragged;
				this.draw();
			};

			this.crop = null;

			this.draw = function() {

				$spinner.hide();

				if (!image.src || !image.width) return;
				if ($img.attr('src') !== image.src) $img.attr('src', image.src);

				$img.css("width","");
				$img.css("height","");
				$img.css('top', "");
				$img.css('left', "");

				if (image_crop.keepAspect) {
					image_crop.updateHeight();
				}


				var cWidth = $aimage.width();
				var cHeight = $aimage.height();

				if (mode === 'view') {
					$img.css("width","100%");
					var bleed = Math.floor((cHeight - $img.height()) / 2);

					$img.css('top', bleed+'px');

				} else {

					var iWidth = image.width;
					var iHeight = image.height;


					var iScale = cWidth / image_crop.maxFrameWidth;

					var drawMe = function() {
						var scale = iScale * image_crop.fillScale;
						var sWidth = iWidth * scale;
						var sHeight = iHeight * scale;

						if (image_crop.dragMove) {
							image_crop.anchor.x -= Math.round(image_crop.dragMove.x / scale);
							image_crop.anchor.y -= Math.round(image_crop.dragMove.y / scale);
							image_crop.dragMove = null;
						}

						var scaleFrame = {
							width: Math.ceil(frame.width * iScale),
							height: Math.ceil(frame.height * iScale)
						};

						var frameSpace = {
							w: scaleFrame.width / 2,
							h: scaleFrame.height / 2,
							x: (scaleFrame.width - sWidth) / 2,
							y: (scaleFrame.height - sHeight) / 2
						};

						var anchor = {
							x: image_crop.anchor.x * scale,
							y: image_crop.anchor.y * scale
						};

						if (anchor.x < frameSpace.w) {
							anchor.x = frameSpace.w;
							image_crop.anchor.x = anchor.x / scale;
						} else if (anchor.x > sWidth - frameSpace.w) {
							anchor.x = sWidth - frameSpace.w;
							image_crop.anchor.x = anchor.x / scale;
						}

						if (anchor.y < frameSpace.h) {
							anchor.y = frameSpace.h;
							image_crop.anchor.y = anchor.y / scale;
						} else if (anchor.y > sHeight - frameSpace.h) {
							anchor.y = sHeight - frameSpace.h;
							image_crop.anchor.y = anchor.y / scale;
						}

						image_crop.crop = {
							left: Math.round(image_crop.anchor.x - (frameSpace.w / scale)),
							right: Math.round(image_crop.anchor.x + (frameSpace.w / scale)),
							top: Math.round(image_crop.anchor.y - (frameSpace.h / scale)),
							bottom: Math.round(image_crop.anchor.y + (frameSpace.h / scale))
						};

						image_crop.crop.width = image_crop.crop.right - image_crop.crop.left;
						image_crop.crop.height = image_crop.crop.bottom - image_crop.crop.top;

						var bleed = {
							x: Math.round((cWidth/2) - anchor.x),
							y: Math.round((cHeight/2) - anchor.y)
						};

						$img.css("width", Math.ceil(sWidth)+"px");
						$img.css("height", Math.ceil(sHeight)+"px");
						$img.css("left", bleed.x+"px");
						$img.css("top", bleed.y+"px");
					};

					if (mode === 'edit') {
						drawMe();

					} else if (mode == 'new') {
						var wscale, hscale;

						wscale = frame.width / iWidth;
						hscale = frame.height / iHeight;
						image_crop.minScale = wscale > hscale ? wscale : hscale;

						image_crop.maxScale = image_crop.minScale * 2;
						if (image_crop.maxScale < 1) image_crop.maxScale = 1;

						image_crop.fillScale = image_crop.minScale;
						image_crop.anchor = {x:Math.floor(iWidth/2), y:Math.floor(iHeight/2)};
						mode = 'edit';
						drawMe();
					}
				}
			};

			$(image).on('load', this.draw);// draw when the image is ready
			$(function() { image_crop.draw(); }); // draw again when the page is loaded, because the scrollbar will affect things

			if (this.src) updateSrc(this.src);

			ngutils.event.addListener(ngutils.event.resize, function() {
				setTimeout(image_crop.draw, 5); // in some browsers this event fires before dom changes are recalculated
			});
		};

		ngutils.user = {};
		ngutils.user.block = {
			onClickTogglePreview: function(event, $element) {
				event.preventDefault();

				var $wrapper = $($element).closest('[data-block-target]');
				if ($wrapper.hasClass('preview-blocked')) {
					$wrapper.removeClass('preview-blocked');
				} else {
					$wrapper.addClass('preview-blocked');
				}
			},
			handleUpdates: function(data) {

				function updateTarget(target, page, data, blocked) {
					var $element = $('[data-block-target="'+target+'"]');
					if ($element.length < 1) return false;

					$element.removeClass('preview-blocked');

					if (blocked) {
						$element.addClass('user-is-blocked').removeClass('user-not-blocked');
					} else {
						$element.addClass('user-not-blocked').removeClass('user-is-blocked');
					}

					var uparams = {
						user_id: data.user_id,
						page: page,
						blocked: blocked,
						exemptions: data.exemptions
					};

					function doEvent(e) {
						ngutils.event.dispatch(
							$(e).attr('data-block-event'),
							uparams
						);
					}

					$element.each(function() {
						if ($(this).attr('data-block-event')) doEvent($(this));
					});

					$('[data-block-event]', $element).each(doEvent);
					return uparams;
				}

				var blocked = false;

				for(var i in data.exemptions) {
					if (!data.exemptions[i]) {
						blocked = true;
						break;
					}
				}

				updateTarget(data.user_id, null, data, blocked);

				for(var page in data.exemptions) {
					var target = page+'-'+data.user_id;
					blocked = !data.exemptions[page];

					var uparams = updateTarget(target, page, data, blocked);

					if (uparams) ngutils.event.dispatch(ngutils.event.userBlockUpdated, uparams);
				}
			}
		};

		ngutils.event.addListener(ngutils.event.userBlocksUpdated, ngutils.user.block.handleUpdates);

		ngutils.uploads = {
			deleteImageUpload: function(url, source_type, source_id, callback) {
				$.post(
					'/image-delete', {
						url:url,
						source_type: source_type,
						source_id: source_id
					},
					callback,
					'json'
				).fail((x)=> {
					if(x.status !== 403) {
						alert('Unexpected error!');
						console.error('Unexpected error',x.responseText);
					}
				});
			}
		};

		ngutils.moderation = {
			enableImageModeration: ($img, callback)=>{
				$img = $($img);
				let $wrapper = $($img).parent();

				let $module = $('<div class="padded" style="position:absolute; top:0px; right: 0px"><a class="ngicon-25-trash" title="Delete Image"></a></div>');
				$wrapper.append($module);

				$('a',$module).click((e) => {
					e.preventDefault();
					if (confirm("Are you sure you want to delete this image?")) {
						callback(()=>{
							$module.remove();
							ngutils.element.fancyRemove($img, ()=>{
								$wrapper.remove();
							});
						});
					}
				});
			}
		};

		ngutils.blogpost = {
			contentType: 4001,

			enableImageModeration: ($img) => {
				$img = $($img);

				ngutils.moderation.enableImageModeration($img, (onComplete)=>{
					let source_id = parseInt($img.closest('[data-post-id]').attr('data-post-id'));
					ngutils.uploads.deleteImageUpload($img.attr('src'), ngutils.blogpost.contentType, source_id, (result)=> {
						onComplete();
					});
				});
			},
		};

		ngutils.bbspost = {
			contentType: 3002,
			form_id: 0,

			unbanFromClick: (event, button) => {
				event.preventDefault();

				var user_id = $(button).attr('id').split('_').pop();
				var user = PHP.get('bbs_poster_' + user_id, "this user");

				if (!confirm("Are you sure you want to clear\n" + user + "'s ban?")) return;

				$.post(button.href, ()=>{

					let $parent = $(button).closest('[data-ban-details-for]');
					let $ban_btn = $('[id="ban-btn-text"]', $parent);
					let $clear_btn = $('[id="clear-ban-btn"]', $parent);
					let $ban_details = $('[id="ban-details"]', $parent);
					$clear_btn.hide();
					$ban_details.hide();
					$ban_btn.html('ban');
				});

			},

			deleteFromClick: (event, button, post_id, which) => {
				event.preventDefault();
				let $button = $(button);
				if (confirm('Are you sure you want to delete this '+which+'?')) {
					$.post($button.attr('href'), ()=>{
						let $remove;
						if (which === 'pic') {
							$button.remove();
							ngutils.element.fancyRemove($('[id="bbspost_img_'+post_id+'"]').parent());
						} else {
							ngutils.element.fancyRemove($('[id="bbspost'+post_id+'_post_text"]').parent());
						}
					});

				}
			},

			enableImageModeration: ($img) => {
				$img = $($img);

				ngutils.moderation.enableImageModeration($img, (onComplete)=>{
					let source_id = parseInt($img.closest('[data-post-id]').attr('data-post-id'));
					ngutils.uploads.deleteImageUpload($img.attr('src'), ngutils.bbspost.contentType, source_id, (result)=> {
						onComplete();
					});
				});
			},

			loadFormOnClick: (event, button, post_id, container, context) => {
				event.preventDefault();
				if (!PHP.get('user_logged_in')) {
					PassportHandler.open();
					return;
				}
				let $button = $(button);
				ngutils.bbspost.loadForm(post_id, $button.attr('href'), container+"", context);
			},

			loadForm: (post_id, href, container, context) => {
				ngutils.bbspost.form_id++;
				let fid = ngutils.bbspost.form_id;
				var bo = new ngutils.blackout({remove_on_hide:true});

				if (!context) context = 'post';

				let $container = $(container);

				ngutils.event.addListener('bbs-form-loaded-'+fid, (data) => {
					if (!data.result || typeof(data.result.url) === typeof(undefined)) {
						data.posthandler.handled_by_event = true;
						alert("There was an unexpected problem with your post.");
						return;
					}

					if ($container.length < 1 || typeof(data.result.html) === typeof(undefined)) {
						bo.hide();
						data.posthandler.handled_by_event = false;
						return;
					}

					if (context === 'edit') {
						data.posthandler.handled_by_event = true;
						let $html = $("<div>").html(data.result.html);
						$('[id="bbspost'+post_id+'_post_text"]').html($html.html());
						bo.setBody("<p><strong>Changes Saved!</strong></p>");
						setTimeout(()=>{ bo.hide(); }, 750);
					} else {
						data.posthandler.handled_by_event = true;
						bo.hide();

						$container.css('display','block');
						let $parent = $container.closest(".blackout-hover");
						let top;

						if ($parent.length < 1) {
							$parent = $('html,body');
							top = $container.offset().top;
						} else {
							top = $container.position().top;
						}

						top += $container.outerHeight();

						let $post = $('<div>');

						$post.append($(data.result.html));

						$post = $('div:first', $post);
						if (!data.result.noscroll) $parent.stop().animate({ scrollTop: top }, 300);

						$container.append($post);
						if ($post.width()) $post.attr('data-scale-width', $post.width());
						$post.hide();

						setTimeout(() => {
							$('[data-smart-scale]', $post).each(() => {
								new ngutils.media.smartscale($(this));
							});
						}, 1);

						$post.css('visibility','hidden');

						setTimeout(()=>{
							$post.css('visibility','').hide();
							$post.fadeIn(800, ()=>{
							});
						}, 250);
					}
				});


				bo.load(href, {form_id:fid, container_id:$container.attr('id'), from_page:PHP.get('bbs_topic_page',0)});
			}
		};

		ngutils.event.addListener('bbs-user-banned', (data)=>{
			let $details = $('[data-ban-details-for="'+(data.user.toLowerCase())+'"]');
			let $new = $(data.html);
			$details.html($new.html());
		});

		ngutils.bbssig = {

			deleteFromClick: (event, button, user_id, which) => {
				event.preventDefault();
				let $button = $(button);

				let msg = "signature";
				if (which == 'text') msg = "sig text";
				else if (which == 'pic') msg = "sig banner";

				if (!confirm("Are you sure you want to delete this "+msg+"?")) return;

				let $e = $('[id^="bbs_sig_"][id$="_'+user_id+'"]');

				function deleteText($e) {
					$('.sig-text', $e).remove();
					$('[id^="delete_sig_text_"]', $e).remove();
				}

				function deletePic($e) {
					$('.sig-image', $e).remove();
					$('[id^="delete_sig_pic_"]', $e).remove();
				}

				$.post($button.attr('href'), ()=>{

					$('[id^="delete_sig_both_"]', $e).remove();

					if (which == 'both') {
						deleteText($e);
						deletePic($e);
					} else if (which == 'pic') {
						deletePic($e);
					} else {
						deleteText($e);
					}

				});
			},

			onUpdated: (user_id, updates) => {
				var au = PHP.get('activeuser');
				var is_activeuser = au && au.id ? au.id == user_id : false;

				$('div.bbs-sig[id$="_'+user_id+'"]').each(function() {


					var $sig_text = $('div.sig-text:first', $(this));
					var $sig_image_wrapper = $('div.sig-image:first', $(this));
					var $sig_image = $('img:first', $sig_image_wrapper);
					var $sig_link = $('a:first', $sig_image_wrapper);

					function clearLink() {
						$sig_link.removeAttr('href');
					}

					function clearImage() {
						$sig_image.removeAttr('src');
						clearLink();
					}

					var val, update;

					for(update in updates) {
						val = $.trim(updates[update]);

						switch(update) {

							case 'image':
								if (val) $sig_image.attr('src',val).removeAttr('width').removeAttr('height');
								else clearImage();
								break;

							case 'link':
								if (val) $sig_link.attr('href',val);
								else clearLink();
								break;

							case 'text':
								if (val) $sig_text.html(val);
								else $sig_text.html('');
						}
					}


					// check for empty sig
					if (!$.trim($sig_text.html()) && !$sig_image.attr('src')) {
						if (is_activeuser) {
							$('.add-signature-link', $(this)).show();
						} else {
							$(this).hide();
						}
					} else {
						if (is_activeuser) {
							$('.add-signature-link', $(this)).hide();
						} else {
							$(this).show();
						}
					}
				});
			}
		};

		ngutils.b64toBlob = function(b64Data, contentType, sliceSize) {
			contentType = contentType || '';
			sliceSize = sliceSize || 512;

			var byteCharacters = atob(b64Data);
			var byteArrays = [];

			for (var offset = 0; offset < byteCharacters.length; offset += sliceSize) {
				var slice = byteCharacters.slice(offset, offset + sliceSize);

				var byteNumbers = new Array(slice.length);
				for (var i = 0; i < slice.length; i++) {
					byteNumbers[i] = slice.charCodeAt(i);
				}

				var byteArray = new Uint8Array(byteNumbers);

				byteArrays.push(byteArray);
			}

			var blob = new Blob(byteArrays, {type: contentType});
			return blob;
		};

		ngutils.taghelper = function(prefix, is_user_type, input_id, max_length, max_entries) {
			var self = this;

			self.prefix = prefix;
			self.is_user_type = is_user_type;

			if ($.type(input_id) === 'string') {
				if (input_id.indexOf('#') !== 0) {
					self.$input = $('#' + input_id);
				} else {
					self.$input = $(input_id);
					input_id = input_id.substring(1);
				}

			} else {
				self.$input = input_id;
				input_id = self.$input.attr('id');
			}

			// add instance to ourself
			ngutils.taghelper.instances[input_id] = self;

			// this is the div that wraps the input, the collection, etc.
			self.$container = self.$input.parents('div[id^="' + self.prefix + '_input"]');
			/*if (PHP.get('ng_developer_debug')) {
				console.log("Container: ");
				console.log('div[id^="' + self.prefix + '_input"]');
				console.log(self.$container.exists());
			}*/

			/**
			 * this is the partial that contains all the markup
			 * for the auto completion.
			 */
			self.$entry_template = $($('#' + self.$container.attr('id') + '_' + prefix).html());
			if (PHP.get('ng_developer_debug')) {
				console.log("Entry template: ");
				console.log('#' + self.$container.attr('id') + '_' + prefix);
				console.log(self.$entry_template.exists());
			}

			self.names = [];
			self.max_length = max_length;
			self.max_entries = max_entries || false;

			// anything we might want to set on the fly, or alter later
			self.options = {};

			self.init();
		};

		ngutils.taghelper.prototype = {
			/**
			 * @param {object} $element - the tag element
			 *
			 * The tag or string to add.
			 */
			addToCollection: function(str) {
				var self = this;

				console.log("Template: ");
				console.log(self.$entry_template);

				var $tag = self.$entry_template.clone();
				str = str.substr(0, self.max_length);

				$('span', $tag).html(str);
				$('input', $tag).val(str);

				self.register($tag);

				var $collection = $('.tag-collection', self.$container);

				if ($collection.exists()) {
					$collection.append($tag);
				}

				// anything post collection here
				self.onAddEntry($tag);
			},

			/**
			 * Tags that have been entered are clumped in a collection
			 * pool (display). If we remove a tag from the collection and it
			 * becomes empty, then we'll hide the entire (empty) pool.
			 * Otherwise, we'll ensure it's visible.
			 */
			checkCollection: function() {

				var self = this;
				var $collection = self.getCollection();

				// since this gets called on all updates, it's a handy place to dispatch a generic event
				ngutils.event.dispatch(ngutils.event.tagsUpdated, this);

				if ($collection && $collection.exists()) {
					var total = $('div.tag', $collection).length;
					if (total === 0) {
						$collection.hide();
					} else {
						$collection.show();
					}

					// updates the "x/y tags used" span
					var $used = $('#' + self.$container.attr('id') + '_used');

					$used.html(total);
				} else {
					// debug
				}
			},

			pushToCollection: function(tags) {
				var self = this;
				// we need something for a tag pool here, so we
				// can list the tags the user's entered. This may not
				// exist at the time the input is initiated
				var existing = $('div', self.getCollection()).length;
				var found = false;
				var str;

				var strip = function(t) {
					return $.strip_text(t, ! self.is_user_type);
				};

				console.log(tags);

				for (var i=0, len=tags.length; i<len; ++i) {
					if (self.options && self.options.strip !== false) {
						str = strip(tags[i]);
					} else {
						str = tags[i];
					}

					if (str.length && !$.rInArray(str.toLowerCase(), self.names)) {
						console.log("ADDING");
						self.addToCollection(str);

						found = true;
						existing = existing + 1;
					} else if (str.length && $.rInArray(str.toLowerCase(), self.names)) {
						found = true;
					}

					if (false !== self.max_entries && existing === self.max_entries) {
						break;
					}
				}

				self.checkCollection();

				return found;
			},

			disable: function() {
				var self = this;
				self.$input.disable();
			},

			enable: function() {
				var self = this;
				self.$input.enable();
				$(document).focus();
				self.init();
			},

			// this isn't available when initialized, but should be afterwards
			getCollection: function() {
				return $('.tag-collection', self.$container);
			},

			init: function() {
				var self = this;

				if (null === self.max_entries) {
					throw "Please set max entries.";
				}

				var strip = function(t) {
					return $.strip_text(t, ! self.is_user_type);
				};


				var addTag = function(str) {
					self.addToCollection(str);
				};

				var addToCollection = function(e) {
					var v = this.value;
					var tags = v.split(',');

					if (!v.length) {
						return true;
					}

					// we need something for a tag pool here, so we
					// can list the tags the user's entered. This may not
					// exist at the time the input is initiated
					var found = self.pushToCollection(tags);
					/*var existing = $('div', self.getCollection()).length;
					var found = false;
					var str;

					for (var i=0, len=tags.length; i<len; ++i) {
						if (self.options && self.options.strip !== false) {
							str = strip(tags[i]);
						} else {
							str = tags[i];
						}

						if (str.length && !$.rInArray(str.toLowerCase(), self.names)) {
							addTag(str);

							found = true;
							existing = existing + 1;
						}

						if (false !== self.max_entries && existing === self.max_entries) {
							break;
						}
					}*/

					console.log(found);

					if (found) {
						$(this).val('');
					}

					if (false === self.max_entries || $('div', self.getCollection()).length < self.max_entries) {
						$(this).focus();
						// do something with focus here
					} else {
						$(this).prop('disabled', true);
						//  move on to next field
						self.tabProgressesTo();
					}

				};

				self.$input.off().on('blur', addToCollection).on('paste', function(e) {
					// try a straight out insert of whatever they've pasted
					var that = this;
					setTimeout($.proxy(addToCollection, that), 0);
				}).on('keydown', function(e) {
					var that = this;

					// enter forces update when there's text to be had.
					// have to set a timeout here, because when a user keydowns
					// and hits enter on an autocomplete suggestion, it fires
					// this event and needs a little time to update
					if (e.which === 13) {
						setTimeout(function() {
							if (that.value.length) {
								$(that).blur();
							}
						}, 0);

						e.preventDefault();
					} else if (e.which && e.which === 9) {
						// they were tabbing through autocomplete fields
						if ($(this).data('tablock')) {
							$(this).data('tablock', false);
							setTimeout(function() {
								if ($(that).prop('disabled')) {
									self.tabProgressesTo();
								} else {
									$(that).focus();
								}
							}, 0);
						} else if (that.value.length) {
							// chuck in what they'd written
							$(this).blur();
							return false;
						} else {
							// progress to next field as per usual form
							// convention
							self.tabProgressesTo();
						}

					}
				});
			},

			/**
			 * @param {object} $element - the tag element
			 *
			 * This is called from ....
			 *
			 */
			onAddEntry: function($element) {
				console.debug("taghelper.onAddEntry must be overwritten.");
			},

			/**
			 * @param {object} $element - the tag element
			 * @param {boolean} editing - whether we've pushed to input
			 *
			 * Override this should you need to do anything special
			 * when the tag element is removed from the DOM.
			 *
			 * Initialized from within register()
			 */
			onRemoveEntry: function($element, editing) {
				console.debug("taghelper.onAddEntry must be overwritten.");
			},

			pushName: function(n) {
				this.names.push(n.toLowerCase());
			},

			/**
			 */
			register: function($element) {
				var self = this;

				if ($.isString($element)) {
					$element = $('#' + $element);
				}

				if (!$element.exists()) {
					console.log("Can't register element, it doesn't exist.");
					console.log($element);
					return false;
				}

				// prevent re-use
				self.names.push($('span', $element).html().trim());

				// anything special that needs to happen when the user clicks
				// the x to remove the entry
				/*$element.on('remove', function(e) {
			 		self.onRemoveEntry($element, e);
				});*/

				// clicking the tag itself should put it back into editing
				// mode
				/*$element.not('a[class$="close"]').click(function() {
					self.removeEntry($element, true);
				});*/

				$element.click(function(e) {
					if ($(e.target).is('span')) {
						self.removeEntry($element, true);
					}
				});

				// the X to remove the tag from the collection
				$('a[class$="close"]', $element).click(function() {
					self.removeEntry($(this));
				});
			},

			/**
			 * Doesn't currently do anything other than remove from
			 * the form - if we add data attributes to this for existing
			 * entries, we could then do physical removals (rather than
			 * as a result of a big form submit)
			 */
			removeEntry: function($element, push_to_input) {
				var self = this;

				//var $container = ngutils.taghelper.getElementContainer($element);
				//var $input = $('input[name="tag"]', $container);
				//var $collection = ngutils.taghelper.getCollection($element);
				push_to_input = push_to_input || false;

				// might be the ngicon-small-close link
				if ($element.is('a')) {
					$element = $element.parent('div');
				}

				var slug = $('input', $element).val();
				var tmp = self.names;
				var i = tmp.indexOf(slug);

				// remove from our registered names, so it may be inputted
				// again where necessary
				if (-1 !== i) {
					tmp.splice(i, 1);
					self.names = tmp;
				}

		 		self.$input.prop('disabled', false);

		 		// they clicked the tag, presumably to edit it
		 		if (push_to_input) {
		 			self.$input.val($('span', $element).html().trim()).focus();
		 		}

		 		var $clone = $element;
				$element.remove();

				self.onRemoveEntry($clone, push_to_input);
				self.checkCollection();
			},

			/**
			 * When the user hits the tab key, if the field is empty, move to this
			 * element next.
			 * Override where necessary.
			 */
			tabProgressesTo: function() {
				// for quill editors - art tabs onto this
				setTimeout(function() {
					$('div[contenteditable]').first().focus();
				}, 0);
			},

			setStrip: function(bool) {
				this.options.strip = bool;
				return this;
			}
		};

		ngutils.taghelper.prototype.constructor = ngutils.taghelper;

		ngutils.taghelper.instances = {};
		ngutils.taghelper.getInstance = function(id) {
			if ($.type(id) !== 'string') {
				id = id.attr('id');
			}

			if (ngutils.taghelper.instances[id]) {
				return ngutils.taghelper.instances[id];
			} else {
				return null;
			}
		};

	})(jQuery);
}
