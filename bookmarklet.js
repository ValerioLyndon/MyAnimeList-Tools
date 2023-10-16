javascript:(()=>{/*
MyAnimeList-Tools

- Original code   2018/Aug/10 by BurntJello http://burntjello.webs.com
- Extra features  2019        by Cateinya
- Fixes           2020/Oct    by Cry5talz 
- Further changes 2021+       by Valerio Lyndon
*/

const ver = '11.0-pre30+f13_b0';
const verMod = '2023/Aug/31';

class CustomStorage {
	constructor( type = 'localStorage' ){
		this.type = type;
		this.prefix = 'burnt_';
	}

	set( key, value ){
		let valType = typeof value;
		if( valType === 'object' ){
			value = JSON.stringify(value);
		}
		else {
			value = value.toString();
		}

		if( this.type === 'userscript' ){
			GM_setValue(key,value);
			GM_setValue(`${key}--type`,valType);
		}
		else {
			key = `${this.prefix}${key}`;
			localStorage.setItem(key,value);
			localStorage.setItem(`${key}--type`,valType);
		}
	}

	get( key, fallback ){
		let value;
		let valType;
		if( this.type === 'userscript' ){
			valType = GM_getValue(`${key}--type`);
			value = GM_getValue(key);
		}
		else {
			key = `${this.prefix}${key}`;
			valType = localStorage.getItem(`${key}--type`);
			value = localStorage.getItem(key);
			if( value === null ){
				value = undefined;
			}
		}
		if( valType === 'object' ){
			value = JSON.parse(value);
		}
		else if( valType === 'boolean' ){
			value = Boolean(value);
		}
		else if( valType === 'number' ){
			value = Number(value);
		}
		return value === undefined ? fallback : value;
	}

	has( key ){
		return this.get(key) !== undefined;
	}

	remove( key ){
		if( this.type === 'userscript' ){
			GM_deleteValue(key);
			GM_deleteValue(`${key}--type`);
		}
		else {
			key = `${this.prefix}${key}`;
			localStorage.removeItem(key);
			localStorage.removeItem(`${key}--type`);
		}
	}
}

var store = new CustomStorage('localStorage');

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
/* Absolute Basics */

*, *::before, *::after {
	scrollbar-color: var(--scroll-thumb) var(--bg2);
	box-sizing: inherit;
}
.root {
	box-sizing: border-box;
	display: contents;
}

.dark {
	color-scheme: dark;
	--outline: #578dad;
	--bg: #090909f7;
	--bg2: #292929;
	--group-bg: #88888832;
	--txt: #eee;
	--btn-bg: #8884;
	--btn-brdr: #3986edab;
	--fld-bg: #18181888;
	--fld-brdr: #424242;
	--stat-working: #3166e0;
	--stat-good: #1b833a;
	--stat-bad: #f24242;
	--scroll-thumb: #555;
}
.light {
	color-scheme: light;
	--outline: #78BBE2;
	--bg: #ffffffc8;
	--bg2: #c0c0c0;
	--group-bg: #88888832;
	--txt: #111;
	--btn-bg: #fffe;
	--btn-brdr: #0060dfaa;
	--fld-bg: #f6f6f688;
	--fld-brdr: #999;
	--stat-working: #4277f2;
	--stat-good: #60ce81;
	--stat-bad: #f24242;
	--scroll-thumb: #555;
}

*:not([type="checkbox"]):focus {
	outline: 2px solid var(--outline);
	outline-offset: -2px;
}
[type="checkbox"]:focus-visible {
	outline: 2px solid var(--outline);
}



/* Layout */

.l-column {
	display: grid;
	grid-auto-flow: row;
	gap: 10px;
	place-content: start stretch;
}

.l-row {
	display: flex;
	gap: 10px;
	place-items: start left;
}

.l-split {
	display: flex;
	width: 100%;
	gap: 10px;
	align-items: stretch;
	justify-content: space-between;
}

.l-expand {
	flex-grow: 1;
}
.l-fit {
	width: fit-content;
	flex: 0 0 auto;
}

.l-scrollable {
	max-height: 50vh;
	overflow-y: auto;
}



/* Components */

.c-hr {
	height: 4px;
	background: var(--bg2);
	border: 0;
	border-radius: 2px;
	margin: 5px 0;
}

.c-title {
	font-size: 14px;
	margin: 0;
}
.c-subtitle {
	margin: 0;
}

.c-paragraph {
	line-height: 1.3;
	margin: 0;
}

.c-container {
	position: fixed;
	inset: 0;
	z-index: 99999;
	display: grid;
	place-items: start center;
	overflow: auto;
	text-align: left;
	opacity: 1;
	transition: opacity .16s ease;
	pointer-events: none;
}
.c-container--blurred {
	background-color: rgba(0,0,0,0.5);
	backdrop-filter: blur(1.5px);
}
.root:not(.is-closed) .c-container {
	animation: fade .2s ease;
}
.root.is-closed .c-container {
	opacity: 0;
}
.root.is-closed *:not(.c-status) {
	pointer-events: none !important;
}

.c-container__target {
	position: absolute;
	inset: 0;
	pointer-events: auto;
}
.root.is-closed .c-container__target {
	display: none;
}

.c-window-list {
	display: flex;
	flex-direction: column;
	align-items: center;
	justify-content: start;
	gap: 15px;
	padding: min(15vh, 200px) 10px 30px;
}
.is-subsidiary .c-window-list {
	padding-top: min(20vh, 230px);
	margin-left: min(75px, calc(100vw - 527px));
}

.c-window {
	width: 500px;
	height: fit-content;
	padding: 10px;
	background-color: var(--bg);
	border-radius: 12px;
	box-shadow: 0 3px 12px rgba(0,0,0,0.7);
	color: var(--txt);
	font: 13px/1.3 Roboto, Arial, Helvetica, "Segoe UI", sans-serif;
	backdrop-filter: blur(5px);
	pointer-events: auto;
}

.c-button {
	padding: 1px 4px;
	background: var(--btn-bg);
	border: 2px solid transparent;
	border-radius: 6px;
	color: var(--txt);
	cursor: pointer;
	justify-self: start;
	transition: border-color 0.08s ease;
}
.c-button:disabled {
	opacity: 0.7;
	cursor: not-allowed;
}
.c-button:hover {
	border-color: var(--btn-brdr);
}

.c-check {
	display: flex;
	align-items: center;
	gap: 5px;
	cursor: pointer;
}
.c-check__box {
	margin: 0;
}

.c-radio,
.c-field {
	display: flex;
	gap: 5px;
	flex-direction: column;
	place-items: start;
	width: 100%;
	white-space: nowrap;
	font-weight: bold;
}
.c-field--inline {
	width: fit-content;
	flex-direction: row;
	place-items: center;
	font-weight: normal;
}
.c-field__box {
	width: 100%;
	padding: 3px;
	background: var(--fld-bg);
	border: 1px solid var(--fld-brdr);
	border-radius: 6px;
	color: var(--txt);
	font: 400 12px/1 monospace;
}
.c-field__box--multiline {
	--lines: 3;
	min-height: 20px;
	height: calc(8px + var(--lines) * 12px);
	max-height: 80vh;
	padding: 6px;
	resize: vertical;
	word-break: break-all;
}

.c-radio input {
	display: none;
}
.c-radio__row {
	display: flex;
}
.c-radio__station {
	padding: 1px 4px;
	background: var(--group-bg);
	border: 2px solid transparent;
	cursor: pointer;
	font-weight: normal;
	transition: all 0.08s ease;
}
.c-radio__station:first-of-type {
	border-radius: 6px 0 0 6px;
}
.c-radio__station:last-of-type {
	border-radius: 0 6px 6px 0;
}
.c-radio__station ~ .c-radio__station {
	margin-left: 2px;
}
.c-radio__station:hover,
:checked + .c-radio__station {
	background: var(--btn-bg);
	border-color: var(--btn-brdr);
}

.c-component {
	padding: 10px;
	background: var(--group-bg);
	border-radius: 9px;
}
.c-component.is-disabled {
	opacity: 0.7;
}

.c-option {
	padding: 5px;
	background: var(--group-bg);
	border-radius: 9px;
}
.c-option--fit {
	width: fit-content;
}

.c-drawer {
	padding-left: 5px;
	overflow: hidden;
	transition: height 0.16s ease;
}

.c-check-grid {
	display: grid;
	grid-template-columns: repeat( auto-fit, minmax(140px, 1fr) );
	gap: 5px;
	width: 100%;
	padding: 10px;
	background: var(--group-bg);
	border-radius: 9px;
}

.c-log {
	padding: 5px;
	background: var(--group-bg);
	border-radius: 9px;
	font: 11px/1.5em monospace;
}
.c-log__type {
	display: inline-block;
	padding: 0 5px;
	background: var(--bg);
	border-radius: 6px;
	filter: invert(1);
}
.c-log__time {
	margin-left: 5px;
	float: right;
}

.c-list {
	padding-left: 20px;
	margin: 0;
}
.c-list__item::marker {
	font-size: 1.2em;
}



/* One-off Components */

.c-footer {
	font-size: 10px;
}

.c-status {
	--percent: 0%;
	--colour: var(--stat-working);
	align-self: stretch;
	display: flex;
	justify-content: space-between;
	align-items: center;
	width: 100%;
	padding: 2px 6px;
	background: var(--bg2);
	border-radius: 6px;
	background-image: linear-gradient(
		to right,
		var(--colour) var(--percent),
		transparent var(--percent)
	);
	white-space: nowrap;
}
.c-status.is-unsure {
	background-image: linear-gradient(
		to right,
		var(--colour) 40%,
		transparent 40%
	);
	animation: unsure-bar 999s linear infinite;
}
.c-status.is-fixed {
	position: fixed;
	left: 20px;
	top: 20px;
	width: 240px;
	transform: translateX(-280px);
}
.is-closed .c-status.is-fixed {
	transform: translateX(0px);
}

/* Actions */

.is-interactable {
	cursor: pointer;
}

.is-loading {
	cursor: progress;
}

/* Overrides */

.o-block-gap {
	gap: 10px;
}
.o-half-gap {
	gap: 5px;
}
.o-text-gap {
	gap: 3px;
}

.o-align-center {
	align-items: center;
}

.o-justify-start {
	justify-items: start;
}

.o-no-resize {
	resize: none;
}

.o-wrap {
	flex-wrap: wrap;
}

.o-bold {
	font-weight: 700;
}



/* JS Functions */

.js-focus, .js-intro {
	transition:
		transform .22s ease,
		opacity .16s ease;
}
.js-focus.is-unfocused {
	transform: translateX(-75px);
	opacity: 0.7;
}
.root:not(.is-closed) .js-intro {
	animation: slide .22s ease;
}
.root.is-closed .js-intro {
	transform: translateX(75px);
}



/* Animations */

@keyframes fade {
	from {
		opacity: 0;
	} to {
		opacity: 1;
	}
}

@keyframes slide {
	from {
		transform: translateX(75px);
	} to {
		transform: translateX(0);
	}
}

@keyframes unsure-bar {
	from {
		background-position: 20px;
	} to {
		background-position: 99999px;
	}
}
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
		return $('<p class="c-paragraph">'+text.split('\n\n').join('</p><p class="c-paragraph">')+'</p>'.replaceAll('\n','<br/>'));
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

/* Standalone Re-usable Functions and Classes */ 

function isDict( unknown ){
	return (unknown instanceof Object && !(unknown instanceof Array)) ? true : false;
}

/* sleep function for use with async await */
function delay( ms ){
	return new Promise(resolve=>{
		setTimeout(resolve, ms);
	});
}

/* Gets height of element whether it is inserted in the DOM yet or not. */
class NodeDimensions {
	static $dummy = $('<div style="position: fixed; left: -9999px; display: none; width: 480px;">');
	static height( node ){
		node = node instanceof $ ? node[0] : node;
		/* return height immediately where possible */
		const container = node.getRootNode() instanceof ShadowRoot ? node.getRootNode().host : node;
		if( document.body.contains(container) ){
			return node.scrollHeight;
		}
		/* move node into DOM so that height can be checked */
		let parent = node.parentElement;
		let previous = node.previousElementSibling;
		let next = node.nextElementSibling;
		UI.$window.append(this.$dummy);
		this.$dummy.css('display', 'block');
		this.$dummy.append(node);
		let height = node.scrollHeight;
		this.$dummy.css('display', 'none');
		/* return node to previous position */
		if( previous ){
			previous.insertAdjacentElement('afterend', node); 
		}
		else if( next ){
			next.insertAdjacentElement('beforebegin', node); 
		}
		else if( parent ){
			parent.append(node);
		}
		return height;
	}
}

/* Handles logging to console and UI to inform users of errors.
Requires use of the prepare() function to enable UI logging. */
class Log {
	static #userInterface = false; /* must be an instace of UserInterface */
	static #awaitingRefresh = true;
	static #$parent = false;
	static #unsentLogs = [];

	/* argument must be an instance of UserInterface
	only builds UI if there are messages to be sent, otherwise waits for future sendToUI() call */
	static prepare( userInterface ){
		this.#userInterface = userInterface;
		while( this.#unsentLogs.length > 0 ){
			let [msg, type] = this.#unsentLogs.shift();
			this.sendToUI(msg, type);
		}
	}

	static #ready( ){
		if( !this.#userInterface || !this.#userInterface.isAlive ){
			return false;
		}
		if( this.#awaitingRefresh ){
			this.#$parent = $('<div class="l-column o-half-gap l-scrollable">');
			this.#userInterface.newWindow(
				new Header('Process Log', 'Information, warnings, and errors are output here when something of note occurs.').$main,
				this.#$parent
			);
			this.#awaitingRefresh = false;
		}
		return true;
	}

	static sendToUI( msg = '', type = 'ERROR' ){
		const date = new Date();
		const time = `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}:${String(date.getSeconds()).padStart(2, '0')}`;
		if( this.#ready() ){
			this.#$parent.prepend($(`<div class="c-log">
				<b class="c-log__type">${type}</b>
				${msg}
				<small class="c-log__time">${time}</small>
			</div>`));
			return;
		}
		this.#unsentLogs.push([msg, type]);
	}

	static error( msg = 'Something happened.', tellUser = true ){
		console.log('[MAL-Tools][ERROR]', msg);
		if( tellUser ){
			this.sendToUI(msg, 'Error');
		}
	}
	
	static warn( msg = 'Something happened.', tellUser = true ){
		console.log('[MAL-Tools][warn]', msg);
		if( tellUser ){
			this.sendToUI(msg, 'Warning');
		}
	}

	static generic( msg = 'Something happened.', tellUser = true ){
		console.log('[MAL-Tools][info]', msg);
		if( tellUser ){
			this.sendToUI(msg, 'Info');
		}
	}
}

/* List class handles all information relating to the list page.
Must have Logger class available first */
class List {
	static type = window.location.pathname.split('/')[1].substring(0,5);
	static isAnime = (this.type === 'anime');
	static isOwner = ($('body').attr('data-owner') === "1");
	static isModern = ($('#list_surround').length === 0);
	static isPreview = new URLSearchParams(window.location.search).has('preview');
	static style = undefined;
	static csrf = $('meta[name="csrf_token"]').attr('content');

	static #cssEle = this.isModern ? $('#custom-css') : $('head style:first-of-type');
	static css( newCss = false ){
		if( typeof newCss === 'string' ){
			this.#cssEle.text(newCss);
		}
		return this.#cssEle.text().trim();
	}

	static cleanCss( ){
		const cssRegex = /\/\*MYANIMELIST-TOOLS START\*\/(.|\n)*?\/\*MYANIMELIST-TOOLS END\*\//g;
		const headerRegex = this.isAnime ?
		   /\/\*LIST-TOOLS HEADERS ANIME START\*\/(.|\n)*?\/\*LIST-TOOLS HEADERS ANIME END\*\//g :
		   /\/\*LIST-TOOLS HEADERS MANGA START\*\/(.|\n)*?\/\*LIST-TOOLS HEADERS MANGA END\*\//g;
		return this.css().replaceAll(cssRegex, '').replaceAll(headerRegex, '').trim();
	}

	static async determineStyle( ){
		if( this.style ){
			return true;
		}
		
		if( this.isModern ){
			this.style = this.#determineModernStyle();
		}
		else {
			this.style = await this.#determineClassicStyle();
		}
	}

	static #determineModernStyle( ){
		/* function is slightly over-engineered to prevent failure,
		hence the node loop and thorough error checking. */

		let stylesheets = document.querySelectorAll('head style[type="text/css"]:not([class]):not([id])');

		let css = false;
		for( let i = 0; i < stylesheets.length; i++ ){
			let text = stylesheets[i].textContent;
			if( text.includes('#advanced-options') && text.includes('/**') ){
				css = text;
				break;
			}
		}
		if( !css ){
			Log.error('Failed to determine modern list style: could not find style element.');
			return false;
		}

		/* check for advanced presets */

		if( css.includes('original theme css') || css.includes('*******************************************************************************') ){
			if( css.includes('TokyoRevengers_credit_01/1_1_Hahaido.') ){
				return 11;
			}
			if( css.includes('TokyoRevengers_credit_01/2_1_Hahaido.') ){
				return 12;
			}
			if( css.includes('TokyoRevengers_credit_01/4_1_Hahaido.') ){
				return 13;
			}
			if( css.includes('TokyoRevengers_credit_01/5_1_Hahaido.') ){
				return 14;
			}
			if( css.includes('TokyoRevengers_credit_02/8_1_Half_Bl00d.') ){
				return 15;
			}
			if( css.includes('TokyoRevengers_credit_02/9_1_Half_Bl00d.') ){
				return 16;
			}
			if( css.includes('TokyoRevengers_credit_02/10_1_Half_Bl00d.') ){
				return 17;
			}
			if( css.includes('TokyoRevengers_credit_01/14_2_Cateinya.') ){
				return 18;
			}
			if( css.includes('TokyoRevengers_credit_01/15_1_Cateinya.') ){
				return 19;
			}
			if( css.includes('Background photo created by evening_tao') ){
				return 20;
			}
			if( css.includes('Mirai Remix') ){
				return 21;
			}
			if( css.includes('Redesign by Shishio-kun') ){
				return 22;
			}
			if( /\.list-unit\s+\.list-status-title\s*{[^}]+background-color:\s*#241616/i.test(css) ){
				return 23;
			}
			if( /\.list-unit\s+\.list-status-title\s*{[^}]+background-color:\s*#4e2f31/i.test(css) ){
				return 24;
			}
			if( css.includes('Designed & developed by Half_Bl00d.') ){
				return 25;
			}
			if( css.includes('BLACKOUT') ){
				return 26;
			}
			if( css.includes('Night Shift Layout by Cateinya') ){
				return 27;
			}
			if( /--statusbar[^;]*#284042/i.test(css) ){
				return 29;
			}
			if( /--statusbar[^;]*#FD8060/i.test(css) ){
				return 30;
			}

			Log.error('Failed to determine modern list style: style is an unrecognised advanced design.');
			return false;
		}

		/* check for simple presets */

		let search = css.match(/\.list-unit\s+\.list-status-title\s*{[^}]+background-color:\s*([^;]+);/i);
		if( !search || search.length < 2 ){
			Log.error('Failed to determine modern list style: could not match regex.');
			return false;
		}
		let colour = search[1];

		switch( colour ){
			case '#4065BA':
				if( css.includes('logo_mal_blue.png') ){
					return 2;
				}
				else {
					return 1;
				}
			case '#244291':
				return 3;
			case '#23B230':
				return 4;
			case '#A32E2E':
				return 5;
			case '#FAD54A':
				return 6;
			case '#0080FF':
				return 7;
			case '#39c65d':
				return 8;
			case '#ff00bf':
				return 9;
			case '#DB1C03':
				return 10;
			case '#F9E0DC':
				return 28;
			default:
				Log.error(`Failed to determine modern list style: style is an unrecognised simple design. Code ${colour}.`);
				return false;
		}
	}

	/* This function is long and complicated because to figure out the style it must 
	scrape the list of advanced classic styles the user has created and subsequently
	scrape the CSS from each of those styles until it finds one that matches the
	currently applied CSS. */
	static async #determineClassicStyle( ){
		let userStylesPage = await request('https://myanimelist.net/editprofile.php?go=stylepref&do=cssadv');
		if( !userStylesPage ){
			Log.error('Could not access your classic list style page.');
			return false;
		}

		/* get style IDs from page HTML
		should produce one-two elements something like this:
		<a href="?go=stylepref&do=cssadv&id=473785">Style ID#473785</a> */
		let styleUrls = [];
		$(userStylesPage).find('#dialog a').each((i, ele)=>{
			let styleId = ele.href.split('&id=')[1];
			styleUrls.push(`https://myanimelist.net/editprofile.php?go=stylepref&do=cssadv&id=${styleId}`);
		});

		if( styleUrls.length < 1 ){
			Log.error('Failed to parse your classic list style page.', false);
			return false;
		}

		for( let url of styleUrls ){
			let userCSSPage = await request(url);
			if( !userCSSPage ){
				Log.error('Could not access your classic CSS.', false);
				return false;
			}

			let styleCss = $(userCSSPage).find('textarea[name="cssText"]').text().trim();

			if( styleCss === this.css() ){
				return url.split('id=')[1];
			}
		}

		Log.error('Could not determine classic list style.', false);
		return false;
	}
}

