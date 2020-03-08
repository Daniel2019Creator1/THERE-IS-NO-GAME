/*jshint esversion: 6 */
var NgAudioPlayer, NgMediaPlayer, NgVideoPlayer;

(function($) {
	// make available within the scope of this set
	var TYPE_AUDIO = 'audio';
	var TYPE_VIDEO = 'video';
	var undef = typeof undefined;

	/**
	 * There's an identical set of functions in ngutils, but
	 * duplicating here removes the need to include ngutils
	 * in the standalone player in embed
	 */
	var auto_id = 0;

	var  nextAutoId = function() {
		auto_id++;
		return "ng-media-autoid-"  + auto_id;
	};

	var idFor = function($element) {
		var id = $element.attr('id');
		if (!id) {
			$element.attr('id', nextAutoId());
		}
		return id;
	};
	/**
	 * Given an object and name of param, form a key as part of
	 * of a combination of the pair of them.
	 */
	var getStorageKey = function(obj, name) {
		return (obj._name ? obj._name : 'NgMedia') + '_' + name;
	};

	/**
	 * Attempt to get an item from local storage.
	 */
	var getFromStorage = function(obj, name, def) {
		def = typeof(def) === undef ? null : def;

		try {
			let res = window.localStorage.getItem(getStorageKey(obj, name));

			if (null === res) {
				return def;
			} else {
				return res;
			}
		}
		catch (e) {
			return def;
		}
	};

	/**
	 * Attempt to save an item to localStorage.
	 */
	var saveToStorage = function(obj, name, value) {
		try {
			window.localStorage.setItem(getStorageKey(obj, name), value);
			return true;
		}
		catch (e) {
			return false;
		}
	};

	var deleteFromStorage = function(obj, name) {
		try {
			window.localStorage.removeItem(getStorageKey(obj, name));
			return true;
		}
		catch (e) {
			return false;
		}
	};

	/**
	 * Gets a jQuery element from the controls we specify - e.g. play or pause buttons.
	 */
	var getElement = function(controls, param) {
		if (!controls.hasOwnProperty(param)) {
			return null;
		}

		var str_or_object = controls[param];

		if (null === str_or_object) {
			return null;
		} else if (typeof(str_or_object) === typeof('')) {
			return $(str_or_object);
		} else if (undef === typeof(str_or_object)) {
			return null;
		} else {
			return $(str_or_object);
		}
	};

	/**
	 * If not params have been explicitly specified, search for them
	 * based on their id, WITHIN the player itself. So if you have a
	 * player like:
	 * <div id="player"><div id="player-progress"></div></div>
	 *
	 * And you're
	 */
	var getPlayerElement = function(controls, param, player) {
		var el = getElement(controls, param);

		if (null !== el && el.exists()) {
			return el;
		}

		if (!player) {
			return null;
		}


		el = player.find('[id$="-' + param + '"]');

		if (el && el.exists()) {
			return el;
		}

		return null;

	};

	/**
	 * Plucks a param with the given name out of the param pool we've been passed.
	 *
	 */
	var getParam = function(params, param, _default, existing) {
		try {
			if (typeof(params) !== undef && typeof(params[param]) !== undef) {
				return params[param];
			} else {
				if (typeof(existing) !== undef && typeof(existing[param]) !== undef) {
					return existing[param];
				} else if (typeof(_default) === undef) {
					return null;
				} else {
					return _default;
				}
			}
		}
		catch (e) {
			return typeof(_default) !== undef ? _default : null;
		}
	};



	/**
	 * Cribbed from video-js. Puts a time in seconds to 01:05:22, or whatever
	 *
	 * @return String
	 */
	var formatTime = function(seconds, guide) {
		if (typeof(guide) === undef) {
			guide = seconds;
		}

		seconds = seconds < 0 ? 0 : seconds;
		let s = Math.floor(seconds % 60);
		let m = Math.floor(seconds / 60 % 60);
		let h = Math.floor(seconds / 3600);
		const gm = Math.floor(guide / 60 % 60);
		const gh = Math.floor(guide / 3600);

		// handle invalid times
		if (isNaN(seconds) || seconds === Infinity) {
			// '-' is false for all relational operators (e.g. <, >=) so this setting
			// will add the minimum number of fields specified by the guide
			h = m = s = '-';
		}

		// Check if we need to show hours
		h = (h > 0 || gh > 0) ? h + ':' : '';

		// If hours are showing, we may need to add a leading zero.
		// Always show at least one digit of minutes.
		// updated to show leading 0 regardless (the || m < 10)
		m = (((h || gm >= 10) && m < 10) || m < 10 ? '0' + m : m) + ':';

		// Check if leading zero is need for seconds
		s = (s < 10) ? '0' + s : s;

		return h + m + s;
	};

	var _NativeAudio = function($element) {
		var self = this;
		self.$element = $element;
		self.$element[0].load();

		self._duration = NaN;

		$element[0].onloadedmetadata = function() {
			var audio = $element[0];

			self._duration = audio.duration;
		};

		self.getSource = function(index) {
			var $sources = $('source', $element);

			if (!$sources.length) {
				throw "No audio sources";
			}

			index = undef === typeof index ? 0 : index;

			return $sources[index];
		};

		self.play = function(seconds) {
			if (undef !== typeof seconds) {
				self.seek(seconds);
			}

			self.$element[0].play();

			return self;
		};

		self.seek = function(seconds) {
			if (isNaN(seconds)) {
				return self.$element[0].currentTime;
			} else {
				self.$element[0].currentTime = seconds;
			}

			return self;
		};

		self.pause = function() {
			self.$element[0].pause();

			return self;
		};

		self.stop = function() {
			// pause, do not stop - else we lose the touch event
			var s = self.$element[0];
			s.pause();
			s.currentTime = 0;

			return self;
		};

		self.setVolume = function(volume) {
			self.$element[0].volume = volume;

			return self;
		};

		self.on = function(eventName, method) {
			if (eventName === 'load') {
				self.$element[0].addEventListener('loadedmetadata', method);
			}

			if (eventName === 'play') {
				self.$element[0].addEventListener('timeupdate', method);
			}

			if (eventName === 'end') {
				self.$element[0].addEventListener('ended', method);
			}

		};

		self.loaded = function() {
			return true;
		};

		self.duration = function() {
			return self._duration;
		};

		self.progress = function() {
			return self.seek();
		};

		self.volume = function(volume) {
			if (isNaN(volume)) {
				return self.$element[0].volume;
			} else {
				self.$element[0].volume = volume;

				return self;
			}
		};

		self.unload = function() {
			console.log("Remove from sources?");
		};
	};

	/**
	 * Wrapper for whatever player we're using. This could be
	 * WaveSurfer, Howler, or Video Js, etc.
	 *
	 * The aim is to normalize method names across
	 * any player we're using.
	 *
	 * All share some method names, like play(). However,
	 * there is no skip forward for Howler, so we use seek()
	 * as a method name, which calls Howler's seek and
	 * WaveSurfer's skipForward(), etc.
	 *
	 */
	var Player = function(object, name) {
		var self = this;

		self._progress = 0;
		self._playing = false;
		self._paused = false;
		self._muted = false;
		self._repeat = false;
		self._loop = false;

		// will be initialized by initControls
		// in the media player
		self._loaded = null;

		// fast forward and rewind go by this amount
		var SKIP_SECONDS = 2;

		// Howler, WaveSurfer, VideoJS (not yet implemented) etc.
		self.object = object;
		self._name = name || null;

		if (name === 'WaveSurfer') {
			object.on('ready', function() {
				self._loaded = true;
			});
		}

		self.isPlaying = function() {
			return true === self._playing;
		};

		self.isPaused = function() {
			return true === self._paused;
		};

		self.isMuted = function() {
			return true === self._muted;
		};

		self.isRepeating = function() {
			return true === self._repeat;
		};

		self.isLooped = function() {
			return true === self._loop;
		};


		self.mute = function() {
			return self.__exec('mute', true);
		};

		self.unmute = function() {
			return self.__exec('mute', false);
		};

		self.unload = function() {
			return self.__exec('unload');
		};

		/**
		 * play media
		 */
		self.play = function() {
			self._playing = true;
			self._paused = false;

			self.object.play();
		};

		/**
		 * pause media
		 */
		self.pause = function() {
			self._paused = true;
			self._playing = false;

			self._progress = self.getProgress();
			self.object.pause();
		};

		/**
		 * stop media
		 */
		self.stop = function() {
			self._paused = false;
			self._playing = false;

			self.object.stop();
		};

		/**
		 * @return integer (seconds of media)
		 */
		self.getDuration = function() {
			return self.__exec('duration');
		};

		/**
		 * @return integer (seconds into progress of media)
		 */
		self.getProgress = function() {
			return self.__exec('progress');
		};

		/**
		 * Move forward SKIP_SECONDS at a time.
		 */
		self.fastForward = function() {
			return self.__exec('fast_forward');
		};

		/**
		 * Move backward SKIP_SECONDS at a time.
		 */
		self.rewind = function() {
			return self.__exec('rewind');
		};

		self.seek = function(progress) {
			self._progress = progress;
			return self.__exec('seek', progress);
		};

		/**
		 * Player values are typically 0.0 through 1.0
		 */
		self.setVolume = function(level) {
			return self.__exec('volume', level / 100);
		};

		/**
		 * @return boolean
		 */
		self.isLoaded = function() {
			if (null === self._loaded) {
				self._loaded = false;
			}

			return self.__exec('loaded');
		};

		/**
		 * Execute a method for the given player.
		 * @param {string} name
		 */
		self.__exec = function(name, value) {
			try {
				if (null === self._name) {
					throw "Name not set.";
				}

				var fn = self.__getMapping()[self._name][name];

				if (typeof(fn) === 'string' || typeof(fn) === undef) {
					if (typeof(self.object[fn]) === 'function') {
						return self.object[fn](value);
					} else if (typeof(self.object[name]) === 'function') {
						return self.object[name](value);
					} else {
						throw "Cannot exec, fn is not recognized.";
					}
				} else if (typeof(fn) === 'function') {
					return fn(value);
				}
			} catch (e) {
				console.log(self.object);
				throw "Unable to get " + name + "\n" + e;
			}

		};

		self.__getMapping = function() {
			var self = this;

			return {
				'Howler': {
					'loaded': function() {
						return self.object.state() === 'loaded';
					},
					'progress': 'seek',
					'fast_forward': function() {
						var progress = self.getProgress();
						var seek = 0;

						if ((progress + SKIP_SECONDS) < self.getDuration()) {
							seek = progress + SKIP_SECONDS;
						}

						return self.object.seek(seek);
					},
					'rewind': function() {
						var progress = self.getProgress();
						var seek = 0;

						if ((progress - SKIP_SECONDS) > 0) {
							seek = progress - SKIP_SECONDS;
						}

						return self.object.seek(seek);
					}
				},
				'NativeAudio': {},
				'WaveSurfer': {
					'duration': 'getDuration',
					'mute': 'setMute',
					'loaded': function() {
						return self._loaded;
					},
					'progress': 'getCurrentTime',
					'fast_forward': 'skipForward',
					'rewind': 'skipBackward',
					'seek': function(val) {
						return self.object.seekTo(val /self.object.getDuration());
					},
					'unload': 'destroy',
					'volume': function(level) {
						if (typeof(level) === undef) {
							return 1;
						} else {
							self.object.setVolume(level);
						}

					}
				}
			};
		};

	};

	var MediaPlaylist = function(id) {
		var self = this;

		MediaPlaylist.playlists.push(this);

		// id of the element this belongs to, or 'global'
		// for global player
		self._id = id;

		// should be either audio, or video
		self._type = null;

		// everything this playlist has
		self._items = [];

		// all items, but shuffled
		self._shuffled = [];
		self._shuffle = false;

		self._current_index = null;

		// this is not a Player wrapper - it's either the NgAudioPlayer
		// or NgVideoPlayer instance
		self._player = null;

		self.setPlayer = function(player) {
			this._player = player;

			return this;
		};

		/**
		 * Initialize the item when adding to the playlist.
		 */
		self.addItem = function(item) {
			if (item.$element.attr('data-registered')) {
				return item;
			}

			item.$element.attr('data-registered', 1);
			item.initialize();

			item.$element.show();
			item.setPlaylist(this);

			// adds item into the playlist, which in turn controls
			// the player
			this._items.push(item);

			if (this._shuffle) {
				// reshuffle each time an item is added?
				this._doShuffle();
			}

			return this;
		};

		/**
		 * @return boolean
		 */
		self.isCurrentItem = function(item) {
			return this.getCurrentItem() === item;
		};

		/**
		 * Clears all items from this playlist, resets
		 * shuffle back to false?
		 */
		self.clear = function() {
			this._items = [];
			this._shuffled = [];
			this._shuffle = false;
			this._current_index = 0;

			return this;
		};

		/**
		 * @return []
		 */
		self.getItems = function() {
			return this._items;
		};

		/**
		 * Whether or not given MediaItem exists in the index already.
		 *
		 * @return boolean
		 */
		self.itemIsIndexed = function(item) {
			var len = self._items.length;

			if (!len) {
				return false;
			}

			for (var i = 0; i < len; ++i) {
				if (self._items[i] === item) {
					return true;
				}
			}

			return false;

		};

		/**
		 * @return [] shuffled items
		 */
		self.getShuffled = function() {
			return this._shuffled;
		};

		self.hasCurrentItem = function() {
			return this.getCurrentItem() !== null;
		};

		self.getCurrentItem = function() {
			if (null === this._current_index) {
				return null;
			}

			if (this._items.length) {
				if (this._shuffle) {
					return this._shuffled[this._current_index];
				} else {
					return this._items[this._current_index];
				}
			} else {
				return null;
			}
		};

		/**
		 * Given current item, extract its position in the relevant
		 * array for the _current_index
		 */
		self.setCurrentItem = function(item) {
			var i = 0, items, len;
			var self = this;

			if (null === self._current_index) {
				self._current_index = 0;
			}

			if (self._shuffle) {
				items = self._shuffled;
			} else {
				items = self._items;
			}

			len = items.length;

			// if the item is a number, it must be within the
			// indices we have.
			if (typeof(item) === typeof(0)) {
				if (item >= 0 && item < len) {
					return true;
				}

				return false;
			}

			for (i; i < len; ++i) {
				if (items[i] === item) {
					this._current_index = i;
					return true;
				}
			}

			// if the item isn't indexed, then add it...
			if (!self.itemIsIndexed(item)) {
				self.addItem(item);

				// only need to increment this if we have more than one item in the index
				if (self._items.length > 1) {
					self._current_index = self._items.length - 1;
				}
			}

			return false;
		};

		self._repeatingNotLooping = function() {
			if (self._player) {
				let p = self._player;

				return p._repeat && !p._loop;
			}

			return false;
		};

		self._repeating = function() {
			if (self._player) {
				return self._player._repeat;
			}

			return false;
		};

		/**
		 * Are there more items in this playlist to play?
		 *
		 * @return boolean
		 */
		self.hasNextItem = function() {
			var len;
			if (this._shuffle) {
				len = this._shuffled.length;
			} else {
				len = this._items.length;
			}

			let rpl = self._repeatingNotLooping();

			return (this._current_index + 1) < len || self._repeating();
		};

		self.loadNextItem = function(afterCallback) {
			var self = this;

			if (!self.hasNextItem()) {
				return false;
			}

			var items = this._shuffle ? this._shuffled : this._items;

			try {
				let n = items[self._current_index + 1];
				let callback = function(response) {
					n.onLoad(response);

					if (typeof afterCallback === 'function') {
						afterCallback(response);
					}
				};

				n.load(callback);
			}
			catch (e) {
				if (self._current_index) {
					// if we're here, we're probably out of bounds...
					/// so let's try loading the first item we have
					let n = items[0];
					let callback = function(response) {
						n.onLoad(response);

						if (typeof afterCallback === 'function') {
							afterCallback(response);
						}
					};

					n.load(callback);
				}
			}
		};

		/**
		 * @return boolean
		 */
		self.hasPreviousItem = function() {
			return this._current_index > 0 || self._repeating();
		};

		self.loadPreviousItem = function() {
			var self = this;

			if (!self.hasPreviousItem()) {
				return false;
			}

			var items = this._shuffle ? this._shuffled : this._items;

			try {
				let n = items[self._current_index - 1];
				n.load(n.onLoad.bind(n));
			}
			catch (e) {
				// if we're here, then the index is most likely
				// 0 (first item) already, in which case we'll want
				// to go to the last item we have.
				let n = items[items.length - 1];
				n.load(n.onLoad.bind(n));
			}
		};

		/**
		 * Switches shuffle boolean on, takes items and puts them into random order.
		 */
		self._doShuffle = function() {

			var fY = function(array) {
				var currentIndex = array.length, temporaryValue, randomIndex;

				// While there remain elements to shuffle...
				while (0 !== currentIndex) {
					// Pick a remaining element...
					randomIndex = Math.floor(Math.random() * currentIndex);
					currentIndex -= 1;

					// And swap it with the current element.
					temporaryValue = array[currentIndex];
					array[currentIndex] = array[randomIndex];
					array[randomIndex] = temporaryValue;
				}

				return array;
			};

			var self = this, temp, temp2;

			self._shuffle = true;

			if (self.hasCurrentItem()) {
				temp = [];
				for (var i = 0, len = self._items.length; i < len; ++i) {
					if (self._items[i] !== self.getCurrentItem()) {
						temp.push(self._items[i]);
					}
				}

				if (temp.length) {
					temp = fY(temp);
				}
				temp2 = [self.getCurrentItem()].concat(temp);
				temp = temp2;

				// we want the item after the one that's already playing here
				self._current_index = 0;

			} else {
				temp = fy(self._items);

				// nothing was playing, set to 0
				self._current_index = 0;
			}

			self._shuffled = temp;

			return this;
		};

		/**
		 * @return _doShuffle()
		 */
		self.shuffleOn = function() {
			return this._doShuffle();
		};

		/**
		 * Switch shuffled off, clear shuffled items.
		 */
		self.shuffleOff = function() {
			this._shuffle = false;
			this._shuffled = [];

			return this;
		};

		self.toggleShuffle = function() {
			if (this._shuffle) {
				return this.shuffleOff();
			} else {
				return this.shuffleOn();
			}
		};

		self.play = function(item, seconds) {
			var self = this;

			var current_item = self.getCurrentItem();
			item = undef === typeof(item) ? current_item : item;

			var all_items = self.getItems();

			for (var i = 0, len = all_items.length; i < len; ++i) {
				if (all_items[i] !== item) {
					all_items[i].$element.removeClass('playing paused');
				}
			}

			if (self._player) {
				if (current_item !== item) {
					self.setCurrentItem(item);
					self._player.initPlayer();
				}

				self._player.play(seconds);

				return self;
			}

			throw "Unable to play.";
		};

		self.pause = function() {
			var self = this;

			if (self._player) {
				self._player.pause();
				return self;
			}

			throw "Unable to pause";
		};
	};

	// contains ALL playlists
	MediaPlaylist.playlists = [];

	var AudioPlaylist = function(id) {
		MediaPlaylist.apply(this, arguments);

		self._type = 'audio';
	};

	var MediaItem = function(element_or_params) {
		var self = this;

		// audio, or video
		self._type = null;

		// e.g. ['mp3'] or ['mp4']
		self._qualities = null;

		// matches the id of the submission or project itself
		self._generic_id = null;

		// type id should match ContentType of AUDIO, AUDIO_PROJECT, MOVIE
		// or MOVIE_PROJECT
		self._type_id = null;

		// the playlist that this belongs to, if any
		self._playlist = null;

		// the player in which this belongs
		self._player = null;

		self._sources = {};

		var $element = null;
		if (typeof(element_or_params) === typeof('')) {
			$element = $(element_or_params);
			self._generic_id = $element.attr('data-audio-playback');
		} else if (typeof(element_or_params) === typeof({})) {
			if (element_or_params.container) {
				// this is most likely a
				if (typeof(element_or_params.container) === typeof('')) {
					$element = $(element_or_params.container);
				} else {
					$element = element_or_params.container;
				}

				var p = element_or_params;
				self._generic_id = p.generic_id || null;
				self._type_id = p.type_id || null;
			} else if ($.isFunction(element_or_params.exists)) {
				$element = element_or_params;
			}

		}

		if (null === $element) {
			throw 'Invalid/missing element.';
		}

		// should return #container for the listen page, auto assigned
		// for other pages that don't explicitly set the id="" attribute
		self._id = idFor($element);

		self.$element = $element;

		self.initialize = function() {
			var self = this;

			this.$element.off().on('click', function() {
				self.onClick(self);
			});

			return this;
		};


		self.setPlaylist = function(playlist) {
			this._playlist = playlist;

			return this;
		};

		self.setPlayer = function(player) {
			this._player = player;

			return this;
		};

		/**
		 * These are html5 media sources.
		 */
		self.addSource = function(src, type, quality) {
			var self = this;

			if (typeof(quality) === undef) {
				quality = self._qualities[0];
			}

			if (self._qualities.indexOf(quality) === -1) {
				if (null === self._qualities) {
					throw "Invalid/missing quality " + quality;
				}
			}

			if (typeof(self._sources[quality]) === undef) {
				self._sources[quality] = [];
			}

			self._sources[quality].push({
				src: src,
				type: type
			});

			return self;
		};

		self.getSources = function() {
			return self._sources;
		};

		self.isPlaying = function() {
			return this.$element.hasClass('playing');
		};

		self.isPaused = function() {
			return this.$element.hasClass('paused');
		};

		self.play = function(trigger_playlist) {
			if (!this.$element.is('a')) {
				return this;
			}

			this.$element.removeClass('playing paused').addClass('playing');

			trigger_playlist = undef === typeof(trigger_playlist) ? true : trigger_playlist;

			if (trigger_playlist) {
				// this in turn, triggers the player. We only want to do this if
				// we clicked from the item itself, and not from the player
				// console.log("Triggering playlist play in MediaItem.play();");
				this._playlist.play(this);
			}

			return this;
		};

		self.pause = function(trigger_playlist) {
			if (!this.$element.is('a')) {
				return this;
			}

			this.$element.removeClass('playing paused').addClass('paused');

			trigger_playlist = undef === typeof(trigger_playlist) ? true : trigger_playlist;

			if (trigger_playlist) {
				// this in turn, triggers the player. We only want to do this if
				// we clicked from the item itself
				this._playlist.pause();
			}

			return this;
		};

		// there are no playlist controls from the item itself -
		// it can either play or pause, that's it. This is an instruction
		// from the player - the person clicked stop from there
		self.stop = function() {
			if (!this.$element.is('a')) {
				return this;
			}

			this.$element.removeClass('playing paused');

			return this;
		};

		self.load = function() {
			throw "Please implement load for this item.";
		};
	};


	var AudioItem = function(params) {
		var self = this;


		MediaItem.apply(this, arguments);

		self._type = 'audio';
		self._qualities = ['mp3'];

		/**
		 * @param {integer} generic_id
		 * @param {integer} type_id
		 * @param {Object} callback
		 */
		self.load = function(callback) {
			var base_url = '/audio/load';
			var self = this;

			var generic_id = self.$element.attr('data-audio-playback');
			var type_id = self.$element.attr('data-audio-type');

			var url_parts = [base_url, generic_id];
			type_id = typeof(type_id) !== undefined && null !== type_id ? type_id : null;

			if (type_id) {
				url_parts.push(type_id);
			}

			var data = PHP.get('ismobile') ? {isMobile: true} : {};

			self._sources = {};

			try {
				//self._player.play().stop();
			}
			catch (e) {}

			$.get(url_parts.join('/'), data, function(response) {
				if (response && response.sources && response.html) {
					for (var i = 0, len = response.sources.length; i < len; ++i) {
						self.addSource(response.sources[i].src, response.sources[i].type);
					}

					// this is most likely a result of an AudioActions::load()
					// request, make this the current playing item etc
					if (typeof(callback) === 'function') {
						callback(response);
					}
				}


			}).fail(function(response) {
				alert("Sorry, we couldn't load that item.");
			});

		};

		return self;
	};

	AudioItem.prototype.onLoad = function(response) {
		var self = this;

		var element = self.$element;
		var player = self._player;
		var player_object = player._player_object || null;

		element.addClass('playing');

		self._generic_id = response.id;
		self._type_id = response.type_id;


		if (player_object && (player_object.isPlaying() || player_object.isPaused())) {
			player_object.stop();
		}

		// push the author information into the player.
		// this includes the favorite button.
		if (player._author_display) {
			$(player._author_display).html(response.html);
		}

		player._params._duration = response.duration;

		// reinitialize container
		player.initContainer();

		self.play();

		return self;
	};

	AudioItem.prototype.onClick = function(response) {
		var self = this;
		var element = self.$element;

		// do nothing, this isn't a clickable element
		if (!element.is('a')) {
			return self;
		}

		if (self.isPlaying()) {
			self.pause(true);
			return self;
		}

		if (self.isPaused()) {
			self.play(true);
			return self;
		}


		//self.load(self.onLoad.bind(self));

		var callback = function(response) {
			return self.onLoad(response);
		};

		/*self.load(function(response) {
			self._player.initForAsync(function(response) {
				callback(response);
			});
		});*/

		self._player.initForAsync(function() {
			self.load(self.onLoad.bind(self));
		});

		return self;
	};



	NgMediaPlayer = function(id, params) {
		var self = this;


		self._name = null;
		self._type = null;

		self._initialized = false;

		// controls for the player itself... play, skip, whatever
		self._controls = params.controls || {};

		// contains  things such as the generic and type id, the URL of the file to play
		// etc.
		self._params = params.params || {};

		// misc. params - including the loading div, whether or not to loop, and the peaks
		// if they've already been saved
		self._player_params = params.player_params || {};

		// whichever player we're using
		self._player_object = null;

		// all players we have
		NgMediaPlayer.players.push(this);

		// this is to be overwritten in child classes. E.g. ['mp3']
		self._qualities = null;

		self._wait_for_async = PHP.get('ismobile');

		// these are not playlists in the sense of newgrounds.com/playlists
		// - they're items within the current scope of the player
		self._playlists = {};
		self._current_playlist = null;

		// for the current file itself
		self._generic_id = getParam(self._params, 'generic_id');
		self._type_id = getParam(self._params, 'type_id');
		self._url = getParam(self._params, 'url');

		// vars for the state of the item itself
		self._loop = getParam(self._params, 'loop', false);
		// this is for players with multiple items - whether
		// or not we're going back to the beginning of
		// the playlist once the last item is done playing
		// if _loop is set, then this MUST be true
		self._repeat = getParam(self._params, 'repeat', self._loop);

		self._muted = getParam(self._player_params, 'muted', false);

		self._standalone = getParam(self._player_params, 'standalone', true);


		self._volume_settable = getParam(self._player_params, 'volume_settable', true);

		// the actual timings of
		self._duration = 0;
		self._progress = 0;

		// in listen view, we don't use this - clicking the waveform
		// puts the track at that position
		self._use_progress_scrubber = getParam(self._player_params, 'use_progress_scrubber', true);

		self._can_play = true;

		// this is the main wrapper element
		self.$element = $('#' + id);

		// this is the audio waveform or progress bar
		self.$container = getPlayerElement(self._player_params, 'container', self.$element);


		// display elements for duration and the progress of the track (their
		// times, not the physical progress of the bar/waveform)
		self.$duration = getPlayerElement(self._player_params, 'duration', self.$element);
		self.$progress = getPlayerElement(self._player_params, 'progress', self.$element);

		// this is an element, rather than a var
		self.$loading = getElement(self._player_params, 'loading');

		// all elements, but they're controls for the playback of the item
		// these are in the order they appear onscreen

		self.$previous = getPlayerElement(self._controls, 'previous');
		self.$rewind = getPlayerElement(self._controls, 'rewind');
		self.$play = getPlayerElement(self._controls, 'play');
		self.$pause = getPlayerElement(self._controls, 'pause');
		self.$stop = getPlayerElement(self._controls, 'stop');
		self.$fastForward = getPlayerElement(self._controls, 'fastForward');
		self.$next = getPlayerElement(self._controls, 'next');

		self.$shuffle = getPlayerElement(self._controls, 'shuffle');
		self.$loop = getPlayerElement(self._controls, 'loop');
		self.$repeat = getPlayerElement(self._controls, 'repeat');

		self.$soundOff = getPlayerElement(self._controls, 'soundOff');
		self.$soundOn = getPlayerElement(self._controls, 'soundOn');

		// slider, if present - which it isn't, in mobile versions
		self.$volume = getPlayerElement(self._controls, 'volume');

		// show/hide the slider, not always present (e.g. mobile)
		self.$volumeToggle = getPlayerElement(self._controls, 'volumeToggle');

		/**
		 * this doesn't do anything particularly useful, other than to
		 * get all of the elements that control playback (e.g. play, pause)
		 * into one array that can be looped through in a $.each
		 * to enable/disable
		 */
		self.$controls = [];

		self.setPlaylist = function(playlist) {
			var self = this;


			// add this, if it's not already there
			self.addPlaylist(playlist);

			// and then set it to the current playlist
			self._current_playlist = playlist;

			// add ourselves as the player for the playlist
			playlist.setPlayer(self);

			return self;
		};

		self.playlistIsCurrent = function(playlist) {
			return playlist === self._current_playlist;
		};

		self.playlistInLists = function(playlist) {
			for (var n in this._playlists) {
				if (this._playlists[n] === playlist) {
					return true;
				}
			}

			return false;

		};

		self.addPlaylist = function(playlist) {
			var self = this;

			if (!self.playlistInLists(playlist)) {
				self._playlists[playlist._id] = playlist;
			}

			var len = $.map(self._playlists, function(n, i) { return i; }).length;

			if (len === 1) {
				self._current_playlist = playlist;
			}

			return self;
		};

		self.getFromStorage = function(param, def) {
			return getFromStorage(this, param, def);
		};

		self.saveToStorage = function(name, value) {
			return saveToStorage(this, name, value);
		};

		self.deleteFromStorage = function(name) {
			return deleteFromStorage(this, name);
		};

		self.activate = function() {
			var self = this;

			if (self.$element) {
				if (!self.$element.hasClass('active')) {
					self.$element.addClass('active');
				}
			}

			return self;
		};

		self.deActivate = function() {
			var self = this;

			if (self.$element && self.$element.hasClass('active')) {
				self.$element.removeClass('active');
			}

			if (self._player_object) {
				// stop any playback
				self._player_object.stop();
			}

			return self;
		};

		/**
		 * @return {float} duration (in seconds)
		 */
		self.getDuration = function() {
			var self = this;

			if (self._player_object) {
				let d = self._player_object.getDuration();
				if (!isNaN(d) && d) {
					return d;
				}
			}

			// fallback to this if we haven't yet got the duration
			if (self._params.duration) {
				return self._params.duration;
			}

		};

		self.getPlayerObject = function() {
			if (!self._player_object) {
				throw "No player object set.";
			}

			return self._player_object;
		};

		/**
		 * @return {float} progress (in seconds)
		 *
		 */
		self.getProgress = function() {
			var self = this;

			if (self._player_object) {
				return self._player_object.getProgress();
			}
		};

		/**
		 * Turn sound off.
		 */
		self.mute = function() {
			var self = this;

			if (self._player_object) {
				self._player_object.mute();
			}


			self._muted = true;

			if (self.$soundOn) {
				self.$soundOn.show();
			}

			if (self.$soundOff) {
				self.$soundOff.hide();
			}

			return self;

		};

		/**
		 * Turn sound back on again.
		 */
		self.unmute = function() {
			var self = this;

			if (self._player_object) {
				self._player_object.unmute();
			}


			self._muted = false;

			if (self.$soundOn) {
				self.$soundOn.hide();
			}

			if (self.$soundOff) {
				self.$soundOff.show();
			}

			return self;
		};

		self.previous = function() {
			var self = this;

			let p = self._current_playlist;

			if (!p) {
				return false;
			}

			p.loadPreviousItem();

			return self;
		};


		/**
		 * @param {float} seconds
		 *
		 * Play the current item, optionally from seconds
		 */
		self.play = function(seconds) {
			var self = this;

			if (!self._standalone) {
				self.activate();
			}

			if (self._player_object) {
				// howler's method for play differs to that of
				// wavesurfer - WS takes seconds as a param, and starts
				// from there when it's present. Howler takes
				// a sprite/id for its first argument and plays that clip.
				if (typeof(seconds) !== undef) {
					self._player_object.seek(seconds);
				}

				self._player_object.play();
			}

			//
			self.updateButtons();

			self.initPlaybackInfo();

			// stop other players
			self.stopOtherPlayers();

			// indicate the change on the media item, if there is one
			if (self._current_playlist) {
				let current_item = self._current_playlist.getCurrentItem();

				if (current_item) {
					current_item.play(false);
				}
			}


			return self;
		};

		/**
		 * Pauses playback, hides pause button.
		 * Also makes a note of any progress in the track, so that
		 * if the user returns to this at a later date, it'll continue
		 * playback from that point.
		 */
		self.pause = function() {
			var self = this;

			if (self._player_object) {
				self._player_object.pause();
			}

			if (self._current_playlist && self._current_playlist.getCurrentItem()) {
				self._current_playlist.getCurrentItem().pause(false);
			}

			self.updateButtons();
			self.saveProgress();
			self.trackProgress();

			return self;
		};

		/**
		 * Stop playback, reset controls.
		 * When a track ends, it calls this method. But we don't necessarily
		 * want to hide the player UNLESS we've reached the last item in those
		 * cases.
		 */
		self.stop = function(deactivate) {
			var self = this;

			// if not explicitly passed, only deactivate if
			// this track does not have a next item
			if (undef === typeof(deactivate)) {
				deactivate = self._standalone || !self.hasNextItem();
			}

			if (self._player_object) {
				self._player_object.stop();
			}

			if (self.$stop) {
				self.$stop.disable();
			}

			if (self.$play) {
				self.$play.show();
				self.$play.enable();
			}

			if (self.$pause) {
				self.$pause.hide();
			}

			if (self._current_playlist && self._current_playlist.getCurrentItem()) {
				let current = self._current_playlist.getCurrentItem();
				current.stop();
			}

			self.updateButtons();
			self.initPlaybackInfo();

			if (deactivate) {
				self.deActivate();
			}

			return self;
		};

		/**
		 * Skips player forward SKIP_SECONDS at a time.
		 */
		self.fastForward = function() {
			var self = this;

			if (self._player_object) {
				self._player_object.fastForward();
				self.trackProgress();
			}

			return self;
		};

		self.next = function() {
			var self = this;

			let p = self._current_playlist;

			if (!p) {
				return self;
			}

			p.loadNextItem();

			return self;
		};

		/**
		 * Skips player back SKIP_SECONDS at a time.
		 */
		self.rewind = function() {
			var self = this;

			if (self._player_object) {
				self._player_object.rewind();
				self.trackProgress();
			}

			return self;
		};

		/**
		 * Move to a certain point in the track.
		 */
		self.seek = function(time) {
			var self = this;

			if (self._player_object) {
				self._player_object.seek(time);
			}

			if (self.$progress) {
				self.$progress.html(formatTime(time));
			}

			self.saveProgress(time);

			return self;
		};

		/**
		 * FIXME: next track
		 */
		self.skipBack = function() {
			var self = this;

			if (self._player_object) {
				self._player_object.skipBack();
			}

			return self;
		};

		self.skipForward = function() {
			var self = this;

			if (self._player_object) {
				self._player_object.skipForward();
			}

			return self;
		};


		/**
		 * Move the volume up and down.
		 * By default, the slider will change the volume as the
		 * user moves it. When they let go of the handle, the level
		 * will be stored, so that it's persistent across sessions.
		 * Icon should change to various states according to the level.
		 */
		self.setVolume = function(percentage, store) {
			var self = this;
			store = true === store ? true : false;

			if (self._player_object && !isNaN(percentage)) {
				self._player_object.setVolume(percentage);
			}


			if (self.$volumeToggle) {
				var ti = self.$volumeToggle.find('i');

				if (0 === percentage) {
					ti.removeClass().addClass('fa fa-volume-off');
				} else if (percentage <= 50) {
					ti.removeClass().addClass('fa fa-volume-down');
				} else {
					ti.removeClass().addClass('fa fa-volume-up');
				}
			}

			if (store) {
				self.saveToStorage('volume', percentage);
			}

			return self;
		};

		/**
		 * @param {float} progress (in seconds)
		 *
		 * Store the progress of the track in localStorage
		 */
		self.saveProgress = function(progress) {
			var self = this;

			progress = typeof(progress) === undef ? self.getProgress() : progress;

			let playlist = self._current_playlist;

			if ((false === progress || !isNaN(progress)) && playlist && playlist.getCurrentItem()) {
				let c = playlist.getCurrentItem();
				let k = c._generic_id  + '_' + c._type_id;
				let key = k + '_progress';

				if (false === progress) {
					self.deleteFromStorage(key);
				} else {
					self.saveToStorage(key, progress);
				}
			}
		};

		/**
		 * Set player to repeat - not loop, but repeat the
		 * playlist once it's reached the end of the queue.
		 */
		self.repeat = function() {
			var p = self._player_object || {};

			if (self._repeat) {
				// we're already repeating, now should we be looping?
				if (self._loop) {
					// nope, we're at the end of the line here...
					// turn off repeat and loop
					self._repeat = false;
					self._loop = false;
				} else {
					// yes, we should be looping
					self._loop = true;
				}

			} else {
				// only one track per player here, skip straight to looping
				if (self._standalone) {
					self._loop = true;
				} else {
					self._loop = false;
				}
				self._repeat = true;
			}

			p._repeat = self._repeat;
			p._loop = self._loop;

			self.updateButtons();

			return self;
		};


		self.shuffle = function() {
			this._shuffle = !this._shuffle;
			this.updateButtons();

			let p = this._current_playlist;

			if (p) {
				if (this._shuffle) {
					p.shuffleOn();
				} else {
					p.shuffleOff();
				}
			}

			return this;
		};

		/**
		 * Alias
		 * Add an item to the playlist the player is running through.
		 */
		self.addItem = function(item, playlist) {
			var self = this;

			if (typeof(item) === typeof('')) {
				item = new AudioItem($('#' + item));
			}

			playlist = self._current_playlist || playlist;

			if (typeof(playlist) === undef || null === playlist) {
				throw "Missing playlist!";
			}

			// the item will be pushed into the
			playlist.addItem(item);

			// assign player to this
			item.setPlayer(self);

			return self;
		};

		self.setCurrentItem = function(item_pos_or_object) {
			if (this._current_playlist) {
				this._current_playlist.setCurrentItem(item_pos_or_object);
			}


			return this;
		};

		/**
		 * Alias.
		 * Whether or not there's an item before this in the queue to play.
		 */
		self.hasPreviousItem = function() {
			var self = this;

			if (null === self._current_playlist) {
				return false;
			}

			return self._current_playlist.hasPreviousItem();
		};

		/**
		 * Alias.
		 * Whether or not there is another track to play after the one that's
		 * currently playing.
		 */
		self.hasNextItem = function() {
			var self = this;

			if (self._current_playlist === null) {
				return false;
			}

			return self._current_playlist.hasNextItem();
		};

		/**
		 * Make an AJAX request to get the details of the next item.
		 */
		self.loadNextItem = function(callback) {
			var self = this;

			let p = self._current_playlist;

			if (p) {
				p.loadNextItem(callback);
			}
		};

		/**
		 * On completion of the playing track, do one of the following:
		 * 1. If looping, go back to the beginning of the track.
		 * 2. If there are more items in the list, play the next one.
		 * 3. Stop.
		 */
		self.onEnd = function() {
			// clear any progress we'd saved for this
			self.saveProgress(false);

			if (self._loop) {
				return self.play(0);
			} else {
				if (self.hasNextItem()) {
					self.stop(false);
					return self.loadNextItem(self.updateButtons.bind(self));
				} if (self._repeat) {
					self.setCurrentItem(0).seek(0).play();
					return self.updateButtons();
				} else {
					self.stop(true);
					return self.updateButtons();
				}

			}

		};

		/**
		 * Change the states of all of the control buttons for the player, depending
		 * on what action is currently performing, if any.
		 */
		self.updateButtons = function() {
			var self = this;

			var getObject = function(name) {
				if (self.hasOwnProperty(name) && null !== self[name]) {
					return self[name];
				}

				return null;
			};

			// small internal utility functions to hide/show, disable
			// and enable elements
			var enableDisableElement = function(name, disabled) {
				var o = getObject(name);

				if (o) {
					o.prop('disabled', disabled);
				}

				return o;
			};

			var enableElement = function(name) {
				return enableDisableElement(name, false);
			};

			var disableElement = function(name) {
				return enableDisableElement(name, true);
			};

			var showHideElement = function(name, show, className, removeClassName) {
				var o = getObject(name);

				if (o) {
					if (show) {
						o.show();
					} else {
						o.hide();
					}

					if (className) {
						o.addClass(className);
					}

					if (removeClassName) {
						o.removeClass(removeClassName);
					}

				}

				return o;

			};

			var showElement = function(name, className, removeClassName) {
				return showHideElement(name, true, className, removeClassName);
			};

			var hideElement = function(name, className, removeClassName) {
				return showHideElement(name, false, className, removeClassName);
			};

			var setTitle = function(name, title) {
				var o = getObject(name);

				if (o) {
					o.attr('title', title);
				}

				return o;
			};

			// enable all controls to start with
			$.each(self.$controls, function() {
				$(this).enable();
			});

			// when playing, enable and show stop and pause buttons and
			// hide play
			if (self.isPlaying()) {
				showElement('$pause', 'active');
				hideElement('$play');
				enableElement('$stop');
			} else {
				hideElement('$pause', null, 'active');
				showElement('$play');


				// when neither playing nor paused, stop isn't available
				if (!self.isPaused()) {
					disableElement('$stop');
				}
			}

			if (!self.hasPreviousItem()) {
				disableElement('$previous');
			}

			if (!self.hasNextItem()) {
				disableElement('$next');
			}

			// same with sound
			showHideElement('$soundOn', self._muted);
			showHideElement('$soundOff', !self._muted);

			//and with loops
			if (self._repeat) {
				let c = 'active';
				let title;
				if (self._loop) {
					c = c + ' repeat-once';
					title = 'Repeat one';
				} else {
					title = 'Repeat all';
				}

				showElement('$repeat', c);
				setTitle('$repeat', title);
			} else {
				showElement('$repeat', null, 'active repeat-once');
				setTitle('$repeat', 'Repeat all');
			}

			if (self._shuffle) {
				showElement('$shuffle', 'active');
			} else {
				showElement('$shuffle', null, 'active');
			}


			return this;

		};

		/**
		 * Fire this to change the current runtime of the media being played.
		 */
		self.updateProgress = function(progress) {
			if (self.$progress && self.$progress.exists()) {
				if (typeof(progress) === undef) {
					if (self._player_object) {
						progress = self._player_object.getProgress();
					}
				}

				if (isNaN(progress)) {
					progress = 0;
				}

				self.$progress.html(formatTime(progress));
			}

			return self;
		};

		/**
		 * Sets initial playback time to
		 */
		self.initPlaybackInfo = function() {
			var self = this;
			var player = self._player_object;

			var duration = 0;

			if (self.$duration) {
				let duration = self.getDuration();
				self.$duration.html(formatTime(duration));
			}

			// any progress that's been made
			self.updateProgress();
		};

		/**
		 * alias
		 */
		self.isPlaying = function() {
			try {
				return this._player_object.isPlaying();
			}
			catch (e) {
				return false;
			}
		};

		/**
		 * alias
		 */
		self.isPaused = function() {
			try {
				return this._player_object.isPaused();
			}
			catch (e) {
				return false;
			}
		};

		/**
		 * If for some reason we have more than one player, stop
		 * playback on other players.
		 */
		self.stopOtherPlayers = function() {
			var self = this, player;

			if (NgMediaPlayer.players.length > 1) {
				for (var i = 0, len = NgMediaPlayer.players.length; i < len; ++i) {
					player = NgMediaPlayer.players[i];

					if (player !== self) {
						player.stop();
					}
				}
			}

			return self;

		};

		/**
		 * Designed to be called when the player is ready.
		 */
		self.initControls = function() {
			var self = this;
			var control;

			for (var n in self._controls) {
				control = '$' + n;
				if (self.hasOwnProperty(control)) {
					self.$controls.push(this[control]);
				}
			}

			if (self.$previous && self.hasPreviousItem()) {
				self.$previous.off().on('click', function() {
					self.previous();
					return false;
				});
			}

			self.$play.off().on('click', function() {
				self.play();

				return false;
			});


			self.$pause.off().on('click', function() {
				self.pause();

				return false;
			});

			// not present on mobile
			if (self.$stop) {
				self.$stop.off().on('click', function() {
					self.stop(true);
					return false;
				});
			}

			if (self.$shuffle) {
				self.$shuffle.off().on('click', function() {
					self.shuffle();
					return false;
				});
			}

			if (self.$repeat) {
				self.$repeat.off().on('click', function() {
					self.repeat();
					return false;
				});
			}

			/**
			 * Mobile only. Turn the sound off.
			 */
			if (self.$soundOff) {
				self.$soundOff.off().on('click', function() {
					self.mute();
					return false;
				});
			}

			/**
			 * Mobile only. Turn the sound on.
			 */
			if (self.$soundOn) {
				self.$soundOn.off().on('click', function() {
					self.unmute();
					return false;
				});
			}

			if (self.$fastForward) {
				self.$fastForward.off().on('click', function() {
					self.fastForward();
					return false;
				});
			}

			if (self.$next && self.hasNextItem()) {
				self.$next.off().on('click', function() {
					self.next();
					return false;
				});
			}

			if (self.$rewind) {
				self.$rewind.off().on('click', function() {
					self.rewind();
					return false;
				});
			}

			if (self.$skipBack) {
				self.$skipBack.off().on('click', function() {
					self.skipBackward();
					return false;
				});
			}

			if (self.$skipForward) {
				self.$skipForward.off().on('click', function() {
					self.skipForward();

					return false;
				});
			}

			// set the initial volume to whatever it was before
			// we need this value for the slider, also
			if (self._volume_settable) {
				let volumeLevel = parseInt(self.getFromStorage('volume', 100), 10);
				self.setVolume(volumeLevel);



				if (self.$volumeToggle && self.$volume) {
					var showSlider = function() {
						self.$volume.removeClass('off');
					};

					var hideSlider = function() {
						self.$volume.addClass('off');
					};


					self.$volume.slider({
						orientation: 'vertical',
						step: 1,
						value: volumeLevel,
						// this is critical in terms of getting the
						// fill color in the slider
						range: 'min',
						min: 0,
						max: 100,
						slide: function(event, ui) {
							self.setVolume(ui.value);
						},
						change: function(event, ui) {
							self.setVolume(ui.value, true);
						},
						stop: hideSlider
					});

					self.$volumeToggle.off().on('click', function() {
						if (self.$volume.hasClass('off')) {
							showSlider();
						} else {
							hideSlider();
						}

						return false;
					});
				}
			}


			if (self.$loading) {
				self.$loading.remove();
			}

			let p = self._current_playlist;
			let c = p ? p.getCurrentItem() : null;

			if (c) {
				let k = c._generic_id + '_' + c._type_id;

				let progress = self.getFromStorage(k + '_progress');

				if (progress && !isNaN(progress)) {
					self.seek(progress);
				}
			}

			self.updateButtons();
			self.initPlaybackInfo();

			return this;
		};

		self.setSources = function() {
			var $element = self.$element;
		};

		return self;
	};

	NgMediaPlayer.players = [];

	NgAudioPlayer = function(id, params) {
		var self = this;

		NgMediaPlayer.apply(self, arguments);

		self._name = 'NgAudioPlayer';
		self._type = 'audio';

		self._howler = null;

		params = params || {};

		self.updateParams(params);

	};

	NgAudioPlayer.prototype.initForAsync = function(callback) {
		var self = this;

		if (!self._wait_for_async) {
			callback();
			return true;
		}

		var $audio = $('audio', self.$element);
		var $sources = $('source', $audio);

		if (!$audio.length) {
			throw "Can't initForAsync";
		}

		if (!$sources.length) {
			var $source = $('<source/>');
			$source.attr('src', PHP.get('www_root') + '/content/micro.mp3');
			$source.attr('type', 'audio/mpeg');
			$audio.append($source);
			$audio[0].pause();
			$audio[0].load();
			$audio[0].currentTime = 0;
		}

		self._wait_for_async = false;

		setTimeout(callback, 150);
	};

	NgAudioPlayer.prototype.updateParams = function(params) {
		var self = this;
		// background color for the waves, etc, taking care not to overwrite
		// whatever's currently there, if anything
		self._options = $.extend(self._options || {}, params.options || {});

		self._author_display = getParam(params.player_params, 'author_display', null, self._player_params);

		self._images = getParam(self._params, 'images');

		// the global player is a condensed view of the player,
		// for example
		self._condensed = getParam(params.player_params, 'condensed', false, self._player_params);
	};

	NgAudioPlayer.prototype.trackProgress = function() {
		var self = this;

		// updates display
		self.updateProgress();

		var container = self.$container;
		var completed = (self.getProgress() / self.getDuration());

		if (!self._use_progress_scrubber) {
			var pos = completed * container.width();

			container.find('span').css('left', pos + 'px');
			container.find('div > div').css('width', (pos + 1 > container.width() ? pos : pos + 1) + 'px');
		} else {
			container.slider('value', self.getProgress());
		}

	};

	/**
	 * This only currently gets called from Howler, it's whether
	 * or not to set the container as a slider - e.g. a scrubber
	 * to move through the track, OR use waveform images, which are
	 * clickable and  put the user at the position of the track
	 * they've clicked, relative to the image (e.g. if they
	 * click in the middle of the waveform image, it'll put
	 * playback to halfway through the track).
	 */
	NgAudioPlayer.prototype.initContainer = function() {
		var self = this;
		var container = self.$container;
		var images = null;

		if (self._images) {
			if (self._condensed) {
				images = self._images.condensed;
			} else {
				images = self._images.listen;
			}
		}

		var was_playing = false;

		var start = function(event, ui) {
			was_playing = self.getPlayerObject().isPlaying();

			if (was_playing) {
				self.pause();
			}
		};


		if (!self._use_progress_scrubber) {

			// clear the container of any content it currently has
			container.empty();

			// creates two divs, one with the completed image in the background
			// and another as an overlay, which gets revealed as the time progresses
			var d = $(document.createElement('div'));
			d.css({
				'position': 'absolute',
				'width': '100%',
				'height': container.height() + 'px',
				'overflow': 'hidden'/*,
				'background-position': 'left top',
				'background-repeat': 'no-repeat',
				'background-size': 'cover'*/
			});

			var bg = d.clone();


			var fg = d.clone();
			// start the overlay at 1px, so that the cursor is visible
			fg.css('width', '1px');

			// we can initialize howler without waves
			if (null !== images) {
				//bg.css('background-image', 'url(' + images.playing.url + ')');
				//fg.css('background-image', 'url(' + images.completed.url + ')');

				var i = $('<img src="' + images.playing.url + '" width="' + container.width() + '" height="100%" alt="wf">');

				var i2 = $('<img src="' + images.playing.url + '" width="' + container.width() + '" height="100%" alt="wf">');

				bg.append(i);
				fg.append(i2);

				/*fg.css({
					'top': 0,
					//'margin-top': '-' + container.height() + 'px',
					'z-index': 2,
					'filter': 'grayscale(100%) brightness(200%) contrast(200%)',
					'-webkit-filter': 'grayscale(100%) brightness(200%) contrast(200%)'
				});*/
				fg.addClass('overlay');
			}

			// this 1px wide span displays the current position (or
			// cursor) of the track as it's playing / paused.
			var s = $(document.createElement('span'));
			s.css({
				'position': 'absolute',
				'width': '1px',
				'height': '100%',
				'left': '0',
				'background-color': self._options.cursorColor,
				'top': 0,
				'z-index': '3'
			});

			//fg.append(s);
			bg.append(fg);
			container.append(bg);

			bg.slider({
				min: 0,
				max: self.getDuration(),
				step: 0.1,
				slide: function(event, ui) {
					var w = ui.value / self.getDuration() * bg.width();
					fg.css('width', w + 'px');
					self.updateProgress(ui.value);
				},
				start: start,
				stop: function(event, ui) {
					// for some reason, even if was_playing is true,
					// mobile ignores it. No time for love.
					if (PHP.get('ismobile') || was_playing) {
						self.play(ui.value);
					} else {
						self.seek(ui.value);
					}
				}
			});
		} else {

			// turn container click events off before initializing
			// it
			let instance = container.slider('instance');

			if (instance) {
				instance.destroy();
			} else {
				container.off();
			}

			container.slider({
				orientation: 'horizontal',
				//value: volumeLevel,
				// this is critical in terms of getting the
				// fill color in the slider
				range: 'min',
				min: 0,
				max: self.getDuration(),
				step: 1,
				// as the person slides this thing, update the value
				// in the timeline, so they can see a time representation
				// of where they're dragging to
				slide: function(event, ui) {
					self.updateProgress(ui.value);
				},

				start: function(event, ui) {
					was_playing = self.getPlayerObject().isPlaying();

					if (was_playing) {
						self.pause();
					}
				},
				stop: function(event, ui) {
					// for some reason, even if was_playing is true,
					// mobile ignores it. No time for love.
					if (PHP.get('ismobile') || was_playing) {
						self.play(ui.value);
					} else {
						self.seek(ui.value);
					}
				}
			});
		}


	};

	NgAudioPlayer.prototype.initPlayer = function(src) {
		var self = this;

		if (!self._current_playlist) {
			return false;
		}

		var current_item = self._current_playlist.getCurrentItem();

		if (!current_item) {
			return false;
		}

		try {
			// currently only have mp3 as sources, and only one of them
			src = current_item.getSources().mp3[0].src;
		}
		catch (e) {
			return false;
		}

		if (self._player_object) {
			self._player_object.unload();
		}

		var o, n;
		if (false || null === self._images && false === self._condensed) {
			o = self.initWaveSurfer(src);
			n = 'WaveSurfer';
		} else {
			if (PHP.get('ismobile') && self._condensed) {
				o = self.initNativePlayer(src);
				n = 'NativeAudio';
			} else {
				// we can take advantage of advanced features in howler,
				// like seekable time ranges
				o = self.initHowler(src);
				n = 'Howler';
			}
		}

		self._player_object = new Player(o, n);

		// clicking visually on the waveform allows us to seek to that
		// part in the given track
		/*$(self._options.container).on('click', function(e) {
			var offset = (e.offsetX / $(this).width()) * self.getDuration();
			self.seek(offset);

			return false;
		});*/

		$(window).on('unload', function() {
			self.saveProgress();
		});

		self.html = $(self._options.container);

	};

	NgAudioPlayer.prototype.initNativePlayer = function(src) {
		var self = this;
		var $element = $('audio', self.$element);

		var $source = $('<source/>');
		$source.attr('src', src);
		$source.attr('type', 'audio/mpeg');

		$element.html('');
		$element.append($source);

		var p = new _NativeAudio($element);

		self.initControls();

		p.on('end', self.onEnd);
		p.on('play', self.trackProgress.bind(self));
		p.on('load', function() {
			self.initControls();
			self.initContainer();
		});

		var step = function() {
			self.trackProgress();
			if (self.isPlaying()) {
				self.trackProgress();
				setTimeout(step, 100);
			}
		};

		return p;
	};

	NgAudioPlayer.prototype.initHowler = function(src) {
		var self = this;
		var options = self._howler_options;

		var positions = function() {
			self.trackProgress();
		};

		self.initControls();

		// remove everything first ?
		var howler = new Howl({
			html5: true,
			src: src
		});


		howler.on('play', function() {
			step();
		});

		howler.on('end', self.onEnd);

		howler.on('load', function() {
			self.initControls();
			self.initContainer();
		});

		howler.on('seek', positions);
		howler.on('stop', positions);

		var step = function() {
			if (self.isPlaying()) {
				positions();
				window.setTimeout(step, 100);
			}
		};

		return howler;
	};


	/**
	 * Sets up the wavesurfer object, based on the params we've been given.
	 */
	NgAudioPlayer.prototype.initWaveSurfer = function(src) {
		var self = this;
		var options = self._options;

		var container = $(self._options.container);

		var wavesurfer = WaveSurfer.create(options);

		var that = this;

		wavesurfer.on('finish', self.onEnd);

		// call the global initialization of controls
		wavesurfer.on('ready', self.initControls.bind(self));
		wavesurfer.on('loading', self.initPlaybackInfo.bind(self));

		if (self.$progress && self.$progress.exists()) {
			var last_seconds = 0, current_seconds = 0;

			// don't update constantly, only do so on change
			wavesurfer.on('audioprocess', function() {
				current_seconds = Math.round(wavesurfer.getCurrentTime());

				if (current_seconds !== last_seconds) {
					last_seconds = current_seconds;
					self.updateProgress();
				}
			});
		}

		wavesurfer.load(src);

		return wavesurfer;

	};


	NgAudioPlayer.prototype.initialize = function(init_controls, src) {
		var self = this;
		var v = document.createElement('audio');

		self._initialized = true;

		if (!(v.canPlayType && v.canPlayType('audio/mpeg').replace(/no/, ''))) {
			if (self.$loading) {
				self.$loading.remove();
			}
			self._can_play = false;

			// fixme, change this
			$('#cant-play-mp3').show();
		} else {
			self.initPlayer(src);

			if (init_controls) {
				self.initControls();
			}
		}

		return this;
	};

	/**
	 * Get an instance of the player.
	 */
	NgAudioPlayer.get = function(params) {
		var player = new NgAudioPlayer(params);

		return player.initialize();
	};

	/**
	 * Get any player control id strings with a prefix.
	 * returns an associatve array of name => named_id,
	 * with the prefix before the id.
	 */
	NgAudioPlayer.getControlIdsFromPrefix = function(prefix) {
		var names = [
			'loop',
			'next',
			'pause',
			'play',
			'previous',
			'fastForward',
			'repeat',
			'rewind',
			'shuffle',
			'soundOff',
			'soundOn',
			'stop',
			'volume',
			'volumeToggle'
		];

		var ids = {};
		for (var i = 0, len = names.length; i < len; ++i) {
			ids[names[i]] = '#' + prefix + names[i];
		}

		return ids;
	};

	/*NgAudioPlayer.getPlayerIdsFromPrefix = function(prefix) {
		var names = [
			'container',
			'loading',
			'progress',
			'duration',
		];
	};*/

	NgAudioPlayer.fromListenPage = function(params, height) {
		var _params = {
			controls: NgAudioPlayer.getControlIdsFromPrefix('audio-listen-'),
			params: params,
			player_params: {
				'container': '#waveform',
				'loading': '#loading-audio',
				'progress': '#audio-listen-progress',
				'duration': '#audio-listen-duration',
				// don't use the slider here, clicking waveform
				// pushes progress on
				'use_progress_scrubber': false
			},

			// these are mainly for wavesurfer
			options: {
				container: '#waveform',
				waveColor: '#fc0',
				progressColor: '#fff',
				cursorColor: '#fe2',
				height: height
			}

		};

		var player = new NgAudioPlayer('audio-listen-wrapper', _params);
		var playlist = new AudioPlaylist('audio-listen-wrapper');
		player.addPlaylist(playlist);
		playlist.setPlayer(player);

		var item_params = $.extend({}, params, { container: _params.options.container });
		var item = new AudioItem(item_params);
		item.addSource(params.url, 'audio', 'mp3');

		playlist.setCurrentItem(item);
		item.setPlaylist(playlist).setPlayer(player);

		return player.initialize();
	};

	NgAudioPlayer.getCondensed = function(params) {
		var _params = {
			controls: NgAudioPlayer.getControlIdsFromPrefix('condensed-'),
			params: params,
			player_params: {
				condensed: true,
				container: '#condensed-progress-container',
				play: $('#condensed-play'),
				use_progress_scrubber: true,
				volume_settable: false
			},
			options: {
				container: '#condensed-progress-container'
			}
		};

		var player = new NgAudioPlayer('condensed', _params);
		var playlist = new AudioPlaylist('condensed');
		player.addPlaylist(playlist);

		var item = new AudioItem(params);
		item.addSource(params.url, 'audio', 'mp3');

		playlist.setCurrentItem(item);
		item.setPlaylist(playlist).setPlayer(player);

		player.initialize(true);

		// this player doesn't have volume controls,
		// so we set the volume to full (but don't store the
		// result, so whatever the user's preference was in other
		// player instances doesn't get overridden)
		player.setVolume(100, false);

		return player;

	};


	NgAudioPlayer.global = null;

	NgAudioPlayer.registerGlobalPlayer = function(id) {
		var _params = {
			controls: NgAudioPlayer.getControlIdsFromPrefix('global-audio-player-'),
			player_params: {
				condensed: true,
				author_display: '#_ngHiddenAudioPlayerDetails',
				standalone: false
			}
		};

		var player = new NgAudioPlayer(id, _params);

		var items = $('[data-audio-playback]');
		var playlist = new AudioPlaylist('global-audio');

		player.setPlaylist(playlist);

		items.each(function() {
			if ($(this).attr('data-registered')) {
				return this;
			}

			var item = new AudioItem($(this));
			player.addItem(item);

			return this;
		});

		// load initial file
		player.initialize(true);

		NgAudioPlayer.global = player;
	};

})(jQuery);
