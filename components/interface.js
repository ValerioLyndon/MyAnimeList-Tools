/* Some re-usable functions use in UI building blocks */

function addAttrs( $ele, attrs = {} ){
	for( let [name, value] of Object.entries(attrs) ){
		$ele.attr(name, value);
	}
	return $ele;
}

/* Core class for handling popup windows and overlays, extended by Primary and Subsidiary variants
no requirements */
class UserInterface {
	isAlive = true;
	isOpen = false;
	#attachmentPoint = document.createElement('div');
	#shadowRoot = this.#attachmentPoint.attachShadow({mode: 'open'});
	root = document.createElement('div');
	$container = $('<div class="c-container">');
	$backing = $('<div class="c-container__target is-interactable">');
	$windowList = $('<div class="c-window-list js-focus">');
	$window = $('<main class="l-column c-window js-intro">');

	constructor( ){
		this.#shadowRoot.append(this.root);
		this.root.className = 'root is-closed';
		$(this.root).append(this.$container);
		this.$container.append(this.$backing, this.$windowList);
		this.$backing.on('click', ()=>{
			this.exit();
		});
		this.$windowList.append(this.$window);

		this.style(`
/*<<<css>>>*/
		`);
		this.setTheme();

		document.body.append(this.#attachmentPoint);
	}

	open( ){
		if( this.isAlive ){
			this.root.classList.remove('is-closed');
			this.isOpen = true;
		}
	}

	close( ){
		this.root.classList.add('is-closed');
		this.isOpen = false;
	}

	exit( ){
		if( this.isAlive ){
			this.isAlive = false;
			this.close();
			setTimeout(()=>{
				this.#attachmentPoint.remove();
			}, 200);
		}
	}

	style( css ){
		let html = document.createElement('style');
		html.className = 'css';
		html.textContent = css;
		this.#shadowRoot.append(html);
		return html;
	}

	getThemePreference( ){
		let preference = store.get('theme');
		return preference !== undefined ?
			preference :
			window.matchMedia('(prefers-color-scheme: light)').matches ?
				'light' :
				'dark';
	}

	setTheme( theme ){
		if( !['light', 'dark'].includes(theme) ){
			theme = this.getThemePreference();
		}
		this.root.classList.remove('light', 'dark');
		this.root.classList.add(theme);
		store.set('theme', theme);
	}

	swapTheme( ){
		let theme = this.getThemePreference() === 'light' ? 'dark' : 'light';
		this.setTheme(theme);
	}

	unfocus( ){
		this.$windowList.addClass('is-unfocused');
	}

	refocus( ){
		this.$windowList.removeClass('is-unfocused');
	}

	newWindow( ...children ){
		let $window = $(`<aside class="l-column c-window js-intro">`);
		$window.append(...children);
		this.$windowList.append($window);
		return $window;
	}
}

class PrimaryUI extends UserInterface {
	constructor( ){
		super();
		this.$container.addClass('c-container--blurred');
	}

	open( ){
		super.open();
		document.body.style.overflow = 'hidden';
	}

	close( ){
		document.body.style.overflow = '';
		super.close();
	}

	exit( ){
		if( UIState.isWorking ){
			this.close();
			$(this.root).append(Status.$fixed);
		}
		else {
			super.exit();
		}
	}
}

class SubsidiaryUI extends UserInterface {
	constructor( parentUI, title, subtitle = false, autoLayout = true ){
		super();
		this.parentUI = parentUI;

		this.nav = new SplitRow();
		this.nav.$left.append(
			new Header(title, subtitle).$main
		);
		this.$window.append(this.nav.$main);
		if( autoLayout ){
			this.nav.$right.append(
				$(`<input class="c-button" type="button" value="Back">`).on('click', ()=>{
					this.exit();
				})
			);
			this.$window.append(new Hr());
		}
		this.$container.addClass('is-subsidiary');
	}

	open( ){
		super.open();
		this.parentUI.open();
		this.parentUI.unfocus();
	}

	close( ){
		super.close();
		this.parentUI.refocus();
	}

