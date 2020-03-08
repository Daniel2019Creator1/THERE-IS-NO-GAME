/*jshint esversion: 6*/
// TODO - implement smartscale on images and iframes. Fix the NG video embed padding issue

var NgQuill = function($container, options) {
	var _this = this;
	_this.intervals = {};

	var $ = jQuery;
	var max_toolbar_buttons_per_row = 11;


	var ready = false;

	$container = $($container);
	var $embed_form;

	_this.draft = null;

	// if you change any of these defaults, also update QuillJSText.class.php
	if (typeof(options) === typeof(undefined) || !options) {
		options = {};
	}
	if (typeof(options.record) === typeof(undefined)) {
		options.record = false;
	}
	if (typeof(options.placeholder) === typeof(undefined)) {
		options.placeholder = "Enter text here...";
	}
	if (typeof(options.formats) === typeof(undefined)) {
		options.formats = ['bold','italic','underline','link'];
	}
	if (typeof(options.external_gifs) === typeof(undefined)) {
		options.external_gifs = false;
	}
	if (typeof(options.max_lines) === typeof(undefined)) {
		options.max_lines = 0;
	}
	if (typeof(options.max_text) === typeof(undefined)) {
		options.max_text = 8192;
	}
	if (typeof(options.min_text) === typeof(undefined)) {
		options.min_text = 1;
	}
	if (typeof(options.max_images) === typeof(undefined)) {
		options.max_images = 0;
	}
	if (typeof(options.max_embeds) === typeof(undefined)) {
		options.max_embeds = 0;
	}
	if (typeof(options.embed_whitelist) === typeof(undefined)) {
		options.embed_whitelist = [];
		options.max_embeds = 0;
	}
	if (typeof(options.max_image_width) === typeof(undefined)) {
		options.max_image_width = 764;
	}
	if (typeof(options.max_image_size) === typeof(undefined)) {
		options.max_image_size = 100000;
	}
	if (typeof(options.max_gif_size) === typeof(undefined)) {
		options.max_gif_size = 5000000;
	}
	if (typeof(options.strip_whitespace) === typeof(undefined)) {
		options.strip_whitespace = true;
	}
	if (typeof(options.count_urls) === typeof(undefined)) {
		options.count_urls = true;
	} else if (typeof(options.count_urls) !== 'boolean') {
		options.count_urls = parseInt(options.count_urls);
	}
	if (typeof(options.allow_animated_gifs) === typeof(undefined)) {
		options.allow_animated_gifs = false;
	}
	if (typeof(options.tabindex) === typeof(undefined)) {
		options.tabindex = false;
	}
	if (typeof(options.new_quill_event_name) === typeof(undefined)) {
		options.new_quill_event_name = 'new_ngquill';
	}

	_this.new_quill_event_name = options.new_quill_event_name;

	this.source_type = null;
	this.source_id = null;

	var formats_text = [];
	var formats_blocks = [];
	var formats_layout = [];
	var formats_embed = [];

	var modules = {clipboard: {matchVisual: false}};

	// build our button groups
	for(var i=0, len=options.formats.length; i<len; i++) {
		switch (options.formats[i]) {

			case 'bold':
			case 'italic':
			case 'underline':
				formats_text.push(options.formats[i]);
				break;

			case 'align':
				formats_layout.push({'align':[]});
				break;

			case 'header':
				formats_blocks.push({'header':1});
				formats_blocks.push({'header':2});
				break;

			case 'code-block':
			case 'blockquote':
				formats_blocks.push(options.formats[i]);
				break;

			case 'image':
				// add drag and drop module
				modules.dragAndDrop = {
				  draggables: [
					{
					  content_type_pattern: '^image/', // Any file with matching type will result in ...
					  tag: 'img', // ... an 'img' tag ...
					  attr: 'src' // ... with 'src' equal to the file's base64 (or the result of `onDrop` [see below]).
					}
				  ]
				};
				formats_embed.push(options.formats[i]);
				break;

			case 'list':
				formats_layout.push({'list':'bullet'});
				formats_layout.push({'list':'ordered'});
				break;

			case 'link':
			case 'video':
			case 'divider':
				formats_embed.push(options.formats[i]);
				break;
		}
	}

	modules.toolbar = {container: []};
	if (formats_text.length > 0) modules.toolbar.container.push(formats_text);
	if (formats_blocks.length > 0) modules.toolbar.container.push(formats_blocks);
	if (formats_layout.length > 0) modules.toolbar.container.push(formats_layout);
	if (formats_embed.length > 0) modules.toolbar.container.push(formats_embed);

	var total_buttons = formats_text.length + formats_blocks.length + formats_layout.length + formats_embed.length;

	// TODO - pass these in like the embed whitelist!
	var external_gif_domains = [
		'ngfiles.com',
		'newgrounds-d.com',
		'newgrounds-s.com',
		'newgrounds.com',
		'ungrounded.net',
		'newgrounds.io',
		'giphy.com',
		'tenor.com',
		'gfycat.com',
		'imgur.com',
		'reactiongifs.com',
		'gifbin.com',
		'tumblr.com',
		'imgflip.com',
		'crazygif.com',
		'pandagif.com',
		'gifgifgifgifgif.com',
		'cloudfront.net'
	];

	let canvas = document.createElement('canvas');
	let context2d = canvas.getContext('2d');

	let Image = Quill.import('formats/image');
	let Link = Quill.import('formats/link');
	let List = Quill.import('formats/list');
	let Video = Quill.import('formats/video');
	let BlockEmbed = Quill.import('blots/block/embed');

	class VideoEmbed extends Video {
		static create(t) {
			var src,width,height;
			if (typeof(t)=='string') {
				src = t;
				let meta = src.split('#ngq:').pop().split(':');
				width = meta[0];
				height = meta[1];
			} else {
				width = t.width;
				height = t.height;
				src = t.src + '#ngq:' + width + ':' + height;
			}

			let node = super.create(src);
			node.setAttribute('width',width);
			node.setAttribute('height',height);
			node.setAttribute('data-smart-scale',width+","+height);
			return node;
		}
	}
	VideoEmbed.blotName = 'video';
	VideoEmbed.tagName = 'iframe';
	Quill.register(VideoEmbed);

	class Divider extends BlockEmbed {}
	Divider.blotName = 'divider';
	Divider.tagName = 'hr';
	Quill.register(Divider);

	// This replaces the default Image node, letting us handle pasted GIF data a little better
	class ValidImage extends Image {
		static create(t) {
			var i,j,node;

			// If we gere here, the user probably posted a GIF (wich may not even be a real GIF, ala Giphy/Imgur/etc)
			if (t.substring(0,4) !== 'data') {

				let match = false;
				if (options.external_gifs) {

					let url = t.split("/");

					if (url.length > 2 && typeof(url[2]) == 'string') {
						let domain = url[2].toLowerCase();

						for(i in external_gif_domains) {
							if (endsWith(external_gif_domains[i], domain)) {
								match = true;
								break;
							}
						}
					}
				}

				if (!match && options.image_upload_paths) {
					let path;
					if (t.indexOf("//") < 0 && t.charAt(0) == '/') {
						path = location.hostname.toLowerCase() + t;
					} else {
						path = t.split('//')[1];
					}

					for (i in options.image_upload_paths) {
						if (path.substring(0, options.image_upload_paths[i].length) == options.image_upload_paths[i]) {
							match = true;
							break;
						}
					}
				}

				if (!match) {
					node = Link.create(t);
					node.value = t;
					node.innerHTML = t;
					return node;
				}
			}

			node = super.create(t);
			let ftype = t.split(";").shift().split(":").pop();

			// if this is a GIF, inject an attribute we can check in the text-change event
			if (!options.allow_animated_gifs && ftype == 'image/gif') {
				node.setAttribute('data-check-animated','1');
			}

			return node;
		}
	}

	Quill.register(ValidImage);

	var quill = this.quill = new Quill($container[0], {
		placeholder: options.placeholder,
		theme: 'snow',
		formats: options.formats,
		modules: modules
	});

	link_orig_text = '';

	let temp = $('#quill-embed-templates');
	let $quill_templates = $("<div>");
	$quill_templates.html(temp.html());
	temp.html('');

	$link_blackout = new ngutils.blackout();
	$link_blackout.ignore_active_tasks = true;

	$link_form = $('#quill-insert-link', $quill_templates);
	$link_form.removeAttr('id');
	$link_form.remove();

	$link_blackout.setBody($link_form);
	$link_blackout.hide();
	$link_blackout.onHide(()=>{
		on_widget_closed();
	});
	$link_form.show();

	$link_url = $('input[name="url"]:first', $link_form);
	$link_text = $('input[name="text"]:first', $link_form);
	$link_mode = $('input[name="mode"]:first', $link_form);
	$link_text_label = $('h4[for="text"]:first', $link_form);

	$link_form.submit(function(e) {

		e.preventDefault();
		let mode = $link_mode.val();
		let url = $link_url.val().trim();
		if (!url) url = null;

		if (mode === 'embed') {
			quill.format('link', url, 'api');
			return;
		}

		let range = quill.getSelection();
		if (!range) range = _this.last_range;

		if (range.length > 0) {
			quill.deleteText(range.index, range.length);
		}
		range.length = 0;

		let delta = quill.insertText(range.index, $link_text.val(), 'link', url, 'api');

		for(var i in delta.ops) {

			if (delta.ops[i].insert) {
				range.index += delta.ops[i].insert.length;
			}
		}

		quill.setSelection(range.index, 0);
		$link_text.val('');
		$link_url.val('');
		$link_blackout.hide();
		$quill_body.focus();
	});

	function startsWith(needle, haystack) {
		return haystack.indexOf(needle) === 0;
	}

	function endsWith(needle, haystack) {
		let tail = haystack.substr(haystack.length - needle.length);
		return tail == needle;
	}

	$embed_blackout = new ngutils.blackout();
	$embed_blackout.ignore_active_tasks = true;

	$embed_form = $('#quill-embed-code', $quill_templates);
	$embed_form.removeAttr('id');
	$embed_form.remove();

	$embed_blackout.setBody($embed_form);
	$embed_blackout.hide();
	$embed_blackout.onHide(()=>{
		on_widget_closed();
	});
	$embed_form.show();

	$embed_text = $('textarea', $embed_form);

	$embed_form.submit(function(e) {
		e.preventDefault();

		if ($embed_text.val().length < 1) {
			$embed_blackout.hide();
			return;
		}

		let $iframe = $('iframe', $("<div>").html($embed_text.val())).first();

		if ($iframe.length !== 1 || !$iframe[0].tagName || $iframe[0].tagName != 'IFRAME' || !$iframe.attr('src')) {
			alert("Invalid embed code.");
			return;
		}

		let src = $iframe.attr('src');
		let width = $iframe.attr('width');
		let height = $iframe.attr('height');

		// default to 360p
		if (!width || !height) {
			width = 640;
			height = 360;
		}

		let valid = false;
		let slash = src.indexOf("/",10);

		if (slash < 0) {
			alert("You can't embed an entire website.");
			return;
		}

		let host = src.substring(0,slash).toLowerCase();
		let path = src.substring(slash+1);

		if (!path) {
			alert("You can't embed an entire website.");
			return;
		}

		for(var d in options.embed_whitelist) {
			let wl = options.embed_whitelist[d];
			if (!wl.url) continue;

			if (endsWith(wl.url,host)) {

				if (!wl.fragments) {
					valid = true;
					break;
				} else {
					for(var f in wl.fragments) {
						if (startsWith(wl.fragments[f], path)) {
							valid = true;
							break;
						}
					}
				}
			}
		}

		if (!valid) return alert("Sorry, we don't support embeds from "+host+".\n\nPlease contact support@newgrounds.com if you feel you should be able to embed media from this source.");

		insertEmbed("video", {src:src, width:width, height:height});
		$embed_text.val('');
		$embed_blackout.hide();
		return false;
	});

	var toolbar = quill.getModule('toolbar');

	toolbar.addHandler('divider', ()=>{
		insertEmbed("divider","null");
	});

	toolbar.addHandler('video', ()=>{
		on_widget_open();
		$embed_blackout.show();
		setTimeout(function() {
			$embed_text.focus();
		}, 5);
	});

	toolbar.addHandler('link', ()=>{
		on_widget_open();
		$link_blackout.show();
		let range = quill.getSelection();

		if (!range) range = _this.last_range;

		if (range && range.length > 0) {
			if (quill.getText(range.index, range.length).length !== range.length) {
				$link_text_label.hide();
				$link_text.hide();
				$link_text.val('<embed>');
				$link_mode.val('embed');
			} else {
				$link_text_label.show();
				$link_text.show();
				$link_text.val(quill.getText(range.index, range.length));
				$link_mode.val('text');
			}
		}
		link_orig_text = $link_text.val();

		setTimeout(function() {
			$link_url.focus();
		}, 5);
	});

	this.quill = quill;
	quill.ng_wrapper = _this;
	_this.last_range = {index:0,length:0};

	var length_percent, used_percent, length_text;
	var $quill_body = this.$quill_body = $('.ql-editor',$container).first();

	if (options.tabindex !== false) $quill_body.attr('tabindex',options.tabindex);

	var $quill_toolbar = $container.siblings(".ql-toolbar").first();
	$('button', $quill_toolbar).attr('tabindex','-1');
	$('a', $quill_toolbar).attr('tabindex','-1');
	$('input', $quill_toolbar).attr('tabindex','-1');
	$('select', $quill_toolbar).attr('tabindex','-1');
	$('[role="button"]', $quill_toolbar).attr('tabindex','-1');


	var $chars_text = $('#chars-text');
	var $chars_percent = $('#ql-chars-percent');

	if (total_buttons > max_toolbar_buttons_per_row) {
		$quill_toolbar.addClass('ql-wrap-buttons');
	}

	let b_t_o = 0;
	let i_t_o = 0;
	let widget_open = false;

	function on_widget_open() {
		if (i_t_o) clearTimeout(i_t_o);
		widget_open = true;
	}

	function on_widget_closed(do_focus) {
		if (i_t_o) clearTimeout(i_t_o);
		widget_open = false;
		if (do_focus !== false) $quill_body.focus();
	}

	$('button, span.ql-picker',$quill_toolbar).on('touchstart mousedown', (e)=>{
		if (i_t_o) clearTimeout(i_t_o);

		if (
			$(e.currentTarget).hasClass('ql-link') ||
			$(e.currentTarget).hasClass('ql-video')
		) return;

		on_widget_open();
		i_t_o = setTimeout(()=>{
			on_widget_closed(false);
		},500);
	});

	let focused = false;
	let blurred = true;

	$quill_body.blur(function() {
		_this.last_range = quill.getSelection();

		if (!autosave_callback) return;

		if (change_for_autosave) pre_autosave_callback.call(pre_autosave_target);

		if (b_t_o) clearTimeout(b_t_o);
		if (focused) {

			b_t_o = setTimeout(()=>{
				if (!widget_open && !focused) {
					blurred = true;
					if (change_for_autosave) {
						autosave_callback.call(autosave_target);
						change_for_autosave = false;
					}
				}
			},200);
		}
		focused = false;
	});

	$quill_body.focus(function() {
		if (!autosave_callback) return;
		blurred = false;
		focused = true;
	});

	this.disable = function() {
		quill.disable();
		$save_btn.disable();
		$quill_toolbar.css('pointer-events','none');
	};

	this.enable = function() {
		quill.enable();
		$save_btn.enable();
		$quill_toolbar.css('pointer-events','');
	};

	this.onCleared = function() {};
	this.onChange = function() {};

	function getTotalEmbeds() {
		return $('iframe[class~="ql-video"]', $quill_body).length;
	}

	function getTotalImages() {
		return $('img', $quill_body).length;
	}

	var recheck_limited_elements = false;

	function checkLimitedElements() {
		if (!recheck_limited_elements) return;

		var btn;
		if (options.max_embeds) {
			btn = $('.ql-video', $quill_toolbar);
			if (getTotalEmbeds() >= options.max_embeds) {
				btn.addClass('disabled');
			} else {
				btn.removeClass('disabled');
			}
		}
		if (options.max_images) {
			btn = $('.ql-image', $quill_toolbar);
			if (getTotalImages() >= options.max_images) {
				btn.addClass('disabled');
			} else {
				btn.removeClass('disabled');
			}
		}

		recheck_limited_elements = false;
	}

	function updateCharCounts() {

		// base length of non-html text
		length_text = quill.getLength() - 1;
		length_text += $('ul',$quill_body).length * 2;
		length_text += $('ol',$quill_body).length * 2;

		if (options.count_urls) {

			// estimated image src characters
			length_text += $('img',$quill_body).length * (options.count_urls === true ? 50:options.count_urls);

			$('iframe',$quill_body).each(function() {
				length_text += options.count_urls === true ? $(this).attr('src').length : options.count_urls;
			});

			$('a',$quill_body).each(function() {
				length_text += options.count_urls === true ? $(this).attr('href').length : options.count_urls;
			});
		}

		length_percent = length_text / options.max_text;
		used_percent = length_percent * 100;

		$chars_text.html((options.max_text - length_text).toString().replace(/\B(?=(\d{3})+(?!\d))/g, ","));

		if (used_percent > 100) {
			$chars_percent.removeClass('warn').addClass('error');
		} else if (used_percent >= 75) {
			$chars_percent.addClass('warn').removeClass('error');
		} else {
			$chars_percent.removeClass('warn').removeClass('error');
		}

		$chars_percent.css('width', (used_percent < 100 ? used_percent:100) +"%");
	}

	function cancelInput(oldDelta) {
		ready = false;
		quill.setContents(oldDelta);
		setTimeout( function() {
			ready = true;
		}, 100);
		updateCharCounts();
	}

	var lastGoodDelta = null;
	var change_for_autosave = false;

	quill.on('text-change', function(delta, oldDelta, source) {
		if (!ready) return;

		var i;
		var check_images = false;
		var check_videos = false;

		for(i in delta.ops) {
			if (delta.ops[i].insert && delta.ops[i].insert.video) {
				check_videos = true;
				recheck_limited_elements = true;
			} else if (delta.ops[i].insert && delta.ops[i].insert.image) {
				check_images = true;
				recheck_limited_elements = true;
			} else if (delta.ops[i].delete) {
				recheck_limited_elements = true;
			}
		}

		if (options.max_embeds || options.formats.indexOf('video') < 0) {
			if (check_videos) {
				if (getTotalEmbeds() > options.max_embeds) {
					alert("Sorry, you can't embed more than "+options.max_embeds+" "+(options.max_embeds == 1 ? 'video':'videos'));
					return cancelInput(oldDelta);
				}
				$('iframe[data-smart-scale]', $quill_body).each(function() {
					ngutils.media.smartscale($(this));
				});
			}
		}

		if (!options.allow_animated_gifs || options.max_images) {
			for(i in delta.ops) {
				if (delta.ops[i].insert && delta.ops[i].insert.image) {
					check_images = true;
					break;
				}
			}

			if (check_images) {
				if (options.max_images && getTotalImages() > options.max_images) {
					alert("Sorry, you can't post more than "+options.max_images+" "+(options.max_images == 1 ? 'image':'images'));
					return cancelInput(oldDelta);
				}
				if (!options.allow_animated_gifs) {
					let $img = $('img[data-check-animated]:last', $quill_body);
					$img.removeAttr('data-check-animated');
					if ($img.length > 0) {
						_this.disable();

						$img[0].onload = function() {
							_this.enable();

							canvas.width = $img[0].naturalWidth;
							canvas.height = $img[0].naturalHeight;

							context2d.drawImage($img[0], 0, 0, canvas.width, canvas.height);
							$img.attr('src',canvas.toDataURL());
							context2d.clearRect(0, 0, canvas.width, canvas.height);
						};
					}
				}
			}
		}

		if (options.max_lines && quill.getLines().length > options.max_lines) {
			cancelInput(oldDelta);
			if (quill.getLines().length > options.max_lines) {
				let lines = quill.getLines();
				while(lines.length > options.max_lines) {
					let e = lines.pop();
					$(e.domNode).remove();
				}
				$quill_body.blur();
			}
			return;
		}

		_this.tryRecord();

		change_for_autosave = true;
		_this.onChange.call(_this);
	});

	let _recordDelay = 0;

	this.tryRecord = function() {
		if (!options.record || _recordDelay) {
			return;
		}

		_this.doRecord();

		_recordDelay = setTimeout(()=>{
			_recordDelay = 0;
			_this.doRecord();
		},2000);
		return this;
	};

	this.doRecord = function() {
		let now = Math.floor(Date.now() / 1000);

		let snapshot = {
			key: options.record,
			body: $quill_body.html(),
			expire: now + 30
		};
		window.localStorage.setItem('ngquill-snapshot', JSON.stringify(snapshot));
	};

	this.setContents = (html)=>{
		quill.setContents(quill.clipboard.convert(html));
		return this;
	};

	let used_record = false;

	if (options.record) {
		let snapshot = window.localStorage.getItem('ngquill-snapshot');
		try {
			if (snapshot) snapshot = JSON.parse(snapshot);
		}
		catch(e) {
			console.warn('invalid JSON value');
		}

		if (
			snapshot &&
			snapshot.hasOwnProperty('key') && snapshot.hasOwnProperty('body') &&
			snapshot.hasOwnProperty('expire')
		) {
			let now = Math.floor(Date.now() / 1000);
			if (snapshot.key != options.record || snapshot.expire < now) {
				//console.log('removed expired snapshot');
				window.localStorage.removeItem('ngquill-snapshot');
			} else {
				options.body = snapshot.body;
				used_record = true;
			}
		}
	}

	if (options.body) {
		$html = $("<div>").html(options.body); // should catch bad html

		//quill.clipboard.dangerouslyPasteHTML($html.html());
		quill.setContents(quill.clipboard.convert($html.html()));

		recheck_limited_elements = true;
		setTimeout(function() {
			checkLimitedElements();
			if (used_record) {
				change_for_autosave = false;
				_this.onChange.call(_this);
			}
		},300);
	}

	function insertEmbed(format,params) {
		let range = quill.getSelection();
		if (!range) range = _this.last_range;

		let index = range ? range.index : null;

		quill.insertEmbed(index, format, params);
		if (range) {
			quill.setSelection(range.index + 2,0);
		}
	}

	$(document).ready(function() {
		ready = true;

		if (options.body) {
			$('iframe',$quill_body).each(function() {
				let w = $(this).attr('width');
				let h = $(this).attr('height');
				if (w && h) {
					$(this).attr('data-smart-scale',w+','+h);
					ngutils.media.smartscale($(this));
				}
			});
		}
		updateCharCounts();
		checkLimitedElements();

		interval = setInterval(function() {
			updateCharCounts();
			checkLimitedElements();
		}, 500);

		_this.intervals.update = interval;

		ngutils.event.dispatch(_this.new_quill_event_name, _this);
	});

	function uploadImages() {

		return new Promise((success,fail)=> {

			if (uploadImages.busy) fail("Can't call uploadImages() until previous execution is complete.");

			uploadImages.busy = true;
			uploadImages.progress = 0;

			let max_simultanious_uploads = 3;
			let queue = [];
			let processing = 0;
			let last_id = 0;

			_this.disable();

			$('img', $quill_body).each(function() {
				last_id++;
				queue.push($(this));
			});

			if (queue.length > 0) {
				uploading_callback.call(uploading_target, queue.length);
			}

			function unlock() {
				queue=[];
				processing = 0;
				uploadImages.busy = false;
				_this.enable();
			}

			function doFail(message) {
				unlock();
				fail(message);
			}

			function processNextImage() {

				let $img = queue.shift(), img_data=[];

				if ($img.attr('src').substring(0,4) !== 'data') {
					if (!$img.attr('width') || !$img.attr('height')) {

						$img.attr('width', $img[0].naturalWidth);
						$img.attr('height', $img[0].naturalHeight);
					}
					checkQueue();
					return;
				}
				// TODO - maybe make these jpg no matter what?
				var ftype = $img.attr('src').split(";").shift().split(":").pop();
				var ext = ftype.split('/').pop().toLowerCase();
				if (ext == 'jpeg') ext = 'jpg';

				processing++;

				var img_width = $img[0].naturalWidth;
				var img_height = $img[0].naturalHeight;

				var img_size = Math.round(($img.attr('src').length - 22) * (3/4));

				let rescale = false;
				if (ext == 'gif') {
					rescale = (!options.allow_animated_gifs || img_size > options.max_gif_size);
				} else {
					rescale = (img_width > options.max_image_width || img_size > options.max_image_size);
				}

				// rescale images if necessary
				if (rescale) {
					if (img_width > options.max_image_width)  {
						canvas.width = options.max_image_width;
						canvas.height = Math.round($img[0].naturalHeight * (options.max_image_width / img_width));
					} else {
						canvas.width = img_width;
						canvas.height = img_height;
					}
					context2d.drawImage($img[0], 0, 0, canvas.width, canvas.height);

					// if we have a huge png, make it a jpeg
					if (img_size > 100000) ftype = "image/jpeg";

					$img.attr('src',canvas.toDataURL(ftype, 0.9));

					img_width = canvas.width;
					img_height = canvas.height;
					context2d.clearRect(0, 0, canvas.width, canvas.height);
				}

				img_data = $img.attr('src').split(",");
				$img.attr('width',img_width);
				$img.attr('height',img_height);

				let type = img_data[0].substring(img_data[0].indexOf(':')+1, img_data[0].indexOf(';'));
				let base64 = img_data.pop();

				var blob = ngutils.b64toBlob(base64, type);

				var formData = new FormData();
				formData.append("image",blob);
				formData.append("width",img_width);
				formData.append("height",img_height);
				formData.append("ext",ext);

				if (_this.source_id && _this.source_type) {
					formData.append("source_type",_this.source_type);
					formData.append("source_id",_this.source_id);
				}

				$.ajax({
					url: "/image-upload",
					type: "POST",
					data: formData,
					contentType: false,
					cache: false,
					processData:false,
					dataType:"json",
					error: function(err) {
						// trash the node
						$img.remove();
						let msg = err;
						if (msg.responseText) {
							msg = msg.responseText;
						}

						alert("There was an error uploading one of your images:\n\n"+msg);
						doFail(err);
					},
					success: function(data) {
						$img.attr('src',data.img_src);
						processing--;
						checkQueue();
					}
				});

				// now that the intensive stuff is done, we can check the queue again
				setTimeout(checkQueue, 50);
			}

			// trim whitespace and blank multi-line breaks
			function processHTML() {

				if (options.strip_whitespace) {
					var to_trim = [];
					var found_content = false, last_blank = true;

					let $children = $quill_body.children();

					var $last = null;

					$children.each(function() {
						$last = null;

						if ((['HR','UL','OL','IFRAME','IMG']).indexOf($(this).prop('tagName')) >= 0) {
							last_blank = false;
							return;
						}

						var html = $(this).html();
						if ($(this).prop('tagName') !== "PRE") {
							html = html.trim();
							$last = $(this);
						}

						if (!html || html == "<br>") {
							if (last_blank) to_trim.push($(this));
							last_blank = true;
						} else if ($(this).prop('tagName') !== "PRE") {
							$(this).html(html);
							last_blank = false;
						}
					});

					if ($last && $last.html().trim() == "<br>") to_trim.push($last);

					for(var i in to_trim) {
						to_trim[i].remove();
					}


					updateCharCounts();
				}

				if ((length_text === 0 || $quill_body.children().length < 1) && _this.onSavedEmpty.call(this) === false) return;

				if (length_text < options.min_text) {
					alert("You haven't written enough content yet!");
					unlock();
					return;
				}

				success($quill_body.html());
				unlock();
			}

			function checkQueue() {
				if (queue.length > 0 && processing < max_simultanious_uploads) {
					processNextImage();
				} else if (queue.length < 1 && processing < 1) {
					processHTML();
				}
			}

			checkQueue();

		});
	}
	uploadImages.busy = false;
	uploadImages.progress = 0;

	var processed_callback = function() { };
	var processed_target = this;
	var uploading_callback = function() { };
	var uploading_target = this;
	var processing_callback = function() { };
	var processing_target = this;
	var failure_callback = function(error) { console.error(error); };
	var failure_target = this;
	var autosave_callback = null;
	var autosave_target = this;
	var pre_autosave_callback = null;
	var pre_autosave_target = this;

	this.preprocess = function(callback, thisArg) {
		if (typeof(thisArg) !== typeof(undefined)) processing_target = thisArg;
		processing_callback = callback;

		return this;
	};

	this.beforeUploadingImages = function(callback, thisArg) {
		if (typeof(thisArg) !== typeof(undefined)) uploading_target = thisArg;
		uploading_callback = callback;

		return this;
	};

	this.success = function(callback, thisArg) {
		if (typeof(thisArg) !== typeof(undefined)) processed_target = thisArg;
		processed_callback = callback;

		return this;
	};

	this.fail = function(callback, thisArg) {
		if (typeof(thisArg) !== typeof(undefined)) failure_target = thisArg;
		failure_callback = callback;

		return this;
	};

	this.registerDraft = function(draft) {
		// push the editor's body into callback for the draft
		draft.addFieldCallback(function() {
			return {'name': 'body', 'value': $quill_body.html()};
		});

		// register it, in case we need to perform any further
		// actions
		_this.draft = draft;
		let prev = $quill_body.html();

		$quill_body.focus(function() {
			_this.draft.begin();
		}).blur(function() {
			let current = $quill_body.html();

			if (prev !== current) {
				prev = current;
				_this.draft.end().update();
			}
		});

		return this;
	};

	this.autoSave = function(callback, thisArg) {
		if (typeof(thisArg) !== typeof(undefined)) autosave_target = thisArg;
		autosave_callback = callback;

		return this;
	};

	this.preAutoSave = function(callback, thisArg) {
		if (typeof(thisArg) !== typeof(undefined)) pre_autosave_target = thisArg;
		pre_autosave_callback = callback;

		return this;
	};

	this.onSavedEmpty = function() {};
	this.validate = function() { return true; };

	this.process = function() {
		var e;
		updateCharCounts();
		if (processing_callback.call(processing_target) === false) return;

		if (length_text === 0 && _this.onSavedEmpty.call(this) === false) return;

		let validation_error = this.validate();
		if (validation_error === false) {
			return;
		} else if (length_text < options.min_text) {
			e = "You haven't written enough content yet!";
			if (failure_callback.call(failure_target, e) !== false) alert(e);
		} else if (used_percent > 100) {
			e = 'Sorry, you are over the character limit!';
			if (failure_callback.call(failure_target, e) !== false) alert(e);
		} else {
			uploadImages().then((html) => {
				window.localStorage.removeItem('ngquill-snapshot');
				processed_callback.call(processed_target, html);
			}).catch((err) => {
				failure_callback.call(failure_target, err);
			});
		}
	};

	this.clear = function() {
		var resetme = true;
		if ((quill.getLength() - 1) > 0) resetme = confirm("Are you sure you want to reset your text?");

		if (resetme) $quill_body.html('');
		this.onCleared.call(this);
	};

	var $save_btn = $('<button>');

	this.setSaveButton = function($button) {
		$save_btn = $($button);

		_this.save_button = $save_btn;
		$save_btn.click((e) => {
			e.preventDefault();
			_this.process();
		});
	};


	return this;
};