/* handles the "settings" storage key where user settings are kept.
Settings that shouldn't be shared such as auth, dates, list-specific last run texts, and more, should be stored as separate objects. 
requires the CustomStorage class */
class UserSettings {
	settings = {
		/* application */
		"live_preview": false,

		/* multi-component */
		"select_categories": false,
		"checked_categories": {
			"1": false,
			"2": false,
			"3": false,
			"4": false,
			"6": false
		},
		"delay": "3000",

		/* file hosts */
		"uploader": "myanimelist",
		"automatic_import": true,

		/* css */
		"update_css": false,
		"css_template": "/* [TITLE] *[DEL]/ .data.image a[href^=\"/[TYPE]/[ID]/\"]::before { background-image: url([IMGURL]); }",
		"match_template": "/[TYPE]/[ID]/",
		"check_existing": false,
		"use_last_run": true,

		/* tags */
		"update_tags": false,
		"checked_tags": {
			"english_title": false,
			"french_title": false,
			"spanish_title": false,
			"german_title": false,
			"native_title": false,
			"season": false,
			"year": false,
			"genres": false,
			"themes": false,
			"demographic": false,
			"authors": false,
			"score": false,
			"rank": false,
			"popularity": false,
			"studio": false,
			"producers": false,
			"licensors": false,
			"serialization": false,
			"aired": false,
			"published": false,
			"rating": false,
			"duration": false,
			"total_duration": false
		},
		"clear_tags": false,

		/* notes */
		"update_notes": false,
		"checked_notes": {
			"synopsis": false,
			"english_title": false,
			"french_title": false,
			"spanish_title": false,
			"german_title": false,
			"native_title": false,
			"season": false,
			"year": false,
			"genres": false,
			"themes": false,
			"demographic": false,
			"authors": false,
			"score": false,
			"rank": false,
			"popularity": false,
			"studio": false,
			"producers": false,
			"licensors": false,
			"serialization": false,
			"aired": false,
			"published": false,
			"rating": false,
			"duration": false,
			"total_duration": false
		},
		"clear_notes": false,

		/* headers */
		"update_headers": false,
		"auto_headers": true,
		"header_template": `.[TYPE][data-query*='"status":7']:not([data-query*='order']):not([data-query*='tag"']):not([data-query*='"s"']) .list-item:nth-child([INDEX]) td {
	padding-top: 43px;
}
.[TYPE][data-query*='"status":7']:not([data-query*='order']):not([data-query*='tag"']):not([data-query*='"s"']) .list-item:nth-child([INDEX]) .status {
	position: relative;
}
.[TYPE][data-query*='"status":7']:not([data-query*='order']):not([data-query*='tag"']):not([data-query*='"s"']) .list-item:nth-child([INDEX]) .status::before {
	content: '[NAME]';
}`,
		"header_style": `.data.status::before {
	position: absolute;
	top: 0;
	left: 0;
	width: 1023px;
	height: 38px;
	background: #4065ba;
	border-bottom: 1px solid #ebebeb;
	color: #FFF;
	font: bold 2em/38px 'Helvetica neue', Helvetica, "lucida grande", tahoma, verdana, arial, sans-serif;
	text-transform: uppercase;
}`
	}
	
	constructor( ){
		this.updateOlderFormats();
		/* Read settings from storage and validate */
		if( store.has(`${List.type}_settings`) ){
			try {
				let workspace = store.get(`${List.type}_settings`);
			
				/* Check for missing settings and fill them in. This prevents errors while maintaining user settings, especially in the case of a user updating from an older version. */
				for( let [key, value] of Object.entries(this.settings) ){
					if( !(key in workspace) ){
						workspace[key] = this.settings[key];
					}
					if( isDict(value) ){
						for( let subkey in this.settings[key] ){
							if( !(subkey in workspace[key]) ){
								workspace[key][subkey] = this.settings[key][subkey];
							}
						}
					}
				}
				this.settings = workspace;
			}
			catch( e ){
				Log.error("Encountered an error while parsing your previous settings. Your settings have been reverted to defaults. To quickly recover your template settings, try selecting \"Last Run\" and then \"Autofill\". Other settings will need to be manually set. \n\nIf you've never run this tool before, you should never see this.");
				/* TODO: update this text to match new UI */
			}
		}
	}

	get( originalKeys, dict = this.settings ){
		/* clones array to prevent modifying original var */
		let keys = Object.assign([], originalKeys);
		/* removes and returns first object */
		let key = keys.shift();
		let value = dict[key];
		if( keys.length > 0 && isDict(value) ){
			return this.get(keys, value);
		}
		return value; /* returns undefined if key is not found */
	}

	set( originalKeys, value, dict = this.settings ){
		/* clones array to prevent modifying original var */
		let keys = Object.assign([], originalKeys);
		/* removes and returns first object */
		let key = keys.shift();
		if( keys.length > 0 ){
			dict[key] = isDict(dict[key]) ? dict[key] : {};
			dict[key] = this.set(keys, value, dict[key]);
		}
		else {
			dict[key] = value;
			this.save();
		}
		return dict;
	}