	exit( ){
		super.exit();
		this.parentUI.refocus();
	}
}

/* Common user interface constructors */

class SplitRow {
	constructor( leftCls = 'l-expand l-row', rightCls = 'l-fit l-row' ){
		this.$main = $('<div class="l-split">');
		this.$left = $(`<div class="${leftCls}">`);
		this.$right = $(`<div class="${rightCls}">`);
		this.$main.append(this.$left,this.$right);
	}
}

class GroupRow extends SplitRow {
	constructor( name, settingsFunc, additionalActions = [] ){
		super();

		this.$left.addClass('o-align-center');
		this.$left.append(
			name
		);
		let $button = new Button('Settings')
		.on('click', ()=>{
			settingsFunc();
		});
		this.$right.append(
			...additionalActions,
			$button
		);
		this.$main.addClass('c-component');
		UIState.disableWhileRunning.push(...additionalActions, $button);
	}
}

class OptionalGroupRow extends GroupRow {
	constructor( name, settingArray, settingsFunc, additionalActions = [] ){
		super('', settingsFunc, additionalActions);
		this.enabled = false;

		this.check = new Check(settingArray, name);
		this.check.$raw.addClass('o-block-gap');
		this.check.$box.on('input', ()=>{ this.checkStatus(); });
		this.checkStatus();

		this.$left.append(
			this.check.$raw
		);
		UIState.disableWhileRunning.push(this.check.$box);
	}

	checkStatus( ){
		if( this.check.$box.is(':checked') ){
			this.$main.removeClass('is-disabled');
		}
		else {
			this.$main.addClass('is-disabled');
		}
	}
}

class Hr {
	static $node = $('<hr class="c-hr">');
	constructor( ){
		return Hr.$node.clone();
	}
}

class Paragraph {
	constructor( text ){
		return $('<p class="c-paragraph">'+text.split('\n\n').join('</p><p class="c-paragraph">')+'</p>');
	}
}

class Drawer {
	constructor( children = [], open = false ){
		this.$main = $('<div class="c-drawer l-column">');
		this.$main.append(...children);
		if( open ){
			this.open();
		}
		else {
			this.close();
		}
	}

	open( ){
		let height = NodeDimensions.height(this.$main);
		this.$main.css('height', height+'px');
		this.$main.removeClass('is-hidden');
	}

