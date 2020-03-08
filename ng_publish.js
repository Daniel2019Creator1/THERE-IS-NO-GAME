/**
 * Additional functions available on the jQuery object ($)
 *
 * up: same as Prototype Element.up()
 *
 * down: same as Prototype Element.down()
 *
 * imgload: assign a function to be called when an image has loaded.
 *   NOTE: The argument passed to the callback function is the IMG element itself, NOT an event object (and not a jQuery objec)
 */

/*jshint jquery: true */
/*global NgFormValidator: false, enableSelectFacades: false, LinkWatcher: false, FlashWriter: false */

(function ($) {
	var clone = function(obj) {
		var obj2 = {};

		$.each(obj, function(key, val) {
			obj2[key] = val;
		});

		return obj2;
	};

	var set = function(obj, key, val) {
		var obj2 = clone(obj);
		obj2[key] = val;

		return obj2;
	};

	$.fn.down = function (selector) {
		if (typeof selector === 'undefined') return this.children(':eq(0)');
		else return this.find(selector + ':first');
	};

	// shorter name; similar in functionality to Prototype
	$.fn.up = $.fn.closest;

	// passes element as first argument to function, instead of second
	$.fn.Each = function (callback) {
		this.each(function () {
			callback(this);
		});
	};

	// flips $.each
	$.Each = function (arr, callback) {
		return $.each(arr, function (index, value) {
			callback(value, index);
		});
	};

	// Extract a method, for passing as an argument for example
	$.method = function(obj, name) {
		return function() {
			obj[name].apply(obj, arguments);
		};
	};

	$.invoke = function(obj, method, args) {
		var f;
		if (args && args.length) {
			f = function(x) { return x[method].apply(x, args); };
		} else {
			f = function(x) { return x[method](); };
		}

		return $.map(obj, f);
	};

	$.endsWith = function(haystack, needle) {
		return haystack.substr(haystack.length - needle.length) === needle;
	};

	$.beginsWith = function(haystack, needle) {
		return haystack.substr(0, needle.length) === needle;
	};

	// this is the same as the $ function, only it takes a "true" argument, like in Prototype
	$.fn.serialize = function(as_array) {
		if (as_array) return this.serializeArray();
		else return $.param(this.serializeArray());
	};

	// whether this element and all of its children have loaded - mostly useful for IMG elements
	$.fn.isLoaded  = function (value) {
		var is_loaded = true;

		this.find('img').each(function() {
			// custom member "fail" indicates we have given up on this image
			if (this.fail) return;

			if (this.tagName === 'IMG') {
				if (typeof(this.naturalWidth) !== 'undefined') { // Gecko
					is_loaded = is_loaded && this.complete;
				} else if (typeof(this.complete) === 'boolean') { // IE
					is_loaded = is_loaded && this.naturalWidth;
				} else { // this will always be true, unless the img has no width attr., in which case it's only true when the img is loaded
					is_loaded = is_loaded && this.width;
				}
			} else { /* do nothing; assume is loaded */ }
		});

		return is_loaded;
	};

	/**
	 * define a function to call when element is loaded (see isLoaded above)
	 * data - (all params are optional): {
	 *   period: time between checks, in milliseconds, default 100
	 *   timeout: when to stop checking, in milliseconds, default 5000
	 */
	$.fn.loaded = function (handler, data) {
		var total_time = 0;

		if (!data) data = {};
		if (data.period === undefined) data.period = 100;
		if (data.timeout === undefined) data.timeout = 5000;

		var that = this;

		var doWaiting = function () {
			if ($(that).isLoaded() || total_time > data.timeout) { // if we timeout, call event handler anyway
				handler(that);
				if (that._loaded_timer) {
					clearTimeout(that._loaded_timer);
				}
			} else {
				total_time += data.period;
				that._loaded_timer = setTimeout(doWaiting, data.period); // FIXME: use this to remove the listener
			}
		};

		doWaiting();
	};

	/* FORMS */

	/**
	 * Enable a form element, or all of the elements in a form
	 * OR pseudo-enable an <a> tag.
	 */
	$.fn.enable = function () {
		var that = $(this);
		if (that.is('form')) {
			that.find('input, textarea, select, button').enable();
		} else if (that.is('a')) {
			that.css({
				'cursor': that.data('cursor') || 'pointer',
				'pointer-events': that.data('pointer_events') || 'auto'
			});
		} else {
			that.each(function () {
				that.prop('disabled',false);
			});
		}

		return this;
	};

	/**
	 * Disable a form element, or all of the elements in a form
	 * OR pseudo-enable an <a> tag.
	 */
	$.fn.disable = function () {
		var that = $(this);
		if (that.is('form')) {
			that.find('input, textarea, select, button').disable();
		} else if (that.is('a')) {
			that.data('cursor', that.css('cursor'));
			that.data('pointer_events', that.css('pointer-events'));

			that.css({
				'pointer-events': 'none',
				'cursor': 'default'
			});
		} else {
			that.prop('disabled', true);
		}

		return this;
	};

	/**
	 * Enables (or disables if false is passed) detection of click events outside this element
	 */
	$.fn.enableClickOutside = function(enable) {
		var self = this;
		enable = enable === false ? false:true;

		this.__click_outside_enabled = enable;

		if (!this.__document_ref) {
			this.__document_ref = $(document);
		}

		// detects if a click on the document happened outside of this element
		if (!this.__clickOutside_function) {
			this.__clickOutside_function = function(event) {
				if (!$(event.target).closest(self).length) {
					self.trigger('clickOutside');
				}
			};
		}

		// clean up reference to this element in the document-level events
		if (enable) {
			this.__document_ref.on('click', this.__clickOutside_function);
		} else {
			this.__document_ref.off('click', this.__clickOutside_function);
		}

		return this;
	};

	/**
	 * Disables detection of click events outside this element
	 */
	$.fn.disableClickOutside = function() {
		return this.enableClickOutside(false);
	};

	/**
	 * Makes sure detection of click events outside this element are enabled, and creates a 'clickOutside' event handler
	 */
	$.fn.clickOutside = function(handler) {
		if (!this.__click_outside_enabled) this.enableClickOutside(true);
		return this.on('clickOutside', handler);
	};

	/**
	 * Set value of file input on corresponding text input "facade"
	 * Change this if method of facade changes
	 */
	$.fn.setUploadVal = function (val) {
		if (typeof val === 'undefined') {
			val = this.val();
		}

		if (this.is('input[type="file"]')) {
			// this.nextAll('input:first').val(this.val());
			this.next().next().val(this.val());
		}

		return this;
	};

	$.fn.validate = function (validations) {
		if (this.is('form')) {
			this.bindValidator(new NgFormValidator(this, validations));
		}

		return this;
	};

	// put the cursor at the end of a textarea
	// http://stackoverflow.com/a/11756980
	$.fn.focusToEnd = function() {
		return this.each(function() {
			var v = $(this).val();
			$(this).focus().val("").val(v);
		});
	};

	// double submit handling
	(function() {
		var getSubmitButtons = function(elem) {
			return $(elem).find('button[type!="reset"][type!="button"], input[type="submit"]');
		};

		$.fn.disableSubmit = function() {
			getSubmitButtons(this).disable();
		};
		$.fn.enableSubmit = function() {
			getSubmitButtons(this).enable();
		};
	})();

	$.fn.preventDoubleSubmit = function () {
		this.submit(this.disableSubmit);
	};
	$.fn.allowDoubleSubmit = function () {
		//this.unbind('submit', this.disableSubmit);

		// updated for jquery 3
		this.off('submit', this.disableSubmit);
	};

	(function () {
		var
			validation_str = 'validation',
			getValidationFunction = function (validator) {
				if (validator) {
					return function (e) {
						validator.validate();

						if (!validator.isValid()) {
							// tell user about errors
							validator.inform();

							// don't do other handlers
							e.stopImmediatePropagation();

							return false;
						}
					};

				}
			}
		;

		/**
		 * Bind the validation function to the submit event
		 */
		$.fn.bindValidator = function (validator) {
			var validation = getValidationFunction(validator);
			this.data(validation_str, validation);
			this.data('validator', validator);

			return this.submit(validation);
		};

		$.fn.unbindValidator = function () {
			//return this.unbind('submit', this.data(validation_str));

			// updated for jquery 3
			return this.off('submit', this.data(validation_str));
		};

	})();

	// Checks to see whether an element actually exists (for cases when checkboxes
	// are in place in some instances as per user agreements and when they're not
	// etcetra)
	$.fn.exists = function () {
		return this.length > 0;
	};

	// same as .text(), but returns an array
	$.fn.Text = function () {
		return $.map(function () {
			return $(this).text();
		}).get();
	};

	// for adding callbacks to $.ajax options like success, error, etc.
	var addFunction = function(func_list, func) {
		if (typeof func_list === 'function') {
			return [func_list, func];
		} else if (typeof func_list === 'object') {
			// assume is an array
			return func_list.concat([func]);
		} else {
			return func;
		}
	};

	/**
	 * success_func - runs on success
	 * element - element to set the waiting animation on; optional
	 * options - parameters to $.ajaxWait
	 */
	$.fn.ajaxSubmit = function (success_func, options) {
		var that = this;
		options = options || {};

		var originator, action, method = 'post';

		// only if it's a form, or a button of type submit
		// (check further credentials)
		if (this.is('form') || (this.is('button') && this.attr('type') === 'submit')) {

			if (this.is('form')) {
				originator = 'form';
				action = this.attr('action');
			} else {
				if (!this.attr('formaction') || !this.attr('formmethod')) {
					throw "Must get form action and method";
				}

				originator = 'button';
				action = this.attr('formaction');
				method = this.attr('formmethod');
			}
			// "this" is the form. Use set() to avoid modifying function argument
			options = set(options, originator, this);

			return $.ajaxWait(method, action, null, success_func, options);
		}
	};

	/**
	 * see argument documentation for $.fn.ajaxSubmit above
	 */
	$.fn.ajaxify = function (success_func, options) {
		if (this.is('form')) {
			var that = this;
			options = options || {};
			options.form = options && options.form || this;

			// add submit button data to the data we send, to mimic a real submission
			// this.delegate('button, input[type="submit"]', 'click', function () {
			//this.delegate('button', 'click', function () {

			// updated for jquery 3
			this.on('click', 'button', function () {
				options.data = that.serializeArray();
				options.data.push({ name: this.name, value: this.value });
				$(that).ajaxSubmit(success_func, options);
				return false;
			});

			return this.submit(function () {
				$(this).ajaxSubmit(success_func, options);
				return false;
			});
		}
	};

	/**
	 * NOTE: it is no longer necessary to pass userkey, it will be set automatically
	 * if omitted
	 *
	 * Examples:
	 * $('.somehref').ajaxifyLink({ data: { userkey: 'parp' }});
	 * $('.somehref').ajaxifyLink({ success_func: function() { } });
	 * will take the link, submit as post, the idea here is to pass any sensitive
	 * info through data, rather than passing it as a url param
	 *
	 * if confirmation is present and a string, pass through confirm() to present
	 * the user with a choice
	 */
	$.fn.ajaxifyLink = function(options, confirmation) {
		if (typeof options === 'string' && typeof confirmation === 'function') {
			var temp = options;
			options = {success_func: confirmation};
			confirmation = temp;
		} else if ((typeof options === 'string' || typeof options === 'function') && typeof confirmation === typeof undefined) {
			confirmation = options;
			options = true;
		} else if (typeof options === 'function') {
			confirmation = options;
			options = true;
		}

		options = options || {};
		confirmation = confirmation ? confirmation : false;

		// simple redirect on completion
		if (true === options) {
			options = {};
			options.success_func = true;
		}

		if (typeof options.data === typeof undefined) {
			options.data = {};
		}


		// pass userkey by default
		if (typeof options.data.userkey === typeof undefined) {
			options.data.userkey = PHP.get('uek');
		}

		// allow confirmation to be passed as options
		if (false === confirmation && options.confirmation) {
			confirmation = options.confirmation;
		}

		$(this).off().on('click', function(e) {
			e.preventDefault();

			// provide a means of calling back
			if (undefined !== options.onclick) {
				options.onclick(this);
			}

			if (confirmation) {
				// ask the user if this is what they want to do
				if (typeof confirmation === 'string') {
					if (!confirm(confirmation)) {
						return false;
					}
				// do something more intricate
				} else if (typeof confirmation === 'function') {
					var ret;

					// false means no dice, whatever this function does
					if (false === (ret = confirmation(this))) {
						return false;
					}

					// do this if we're successful
					if (ret) {
						if (true === ret) {
							options.success_func = true;
						} else if (undefined !== ret.success_func) {
							options.success_func = ret.success_func;
						}
					}

					// and this if we're not
					if (ret && undefined !== ret.error) {
						options.error = ret.error;
					}
				}

			}

			var url;
			if ($(this).is('a')) {
				url = this.href;
			} else if ($(this).is('button') && $(this).attr('formaction')) {
				url = $(this).attr('formaction');
			} else {
				throw "Don't know how to get URL from this?";
			}

			$.ajaxWait('post', url, null, null, options);

			return false;
		});
	};

	// expects either a button with name/value OR a link with a rel or id attribute in the format:
	// id_name_XXX, where name will become id_name and XXX corresponds to an id.
	$.fn.ajaxClick = function (url, success_func, options) {
		var that = $(this);

		var attrs_from_el = function (which) {
			var parts = that.attr(which).split('_');
			var val = parts.pop();

			return [parts.join('_'), val];
		};

		var attr_name = that.attr('name') || attrs_from_el('rel')[0] || attrs_from_el('id')[0];
		var val = that.attr('value') || attrs_from_el('rel')[1] || attrs_from_el('id')[1];

		var data = [{name: attr_name, value: val}];

		$.ajaxWait('post', url, data, success_func, options);

		return false;
	};

	$.fn.ajaxKeyup = function(url, success_func, options) {
		var data = [{name: $(this).attr('name'), value: $(this).attr('value')}];

		$.ajaxWait('get', url, data, success_func, options);

		return false;
	};

	/**
	 *	Makes a link function as a POST method form.
	 * Optional params may be passed as an object of key/value pairs, or a function that returns such an object.
	 * Values withing a params object may also be functions that return a scalar value.
	 */
	$.fn.formifyLink = function(params) {
		if (!this.is('a')) {
			console.error("formifyLink can only be used on <a> tags.");
			return false;
		}

		if (typeof(params) == 'function') params = params($(this));
		else if (typeof(params) != 'object') params = {};
		// pass userkey by default
		if (!params.userkey) {
			params.userkey = PHP.get('uek');
		}

		var action = $(this).attr('href');
		var $form = $('<form>').attr('action',action).attr('method','post');
		$('body').prepend($form);
		for (var i in params) {
			var val = typeof(params[i]) == 'function' ? params[i]($(this)) : params[i];
			var $input = $('<input>');
			$input.attr('type','hidden').attr('name',i).val(val);
			$form.append($input);
		}

		this.attr('href','#'); // prevent loading in new window
		this.click(function() { $form.submit(); return false; });

		return $form;
	};

	$.fn.getSelected = function () {
		if (this.is('select')) {
			var select = this.get(0);
			if (select) {
				if (!select.selectedIndex) select.selectedIndex = 0;
				return $(select.options[select.selectedIndex]);
			} else {
				return $();
			}
		}
	};

	$.fn.scrollTo = function (options) {
		var destination = this.offset().top;

		options = options || {};
		options.duration = options.duration || 500;

		$('html:not(:animated), body:not(:animated)').animate({
			scrollTop: destination - 20
		}, options );
	};

	// For doing old-style fade-n-slide animations
	(function () {
		var slide_duration = 600, fade_duration = 600;

		var fadeMeIn = function () {
			$(this).animate({ opacity: 1 }, fade_duration);
		};

		var scrollMeUp = function () {
			$(this).slideUp(slide_duration);
		};

		$.fn.appear = function () {
			return this.css('opacity', 0).slideDown(slide_duration, fadeMeIn);
		};

		$.fn.disappear = function () {
			return this.animate({opacity: 0}, {duration: fade_duration, complete: scrollMeUp});
		};

		$.fn.animatedSwitch = function() {
			if (this.is(':visible')) return this.disappear();
			else return this.appear();
		};
	})();

	(function () {
		var
			fading_menus = [],
			count_showing = 0,

			// fade all menus. If excluded is passed, the menu with that index will not be faded
			fade_all = function (excluded) {
				var i;
				for (i = 0; i < fading_menus.length; ++i) {
					if (i !== excluded && fading_menus[i].is(':visible')) fading_menus[i].fadeOut();
					--count_showing;
				}
			}
		;

		$.fn.fadeable = function () {
			// attaching this event here, because for some reason it doesn't work when defined outside fadeable()
			if (!fading_menus.length) {
				$(document.body).click(function () {
					if (count_showing) {
						fade_all();
					}
				});
			}

			// add each menu separately
			this.each(function () {
			var select, menu;

				var me = $(this);

				// allow the div.select, or any element inside it
				select = me.is('div.select') ? me : me.up('div.select');
				menu = select.down('ul.filtermenu');

				// if we found a menu and we don't already have this one, make it fadeable
				if (menu.length && $.inArray(menu, fading_menus) < 0) {

					// add this to the list of menus to fade when the user clicks anywhere
					fading_menus.push(menu);
					menu
						.data('fading_index', fading_menus.length - 1)
						// style menu correctly
						.hide().css('overflow', 'visible')
					;

					select.click(function (e) {
						if (e.target.tagName.toLowerCase() !== 'a') {
							// toggle menu
							if (menu.is(':hidden')) {
								++count_showing;
								menu.fadeIn(300, function () { $(this).show(); });

								// hide all other menus
								fade_all(menu.data('fading_index'));
							} else {
								menu.fadeOut();
								--count_showing;
							}

							// stop the event, or the body element will try hiding the menus again
							return false;
						}
					});
				}
			});

		};

	})();

	$.isString = function (obj) {
		return typeof obj === 'string' || obj instanceof String;
	};

	$.reverseString = function (str) {
		return str.split('').reverse().join('');
	};

	// Inverse of $.param
	$.unparam = function (str) {
		var obj = {};

		str.split('&').Each(function (equality) {
			var parts = equality.split('=');
			obj[parts[0]] = parts[1];
		});

		return obj;
	};

	$.isInteger = function(obj) {
		return typeof obj === 'number' && parseInt(obj, 10) === obj;
	};

	// similar (but not identical) to PHP's function, range() - give it two integers
	// or set of letters and it'll return an array of of numbers in that range.
	// letters are returned as their respective charcode, for example, 'a'
	// is 97
	$.range = function(low, high, step) {
		var
			reversal,
			quickstep = 1,
			arr = [],
			i
		;

		if ((!$.isInteger(low) && !$.isString(low)) || (typeof low !== typeof high)) {
			return arr;
		}

		// just use for integers for the time being
		if (typeof step !== undefined && $.isInteger(step) && $.isInteger(low)) {
			quickstep = step;
		}

		if ($.isString(low)) {
			low = parseInt(low.charCodeAt(0), 10);
			high = parseInt(high.charCodeAt(0), 10);
		}

		if (low > high) {
			reversal = low;
			low = high;
			high = reversal;
		}

		for (i = low; i <= high; i+= quickstep) {
			arr.push(i);
		}

		return arr;
	};

	$.strip_text = function(s, lower) {
		if (typeof lower === 'undefined') {
			lower = true;
		}

		if (lower) {
			s = s.toLowerCase();
		}

		return s
			.replace(/[^a-z0-9]/gi, ' ')
			.replace(/\s+/g, '-')
			.replace(/(^-+|-+$)/, '')
			;
	};

	// jQuery returns $.inArray as either -1 or index, which I didn't find particularly
	// helpful
	$.rInArray = function(value, arr) {
		return $.inArray(value, arr) !== -1;
	};

	$.any = function (arr, f) {
		var len = arr.length;
		for (var i = 0; i < len; i++) {
			if (f(arr[i])) return true;
		}
		return false;
	};

	$.all = function (arr, f) {
		return !$.any(arr, function (x) {
			return !f(x);
		});
	};

	// reduce array to its unique elements. $.unique only works on DOM elements
	$.nub = function (arr) {
		var new_arr = [], len = arr.length, i, j, found_dup;

		for (i = 0; i < len; ++i) {
			found_dup = false;

			for (j = i + 1; j < len && !found_dup; ++j) {
				found_dup = arr[j] == arr[i];
			}

			// unshift so they elements appear in location of first occurrence
			if (! found_dup) new_arr.unshift(arr[i]);
		}

		return new_arr;
	};

	// works like Prototype $ function - accepts element ID or DOM element or jQuery element
	$.$ = function (elem_or_id) {
		if ($.isString(elem_or_id)) return $('#' + elem_or_id);
		else return $(elem_or_id);
	};

	$.windowHeight = function () {
		return window.innerHeight ? window.innerHeight : $(window).height();
	};

	$(document).ajaxError(function (e, xhr, options, exception) {
		var silence_error = (PHP && PHP.get('silence_ajax_errors'));
		if (xhr.status === 403 && !silence_error) {
			$.showAjaxError(JSON.parse(xhr.responseText));
		}
	});

	$.showAjaxError = function (content) {
		if (content && content.error) {
			if (typeof(ngutils) !== typeof(undefined) && typeof(ngutils.blackout) === 'function') {
				var blackout = new ngutils.blackout({"remove_on_hide": true});
				blackout.show($(content.error));
				return;
			} else {
				// fallback to alert
				content.errors = [content.error];
			}

		}

		if (content && content.errors && content.errors.join) {
			var msg = content.errors.join("\n");
			if (content.selector) { // path to element for our error message
				$(content.selector).html(msg);
			} else {
				alert(msg);
			}
		} else {
			var server_error = 'Server error.  Please wait a moment and try again.';
			alert(server_error);
		}
	};

	// Check our old-style XML response for errors
	// Returns true if valid response (i.e., no errors)
	$.checkAjaxErrorOld = function (xml) {
		var server_error = 'Server error.  Please wait a moment and try again.';
		// Expand on this to show the output when in debug???
		// For instance, if the output was previously HTML rather than XML, this returned
		// true, but it would be useful to see the output if, for example, there's some
		// parse error with the script handling the call or whatever

		if (!xml) {
			alert(server_error);
			return false;
		} else {
			var errors = $(xml).find('errormsg');
			if (errors.length) {
				// I couldn't get this to work correctly - maybe just return the message
				// as there will only ever be one node with the old stuff here?
				//$.showAjaxError({ errors: errors });
				alert(errors.text());
				return false;
			} else {
				return true;
			}
		}
	};

	/**
	 * Stop waiting animation when ajax is done, allow clickables
	 */
	$(document).ajaxComplete(function(e, xhr, options) {
		if (xhr.uid) {
			$.ajax.stopWaiting(xhr.uid);
		}

		if (window.QUnit) {
			window.QUnit.ajaxing = false;
		}

		// select menu hack
		enableSelectFacades();

		$('a').each(function () {
			$(this).data('clicked', false);
		});
	});

	(function () {
		var
			waiters = {},
			waitheres = {};

		/**
		 * start waiting animation on element,
		 * waitin for XMLHttpRequest xhr
		 */
		$.ajax.startWaiting = function (xhr, form, element) {
			/* add a unique identifier to our XMLHttpRequest object
			 * so we can stop waiting when the time comes */
			xhr.uid = $.now();

			if (form) {
				form = $(form);
				waiters[xhr.uid] = form
					.find('.waiter')
					.removeClass('waiter')
					.addClass('waiter_on');
			}

			if (element) {
				element = $(element);
				waiters[xhr.uid] = element;
				element.addClass('waithere');
			}
		};

		/**
		 * stop waiting animation for XMLHttpRequest with uid xhr_uid
		 */
		$.ajax.stopWaiting = function(xhr_uid) {
			if (waiters[xhr_uid]) {
				waiters[xhr_uid]
					.removeClass('waiter_on')
					.addClass('waiter');
				delete waiters[xhr_uid];
			}

			if (waitheres[xhr_uid]) {
				waitheres[xhr_uid].removeClass('waithere');
				delete waitheres[xhr_uid];
			}
		};

	})();

	/**
	 * start a waiting animation and send AJAX request
	 *
	 * element - the element to set the waiting animation on
	 * all other args are options for $.ajax, see jQuery API docs
	 *
	 * ARG = NAME IN JQUERY API
	 * type = type
	 * url = url
	 * data = data
	 * success_func = success
	 * optons - anything $.ajax would accept, and also:
     *   - form: the form we are submitting
     *   - element: waiting animation element (not needed if options.form is given,
     *              and form has a ".waiter" element)
     *   - preventDouble: defaults to TRUE
	 *   - XD: set to true to allow cross-domain use. (auto-sets the xhrFields option and isAjaxRequest parameter)
	 */
	$.ajaxWait = function(type, url, data, success_func, options) {
		options = options || {};
		var cross_domain = false;

		if (options.form || options.button) {
			// prevent doubles submitting, unless options.preventDouble is set to FALSE
			if (false !== options.preventDouble) {
				// add reenabling as an error function
				options.error = addFunction(options.error, function() {
					if (options.form) {
						options.form.enableSubmit();
					} else {
						options.button.enable();
					}
				});

				if (options.form) {
					options.form.disableSubmit();
				} else {
					options.button.disable();
				}
			}

			// allow caller to supply custom data to send to the server, or use form data
			if (! data) {
				if (options.data) {
					data = options.data;
				} else if (options.form) {
					data = options.form.serializeArray();
				}
			}
		// if data is present in options, allow that to pass
		} else if (! data && options.data) {
			data = options.data;
		}

		// allow the programmer to pass additional parameters to data without
		// wiping out what's in the form already (if options.data is populating
		// data in the first place)
		if (options.additional_data && options.form) {
			if (!$.isArray(options.additional_data)) {
				data.push(options.additional_data);
			} else {
				$.merge(data, options.additional_data);
			}
		}

		if (options.XD) {
			options.xhrFields = { withCredentials: true };
		}

		if (options.xhrFields && options.xhrFields.withCredentials === true) {
			cross_domain = true;
		}

		// if data is not set at this point, it must be converted to an object
		if (null === data) {
			data = {};
		}

		if (PHP && PHP.get('ng_design',null)) {
			$.merge(data, [{name:'___ng_design', value:PHP.get('ng_design')}]);
		}

		// allow this to be passed as part of options, too
		if (! success_func && options.success_func) {
			success_func = options.success_func;
		}

		// just report the success to the user
		if (true === success_func) {
			success_func = function(response) {
				if (response && response.success) {
					alert(response.success);
				}

				if (response && response.url) {
					window.location.href = response.url;
					return true;
				}

				// fallthrough
				window.location.href = window.location.href;
			};
		}

		if (cross_domain) {
			if (!data) data = [];
			data.push({name: 'isAjaxRequest', value:1});
		}

		var ajax_options = $.extend({
				type: type,
				url: url,
				data: data,
				success: success_func
			}, options);

		return $.ajax.startWaiting(
			$.ajax(ajax_options),
			options.form,
			options.element
		);
	};

	// replace a set of elements in the page with corresponding elements from AJAX response
	$.ajax.replace = function (response_html, selectors) {
		var i = 0;

		for (i = 0; i < selectors.length; i++) {
			$(selectors[i]).replaceWith($(selectors[i], response_html));
		}
	};

	/**
	 * Find element that 1.) contains the event target, 2.) is contained by "this", and 3.) matches the selector.
	 * This is useful for event delegation, when, for example, there might be a SPAN inside an A tag, and you
	 * want the HREF of the A tag. Then [e.closest('a').href] will get what you need, without searching all the way
	 * up to the document root
	 */
	$.Event.prototype.closest = function (selector) {
		var me = this.target;
		while (me && !$(me).is(selector)) {
			// return undefined if we could not find a matching element
			if (me == this.currentTarget) return;

			me = me.parentNode;
		}

		return me;
	};

	$.fn.insertRoundCaret = function (tagName) {
		var
			strStart, strEnd, stringBefore, stringAfter, sel, insertstring,
			fullinsertstring, range, numlines, i, j, startPos, endPos, scrollTop;
		return this.each(function(){
			strStart = '['+tagName+']';
			strEnd = '[/'+tagName+']';
			if (document.selection) {
				//IE support
				stringBefore = this.value;
				this.focus();
				sel = document.selection.createRange();
				insertstring = sel.text;
				fullinsertstring = strStart + sel.text + strEnd;
				sel.text = fullinsertstring;
				document.selection.empty();
				this.focus();
				stringAfter = this.value;
				i = stringAfter.lastIndexOf(fullinsertstring);
				range = this.createTextRange();
				numlines = stringBefore.substring(0,i).split("\n").length;
				i = i+3-numlines+tagName.length;
				j = insertstring.length;
				range.move("character",i);
				range.moveEnd("character",j);
				range.select();
			} else if (this.selectionStart || this.selectionStart == '0') {
				//MOZILLA/NETSCAPE support
				startPos = this.selectionStart;
				endPos = this.selectionEnd;
				scrollTop = this.scrollTop;
				this.value = this.value.substring(0, startPos) + strStart + this.value.substring(startPos,endPos) + strEnd + this.value.substring(endPos,this.value.length);
				this.focus();
				this.selectionStart = startPos + strStart.length ;
				this.selectionEnd = endPos + strStart.length;
				this.scrollTop = scrollTop;
			} else {
				this.value += strStart + strEnd;
				this.focus();
			}
		});
	};

	// expects to be called on an input element or elements, which might have an id of 'password'
	// and then shows/hides an element with the same id appended with '_caps' if the
	// caps key is on as they're typing
	(function() {

		var
			upper_ranges = $.range('A', 'Z'),
			lower_ranges = $.range('a', 'z'),
			all_letters = upper_ranges.concat(lower_ranges),
			wrap_element,
			type,
			shift_key,
			which
		;

		$.fn.checkCapsLock = function(e) {
			wrap_element = $('#' + $(this).attr('id') + '_caps');

			return (function(event) {

				type = event.type;
				shift_key = event.shiftKey;
				which = event.which;

				if (type === 'blur') {
					// close it and come back to it when they next type here
					wrap_element.hide();
				} else if (
						($.rInArray(which, upper_ranges) && !shift_key) ||
						($.rInArray(which, lower_ranges) && shift_key)
				) {
					// CAPS is on and the user has entered a lower case letter OR they have held shift with a letter
					// they expect the letter to be upper case whilst CAPS is on
					wrap_element.show();
				} else if ($.rInArray(which, all_letters) && wrap_element.is(':visible')) {
					// only if this is a letter do we then hide the display if it's visible
					wrap_element.hide();
				}

			})(e);
		};

	})();

	/*

		Handles <select> options (specifically with respect to removing/replacing options
		in any select).

		I haven't done much yet with respect to anything but set(), which expects
		a hash table: { 'val' : 'text', 'val2' : 'text2' }

	*/
	(function() {
		$.fn.selectBoxOptions = function () {
			var
				that = this,
				i = 0,
				key,
				options = document.getElementById(this.attr('id')).options
			;

			return {
				size: function () {
					return $(options).size();
				},

				set: function (new_options) {
					// reset i first
					i = 0;

					for (var key in new_options) {
						++i;
					}

					// reset the length of the select options
					options.length = i;

					i = 0;

					// and then assign the new values and text
					for (key in new_options) {
						options[i].value = key;
						options[i].text = new_options[key];
						++i;
					}
				}
			};
		};
	})();

	// put site advisories on links and also bring embedded objects below links to media
	(function() {

		$.fn.watchLinks = function(settings) {

			// merge any overrides in here
			settings = $.extend({
				// .sitenote needs to be the last div in this node
				parentNode: '.podcontent',
				trustedDomains: [],
				spamDomains: []

			}, settings);

			var link_watcher = new LinkWatcher();
			link_watcher.setParentNode(settings.parentNode);
			link_watcher.setTrustedDomains(settings.trustedDomains);
			link_watcher.setSpamDomains(settings.spamDomains);
			link_watcher.pushElements($(this));
			link_watcher.watch();

			return this;
		};

		/**
		 * Watch a set of links - when clicked, if they contain youtube, vimeo or other embeds we support,
		 * attach a div after its parent with the embed in it, and show the embed. Subsequent
		 * clicks toggle the visibility of the element.
		 *
		 * Some of these calls trigger an API. Youtube's oEmbed isn't reliable, it's ultra slow
		 * and requirs CORS work, but it does allow you to use /embed/ easily enough.
		 *
		 * Sample usage: $('div.pod-body a').watchEmbeds();
		 */
		$.fn.watchEmbeds = function() {
			var redesign = false;
			var mobile = false;

			var MAX_WIDTH = 590;
			var MAX_HEIGHT = 332;


			if (PHP && PHP.get && PHP.get('ng_design','2012') != '2012') {
				redesign = true;
				mobile = PHP.get('ismobile',false);
			}

			var
				watchable_links = [],
				result,
				mylink,
				mydiv,
				href,

				sites = {
					youtube: [/^https?:\/\/(www\.)?((youtube\.com\/(.*?v=|embed\/))|youtu\.be\/)([a-zA-Z0-9_\-]+).*$/, 5, 'video'],
					vimeo: [/^https?:\/\/(www\.)?vimeo\.com\/([0-9]+)\/?$/, 2, 'video'],
					//,
					soundcloud: [/^https?:\/\/(www\.)?(soundcloud\.com\/[^\/]+\/?([^\/]+\/?)?).*$/, 2, 'audio']
				},

				addClickContext = function(context) {
					context.off('click').on('click', function() {
						$(this).next().toggle();
						return false;
					});
				},

				getYouTubeDivContent = function(url, full_url) {
					var result, time = null, iframe_attr;

					if (null !== (result = full_url.match(/(\?|#)t=((\d+)m(\d+)s)/))) {
						time = (parseInt(result[3], 10) * 60) + parseInt(result[4], 10);

					} else if (null !== (result = full_url.match(/t=(\d+)/))) {
						time = result[1];
					}

					if (null !== time) {
						url = url + '?start=' + time.toString();
					}

					if (false && redesign) {
						iframe_attr = 'data-smart-scale="590,332" data-smartload-src="' + url + '" width="400" height="300" frameborder="0" allowfullscreen';
					} else {
						iframe_attr = 'width="' + MAX_WIDTH + '" height="' + MAX_HEIGHT + '" src="' + url + '" frameborder="0" allowfullscreen';
					}

					return $('<div style="display:none; margin-top: 10px; width: 100%; height: auto;"><iframe '+iframe_attr+'></iframe></div>');
				},

				// update to use this instead
				//https://developer.vimeo.com/apis/oembed
				getVimeoDivContent = function(content) {
					var d = $('<div style="display:none; margin-top: 10px; width: 100%; height: auto;"></div>');
					d[0].innerHTML = content;
					return d;
				},

				getSoundCloudDivContent = function(content) {
					//return $('<div style="display:none; margin-top: 10px; width: 100%; height: ' + height + 'px;">' + content + '</div>');

					var d = $('<div style="display:none; margin-top: 10px; width: 100%; height: auto;"></div>');
					d[0].innerHTML = content;
					return d;
				},

				throwIEDebugDiv = function(xhr, statusText, errorText) {
					return $('<div style="display:none;">' + errorText + '</div>');
				},

				insertDiv = function(key, identifier, mycontext, regexp_result, index) {
					mycontext.css('cursor', 'wait');

					var resetCursor = function() {
						mycontext.css('cursor', 'pointer');
					};

					var onFail = function() {
						mycontext.off('click');
						resetCursor();

						// just open the URL in a new window and have done
						window.open(mycontext.attr('href'));
					};

					var renderContent = function(contentFunc, maybe_json, other) {
						if (typeof other !== typeof undefined) {
							mydiv = contentFunc(maybe_json, other);
						} else {
							mydiv = contentFunc(maybe_json.html);
						}

						mycontext.after(mydiv);
						mydiv.slideDown(function() {

							addClickContext(mycontext);
							resetCursor();
						});
					};

					mydiv = null;
					switch(key) {
						case 'youtube':
							renderContent(getYouTubeDivContent, 'https://www.youtube.com/embed/' + identifier, mycontext.attr('href'));

							break;

						case 'vimeo':
							var url = "https://vimeo.com/" + identifier;

							//https://vimeo.com/api/oembed.json
							$.get('https://vimeo.com/api/oembed.json', {
								'url': url,
								'maxwidth': MAX_WIDTH,
								'maxheight': MAX_HEIGHT
							}, function(response) {
								renderContent(getVimeoDivContent, response);
							}, 'json').fail(onFail);


							break;

						case 'soundcloud':
							// the third index of the match is the track, and it must
							// be present - without it, it's a userpage URL for SC.
							$.get('https://soundcloud.com/oembed', {
								'url': 'https://' + identifier,
								'format': 'json',
								'maxwidth': MAX_WIDTH,
								'maxheight': MAX_HEIGHT,
								'iframe': true
							},

							function(response) {
								renderContent(getVimeoDivContent, response);
							},

							'json').fail(onFail);

							break;

						default:
							console.log('Bad site');
							return;
					}

					return mydiv;
				}
			;

			// store argument lists for insertDiv() - apply them once the target hrefs
			// are clicked
			var to_load = {};

			$(this).each(function(index) {
				mylink = $(this);
				href = mylink.attr('href');
				// no attribute, this could be an image delete in blog
				// posts or whatever
				if (typeof href === typeof undefined || href === false) {
					return this;
				}

				for (var key in sites) {
					if (sites.hasOwnProperty(key)) {
						result = href.match(sites[key][0]);

						if (result) {
							// key is the site, the second param is the part of the regexp match
							// we need
							// mylink is the jQuery element itself
							// result is the full regexp
							// index is the position of the link within the selector
							to_load[index] = [key.toString(), result[sites[key][1]], mylink, result, index];

						}
					}
				}

			});

			// we're back looking at all of these items again,
			// now that we have stored params
			// to act upon when clicked
			var items = $(this);

			$(items).click(function() {
				var index = items.index(this);

				// okay, this <a> tag has a match that we stored and are waiting for, now...
				if (to_load.hasOwnProperty(index)) {
					// create the new div based on the stored arguments
					insertDiv.apply(this, to_load[index]);

					// scrap this from memory
					delete to_load[index];

					return false;
				}

				// all other clicks fall through
				$(this).off('click');
			});

			/*$(this).on('click', function(e) {
				console.log(e);
				return false;
			});*/

			//console.log(to_load);

			return this;

		};

	})();


	(function() {
		/*
		 * Date Format 1.2.3
		 * (c) 2007-2009 Steven Levithan <stevenlevithan.com>
		 * MIT license
		 *
		 * Includes enhancements by Scott Trenda <scott.trenda.net>
		 * and Kris Kowal <cixar.com/~kris.kowal/>
		 *
		 * Accepts a date, a mask, or a date and a mask.
		 * Returns a formatted version of the given date.
		 * The date defaults to the current date/time.
		 * The mask defaults to dateFormat.masks.default.
		 */

		var dateFormat = function () {
			var token = /d{1,4}|m{1,4}|yy(?:yy)?|([HhMsTt])\1?|[LloSZ]|"[^"]*"|'[^']*'/g,
			timezone = /\b(?:[PMCEA][SDP]T|(?:Pacific|Mountain|Central|Eastern|Atlantic) (?:Standard|Daylight|Prevailing) Time|(?:GMT|UTC)(?:[-+]\d{4})?)\b/g,
			timezoneClip = /[^-+\dA-Z]/g,
			pad = function (val, len) {
			val = String(val);
			len = len || 2;
			while (val.length < len) val = "0" + val;
				return val;
			};

			// Regexes and supporting functions are cached through closure
			return function (date, mask, utc) {
				var dF = dateFormat;

				// You can't provide utc if you skip other args (use the "UTC:" mask prefix)
				if (arguments.length == 1 && Object.prototype.toString.call(date) == "[object String]" && !/\d/.test(date)) {
					mask = date;
					date = undefined;
				}

				// Passing date through Date applies Date.parse, if necessary
				date = date ? new Date(date) : new Date();
				if (isNaN(date)) throw SyntaxError("invalid date");

				mask = String(dF.masks[mask] || mask || dF.masks["default"]);

				// Allow setting the utc argument via the mask
				if (mask.slice(0, 4) == "UTC:") {
					mask = mask.slice(4);
					utc = true;
				}

				var _ = utc ? "getUTC" : "get",
				d = date[_ + "Date"](),
				D = date[_ + "Day"](),
				m = date[_ + "Month"](),
				y = date[_ + "FullYear"](),
				H = date[_ + "Hours"](),
				M = date[_ + "Minutes"](),
				s = date[_ + "Seconds"](),
				L = date[_ + "Milliseconds"](),
				o = utc ? 0 : date.getTimezoneOffset(),
				flags = {
				d:    d,
				dd:   pad(d),
				ddd:  dF.i18n.dayNames[D],
				dddd: dF.i18n.dayNames[D + 7],
				m:    m + 1,
				mm:   pad(m + 1),
				mmm:  dF.i18n.monthNames[m],
				mmmm: dF.i18n.monthNames[m + 12],
				yy:   String(y).slice(2),
				yyyy: y,
				h:    H % 12 || 12,
				hh:   pad(H % 12 || 12),
				H:    H,
				HH:   pad(H),
				M:    M,
				MM:   pad(M),
				s:    s,
				ss:   pad(s),
				l:    pad(L, 3),
				L:    pad(L > 99 ? Math.round(L / 10) : L),
				t:    H < 12 ? "a"  : "p",
				tt:   H < 12 ? "am" : "pm",
				T:    H < 12 ? "A"  : "P",
				TT:   H < 12 ? "AM" : "PM",
				Z:    utc ? "UTC" : (String(date).match(timezone) || [""]).pop().replace(timezoneClip, ""),
				o:    (o > 0 ? "-" : "+") + pad(Math.floor(Math.abs(o) / 60) * 100 + Math.abs(o) % 60, 4),
				S:    ["th", "st", "nd", "rd"][d % 10 > 3 ? 0 : (d % 100 - d % 10 != 10) * d % 10]
			};

			return mask.replace(token, function ($0) {
					return $0 in flags ? flags[$0] : $0.slice(1, $0.length - 1);
				});
			};
		}();

		// Some common format strings
		dateFormat.masks = {
			"default":      "ddd mmm dd yyyy HH:MM:ss",
			shortDate:      "m/d/yy",
			mediumDate:     "mmm d, yyyy",
			longDate:       "mmmm d, yyyy",
			fullDate:       "dddd, mmmm d, yyyy",
			shortTime:      "h:MM TT",
			mediumTime:     "h:MM:ss TT",
			longTime:       "h:MM:ss TT Z",
			isoDate:        "yyyy-mm-dd",
			isoTime:        "HH:MM:ss",
			isoDateTime:    "yyyy-mm-dd'T'HH:MM:ss",
			isoUtcDateTime: "UTC:yyyy-mm-dd'T'HH:MM:ss'Z'"
		};

		// Internationalization strings
		dateFormat.i18n = {
			dayNames: [
				"Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat",
				"Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"
			],
			monthNames: [
				"Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
				"January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"
			]
		};

		// For convenience...
		Date.prototype.format = function (mask, utc) {
			return dateFormat(this, mask, utc);
		};
	})();

	/**
	 * countdown timers....
	 *
	 * Call via var instance = new $.couNtinGDate(start, end, options)
	 * instance.doWhatever()
	 *
	 * Or via $(element).couNtinGDate(start, end, options);
	 * TODO: ? at the moment, this only goes up to 24 hours before just outputing
	 * the date in the given format (rather than x hours ago or whatever)
	 */
	(function() {

		var fromDateTime = function(datetime) {
			var a = $.map(datetime.split(/[^0-9]/), function(s) { return parseInt(s, 10); });
			return new Date(a[0], a[1]-1 || 0, a[2] || 1, a[3] || 0, a[4] || 0, a[5] || 0, a[6] || 0);
		};

		var couNtinGDate = function(start_datetime, end_datetime, options) {
			var DOWN = 'down',
			UP = 'up';

			options = options || {};

			var that = this, start = fromDateTime( start_datetime ),
			end = fromDateTime( end_datetime );

			var to = null;

			var params = $.extend({
				format: 				'fullDate',
				html_element: 			null,
				interval: 				10,
				direction: 				DOWN,
				timeup_message: 		null,
				timeup_callback: 		null,
				writing_output: 		true,
				writing_output_method: 	null,
				verbose:  				false,
				ucfirst:				false
			}, options);

			var formatOutput = function(diff, hours, minutes, seconds) {
				var really, output, is_short;

				is_short = params.format === 'shortDate';

				if (hours) {
					really = Math.round(diff / 3600);

					if (really === 1) {
						if (is_short) {
							output = '1 hr';
						} else {
							output = 'an hour';
						}
					} else {
						if (is_short) {
							output = really + ' hr';
						} else {
							output = really + ' hours';
						}
					}

					if (!is_short) {
						output = 'about ' + output;
					}
				} else if (minutes) {
					really = minutes;

					if (!is_short) {
						if (really === 1) {
							output = 'a minute';
						} else {
							output = really + ' minutes';
						}
					} else {
						output = really + ' min';
					}
				} else {
					if (!is_short) {
						output = 'a few seconds';
					} else {
						output = '&lt; 1 min';
					}
				}

				if (!is_short) {
					if (params.direction === DOWN) {
						output = output + ' ago';
					} else {
						output = output + ' left';
					}
				}

				if (params.ucfirst) {
					output = output.charAt(0).toUpperCase() + output.substr(1);
				}

				return output;
			};

			var doCounting = function(diff, hours, minutes, seconds) {
				var output = [];

				hours = parseInt(hours, 10);
				minutes = parseInt(minutes, 10);
				seconds = parseInt(seconds, 10);

				var found_prev = false;

				var pluralize = function(unit, label) {
					var str = label;

					if (1 !== unit) {
						label = label + 's';
					}

					return unit + ' ' + label;

				};

				// come back to this
				if (hours > 24) {
					return '';
				}

				if (hours > 0 || params.verbose) {
					found_prev = true;

					output.push(pluralize(hours, 'hour'));
				}

				if (minutes > 0 || params.verbose || found_prev) {
					found_prev = true;

					output.push(pluralize(minutes, 'minute'));
				}

				if (seconds > 0 || params.verbose || found_prev) {
					output.push(pluralize(seconds, 'second'));
				}

				var last = output.pop();

				if (output.length) {
					return output.join(', ') + ' and ' + last;
				} else {
					return last;
				}
			};

			var handleOutputWriting = function(diff) {
				var hours = Math.floor(diff / 3600);
				var minutes = Math.floor((diff - (hours * 3600)) / 60);
				var seconds = diff - (hours * 3600) - (minutes * 60);

				// we have been given a custom handler
				if (null !== params.writing_output_method) {
					// we want a countdown/count
					if (true === params.writing_output_method) {

						params.html_element.html(
							doCounting(diff, hours, minutes, seconds)
						);

					} else if (typeof '' === typeof params.writing_output_method) {
						throw 'Did you forget something?';
					} else {
						params.html_element.html(
							params.writing_output_method(diff, hours, minutes, seconds)
						);
					}
				} else {
					params.html_element.html(formatOutput(diff, hours, minutes, seconds));
				}

			};

			var run = function() {
				var diff = Math.round(end - start) / 1000;

				if (
					// up is down... we're counting up the amount of time to something
					(params.direction === UP && start > end) ||
					(diff <= 0 && params.direction === UP) ||
					(params.direction === DOWN && start > end) ||
					(diff >= 86400 && params.direction === DOWN)
				) {
					if (null !== params.timeup_callback) {
						params.timeup_callback();
					} else if (null !== params.timeup_message && params.writing_output) {
						params.html_element.html(params.timeup_message);
					} else if (params.writing_output) {
						params.html_element.html(start.format(params.format));
					}

					if (to) {
						window.clearTimeout(to);
					}
				} else {

					// only output text if we're told to. Edit button in the bbs
					// doesn't have any text.
					if (params.writing_output) {
						handleOutputWriting(diff);
					}

					to = window.setTimeout(function() {

						if (params.direction === DOWN) {
							end.setSeconds(end.getSeconds() + params.interval);
						} else {
							start.setSeconds(start.getSeconds() + params.interval);
						}

						run();
					}, 1000 * params.interval);
				}
			};

			return {
				// set the refresh rate
				setOurInterval: function(seconds) {
					params.interval = seconds;
				},

				// feed the beast (give it an element to output to)
				// if this doesn't exist, this instance is redundant
				begin: function(element) {
					params.html_element = $(element);

					if (params.html_element) {
						run();
					}

					return that;
				},

				// set the date/time format.
				// quick options are above, but we'll stick to
				// fullDate and mediumDate in most places
				setFormat: function(new_format) {
					params.format = new_format;
				},

				// common format we use around the site..
				setDateAtTimeFormat: function() {
					params.format = 'mm/dd/yy @ hh:MM TT';
				},

				// whether we're counting down (e.g. posts made in the past, down)
				// or up (time left of edit)
				setDirection: function(new_direction) {
					if (!$.rInArray(new_direction, [UP, DOWN])) {
						throw 'Invalid direction.';
					}

					params.direction = new_direction;
				},

				// message to display to user in the element, when time is up
				setTimeupMessage: function(message) {
					params.timeup_message = message;
				},

				// set a callback - e.g. remove the element that this is for.
				// best example of this so far is the edit button in the forums - once
				// their edit window is gone, remove the link.
				setTimeupCallback: function(callback) {
					params.timeup_callback = callback;
				},

				// if we don't want the output of the message, disable this
				setWritingOutput: function(bool) {
					params.writing_output = bool;
				},

				setWritingOutputMethod: function(method) {
					params.writing_output_method = method;
				}
			};
		};


		$.couNtinGDate = couNtinGDate;

		/**
		 * params are optional
		 */
		$.fn.couNtinGDate = function(start_datetime, end_datetime, options) {
			// nothing specified, or it could be options {}
			if (typeof start_datetime === typeof undefined || typeof start_datetime === 'object') {
				if (typeof start_datetime === 'object') {
					options = start_datetime;
				}

				// attempt to use the element's html as the datetime
				start_datetime = $(this).html().trim();
			}

			if (typeof end_datetime === typeof undefined) {
				end_datetime = PHP.get('datetime', false);
			}

			options = options || {};

			var instance = new $.couNtinGDate(start_datetime, end_datetime, options);
			return instance.begin( $(this) );
		};

		/**
		 * Apply to a whole bunch of stuff at the same time.
		 * Make sure that all elements have one part of text - the date time
		 * itself. E.g:
		 * <span id="datetime_n">2014-12-05 15:34:15</span>
		 * then call with:
		 * $.couNtinGManyDatesFromNow($('span[id^="datetime"]'), {});
		 *
		 */
		$.couNtinGManyDatesFromNow = function(selector, options) {
			var end_datetime = PHP.get('datetime', false);

			if (!end_datetime) {
				return false;
			}

			var elements = $(selector);

			if (elements) {
				elements.each(function() {
					var html = $(this).html().trim();

					// only datetimes
					if (html.match(/^\d+-\d+-\d+ \d+:\d+:\d+$/)) {
						$(this).couNtinGDate(html, end_datetime, options);
					}
				});
			}

			return elements;
		};
	})();

	/** Url parsing. **/
	(function() {
		var getRegexForName = function(name) {
			return new RegExp('[?&]' + name + '(=([^&#]*)|&|#|$)');
		};

		var tidyName = function(name) {
			name = name.replace(/[\[\]]/g, '\\$&');

			return name;
		};

		var getParameterByName = function(name, url) {
			url = url || window.location.href;
			name = tidyName(name);
			var regex = getRegexForName(name);
			var results = regex.exec(url);

			if (!results) {
				return null;
			}

			if (!results[2]) {
				return '';
			}

			return decodeURIComponent(results[2].replace(/\+/g, ' '));
		};

		var getAllUrlParams = function(url) {
			var name, value, bits = null;
			url = url || window.location.href;
			parts = url.split('?');

			if (parts.length === 1) {
				return [];
			}

			parts = parts[1].split('&');
			params = {};
			for (i = 0, len = parts.length; i < len; ++i) {
				bits = parts[i].split('=');
				name = bits[0];

				if (typeof undefined !== typeof bits[1]) {
					value = decodeURIComponent(bits[1].replace(/\+/g, ' '));
				} else {
					value = null;
				}

				params[name] = value;
			}

			return params;
		};

		var replaceParameterByName = function(name, url, replacement) {
			var params = getAllUrlParams(url);

			var parts = [], replace_with, found = false;

			var addReplacement = function(name, replacement) {
				if (undefined !== replacement && null !== replacement) {
					parts.push(name + '=' + decodeURIComponent(replacement.replace(/\+/g, ' ')));
				}
			};

			for (var n in params) {
				replace_with = params[n];

				if (n === name) {
					found = true;
					replace_with = replacement;
				}

				addReplacement(n, replace_with);
			}

			if (!found) {
				addReplacement(name, replacement);
			}

			return url.split('?')[0] + '?' + parts.join('&');
		};

		$.getUrlParameterByName = function(name, url) {
			return getParameterByName(name, url);
		};

		$.fn.getUrlParameterByName = function(name) {
			var $el = $(this);

			if ($el.is('a')) {
				return getParameterByName(name, $el.attr('href'));
			} else if ($el.is('form')) {
				return getParameterByName(name, $el.attr('action'));
			} else {
				throw "Not sure how to getUrlParameterByName for this.";
			}
		};

		$.replaceUrlParameterByName = function(name, url, replacement) {
			return replaceParameterByName(name, url, replacement);
		};

		$.fn.replaceUrlParameterByName = function(name, replacement) {
			var $el = $(this);
			var replaced;

			if ($el.is('a')) {
				if (!$el.attr('href')) {
					return;
				}

				replaced = replaceParameterByName(name, $el.attr('href'), replacement);
				$el.attr('href', replaced);
			} else if ($el.is('form')) {
				replaced = replaceParameterByName(name, $el.attr('action'), replacement);
				$el.attr('action', replaced);
			} else {
				throw "Don't know how to replace this.";
			}
		};

	})();


	/******** ANIMATIONS ***********/
	(function() {

		// use this when you want a menu to follow the page scroll, for example
		$.fn.scrollWithPage = function(options) {
			options = options || {};

			options = $.extend({
				duration: 	200, 		// scroll animation time
				easing: 	'swing'		// linear or swing
			}, options);

			var element = $(this), element_height = element.outerHeight(), element_offset_top = element.offset().top, win_height, doc_height, scroll_to, previous_scroll = 0, original_css_position = element.css('position'), opened_once = null, topper;

			doc_height = $(document).height();

			$(window).resize(function() {
				// recalculate this
				opened_once = null;
			});

			$(document).on('scroll', function() {
				// menu height can change
				element_height = element.outerHeight();

				if ($(this).scrollTop() > ($(window).height() - element_height)) {
					scroll_to = $(this).scrollTop() - element_offset_top;

					// if scrolling down, then make sure the BOTTOM of the
					// menu is in view, as they scroll up, the top will come
					// into view. This is for people with miniscule browsers.
					if ($(window).height() < element_height && previous_scroll < $(this).scrollTop()) {
						scroll_to -= (element_height - $(window).height());
					}
				} else {
					scroll_to = 0;
				}

				// keep a record of this, so we can monitor its direction
				previous_scroll = $(this).scrollTop();

				if (undefined === options.animate || false !== options.animate) {
					//  bottom of the page
					if (($(document).scrollTop() + element_height) > doc_height) {
						scroll_to -= element_height;
					}
					element.animate({ marginTop: scroll_to }, options.duration, options.easing);
				} else {

					// set this now, if it's not already set
					if (null === opened_once && $(window).height() > element_height) {
						opened_once = true;
					}

					// only attempt this for browsers that are at least
					// as tall as the element to scroll
					//
					if (($(this).scrollTop() > element_offset_top) && (true === opened_once || $(window).height() > element_height)) {

						if ($(window).height() < element_height) {
							// should be a minus figure
							// they have scrolled down, but the menu is now
							// bigger than the window, so we want the bottom
							// half of the menu to be in view here
							topper = $(window).height() - element_height;
						} else {
							// they've scrolled down, and the menu is in full
							// view
							topper = 0;
						}

						element.css({ position: 'fixed', top: topper });
					} else {
						// back to beginning
						element.css({ position: original_css_position });
					}
				}

				// not set...
				if (null === opened_once) {
					opened_once = false;
				}
			});
		};


	})();

	/**
	 * Prevent double clicking. This should only bite us if there's some conflict with ajax
	 * based methods. I've enabled all clicking in ajaxComplete, so hopefully that'll cover it.
	 */
	$(document).ready(function() {
		$('a').on('click', function () {
			var that = $(this), clickdata = that.data('clicked');

			// moderation links and dimming the lights don't get hit by this
			var ignore = that.hasClass('mod') || that.hasClass('dim');

			if (clickdata && parseInt($.now() - clickdata, 10) < 1000 && !ignore) {
				return false;
			} else if (!ignore) {
				// reset to start with
				that.data('clicked', null);
			}

			if (!that.attr('target')) {
				that.data('clicked', $.now());
			}
		});
	});

	// FastClick for mobile browsers
	/*$(document).ready(function() {
		$(function() {
			window.FastClick.attach(document.body);
		});
	});*/

})(jQuery);

/* from https://github.com/javierjulio/textarea-autosize */
/*
	Copyright (c) 2012 Javier Julio

Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated documentation files (the "Software"), to deal in the Software without restriction, including without limitation the rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the Software, and to permit persons to whom the Software is furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
*/
;(function ($, window, document, undefined) {

  var pluginName = "textareaAutoSize";
  var pluginDataName = "plugin_" + pluginName;

  var containsText = function (value) {
    return (value.replace(/\s/g, '').length > 0);
  };

  function Plugin(element, options) {
    this.element = element;
    this.$element = $(element);
    this.init();
  }

  Plugin.prototype = {
    init: function() {
      var diff = parseInt(this.$element.css('paddingBottom')) +
                 parseInt(this.$element.css('paddingTop')) +
                 parseInt(this.$element.css('borderTopWidth')) +
                 parseInt(this.$element.css('borderBottomWidth')) || 0;

      if (containsText(this.element.value)) {
        this.$element.height(this.element.scrollHeight - diff);
      }

      // keyup is required for IE to properly reset height when deleting text
      this.$element.on('input keyup', function(event) {
        var $window = $(window);
        var currentScrollPosition = $window.scrollTop();

        $(this)
          .height(0)
          .height(this.scrollHeight - diff);

        $window.scrollTop(currentScrollPosition);
      });
    }
  };

  $.fn[pluginName] = function (options) {
    this.each(function() {
      if (!$.data(this, pluginDataName)) {
        $.data(this, pluginDataName, new Plugin(this, options));
      }
    });
    return this;
  };

  // copied jQuery.get/post and injected xhrFields and isAjaxRequest=1 param
  $.each( [ "get", "post" ], function( i, method ) {
	$[ method + "XD"] = function(url, data, callback, type) {
		// Shift arguments if data argument was omitted
		if ( $.isFunction( data ) ) {
		type = type || callback;
		callback = data;
		data = {};
		}

		if (!data) data = {};

		if (typeof(data) == 'string') {
			data += "&isAjaxRequest=1";
		} else {
			data.isAjaxRequest = 1;
		}

		// The url can be an options object (which then must have .url)
		return $.ajax( $.extend( {
			url: url,
			type: method,
			dataType: type,
			data: data,
			success: callback,
			xhrFields: { withCredentials: true }
		}, $.isPlainObject( url ) && url ) );
	};
  });

	$.getJSONXD = function( url, data, callback ) {
		return $.getXD( url, data, callback, "json" );
	};

	$.getScriptXD = function( url, callback ) {
		return $.getXD( url, undefined, callback, "script" );
	};

})(jQuery, window, document);

// 45 fps - tweak this to strike a balance between smooth animations and performance
jQuery.fx.interval = 1 / 45 * 1000;

jQuery.noConflict();

// Adds progress event to AJAX uploads
// source: https://github.com/englercj/jquery-ajax-progress
/*
    
The MIT License

Copyright (c) 2012-2018 Chad Engler

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in
all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
THE SOFTWARE.
*/
(function($, window, undefined) {
    //is onprogress supported by browser?
    var hasOnProgress = ("onprogress" in $.ajaxSettings.xhr());

    //If not supported, do nothing
    if (!hasOnProgress) {
        return;
    }
    
    //patch ajax settings to call a progress callback
    var oldXHR = $.ajaxSettings.xhr;
    $.ajaxSettings.xhr = function() {
        var xhr = oldXHR.apply(this, arguments);
        if(xhr instanceof window.XMLHttpRequest) {
            xhr.addEventListener('progress', this.progress, false);
        }
        
        if(xhr.upload) {
            xhr.upload.addEventListener('progress', this.progress, false);
        }
        
        return xhr;
    };
})(jQuery, window);/*jshint browser: true, prototypejs: true, boss: true, evil: true */

/*global
	PHP: true,
	NiGhtBox: true,
	CheckCharsRemaining: true,
	CheckCharsRemainingInElem: true,
	StopCharsRemaining: true,
	GetElement: true,
	StepAnimation: true,
	EndAnimation: true,
	SetElementHTML: true,
	MakeButtonsDead: true,
	MakeButtonsLive: true,
	GetButtons: true,
	GetHeader: true,
	NgXmlDom: true,
	console: false, ActiveXObject: false, ShockwaveFlash: false, cpmStar: false
*/

function begins_with(str, needle) {
	return str.substring(0, needle.length) === needle;
}

function ends_with(str, needle) {
	return str.substring(str.length - needle.length) === needle;
}

function NewWindow(url, height, width, myname) {
	if (typeof myname === typeof undefined) {
		myname = "newwin" + GetRandomNumber(1000000, 9999999);
	}

	var winprops = 'height=' + height + ',width=' + width + ',top=' + ((screen.height - height) / 2) + ',left=' + ((screen.width - width) / 2) + ',status=yes,scrollbars=yes,resizable=yes,toolbar=no,location=no,menubar=no';

	var win = window.open(url, myname, winprops);
	win.window.focus();
	return win;
}

function Reload() {
	// This is better than calling window.reload()
	window.location.href = window.location.href;
}

// Check whether a given number is an integer.
function IsValidInteger(num) {
	return num.length && !(/[^0-9]+/.exec(num));
}

// Takes a regular expression or regular string.
function CountOccurences(val, expr) {
	var parts = val.split(expr);
	return parts.length-1;
}

// Let's get rid of whitespace.
function Trim(text) {
	return String(text).replace(/(^\s*|\s*$)/g, "");
}

function Round(num, precision) {
	if (typeof precision === typeof undefined) {
		precision = 0;
	}

	var multiplier = Math.pow(10, precision);

	return Math.round(num * multiplier) / multiplier;
}

// Utility function to get the value of a <select> element
function SelectValue(select) {
	if(typeof select === "string") {		// Assume this is the id of the select object
		return SelectValue(document.getElementById(select));
	} else if(typeof select == "object") {	// Assume this is the select object itself
		return select.options[select.selectedIndex].value;
	} else {								// Eh... ?!?
		alert("Don't know how to do a SelectValue on " + select);
		return null;
	}
}

// This function has proved expensive for slow computers, so let's try unrolling it.
function FormatNumber(num) {
	num = num.toString();
	var len = num.length;

	if (len <= 3) {
		return num;
	} else if(len <= 6) {
		return num.substring(0, len - 3) + "," + num.substring(len - 3, len);
	} else if(len <= 9) {
		return num.substring(0, len - 6) + "," + num.substring(len - 6, len - 3) + "," + num.substring(len - 3, len);
	} else if(len <= 12) {
		return num.substring(0, len - 9) + "," + num.substring(len - 9, len - 6) + "," + num.substring(len - 6, len - 3) + "," + num.substring(len - 3, len);
	} else {	// We can only handle numbers up to 999,999,999,999
		return -1;
	}
}

function GetRandomNumber(low, high) {
	return Math.floor((Math.random() * (high - low + 1)) + low);
}

function GetPercentage(part, total) {
	if (!part) {
		return 0;
	}

	return FormatNumber( part/total * 100 );
}

function HandleClick(element_name) {
	var this_element = document.getElementById(element_name);
	if(this_element.disabled) {
		return;
	}

	if(this_element.type === "checkbox") {
		this_element.checked = !(this_element.checked);
	} else if(this_element.type === "radio") {
		this_element.checked = true;
	}
}

/* HTML FUNCTIONS */

// If remaining_char_count_elem is not given,
// Assumes there's a span/div id identical to that of the textarea, with the exception that its name has "_chars_remaining"
// appended to it. So, the textarea might be called 'body' and the span/div id would be called 'body_chars_remaining'
// Usage: <textarea ... onkeyup="CharactersRemaining(this);" onkeydown="CharactersRemaining(this);" onchange="CharactersRemaining(this);">
function CharactersRemaining(textarea, maxnum, remaining_char_count_elem) {
	if (PHP.get('DEBUG') && !textarea) {
		if (window.console && console.log){
			console.log("missing textarea for CharsRemaining() in ng.js");
		}
		return;
	}

	if (textarea) {
		var chars_remaining = maxnum - textarea.value.length;
		if(chars_remaining < 0)
		{
			textarea.value = textarea.value.substring(0, maxnum);
			chars_remaining = 0;
		}

		if (!remaining_char_count_elem) {
			remaining_char_count_elem = document.getElementById(textarea.id + "_chars_remaining");
		}

		remaining_char_count_elem.innerHTML = FormatNumber(chars_remaining);
	}
}

// Like above, but we have to have _chars_remaining_minus_html
function CharactersRemainingMinusHTML(textarea, maxnum, maxnumminushtml) {
	CharactersRemaining(textarea, maxnumminushtml);

	var chars_remaining = maxnum - textarea.value.replace(/<\/?(a|i(ns)?|b|u|em|strong).*?>/ig, '').length;
	if(chars_remaining < 0)
	{
		chars_remaining = 0;
	}

	document.getElementById(textarea.id + "_chars_remaining_minus_html").innerHTML = FormatNumber(chars_remaining);
}

(function () {

	// Use this to kick off our chars remaining stuff.  Recalculating on each keypress is too intensive.
	var chars_remaining_timeouts = [];

	CheckCharsRemaining = function (id, max_chars, max_chars_minus_html)
	{
		if(max_chars_minus_html > 0)
		{
			CharactersRemainingMinusHTML(document.getElementById(id), max_chars, max_chars_minus_html);
		}
		else
		{
			CharactersRemaining(document.getElementById(id), max_chars);
		}

		chars_remaining_timeouts[id] = setTimeout("CheckCharsRemaining('" + id + "', " + max_chars + ", " + max_chars_minus_html + ")", 1500);
	};

	CheckCharsRemainingInElem = function (id_or_elem, max_chars, max_chars_minus_html, remaining_char_count_elem)
	{
		var
			elem = $(id_or_elem),
			check_chars
		;

		if (max_chars_minus_html > 0) {
			check_chars = function () {
				CharactersRemainingMinusHTML(elem, max_chars, max_chars_minus_html);
			};
		} else {
			check_chars = function () {
				CharactersRemaining(elem, max_chars, remaining_char_count_elem, remaining_char_count_elem);
			};
		}

		check_chars();
		chars_remaining_timeouts[elem.identify()] = setInterval(check_chars, 1500);
	};

	StopCharsRemaining = function (id)
	{
		clearTimeout(chars_remaining_timeouts[id]);
	};

})();

function GetAge(month, day, year, nowmonth, nowday, nowyear)
{
	var age = nowyear-year;

	if(month<nowmonth) {
		age--;
	} else if(month == nowmonth && day > nowday)
	{
		age--;
	}

	return age;
}

function CheckDate(month, day, year)
{
	var test_date = new Date(month + "/" + day + "/" + year);
	if(test_date.getMonth() + 1 == month)
	{
		return true;
	}
	return false;
}

// Do we have an array element needle in haystack already?
function InArray(needle, haystack) {
	for (var i = 0, len = haystack.length; i < len; i++) {
		if (needle == haystack[i]) {
			return true;
		}
	}

	return false;
}

function remove_value(needle, haystack) {
	var index = jQuery.inArray(needle, haystack);
	if (index >= 0) {
		haystack.splice(index, 1);
	}

	return haystack;
}

// Utility function to take some HTML in a string and give back its DOM representation
function DOMNodeFromHTML(html) {
	var holder_node = Builder.node("div");
	holder_node.innerHTML = html;

	for(var i=0; i<holder_node.childNodes.length; i++)
	{
		if(holder_node.childNodes[i].nodeType == 1)		// 1 = element/tag
		{
			return(holder_node.childNodes[i]);
		}
	}

	return(null);
}

// Function to scroll to an element within a page.
function ScrollToElement(elementid)
{
	new Effect.ScrollTo(elementid);
}

// These are strictly for opening/closing review mod windows.
var reviewmod_win;
function OpenReviewModWindow(url)
{
	reviewmod_win = window.open("http://redirect.ngfiles.com" + url);
}
function CloseReviewModWindow()
{
	reviewmod_win.close();
}

// Class to handle animating text when all we're doing is adding dots on the end (like "Deleting...")
function DotAnimatedText(element_name, animate_class)
{
	var
		// Constants
		NUM_ANIMATION_DOTS = 5,					// Max number of dots to animate
		ANIMATION_CYCLE_TIME = 0.5,				// How many seconds should it take to animate all the dots?

		// Private variables
		timeout_handle = null,					// Handle to the next animation step
		dot_count = 1,							// Used to increment the dots in our animation
		animation_text = "",					// Gets set when we kick off the animation
		original_animation_html = "",			// Store the text we're starting with
		add_class = (typeof animate_class == "string"),
		element = null
	;

	this.Start = function(text_to_animate)
	{
		original_animation_html = GetElement().innerHTML;
		animation_text = text_to_animate;
		StepAnimation();
	};

	this.Stop = function()
	{
		// Clear any pending animations
		EndAnimation();

		// Restore our original text
		SetElementHTML(original_animation_html);
	};

	function StepAnimation()
	{
		var newtext = "";

		if(add_class)
		{
			newtext += "<span class=\"" + animate_class + "\">";
		}

		newtext += animation_text;

		// Build the text with the correct number of dots
		for(var i=1; i<=dot_count; i++)
		{
			newtext += ".";
		}

		// Increment the dot counter
		dot_count++;
		if(dot_count > NUM_ANIMATION_DOTS)
		{
			dot_count = 1;
		}

		if(add_class)
		{
			newtext += "</span>";
		}

		// Stick the text back out there
		SetElementHTML(newtext);

		// Set a timer to call ourselves later
		timeout_handle = setTimeout(StepAnimation, (ANIMATION_CYCLE_TIME / NUM_ANIMATION_DOTS) * 1000);
	}

	function GetElement()
	{
		return $(element_name);
	}

	this.getElement = function ()
	{
		return GetElement();
	};

	function SetElementHTML(html)
	{
		var element = GetElement();
		if(element)
		{
			element.innerHTML = html;
		}
		else
		{
			// This means we tried to set the HTML of an element that's now gone.
			// Simply kill our animation (if necessary) and go home.
			EndAnimation();
		}
	}

	function EndAnimation()
	{
		if(timeout_handle)
		{
			clearTimeout(timeout_handle);
			timeout_handle = null;
		}
	}
}

// Class for doing "in progress" animations in box headers
function HeaderAnimator(element_id, animation_text)
{
	var
		// ================ CONSTANTS ================
		ANIMATION_CLASSNAME = "i-activity",		// The class we apply while the animation is happening

		// ================ PRIVATE variables ================
		animation_running = false,				// Is the "Leaving Comment..." animation running?
		button_link_html = [],			// The HTML from the link inside our button
		button_classes = [],			// All buttons don't have the same class
		animated_text = new DotAnimatedText(element_id + "_header"),

		GetHeader,

		// This is the original stuff (pre-animation) text that appears in the header
		original_text = GetHeader().firstChild.data,
		original_classname = GetHeader().className,

		// // Let's try to force a pre-load of the activity image that the CSS uses
		activity_image = new Image()
	;

	activity_image.src = "http://img.ngfiles.com/hicons/i67.gif";		// Referenced in the i-activity class

	// ================ PUBLIC functions ================
	this.Start = function(text_to_animate)
	{
		if(!(animation_running))
		{
			animation_running = true;

			// Let's see if they're passing in the text to animate here
			if(typeof text_to_animate == "string")
			{
				animation_text = text_to_animate;
			}

			// This kicks off our dot animation
			animated_text.Start(animation_text);

			// Swap in the hourglass image
			GetHeader().className = ANIMATION_CLASSNAME;

			// Deactivate the button
			MakeButtonsDead();
		}
	};

	this.Stop = function()
	{
		if(animation_running)
		{
			animation_running = false;

			// Stop any running animation
			animated_text.Stop();

			// Swap back in the original icon image
			GetHeader().className = original_classname;

			// Make the button clickable again
			MakeButtonsLive();
		}
	};

	// ================ PRIVATE functions ================
	function MakeButtonsLive()
	{
		var button_elements = GetButtons();
		var button;

		for(var i=0; i<button_elements.length; i++)
		{
			button = button_elements[i];

			// Replace the dead button guts with the live one
			button.innerHTML = button_link_html[i];
			button.className = button_classes[i];
		}
	}

	function MakeButtonsDead()
	{
		var button_elements = GetButtons();
		var button;

		for(var i=0; i<button_elements.length; i++)
		{
			button = button_elements[i];

			// Store the old button link
			button_link_html[i] = button.innerHTML;
			button_classes[i] = button.className;

			// Now replace the live button guts with the dead one
			button.innerHTML = "<span>" + button.firstChild.innerHTML + "</span>";
			button.className = "btn dead";
		}
	}

	GetHeader = function () {
		return document.getElementById(element_id + "_header");
	};

	function GetButtons()
	{
		var
			all_spans = GetHeader().parentNode.getElementsByTagName("span"),
			buttons = [],
			i
		;

		for(i=0; i<all_spans.length; i++)
		{
			if(/_button$/.test(all_spans[i].id))
			{
				buttons[buttons.length] = all_spans[i];
			}
		}

		return buttons;
	}
}

// Function for adding and immediately removing a space to some text.  Forces the browser to re-render stuff.
function AddRemoveSpace(element)
{
	if(typeof element.value == "string")	// For form elements
	{
		element.value += " ";
		element.value = element.value.substring(0, element.value.length - 1);
	}
	else					// Normal text embedded in the page
	{
		element.firstChild.data += " XYZ";
		element.firstChild.data = element.firstChild.data.substring(0, element.firstChild.data.length - 4);
	}
}

// Use this to properly write out the HTML for any Flash.
function FlashWriter(url, width, height)
{
	var
		LookForFlashPlugin = function () {
			var flash_versions = 12, x;

			// Code swiped from http://www.dangrossman.info/2007/01/03/detecting-flash-and-java-with-javascript/
			if (navigator.plugins && navigator.plugins.length) {
				// Netscape style plugin detection
				for (x = 0; x <navigator.plugins.length; x++) {
					if (navigator.plugins[x].name.indexOf('Shockwave Flash') != -1) {
						return(true);
					}
				}
			} else if (window.ActiveXObject) {
				// ActiveX style plugin detection
				for (x = 2; x <= flash_versions; x++) {
					try {
						// oFlash = eval("new ActiveXObject('ShockwaveFlash.ShockwaveFlash." + x + "');");
						var oFlash = new ActiveXObject(ShockwaveFlash.ShockwaveFlash[x]);
						if (oFlash) {
							return true;
						}
					}
					catch(e) { }
				}
			}

			return(false);
		},

		// Options here are "window", "opaque", and "transparent"
		DEFAULT_WINDOW_SETTING = "window",

		// Defaults for optional stuff below
		quality = "high",
		id = "flash" + GetRandomNumber(1000000, 9999999),
		wmode = DEFAULT_WINDOW_SETTING,
		script_access = "sameDomain",
		allow_fullscreen = "false",
		fullscreen_on_selection = "false",

		params = null,
		has_flash = LookForFlashPlugin()
	;

	this.SetQuality = function (new_quality) {
		quality = new_quality;
	};

	this.SetID = function (new_id) {
		id = new_id;
	};

	this.SetTransparent = function (is_transparent) {
		wmode = is_transparent ? "transparent" : DEFAULT_WINDOW_SETTING;
	};

	this.SetOpaque = function (is_opaque) {
		wmode = is_opaque ? "opaque" : DEFAULT_WINDOW_SETTING;
	};

	this.SetDirect = function (is_direct) {
		wmode = is_direct ? 'direct' : DEFAULT_WINDOW_SETTING;
	};

	this.SetFullScreen = function (fullscreen) {
		allow_fullscreen = fullscreen ? "true" : "false";
	};

	this.SetFullScreenOnSelection = function (fullscreen) {
		fullscreen_on_selection = fullscreen ? "true" : "false";
	};

	this.SetScriptAccess = function (new_script_access) {
		script_access = new_script_access;
	};

	this.SetParams = function (new_params) {
		params = new_params;
	};

	this.ToString = function() {
		var str = "";

		if (has_flash) {
			// join is supposedly faster than repeated concats, and it takes fewer characters
			str = [
				str,
				'<object classid="clsid:d27cdb6e-ae6d-11cf-96b8-444553540000" codebase="http://fpdownload.macromedia.com/pub/shockwave/cabs/flash/swflash.cab#version=9,0,0,0" width="' + width + '" height="' + height + '" id="' + id + '">',
				'<param name="allowScriptAccess" value="' + script_access + '" />',
				'<param name="allowFullScreen" value="' + allow_fullscreen + '" />',
				'<param name="movie" value="' + url + '" /><param name="quality" value="' + quality + '" />',
				'<param name="wmode" value="' + wmode + '" />',
				'<param name="fullScreenOnSelection" value="' + fullscreen_on_selection + '" />'
			].join('');

			if (params) {
				// IE needs this
				str += '<param name="flashvars" value="' + params + '" />';
			}

			str += '<embed src="' + url + '" quality="' + quality + '" ';

			if (params) {
				// Non-IE browsers need this
				str += 'flashvars="' + params + '" ';
			}

			str = [
				str,
				'wmode="' + wmode + '" width="' + width + '" height="' + height + '" name="' + id + '" allowScriptAccess="' + script_access +'" ',
				'fullScreenOnSelection="' + fullscreen_on_selection + '" ',
				'allowFullScreen="' + allow_fullscreen + '" type="application/x-shockwave-flash" pluginspage="http://www.macromedia.com/go/getflashplayer" />',
				'</object>'
			].join('');
		} else {
			str += '<p style="text-align: center; margin-top: 2em; margin-bottom: 2em; padding-top: 3em; padding-bottom: 3em; background: #333333">You don\'t appear to have <a target="_blank" href="http://getflash.ngfiles.com">Flash</a> installed. <a target="_blank" href="http://getflash.ngfiles.com">Click here</a> to get it (it\'s free).</p>';
		}

		return str;
	};

	this.Print = function () {
		document.write(this.ToString());
	};
}

/*
Class to handle checkbox items for our checkbox element controls.
Assumes that the checkboxes have ids of prefix + NUM, where NUM is 0 through
total elements.
*/

// There's really no reason to have to pass in total here - rewrite this at some point
// FIXME: this can probably go away forever, double check first - JH
function CheckboxItems(total, prefix) {
	var ids = [], keys = [];

	// Returns a checkbox element, with the given id.
	function GetElement(id) {
		return document.getElementById(prefix +  id);
	}

	// Sets any checked boxes to unchecked and vice-versa
	this.ToggleAll = function() {
		// Clear out the ids
		ids = [];
		keys = [];

		// Set out temporary values.
		var is_checked,
			is_disabled,
			element;

		for (var i = 0; i < total; i++) {
			element = GetElement(i);

			is_checked = element.checked;
			is_disabled = element.disabled;

			if (!is_checked && !is_disabled) {
				// We add it into our list of ids (and keys), since it is about to get checked.
				keys[keys.length] = i;
				ids[ids.length] = element.value;
			}

			if (!is_disabled) {
				element.checked = !is_checked;
			}
		}
	};

	// We need this for our global list of ids, so if it's checked then we
	// need to know about it.
	this.Toggle = function(id)
	{
		var element = GetElement(id), i;

		if (element.checked && !InArray(element.value, ids)) {
			// We bang it straight in here.
			keys[keys.length] = id;
			ids[ids.length] = element.value;
		} else if (!element.checked && InArray(element.value, ids)) {
			// We were previously checked by our toggle button.
			for (i = 0; i < total; i++) {
				if (element.value == ids[i]) {
					keys.splice(i, 1);
					ids.splice(i, 1);
					break;
				}
			}
		}
	};

	// Clears all checkbox elements, even if previously unchecked.
	this.ClearAll = function() {
		ids = [];
		keys = [];

		for (var i = 0; i < total; i++) {
			GetElement(i).checked = false;
		}
	};

	// Selects all checkbox elements, whether previously checked or not.
	this.SelectAll = function() {
		ids = [];
		keys = [];

		for (var i = 0; i < total; i++) {
			GetElement(i).checked = true;
			keys[keys.length] = i;
			ids[ids.length] = GetElement(i).value;
		}
	};

	this.Enable = function() {
		for (var i=0; i<total; i++) {
			GetElement(i).disabled = false;
		}
	};

	this.Disable = function() {
		for (var i = 0; i < total; i++) {
			GetElement(i).disabled = true;
		}
	};

	this.GetKey = function(num) {
		return keys[num];
	};

	this.GetKeys = function() {
		return keys;
	};

	this.GetID = function(num) {
		return ids[num];
	};

	this.GetIDS = function() {
		return ids;
	};

	this.IsToggled = function() {
		return ids.length > 0;
	};

	this.GetNumChecked = function() {
		return ids.length;
	};
}

// instantiate holder for PHP variables
var PHP = (function () {
	var vars = {};

	return {
		get : function (var_name, default_value) {
			return PHP.has(var_name) ? vars[var_name] : default_value;
		},

		set : function (var_name, value) {
			return (vars[var_name] = value);
		},

		has : function (var_name) {
			return typeof vars[var_name] !== 'undefined';
		},

		req : function (var_name) {
			if (!PHP.has(var_name)) {
				alert(var_name + " must be set, but it isn't.");
			}

			return PHP.get(var_name);
		},

		// var_name is an array, and we'return pushing value onto it
		add : function (var_name, value) {
			if (!PHP.has(var_name)) {
				PHP.set(var_name, []);
			}

			return vars[var_name].push(value);
		},

		// takes a list of key => value pairs, in the form of { key1: value1, key2: value2, ... }
		// wanted to call it "import", but that is an obscure keyword in javascript
		merge : function (obj) {
			for (var key in obj) {
				if (obj.hasOwnProperty(key)) {
					PHP.set(key, obj[key]);
				}
			}
		}
	};
})();

var NiGhtBox = (function ($) {

	var
		blackout_class = 'blackout-on',
		no_dimming_class = 'nodimming',
		no_dim_class = 'nodim',
		visibility = 'visibility',
		KEY_ESC = 27, // key code for escape
		elem, height, loading,
		no_dim_elem,
		ads, blackout, blackout_center,
		visible = false,
		hide_on_esc = true,

		stored_content = null,

		getAds = function () {
			if (!ads) ads = $('.adunit');

			return ads;
		},

		hideAds = function () {
			getAds().css(visibility, 'hidden');
		},

		showAds = function () {
			getAds().css(visibility, 'visible');
		},

		escHandler, // putting this here for jshint's benefit

		updateEscListener = function () {
			if (hide_on_esc && visible) {
				$('body').keydown(escHandler);
			} else {
				//$('body').unbind('keydown', escHandler);

				// updated for jquery 3
				$('body').off('keydown', escHandler);
			}
		}
	;

	escHandler = function (e) {
		if (e.which == KEY_ESC) {

			if (!NiGhtBox.onClosed || NiGhtBox.onClosed() !== false) {
				NiGhtBox.hide();
				updateEscListener();
			}
			return false;
		}
	};

	return {
		// if true, blackouts will hide when the background is clicked
		autohide: true,

		// you can set this to a callback for when ESC his hit, or a background is clicked.  Return false to cancel close.
		onClosed: null,

		init: function () {
			blackout = $('#blackout');
			blackout_center = $('#blackout_center');
			blackout_hover = $('#blackout_hover');

			$blackout_bg = $('#blackout-bg');

			$blackout_bg.click(function() {
				if (NiGhtBox.autohide && PHP.get('ng_design',2012) != 2012 &&  (!NiGhtBox.onClosed || NiGhtBox.onClosed() !== false)) {
					NiGhtBox.hide();
				}
				return false;
			});

			var c = blackout_center.html().trim();

			// store any original content in case we need it back
			// currently, the flags are using this in the art portal view page -
			// which loads the large view into a nightbox slot. Flagging
			// wipes the contents of the slot and we need it back after they
			// have flagged, so js/global/flag.js uses NiGhtBox.restore() in its
			// close method
			if (c.length) {
				stored_content = c;
			}

			return NiGhtBox;
		},

		load: function (elem, elem_height, afterLoad) {
			if (!blackout || !blackout_center) {
				NiGhtBox.init();
			}

			loading = true;
			elem.detach();

			// .loaded() is a custom function in jquery_extensions.js
			blackout_center.append(elem).loaded(function () {
				// if passed a function for the height, evaluate it now
				if (typeof elem_height === 'function') {
					height = elem_height(blackout_center, blackout);
				} else if (typeof elem_height === typeof undefined) {
					elem_height = elem.height();
				} else {
					height = elem_height;
				}

				loading = false;

				if (afterLoad) {
					afterLoad();
				}
			});

			return NiGhtBox;
		},

		replace: function(elem, elem_height, afterLoad) {
			if (!blackout || !blackout_center) {
				NiGhtBox.init();
			}

			blackout_center.down().remove();

			// there's a timeout in the loaded() event handling function that (in
			// NiGhtBox.load()) that causes height to set to 0 in certain
			// circumstances.
			// If we get  the height here, assume it's good and don't rely on the
			// fallback of checking the element's height in the load() function
			if (typeof elem_height !== typeof undefined) {
				height = elem_height;
			}

			NiGhtBox.load(elem, elem_height, afterLoad);

			return NiGhtBox;
		},

		// if the page loaded with content in the nightbox slot, using this will
		// return that content to the slot
		restore: function() {
			if (!blackout || !blackout_center) {
				NiGhtBox.init();
			}

			// put the initial content back
			if (stored_content) {
				blackout_center.html(stored_content);

				// reset the height
				height = blackout_center.down().height();
			}

			return NiGhtBox;
		},

		show: function (element) {
			if (!blackout || !blackout_center) {
				NiGhtBox.init();
			}

			var nodim = element ? true:false;
			element = element ? $.$(element) : blackout_center.down();

			var win_height, scroll;

			// center element
			if (element) {
				setTimeout(function() {
					// try to find height
					if (!height) {
						height = element.height();
					}

					if (height) {
						scroll = Math.max($('html').scrollTop(), $(window).scrollTop());
						win_height = $(window).height();

						var $notification_bar = $('#notification-bar');
						if ($notification_bar.outerHeight()) win_height -= $notification_bar.outerHeight();

						// don't show top of box above top of screen
						if (height > win_height) {
							blackout_center.css('margin-top', scroll + 'px');
						} else {
							blackout_center.css('margin-top', scroll + (win_height - height) / 2 + 'px');
						}
					} else {
						$(element).addClass();
					}
				},1);
			}

			hideAds();

			// show it
			blackout.addClass(blackout_class);
			blackout.show();
			blackout_hover.show();

			if (element && nodim) element.addClass(no_dim_class);

			if (element) {
				element.show();
			}

			visible = true;

			if (hide_on_esc) {
				updateEscListener();
			}

			$(document).trigger('NiGhtBox:on');
			return NiGhtBox;
		},

		hide: function (element) {

			var nodim = element ? true:false;
			if (!blackout || !blackout_center) {
				NiGhtBox.init();
			}

			element = element ? $.$(element) : blackout_center.down();

			showAds();
			blackout.removeClass(blackout_class);
			blackout.hide();
			blackout_hover.hide();

			if (element && nodim) element.removeClass(no_dim_class);
			visible = false;

			if (hide_on_esc) {
				updateEscListener();
			}

			$(document).trigger('NiGhtBox:off');
			return NiGhtBox;
		},

		toggle: function (element) {
			if (!blackout || !blackout_center) {
				NiGhtBox.init();
			}

			if (blackout.hasClass(blackout_class)) {
				return NiGhtBox.hide(element);
			} else {
				return NiGhtBox.show(element);
			}
		},

		// return boolean
		visible: function () {
			return visible;
		},

		// control whether ESC backs out of NiGhtBox
		hideOnEsc: function (bool) {
			hide_on_esc = bool;
			updateEscListener();

			return NiGhtBox;
		}
	};

})(jQuery);

/**
 * Validate form fields
 *
 * @param form mixed The form element, or a selector to it
 * @param validations object See examples
 *
 * Here is an example:
 *
 * {
 *   require: [
 *     { name: 'review_body', msg: 'Bad body' },
 *     { name: 'review_stars', msg: 'Give stars!' }
 *   ],
 *
 *   regex: [
 *     { name: 'review_body', regex: /^[^<>#\\]*$/, msg: 'Bad body' }
 *   ]
 * }
 *
 * Here is the same example, with the alternate, more concise syntax:
 *
 * {
 *   require: [
 *     ['review_body', 'Bad body' ],
 *     ['review_stars', 'Give stars!']
 *   ],
 *
 *   regex: [
 *     ['review_body', /^[^<>#\\]*$/, 'Bad body']
 *   ]
 * }
 *
 * Expanded to include 'require', 'regex', 'min_length', 'max_length',
 * 'checked' and 'equals'.
 *
 */
var NgFormValidator = function (the_form, validations) {
	var
		inputs,
		errors = [],
		$ = jQuery,
		form,
		callback
	;

	form = $(the_form);

	if (!form.length) {
		throw 'Form not found in NgFormValidator()';
	}

	var
		failed = function (validation) {
			errors.push({
				name: validation.name || validation[0],
				msg: validation.msg || validation[validation.length - 1]
			});
		},

		hasError = function (name) {
			return $.any(errors, function (err) {
				return name == err.name;
			});
		},

		checkValidation = function (type, validation, inputs) {
			// find input by name
			var
				name = validation.name || validation[0],
				input = inputs.filter("[name='" + name + "']"),
				val,
				passed,
				i,
				len
			;

			// disabled or nonexistent field automatically validates
			if (input.length === 0) {
				return true;
			} else if (input.length === 1) {
				if (input.attr('type') === 'checkbox') {
					val = input.filter(':checked').val();
				} else {
					val = input.val();
				}
			} else {
				val = input.filter(':checked').first().val();
			}

			// handle error if input does not exist
			// FIXME: some checkboxes are only available when the user has
			// not agreed to something in the past.
			if (PHP.get('DEBUG') && !input.exists() && type !== 'checked') {
				throw 'Required input does not exist: ' + name;
			}

			switch (type) {
			case 'require':
				passed = val && val.length;
				break;
			case 'regex':
				passed = !val || val.match(validation.regex || validation[1]);
				break;
			case 'min_length':
				passed = val && val.length >= (validation.length_requirement || validation[1]);
				break;
			case 'max_length':
				passed = !val || val.length <= (validation.length_requirement || validation[1]);
				break;
			case 'checked':
				passed = !input.exists() || input.is(':checked');
				break;
			// checks to see whether one input is the same value as the one specified
			case 'equals':
				passed = !val || val === inputs.filter("[name='" + (validation.second_value || validation[1]) + "']").val();
				break;

			case 'one_of':
				others = validation;
				passed = val && val.length;

				for (i = 1, len = others.length - 1; i < len; ++i) {
					val = inputs.filter("[name='" + (others[i]) + "']").val();
					passed = passed || val && val.length;
				}

				break;

			case 'greater_than':
				passed = val && parseInt(val, 10) > parseInt((validation.min || validation[1]), 10);
				break;

			default:
				throw 'Unknown validation type: ' + type;
			}

			if (!passed) {
				failed(validation);
			}
		},

		dependenciesValid = function (validator) {
			if (validator.depends && !$.isArray(validator.depends)) {
				throw "'depends' property of validator must be an array";
			}

			return !validator.depends || !$.any(validator.depends, function (name) {
				return hasError(name);
			});
		},

		doCallback = function() {
			if (callback) {
				callback();
			}
		}
	;

	this.validate = function () {
		errors = []; // discard errors from previous attempt
		inputs = form.find('input:enabled, textarea:enabled, select:enabled');

		if (inputs && inputs.length) {
			$.each(validations, function (type, validation_list) {
				var len = validation_list.length;

				for (var i = 0; i < len; ++i) {
					if (dependenciesValid(validation_list[i])) {
						checkValidation(type, validation_list[i], inputs);
					}
				}
			});
		} else if (PHP.get('DEBUG')) {
			if (window.console && console.log){
				console.log('no inputs found');
			}
		}

		var is_valid = errors.length === 0;

		if (!is_valid) {
			doCallback();
		}

		return is_valid;
	};

	this.getErrors = function () {
		return errors;
	};

	this.isValid = function () {
		return errors.length === 0;
	};

	this.getErrorMessages = function () {
		var msgs = [];
		for (var i = errors.length - 1; i >= 0; --i) {
			msgs.push(errors[i].msg);
		}

		return $.nub(msgs);
	};

	this.getFailedInputs = function () {
		var failures = [];

		for (var i = errors.length - 1; i >= 0; --i) {
			failures.push(errors[i].name);
		}

		return failures;
	};

	// gets the first field that failed to focus (useful on big forms, where
	// the page is scrolled down to the submit button and the error occured
	// much further up the page) OR to a specified input
	this.sendFocusTo = function (input_name) {
		if (typeof input_name === 'undefined') {
			inputs.filter("[name='" + (errors.pop().name) + "']").focus();
		} else {
			if (PHP.get('DEBUG') && !inputs.filter("[name='" + input_name + "']").exists()) {
				throw 'Cannot focus on this, as it does not exist: ' + input_name;
			}

			inputs.filter("[name='" + input_name + "']").focus();
		}
	};

	this.setCallback = function (call_backable) {
		callback = call_backable;
	};

};


NgFormValidator.prototype.inform = function () {
	// tell user about errors
	// this should be overriden, or rewritten, to create different methods of informing user
	alert(this.getErrorMessages().join("\n"));
};

/**
 * Loosely coupled version of some code in AjaxHandler
 */
NgXmlDom = function(response) {
	this._xml = response;
};
NgXmlDom.prototype = {
	isValidDom: function () {
		if (this._is_valid_dom === undefined) {
			this._is_valid_dom = this._xml && this._xml.documentElement;
		}

		return this._is_valid_dom;
	},

	getXml: function () {
		return this._xml;
	},

	getField: function (tag_name) {
		if (this.isValidDom()) {
			// Now check for this specific field
			var node_list = this._xml.documentElement.getElementsByTagName(tag_name);
			if (node_list && node_list.length == 1 && node_list[0].firstChild) {
				return node_list[0].firstChild.data;
			}
		}
	},

	hasField: function (tag_name) {
		if (this.isValidDom()) {
			var node_list = this._xml.documentElement.getElementsByTagName(tag_name);
			return node_list && node_list.length == 1 && node_list[0].firstChild;
		}
	},

	STATUS_ERROR        : 0,
	STATUS_SUCCESS      : 1,
	STATUS_ERROR_SILENT : 2,

	validate: function(error_handler) {
		var response_status = this.getField('status');

		if (!response_status && 0 !== response_status) {
			alert('Server error.  Please wait a moment and try again.');

			if (error_handler) {
				error_handler(this);
			}

			return false;
		} else {
			switch (parseInt(response_status, 10)) {
			case this.STATUS_SUCCESS:
				return true;
			case this.STATUS_ERROR:
				alert('Error - ' + this.getField('errormsg'));

				if (error_handler) {
					error_handler(this);
				}

				return false;
			case this.STATUS_ERROR_SILENT:
				return false;
			}
		}
	}
};

// select box styles require JS to update their "facade" element
function enableSelectFacades() {

	var $ = jQuery;

	var has_select_facades = $('div.select select').off;
	if (has_select_facades === undefined) return;

	var
		showSelected = function (select) {
			var $select = $(select);
			$select.prev().text($select.getSelected().text());
			// more reliable, maybe: jQuery(search_type_select).parent().find('span.fakeselecttext').text(selected_option.text());
		},
		select_event_handler = function () {
			showSelected(this);
		}
	;

	// onchange, update the facade span with the new text
	$('div.select select')
		.off('change', select_event_handler)
		.on('change', select_event_handler)
		.off('keyup', select_event_handler)
		.on('keyup', select_event_handler)
		// keydown is necessary for auto-repeat, when you hold the arrow key down
		.off('keydown', select_event_handler)
		.on('keydown', select_event_handler)
		// initialize facade spans
		.Each(showSelected)
		;
}

// Initializations - these should go in another file probably
jQuery(function($) {
	var
		init_fp_web_features = function () {
			var feature_link = function (cpm) {
				return '<li><a href="' + cpm.getLink() +
					'"><img title="" alt="Ad Icon" src="' + cpm.getImageUrl(70,70) +
					'" width="70" height="39" /></a><div><div><div><a href="' + cpm.getLink() +
					'">' + cpm.getTitle() +
					'</a><span>' + cpm.getDescription(100) +
					'</span></div></div></div></li>'
				;
			};

			if (window.cpmStar) {
				var
					webfeature = $('div#webfeature'),
					cpm_list = $('<ul class="centeredblocks webfeature"></ul>'),
					num_ads = 8,
					i
				;

				// append ads
				for (i = num_ads - 1; i; --i) {
					cpm_list.append(feature_link(cpmStar));
					cpmStar.nextAd();
				}
				// this way we don't fetch an extra ad that we don't use
				cpm_list.append(feature_link(cpmStar));

				webfeature.append(cpm_list);
			}
		}
	;

	// generic jquery for adding nightbox and minimizing functionality to any pod on the page
	$('div.podtop a.min')
		.click(function(e) {
			if ($(this).hasClass('ignore')) return false;

			// using a single var statement reduces minified size
			var
				$this = $(this),
				pt = $this.parentsUntil('div.podtop').parent().parent(),
				podtop
			;

			podtop = $this.parents('div.podtop:first');
			if (!podtop.hasClass('minimized')) podtop.addClass('minimized');

			return false;
		});

	$('div.podtop a.max')
		.click(function(e) {
			if ($(this).hasClass('ignore')) return false;

			var podtop = $(this).parents('div.podtop:first');
			if (podtop.hasClass('minimized')) podtop.removeClass('minimized');

			return false;
		});

	$('input[type="reset"]').click(function (e) {
		return confirm('Are you sure you want to reset this form?');
	});

	/* FIXME: need to style select boxes, etc, on focus
	$('div.select select').focus(function (e) {
		$(this).up('div.select').css('border', '3px solid yellow');
	}).blur(function (e) {
		$(this).up('div.select').css('border', 'none');
	});
	*/

	$('input[type="file"]').change(function (e) {
		$(this).setUploadVal();
	});

	// disable submit buttons when form is submitted. Forms that need to re-enable
	// the submit buttons will have to do so manually
	// $('form').preventDoubleSubmit();

	// style alternating rows in tables. This will be obsolete in CSS3
	$('table.alternate tr:odd').addClass('alt');

	// make IE obey label click
	if (PHP.get('is_ie')) {
		$('label').click(function (e) {
			$('#' + e.closest('label').attr('for')).click();
			e.preventDefault();
		});
	}

	// header nav animations
	(function () {
		var
			currently_shown,
			animating = [],
			hovering = false,
			uniq = 0,
			unanimate = function (uniq_id) { animating = remove_value(uniq_id, animating); },
			not_animating = function (uniq_id) { return !InArray(uniq_id, animating); }
		;

		$('#header_nav > dl').each(function () {
			this.my_dds = $(this).children('dd');
			this.uniq = ++uniq;
		}).mouseenter(function(e) {
			var me = this.uniq, mine = this.my_dds;

			hovering = me;

			if (not_animating(me)) {
				animating.push(me);

				// currently_shown.slideUp('fast');
				currently_shown = { dds: mine, uniq: me };

				this.my_dds.slideDown(50, function () {
					unanimate(me);

					if (me !== hovering) {
						mine.hide();
					}
				});
			}

			return false;
		}).mouseleave(function(e) {
			var me = this.uniq, mine = this.my_dds;

			hovering = false;

			if (not_animating(me)) {
				animating.push(me);

				this.my_dds.slideUp('fast', function () {
					unanimate(me);

					if (me === hovering) {
						mine.show();
					}

				});
			}

			return false;
		});
	})();

	// search
	$('#topsearch').submit(function (e) {
		e.preventDefault();
		var search = $('#topsearch_text').val().replace('/', ' ');
		var url =
			PHP.get('search_urls')[$('#topsearch_type').getSelected().val()] + '/' +
			encodeURIComponent(search)
		;

		document.location = url;
	});

	var is_iphone_ipad_or_ipod = navigator.userAgent.toLowerCase().match(/(iphone|ipod|ipad)/);
	PHP.set('is_iphone_ipad_or_ipod', is_iphone_ipad_or_ipod);

	// default text for login boxes
	/*
	var defaultInput = function (elem, text) {
		elem.focus(function () {
			if (elem.val() == text) elem.val('');
		}).blur(function () {
			if (! elem.val() ) elem.val(text);
		}).blur();
	};

	defaultInput($('#username'), 'username');
	// defaultInput($('#password'), 'password');
	// this is a problem - the word "password" appears as bullets, not letters
	// need to do some trick to change this. Boo.
	*/

	// HERE'S THE TRICK :D - JT
	var label_username = $('#header_label_username');

	if (label_username.length) { // cheap way to skip this if the user is logged in

		var
			label_password = $('#header_label_password'),
			input_username = $('#username'),
			input_password = $('#password'),
			remember_me = $('#remember'),
			// attempt at hack for apple's stuff

			assignLabelAction = function(input, label) {
				label.click(function() {
					$(this).hide();
					input.focus();
				});
			},

			defaultLabel = function(input, label) {
				var defaultIfEmpty = function() {
					if (input.val()) {
						label.hide();
					} else {
						label.show();
					}
				};

				input
					.focus(function() { label.hide(); })
					.blur(defaultIfEmpty)
					.blur();

				// fix Chrome's broken autofill
				setTimeout(defaultIfEmpty, 100);
			};

		defaultLabel(input_username, label_username);
		defaultLabel(input_password, label_password);

		if (is_iphone_ipad_or_ipod) {
			assignLabelAction(input_username, label_username);
			assignLabelAction(input_password, label_password);
			remember_me.css('z-index', '9999');
		}

		remember_me.next('span').click(function() { remember_me.checked = !remember_me.checked; });
	}

	// for toggling banner ads on light dimming
	var adcode_html = {};
	var lights = true;

	// obj is not always defined, if coming from say, portal view
	var handleLights = function(obj) {
		var standalone = typeof undefined === typeof obj;
		obj = typeof undefined === typeof obj ? null : obj;

		NiGhtBox.toggle();

		if (lights) {
			lights = false;

			$('div[id^="adcode_iframe_"]').each(function() {
				var id = $(this).attr('id');
				var html = $(this).html();
				adcode_html[id] = html;
				$(this).html("");
			});

		} else {
			lights = true;

			$('div[id^="adcode_iframe_"]').each(function() {
				var id = $(this).attr('id');
				var html = adcode_html[id];
				$(this).html(html);
			});

			adcode_html = {};
		}

	};

	// art view
	/*$('#portal_item_view').on('click', function() {
		handleLights();
		return false;
	});*/

	/*$('#blackout_center').on('click', function() {
		var d = $(this).down();

		if ($(d).is('img')) {
			$(d).remove();
			handleLights();
		}
	});*/

	// generic jquery for adding nightbox and minimizing functionality to any pod on the page
	$('.podtop').on('click', function(e) {
		var link = $(e.closest('a'));

		if (link.length) {
			if (link.hasClass('dim')) {
				handleLights($(this).parent());
			} else if (link.hasClass('max')) {
				$(this).removeClass('minimized');
			} else if (link.hasClass('min')) {
				link.addClass('minimized');
			} else {
				return;
			}

			e.preventDefault();
		}
	});

	// pop out playlist forms in our view/listen pages
	(function() {
		var
			pl_add_form = $('#playlist_add'),
			pl_add_form_exists = pl_add_form.exists()
		;
		// this class is used in "back to playlists" links as well as in the view/listen pages
		$('.pl-add, .icon-playlist').click(function() {
			if (pl_add_form_exists) {
				pl_add_form.toggle();
				return false;
			}
		});
	})();

	// workaround for FF autocomplete radio tag bug. See http://www.ryancramer.com/journal/entries/radio_buttons_firefox/
	// $.browser is deprecated as of jQuery 1.9.  Mozilla supposedly fixed this bug on 2016-04-06 so we're skippping this functionality.
	//if ($.browser.mozilla) {
	//	$('input[type="radio"]').attr('autocomplete', 'off');
	//}

	enableSelectFacades();
	init_fp_web_features();

	// generic click checkboxes and radios to accommodate ipod/ipad/iphone users
	$(document).ready(function() {

		/*

		areas covered here:

			- generic GG login form
			- PM inbox/sentbox
			- user agreements (at least in the bbs, not tested elsewhere)
			- bbs moderation radios

		*/

		/*
		var
			prev,
			elements_to_inspect = $('ul.checkboxes li span, table.pmlist tr td span, table#pending_requests tr td span')
		;

		if (is_iphone_ipad_or_ipod) {

			elements_to_inspect.click(function() {
				alert('here');
				prev = $(this).prev('input');

				if (prev.is('input[type="checkbox"]') || prev.is('input[type="radio"]')) {
					//prev.get(0).checked = !prev.get(0).checked;
					//prev.get(0).focus();

					$(this).down().css('background-position',  prev.get(0).checked ? '0 0px' : '0 -17px');
				}

			});

		}
		*/

	});

});

// cross-browser event handling
function addEvent(elem, evnt, func) {
	if (elem.addEventListener)  {// W3C DOM
		elem.addEventListener(evnt,func,false);
		return true;
	} else if (elem.attachEvent) { // IE DOM
		elem.attachEvent("on"+evnt, func);
		return true;
	} else {
		console.log('Your browser does not support event listeners');
		return false;
	}
}

// hack for IE 9 and older
if (typeof(([]).indexOf) == "undefined") {
	Array.prototype.indexOf = function(o,i){
	var j = this.length;
	for(i = i < 0 ? i + j < 0 ? 0 : i + j : i || 0; i < j && this[i] !== o; i++);
		return j <= i ? - 1 : i;
	};
}

var SearchHelper = (function($) {
	var self = this;

	var conductSearch = function($form) {
		var new_params = [];
		var params = $form.serializeArray();

		for (var i = 0, len = params.length; i < len; ++i) {
			if (params[i].value.length) {
				if (params[i].name === 'advanced') {
					continue;
				}

				new_params.push(params[i].name + '=' + encodeURI(params[i].value));
			}
		}

		window.location.href = $form.attr('action') + '?' + new_params.join('&');
	};

	// utility function for populating results
	var populateSuggestion = function(object, values, $element) {

		// this has some callback relating specifically to the input field
		// - e.g. tag input in the portals, selecting a tag
		// populates this into the collection
		if (object.field && object.options.callbacks && object.options.callbacks.field) {
			object.options.callbacks.field($element, object.field);
		}

		for (var i in values) {
			$('[data-html="' + i + '"]', $element).html(values[i]);
			$('[data-src="' + i + '"]', $element).attr('src', values[i]);
			$('[data-href="' + i + '"]', $element).attr('href', values[i]);
			$('[data-hidden="' + i + '"]', $element).val(values[i]);
		}
	};

	var $focus = null;
	var onFocus = function(e, ui) {
		var label = ui.item.text || ui.item.title;

		if ($focus) {
			$focus.removeClass('selected');
		}

		$focus  = $('#' + ui.item.id);
		$focus.addClass('selected');

		return false;
	};

	var onSelect = function(e, ui) {
		if (ui.item.url) {
			window.location = ui.item.url;
			return false;
		}

		var label = ui.item.text;
		if (undefined === label || !label.length) {
			label = ui.item.title;
		}

		if (label.length) {
			field.val(label);

			var $f = $(e.target).parent('form');

			if ($f.length) {
				$f.submit();
			}
		}

		return false;
	};

	var getBeforeAfterDates = function(object) {
		if (typeof undefined === typeof object.prefix || null === object.prefix) {
			return null;
		}

		var prefix = object.prefix;

		var after = $('#' + prefix  + '_after');
		var before = $('#' + prefix  + '_before');

		if (!after.exists() || !before.exists()) {
			return null;
		}

		return [after, before];
	};

	var watchMobileDates = function(object) {
		var dates = getBeforeAfterDates(object);

		if (null === dates) {
			return;
		}

		// these dates can be handled via html5 elements for mobile devices
		ngutils.forms.registerDateInput(dates[0].attr('id'));
		ngutils.forms.registerDateInput(dates[1].attr('id'));
	};


	/*
	 * This is for before and after dates. Make sure that any dates input
	 * are valid.
	 * Adjust before and after dates if changing one puts the other at an invalid
	 * range.
	 */
	var watchDates = function(object) {
		if (PHP.get('ismobile')) {
			watchMobileDates(object);
			return;
		}

		var dates = getBeforeAfterDates(object);
		if (null === dates) {
			return;
		}

		var after = dates[0];
		var before = dates[1];

		var params = {
			'dateFormat': 'yy-mm-dd',
			'minDate': PHP.get(object.prefix + '_min_date'),
			'maxDate': PHP.get(object.prefix + '_max_date'),
			onSelect: function(str, obj) {
				var parts = obj.id.split('_');
				var which = parts[parts.length -  1];
				var d;

				var s = new Date(str);

				if (which === 'before' && after.val().length) {
					d = new Date(after.val());
					if (typeof(d) === typeof('') && d.indexOf('Invalid') === 0) {
						d = new Date();
					}

					if (d >= s) {
						d = s;
						d.setDate(d.getDate() - 1);

						if (d < new Date(obj.settings.minDate)) {
							after.val('');
						} else {
							after.val($.datepicker.formatDate('yy-mm-dd', d));
						}
					}
				} else if (which === 'after' && before.val().length) {
					d = new Date(before.val());

					if (typeof(d) === typeof('') && d.indexOf('Invalid') === 0) {
						d = new Date();
					}

					if (s >= d) {
						d = s;
						d.setDate(d.getDate() + 1);

						if (d > new Date(obj.settings.maxDate)) {
							before.val('');
						} else {
							before.val($.datepicker.formatDate('yy-mm-dd', d));
						}
					}
				}
			}
		};

		after.datepicker(params);
		before.datepicker(params);
	};

	var watchField = function(object) {
		var field = object.field;

		var form = object.form;
		var suggestion_endpoint = object.suggestion_endpoint;
		var template_id = object.template_id;
		var template = object.getTemplate();

		// this is called in two different ways - renderItem in the autocomplete
		// method and from within the lookup function
		var render = function($ul, item) {
			if (typeof(item.template) === typeof(undefined) || typeof(template[item.template]) === typeof(undefined)) {
				console.log('missing template for item', item);
				return;
			}

			var $li = template[item.template].clone();
			if (typeof(item.break) !== typeof( undefined) && item.break) {
				$li.addClass('ui-autocomplete-break');
			}

			$li.attr('id', item.id);
			populateSuggestion(object, item, $li);

			return $li.appendTo( $ul );

		};

		var lookup = function(_request, _render) {
			var search_params;

			if (object.options && object.options.search_params) {
				if (typeof object.options.search_params === 'function') {
					search_params = object.options.search_params();
				} else {
					throw "Untested";
					// search_params = object.search_params;
				}
			} else {
				if (true !== object.options.ignore_form) {
					search_params = form.serializeArray();
				} else {
					// at the very least, we need the form field
					// by its name
					search_params = [{
						name: object.options.field_name ? object.options.field_name : field[0].name,
						value: field[0].value
					}];
				}
			}

			$.post(suggestion_endpoint, search_params, function(response) {
				var i;
				var x = 0;
				var items = [];

				for (i in response.taglike_results) {
					x++;
					items.push({
						template: 'tags',
						text: response.taglike_results[i],
						id: template_id +"-"+x
					});
				}

				for (i in response.terms) {
					x++;
					items.push({
						template: 'terms',
						text: response.terms[i],
						id: template_id +"-"+x
					});
				}

				for (i in response.suggestions) {
					if (i === 0) {
						response.suggestions[i].break = true;
					}

					x++;

					response.suggestions[i].id = template_id + "-" + x;
					response.suggestions[i].template = 'content-' + response.suggestions[i].content_type;
					items.push(response.suggestions[i]);
				}

				for (i in response.more_links) {
					if (i === 0) {
						response.more_links[i].break = true;
					}

					x++;
					response.more_links[i].id = template_id + "-" + x;
					response.more_links[i].template = 'links';
					items.push(response.more_links[i]);
				}

				_render(items);
			});

			return false;
		};

		var getCallback = function(name, _default) {
			if (object.options.callbacks && object.options.callbacks[name]) {
				return object.options.callbacks[name];
			} else if (undefined !== _default) {
				return _default;
			} else {
				return null;
			}
		};

		var _onClose = null;
		if (object.options.callbacks && object.options.callbacks.close) {
			_onClose = object.options.callbacks.close;
		}

		var _onOpen = getCallback('open');

		var _onFocus = onFocus;
		if (object.options.callbacks && object.options.callbacks.focus) {
			_onFocus = object.options.callbacks.focus;
		}

		var _onSelect = onSelect;
		if (object.options.callbacks && object.options.callbacks.select) {
			_onSelect = object.options.callbacks.select;
		}

		object.field.autocomplete({
			delay: 300, // 300 is the default
			source: lookup,

			open: _onOpen,
			close: _onClose,
			focus: _onFocus,
			select: _onSelect
		}).data( 'ui-autocomplete' )._renderItem = render;
	};

	var watchForm = function(object) {
		var $form = object.form;
		var $advanced = $form.find('input[name="advanced"]');
		var $advanced_toggle = $form.find('a[data-toggle-advanced]');
		var $advanced_options = $form.find('div[data-advanced-options]');
		var is_advanced = PHP.get('is_advanced_search', false);

		if ($advanced.exists() && $advanced_options.exists() && $advanced_toggle.exists()) {
			$advanced_toggle.click(function() {
				is_advanced = !is_advanced;

				if (is_advanced) {
					$advanced_options.show();
					$advanced.val(1);
				} else {
					$advanced_options.hide();
					$advanced.val(0);
				}
				return false;
			});
		}

		$form.submit(function() {
			conductSearch($form);
			return false;
		});

	};

	// if a user starts entering data into the terms box, but then
	// clicks another subcategory, make the terms persist
	var watchSearchBar = function(object) {
		var $searchbar = object.form;
		var $nav = $searchbar.find('nav');

		if (!$searchbar.exists() || !$nav.exists()) {
			return;
		}

		var current = PHP.get(object.prefix + '_current_nav');

		if (current) {
			$('a:contains(' + current + ')', $nav).addClass('current');
		}

		var getSearchParams = function(url) {
			var name, value = null;
			url = url || window.location.href;
			parts = url.split('?');
			if (parts.length === 1) {
				return [];
			}

			parts = parts[1].split('&');
			params = {};
			for (i = 0, len = parts.length; i < len; ++i) {
				bits = parts[i].split('=');
				name = bits[0];

				if (typeof undefined !== typeof bits[1]) {
					value = decodeURIComponent(bits[1].replace(/\+/g, ' '));
				} else {
					value = null;
				}

				params[name] = value;
			}

			return params;
		};

		$nav.find('a').on('click', function() {
			var url = window.location.href;
			var params = getSearchParams(url);
			var new_params = ['terms=' + encodeURI($searchbar.find('input[name="terms"]').val())];

			for (var n in params) {
				if (n !== 'terms') {
					new_params.push(n + '=' + params[n]);
				}
			}

			var new_url = this.href.split('?')[0] + '?' + new_params.join('&');
			window.location.href = new_url;
			return false;
		});

	};

	// when a user clicks these, it posts data to a global suitabilities setting
	// and sets those everywhere for them
	var watchSuitabilities = function(object) {
		var inputs = object.form.find('[id^="suitabilities_opts"] input');

		if (!inputs.length) {
			return false;
		}

		// display a message to users when they're not permitted to look for
		// adult content
		inputs.filter(':disabled').each(function() {
			$('label[for="' + $(this).attr('id') + '"]').click(function() {
				if (typeof(PassportHandler) !== typeof(undefined)) {
					// attempt to open the login/registration form, when possible
					PassportHandler.open();
				} else {
					alert("You must be logged in to search for adult content.");
				}

				return false;
			});
		});

		inputs.click(function() {
			var checked = this.checked;
			var that = this;

			$.post('/suitabilities', inputs.serializeArray()).done(function() {
				// update the form once they've checked this, provided they're not
				// on mobile - because those options are in the advanced section
				// in the mobile layout
				if (!PHP.get('ismobile')) {
					conductSearch(object.form);
				}
			}).fail(function() {
				// in the event of some failure, reset to whatever it was initially
				that.checked = !checked;
			});
		});

	};

	var helper = function() {
		this.form = null;
		this.field = null;
		this.suggestion_endpoint = null;

		this.template = null;
		this.template_id = null;
		this.autocomplete = true;

		// this is the id of the div/script holding template
		this.DEFAULT_TEMPLATE = 'search_suggestion_template';

	};

	helper.prototype = {
		getField: function() {
			return this.field;
		},

		getTemplate: function() {
			if (null === this.template_id) {
				this.template_id = this.DEFAULT_TEMPLATE;
			}

			if (null === this.template || typeof(this.template[this.template_id]) === typeof undefined) {

				this.template[this.template_id] = {};

				var $template = $($.trim($("#" + this.template_id).html()));

				var that = this;

				$('li[class^="ui-autocomplete-"]', $template).each(function() {
					var key = $(this).attr('class').replace('ui-autocomplete-','');
					that.template[that.template_id][key] = $(this);
				});

				return;

			}

			return this.template[this.template_id];

		},

		initialize: function(_field, _suggestion_endpoint, _template_id, _autocomplete, _options) {
			var parts;
			this.template = this.template || {};

			// not all forms autocomplete (main search results don't), but default to true
			this.autocomplete = (typeof _autocomplete === 'undefined' ? true : _autocomplete);
			this.options = _options || {};

			if ($.type(_field) === 'string') {
				parts = _field.split('_');

				field = $('#' + _field);
			} else {
				field = _field;

				parts = field.attr('id').split('_');
			}

			var form = field.parents('form');

			if (!form) {
				throw "Can't find form for field.";
			}

			this.field = field;
			this.form = form;
			this.prefix = parts[0];


			if (this.autocomplete) {
				// allows us to explicitly set an endpoint
				if ((typeof(_suggestion_endpoint) !== typeof undefined) && (null !== _suggestion_endpoint)) {
					this.suggestion_endpoint = _suggestion_endpoint;
				} else {
					this.suggestion_endpoint = form.attr('action');
				}

				if (typeof(_template_id) !== typeof undefined && null !== _template_id) {
					this.template_id = _template_id;
				}

				// initialize for first use
				this.getTemplate();

				watchField(this);
			}

			// these will not be present in all instances
			watchDates(this);

			if (this.options.ignore_form === undefined || true !== this.options.ignore_form) {
				watchForm(this);
			} else {
				watchSearchBar(this);
			}

			return this;
		}
	};

	helper.init = function(_field, _suggestion_endpoint, _template_id, _autocomplete, _options) {
		var h = new helper();
		return h.initialize(_field, _suggestion_endpoint, _template_id, _autocomplete, _options);
	};

	return {
		init: helper.init
	};
})(jQuery);
/*jshint evil: true, ng: true */

var addSwappableElement, addSwappableHTML, drawSwappableElement, fillSwappableElements, clearSwappableElements;

(function () {
	// we will load in another js file afterthis one that will set this to false unless it's blocked by an ad-blocker
	var
		user_is_a_leech = true,
		swappable_names = {},
		swappable_code = []
	;

	// modify / break apart/ignore, as needed
	var get_substitution = function (ending, width, height) {
		return '<iframe src="http://www.newgrounds.com/promo/store_promo' + ending + '.html" height="' + height + '" width="' + width + '" scrolling="no" frameborder="0"></iframe>';
	};

	var substitute_codes = {
		'728x90':	get_substitution('_wide', 728, 90),
		'630x90':	get_substitution('630x90', 630, 90),
		'125x600': get_substitution('125x600', 600, 125),
		'200x200': get_substitution('200x200', 200, 200),
		'300x250': get_substitution('300x250', 250, 300)
	};

	// aliases
	substitute_codes.wide		= substitute_codes['728x90'];
	substitute_codes.sky		= substitute_codes['125x600'];
	substitute_codes.square		= substitute_codes['200x200'];
	substitute_codes.box		= substitute_codes['300x250'];

	addSwappableElement = function (base_code, code_type, element_id) {
		element_id = addSwappableHTML(base_code, code_type, element_id);
		drawSwappableElement(element_id);
	};

	addSwappableHTML = function(base_code, code_type, element_id) {
		if (!element_id) {
			element_id = 'swappable_html';
		}
		if (swappable_names[element_id] !== undefined) {
			swappable_names[element_id]++;
			element_id = element_id + '_duplicate_'+ swappable_names[element_id];
		} else {
			swappable_names[element_id] = 0;
		}

		if (code_type === undefined) {
			code_type = null;
		}

		swappable_code.push({
			element_id: element_id,
			base_code: base_code,
			code_type: code_type
		});

		return element_id;
	};

	drawSwappableElement = function(element_id) {
		document.write('<div id="' + element_id + '"></div>');
	};

	fillSwappableElements = function() {
		var i, element, code_type;

		for (i = 0; i < swappable_code.length; i++) {
			element = $('#' + swappable_code[i].element_id);

			if (element.length) {

				code_type = swappable_code[i].code_type;

				// if an ad blocker is running and this code has a code type, use subsititue code
				if (user_is_a_leech && code_type !== null) {

					// if we aren't using a freset substitute, we will just use whatever was passed
					if (substitute_codes[code_type] === undefined) {
						element.html(code_type);

					// if we're using a prefab, we'll plop it in
					} else {
						element.html(substitute_codes[code_type]);
					}

				// if there is no blocker or no code type, just use the code provided
				} else {
					element.html(swappable_code[i].base_code);
				}
			}
		}
	};

	clearSwappableElements = function() {
		for (var i = 0; i < swappable_code.length; i++) {
			$('#' + swappable_code[i].element_id).html('');
		}
	};

	(function () {
		var delayed_load = PHP.get('delayed_load'), id;

		if (delayed_load) {
			for (id in delayed_load) {
				if (delayed_load.hasOwnProperty(id)) {
					$('#' + id).html(delayed_load[id]);
				}
			}
		}
	})();

})();