	save( ){
		store.set(`${List.type}_settings`, this.settings);
	}

	clear( ){
		store.remove(`${List.type}_settings`);
		store.remove(`last_${List.type}_run`);
		if( UI ){
			UI.exit();
			initialise();
			UI.open();
		}
		else {
			alert('Please exit and restart the tool to complete the clearing of your settings.');
		}
	}

	updateOlderFormats( ){
		/* Convert v8.0 -> v8.1 */

		if( store.has('settings') ){
			store.set('anime_settings', store.get('settings'));
			store.set('manga_settings', store.get('settings'));
			store.remove('settings');
		}
		if( store.has('last_run') ){
			store.set('last_anime_run', store.get('last_run'));
			store.set('last_manga_run', store.get('last_run'));
			store.remove('last_run');
		}

		/* Convert v9.x -> v10.0 */

		if( localStorage.getItem('burnt-theme') !== null){
			localStorage.removeItem('burnt-theme');
		}

		if( store.has(`${List.type}_settings`) && !store.has(`${List.type}_settings--type`) ){
			store.set(`${List.type}_settings`, JSON.parse(store.get(`${List.type}_settings`)));
		}

		if( store.has(`last_${List.type}_run`) && !store.has(`last_${List.type}_run--type`) ){
			store.set(`last_${List.type}_run`, store.get(`last_${List.type}_run`));
		}
	}
}

/* Updates settings and sends new CSS to MAL */
async function setTemplate(newTemplate, newMatchTemplate, newCss = false) {
	settings.set(['css_template'], newTemplate);
	settings.set(['match_template'], newMatchTemplate);
	
	if( newCss !== false ){
		if( !List.style ){
			alert('Failed to import CSS: Not able to determine style ID.');
			return false;
		}

		let css = List.cleanCss();
		if( newCss.length > 0 ){
			css += '\n\n/*MYANIMELIST-TOOLS START*/\n\n' + newCss + '\n\n/*MYANIMELIST-TOOLS END*/';
		}
		MyAnimeList.append(css);
	}
	alert('Import succeeded.');
	return true;
}

/* Does not send CSS update to MAL as that is part of the regular process of the header updates. */
async function setHeaderTemplate(newTemplate, newStyle) {
	settings.set(['header_template'], newTemplate);
	settings.set(['header_style'], newStyle);
	
	alert('Import succeeded.');
	return true;
}

/* wrapper for common fetch requests to remove some boilerplate */
async function request( url, result = 'html' ){
	const response = await fetch(url);
	if( !response || !response.ok ){
		return false;
	}
	if( result === 'json' ){
		return await response.json();
	}
	const text = await response.text();

	if( result === 'html' ){
		return createDOM(text);
	}
	if( result === 'string' ){
		return text;
	}
	return false;
}

function createDOM( string ){
	return new DOMParser().parseFromString(string, 'text/html');
}

function decodeHtml( html ){
	txt = document.createElement("textarea");
	txt.innerHTML = html;
	return txt.value;
}

function round( value, precision = 0 ){
	let multiplier = Math.pow(10, precision);
	return Math.round(value * multiplier) / multiplier;
}

function sleep( ms ){
	return new Promise(resolve => { setTimeout(resolve, ms); });
}



/* File Upload Integrations */

const proxy = 'https://cors-anywhere-rp3l.onrender.com/';

var MyAnimeList = new class {
	async #updateCss( css ){
		if( css === List.css() ){
			return true;
		}
		if( css.length >= 65535 ){
			Log.warn('Your MAL Custom CSS was not updated as it would be over the max allowed length. You need to switch to a different uploader or reduce the components you are using.');
			return false;
		}

		/* Send new CSS to MAL */
		if( List.isModern ){
			let styleUrl = `https://myanimelist.net/ownlist/style/theme/${List.style}`;

			let stylePage = await request(styleUrl);
			let bg_attach = $(stylePage).find('#style_edit_theme_background_image_attachment').find('[selected]').val() || '';
			let bg_vert = $(stylePage).find('#style_edit_theme_background_image_vertical_position').find('[selected]').val() || '';
			let bg_hori = $(stylePage).find('#style_edit_theme_background_image_horizontal_position').find('[selected]').val() || '';
			let bg_repeat = $(stylePage).find('#style_edit_theme_background_image_repeat').find('[selected]').val() || '';
			
			let formData = new FormData();
			formData.append("style_edit_theme[show_cover_image]", "1");
			formData.append("style_edit_theme[cover_image]", new File([], ""));
			formData.append("style_edit_theme[show_background_image]", "1");
			formData.append("style_edit_theme[background_image]", new File([], ""));
			formData.append("style_edit_theme[background_image_attachment]", bg_attach);
			formData.append("style_edit_theme[background_image_vertical_position]", bg_vert);
			formData.append("style_edit_theme[background_image_horizontal_position]", bg_hori);
			formData.append("style_edit_theme[background_image_repeat]", bg_repeat);
			formData.append("style_edit_theme[css]", css);
			formData.append("style_edit_theme[save]", "");
			formData.append("csrf_token", List.csrf);
			
			let response = await fetch(styleUrl, {
				method: "POST",
				body: formData
			});
			if( !response.ok ) {
				Log.error(`Failed to send modern CSS update request.`);
				return false;
			}
		}
		else {
			let styleUrl = `https://myanimelist.net/editprofile.php?go=stylepref&do=cssadv&id=${List.style}`;
			
			let headerData = new Headers();
			headerData.append('Content-Type', 'application/x-www-form-urlencoded');
			headerData.append('Referer', styleUrl);

			let formData = new URLSearchParams();
			formData.append('cssText', css);
			formData.append('subForm', 'Update CSS');
			formData.append('csrf_token', List.csrf);
			
			let response = await fetch(styleUrl, {
				method: "POST",
				headers: headerData,
				body: formData
			});
			if( !response.ok ){
				Log.error(`Failed to send classic CSS update request.`);
				return false;
			};
		}

		/* Temporarily update the page's CSS to make sure no page reload is required */
		List.css(css);
		return true;
	}

	/* Surrounds any CSS to be inserted with text that will be seeked out later and replaced */
	formatInsert( str ){
		return `/*LIST-TOOLS HEADERS ${List.type.toUpperCase()} START*/\n${str}\n/*LIST-TOOLS HEADERS ${List.type.toUpperCase()} END*/`
	}

	async import( url ){
		return await this.prepend(`@\import "${url}";`);
	}

	async prepend( str ){
		return await this.#updateCss(this.formatInsert(str) + '\n\n' + List.cleanCss());
	}

	async append( str ){
		return await this.#updateCss(List.cleanCss() + '\n\n' + this.formatInsert(str));
	}
}