	close( ){
		this.$main.addClass('is-hidden');
		this.$main.css('height', '0px');
	}
}

class CheckGrid {
	constructor( checks ){
		this.$main = $('<div class="c-check-grid">');
		for( let chk of checks ){
			this.$main.append(chk.$raw);
		}
	}
}

class CheckGroup {
	constructor( settingArray, title, desc = false, checkArray ){
		this.$main = $('<div class="c-option c-option--fit">');
		this.$raw = $(`<div class="l-column o-text-gap">`);
		
		let checks = [];
		for( let check of checkArray ){
			check.$raw.prepend('∟');
			checks.push(check.$raw);
		}

		let toggle = new Check(settingArray, title, desc);
		toggle.$box.on('click', ()=>{
			if( toggle.$box.is(':checked') ){
				drawer.open();
			}
			else {
				drawer.close();
			}
		});
		let drawer = new Drawer(checks, toggle.$box.is(':checked'));
		drawer.$main.addClass('o-text-gap');
		
		this.$raw.append(toggle.$raw, drawer.$main);
		this.$main.append(this.$raw);
	}
}

class Check {
	constructor( settingArray, title, desc = false ){
		this.$main = $('<div class="c-option c-option--fit">');
		this.$raw = $(`<label class="c-check">${title}</label>`);
		if( desc ){
			this.$raw.attr('title', desc);
		}
		this.$box = $('<input class="c-check__box" type="checkbox">')
			.prop('checked', settings.get(settingArray))
			.on('change', ()=>{
				settings.set(settingArray, this.$box.is(':checked'));
			});

		this.$raw.prepend(this.$box);
		this.$main.append(this.$raw);
	}
}

class Radio {
	constructor( settingArray, title = '', options = {} ){
		this.$main = $(`<div class="c-radio">${title}</div>`);
		let $options = $('<div class="c-radio__row">');
		let value = settings.get(settingArray);
		let htmlId = settingArray.join('');

		for( let [newValue, meta] of Object.entries(options) ){
			let $input = $(`<input type="radio" name="${htmlId}" id="${htmlId+newValue}" />`);
			$input.on('input', ()=>{ settings.set(settingArray, newValue); });
			let $station = $(`<label class="c-radio__station" for="${htmlId+newValue}">${meta['name']}</label>`);

			if( value === newValue ){
				$input.prop('checked', true);
				if( 'func' in meta ){
					meta['func']();
				}
			}
			if( 'desc' in meta ){
				$station.attr('title', meta['desc']);
			}
			if( 'func' in meta ){
				$input.on('click', ()=>{ meta['func'](); });
			}

			$options.append($input, $station);
		}
		this.$main.append($options);
	}
}

class Field {
	constructor( settingArray = false, title = '', desc = false, style = 'block' ){
		this.$main = $('<div class="c-option">');
		this.$raw = $(`<label class="c-field">${title}</label>`);
		if( desc ){
			this.$raw.attr('title', desc);
		}

		this.$box = $(`<input class="c-field__box" type="text" spellcheck="no">`);
		if( settingArray ){
			this.$box.on('input', ()=>{
				settings.set(settingArray, this.$box.val());
			});
			this.$box.val(settings.get(settingArray));
		}
		
		if( style === 'inline' ){
			this.$raw.addClass('c-field--inline');
		}
		this.$raw.append(this.$box);
		this.$main.append(this.$raw);
	}
}

class Textarea {
	constructor( settingArray = false, title = '', attributes = {}, lines = 3 ){
		this.$main = $('<div class="c-option">');
		this.$raw = $(`<label class="c-field">${title}</label>`);

		this.$box = $(`<textarea class="c-field__box c-field__box--multiline" spellcheck="no" style="--lines: ${lines}">`);
		if( settingArray ){
			this.$box.on('input', ()=>{
				settings.set(settingArray, this.$box.val());
			});
			this.$box.val(settings.get(settingArray));
		}
		addAttrs(this.$box, attributes);
		
		this.$raw.append(this.$box);
		this.$main.append(this.$raw);
	}
}

class Header {
	constructor( title, subtitle = false ){
		subtitle = subtitle ? `<p class="c-subtitle">${subtitle}</p>` : '';
		this.$main = $(`<hgroup class="l-column o-text-gap">
			<h2 class="c-title">${title}</h2>
			${subtitle}
		</hgroup>`);
	}
}

class Button {
	constructor( value, attributes = {} ){
		let $main = $(`<input class="c-button" type="button" value="${value}">`);
		addAttrs($main, attributes);
		return $main;
	}
}

class Bullets {
	constructor( points ){
		let $main = $(`<ul class="c-list">`);
		for( let p of points ){
			$main.append($(`<li class="c-list__item">${p}</li>`));
		}
		return $main;
	}
}

function buildConfirm( title, subtitle, onYes, onNo = ()=>{} ){
	let ui = new SubsidiaryUI(UI, title, subtitle, false);
	ui.$backing.off('click');
	ui.$backing.removeClass('is-interactable');

	let row = $('<div class="l-row">');
	row.append(
		new Button('Yes')
		.on('click', ()=>{
			ui.exit();
			onYes();
		}),
		new Button('No')
		.on('click', ()=>{
			ui.exit();
			onNo();
		})
	);

	ui.$window.append(row);
	ui.open();
}

class UIState {
	static $actionBtn = new Button('Loading...');
	static $resultsBtn = new Button('Open Results');
	static $exitBtn = new Button('Close', {title:'Closes the program window. If work is currently being done, the program will keep going in the background.'})
	.on('click', ()=>{
		UI.exit();
	});
	static isWorking = false;
	static userStarts = 0;
	/* buttons are added to this list to be later disabled upon process start and enabled upon end */
	static disableWhileRunning = [];

	static {
		this.setLoading();
	}

	static resetActions( ){
		this.$actionBtn.off();
		this.$actionBtn.removeAttr('disabled');
		this.$resultsBtn.off();
		this.$resultsBtn.css('display', 'none');
	}

	static setLoading( ){
		this.resetActions();
		this.$actionBtn.val('Loading...');
		this.$actionBtn.attr('disabled','disabled');
	}

