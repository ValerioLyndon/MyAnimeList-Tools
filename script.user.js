// ==UserScript==
// @name         List Tools
// @namespace    V.L
// @version      11.0-pre4_a0
// @description  Provides tools for managing your list's tags, CSS, and more.
// @author       Valerio Lyndon
// @match        https://myanimelist.net/animelist/*
// @match        https://myanimelist.net/mangalist/*
// @homepageURL  https://github.com/ValerioLyndon/MyAnimeList-Tools
// @supportURL   https://github.com/ValerioLyndon/MyAnimeList-Tools/issues
// @license      GPL-3.0-only
// @grant        GM_setValue
// @grant        GM_getValue
// @grant        GM_deleteValue
// @run-at       document-end
// ==/UserScript==

/*
MyAnimeList-Tools

- Original code   2018/Aug/10 by BurntJello http://burntjello.webs.com
- Extra features  2019        by Cateinya
- Fixes           2020/Oct    by Cry5talz 
- Further changes 2021+       by Valerio Lyndon
*/

const ver = '11.0-pre4_a0';
const verMod = '2023/Aug/22';

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

var store = new CustomStorage('userscript');

/* Re-usable Functions and Classes */

function warnUserBeforeLeaving( e ){
	e.preventDefault();
	return (e.returnValue = "");
}

function isDict( unknown ){
	return (unknown instanceof Object && !(unknown instanceof Array)) ? true : false;
}

/* Gets height of element whether it is inserted in the DOM yet or not. */
class NodeDimensions {
	static $dummy = $('<div style="position: fixed; left: -9999px; display: none; width: 480px;">');
	static height( node ){
		node = node instanceof $ ? node[0] : node;
		if( node.parentElement ){
			return node.scrollHeight;
		}
		UI.$window.append(this.$dummy);
		this.$dummy.css('display', 'block');
		this.$dummy.append(node);
		let height = node.scrollHeight;
		this.$dummy.css('display', 'none');
		return height;
	}
}

class Logger {
	constructor( ){
		this.$parent = false;
		this.errorCount = 0;
		this.warningCount = 0;
	}

	initialise( ){
		if( !UI ){
			return false;
		}
		if( this.$parent ){
			return true;
		}
		
		this.$parent = $('<div class="l-column o-half-gap l-scrollable">');
		UI.newWindow(
			new Header('Process Log', 'Information, warnings, and errors are output here when something of note occurs.').$main,
			this.$parent
		);
		return true;
	}

	createMsgBox( msg = '', type = 'ERROR' ){
		if( !this.initialise() ){
			alert(`A log of type [${type}] occured during loading:\n${msg}`);
			return;
		}
		let errorBox = document.createElement('div');
		errorBox.className = 'c-log';
		errorBox.insertAdjacentHTML('afterbegin', `<b>[${type}]</b> ${msg}`);
		this.$parent.prepend(errorBox);
	}
	
	/* tellUser can be one of: true (show to user), false (only to console), or string (show custom string to user) */
	
	error( msg = 'Something happened.', tellUser = true ){
		this.errorCount++;
		console.log('[MAL-Tools][ERROR]', msg);
		if( tellUser ){
			let userMsg = typeof tellUser == 'string' ? tellUser : msg;
			this.createMsgBox(userMsg, 'Error');
		}
	}
	
	warn( msg = 'Something happened.', tellUser = true ){
		this.warningCount++;
		console.log('[MAL-Tools][warn]', msg);
		if( tellUser ){
			let userMsg = typeof tellUser == 'string' ? tellUser : msg;
			this.createMsgBox(userMsg, 'Warning');
		}
	}

	generic( msg = 'Something happened.', tellUser = false ){
		console.log('[MAL-Tools][info]', msg);
		if( tellUser ){
			let userMsg = typeof tellUser == 'string' ? tellUser : msg;
			this.createMsgBox(userMsg, 'Info');
		}
	}
}

class ListInfo {
	constructor( ){
		this.type = window.location.pathname.split('/')[1].substring(0,5);
		this.isAnime = (this.type === 'anime');
		this.isOwner = ($('body').attr('data-owner') === "1");
		this.isModern = ($('#list_surround').length === 0);
		this.style = undefined;
		this.customCssEle = this.isModern ? $('#custom-css') : $('head style:first-of-type');
		this.customCss = this.customCssEle.text().trim();
		this.customCssModified = this.customCss.replaceAll(/\/\*MYANIMELIST-TOOLS START\*\/(.|\n)*\/\*MYANIMELIST-TOOLS END\*\//g, '').trim();
		this.csrf = $('meta[name="csrf_token"]').attr('content');
	}

	async determineStyle( ){
		if( this.isModern ){
			this.style = this.#determineModernStyle();
		}
		else {
			this.style = await this.#determineClassicStyle();
		}
	}

	#determineModernStyle( ){
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
	async #determineClassicStyle( ){
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

			if( styleCss === this.customCss ){
				return url.split('id=')[1];
			}
		}