var Catbox = new class {
	/* API reference at https://catbox.moe/tools.php */
	#url = proxy+'https://catbox.moe/user/api.php';
	#userhash;
	authenticated = false;
	
	constructor( ){
		if( store.has('auth_catbox') ){
			this.#userhash = store.get('auth_catbox');
			this.authenticated = true;
		}
	}

	async #post( reqtype, args ){
		const data = new FormData();
		data.append('reqtype', reqtype);
		data.append('userhash', this.#userhash);
		args.forEach(( [key, value, filename] )=>{
			if( filename ){
				data.append(key, value, filename);
			}
			else {
				data.append(key, value);
			}
		});

		try {
			const response = await fetch(this.#url, { method: 'POST', body: data });
			return await response.text();
		}
		catch( error ){
			Log.error(`Failed to perform "${reqtype}" Catbox operation: ${error}`);
			return false;
		}
	}

	async upload( text ){
		try {
			const result = await this.#post('fileupload', [['fileToUpload', new Blob([text], { 'type': 'text/css' }), 'filename.css']]);
			return result;
		}
		catch {
			return '';
		}
	}

	/* accepts a space-separated list of filenames to delete */
	async del( filenames ){
		filenames = filenames.replaceAll('https://files.catbox.moe/','');
		try {
			const result = await this.#post('deletefiles', [['files', filenames]]);
			return result.includes('success');
		}
		catch {
			return false;
		}
	}

	async authenticate( userhash = this.#userhash ){
		this.#userhash = userhash;
		/* test auth by uploading file */
		const upload = await this.upload('validating auth');
		/* fail out if file did not upload or file was not able to be deleted */
		if( !upload || !upload.endsWith('.css') || !(await this.del(upload)) ){
			this.#userhash = undefined;
			return false;
		}
		store.set('auth_catbox', userhash);
		this.authenticated = true;
	}
}

var Dropbox = new class {
	#codeVerifier;
	#codeChallenge;
	#auth;
	#clientId = 'odribfnp0304xy2';
	authenticated = false;

	constructor( ){
		this.setup();
		if( store.has('auth_dropbox') ){
			this.#auth = store.get('auth_dropbox');
			this.refreshToken()
			.then(result=>{
				this.#auth = result;
				if( !this.#auth ){
					Log.generic('Your Dropbox authorisation has expired or failed. Please repeat the authorisation process.');
				}
			});
		}
	}

	async setup( ){
		/* create verifier */
		const codeVerifier = new Uint8Array(32);
		window.crypto.getRandomValues(codeVerifier);
		this.#codeVerifier = this.base64URLEncode(codeVerifier);

		/* create challenge */
		const encoder = new TextEncoder();
		const data = encoder.encode(this.#codeVerifier);
		const hashBuffer = await crypto.subtle.digest('SHA-256', data);
		this.#codeChallenge = this.base64URLEncode(new Uint8Array(hashBuffer));
	}

	base64URLEncode(buffer) {
		let base64 = btoa(String.fromCharCode.apply(null, buffer));
		return base64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
	}
	
	/* step 1 */
	getCode( ){
		window.open(`https://www.dropbox.com/oauth2/authorize?client_id=${this.#clientId}&response_type=code&code_challenge=${this.#codeChallenge}&code_challenge_method=S256&token_access_type=offline`, '_blank');
	}
	
	/* step 2 */
	async exchangeCode( code ){
		let response = await fetch(proxy+'https://api.dropboxapi.com/oauth2/token', {
			method: 'POST',
			headers: {
				'Content-Type': 'application/x-www-form-urlencoded'
			},
			body: new URLSearchParams({
				'code': code,
				'grant_type': 'authorization_code',
				'code_verifier': this.#codeVerifier,
				'client_id': this.#clientId
			})
		});
		if( !response.ok ){
			alert(`Failed to exchange token: response not ok: ${response.status} ${response.statusText}`);
			return false;
		}
		let json = await response.json();
		if( !json ){
			alert(`Failed to exchange token: json is ${json}`);
			return false;
		}
		
		return this.#parseResponse(json);
	}

	/* confirms dropbox is still authenticated and refreshes token if necessary */
	async refreshToken( ){
		if( !this.#auth || !('refresh_token' in this.#auth) ){
			Log.error('Refresh token was called when initial authorisation has yet to occur.');
			this.authenticated = false;
			return false;
		}

		/* do nothing if token is still good for at least 5 minutes */
		if( (this.#auth['expires_at'] - 5*60*1000) > Date.now() ){
			this.authenticated = true;
			return this.#auth;
		}

		/* get new refresh token */
		let response = await fetch(proxy+'https://api.dropboxapi.com/oauth2/token', {
			method: 'POST',
			headers: {
				'Content-Type': 'application/x-www-form-urlencoded'
			},
			body: new URLSearchParams({
				'refresh_token': this.#auth['refresh_token'],
				'grant_type': 'refresh_token',
				'client_id': this.#clientId
			})
		});
		if( !response.ok ){
			Log.error(`Failed to refresh token: response not ok: ${response.status} ${response.statusText}`);
			this.authenticated = false;
			return false;
		}
		let json = await response.json();
		if( !json ){
			Log.error(`Failed to refresh token: json is ${json}`);
			this.authenticated = false;
			return false;
		}
		
		return this.#parseResponse(json);
	}

	#parseResponse( json ){
		this.#auth = {};
		this.#auth['access_token'] = json['access_token'];
		this.#auth['refresh_token'] = 'refresh_token' in json ? json['refresh_token'] : this.#auth['refresh_token'];
		this.#auth['expires_at'] = Date.now() + (json['expires_in'] * 1000);
		this.authenticated = true;
		store.set('auth_dropbox', this.#auth);
		return true;
	}

	/* upload file and get a share link */
	async upload( txt ){
		if( !this.refreshToken() ){
			return false;
		}

		let apiArg = {
			"autorename": false,
			"mode": "overwrite",
			"mute": false,
			"path": `/css/${List.isModern ? 'modern' : 'classic'}_${List.style}.css`,
			"strict_conflict": false
		};

		let response = await fetch(proxy+'https://content.dropboxapi.com/2/files/upload', {
			method: 'POST',
			headers: {
				'Authorization': `Bearer ${this.#auth['access_token']}`,
				'Content-Type': 'application/octet-stream',
				'Dropbox-API-Arg': JSON.stringify(apiArg)
			},
			body: new Blob([txt])
		});
		if( !response.ok ){
			Log.error(`Failed to upload Dropbox file: response not ok: ${response.status} ${response.statusText}`);
			return false;
		}
		const json = await response.json();
		if( 'error' in json ){
			Log.error(`Failed to upload Dropbox file: response contained an error: ${json['error_summary']}`);
			return false;
		}
		if( !('path_lower' in json) ){
			Log.error('Failed to upload Dropbox file: response did not contain necessary information.');
			return false;
		}

		let url = false;
		let share = this.#getShare(json['path_lower']);
		if( share ){
			return share;
		}
		else {
			return this.#share(json['path_lower']);
		}
	}

	async #getShare( path ){
		let args  = {"path": path};

		let response = await fetch(proxy+'https://api.dropboxapi.com/2/sharing/list_shared_links', {
			method: 'POST',
			headers: {
				'Authorization': `Bearer ${this.#auth['access_token']}`,
				'Content-Type': 'application/json'
			},
			body: JSON.stringify(args)
		});
		if( !response.ok ){
			Log.error(`Failed to get Dropbox link: response not ok: ${response.status} ${response.statusText}`);
			return false;
		}
		let json = await response.json();
		if( 'error' in json ){
			Log.error(`Failed to get Dropbox link: response contained an error: ${json['error_summary']}`);
			return false;
		}
		if( !('links' in json) ){
			Log.error('Failed to get Dropbox link: response did not contain necessary information.');
			return false;
		}

		for( let link of json['links'] ){
			if( link['path_lower'] === path ){
				return link['url'];
			}
		}
		return false;
	}

	async #share( path ){
		let args  = {
			"path": path,
			"settings": {
				"access": "viewer",
				"allow_download": true,
				"audience": "public"
			}
		};

		let response = await fetch(proxy+'https://api.dropboxapi.com/2/sharing/create_shared_link_with_settings', {
			method: 'POST',
			headers: {
				'Authorization': `Bearer ${this.#auth['access_token']}`,
				'Content-Type': 'application/json'
			},
			body: JSON.stringify(args)
		});
		if( !response.ok ){
			Log.error(`Failed to create Dropbox link: response not ok: ${response.status} ${response.statusText}`);
			return false;
		}
		let json = await response.json();
		if( 'error' in json ){
			Log.error(`Failed to create Dropbox link: response contained an error: ${json['error_summary']}`);
			return false;
		}
		if( !('url' in json) ){
			Log.error('Failed to create Dropbox link: response did not contain necessary information.');
			return false;
		}

		return json['url'];
	}
}



/* Main Program */

function find( str, startTxt, endTxt ){
	let startIndex = str.indexOf(startTxt);
	if( startIndex < 0 ){
		return '';
	}
	startIndex += startTxt.length;
	const endIndex = str.indexOf(endTxt, startIndex);
	if( endIndex < 0 ){
		return '';
	}
	return decodeHtml(str.substring(startIndex, endIndex));
}

function encodeForCss( str ){
	return str.replace(/\r\n/g, " ").replace(/\n/g, "\\a ").replace(/\"/g, "\\\"").trim();
}

/* Parse any and all numbers from a string into an int */
function getInt( str ){
	return typeof str === 'string' ? parseInt(str.replaceAll(/\D*/g, '')) : 0;
}


/* Global Vars */

var settings;
var UI;
var worker;



/* Runtime */

async function initialise() {
	if( !UI || !UI.isAlive ){
		UI = new PrimaryUI();
	}
	Log.prepare(UI);
	await List.determineStyle();
	settings = new UserSettings();

	buildMainUI();
	ListItems.load();
}

/* fetches list item data from the load.json endpoint.
requires Status and Worker classes */
class ListItems {
	static data = [];
	static #url = window.location.href.split('?')[0] + '/load.json?status=7&offset=';
	static #offset = 0;
	static #failures = 0;
	static #delay = 0;
	static #working = false;
	static #loaded = false;
	static #callbacks = [];

	/* functions are given to afterLoad to be executed as soon as possible after loading */
	static afterLoad( func ){
		if( this.#loaded ){
			func();
			return true;
		}
		this.#callbacks.push(func);
		if( !this.#working ){
			this.load();
		}
	}

	static load( ){
		if( this.#loaded ){
			this.#done();
			return true;
		}
		this.#working = true;

		let url = this.#url + this.#offset;

		Status.update(`Fetching list data (${this.#offset} of ?)...`, 'working', -1);
		$.getJSON(url, (json)=>{
			this.#failures = 0;
			this.data = this.data.concat(json);

			if( json.length === 300 ){
				this.#offset += 300;
				this.load();
			}
			else {
				this.#done();
			}
		}).fail(()=>{
			this.#failures++;
			this.#delay += 3000;

			if( this.#failures > 3 ){
				UIState.setFailed('Failed to fetch list info.');
				return;
			}

			Status.update(`Data fetch failed, retrying in ${this.#delay}ms...`);
			setTimeout(this.load, this.#delay);
		});
	}

	static #done( ){
		this.#loaded = true;
		this.#working = false;
		console.log('done', this.#offset, this.#callbacks);
		UIState.setIdle();
		while( this.#callbacks.length > 0 ){
			this.#callbacks.pop()();
		}
	}
}
	
class Worker {
	/* header generation vars */
	headerCss = '';
	
	/* CSS generation vars */
	scrapedCss = '';
	$preview = false;

	/* image validation vars */
	imagesTotal = 0;
	imagesDone = 0;
	imageDelay = 50;

	/* info/meta vars */
	skipped = 0;
	skippedDone = 0;
	errors = 0;
	warnings = 0;
	percent = 0;
	timeThen;

	/* main processor vars */
	iteration = -1;
	data = [];
	timeout;
	silent;

	/* setup */

	constructor( silent ){
		this.silent = silent;
		ListItems.load();
	}

	/* utility functions */

	write( line ){
		if( !this.doCss ){
			return;
		}
		this.scrapedCss += line + '\n';
		if( this.$preview ){
			this.$preview.val(this.scrapedCss);
			this.$preview.scrollTop(NodeDimensions.height(this.$preview));
		}
	}
	
	updateImageStatus( ){
		this.imagesDone++;
		let imagesRemaining = this.imagesTotal - this.imagesDone;
		let percent = this.imagesDone / this.imagesTotal * 100 || 0;
		Status.update(`Validating images (${this.imagesDone} of ~${this.imagesTotal})...`, 'working', percent);
		Status.estimate(imagesRemaining, this.imageDelay);
	}

	/* runtime functions */

	async updateHeaders( ){
		if( !List.isModern ){
			Log.generic('Skipped header update as list is modern.', false);
			return;
		}

		Status.update('Updating category headers...', 'working', -1);

		this.headerCss += settings.get(['header_style']);

		/* fetch data and setup counts */

		const names = List.type === 'anime' ? {
			1: 'Watching',
			2: 'Completed',
			3: 'On Hold',
			4: 'Dropped',
			6: 'Plan To Watch'
		} : {
			1: 'Reading',
			2: 'Completed',
			3: 'On Hold',
			4: 'Dropped',
			6: 'Plan To Read'
		};

		let countsPer = {
			1: 0,
			2: 0,
			3: 0,
			4: 0,
			6: 0
		};

		for( const item of ListItems.data ){
			const id = item['status'];
			countsPer[id]++;
			if( id === 6 ){
				break; /* break early once planning is reached to save computation */
			}
		}

		/* create CSS styling and update CSS */

		const template = settings.get(['header_template']);

		let position = 2;
		for( const [id, count] of Object.entries(countsPer) ){
			if( count === 0 ){
				continue;
			}
			this.headerCss += '\n' + template
				.replaceAll('[INDEX]', position)
				.replaceAll('[NAME]', names[id])
				.replaceAll('[TYPE]', List.type);

			position += count;
		}

		store.set('last_auto_headers', Date.now());
	}

	async start( doCss = settings.get(['update_css']), doTags = settings.get(['update_tags']), doNotes = settings.get(['update_notes']), doHeaders = settings.get(['update_headers']) ){
		UIState.isWorking = true;
		this.doCss = doCss;
		this.doTags = doTags;
		this.doNotes = doNotes;
		this.doHeaders = doHeaders;

		settings.save();
		const doScraper = this.doCss || this.doTags || this.doNotes;
		
		/* UI */

		UIState.setLoading();
		
		ListItems.afterLoad(async ()=>{
			/* Headers */

			if( this.doHeaders ){
				await this.updateHeaders();
				if( doScraper ){
					await delay(500);
				}
			}

			/* CSS */

			if( this.doCss && settings.get(['live_preview']) ){
				let previewText = new Textarea(false, 'CSS Output', {'readonly':'readonly'}, 12);
				this.$preview = previewText.$box;
				UI.newWindow(previewText.$raw);
			}
			this.write(`\/*\nGenerated by MyAnimeList-Tools v${ver}\nhttps://github.com/ValerioLyndon/MyAnimeList-Tools\n\nTemplate=${settings.get(['css_template']).replace(/\*\//g, "*[DEL]/")}\nMatchTemplate=${settings.get(['match_template'])}\n*\/\n`);

			/* UI */

			UIState.setWorking(()=>{
				if( this.timeout ){
					clearTimeout(this.timeout);
					this.#finish();
				}
				else {
					this.data = [];
				}
			});

			/* Handle CSS, Tags, Notes */
			
			if( this.doCss || this.doTags || this.doNotes ){
				let categories = [];
				for( let [categoryId, check] of Object.entries(settings.get(['checked_categories'])) ){
					if( check ){
						categories.push(parseInt(categoryId));
					}
				}

				let beforeProcessing = [];

				/* Skip old lines */

				let lastRun = settings.get(['use_last_run']) === true ?
					store.get([`last_${List.type}_run`]) ?
						store.get([`last_${List.type}_run`]) : '' : '';

				let oldLines = lastRun.replace(/\/\*[\s\S]*?Generated by MyAnimeList-Tools[\s\S]*?\*\/\s+/,'').split("\n");
				this.imagesTotal = oldLines.length;
				Status.update(`Checking your input for matches...`, 'working', 0);

				for( let i = 0; i < ListItems.data.length; i++ ){
					let item = ListItems.data[i];
					let id = item[`${List.type}_id`];
					
					/* Skip item if category does not match selected user options */
					if( settings.get(['select_categories']) ){
						let skip = true;
						let rewatchKey = List.isAnime ? 'is_rewatching' : 'is_rereading';
						for( let categoryId of categories ){
							/* if rewatching then set status to watching, since this is how it appears to the user */
							if( item[rewatchKey] === 1 ){
								item['status'] = 1;
							}
							if( item['status'] === categoryId ){
								skip = false;
								break;
							}
						}
						if( skip ){
							this.skipped++;
							continue;
						}
					}

					/* Check old CSS for any existing lines so they can be skipped later. */
					let lineExists;
					let lineText;
					for( let j = 0; j < oldLines.length; j++ ){
						lineText = oldLines[j];
						let match = settings.get(['match_template']).replaceAll(/\[ID\]/g, id).replaceAll(/\[TYPE\]/g, List.type);
						lineExists = lineText.indexOf(match) >= 0;
						if( lineExists ){
							break;
						}
					}

					/* Add to processing list or skip any existing lines.
					If validating old images, that step will also occur here. */
					if( lineExists ){
						if( settings.get(['use_last_run']) && settings.get(['check_existing']) ){
							let imgUrl = lineText.match(/http.*?\.(?:jpe?g|webp)/);
							if( imgUrl.length === 0 ){
								this.data.push(item);
								this.imagesTotal--;
								continue;
							}

							/* Validate image by loading it in the HTML */
							let imageLoad = new Promise((resolve)=>{
								let tempImg = document.createElement('img');
								tempImg.addEventListener('load', ()=>{
									this.write(lineText);
									this.updateImageStatus();
									resolve(true);
								});
								tempImg.addEventListener('error', ()=>{
									this.data.push(item);
									this.updateImageStatus();
									resolve(false);
								});
								tempImg.src = imgUrl;
							});

							/* Add to Promise stack to await resolution */
							beforeProcessing.push(imageLoad);
							/* Add delay to prevent image loading spam */
							await sleep(this.imageDelay);
						}
						else {
							this.write(lineText);
							this.skippedDone++;
						}
					}
					/* If not in existing, add to list for processing */
					else {
						this.imagesTotal--;
						this.data.push(item);
					}
				}

				/* Start processing items */
				Promise.allSettled(beforeProcessing)
				.then(()=>{
					if( this.skipped || this.skippedDone ){
						let texts = [];
						if( this.skipped ){
							texts.push(`${this.skipped} were skipped due to your settings`);
						}
						if( this.skippedDone ){
							texts.push(`${this.skippedDone} were added from your previous run and don't need re-processing`);
						}
						Log.generic(`Out of ${ListItems.data.length} items on your list, ${texts.join(' and ')}.`);
					}
					this.#continue();
				});
			}
			else {
				this.#finish();
			}
		});
	}

	#continue( ){
		this.iteration++;
		
		/* update variables */

		this.percent = this.iteration / this.data.length * 100 || 0;

		if( this.iteration === 0 ){
			this.timeThen = performance.now() - round(settings.get(['delay']) * 1.15);
		}
		let timeSince = performance.now() - this.timeThen;
		this.timeThen = performance.now();
		let idsRemaining = this.data.length - this.iteration;

		/* update UI */

		Status.estimate(idsRemaining, timeSince);
		Status.update(`Processed ${this.iteration} of ${this.data.length}`, 'working', this.percent);
		
		if( this.iteration >= this.data.length ){
			this.#finish();
			return;
		}
		this.timeout = setTimeout(()=>{
			this.timeout = false;
			this.#process();
		}, settings.get(['delay']));
	}

	async #finish( ){
		let resultArgs = {
			'didCss': this.doCss,
			'didTags': this.doTags,
			'didNotes': this.doNotes,
			'didHeaders': this.doHeaders,
			'itemCount': this.data.length,
			'errorCount': this.errors,
			'warningCount': this.warnings
		};

		if( this.scrapedCss.length > 0 ){
			store.set(`last_${List.type}_run`, this.scrapedCss);
		}
		const allCss = this.scrapedCss + '\n\n' + this.headerCss;

		const uploader = settings.get(['uploader']);
		const auto = settings.get(['automatic_import']);

		Status.update('Updating CSS...');
		Status.estimate(1, 120000);
		if( uploader === 'none' ){
			resultArgs['displayCss'] = true;
		}
		else if( uploader === 'dropbox' ){
			let url = await Dropbox.upload(allCss);
			if( url ){
				url = url.replace('www.dropbox','dl.dropboxusercontent').replace('?dl=0','').replace('&dl=0','');
				resultArgs['url'] = url;
				resultArgs['didUpload'] = 'Dropbox';
				if( MyAnimeList.import(url) ){
					resultArgs['didUpdate'] = true;
				}
				else {
					resultArgs['displayUrl'] = true;
				}
			}
			else {
				resultArgs['displayCss'] = true;
			}
		}
		else if( uploader === 'catbox' ){
			let url = await Catbox.upload(allCss);
			console.log(url);
			if( url ){
				/* delete previous upload to avoid cluttering up Catbox */
				const previous = store.get('url_catbox');
				if( previous && previous !== url ){
					if( await Catbox.del(previous) ){
						store.remove('url_catbox');
					}
				}

				store.set('url_catbox', url);
				resultArgs['url'] = url;
				resultArgs['didUpload'] = 'Catbox';
				if( MyAnimeList.import(url) ){
					resultArgs['didUpdate'] = true;
				}
				else {
					resultArgs['displayUrl'] = true;
				}
			}
			else {
				resultArgs['displayCss'] = true;
			}
		}
		else if( uploader === 'myanimelist' ){
			if( MyAnimeList.append(allCss) ){
				resultArgs['didUpdate'] = true;
			}
			else {
				resultArgs['displayCss'] = true;
			}
		}


		UIState.isWorking = false;

		const results = ()=>{
			buildResults( resultArgs, this.doCss, this.doTags, this.doNotes, this.doHeaders, this.data.length, this.errors, this.warnings );
		};
		if( !this.silent ){
			results();
			UIState.setDone(results);
		}
		else {
			UIState.setIdle();
		}
	}

	async #process( ){
		const meta = this.data[this.iteration];
		const id = meta[`${List.type}_id`];
		let strings = {};
		let verbose = {};
		
		try {
			const str = await request(`https://myanimelist.net/${List.type}/${id}`, 'string');
			if( !str ){
				this.errors++;
				Log.error(`${List.type} #${id}: Failed to get entry information.`);
				this.#continue();
				return;
			}
			const $doc = $(createDOM(str));
		
			/* get current tags */
			let tags = [];
			if( this.doTags && !settings.get(['clear_tags']) ){
				tags = meta['tags'].split(',');
				tags.map(tag=>tag.trim());
			}

			function removeTagIfExist( match, mode = 0 )
			/* takes input tag and checks if it is already in the tag list.
			If it is, it removes it. This is so that the new tags added later are not duplicates.
			It is done this way instead of simply removing the new tag so that the new tags can
			maintain their order in relation to each other.
			
			Modes:
			0 = old tag is exact match,
			1 = old tag contains match
			2 = old tag begins with match
			3 = old tag ends with match */
			{
				let tagsLength = tags.length;
				if( tagsLength === 0 ) {
					return;
				}

				for( let i = 0; i < tagsLength; i++ ){
					const tag = tags[i].toUpperCase();
					match = match.toUpperCase();
					if(
						tags[i].length == 0 ||
						mode == 0 && tag == match ||
						mode == 1 && tag.indexOf(match) != -1 ||
						mode == 2 && tag.startsWith(match) ||
						mode == 3 && tag.endsWith(match)
					) {
						tags.splice(i, 1);
						tagsLength--;
						i--;
					}
				}
			}


			/* Titles */

			let fallbackTitle = find(str, 'Synonyms:</span>', '</div>').split(',')[0].trim() || meta[`${List.type}_title`];
			
			strings['title_en'] = meta[`anime_title_eng`] || meta['manga_english'] || fallbackTitle;
			removeTagIfExist(strings['title_en']);

			strings['title_fr'] = find(str, 'French:</span>', '</div>').trim() || fallbackTitle;
			removeTagIfExist(strings['title_fr']);

			strings['title_de'] = find(str, 'German:</span>', '</div>').trim() || fallbackTitle;
			removeTagIfExist(strings['title_de']);

			strings['title_es'] = find(str, 'Spanish:</span>', '</div>').trim() || fallbackTitle;
			removeTagIfExist(strings['title_es']);

			/* despite MAL calling all native titles "Japanese", they can be any language including Korean and more */
			strings['title_raw'] = find(str, 'Japanese:</span>', '</div>').trim() || fallbackTitle;
			removeTagIfExist(strings['title_raw']);
			
			/* Score */

			strings['score'] = meta[`${List.type}_score_val`] || '';
			verbose['score'] = 'Score: '+strings['score'];
			removeTagIfExist('Score: ', 2);

			/* Rating (anime) */
			
			strings['rating'] = meta['anime_mpaa_rating_string'] || '?';
			verbose['rating'] = 'Rating: ' + strings['rating'];
			removeTagIfExist('Rating: ', 2);
			
			/* Dates */
			/* can't use meta[] array as formatting is unclear and it requires list column enabled in settings */

			/* find() should output "Oct 4, 2003 to Oct 2, 2004" or similar, which then gets split into an array */
			strings['season'] = '';
			strings['year'] = '';
			strings['start'] = '';
			strings['end'] = '';
			let dates = find(List.type === 'anime' ? 'Aired:</span>' : 'Published:</span>', '</div>').split(" to ");
			if( dates.length > 0 ){
				const begun = dates[0].trim().split(',');
				if( begun.length === 2 ){
					const month = begun.substring(0, 3).toLowerCase();
					switch( month ){
						case 'jan':
						case 'feb':
						case 'mar':
							strings['season'] = 'Winter';
							break;
						case 'apr':
						case 'may':
						case 'jun':
							strings['season'] = 'Spring';
							break;
						case 'jul':
						case 'aug':
						case 'sep':
							strings['season'] = 'Summer';
							break;
						case 'oct':
						case 'nov':
						case 'dec':
							strings['season'] = 'Fall';
							break;
					}
					removeTagIfExist(strings['season']);
					strings['year'] = begun[1]?.trim();
					removeTagIfExist(strings['year']);
				}

				strings['start'] = dates[0].trim();
				strings['end'] = dates.length === 2 ? dates[1].trim() : '';

				const dateStr = dates[0].trim().replace(',', '') + dates.length === 2 ? ' to ' + dates[1].trim().replace(',', '') : '';
				verbose['aired'] = 'Aired: '+dateStr;
				removeTagIfExist('Aired: ', 2);
				verbose['published'] = 'Published: '+dateStr;
				removeTagIfExist('Published: ', 2);
			}
			verbose['season'] = 'Season: '+strings['season'];
		
			/* Studios (anime) */
			/* can't use meta[] array as it requires list column enabled in settings */

			let studios = [];
			const studiosHtml = find(str, 'Studios:</span>', '</div>').split(',');
			for( const html of studiosHtml ){
				const stud = find(html, '">', '</a>').trim();
				studios.push(stud);
				removeTagIfExist(stud);
			}
			strings['studios'] = studios.join(', ');
			
			/* Authors (manga) */

			let authors = [];
			const authorsHtml = find(str, 'Authors:</span>', '</div>').split(', <a');
			for( const html of authorsHtml ){
				const author = find(html, '">', '</a>').trim();
				authors.push(author);
				removeTagIfExist(author);
			}
			strings['authors'] = studios.join(' & ');

			/* Licensors (anime) */
			/* can't use meta[] array as it requires list column enabled in settings */
			
			let licensors = [];
			const licensorHtml = find(str, 'Licensors:</span>', '</div>').split(', <a');
			for( const html of licensorHtml ){
				const licensor = find(html, '">', '</a>').trim();
				licensors.push(licensor);
				removeTagIfExist(licensor);
			}
			strings['licensors'] = licensors.join(', ');

			/* Producers (anime) */

			let producers = [];
			const prodHtml = find(str, 'Producers:</span>', '</div>').split(',');
			for( const html of prodHtml ){
				const producer = find(html, '">', '</a>').trim();
				producers.push(producer);
				removeTagIfExist(producer);
			}
			strings['producers'] = producers.join(', ');

			/* Serialization (manga) */
			
			let serializations = [];
			const serialHtml = find(str, 'Serialization:</span>', '</div>').split(',');
			for( const html of serialHtml ){
				const serial = find(html, '">', '</a>').trim();
				serializations.push(serial);
				removeTagIfExist(serial);
			}
			strings['serializations'] = serializations.join(', ');

			/* Duration (anime) */

			const durationHtml = find(str, 'Duration:</span>', '</div>');
			verbose['duration'] = strings['duration'] = '?';
			verbose['duration_total'] = strings['duration_total'] = '?';
			if( durationHtml ){
				function minutesToStr( minutes ){
					let final = [];
					const leftover = minutes % 60;
					const hours = (minutes - leftover) / 60;
					if( hours > 0 ){
						final.push(hours + 'h');
					}
					final.push(leftover + 'm');
					return final.join(' ');
				}

				/* string should be either "24 min. per ep." or "1 hr. 46 min." */
				/* thus we split by "hr" text, getting hours if possible */
				const split = durationHtml.split('hr');
				let minutes = getInt(split.pop());
				const hours = getInt(split.pop());

				if( hours > 0 ){
					minutes += hours * 60;
				}

				if( !isNaN(minutes) ){
					let duration = minutesToStr(minutes);
					strings['duration'] = duration;
					verbose['duration'] = 'Duration/Ep: '+duration;

					let episodes = meta['anime_num_episodes'];
					if( episodes ){
						let totalDuration = minutesToStr(minutes * episodes);
						strings['duration_total'] = totalDuration;
						verbose['duration_total'] = 'Duration: '+totalDuration;
					}
				}
			}
			removeTagIfExist('Duration/Ep: ', 2);
			removeTagIfExist('Duration: ', 2);

			/* Genres */

			let genres = [];
			for( const each of meta['genres'] ){
				const genre = each['name'];
				genres.push(genre);
				removeTagIfExist(genre);
			}
			strings['genres'] = '';

			/* Themes */

			let themes = [];
			const $themeSpans = $doc.find('span.dark_text:contains("Theme") ~ [itemprop="genre"]');
			if( $themeSpans.length > 0 ){
				for( let span of $themeSpans ){
					let theme = span.textContent.trim();
					themes.push(theme);
					removeTagIfExist(theme);
				}
			}
			strings['themes'] = themes.join(', ');

			/* Demographics */

			let demographics = [];
			for( let each of meta['demographics'] ){
				let demo = each['name'];
				demographics.push(demo);
				removeTagIfExist(demo);
			}
			strings['demographics'] = demographics.join(', ');

			/* Ranking */

			strings['ranking'] = find(str, 'Ranked:</span>', '<sup>').trim().replace('#', '') || '?';
			verbose['ranking'] = 'Ranked: '+strings['ranking'];
			removeTagIfExist('Ranked: ', 2);
			
			/* Popularity */

			strings['popularity'] = find(str, 'Popularity:</span>', '</div').trim().replace('#', '') || '?';
			verbose['popularity'] = 'Popularity: '+strings['popularity'];
			removeTagIfExist('Popularity: ', 2);
			
			/* Images */

			const image = $doc.find('img[itemprop="image"]')[0];
			const imageUrl = image?.getAttribute('data-src') || image?.src;
			if( !imageUrl ){
				this.warnings++;
				Log.warn(`${List.type} #${id}: no image found`);
			}
			strings['image'] = imageUrl || '';
			strings['image_tiny'] = imageUrl.replace(/(\.[^\.]+)$/,'t$1') || strings['image'];
			strings['image_very_tiny'] = imageUrl.replace(/(\.[^\.]+)$/,'v$1') || strings['image'];
			strings['image_large'] = imageUrl.replace(/(\.[^\.]+)$/,'l$1') || strings['image'];

			/* Synopsis (description) */

			strings['synopsis'] = $doc.find("[itemprop=\"description\"]").text().trim();



			/* Update Notes & Tags */

			if( this.doTags ){
				if(strings['title_en'] && settings.get(['checked_tags','english_title'])) { tags.push(strings['title_en']); }
				if(strings['title_fr'] && settings.get(['checked_tags','french_title'])) { tags.push(strings['title_fr']); }
				if(strings['title_es'] && settings.get(['checked_tags','spanish_title'])) { tags.push(strings['title_es']); }
				if(strings['title_de'] && settings.get(['checked_tags','german_title'])) { tags.push(strings['title_de']); }
				if(strings['title_raw'] && settings.get(['checked_tags','native_title'])) { tags.push(strings['title_raw']); }
				if(strings['season'] && settings.get(['checked_tags','season'])) { tags.push(strings['season']); }
				if(strings['year'] && settings.get(['checked_tags','year'])) { tags.push(strings['year']); }
				if(strings['studios'] && settings.get(['checked_tags','studio'])) { tags.push(strings['studios']); }
				if(strings['producers'] && settings.get(['checked_tags','producers'])) { tags.push(strings['producers']); }
				if(strings['licensors'] && settings.get(['checked_tags','licensors'])) { tags.push(strings['licensors']); }
				if(strings['serializations'] && settings.get(['checked_tags','serialization'])) { tags.push(strings['serializations']); }
				if(strings['genres'] && settings.get(['checked_tags','genres'])) { tags.push(strings['genres']); }
				if(strings['themes'] && settings.get(['checked_tags','themes'])) { tags.push(strings['themes']); }
				if(strings['demographic'] && settings.get(['checked_tags','demographic'])) { tags.push(strings['demographic']); }
				if(strings['authors'] && settings.get(['checked_tags','authbors'])) { tags.push(strings['authors']); }
				if(verbose['aired'] && settings.get(['checked_tags','aired'])) { tags.push(verbose['aired']); }
				if(verbose['published'] && settings.get(['checked_tags','published'])) { tags.push(verbose['published']); }
				if(settings.get(['checked_tags','score'])) { tags.push(verbose['score']); }
				if(settings.get(['checked_tags','rank'])) { tags.push(verbose['ranking']); }
				if(settings.get(['checked_tags','popularity'])) { tags.push(verbose['popularity']); }
				if(settings.get(['checked_tags','rating'])) { tags.push(verbose['rating']); }
				if(settings.get(['checked_tags','duration'])) { tags.push(verbose['duration']); }
				if(settings.get(['checked_tags','total_duration'])) { tags.push(verbose['duration_total']); }
				
				let tagsRequestUrl;
				let animeOrMangaId;
				if( List.isAnime ){
					tagsRequestUrl = 'https://myanimelist.net/includes/ajax.inc.php?t=22&tags=';
					animeOrMangaId = 'aid';
				}
				else {
					tagsRequestUrl = 'https://myanimelist.net/includes/ajax.inc.php?t=30&tags=';
					animeOrMangaId = 'mid';
				}
				tagsRequestUrl += encodeURIComponent(tags.join(", "));

				let headerData = new Headers();
				headerData.append('X-Requested-With', 'XMLHttpRequest');

				let formData = new URLSearchParams();
				formData.append(animeOrMangaId, id);
				formData.append("csrf_token", List.csrf);
			
				await fetch(tagsRequestUrl, {
					method: "POST",
					headers: headerData,
					body: formData
				})
				.then(response => {
					if( !response.ok ){
						throw new Error(`Response not ok.`);
					}
					return true;
				})
				.catch(error => {
					this.errors++;
					Log.error(`${List.type} #${id}: Failed to update tags: ${error}`);
					return false;
				});
			}

			if( this.doNotes ){
				let rawNotes = meta['editable_notes'];
				const startTxt = '[size=1][color=transparent]MYANIMELIST-TOOLS START[/color][/size]';
				const endTxt = '[size=1][color=transparent]MYANIMELIST-TOOLS END[/color][/size]';
				const normalisedNotes = rawNotes.replaceAll(/\[size=1\]\[color=transparent\]MYANIMELIST-TOOLS START\[\/color\]\[\/size\](.|\n)*?\[size=1\]\[color=transparent\]MYANIMELIST-TOOLS END\[\/color\]\[\/size\]/g,'').trimEnd();
				let notes = [];

				if(strings['title_en'] && settings.get(['checked_notes','english_title'])) { notes.push('English Title: '+strings['title_en']); }
				if(strings['title_fr'] && settings.get(['checked_notes','french_title'])) { notes.push('French Title: '+strings['title_fr']); }
				if(strings['title_es'] && settings.get(['checked_notes','spanish_title'])) { notes.push('Spanish Title: '+strings['title_es']); }
				if(strings['title_de'] && settings.get(['checked_notes','german_title'])) { notes.push('German Title: '+strings['title_de']); }
				if(strings['title_raw'] && settings.get(['checked_notes','native_title'])) { notes.push('Native Title: '+strings['title_raw']); }
				if(strings['season'] && settings.get(['checked_notes','season'])) { notes.push('Season: '+strings['season']); }
				if(strings['year'] && settings.get(['checked_notes','year'])) { notes.push('Year: '+strings['year']); }
				if(strings['studios'] && settings.get(['checked_notes','studio'])) { notes.push('Studios: '+strings['studios']); }
				if(strings['producers'] && settings.get(['checked_notes','producers'])) { notes.push('Producers: '+strings['producers']); }
				if(strings['licensors'] && settings.get(['checked_notes','licensors'])) { notes.push('Licensors: '+strings['licensors']); }
				if(strings['serializations'] && settings.get(['checked_notes','serialization'])) { notes.push('Serializations: '+strings['serializations']); }
				if(strings['genres'] && settings.get(['checked_notes','genres'])) { notes.push('Genres: '+strings['genres']); }
				if(strings['themes'] && settings.get(['checked_notes','themes'])) { notes.push('Themes: '+strings['themes']); }
				if(strings['demographic'] && settings.get(['checked_notes','demographic'])) { notes.push('Demographics: '+strings['demographic']); }
				if(strings['authors'] && settings.get(['checked_notes','authbors'])) { notes.push('Authors: '+strings['authors']); }
				if(strings['aired'] && settings.get(['checked_notes','aired'])) { notes.push('Aired: '+strings['aired']); }
				if(strings['published'] && settings.get(['checked_notes','published'])) { notes.push('Published: '+strings['published']); }
				if(strings['score'] && settings.get(['checked_notes','score'])) { notes.push('Score: '+strings['score']); }
				if(strings['ranking'] && settings.get(['checked_notes','rank'])) { notes.push('Ranking: '+strings['ranking']); }
				if(strings['popularity'] && settings.get(['checked_notes','popularity'])) { notes.push('Popularity: '+strings['popularity']); }
				if(strings['rating'] && settings.get(['checked_notes','rating'])) { notes.push('Rating: '+strings['rating']); }
				if(strings['duration'] && settings.get(['checked_notes','duration'])) { notes.push('Duration/Ep: '+strings['duration']); }
				if(strings['duration_total'] && settings.get(['checked_notes','total_duration'])) { notes.push('Duration: '+strings['duration_total']); }
				if(strings['synopsis'] && settings.get(['checked_notes','synopsis'])) { notes.push(strings['synopsis']); }

				let notesString = settings.get(['clear_notes']) ? '' : normalisedNotes;
				if( notes.length > 0 ){
					notesString += '\n\n' + startTxt;
					notesString += notes.join('\n\n');
					notesString += endTxt;
				}

				let notesRequestUrl = '';
				let notesRequestDict = {
					"comments": notesString,
					"status": meta['status'],
					"csrf_token": List.csrf
				};

				if( List.isAnime ){
					notesRequestDict['anime_id'] = id;
					notesRequestUrl = 'https://myanimelist.net/ownlist/anime/edit_convert.json';
				}
				else {
					notesRequestDict['manga_id'] = id;
					notesRequestUrl = 'https://myanimelist.net/ownlist/manga/edit_convert.json';
				}

				let headerData = new Headers();
				headerData.append('X-Requested-With', 'XMLHttpRequest');
			
				await fetch(notesRequestUrl, {
					method: "POST",
					headers: headerData,
					body: JSON.stringify(notesRequestDict)
				})
				.then(response => {
					if( !response.ok ){
						throw new Error(`Response not ok.`);
					}
					return true;
				})
				.catch(error => {
					this.errors++;
					Log.error(`${List.type} #${id}: Failed update notes: ${error}`);
					return false;
				});
			}
			
			/* Generate and write CSS */
			this.write(
				settings.get(['css_template'])
				.replaceAll('[DEL]', '')
				.replaceAll('[ID]', id)
				.replaceAll('[TYPE]', List.type)
				.replaceAll('[IMGURL]', strings['image'])
				.replaceAll('[IMGURLT]', strings['image_tiny'])
				.replaceAll('[IMGURLV]', strings['image_very_tiny'])
				.replaceAll('[IMGURLL]', strings['image_large'])
				.replaceAll('[TITLE]', meta[`${List.type}_title`])
				.replaceAll(/\[TITLEEN\]|\[TITLEENG\]|\[ENGTITLE\]/g, strings['title_en'])
				.replaceAll('[TITLEFR]', strings['title_fr'])
				.replaceAll('[TITLEES]', strings['title_de'])
				.replaceAll('[TITLEDE]', strings['title_es'])
				.replaceAll('[TITLERAW]', strings['title_raw'])
				.replaceAll('[GENRES]', strings['genres'])
				.replaceAll('[THEMES]', strings['themes'])
				.replaceAll('[DEMOGRAPHIC]', strings['demographics'])
				.replaceAll('[STUDIOS]', strings['studios'])
				.replaceAll('[PRODUCERS]', strings['producers'])
				.replaceAll('[LICENSORS]', strings['licensors'])
				.replaceAll('[SERIALIZATION]', strings['serializations'])
				.replaceAll('[AUTHORS]', strings['authors'])
				.replaceAll('[SEASON]', strings['season'])
				.replaceAll('[YEAR]', strings['year'])
				.replaceAll('[RANK]', strings['ranking'])
				.replaceAll(/\[POPULARITY\]|\[POP\]/g, strings['popularity'])
				.replaceAll('[SCORE]', strings['score'])
				.replaceAll('[STARTDATE]', strings['start'])
				.replaceAll('[ENDDATE]', strings['end'])
				.replaceAll('[RATING]', strings['rating'])
				.replaceAll('[DURATIONEP]', strings['duration'])
				.replaceAll('[DURATIONTOTAL]', strings['duration_total'])
				.replaceAll('[DESC]', encodeForCss(strings['synopsis']))
			);
		}
		catch( e ){
			this.errors++;
			Log.error(`${List.type} #${id}: ${e}`);
			Log.error(`Occured at ${e.lineNumber}`, false);
		}
			
		this.#continue();
	}
}