	static setWorking( callback ){
		this.resetActions();
		window.addEventListener('beforeunload', this.warnUserBeforeLeaving);
		for( let $btn of UIState.disableWhileRunning ){
			$btn.attr('disabled','disabled');
		}
		this.$actionBtn.val('Stop');
		this.$actionBtn.one('click', ()=>{
			this.$actionBtn.attr('disabled','disabled');
			Status.update('Stopping imminently...');
			callback();
		});
	}

	static setIdle( ){
		this.resetActions();
		window.removeEventListener('beforeunload', this.warnUserBeforeLeaving);
		Status.update(`Ready to process ${ListItems.data.length} items.`, 'good', 100);
		Status.estimate();
		for( let $btn of UIState.disableWhileRunning ){
			$btn.removeAttr('disabled');
		}
		this.$actionBtn.val(this.userStarts > 0 ? 'Restart' : 'Start');
		this.$actionBtn.on('click', ()=>{
			const start = ()=>{
				this.$actionBtn.off('click');
				worker = new Worker();
				worker.start();
				this.userStarts++;
			};

			let enabled = [];
			if( settings.get(['update_tags']) ){
				enabled.push('tag updater');
			}
			if( settings.get(['update_notes']) ){
				enabled.push('notes updater');
			}
			if( !store.get('checkpoint_start') && enabled.length > 0 ){
				buildConfirm(
					'Final warning.',
					`You have enabled the ${enabled.join(' and the ')}. ${enabled.length > 1 ? 'These' : 'This'} can make destructive edits to ALL your list items. If you are okay with this, click "Yes". If you want to backup your items first, click "No".`,
					()=>{
						start();
						store.set('checkpoint_start', true);
					}
				);
			}
			else {
				start();
			}
		});
	}

	static setDone( callback ){
		this.setIdle();
		this.$resultsBtn.css('display', '');
		this.$resultsBtn.on('click', ()=>{
			callback();
		});
	}

	static setFailed( message ){
		this.$actionBtn.val('Failed');
		Status.update(message, 'bad');
	}

	static warnUserBeforeLeaving( e ){
		e.preventDefault();
		return (e.returnValue = "");
	}
}

class Status {
	static percent = 0;
	static type = 'working';
	static bars = [];

	static {
		this.$main = this.#new();
		this.$fixed = this.#new();
		this.$fixed.addClass('is-fixed is-interactable');
		this.$fixed.on('click', ()=>{
			UI.open();
			this.hideFixed();
		});
	}

	static #new( ){
		let $bar = $('<div class="c-status">');
		let $text = $('<span class="c-status__text">');
		let $time = $('<span class="c-status__time">');
		$bar.append($text, $time);

		this.bars.push({'$main': $bar, '$text': $text, '$time': $time});
		return $bar;
	}

	static update( text, type = this.type, percent = this.percent ){
		this.type = type;
		this.percent = percent;
		for( let bar of this.bars ){
			bar.$text.text(text);
			if( percent < 0 || percent > 100 ){
				bar.$main.addClass('is-unsure');
			}
			else {
				bar.$main.removeClass('is-unsure');
			}
			bar.$main.css({
				'--percent': `${percent}%`,
				'--colour': `var(--stat-${type})`
			});
		}
	}

	static estimate( remaining = 0, msSinceLast = 0 ){
		if( remaining === 0 && msSinceLast === 0 ){
			for( let bar of this.bars ){
				bar.$time.text('');
			}
			return;
		}

		let seconds = remaining * (msSinceLast / 1000);
		let formatted = '?';
		if( seconds <= 60 ){
			formatted = `${round(seconds)}s`;
		}
		else if( seconds > 60 && seconds < 3600 ){
			formatted = `${round(seconds / 60, 1)}m`;
		}
		else if( seconds > 3600 ){
			formatted = `${round(seconds / 60 / 60, 1)}h`;
		}
		for( let bar of this.bars ){
			bar.$time.text(`~ ${formatted} left`);
		}
	}

	static showFixed( ){
		this.$fixed.removeClass('is-aside');
	}

	static hideFixed( ){
		this.$fixed.addClass('is-aside');
	}
}