		Log.error('Could not determine classic list style.', false);
		return false;
	}
}

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

		/* css */
		"update_css": true,
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
		}
	};
	
	constructor( ){
		this.updateOlderFormats();
		/* Read settings from storage and validate */
		if( store.has(`${List.type}_settings`) ){
			try {
				let workspace = store.get(`${List.type}_settings`);
			
				/* Check for missing settings and fill them in. This prevents errors while maintaining user settings, especially in the case of a user updating from an older version. */
				for( let [key, value] of Object.entries(this.settings) ){
					if( !(key in this.settings) ){
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
				alert("Encountered an error while parsing your previous settings. Your settings have been reverted to defaults. To quickly recover your template settings, try selecting \"Last Run\" and then \"Autofill\". Other settings will need to be manually set. \n\nIf you've never run this tool before, you should never see this.");
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
		store.remove(`manual_${List.type}_run`);
		if( UI ){
			UI.destruct();
			initialise();
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
	Settings.set(['css_template'], newTemplate);
	Settings.set(['match_template'], newMatchTemplate);
	
	if( newCss !== false ){
		if( !List.style ){
			alert('Failed to import CSS: Not able to determine style ID.');
			return false;
		}

		let finalCss = List.customCssModified;
		if( newCss.length > 0 ){
			finalCss += '\n\n/*MYANIMELIST-TOOLS START*/\n\n' + newCss + '\n\n/*MYANIMELIST-TOOLS END*/';
		}
		if( finalCss.length >= 65535 ){
			alert('Your MAL Custom CSS may be longer than the max allowed length. If your CSS has been cut off at the end, you will need to resolve this issue.');
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
			formData.append("style_edit_theme[css]", finalCss);
			formData.append("style_edit_theme[save]", "");
			formData.append("csrf_token", List.csrf);
			
			let post = await fetch(styleUrl, {
				method: "POST",
				body: formData
			})
			.then(response => {
				if( !response.ok) {
					throw new Error(`Failed to send modern CSS update request.`);
				}
				return true;
			})
			.catch(error => {
				Log.error(error);
				return false;
			});
			if( !post ){
				return false;
			}
		}
		else {
			let styleUrl = `https://myanimelist.net/editprofile.php?go=stylepref&do=cssadv&id=${List.style}`;
			
			let headerData = new Headers();
			headerData.append('Content-Type', 'application/x-www-form-urlencoded');
			headerData.append('Referer', styleUrl);

			let formData = new URLSearchParams();
			formData.append('cssText', finalCss);
			formData.append('subForm', 'Update CSS');
			formData.append('csrf_token', List.csrf);
			
			let post = await fetch(styleUrl, {
				method: "POST",
				headers: headerData,
				body: formData
			})
			.then(response => {
				if( !response.ok ){
					throw new Error(`Failed to send classic CSS update request.`);
				}
				return true;
			})
			.catch(error => {
				Log.error(error);
				return false;
			});
			if( !post ){
				return false;
			}
		}

		/* Temporarily update the page's CSS to make sure no page reload is required */
		List.customCssEle.text(finalCss);
	}
	alert('Import succeeded.');
	return true;
}

/* wrapper for common fetch requests to remove some boilerplate */
async function request( url, result = 'html' ){
	let pageText = await fetch(url)
	.then(response => {
		if( !response.ok ){
			throw new Error();
		}
		return response.text();
	})
	.then(text => {
		return text;
	})
	.catch(() => {
		return false;
	});

	if( !pageText ){
		return false;
	}
	if( result === 'html' ){
		return createDOM(pageText);
	}
	if( result === 'string' ){
		return pageText;
	}
}

function createDOM( string ){
	return new DOMParser().parseFromString(string, 'text/html');
}

function decodeHtml( html ){
	txt = document.createElement("textarea");
	txt.innerHTML = html;
	return txt.value;
}

function round( value, precision ){
	let multiplier = Math.pow(10, precision || 0);
	return Math.round(value * multiplier) / multiplier;
}

function sleep( ms ){
	return new Promise(resolve => { setTimeout(resolve, ms); });
}

/* Main Program */

class UserInterface {
	alive = true;
	#attachmentPoint = document.createElement('div');
	#shadowRoot = this.#attachmentPoint.attachShadow({mode: 'open'});
	root = document.createElement('div');
	$container = $('<div class="l-center c-container">');
	$windowList = $('<div class="c-window-list js-focus">');
	$window = $('<main class="l-column c-window">');

	constructor( ){
		this.#shadowRoot.append(this.root);
		this.root.className = 'root is-closed';
		$(this.root).append(this.$container);
		this.$container.append(this.$windowList);
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
	--group-bg: #32323244;
	--txt: #eee;
	--btn-bg: #222222f0;
	--btn-brdr: #4e4e4e;
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
	--btn-bg: #d9d9d9f0;
	--btn-brdr: #767676;
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

.l-center {
	display: grid;
	place-items: center;
}

.l-column {
	display: grid;
	grid-auto-flow: row;
	gap: 10px;
	place-items: start stretch;
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
	overflow-y: scroll;
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
	text-align: left;
	opacity: 1;
	overflow: auto;
	transition: opacity .16s ease;
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
	pointer-events: none;
}

.c-window-list {
	display: flex;
	flex-direction: column;
	place-items: center;
	place-content: center;
	gap: 15px;
	padding: 30px 10px;
}
.is-subsidiary .c-window-list {
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
}

.c-button {
	padding: 2px 4px;
	background: var(--btn-bg);
	border: 1px solid var(--btn-brdr);
	border-radius: 6px;
	color: var(--txt);
	cursor: pointer;
	justify-self: start;
}
.c-button:disabled {
	opacity: 0.7;
	cursor: not-allowed;
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
	border-radius: 6px;
	overflow: hidden;
}
.c-radio__station {
	padding: 3px 6px;
	background: var(--group-bg);
	cursor: pointer;
	font-weight: normal;
}
.c-radio__station ~ .c-radio__station {
	margin-left: 2px;
}
:checked + .c-radio__station {
	background: var(--btn-bg);
	filter: invert(1);
}

.c-component {
	padding: 10px;
	background: var(--group-bg);
	border-radius: 9px;
}
.c-component.is-disabled {
	opacity: 0.5;
}

.c-drawer {
	padding-left: 5px;
	overflow: hidden;
	transition: height 0.16s ease;
}

.c-check-grid {
	display: grid;
	width: 100%;
	grid-template-columns: repeat( auto-fit, minmax(140px, 1fr) );
	gap: 5px;
}

.c-log {
	padding: 5px;
	background: var(--group-bg);
	border-radius: 9px;
	font: 11px/1.5em monospace;
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

.o-interactable {
	cursor: pointer;
}

.o-wrap {
	flex-wrap: wrap;
}

.o-bold {
	font-weight: 700;
}



/* JS Functions */

.js-focus {
	transition:
		transform .22s ease,
		opacity .16s ease;
}
.js-focus.is-unfocused {
	transform: translateX(-75px);
	opacity: 0.7;
}
.root:not(.is-closed) .js-focus {
	animation: slide .22s ease;
}
.root.is-closed .js-focus {
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
		if( this.alive ){
			this.root.classList.remove('is-closed');
		}
	}

	close( ){
		this.root.classList.add('is-closed');
	}

	destruct( ){
		if( this.alive ){
			this.alive = false;
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
		let $window = $(`<aside class="l-column c-window">`);
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
		super.close();
		document.body.style.overflow = '';
	}
}

class SubsidiaryUI extends UserInterface {
	constructor( parentUI, title, subtitle = false ){
		super();
		this.parentUI = parentUI;

		this.nav = new SplitRow();
		this.nav.$left.append(
			new Header(title, subtitle).$main
		);
		this.nav.$right.append(
			$(`<input class="c-button" type="button" value="Back">`).on('click', ()=>{
				this.destruct();
			})
		);
		this.$window.append(this.nav.$main, new Hr());
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

	destruct( ){
		super.destruct();
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
		Worker.disableWhileRunning.push(...additionalActions, $button);
	}
}

class OptionalGroupRow extends GroupRow {
	constructor( name, settingArray, settingsFunc, additionalActions = [] ){
		super('', settingsFunc, additionalActions);
		this.enabled = false;

		this.check = new Check(settingArray, name);
		this.check.$main.addClass('o-block-gap');
		this.check.$box.on('input', ()=>{ this.checkStatus(); });
		this.checkStatus();

		this.$left.append(
			this.check.$main
		);
		Worker.disableWhileRunning.push(this.check.$box);
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

class CheckGroup {
	constructor( settingArray, title, desc = false, checkArray ){
		this.$main = $(`<div class="c-option c-option--vertical">`);
		
		let checks = [];
		for( let check of checkArray ){
			check.$main.prepend('∟');
			checks.push(check.$main);
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
		
		this.$main.append(toggle.$main, drawer.$main);
	}
}

class Check {
	constructor( settingArray, title, desc = false ){
		this.$main = $(`<label class="c-check">${title}</label>`);
		if( desc ){
			this.$main.attr('title', desc);
		}
		this.$box = $('<input class="c-check__box" type="checkbox">')
			.prop('checked', Settings.get(settingArray))
			.on('change', ()=>{
				Settings.set(settingArray, this.$box.is(':checked'));
			});

		this.$main.prepend(this.$box);
	}
}

class Field {
	constructor( settingArray = false, title = '', desc = false, style = 'block' ){
		this.$main = $(`<label class="c-field">${title}</label>`);
		if( desc ){
			this.$main.attr('title', desc);
		}

		this.$box = $(`<input class="c-field__box" type="text" spellcheck="no">`);
		if( settingArray ){
			this.$box.on('input', ()=>{
				Settings.set(settingArray, this.$box.val());
			});
			this.$box.val(Settings.get(settingArray));
		}
		
		if( style === 'inline' ){
			this.$main.addClass('c-field--inline');
		}
		this.$main.append(this.$box);
	}
}

class Textarea {
	constructor( settingArray = false, title = '', attributes = {}, lines = 3 ){
		this.$main = $(`<label class="c-field">${title}</label>`);

		this.$box = $(`<textarea class="c-field__box c-field__box--multiline" spellcheck="no" style="--lines: ${lines}">`);
		if( settingArray ){
			this.$box.on('input', ()=>{
				Settings.set(settingArray, this.$box.val());
			});
			this.$box.val(Settings.get(settingArray));
		}
		for( let [name,value] of Object.entries(attributes) ){
			this.$box.attr(name,value);
		}
		
		this.$main.append(this.$box);
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
		let button = $(`<input class="c-button" type="button" value="${value}">`);
		for( let [name,value] of Object.entries(attributes) ){
			button.attr(name,value);
		}
		return button;
	}
}



/* Global Vars */

var Log = new Logger();
var List = new ListInfo();
var Settings;
var UI;
var cssComponent;



/* Runtime */

class Worker {
	static disableWhileRunning = [];
	/* buttons are added to this list to be later disabled upon process start */
	static reenableAfterDone = [];
	/* similarly, these buttons are re-enabled after finish */
	static $actionBtn;
	static running = false;
}

class ListItems {
	static data = [];
	static #url = window.location.href.split('?')[0] + '/load.json?status=7&offset=';
	static #offset = 0;
	static #failures = 0;
	static #delay = 0;
	static #loaded = false;

	static load( ){
		if( this.#loaded ){
			this.#done();
			return true;
		}

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
				this.#loaded = true;
			}
		}).fail(()=>{
			this.#failures++;
			this.#delay += 3000;

			if( this.#failures > 3 ){
				Worker.$actionBtn.val('Failed');
				Status.update(`Failed to fetch list info.`, 'bad', 100);
				return;
			}

			Status.update(`Data fetch failed, retrying in ${this.#delay}ms...`);
			setTimeout(this.load, this.#delay);
		});
	}

	static #done( ){
		Status.update(`Successfully loaded ${this.data.length} items.`, 'good', 100);
		Worker.$actionBtn.val('Start');
		Worker.$actionBtn.removeAttr('disabled');
	}
}

class CSSComponent {
	constructor( ){
		this.$preview = false;
		this.result = '';
	}

	write( line ){
		this.result += line + '\n';
		if( this.$preview ){
			this.$preview.val(this.result);
			this.$preview.scrollTop(NodeDimensions.height(this.$preview));
		}
	}
}

var Status = new class {
	percent = 0;
	type = 'working';

	constructor( ){
		this.$bar = $('<div class="c-status">');
		this.$text = $('<span class="c-status__text">');
		this.$time = $('<span class="c-status__time">');
		this.$bar.append(this.$text, this.$time);

		this.$fixedBar = this.$bar.clone();
		this.$fixedBar.addClass('is-fixed o-interactable');
		this.$fixedBar.on('click', ()=>{
			UI.open();
			this.hideFixed();
		});

		this.bars = [this.$bar, this.$fixedBar];
		this.texts = [this.$bar, this.$fixedBar];
		this.times = [this.$bar, this.$fixedBar];
	}

	update( text, type = this.type, percent = this.percent ){
		this.type = type;
		this.percent = percent;
		for( let blurb of this.texts ){
			blurb.text(text);
		}
		for( let bar of this.bars ){
			if( percent === -1 ){
				bar.addClass('is-unsure');
			}
			if( percent > 0 ){
				bar.removeClass('is-unsure');
			}
			bar.css({
				'--percent': `${percent}%`,
				'--colour': `var(--stat-${type})`
			});
		}
	}

	estimate( remaining = 0, msSinceLast = 0 ){
		if( remaining === 0 && msSinceLast === 0 ){
			this.$time.text('');
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
		for( let time of this.times ){
			time.text(`~ ${formatted} left`);
		}
	}

	showFixed( ){
		this.$fixedBar.removeClass('is-aside');
	}

	hideFixed( ){
		this.$fixedBar.addClass('is-aside');
	}
}


function initialise() {
	List.determineStyle();
	Settings = new UserSettings();
	UI = new PrimaryUI();
	cssComponent = new CSSComponent();

	/* Control Row */
	let $actionBtn = new Button('Loading...', {'disabled':'disabled'}).one('click', ()=>{
		beginProcessing();
	});
	let $hideBtn = new Button('Minimise', {title:'Closes the program window while it keeps running in the background.'}).on('click', ()=>{
		UI.close();
		$(UI.root).append(Status.$fixedBar);
	});
	let $exitBtn = new Button('Exit', {title:'Completely exit the program.'}).on('click', ()=>{
		UI.destruct();
	});
	let controls = new SplitRow();
	controls.$left.append(Status.$bar);
	controls.$right.append($actionBtn, $hideBtn, $exitBtn);

	/* Components Row */
	let $components = $('<div class="l-column">');
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
		new OptionalGroupRow('Tags Updater', ['update_tags'], ()=>{ buildTagSettings(); }).$main,
		new OptionalGroupRow('Notes Updater', ['update_notes'], ()=>{ buildNoteSettings(); }).$main
	);

	/* Footer Row */
	let $switchBtn = new Button('Switch Theme').on('click', ()=>{
		UI.swapTheme();
	});
	let $clearBtn = new Button('Clear Settings', {title:'Clears any stored settings from previous runs.'});
	if( store.has(`${List.type}_settings`) || store.has(`last_${List.type}_run`) || store.has(`manual_${List.type}_run`) ){
		$clearBtn.on('click', ()=> {
			Settings.clear();
		});
	}
	else {
		$clearBtn.attr('disabled', 'disabled');
	}
	let footer = new SplitRow();
	footer.$left.append($(`<footer class="c-footer">MyAnimeList-Tools v${ver}<br />Last modified ${verMod}</footer>`));
	footer.$right.append(
		$switchBtn,
		$clearBtn
	);

	/* Add all rows to UI */
	UI.$window.append(controls.$main, new Hr(), $components, new Hr(), footer.$main);
	UI.open();
	
	Worker.disableWhileRunning.push($clearBtn, $exitBtn);
	Worker.reenableAfterDone.push($clearBtn, $exitBtn);
	Worker.$actionBtn = $actionBtn;



	/* Primary Functions */

	ListItems.load();

	var iteration = -1;
	var newData = [];
	var percent = 0;
	var timeout;
	var timeThen;
	async function processItem( ){
		let thisData = newData[iteration];
		id = thisData[`${List.type}_id`];
		
		try {
			let str = await request(`https://myanimelist.net/${List.type}/${id}`, 'string');
			if( !str ){
				Log.error(`${List.type} #${id}: Failed to get entry information.`);
				continueProcessing();
				return;
			}
			let doc = createDOM(str);
		
			/* get current tags */
			let tags = [];
			if( Settings.get(['update_tags']) && !Settings.get(['clear_tags']) ){
				tags = thisData['tags'].split(',');
				
				/* remove extra whitespace */
				for(j = 0; j < tags.length; j++)
				{
					tags[j] = tags[j].trim();
				}
			}

			/* common functions */
			
			function removeTagIfExist(match, mode = 0)
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
				if(tags.length == 0) {
					return;
				}

				tagsLength = tags.length;
				for(k = 0; k < tagsLength; k++)
				{
					tagNormalized = tags[k].toUpperCase();
					matchNormalized = match.toUpperCase();
					if(
						tags[k].length == 0 ||
						mode == 0 && tagNormalized == matchNormalized ||
						mode == 1 && tagNormalized.indexOf(matchNormalized) != -1 ||
						mode == 2 && tagNormalized.startsWith(matchNormalized) ||
						mode == 3 && tagNormalized.endsWith(matchNormalized)
					) {
						tags.splice(k, 1);
						tagsLength--;
						k--;
					}
				}
			}

			/* titles */

			title = thisData[`${List.type}_title`];

			/* English title */
			
			titleEn = null;
			if('anime_title_eng' in thisData)
			{
				titleEn = thisData['anime_title_eng'];
			}
			else if('manga_english' in thisData)
			{
				titleEn = thisData['manga_english'];
			}
			removeTagIfExist(titleEn);

			/* French title */

			titleFr = null;
			titleFrStartTxt = 'French:</span>';
			titleFrStartIndex = str.indexOf(titleFrStartTxt);
			if(str.indexOf(titleFrStartTxt) != -1)
			{
				titleFrStartIndex += titleFrStartTxt.length;
				titleFrEndIndex = str.indexOf('</div>', titleFrStartIndex);
				titleFr = str.substring(titleFrStartIndex, titleFrEndIndex);
				titleFr = decodeHtml(titleFr);
				
				titleFr = titleFr.trim().replace(',', '');
				removeTagIfExist(titleFr);
			}

			/* German title */

			titleDe = null;
			titleDeStartTxt = 'German:</span>';
			titleDeStartIndex = str.indexOf(titleDeStartTxt);
			if(str.indexOf(titleDeStartTxt) != -1)
			{
				titleDeStartIndex += titleDeStartTxt.length;
				titleDeEndIndex = str.indexOf('</div>', titleDeStartIndex);
				titleDe = str.substring(titleDeStartIndex, titleDeEndIndex);
				titleDe = decodeHtml(titleDe);
				
				titleDe = titleDe.trim().replace(',', '');
				removeTagIfExist(titleDe);
			}

			/* Spanish title */

			titleEs = null;
			titleEsStartTxt = 'Spanish:</span>';
			titleEsStartIndex = str.indexOf(titleEsStartTxt);
			if(str.indexOf(titleEsStartTxt) != -1)
			{
				titleEsStartIndex += titleEsStartTxt.length;
				titleEsEndIndex = str.indexOf('</div>', titleEsStartIndex);
				titleEs = str.substring(titleEsStartIndex, titleEsEndIndex);
				titleEs = decodeHtml(titleEs);
				
				titleEs = titleEs.trim().replace(',', '');
				removeTagIfExist(titleEs);
			}
			
			/* Native/raw title - may need some correction for titles that aren't originally japanese. */

			titleNative = null;
			titleNativeStartTxt = "Japanese:</span>";
			titleNativeStartIndex = str.indexOf(titleNativeStartTxt);
			if(str.indexOf(titleNativeStartTxt) != -1)
			{
				titleNativeStartIndex += titleNativeStartTxt.length;
				titleNativeEndIndex = str.indexOf("</div>", titleNativeStartIndex);
				titleNative = str.substring(titleNativeStartIndex, titleNativeEndIndex);
				titleNative = decodeHtml(titleNative);
				
				titleNative = titleNative.trim().replace(',', '');
				removeTagIfExist(titleNative);
			}
			
			/* Title synonyms */
			
			titleSynStartTxt = 'Synonyms:</span>';
			titleSynStartIndex = str.indexOf(titleSynStartTxt);
			if(str.indexOf(titleSynStartTxt) != -1)
			{
				titleSynStartIndex += titleSynStartTxt.length;
				titleSynEndIndex = str.indexOf('</div>', titleSynStartIndex);
				titleSyn = str.substring(titleSynStartIndex, titleSynEndIndex);
				titleSyn = decodeHtml(titleSyn);
				titleSynArr = titleSyn.split(',');
				if(titleSynArr.length > 0)
				{
					titleSyn = titleSynArr[0].trim();
				}
			}
			
			/* Title fallbacks for when no alternatives found */
			for (t in [titleEn, titleFr, titleEs, titleDe])
			{
				if(t == null && titleSyn != null)
				{
					t = titleSyn;
				}
				else
				{
					t = title;
				}
			}
			
			/* date */
			season = null;
			year = null;
			dateStartTxt = ( List.type == "anime" ) ? 'Aired:</span>' : 'Published:</span>';
			dateStartIndex = str.indexOf(dateStartTxt) + dateStartTxt.length;
			if(str.indexOf(dateStartTxt) != -1)
			{
				dateEndIndex = str.indexOf("</div>", dateStartIndex);
				dateHtml = str.substring(dateStartIndex, dateEndIndex);
				/* dateHtml should output "Oct 4, 2003 to Oct 2, 2004" or similar */
				dateArr = dateHtml.split(" to ");
				dateBegunArr = dateArr[0].split(",");

				if(dateBegunArr.length == 2)
				{
					season = null;
					if(dateBegunArr[0].indexOf("Jan") != -1 || dateBegunArr[0].indexOf("Feb") != -1 || dateBegunArr[0].indexOf("Mar") != -1)
					{
						season = "Winter";
					}
					else if(dateBegunArr[0].indexOf("Apr") != -1 || dateBegunArr[0].indexOf("May") != -1 || dateBegunArr[0].indexOf("Jun") != -1)
					{
						season = "Spring";
					}
					else if(dateBegunArr[0].indexOf("Jul") != -1 || dateBegunArr[0].indexOf("Aug") != -1 || dateBegunArr[0].indexOf("Sep") != -1)
					{
						season = "Summer";
					}
					else if(dateBegunArr[0].indexOf("Oct") != -1 || dateBegunArr[0].indexOf("Nov") != -1 || dateBegunArr[0].indexOf("Dec") != -1)
					{
						season = "Fall";
					}
					year = dateBegunArr[1].trim();
					removeTagIfExist(season);
					removeTagIfExist(year);
				}

				startDate = dateArr[0].trim();
				endDate = dateArr.length == 2 ? dateArr[1].trim() : "";

				airedTag = "Aired: " + dateArr[0].trim().replace(',', '') + (dateArr.length == 2 ? " to " + dateArr[1].trim().replace(',', '') : "");
				removeTagIfExist('Aired: ', mode = 2);
				publishedTag = "Published: " + dateArr[0].trim().replace(',', '') + (dateArr.length == 2 ? " to " + dateArr[1].trim().replace(',', '') : "");
				removeTagIfExist('Published: ', mode = 2);
			}
			
			/* studio (anime) */
			studios = null;
			studiosStartTxt = "Studios:</span>";
			studiosStartIndex = str.indexOf(studiosStartTxt);
			if(str.indexOf(studiosStartTxt) != -1)
			{
				studiosStartIndex += studiosStartTxt.length;
				studiosEndIndex = str.indexOf("</div>", studiosStartIndex);
				studiosHtml = str.substring(studiosStartIndex, studiosEndIndex);
				
				studios = studiosHtml.split(",");
				studiosLength = studios.length;
				for(j = 0; j < studiosLength; j++)
				{
					g1 = studios[j].indexOf("\">") + 2;
					g2 = studios[j].indexOf("</a>");
					if(g2 == -1) { studios = null; break; }
					studios[j] = studios[j].substring(g1, g2).trim();
					studios[j] = decodeHtml(studios[j]);
					removeTagIfExist(studios[j]);
				}
			}
			
			/* authors (manga) */
			authors = null;
			authorsStartTxt = "Authors:</span>";
			authorsStartIndex = str.indexOf(authorsStartTxt);
			if(str.indexOf(authorsStartTxt) != -1)
			{
				authorsStartIndex += authorsStartTxt.length;
				authorsEndIndex = str.indexOf("</div>", authorsStartIndex);
				authorsHtml = str.substring(authorsStartIndex, authorsEndIndex);

				authors = authorsHtml.split(", <a");
				authorsLength = authors.length;
				for(j = 0; j < authorsLength; j++)
				{
					startAt = authors[j].indexOf("\">") + 2;
					endAt = authors[j].indexOf("</a>");
					if(endAt == -1) { authors = null; break; }
					authors[j] = authors[j].substring(startAt, endAt).trim().replaceAll(',',', ');
					authors[j] = decodeHtml(authors[j]);
					removeTagIfExist(authors[j]);
				}
			}

			/* producers (anime) */
			producers = null;
			producersStartTxt = "Producers:</span>";
			producersStartIndex = str.indexOf(producersStartTxt);
			if(str.indexOf(producersStartTxt) != -1)
			{
				producersStartIndex += producersStartTxt.length;
				producersEndIndex = str.indexOf("</div>", producersStartIndex);
				producersHtml = str.substring(producersStartIndex, producersEndIndex);

				producers = producersHtml.split(",");
				producersLength = producers.length;
				for(j = 0; j < producersLength; j++)
				{
					if(producers[j].indexOf("<sup>") == -1)
					{
						startAt = producers[j].indexOf("\">") + 2;
						endAt = producers[j].indexOf("</a>");
						if(endAt == -1) { producers = null; break; }
						producers[j] = producers[j].substring(startAt, endAt).trim();
						producers[j] = decodeHtml(producers[j]);
						removeTagIfExist(producers[j]);
					}
					else
					{
						producers.splice(j, 1);
						producersLength--;
						j--;
					}
				}
			}

			/* licensors (anime) */
			licensors = null;
			licensorsStartTxt = "Licensors:</span>";
			licensorsStartIndex = str.indexOf(licensorsStartTxt);
			if(str.indexOf(licensorsStartTxt) != -1)
			{
				licensorsStartIndex += licensorsStartTxt.length;
				licensorsEndIndex = str.indexOf("</div>", licensorsStartIndex);
				licensorsHtml = str.substring(licensorsStartIndex, licensorsEndIndex);

				licensors = licensorsHtml.split(",");
				licensorsLength = licensors.length;
				for(j = 0; j < licensorsLength; j++)
				{
					if(licensors[j].indexOf("<sup>") == -1)
					{
						startAt = licensors[j].indexOf("\">") + 2;
						endAt = licensors[j].indexOf("</a>");
						if(endAt == -1) { licensors = null; break; }
						licensors[j] = licensors[j].substring(startAt, endAt).trim();
						licensors[j] = decodeHtml(licensors[j]);
						removeTagIfExist(licensors[j]);
					}
					else
					{
						licensors.splice(j, 1);
						licensorsLength--;
						j--;
					}
				}
			}

			/* serialization (manga) */
			serializations = null;
			serializationStartTxt = "Serialization:</span>";
			serializationStartIndex = str.indexOf(serializationStartTxt);
			if(str.indexOf(serializationStartTxt) != -1)
			{
				serializationStartIndex += serializationStartTxt.length;
				serializationEndIndex = str.indexOf("</div>", serializationStartIndex);
				serializationHtml = str.substring(serializationStartIndex, serializationEndIndex);

				serializations = serializationHtml.split(",");
				serializationLength = serializations.length;
				for(j = 0; j < serializationLength; j++)
				{
					if(serializations[j].indexOf("<sup>") == -1)
					{
						startAt = serializations[j].indexOf("\">") + 2;
						endAt = serializations[j].indexOf("</a>");
						if(endAt == -1) { serializations = null; break; }
						serializations[j] = serializations[j].substring(startAt, endAt).trim();
						serializations[j] = decodeHtml(serializations[j]);
						removeTagIfExist(serializations[j]);
					}
					else
					{
						serializations.splice(j, 1);
						serializationLength--;
						j--;
					}
				}
			}

			/* rating (anime) */
			rating = "?";
			if('anime_mpaa_rating_string' in thisData)
			{
				rating = thisData['anime_mpaa_rating_string'];
			}
			ratingTag = `Rating: ${rating}`;
			removeTagIfExist('Rating: ', mode = 2);

			/* duration (anime) */
			duration = '?';
			totalDuration = '?';
			durationStartTxt = "Duration:</span>";
			durationStartIndex = str.indexOf(durationStartTxt);
			if(durationStartIndex !== -1)
			{
				function splitMinute(minutes)
				{
					final = [];
					leftover = minutes % 60;
					hours = (minutes - leftover) / 60;
					if(hours > 0)
					{
						final.push(hours + 'h');
					}
					final.push(leftover + 'm');
					return final.join(' ');
				}

				durationStartIndex += durationStartTxt.length;
				durationEndIndex = str.indexOf("</div>", durationStartIndex);

				durationSubStr = str.substring(durationStartIndex, durationEndIndex);
				if(durationSubStr.indexOf('hr') !== -1)
				{
					splitHr = durationSubStr.split('hr');
					hours = parseInt(splitHr[0].trim());
					minutes = parseInt(splitHr[1].replace(/[^0-9]*/g, ''));
					minutes += hours * 60;
				}
				else
				{
					minutes = parseInt(durationSubStr.split('min')[0].trim());
				}

				if(!isNaN(minutes))
				{
					duration = splitMinute(minutes);

					episodesStartTxt = 'Episodes:</span>';
					episodesStartIndex = str.indexOf(episodesStartTxt);
					if(episodesStartIndex !== -1)
					{
						episodesStartIndex += episodesStartTxt.length;
						episodesEndIndex = str.indexOf("</div>", episodesStartIndex);
						episodes = parseInt(str.substring(episodesStartIndex, episodesEndIndex).trim());

						if(!isNaN(episodes))
						{
							totalDuration = splitMinute(minutes * episodes);
						}
					}
				}
			}
			durationTag = `Duration/Ep: ${duration}`;
			totalDurationTag = `Duration: ${totalDuration}`;
			removeTagIfExist('Duration/Ep: ', mode = 2);
			removeTagIfExist('Duration: ', mode = 2);

			/* genres */
			genres = [];
			for(each of thisData['genres'])
			{
				genre = each['name'];
				genres.push(genre);
				removeTagIfExist(genre);
			}

			/* themes */
			themes = [];
			themesRaw = $(doc).find('span.dark_text:contains("Theme") ~ [itemprop="genre"]');
			if(themesRaw.length > 0)
			{
				for(j = 0; j < themesRaw.length; j++)
				{
					themes[j] = themesRaw.eq(j).text().trim();
					removeTagIfExist(themes[j]);
				}
			}

			/* demographic */
			demographics = [];
			for(each of thisData['demographics'])
			{
				demographic = each['name'];
				demographics.push(demographic);
				removeTagIfExist(demographic);
			}

			/* rank */
			rank = "?";
			rankStartTxt = "Ranked:</span>";
			rankStartIndex = str.indexOf(rankStartTxt);
			if(rankStartIndex != -1)
			{
				rankStartIndex += rankStartTxt.length;
				rankEndIndex = str.indexOf("<sup>", rankStartIndex);
				rank = str.substring(rankStartIndex, rankEndIndex);
				rank = rank.trim().replace("#", "");
			}
			rankTag = `Ranked: ${rank}`;
			removeTagIfExist('Ranked: ', mode = 2);
			
			/* popularity */
			popularity = "?";
			popularityStartTxt = "Popularity:</span>";
			popularityStartIndex = str.indexOf(popularityStartTxt);
			if(popularityStartIndex != -1)
			{
				popularityStartIndex += popularityStartTxt.length;
				popularityEndIndex = str.indexOf("</div>", popularityStartIndex);
				popularity = str.substring(popularityStartIndex, popularityEndIndex);
				popularity = popularity.trim().replace("#", "");
			}
			popularityTag = `Popularity: ${popularity}`;
			removeTagIfExist('Popularity: ', mode = 2);
			
			/* score */
			score = "?";
			scoreEle = $(doc).find("[itemprop=\"ratingValue\"]");
			if(scoreEle.length > 0)
			{
				score = scoreEle.text().trim();
			}
			scoreTag = `Score: ${score}`;
			removeTagIfExist('Score: ', mode = 2);

			/* Synopsis (description) */
			synopsis = $(doc).find("[itemprop=\"description\"]").text().trim();
			synopsisCss = synopsis.replace(/\r\n/g, " ").replace(/\n/g, "\\a ").replace(/\"/g, "\\\"").trim();
			
			/* Update Notes & Tags */

			if( Settings.get(['update_tags']) ){
				if(titleEn && Settings.get(['checked_tags','english_title'])) { notes.push(titleEn); }
				if(titleFr && Settings.get(['checked_tags','french_title'])) { notes.push(titleFr); }
				if(titleEs && Settings.get(['checked_tags','spanish_title'])) { notes.push(titleEs); }
				if(titleDe && Settings.get(['checked_tags','german_title'])) { notes.push(titleDe); }
				if(titleNative && Settings.get(['checked_tags','native_title'])) { notes.push(titleNative); }
				if(season && Settings.get(['checked_tags','season'])) { notes.push(season); }
				if(year && Settings.get(['checked_tags','year'])) { notes.push(year); }
				if(studios && Settings.get(['checked_tags','studio'])) { notes.push(studios); }
				if(producers && Settings.get(['checked_tags','producers'])) { notes.push(producers); }
				if(licensors && Settings.get(['checked_tags','licensors'])) { notes.push(licensors); }
				if(serializations && Settings.get(['checked_tags','serialization'])) { notes.push(serializations); }
				if(genres && Settings.get(['checked_tags','genres'])) { notes.push(genres); }
				if(themes && Settings.get(['checked_tags','themes'])) { notes.push(themes); }
				if(demographic && Settings.get(['checked_tags','demographic'])) { notes.push(demographic); }
				if(authors && Settings.get(['checked_tags','authbors'])) { notes.push(authors); }
				if(Settings.get(['checked_tags','aired'])) { notes.push(airedTag); }
				if(Settings.get(['checked_tags','published'])) { notes.push(publishedTag); }
				if(Settings.get(['checked_tags','score'])) { notes.push(scoreTag); }
				if(Settings.get(['checked_tags','rank'])) { notes.push(rankTag); }
				if(Settings.get(['checked_tags','popularity'])) { notes.push(popularityTag); }
				if(Settings.get(['checked_tags','rating'])) { notes.push(ratingTag); }
				if(Settings.get(['checked_tags','duration'])) { notes.push(durationTag); }
				if(Settings.get(['checked_tags','total_duration'])) { notes.push(totalDurationTag); }
				
				let tagsRequestUrl;
				let animeOrMangaId;
				if(List.isAnime) {
					tagsRequestUrl = 'https://myanimelist.net/includes/ajax.inc.php?t=22&tags=';
					animeOrMangaId = 'aid';
				} else {
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
					if(!response.ok)
					{
						throw new Error(`${List.type} #${id}: Failed to update tags.`);
					}
					return true;
				})
				.catch(error => {
					Log.error(error);
					return false;
				});
			}

			if( Settings.get(['update_notes']) ){
				let notes = [];

				if(titleEn && Settings.get(['checked_notes','english_title'])) { notes.push(titleEn); }
				if(titleFr && Settings.get(['checked_notes','french_title'])) { notes.push(titleFr); }
				if(titleEs && Settings.get(['checked_notes','spanish_title'])) { notes.push(titleEs); }
				if(titleDe && Settings.get(['checked_notes','german_title'])) { notes.push(titleDe); }
				if(titleNative && Settings.get(['checked_notes','native_title'])) { notes.push(titleNative); }
				if(season && Settings.get(['checked_notes','season'])) { notes.push(season); }
				if(year && Settings.get(['checked_notes','year'])) { notes.push(year); }
				if(studios && Settings.get(['checked_notes','studio'])) { notes.push(studios); }
				if(producers && Settings.get(['checked_notes','producers'])) { notes.push(producers); }
				if(licensors && Settings.get(['checked_notes','licensors'])) { notes.push(licensors); }
				if(serializations && Settings.get(['checked_notes','serialization'])) { notes.push(serializations); }
				if(genres && Settings.get(['checked_notes','genres'])) { notes.push(genres); }
				if(themes && Settings.get(['checked_notes','themes'])) { notes.push(themes); }
				if(demographic && Settings.get(['checked_notes','demographic'])) { notes.push(demographic); }
				if(authors && Settings.get(['checked_notes','authbors'])) { notes.push(authors); }
				if(Settings.get(['checked_notes','aired'])) { notes.push(airedTag); }
				if(Settings.get(['checked_notes','published'])) { notes.push(publishedTag); }
				if(Settings.get(['checked_notes','score'])) { notes.push(scoreTag); }
				if(Settings.get(['checked_notes','rank'])) { notes.push(rankTag); }
				if(Settings.get(['checked_notes','popularity'])) { notes.push(popularityTag); }
				if(Settings.get(['checked_notes','rating'])) { notes.push(ratingTag); }
				if(Settings.get(['checked_notes','duration'])) { notes.push(durationTag); }
				if(Settings.get(['checked_notes','total_duration'])) { notes.push(totalDurationTag); }
				if(Settings.get(['checked_notes','synopsis'])) { notes.push(synopsis); }

				let notesStr = notes.join("\n\n");
				let notesRequestUrl = '';
				let notesRequestDict = {
					"comments": notesStr,
					"status": thisData['status'],
					"csrf_token": List.csrf
				};

				if(List.isAnime) {
					notesRequestDict['anime_id'] = id;
					notesRequestUrl = 'https://myanimelist.net/ownlist/anime/edit_convert.json';
				} else {
					notesRequestDict['manga_id'] = id;
					notesRequestUrl = 'https://myanimelist.net/ownlist/manga/edit_convert.json';
				}

				let notesRequestContent = JSON.stringify(notesRequestDict);

				let headerData = new Headers();
				headerData.append('X-Requested-With', 'XMLHttpRequest');
			
				await fetch(notesRequestUrl, {
					method: "POST",
					headers: headerData,
					body: notesRequestContent
				})
				.then(response => {
					if(!response.ok)
					{
						throw new Error(`${List.type} #${id}: Failed update notes.`);
					}
					return true;
				})
				.catch(error => {
					Log.error(error);
					return false;
				});
			}
			
			/* thumbs */
			try
			{
				img = $(doc).find('img[itemprop="image"]')[0];
				imgUrl = img.getAttribute("data-src") || img.src;
				
				imgUrlt = imgUrl.replace(".jpg", "t.jpg");
				imgUrlv = imgUrl.replace(".jpg", "v.jpg");
				imgUrll = imgUrl.replace(".jpg", "l.jpg");
			}
			catch(e)
			{
				imgUrl = imgUrlt = imgUrlv = imgUrll = 'none';
				Log.warn(`${List.type} #${id}: no image found`);
			}
			
			/* Generate CSS */
			cssLine = Settings.get(['css_template'])
				.replaceAll('[DEL]', '')
				.replaceAll('[ID]', id)
				.replaceAll('[TYPE]', List.type)
				.replaceAll('[IMGURL]', imgUrl)
				.replaceAll('[IMGURLT]', imgUrlt)
				.replaceAll('[IMGURLV]', imgUrlv)
				.replaceAll('[IMGURLL]', imgUrll)
				.replaceAll('[TITLE]', title)
				.replaceAll(/(\[TITLEEN\]|\[TITLEENG\]|\[ENGTITLE\])/g, titleEn)
				.replaceAll('[TITLEFR]', titleFr ? titleFr : title)
				.replaceAll('[TITLEES]', titleEs ? titleEs : title)
				.replaceAll('[TITLEDE]', titleDe ? titleDe : title)
				.replaceAll('[TITLERAW]', titleNative ? titleNative : "")
				.replaceAll('[GENRES]', genres ? genres.join(", ") : "")
				.replaceAll('[THEMES]', themes ? themes.join(", ") : "")
				.replaceAll('[DEMOGRAPHIC]', demographics ? demographics.join(", ") : "")
				.replaceAll('[STUDIOS]', studios ? studios.join(", ") : "")
				.replaceAll('[PRODUCERS]', producers ? producers.join(", ") : "")
				.replaceAll('[LICENSORS]', licensors ? licensors.join(", ") : "")
				.replaceAll('[SERIALIZATION]', serializations ? serializations.join(", ") : "")
				.replaceAll('[AUTHORS]', authors ? authors.join(" & ") : "")
				.replaceAll('[SEASON]', season)
				.replaceAll('[YEAR]', year)
				.replaceAll('[RANK]', rank)
				.replaceAll(/\[POPULARITY\]|\[POP\]/g, popularity)
				.replaceAll('[SCORE]', score)
				.replaceAll('[STARTDATE]', startDate)
				.replaceAll('[ENDDATE]', endDate)
				.replaceAll('[RATING]', rating)
				.replaceAll('[DURATIONEP]', duration)
				.replaceAll('[DURATIONTOTAL]', totalDuration)
				.replaceAll('[DESC]', synopsisCss);
			
			cssComponent.write(cssLine);
		}
		catch(e)
		{
			Log.error(`${List.type} #${id}: ${e}`);
		}
		
		continueProcessing();
	}

	function continueProcessing( ){
		iteration++;
		
		/* update variables */

		percent = iteration / newData.length * 100 || 0;

		if( iteration === 0 ){
			timeThen = performance.now() - Settings.get(['delay']);
		}
		timeSince = performance.now() - timeThen;
		timeThen = performance.now();
		idsRemaining = newData.length - iteration;

		/* update UI */

		Status.estimate(idsRemaining, timeSince);
		Status.update(`Processed ${iteration} of ${newData.length}`, 'working', percent);
		
		if( iteration >= newData.length ){
			finishProcessing();
			return;
		}
		timeout = setTimeout(processItem, Settings.get(['delay']));
	}

	function finishProcessing( ){
		Worker.running = false;
		window.removeEventListener('beforeunload', warnUserBeforeLeaving);

		/* temporary true values until modules are implemented into runtime */
		buildResults( true, true, true, newData.length );

		if( cssComponent.result.length > 0 ){
			store.set(`last_${List.type}_run`, cssComponent.result);
		}
		Worker.$actionBtn.val('Open Results');
		Worker.$actionBtn.off();
		Worker.$actionBtn.on('click',()=>{
			buildResults( true, true, true, newData.length );
		});
		Status.update(`Completed with ${Log.errorCount} errors`, 'good', 100);
		Status.estimate();
		for( let $btn of Worker.reenableAfterDone ){
			$btn.removeAttr('disabled');
		}
	}

	var imagesTotal = 0;
	var imagesDone = 0;
	var imageDelay = 50;

	function updateImageStatus( ){
		imagesDone++;
		let imagesRemaining = imagesTotal - imagesDone;
		let percent = imagesDone / imagesTotal * 100 || 0;
		Status.update(`Validating images (${imagesDone} of ~${imagesTotal})...`, 'working', percent);
		Status.estimate(imagesRemaining, imageDelay);
	}

	async function beginProcessing( ){
		Worker.running = true;
		cssComponent.write(`\/*\nGenerated by MyAnimeList-Tools v${ver}\nhttps://github.com/ValerioLyndon/MyAnimeList-Tools\n\nTemplate=${Settings.get(['css_template']).replace(/\*\//g, "*[DEL]/")}\nMatchTemplate=${Settings.get(['match_template'])}\n*\/\n`);
		Settings.save();
		window.addEventListener('beforeunload', warnUserBeforeLeaving);

		if( Settings.get(['live_preview']) ){
			let previewText = new Textarea(false, 'CSS Output', {'readonly':'readonly'}, 12);
			cssComponent.$preview = previewText.$box;
			UI.newWindow(previewText.$main);
		}

		for( let $btn of Worker.disableWhileRunning ){
			$btn.attr('disabled','disabled');
		}

		Worker.$actionBtn.val('Stop');
		Worker.$actionBtn.one('click', ()=>{
			$actionBtn.val('Stopping...');
			newData = [];
			clearTimeout(timeout);
			finishProcessing();
		});
		let categories = [];
		for([categoryId, check] of Object.entries(Settings.get(['checked_categories'])))
		{
			if(check.checked)
			{
				categories.push(parseInt(categoryId));
			}
		}

		let beforeProcessing = [];

		/* get last run */
		let useLastRun = Settings.get(['use_last_run']);
		let lastRun = store.get(`last_${List.type}_run`);
		let customRun = store.get(`manual_${List.type}_run`);
		let chosenRun = useLastRun === 'yes' && lastRun ?
			lastRun :
			useLastRun === 'custom' && customRun ?
				customRun :
				'';

		let oldLines = chosenRun.replace(/\/\*[\s\S]*?Generated by MyAnimeList-Tools[\s\S]*?\*\/\s+/,', ').split("\n");
		imagesTotal = oldLines.length;
		Status.update(`Checking your input for matches...`, 'working', 0);

		for( let i = 0; i < ListItems.data.length; i++ ){
			let item = ListItems.data[i];
			let id = item[`${List.type}_id`];
			
			/* Skip item if category does not match selected user options */
			if( Settings.get(['select_categories']) ){
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
					continue;
				}
			}


			/* Check old CSS for any existing lines so they can be skipped later. */
			let lineExists;
			let lineText;
			for( let j = 0; j < oldLines.length; j++ ){
				lineText = oldLines[j];
				let match = Settings.get(['match_template']).replaceAll(/\[ID\]/g, id).replaceAll(/\[TYPE\]/g, List.type);
				lineExists = lineText.indexOf(match) === -1 ? false : true;
				if( lineExists ){
					break;
				}
			}

			/* Add to processing list or skip any existing lines.
			If validating old images, that step will also occur here. */
			if( lineExists ){
				if( Settings.get(['use_last_run']) && Settings.get(['check_existing']) ){
					let imgUrl = lineText.match(/http.*?\.(?:jpe?g|webp)/);
					if( imgUrl.length === 0 ){
						newData.push(item);
						imagesTotal--;
						continue;
					}

					/* Validate image by loading it in the HTML */
					let imageLoad = new Promise((resolve)=>{
						let tempImg = document.createElement('img');
						tempImg.addEventListener('load', ()=>{
							cssComponent.write(lineText);
							updateImageStatus();
							resolve(true);
						});
						tempImg.addEventListener('error', ()=>{
							newData.push(item);
							updateImageStatus();
							resolve(false);
						});
						tempImg.src = imgUrl;
					});

					/* Add to Promise stack to await resolution */
					beforeProcessing.push(imageLoad);
					/* Add delay to prevent image loading spam */
					await sleep(imageDelay);
				}
				else {
					cssComponent.write(lineText);
				}
			}
			/* If not in existing, add to list for processing */
			else {
				imagesTotal--;
				newData.push(item);
			}
		}

		/* Start processing items */
		Promise.allSettled(beforeProcessing)
		.then(()=>{
			continueProcessing();
		})
	}
};

function buildGlobalSettings( ){
	let popupUI = new SubsidiaryUI(UI, 'Global Settings', 'These settings apply to all components, where applicable.');

	let delay = new Field(['delay'], 'Delay between items:', 'Delay (ms) between requests to avoid spamming the server.', 'inline');
	delay.$box.css('width', '50px');

	let $options = $('<div class="l-column o-justify-start">');
	$options.append(
		delay.$main,
		new CheckGroup(['select_categories'], 'Update only specific categories.', 'Want to only update entries in certain categories instead of everything at once?', [
			new Check(['checked_categories', '1'], List.type == 'anime' ? "Watching" : "Reading"),
			new Check(['checked_categories', '2'], "Completed"),
			new Check(['checked_categories', '3'], "On Hold"),
			new Check(['checked_categories', '4'], "Dropped"),
			new Check(['checked_categories', '6'], "Planned")
		]).$main
	);

	popupUI.$window.append($options);
	popupUI.open();
}

function buildCssSettings( ){
	let popupUI = new SubsidiaryUI(UI, 'CSS Generation Settings', 'Automatically generate CSS for use on your list.');

	let $options = $('<div class="l-column">');

	/* Elements */

	let tmpl = new Field(['css_template'], 'Template', 'CSS template.  Replacements are:\n[TYPE], [ID], [IMGURL], [IMGURLT], [IMGURLV], [IMGURLL], [TITLE], [TITLEEN], [TITLEFR], [TITLEES], [TITLEDE], [TITLERAW], [GENRES], [THEMES], [DEMOGRAPHIC], [RANK], [POPULARITY], [SCORE], [SEASON], [YEAR], [STARTDATE], [ENDDATE], and [DESC].\n\nAnime only:\n[STUDIOS], [PRODUCERS], [LICENSORS], [RATING], [DURATIONEP], [DURATIONTOTAL]\n\nManga only:\n[AUTHORS], [SERIALIZATION]');
	tmpl.$main.addClass('c-option--max');

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
	let text = new Textarea(false, 'Manage Last Run', {}, 20);
	if( previous ){
		text.$box.text(previous);
	}
	text.$box.on('input', ()=>{
		store.set(key, text.$box.val());
	});

	let drawer = new Drawer(
		[
			text.$main,
			$parseBtn,
			new Paragraph('The program will use the Match Template to find and skip any duplicate entries from this text area, which will speed up process times. This text area will be automatically updated with the last run every time you use the tool. If want to wipe this data or you have a different run output you want to use, you can freely override or make edits to this text.'),
			validate.$main
		],
		Settings.get(['use_last_run']) === true
	);

	/* Structure */

	$options.append(
		new Paragraph('For premade templates and help creating your own, see the <a href="https://myanimelist.net/forum/?topicid=1905478" target="_blank">forum thread</a>.'),
		tmpl.$main,
		matchTmpl.$main,
		new Check(['live_preview'], 'Live preview', 'Outputs lines to the UI as the tool works. Useful for confirming things are working before you step away, but may cause extra system load.').$main,
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
	field.$box.attr('placeholder', '{css:"",template:"","match_template:""}');
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
					popupUI.destruct();
				}
			});
		}
	});

	/* Structure */

	$form.append(
		$blurb,
		field.$main,
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
	tmplField.$box.val(Settings.get(['css_template']));
	let matchField = new Field(false, 'Match Template');
	matchField.$box.val(Settings.get(['match_template']));
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

	$row.append(
		$button,
		outputField.$main
	);
	$form.append(
		new Paragraph('CSS designers can use this to create a template for others to quickly import. The template and match template are required, but you may leave the CSS Styling field blank if desired.'),
		tmplField.$main,
		matchField.$main,
		cssField.$main,
		$row
	);
	popupUI.$window.append($form);

	popupUI.open();
}

function generateChecks( tagsNotNotes ){
	let checked = tagsNotNotes ? 'checked_tags' : 'checked_notes';
	let arr = [
		new Check([checked, 'english_title'], "English title"),
		new Check([checked, 'french_title'], "French title"),
		new Check([checked, 'spanish_title'], "Spanish title"),
		new Check([checked, 'german_title'], "German title"),
		new Check([checked, 'native_title'], "Native title"),
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

	/* Elements */
	
	let $options = $('<div class="l-column o-justify-start">');
	let $checkGrid = $('<div class="c-check-grid">');
	let checks = generateChecks(true);
	let $blurb = new Paragraph('Enable options here to automatically add them to your tags. Please <a href="https://myanimelist.net/panel.php?go=export" target="_blank">export</a> a copy of your list first if you have any tags you wish to keep as this action can be highly destructive.');

	/* Structure */
	
	for( let chk of checks ){
		$checkGrid.append(chk.$main);
	}
	$options.append(
		new Check(['clear_tags'], "Overwrite Current Tags", "Overwrite all of your current tags with the new ones. If all other tag options are unchecked, this will completely remove all tags.\n\nDO NOT use this if you have any tags you want to keep.").$main,
		$blurb,
		$checkGrid
	);
	popupUI.$window.append($options);

	popupUI.open();
}

function buildNoteSettings( ){
	let popupUI = new SubsidiaryUI(UI, 'Note Updater Settings', 'Automatically add info to your notes.');

	/* Elements */

	let $options = $('<div class="l-column o-justify-start">');
	let $checkGrid = $('<div class="c-check-grid">');
	let checks = generateChecks(false);
	checks.push(new Check(['checked_notes', 'synopsis'], "Synopsis"));
	let $blurb = new Paragraph('Enable options here to automatically add them to your notes/comments. THIS ACTION WILL WIPE YOUR NOTES. Please <a href="https://myanimelist.net/panel.php?go=export" target="_blank">export</a> a copy of your list first if you have any notes you wish to keep.');

	/* Structure */
	
	for( let chk of checks ){
		$checkGrid.append(chk.$main);
	}
	$options.append(
		$blurb,
		$checkGrid
	);
	popupUI.$window.append($options);

	popupUI.open();
}

function buildResults( css, tags, notes, count ){
	let popupUI = new SubsidiaryUI(UI, 'Job\'s Done!');
	popupUI.nav.$right.append(
		new Button('Exit')
		.on('click', ()=>{
			popupUI.destruct();
			UI.destruct();
		})
	);

	let $info = $('<div class="l-column">');

	let helpText = `Some updates were likely successful, especially if the error rate is low.\n\nBefore seeking help, try refreshing your list page and rerunning the tool to fix these errors.`;
	let resultText = 'Tool completed with no issues.';
	let errorPercent = Log.errorCount / count * 100;
	if( Log.errorCount < 1 && Log.warningCount > 0 ){
		resultText = `Tool completed with ${Log.warningCount} warning(s).\n\nIt is likely that all updates were successful. However, if you notice missing images, try running the tool again.`;
	}
	else if( Log.errorCount > 0 && Log.warningCount < 1 ){
		resultText = `Tool completed with ${Log.errorCount} error(s).\n\nOut of ${count} processsed items, that represents a ${errorPercent}% error rate. ${helpText}`;
	}
	else if( Log.errorCount > 0 && Log.warningCount > 0 ){
		resultText = `Tool completed with ${Log.errorCount} error(s) and ${Log.warningCount} warning(s).\n\nOut of ${iteration} processsed items, that represents a ${errorPercent}% error rate. ${helpText}`;
	}
	$info.append(new Paragraph(resultText));

	if( tags || notes ){
		$info.append(new Paragraph('Changes to tags or notes require a page refresh to display.'));
	}

	if( css ){
		let cssRow = new SplitRow();
		cssRow.$left.append(new Header('CSS Output').$main);
		cssRow.$right.append(
			new Button('Copy to Clipboard')
			.on('click', ()=>{
				output.$box.trigger('select');
				navigator.clipboard.writeText(output.$box.val());
			})
		);
		let output = new Textarea(false, '', {'readonly':'readonly'}, 20);
		output.$box.val(cssComponent.result);
		$info.append(
			cssRow.$main,
			output.$main
		);
	}

	popupUI.$window.append($info);

	popupUI.open();
}

/* Add "Tools" button to list */

if( List.isOwner ){
	let button = $('<a href="javascript:void(0);">Tools</a>')
	.on('click',()=>{
		if( UI && UI.alive ){
			UI.open();
		}
		else {
			initialise();
		}
	});

	if( List.isModern ){
		button.addClass('icon-menu');
		button.html(`
			<svg class="icon burnt-trigger-icon" xmlns="http://www.w3.org/2000/svg" height="20px" viewBox="0 0 512 512"><!--! Font Awesome Free 6.4.0 by @fontawesome - https://fontawesome.com License - https://fontawesome.com/license (Commercial License) Copyright 2023 Fonticons, Inc. --><path d="M78.6 5C69.1-2.4 55.6-1.5 47 7L7 47c-8.5 8.5-9.4 22-2.1 31.6l80 104c4.5 5.9 11.6 9.4 19 9.4h54.1l109 109c-14.7 29-10 65.4 14.3 89.6l112 112c12.5 12.5 32.8 12.5 45.3 0l64-64c12.5-12.5 12.5-32.8 0-45.3l-112-112c-24.2-24.2-60.6-29-89.6-14.3l-109-109V104c0-7.5-3.5-14.5-9.4-19L78.6 5zM19.9 396.1C7.2 408.8 0 426.1 0 444.1C0 481.6 30.4 512 67.9 512c18 0 35.3-7.2 48-19.9L233.7 374.3c-7.8-20.9-9-43.6-3.6-65.1l-61.7-61.7L19.9 396.1zM512 144c0-10.5-1.1-20.7-3.2-30.5c-2.4-11.2-16.1-14.1-24.2-6l-63.9 63.9c-3 3-7.1 4.7-11.3 4.7H352c-8.8 0-16-7.2-16-16V102.6c0-4.2 1.7-8.3 4.7-11.3l63.9-63.9c8.1-8.1 5.2-21.8-6-24.2C388.7 1.1 378.5 0 368 0C288.5 0 224 64.5 224 144l0 .8 85.3 85.3c36-9.1 75.8 .5 104 28.7L429 274.5c49-23 83-72.8 83-130.5zM56 432a24 24 0 1 1 48 0 24 24 0 1 1 -48 0z"/></svg>
			<span class="text">Tools</span>
		`);
		$('.list-menu-float').append(button);
	}
	else {
		$('#mal_cs_otherlinks div:last-of-type').append(button);
	}

	$('head').append($('<style>').text(`
		.burnt-trigger-icon {
			top: 15px;
			left: 15px;
		}
	`));
}