function buildMainUI( ){
	/* Control Row */
	let controls = new SplitRow();
	controls.$left.append(Status.$main);
	controls.$right.append(UIState.$resultsBtn, UIState.$actionBtn, UIState.$exitBtn);

	/* Components Row */
	let $components = $('<div class="l-column">');
	let tags = new OptionalGroupRow('Tags Updater', ['update_tags'], ()=>{ buildTagSettings(); });
	tags.check.$box.on('click', ()=>{
		if( tags.check.$box.is(':checked') && store.get('checkpoint_tags') !== true ){
			alert('Before you continue!! This alert only shows once.\n\nThe Tags Updater is capable of entirely WIPING your tags. If you have the Tags column disabled, it WILL wipe your tags. If you have any tags you don\'t want to lose, please back them up first and enable tags in your list settings!');
			store.set('checkpoint_tags', true);
		}
	});
	let notes = new OptionalGroupRow('Notes Updater', ['update_notes'], ()=>{ buildNoteSettings(); });
	notes.check.$box.on('click', ()=>{
		if( notes.check.$box.is(':checked') && store.get('checkpoint_notes') !== true ){
			alert('Before you continue!! This alert only shows once.\n\nThe Notes Updater is capable of entirely WIPING your notes. If you have any you don\'t want to lose, please back them up first!');
			store.set('checkpoint_notes', true);
		}
	});
	$components.append(
		new Header('Components', 'Enable, disable, and configure what tools run on your list.').$main,
		new GroupRow('Global Defaults', ()=>{ buildGlobalSettings(); }).$main,
		new OptionalGroupRow('CSS Generator', ['update_css'], ()=>{ buildCssSettings(); }, [
			new Button('Import').on('click', ()=>{
				buildCssImport();
			}),
			new Button('Export').on('click', ()=>{
				buildCssExport();
			})
		]).$main,
		tags.$main,
		notes.$main
	);

	if( List.isModern ){
		$components.append(new OptionalGroupRow('Category Headers', ['update_headers'], ()=>{ buildHeaderSettings(); }, [
			new Button('Import').on('click', ()=>{
				buildHeaderImport();
			}),
			new Button('Export').on('click', ()=>{
				buildHeaderExport();
			})
		]).$main);
	}

	/* Footer Row */
	let $switchBtn = new Button('Switch Theme')
	.on('click', ()=>{
		UI.swapTheme();
	});
	let $clearBtn = new Button('Clear Settings', {title:'Clears any stored settings from previous runs.'})
	.on('click', ()=> {
		buildConfirm('Are you sure?', 'You will have to set your templates and other settings again.', ()=>{
			settings.clear();
		})
	});
	let footer = new SplitRow();
	footer.$left.append($(`<footer class="c-footer">MyAnimeList-Tools v${ver}<br />Last modified ${verMod}</footer>`));
	footer.$right.append(
		$switchBtn,
		$clearBtn
	);

	/* Add all rows to UI */
	UI.$window.append(controls.$main, new Hr(), $components, new Hr(), footer.$main);
	
	UIState.disableWhileRunning.push($clearBtn);
}

