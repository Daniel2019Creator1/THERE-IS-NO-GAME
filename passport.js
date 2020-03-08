if (typeof(PassportHandler) == 'undefined') {

	var PassportHandler = {callbacks:{}};
	(function($) {
		$(document).ready(function() {

			// these need to be set in the header before this class is loaded
			var _passport_html = PHP.get('_passport_html', false);
			var _passport_create_html = PHP.get('_passport_create_html', false);
			var _passport_redirect = PHP.get('_passport_redirect', false);

			if (false === _passport_html || false === _passport_redirect) {
				return;
			}

			var container = $('#passport_container');
			var login = $('#passport_login');
			var create = $('#passport_create');
			var margin = 60;

			// make sure the browser can handle event listeners
			var eventMethod = window.addEventListener ? "addEventListener" : "attachEvent";
			var eventer = window[eventMethod];
			var messageEvent = eventMethod == "attachEvent" ? "onmessage" : "message";
			if (typeof(eventer) == 'undefined') return;

			login.click(function() {
				PassportHandler.open();
				return false;
			});

			create.click(function() {
				PassportHandler.open(true);
				return false;
			});

			/**
			 * @param {boolean} create_new - opens sign up vs. log in when true
			 */
			PassportHandler.open = function(create_new) {
				container.html(create_new === true ? _passport_create_html : _passport_html);
				var frame = $('#passport_frame');

				if (PHP.get('ng_design','2012') == '2012') {
					container.height($(document).height());
					frame.height($(document).height() - margin);
				}

				frame.css('margin-top', margin);

				container.show();

				return PassportHandler;
			};

			PassportHandler.close = function() {
				container.html('');
				container.hide();

				return PassportHandler;
			};

			PassportHandler.addCallback = function(event, callback) {
				if (typeof PassportHandler.callbacks[event] === typeof undefined) {
					PassportHandler.callbacks[event] = [];
				}

				PassportHandler.callbacks[event].push(callback);

				return PassportHandler;
			};

			PassportHandler.removeCallback = function(event, callback) {
				if (typeof PassportHandler.callbacks[event] === typeof undefined) {
					return;
				}

				var index = PassportHandler.callbacks[event].indexOf(callback);

				if (index > -1) {
					PassportHandler.callbacks[event].splice(index,1);
				}

				return PassportHandler;
			};

			PassportHandler.executeCallbacks = function(event, message) {
				if (typeof PassportHandler.callbacks[event] === typeof undefined) {
					return;
				}

				var i, result;
				for(i = PassportHandler.callbacks[event].length - 1; i >= 0; i--) {
					result = PassportHandler.callbacks[event][i](message);

					if (result === false) {
						return;
					}
				}
			}

			PassportHandler.removeAllCallbacks = function(event) {
				if (typeof(event) == 'undefined') {
					PassportHandler.callbacks = {};
				} else {
					PassportHandler.callbacks[event] = {};
				}

				return PassportHandler;
			};

			// default callbacks
			PassportHandler.addCallback('requestLogin', function(message) {
				return PassportHandler.open();
			});

			PassportHandler.addCallback('closePassport', function(message) {
				return PassportHandler.close();
			});

			PassportHandler.addCallback('userLogin', function(message) {
				window.location.replace(_passport_redirect);
			});

			PassportHandler.getContainer = function() {
				return container;
			};

			/*
			 * Put the iframe down as far as the page has scrolled, or to a specific
			 * point in the page. Margin automatically added.
			 */
			PassportHandler.reposition = function(pos) {
				if (typeof pos === typeof undefined) {
					pos = $(document).scrollTop();
				}

				$('.passport_frame').css('margin-top', pos + margin);

				return PassportHandler;
			};

			// handles the actual postMessage event then passes it to our passport event dispatching
			eventer(messageEvent,function(e) {
				var message = e.data;

				// is the event even from NG?
				var ng_domains = [
					'newgrounds.com',
					'ungrounded.net',
					'newgrounds-s.com',
					'newgrounds-d.com'
				];

				if (!(function() {
					for(var i in ng_domains) {
						var len = ng_domains[i].length;

						if (e.origin.substr(-(len)).toLowerCase() === ng_domains[i]) {
							return true;
						}
					}
					return false;
				})()) return;

				// if any of these are not defined, it's not a proper NG event
				if (typeof message.success === typeof undefined || typeof message.event === typeof undefined) return;

				PassportHandler.executeCallbacks(message.event, message);
			},false);
		});

	})(jQuery);
}