function buildGlobalSettings( ){
	let popupUI = new SubsidiaryUI(UI, 'Global Settings', 'These settings apply to all components, where applicable.');

	let delay = new Field(['delay'], 'Delay between items:', 'Delay (ms) between requests to avoid spamming the server.', 'inline');
	delay.$box.css('width', '50px');

	/* uploaders */

	let update = new Check(['automatic_import'], 'Add to your CSS automatically.', 'Recommended! After uploading your file, it will be added to your Custom CSS as an @import line.');

	/* MyAnimeList */

	let malPercent = round(List.css().length / 65535 * 100);
	let $malBlurb = malPercent >= 100 ?
		new Paragraph(`Your CSS is over MyAnimeList's max CSS length! As long as output remains over limit, the tool will not update your CSS. To fix this, either:\nA. Switch to one of the other automatic uploaders, or\nB. Use a less detailed CSS Generator preset, or\nC. Manage and import the code yourself to circumvent MAL's limit.`)
		: new Paragraph(`The MyAnimeList uploader sends items directly to your list style's Custom CSS box. This is convenient, but will run out of space quickly if you use the CSS Generator. If you go over the limit the tool will send you an alert and immediately stop updating your CSS.`)
		
	let drawerMal = new Drawer([
		new Hr(),
		new Paragraph(`<b>Current usage:</b> ${malPercent}% (${List.css().length} / 65535 characters)`),
		$malBlurb
	]);

	/* Dropbox */

	let $dropBlurb = new Paragraph('You are not currently authenticated. To link your account, click "Authenticate" below.');
	let $dropBtn = new Button('Authenticate').on('click', ()=>{ buildDropboxAuth(popupUI, dropAuthenticated); });
	function dropAuthenticated( ){
		$dropBlurb.text('✔ You are logged in and ready to go!');
		$dropBtn.val('Modify Auth');
	}
	if( Dropbox.authenticated ){
		dropAuthenticated();
	}

	let drawerDropbox = new Drawer([
		new Hr(),
		$dropBlurb,
		$dropBtn
	]);

	/* Catbox */

	let $catBlurb = new Paragraph('You are not currently authenticated. To link your account, click "Authenticate" below.');
	let $catBtn = new Button('Authenticate').on('click', ()=>{ buildCatboxAuth(popupUI, catAuthenticated); });
	function catAuthenticated( ){
		$catBlurb.text('✔ You are logged in and ready to go!');
		$catBtn.val('Modify Auth');
	}
	if( Catbox.authenticated ){
		catAuthenticated();
	}

	let drawerCatbox = new Drawer([
		new Hr(),
		$catBlurb,
		$catBtn
	]);

	/* the rest */

	const drawers = [drawerMal, drawerDropbox, drawerCatbox];
	function closeDrawers( ){
		drawers.forEach(drawer=>drawer.close());
	}
	let $drawers = $('<div style="width:100%;">');
	$drawers.append(drawerMal.$main, drawerDropbox.$main, drawerCatbox.$main);

	let $options = $('<div class="l-column o-justify-start">');
	$options.append(
		delay.$main,
		new CheckGroup(['select_categories'], 'Update Only Specific Categories', 'Want to only update entries in certain categories instead of everything at once?', [
			new Check(['checked_categories', '1'], List.type == 'anime' ? "Watching" : "Reading"),
			new Check(['checked_categories', '2'], "Completed"),
			new Check(['checked_categories', '3'], "On Hold"),
			new Check(['checked_categories', '4'], "Dropped"),
			new Check(['checked_categories', '6'], "Planned")
		]).$main,
		new Radio(['uploader'], 'Automatically upload and manage your code?', {
			'myanimelist': {
				'name': 'MyAnimeList',
				'desc': 'Will attempt to upload directly to MAL\s Custom CSS box on your list. However, if you go over their limit of 65,535 characters, the tool will cancel and alert you.',
				'func': ()=>{
					closeDrawers();
					drawerMal.open();
				}
			},
			'dropbox': {
				'name': 'Dropbox',
				'desc': 'Upload to Dropbox.com and add a single import line to your MAL Custom CSS. Requires a Dropbox account.',
				'func': ()=>{
					closeDrawers();
					drawerDropbox.$main.append(update.$main);
					drawerDropbox.open();
				}
			},
			'catbox': {
				'name': 'Catbox',
				'desc': 'Upload to Catbox.moe and add a single import line to your MAL Custom CSS. Requires a Catbox account.',
				'func': ()=>{
					closeDrawers();
					drawerCatbox.$main.append(update.$main);
					drawerCatbox.open();
				}
			},
			'none': {
				'name': 'No',
				'desc': 'Manually copy and paste code that the tool generates.',
				'func': ()=>{
					closeDrawers();
				}
			}
		}).$main,
		$drawers
	);

	popupUI.$window.append($options);
	popupUI.open();
}

function buildDropboxAuth( ui = UI, callback = ()=>{} ){
	let popupUI = new SubsidiaryUI(ui, 'Dropbox Authentication');
	let $options = $('<div class="l-column">');

	let code = new Field();
	code.$box.attr('placeholder', 'Paste your Dropbox code here to allow access.');
	let working = false;
	
	$options.append(
		new Paragraph(`To link your Dropbox account, click the button below to grant the app access. Once granted, it will give you a code.`),
		new Button('Get code from Dropbox')
		.on('click', ()=>{ Dropbox.getCode(); }),
		new Paragraph('Enter the provided code into this text box.'),
		code.$raw,
		new Paragraph('With the code entered, press this button to exchange it for a proper token. If successful, you will be sent back to the previous menu.'),
		new Button('Authenticate Token')
		.on('click', async ev=>{
			if( working ){
				return;
			}
			working = true;
			
			let $btn = $(ev.target);
			$btn.attr('disabled', 'disabled');
			$btn.val('Authenticating...');
			$btn.addClass('is-loading');

			let success = await Dropbox.exchangeCode(code.$box.val());
			$btn.removeAttr('disabled');
			$btn.val('Authenticate Token');
			$btn.removeClass('is-loading');
			working = false;
			if( !success ){
				return;
			}

			popupUI.close();
			callback();
		})
	);

	popupUI.$window.append($options);
	popupUI.open();
}

function buildCatboxAuth( ui, callback ){
	let popupUI = new SubsidiaryUI(ui, 'Catbox Authentication');
	let $options = $('<div class="l-column">');

	let working = false;
	
	let field = new Field();
	let auth = store.get('auth_catbox');
	if( auth ){
		field.$box.val(auth);
	}

	$options.append(
		new Paragraph(`To link Catbox, you will need your userhash from the <a href="https://catbox.moe/user/manage.php" target="_blank">account management page</a>.`),
		field.$raw,
		new Paragraph('With the hash entered, press this button to validate that it works. If successful, you will be sent back to the previous menu.'),
		new Button('Authenticate Hash')
		.on('click', async ev=>{
			if( working ){
				return;
			}
			working = true;
			
			let $btn = $(ev.target);
			$btn.attr('disabled', 'disabled');
			$btn.val('Authenticating...');
			$btn.addClass('is-loading');

			let hash = field.$box.val();
			if( hash.length < 1 ){
				alert('Please input your userhash first.');
				return;
			}

			let success = await Catbox.authenticate( hash );

			$btn.removeAttr('disabled');
			$btn.val('Authenticate Token');
			$btn.removeClass('is-loading');
			working = false;
			if( !success ){
				return;
			}

			popupUI.close();
			callback();
		})
	);

	popupUI.$window.append($options);
	popupUI.open();
}

function buildCssSettings( ){
	let popupUI = new SubsidiaryUI(UI, 'CSS Generation Settings', 'Automatically generate CSS for use on your list.');

	let $options = $('<div class="l-column">');

	/* Elements */

	let tmpl = new Field(['css_template'], 'Template', 'CSS template.  Replacements are:\n[TYPE], [ID], [IMGURL], [IMGURLT], [IMGURLV], [IMGURLL], [TITLE], [TITLEEN], [TITLEFR], [TITLEES], [TITLEDE], [TITLERAW], [GENRES], [THEMES], [DEMOGRAPHIC], [RANK], [POPULARITY], [SCORE], [SEASON], [YEAR], [STARTDATE], [ENDDATE], and [DESC].\n\nAnime only:\n[STUDIOS], [PRODUCERS], [LICENSORS], [RATING], [DURATIONEP], [DURATIONTOTAL]\n\nManga only:\n[AUTHORS], [SERIALIZATION]');

	let matchTmpl = new Field(['match_template'], 'Match Template', 'Line matching template for reading previously generated code. Should match the ID format of your template. Only matching on [ID] is not enough, include previous/next characters to ensure the match is unique.');

	let validate = new Check(['check_existing'], 'Validate Existing Images', 'Attempt to load all images from previous runs, updating the url if it fails.');

	let skip = new Check(['use_last_run'], 'Skip Previously Generated Items', 'Use the saved information from previous runs, as seen in the field below, to speed up future runs.');
	skip.$box.on('click',()=>{
		if( skip.$box.is(':checked') ){
			drawer.open();
		}
		else {
			drawer.close();
		}
	});

	$parseBtn = new Button('Parse Template', {'title':'Parse the template information found in the generated code you\'ve inserted.'})
	.on('click',()=>{
		let code = text.$box.val();

		if( code.length < 1 ){
			alert('Please insert code into the text field.');
			return;
		}
		if( code.indexOf('*/') === -1 ){
			alert('Code is missing template information. It is either incorrectly formatted or not generated by this tool.');
			return;
		}

		let newTemplate = false;
		let newMatchTemplate = false;

		/* Reduce code to first comment block, which should be the tool-generated comment */
		code = code.split('*/')[0];
		const codeByLine = code.split('\n');

		for( let i = 0; i < codeByLine.length; i++ ){
			let line = codeByLine[i];
			if( line.startsWith('Template=') ){
				newTemplate = line.substring(9);
			}
			else if( line.startsWith('MatchTemplate=') ){
				newMatchTemplate = line.substring(14);
			}
		}

		if( !newTemplate || !newMatchTemplate ){
			alert('Code is missing template information. It is either incorrectly formatted or not generated by this tool.');
			return false;
		}
		setTemplate(newTemplate, newMatchTemplate)
		.then((success)=>{
			if( success ){
				tmpl.$box.val(newTemplate);
				matchTmpl.$box.val(newMatchTemplate);
			}
		});
	});

	let key = `last_${List.type}_run`;
	let previous = store.get(key);
	let text = new Textarea(false, '', {}, 20);
	if( previous ){
		text.$box.text(previous);
	}
	text.$box.on('input', ()=>{
		store.set(key, text.$box.val());
	});
	text.$box.addClass('o-no-resize');

	let drawer = new Drawer(
		[
			new Header('Manage Last Run').$main,
			text.$raw,
			$parseBtn,
			new Paragraph('The program will use the Match Template to find and skip any duplicate entries from this text area, which will speed up process times. This text area will be automatically updated with the last run every time you use the tool. If want to wipe this data or you have a different run output you want to use, you can freely override or make edits to this text.'),
			validate.$main
		],
		settings.get(['use_last_run']) === true
	);

	/* Structure */

	$options.append(
		new Paragraph('For premade templates and help creating your own, see the <a href="https://myanimelist.net/forum/?topicid=1905478" target="_blank">forum thread</a>.'),
		tmpl.$main,
		matchTmpl.$main,
		new Check(['live_preview'], 'Live Preview', 'Outputs lines to the UI as the tool works. Useful for confirming things are working before you step away, but may cause extra system load.').$main,
		skip.$main,
		drawer.$main,
	);

	popupUI.$window.append($options);
	popupUI.open();
}

function buildCssImport( ){
	let popupUI = new SubsidiaryUI(UI, 'Import CSS Template');

	/* Elements */

	let $form = $('<div class="l-column">');
	let $blurb = new Paragraph('Input a template here. This will update the tool settings and may add some additional code to your MAL Custom CSS. You may wish to backup your Custom CSS before doing this.');
	let field = new Field(false, 'Data to Import');
	field.$box.attr('placeholder', '{"css":"","template":"","matchtemplate":""}');
	let $button = new Button('Import').on('click', ()=>{
		value = field.$box.val();

		if( value.length < 1 ){
			alert('Nothing detected in import field.');
			return false;
		}
		try {
			importedTemplate = JSON.parse(value);
		}
		catch(e){
			alert(`Import failed. If you are using an official template, report this problem to the developer with the following information.\n\nError message for reference:\n${e}\n\nValue for reference:\n${value}`);
			return false;
		}

		if( !("template" in importedTemplate) || !("matchtemplate" in importedTemplate) ){
			alert(`Import failed due to incorrect syntax or missing information.`);
			return false;
		}
		else {
			let cssToImport = 'css' in importedTemplate ? importedTemplate['css'] : false;
			setTemplate(importedTemplate['template'], importedTemplate['matchtemplate'], cssToImport)
			.then((successful)=> {
				if( successful ){
					popupUI.exit();
				}
			});
		}
	});

	/* Structure */

	$form.append(
		$blurb,
		field.$raw,
		$button
	);
	popupUI.$window.append($form);

	popupUI.open();
}

function buildCssExport( ){
	let popupUI = new SubsidiaryUI(UI, 'Export CSS Template');

	/* Elements */

	let $row = $('<div class="l-row">');
	let $form = $('<div class="l-column">');
	let tmplField = new Field(false, 'Template');
	tmplField.$box.val(settings.get(['css_template']));
	let matchField = new Field(false, 'Match Template');
	matchField.$box.val(settings.get(['match_template']));
	let cssField = new Textarea(false, 'CSS Styling');
	let outputField = new Field();
	outputField.$box.attr('readonly','readonly');
	let $button = new Button('Generate Template', {title:'Generates text and copies to your clipboard.'}).on('click', ()=>{
		let output = {
			"template": tmplField.$box.val(),
			"matchtemplate": matchField.$box.val()
		};

		if( output['template'].length < 1 || output['matchtemplate'] < 1 ){
			alert('Please fill out both the Template and Match Template fields.');
			return false;
		}

		let css = cssField.$box.val();
		if( css.trim().length > 0 ){
			output['css'] = css;
		}
		
		outputField.$box.val(JSON.stringify(output));
		
		outputField.$box.trigger('select');
		navigator.clipboard.writeText(outputField.$box.val());
	});

	/* Structure */

	$form.append(
		new Paragraph('CSS designers can use this to create a template for others to quickly import. The template and match template are required, but you may leave the CSS Styling field blank if desired.'),
		tmplField.$raw,
		matchField.$raw,
		cssField.$raw,
		$row
	);
	$row.append(
		$button,
		outputField.$raw
	);
	popupUI.$window.append($form);

	popupUI.open();
}

function generateChecks( tagsNotNotes ){
	let checked = tagsNotNotes ? 'checked_tags' : 'checked_notes';
	let arr = [
		new Check([checked, 'english_title'], "English Title"),
		new Check([checked, 'french_title'], "French Title"),
		new Check([checked, 'spanish_title'], "Spanish Title"),
		new Check([checked, 'german_title'], "German Title"),
		new Check([checked, 'native_title'], "Native Title"),
		new Check([checked, 'season'], "Season"),
		new Check([checked, 'year'], "Year"),
		new Check([checked, 'genres'], "Genres"),
		new Check([checked, 'themes'], "Themes"),
		new Check([checked, 'demographic'], "Demographic"),
		new Check([checked, 'score'], "Score"),
		new Check([checked, 'rank'], "Rank"),
		new Check([checked, 'popularity'], "Popularity")
	];
	if( List.isAnime ){	
		arr = arr.concat(arr, [
			new Check([checked, 'studio'], "Studio"),
			new Check([checked, 'producers'], "Producers"),
			new Check([checked, 'licensors'], "Licensors"),
			new Check([checked, 'aired'], "Aired"),
			new Check([checked, 'rating'], "Rating"),
			new Check([checked, 'duration'], "Duration (Episode)"),
			new Check([checked, 'total_duration'], "Duration (Total)")
		]);
	}
	else {
		arr = arr.concat(arr, [
			new Check([checked, 'published'], "Published"),
			new Check([checked, 'authors'], "Authors"),
			new Check([checked, 'serialization'], "Serialization")
		]);
	}
	return arr;
}

function buildTagSettings( ){
	let popupUI = new SubsidiaryUI(UI, 'Tag Updater Settings', 'Automatically add info to your tags.');

	let $options = $('<div class="l-column o-justify-start">');
	$options.append(
		new Paragraph('Enabled options will be added to your tags. Please <a href="https://myanimelist.net/panel.php?go=export" target="_blank">export</a> a copy of your list first if you have any tags you wish to keep as this action can be highly destructive.'),
		new CheckGrid(generateChecks(true)).$main,
		new Check(['clear_tags'], "Overwrite Current Tags", "Overwrite all of your current tags with the new ones. If all other tag options are unchecked, this will completely remove all tags.\n\nDO NOT use this if you have any tags you want to keep.").$main
	);
	popupUI.$window.append($options);

	popupUI.open();
}

function buildNoteSettings( ){
	let popupUI = new SubsidiaryUI(UI, 'Note Updater Settings', 'Automatically add info to your notes.');

	let checks = generateChecks(false);
	checks.push(new Check(['checked_notes', 'synopsis'], "Synopsis"));
	
	let $options = $('<div class="l-column o-justify-start">');
	$options.append(
		new Paragraph('Enabled options will be added to your notes/comments. Please <a href="https://myanimelist.net/panel.php?go=export" target="_blank">export</a> a copy of your list first if you have any notes you wish to keep as this action can be highly destructive.'),
		new CheckGrid(checks).$main,
		new Check(['clear_notes'], "Overwrite Current Notes", "Overwrite all of your current notes with the new ones. If all other tag options are unchecked, this will completely remove all notes.\n\nDO NOT use this if you have any notes you want to keep.").$main
	);
	popupUI.$window.append($options);

	popupUI.open();
}

function buildHeaderSettings( ){
	let popupUI = new SubsidiaryUI(UI, 'Category Header Settings', 'Automatically add headers before each category.');
	
	let $options = $('<div class="l-column">');
	$options.append(
		new Paragraph('These headers will only be applied to modern lists. Classic lists disable this tool as they already have headers by default. For help understanding and creating templates, see the <a href="https://myanimelist.net/forum/?topicid=1905478" target="_blank">thread</a>.'),
		new Check(['auto_headers'], 'Automatically Update Headers', 'Every time you load your anime or manga list, this script will run and update your CSS with new header locations.').$main,
		new Textarea(['header_template'], 'Template for Each Header', {'title':'CSS Template used for each header. Replacements are:\n[INDEX], [NAME], [TYPE]'}, 15).$main,
		new Textarea(['header_style'], 'Styling for All Headers', {'title':'CSS Styling applied once to your Custom CSS.'}, 15).$main
	);
	popupUI.$window.append($options);

	/* TODO: Add custom names for each category here. */

	popupUI.open();
}

function buildHeaderImport( ){
	let popupUI = new SubsidiaryUI(UI, 'Import Header Styling');

	/* Elements */

	let $form = $('<div class="l-column">');
	let $blurb = new Paragraph('Input a template here. This will update the tool settings with your imported templates and styles.');
	let field = new Field(false, 'Data to Import');
	field.$box.attr('placeholder', '{"header_template":"","header_style":""}');
	let $button = new Button('Import').on('click', ()=>{
		value = field.$box.val();

		if( value.length < 1 ){
			alert('Nothing detected in import field.');
			return false;
		}
		try {
			importedTemplate = JSON.parse(value);
		}
		catch(e){
			alert(`Import failed. If you are using an official template, report this problem to the developer with the following information.\n\nError message for reference:\n${e}\n\nValue for reference:\n${value}`);
			return false;
		}

		if( !("header_template" in importedTemplate) || !("header_style" in importedTemplate) ){
			alert(`Import failed due to incorrect syntax or missing information.`);
			return false;
		}
		else {
			setHeaderTemplate(importedTemplate['header_template'], importedTemplate['header_style'])
			.then((successful)=> {
				if( successful ){
					popupUI.exit();
				}
			});
		}
	});

	/* Structure */

	$form.append(
		$blurb,
		field.$raw,
		$button
	);
	popupUI.$window.append($form);

	popupUI.open();
}

function buildHeaderExport( ){
	let popupUI = new SubsidiaryUI(UI, 'Export Header Styling');

	/* Elements */

	let $row = $('<div class="l-row">');
	let $form = $('<div class="l-column">');
	let tmplField = new Textarea(false, 'Template for Each Header', {}, 15);
	tmplField.$box.val(settings.get(['header_template']));
	let styleField = new Textarea(false, 'Styling for All Headers', {}, 15);
	styleField.$box.val(settings.get(['header_style']));
	let outputField = new Field();
	outputField.$box.attr('readonly','readonly');
	let $button = new Button('Generate Template', {title:'Generates text and copies to your clipboard.'}).on('click', ()=>{
		let output = {
			"header_template": tmplField.$box.val(),
			"header_style": styleField.$box.val()
		};

		if( output['header_template'].length < 1 ){
			alert('Please fill out the "Template for Each Header" field. It is also recommended to fill the "Styling for All Headers" section.');
			return false;
		}
		
		outputField.$box.val(JSON.stringify(output));
		
		outputField.$box.trigger('select');
		navigator.clipboard.writeText(outputField.$box.val());
	});

	/* Structure */

	$form.append(
		new Paragraph('CSS designers can use this to create a template for others to quickly import.'),
		tmplField.$raw,
		styleField.$raw,
		$row
	);
	$row.append(
		$button,
		outputField.$raw
	);
	popupUI.$window.append($form);

	popupUI.open();
}

function buildResults( args ){
	let popupUI = new SubsidiaryUI(UI, 'Job\'s Done!');
	popupUI.nav.$right.append(
		new Button('Exit')
		.on('click', ()=>{
			popupUI.exit();
			UI.exit();
		})
	);

	let $info = $('<div class="l-column">');

	const errorPercent = args['errorCount'] / args['itemCount'] * 100;
	const errorText = `\n\nOut of ${args['itemCount']} processed items, that represents a ${errorPercent}% error rate. Some updates were likely successful, especially if the error rate is low.\n\nBefore seeking help, try refreshing your list page and rerunning the tool to fix these errors.`;
	let scraperText = '';
	if( args['errorCount'] < 1 && args['warningCount'] > 0 ){
		scraperText = `Scraping jobs encountered ${args['warningCount']} warning(s).\n\nIt is likely that all updates were successful. However, if you notice missing images, try running the tool again.`;
	}
	else if( args['errorCount'] > 0 && args['warningCount'] < 1 ){
		scraperText = `Scraping jobs encountered ${args['errorCount']} error(s).${errorText}`;
	}
	else if( args['errorCount'] > 0 && args['warningCount'] > 0 ){
		scraperText = `Scraping jobs encountered ${args['errorCount']} error(s) and ${args['warningCount']} warning(s).${errorText}`;
	}

	let tasks = [];
	if( args['didCss'] ){
		tasks.push('CSS generated.');
	}
	if( args['didTags'] ){
		tasks.push('Tags updated.');
	}
	if( args['didNotes'] ){
		tasks.push('Notes updated.');
	}
	if( args['didHeaders'] ){
		tasks.push('Category headers updated.');
	}
	if( args['didUpload'] ){
		tasks.push(`Uploaded to your ${args['didUpload']} account.`);
	}
	if( args['didUpdate'] ){
		tasks.push(`Updated your MyAnimeList "Custom CSS" box.`);
	}
	$info.append(new Paragraph('Tasks that were completed:'), new Bullets(tasks));
	if( scraperText && (args['didCss'] || args['didTags'] || args['didNotes']) ){
		$info.append(scraperText);
	}
	if( args['didTags'] || args['didNotes'] ){
		$info.append(new Paragraph('Changes to tags or notes require a page refresh to display.'));
	}

	if( args['displayCss'] ){
		let scrapedCssRow = new SplitRow();
		scrapedCssRow.$left.append(new Header('CSS Generator Output').$main);
		scrapedCssRow.$right.append(
			new Button('Copy to Clipboard')
			.on('click', ()=>{
				scrapedOutput.$box.trigger('select');
				navigator.clipboard.writeText(scrapedOutput.$box.val());
			})
		);
		let scrapedOutput = new Textarea(false, '', {'readonly':'readonly'}, 20);
		scrapedOutput.$box.val(worker.scrapedCss);

		let headerCssRow = new SplitRow();
		headerCssRow.$left.append(new Header('Category Headers Output').$main);
		headerCssRow.$right.append(
			new Button('Copy to Clipboard')
			.on('click', ()=>{
				headerOutput.$box.trigger('select');
				navigator.clipboard.writeText(headerOutput.$box.val());
			})
		);
		let headerOutput = new Textarea(false, '', {'readonly':'readonly'}, 20);
		headerOutput.$box.val(worker.headerCss);

		$info.append(
			scrapedCssRow.$main,
			scrapedOutput.$raw,
			headerCssRow.$main,
			headerOutput.$raw
		);
	}

	if( args['didUpload'] && args['displayUrl'] ){
		let urlField = new Field(false);
		urlField.$box.val(args['url']);
		let $copyBtn = new Button('Copy to Clipboard')
		.on('click', ()=>{
			urlField.$box.trigger('select');
			navigator.clipboard.writeText(urlField.$box.val());
		});

		$info.append(
			new Header('Uploaded File URL', 'For importing in your CSS.').$main,
			urlField.$main,
			$copyBtn
		);
	}
	/*
	TODO: display CSS here if auto-managing and uploading is enabled and it was successful
	
	let urlField = new Field();
	urlField.$box.attr('placeholder', 'The URL for your CSS will be placed here.');

	*/

	popupUI.$window.append($info);

	popupUI.open();
}

if( List.isOwner ){
	if( !UI || !UI.isAlive ){
		initialise();
	}
	UI.open();
}
else {
	alert('This script is only designed to work on your own list. Be sure you\'ve loaded your anime or manga list and are logged in.');
}
})();void(0);