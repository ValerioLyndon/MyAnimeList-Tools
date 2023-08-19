/* functionality vars */

function isDict( unknown ){
	return (unknown instanceof Object && !(unknown instanceof Array)) ? true : false;
}

var Log = new class Logger {
	constructor( parent = null ){
		this.parent = parent;
		this.errorCount = 0;
		this.warningCount = 0;
	}

	createMsgBox( msg = '', type = 'ERROR' ){
		let errorBox = document.createElement('div');
		errorBox.className = 'log-line';
		errorBox.insertAdjacentHTML('afterbegin', `<b>[${type}]</b> ${msg}`);
		if( this.parent instanceof HTMLElement ){
			this.parent.append(errorBox);
		}
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

var List = new class ListInfo {
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

var Settings = new class {
	settings = {
		"select_categories": false,
		"checked_categories": {
			"1": false,
			"2": false,
			"3": false,
			"4": false,
			"6": false
		},
		"css_template": "/* [TITLE] *[DEL]/ .data.image a[href^=\"/[TYPE]/[ID]/\"]::before { background-image: url([IMGURL]); }",
		"delay": "3000",
		"match_template": "/[TYPE]/[ID]/",
		"check_existing": false,
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
		"live_preview": false
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

	get( keys, dict = this.settings ){
		let key = keys.shift(); /* removes and returns first object */
		let value = dict[key];
		if( keys.length > 0 && isDict(value) ){
			return this.get(keys, value);
		}
		return value; /* returns undefined if key is not found */
	}

	set( keys, value, dict = this.settings ){
		let key = keys.shift();
		if( keys.length > 0 ){
			dict[key] = isDict(dict[key]) ? dict[key] : {};
			dict[key] = this.set( keys, value, dict[key] );
		}
		else {
			dict[key] = value;
		}
		return dict;
	}

	save( ){
		store.set(`${List.type}_settings`, this.settings);
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
	#attachmentPoint = document.createElement('div');
	#shadowRoot = this.#attachmentPoint.attachShadow({mode: 'open'});
	content = document.createElement('div');
	dead = false;

	constructor( ){
		this.#shadowRoot.append(this.content);
		document.body.append(this.#attachmentPoint);

		this.close();
		this.style(`
			.root {
				display: contents;
			}
			.root.is-closed {
				visibility: hidden;
				pointer-events: none;
			}
		`);
		this.style(`
/*<<<css>>>*/
		`);
	}

	open( ){
		this.content.className = 'root is-open';
	}

	close( ){
		this.content.className = 'root is-closed';
	}

	destruct( ){
		this.#attachmentPoint.remove();
		this.dead = true;
	}

	style( css ){
		let html = document.createElement('style');
		html.className = 'css';
		html.textContent = css;
		this.content.append(html);
		return html;
	}
}
var UI;

function warnUserBeforeLeaving( e ){
	e.preventDefault();
	return (e.returnValue = "");
}

function main() {
	List.determineStyle();
	UI = new UserInterface();

	var output = '';

	function write( newText ){
		output += newText;
		if( writeToOutput.is(':checked') ){
			result.value = output;
			result.scrollTop = result.scrollHeight;
		}
	}

	/* TOOL CODE */

	/* Create GUI */

	UI.open();

	let gui = document.createElement("main");
	gui.className = 'popup main';

	let bg = document.createElement('div');
	bg.className = 'dim-background';
	let overlay = bg.cloneNode(true);

	UI.content.append(bg);
	UI.content.append(gui);

	let sidebar = document.createElement('div');
	sidebar.className = 'main__sidebar';
	gui.append(sidebar);

	let workspace = document.createElement('div');
	workspace.className = 'main__workspace';
	gui.append(workspace);

	let guiB = document.createElement('div');
	guiB.id = 'logs';
	gui.append(guiB);
	Log.parent = guiB;

	let actionBtn = document.createElement("input");
	sidebar.append(actionBtn);
	actionBtn.classList.add('btn');
	actionBtn.type = "button";
	actionBtn.value = "Loading...";
	actionBtn.disabled = 'disabled';
	actionBtn.onclick = ()=>{ beginProcessing(); };

	let closeBtn = $('<input value="Minimise" class="btn" type="button" title="Closes the program window while it keeps running in the background.">')
	.on('click',()=>{
		UI.close();
	});
	$(sidebar).append(closeBtn);

	let hideBtn = $('<input id="hideBtn" class="btn" type="button" value="Hide" title="Hide the status bar. The program will keep running in the background." />')
	.on('click',()=>{
		gui.classList.add('is-hidden');
	});
	$(sidebar).append(hideBtn);

	let exitBtn = document.createElement("input");
	sidebar.append(exitBtn);
	exitBtn.classList.add('btn');
	exitBtn.type = "button";
	exitBtn.value = "Exit";
	exitBtn.title = 'Completely exit the program.';
	exitBtn.onclick = ()=>{ UI.destruct(); };

	statusBar = document.createElement("div");
	statusBar.className = "status";
	statusBar.onclick = ()=>{
		UI.open();
	};
	sidebar.append(statusBar);

	statusText = document.createElement('span');
	statusText.textContent = 'Setting up...';
	statusBar.style.cssText = '--percent: 20%; --colour: var(--stat-loading);';
	statusBar.append(statusText);

	timeText = document.createElement('span');
	timeText.className = 'status__time';
	statusBar.append(timeText);

	function field(setting, title, desc, parent = cssGroup) {
		lbl = document.createElement('label');
		lbl.textContent = title;
		lbl.className = 'label';

		input = document.createElement('input');
		input.type = 'text';
		input.value = Settings.get(setting);
		input.title = desc;
		input.className = 'field';
		input.spellcheck = false;
		input.addEventListener('input', ()=>{
			Settings.set(setting, input.value);
		});

		lbl.append(input);
		$(parent).append(lbl);
		return input;
	}

	function chk(setting, title, parent = sidebar, desc = false) {
		let lbl = document.createElement('label');
		lbl.textContent = title;
		if(desc) {
			lbl.title = desc;
		}
		lbl.className = 'chk';

		let chk = document.createElement("input");
		chk.type = "checkbox";
		chk.checked = Settings.get(setting);
		chk.addEventListener('input', ()=>{
			Settings.set(setting, chk.checked);
		});

		lbl.prepend(chk);
		$(parent).append(lbl);
		return chk;
	}


	/* Options section */

	$(sidebar).append($('<hr><b class="group-title">Global Options</b>'));
	let globalGroup = $('<div class="group"></div>');
	$(sidebar).append(globalGroup);

	delay = field(['delay'], "Delay between items", "Delay (ms) between requests to avoid spamming the server.", globalGroup);
	delay.style.width = "50px";

	chkCategory = chk(['select_categories'], "Update only specific categories.", globalGroup, 'Want to only update entries in certain categories instead of everything at once?');
	chkCategory.addEventListener('input', () => { toggleChks(chkCategory, categoryDrawer); });

	let categoryDrawer = $('<div class="drawer"></div>');
	$(globalGroup).append(categoryDrawer);

	chk(['checked_categories', '1'], List.type == 'anime' ? "Watching" : "Reading", categoryDrawer);
	chk(['checked_categories', '2'], "Completed", categoryDrawer);
	chk(['checked_categories', '3'], "On Hold", categoryDrawer);
	chk(['checked_categories', '4'], "Dropped", categoryDrawer);
	chk(['checked_categories', '6'], "Planned", categoryDrawer);


	/* CSS Options */

	$(sidebar).append($('<hr><b class="group-title">CSS Options</b>'));
	let cssGroup = $('<div class="group"></div>');
	$(sidebar).append(cssGroup);

	template = field(['css_template'], "Template", "CSS template.  Replacements are:\n[TYPE], [ID], [IMGURL], [IMGURLT], [IMGURLV], [IMGURLL], [TITLE], [TITLEEN], [TITLEFR], [TITLEES], [TITLEDE], [TITLERAW], [GENRES], [THEMES], [DEMOGRAPHIC], [RANK], [POPULARITY], [SCORE], [SEASON], [YEAR], [STARTDATE], [ENDDATE], and [DESC].\n\nAnime only:\n[STUDIOS], [PRODUCERS], [LICENSORS], [RATING], [DURATIONEP], [DURATIONTOTAL]\n\nManga only:\n[AUTHORS], [SERIALIZATION]");
	matchTemplate = field(['match_template'], "Match Template", "Line matching template for reading previously generated code. Should match the ID format of your template. Only matching on [ID] is not enough, include previous/next characters to ensure the match is unique.");

	function toggleChks( checkbox, drawerSelector ){
		if( checkbox.checked ){
			$(gui).find(drawerSelector).removeClass('is-closed');
		}
		else {
			$(gui).find(drawerSelector).addClass('is-closed');
		}
	}

	chk(['check_existing'], "Validate existing images", cssGroup, "Attempt to load all images, updating the url if it fails. There is a 5 second delay to allow images to load. Not recommended while adding new anime or updating tags!");

	$(cssGroup).append($('<div class="spacer"></div>'));

	/* Import/Export section */

	importBtn = $('<input type="button" value="Import Template" class="btn" title="Import a CSS template to get started quickly.">');
	importBtn.on('click',()=>{
		$(gui).append(overlay);

		importOverlay = $(`
			<div class="popup popup--small">
				<p class="paragraph">
					Input a template here. This will update the tool settings and may add some additional code to your MAL Custom CSS. You may wish to backup your Custom CSS before doing this.
				</p>

				<label class="label">
					<input class="field" id="import-field" type="text" spellcheck="false"></input>
				</label>

				<br />

				<input id="import-btn" type="button" value="Import" class="btn">
				<input id="close" type="button" value="Close" class="btn">
			</div>
		`);

		$(gui).append(importOverlay);

		$(importOverlay).find('#import-btn').on('click',()=>{
			value = $(importOverlay).find('#import-field').val();

			if(value.length < 1)
			{
				alert('Nothing detected in import field.');
			}
			else
			{
				try
				{
					importedTemplate = JSON.parse(value);

					if(!("template" in importedTemplate) || !("matchtemplate" in importedTemplate))
					{
						alert(`Import failed due to incorrect syntax or missing information.`);
					}
					else
					{
						let cssToImport = 'css' in importedTemplate ? importedTemplate['css'] : false;
						setTemplate(importedTemplate['template'], importedTemplate['matchtemplate'], cssToImport);
						importOverlay.remove();
						overlay.remove();
					}
				}
				catch(e)
				{
					alert(`Import failed. If you are using an official template, report this problem to the developer with the following information.\n\nError message for reference:\n${e}\n\nValue for reference:\n${value}`);
				}
			}
		});
		
		$(importOverlay).find('#close').on('click',()=>{
			importOverlay.remove();
			overlay.remove();
		});
	});
	$(cssGroup).append(importBtn);

	exportBtn = $('<input type="button" value="Export" class="btn" title="Create a CSS template for others to use.">');
	exportBtn.on('click',()=>{
		$(gui).append(overlay);

		exportOverlay = $(`
			<div class="popup popup--small">
				<p class="paragraph">
					CSS designers can use this to create a template for others to quickly import. The template and match template are required, but you may leave the CSS Styling field blank if desired.
				</p>
				
				<label class="label">
					Template
					<input class="field" id="export-template" type="text" spellcheck="false"></input>
				</label>
				
				<label class="label">
					Match Template
					<input class="field" id="export-match" type="text" spellcheck="false"></input>
				</label>
				
				<label class="label">
					CSS Styling
					<textarea class="field" id="export-css" type="text" spellcheck="false" style="resize: vertical; height: 150px;"></textarea>
				</label>
				
				<label class="label">
					<input class="field" id="export" type="text" placeholder="Template will be generated here and copied to your clipboard." readonly="readonly">
				</label>

				<br />

				<input class="btn" id="export-btn" type="button" value="Generate Template" title="Generates text and copies to your clipboard.">
				<input class="btn" id="close" type="button" value="Close">
			</div>
		`);
		$(gui).append(exportOverlay);

		$(exportOverlay).find('#export-template').val(Settings.get('css_template'));
		$(exportOverlay).find('#export-match').val(Settings.get(['match_template']));

		$(exportOverlay).find('#export-btn').on('click',()=>{
			let newTemplate = $(exportOverlay).find('#export-template').val();
			let newMatchTemplate = $(exportOverlay).find('#export-match').val();

			if(newTemplate.length < 1 || newMatchTemplate < 1)
			{
				alert('Please fill out both the Template and Match Template fields.');
			}
			else
			{
				let createdTemplate = {
					"template": newTemplate,
					"matchtemplate": newMatchTemplate
				};
				let css = $(exportOverlay).find('#export-css').val();
				if(css.trim().length > 0)
				{
					createdTemplate['css'] = css;
				}
				let exportField = $(exportOverlay).find('#export');
				exportField.val(JSON.stringify(createdTemplate));
				
				exportField.trigger('select');
				navigator.clipboard.writeText(exportField.text());
			}
		});
		
		$(exportOverlay).find('#close').on('click',()=>{
			exportOverlay.remove();
			overlay.remove();
		});
	});
	$(cssGroup).append(exportBtn);

	/* CHECK BOXES - TAGS/NOTES */

	$(sidebar).append($('<b class="group-title">Tag Options</b>'));
	let tagGroup = $('<div class="group"></div>');
	$(sidebar).append(tagGroup);

	chkTags = chk(['update_tags'], "Update Tags", tagGroup, 'Update your tags with the new information.');

	chkTags.addEventListener('input', () => { toggleChks(chkTags,tagDrawer); });

	let tagDrawer = $('<div class="drawer"></div>');
	$(tagGroup).append(tagDrawer);

	chk(['checked_tags', 'english_title'], "English title", tagDrawer);
	chk(['checked_tags', 'french_title'], "French title", tagDrawer);
	chk(['checked_tags', 'spanish_title'], "Spanish title", tagDrawer);
	chk(['checked_tags', 'german_title'], "German title", tagDrawer);
	chk(['checked_tags', 'native_title'], "Native title", tagDrawer);
	chk(['checked_tags', 'season'], "Season", tagDrawer);
	chk(['checked_tags', 'year'], "Year", tagDrawer);
	chk(['checked_tags', 'genres'], "Genres", tagDrawer);
	chk(['checked_tags', 'themes'], "Themes", tagDrawer);
	chk(['checked_tags', 'demographic'], "Demographic", tagDrawer);
	chk(['checked_tags', 'score'], "Score", tagDrawer);
	chk(['checked_tags', 'rank'], "Rank", tagDrawer);
	chk(['checked_tags', 'popularity'], "Popularity", tagDrawer);
	if( List.isAnime ){
		chk(['checked_tags', 'studio'], "Studio", tagDrawer);
		chk(['checked_tags', 'producers'], "Producers", tagDrawer);
		chk(['checked_tags', 'licensors'], "Licensors", tagDrawer);
		chk(['checked_tags', 'aired'], "Aired", tagDrawer);
		chk(['checked_tags', 'rating'], "Rating", tagDrawer);
		chk(['checked_tags', 'duration'], "Duration (Episode)", tagDrawer);
		chk(['checked_tags', 'total_duration'], "Duration (Total)", tagDrawer);
	}
	else {
		chk(['checked_tags', 'published'], "Published", tagDrawer);
		chk(['checked_tags', 'authors'], "Authors", tagDrawer);
		chk(['checked_tags', 'serialization'], "Serialization", tagDrawer);
	}


	$(sidebar).append($('<b class="group-title">Note Options</b>'));
	let noteGroup = $('<div class="group"></div>');
	$(sidebar).append(noteGroup);

	chkNotes = chk(['update_notes'], "Update Notes", noteGroup, 'Update your comments/notes section with the new information.');

	chkNotes.addEventListener('input', () => {
		if(chkNotes.checked) {
			alert('Be warned! This setting will *entirely overwrite* your current notes. Do not use if you want to keep your notes.');
		}
		toggleChks(chkNotes,notesDrawer);
	});

	$(gui).find(tagDrawer).append($('<br />'));
	chk(['clear_tags'], "Overwrite current tags", tagDrawer, "Overwrite all of your current tags with the new ones. If all other tag options are unchecked, this will completely remove all tags.\n\nDO NOT use this if you have any tags you want to keep.");

	let notesDrawer = $('<div class="drawer"></div>');
	$(noteGroup).append(notesDrawer);

	chk(['checked_notes', 'synopsis'], "Synopsis", notesDrawer);
	chk(['checked_notes', 'english_title'], "English title", notesDrawer);
	chk(['checked_notes', 'french_title'], "French title", notesDrawer);
	chk(['checked_notes', 'spanish_title'], "Spanish title", notesDrawer);
	chk(['checked_notes', 'german_title'], "German title", notesDrawer);
	chk(['checked_notes', 'native_title'], "Native title", notesDrawer);
	chk(['checked_notes', 'season'], "Season", notesDrawer);
	chk(['checked_notes', 'year'], "Year", notesDrawer);
	chk(['checked_notes', 'genres'], "Genres", notesDrawer);
	chk(['checked_notes', 'themes'], "Themes", notesDrawer);
	chk(['checked_notes', 'demographic'], "Demographic", notesDrawer);
	chk(['checked_notes', 'score'], "Score", notesDrawer);
	chk(['checked_notes', 'rank'], "Rank", notesDrawer);
	chk(['checked_notes', 'popularity'], "Popularity", notesDrawer);
	if( List.isAnime ){
		chk(['checked_notes', 'studio'], "Studio", notesDrawer);
		chk(['checked_notes', 'producers'], "Producers", notesDrawer);
		chk(['checked_notes', 'licensors'], "Licensors", notesDrawer);
		chk(['checked_notes', 'aired'], "Aired", notesDrawer);
		chk(['checked_notes', 'rating'], "Rating", notesDrawer);
		chk(['checked_notes', 'duration'], "Duration (Episode)", notesDrawer);
		chk(['checked_notes', 'total_duration'], "Duration (Total)", notesDrawer);
	}
	else {
		chk(['checked_notes', 'published'], "Published", notesDrawer);
		chk(['checked_notes', 'authors'], "Authors", notesDrawer);
		chk(['checked_notes', 'serialization'], "Serialization", notesDrawer);
	}

	$(sidebar).append($('<hr>'));

	/* Dark/light mode switch */

	let chosenTheme = store.get('theme');
	if(chosenTheme)
	{
		gui.classList.remove('light', 'dark');
		gui.classList.add(chosenTheme);
	}
	else if(window.matchMedia('(prefers-color-scheme: light)').matches)
	{
		gui.classList.add('light');
	}
	else
	{
		gui.classList.add('dark');
	}

	let switchTheme = $('<input class="btn" type="button" value="Switch Theme">')
	.on('click',()=>{
		let theme = gui.classList.contains('dark') ? 'light' : 'dark';
		gui.classList.remove('light', 'dark');
		gui.classList.add(theme);
		store.set('theme', theme);
	});
	$(sidebar).append(switchTheme);

	/* Settings section */

	clearBtn = $('<input type="button" value="Clear Settings" class="btn" title="Clears any stored settings from previous runs.">');
	if(store.has(`${List.type}_settings`) || store.has(`last_${List.type}_run`))
	{
		clearBtn.on('click',()=>{
			store.remove(`${List.type}_settings`);
			store.remove(`last_${List.type}_run`);
			alert('Please exit and restart the tool to complete the clearing of your settings.');
		});
	}
	else
	{
		clearBtn.attr('disabled', 'disabled');
	}
	$(sidebar).append(clearBtn);

	/* "Copyright" section */

	$(sidebar).append($(`<footer>MyAnimeList-Tools v${ver}<br />Last modified ${verMod}</footer>`));

	/* Textareas */

	textareaL = document.createElement('div');
	textareaL.className = 'in-out';
	workspace.append(textareaL);

	topL = $('<div class="in-out__top"></div>');
	$(textareaL).append(topL);
	$(topL).append($('<b>Input</b>'));

	autofill = $('<input type="button" value="Autofill" class="btn btn-right" title="Autofill the template fields based on any previously generated code found in the input.">')
	.on('click',()=>{
		code = existing.value;

		if(code.length < 1)
		{
			alert('Please insert code into the input field.');
			return;
		}
		if(code.indexOf('*/') === -1)
		{
			alert('Code is missing template information. It is either incorrectly formatted or not generated by this tool.');
			return;
		}

		newTemplate = false;
		newMatchTemplate = false;

		/* Reduce code to first comment block, which should be the tool-generated comment */
		code = code.split('*/')[0];
		codeByLine = code.split('\n');

		for(i = 0; i < codeByLine.length; i++)
		{
			line = codeByLine[i];
			if(line.startsWith('Template='))
			{
				newTemplate = line.substring(9);
			}
			else if(line.startsWith('MatchTemplate='))
			{
				newMatchTemplate = line.substring(14);
			}
		}

		if(newTemplate && newMatchTemplate)
		{
			setTemplate(newTemplate, newMatchTemplate);
		}
		else
		{
			alert('Code is missing template information. It is either incorrectly formatted or not generated by this tool.');
			return;
		}
	});
	$(topL).append(autofill);

	existing = document.createElement("textarea");
	existing.className = 'in-out__text';
	existing.title = "Copy previously generated CSS here. The program will use the Match Template to find and skip any duplicate entries.";
	existing.placeholder = "Copy previously generated CSS here. The program will use the Match Template to find and skip any duplicate entries.";
	existing.spellcheck = false;
	if( store.has(`last_${List.type}_run`) ){
		existing.value = store.get(`last_${List.type}_run`);
	}
	textareaL.append(existing);

	textareaR = document.createElement('div');
	textareaR.className = 'in-out';
	workspace.append(textareaR);

	topR = $('<div class="in-out__top"></div>');
	$(textareaR).append(topR);
	$(topR).append($('<b>Output</b>'));

	copyOutput = $('<input type="button" value="Copy to Clipboard" class="btn btn-right" title="Copies output to clipboard.">');
	$(topR).append(copyOutput);
	copyOutput.on('click',()=>{
		result.select();
		navigator.clipboard.write(output);
	});

	let wrapper = $('<label class="label btn-right">Live Preview</label>');
	$(topR).append(wrapper);
	let writeToOutput = $('<input type="checkbox" value="Live Preview" class="btn" title="Outputs text as it is generated.">');
	wrapper.prepend(writeToOutput);
	if( Settings.get(['live_preview']) ){
		writeToOutput.checked = Settings.get(['live_preview']);
	}
	writeToOutput.on('input', ()=>{
		Settings.set(['live_preview'], writeToOutput.is(':checked'));
	});

	result = document.createElement("textarea");
	result.className = 'in-out__text';
	result.title = "Newly generated CSS will be output here.";
	result.placeholder = "Newly generated CSS will be output here.";
	result.readOnly = "readonly";
	result.spellcheck = false;
	textareaR.append(result);

	toggleChks(chkCategory, categoryDrawer);
	toggleChks(chkTags, tagDrawer);
	toggleChks(chkNotes, notesDrawer);



	/* Common Functions */

	async function setTemplate(newTemplate, newMatchTemplate, newCss = false) {
		template.value = newTemplate;
		Settings.set(['css_template'], newTemplate);
		matchTemplate.value = newMatchTemplate;
		Settings.set(['match_template'], newMatchTemplate);
		if( newCss !== false ){
			if( !List.style ){
				alert('Failed to import CSS: Not able to determine style ID.');
				return false;
			}

			finalCss = List.customCssModified;
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



	/* Get list info and enable buttons once done */

	var data = [];
	var baseUrl = window.location.href.split('?')[0];
	var offset = 0;
	var failures = 0;
	var faildelay = 0;
	var statusPercent = 30;
	function getListItems()
	{
		/* will take a list URL:
		https://myanimelist.net/animelist/Valerio_Lyndon?status=2
		and return:
		https://myanimelist.net/animelist/Valerio_Lyndon/load.json?status=7 */
		dataUrl = `${baseUrl}/load.json?status=7&offset=${offset}`;

		$.getJSON(dataUrl, function(json)
		{
			failures = 0;
			data = data.concat(json);

			if(json.length === 300)
			{
				offset += 300;
				statusText.textContent = `Fetching list data (${offset} of ?)...`;
				statusPercent += 10;
				statusBar.style.cssText = `--percent: ${statusPercent <= 85 ? statusPercent : '85'}%; --colour: var(--stat-loading);`;
				getListItems();
			}
			else
			{
				statusText.textContent = `Successfully loaded ${data.length} items.`;
				statusBar.style.cssText = '--percent: 100%; --colour: var(--stat-loading);';
				actionBtn.value = 'Start';
				actionBtn.removeAttribute('disabled');
			}
		}).fail(()=>
		{
			failures++;
			faildelay += 3000;

			statusText.textContent = `Data fetch failed, retrying in ${faildelay}ms...`;

			if(failures > 3)
			{
				actionBtn.value = 'Failed';
				statusText.textContent = `Failed to fetch list info.`;
				statusBar.style.cssText = '--percent: 100%; --colour: var(--stat-bad);';
				return;
			}

			setTimeout(getListItems, faildelay);
		});
	};
	getListItems();



	/* Primary Functions */

	var iteration = -1;
	var newData = [];
	var percent = 0;
	var timeout;
	var timeThen;
	async function processItem( ){
		let thisData = newData[iteration];
		id = thisData[`${List.type}_id`];
		
		try
		{
			let str = await request(`https://myanimelist.net/${List.type}/${id}`, 'string');
			if( !str ){
				Log.error(`${List.type} #${id}: Failed to get entry information.`);
				continueProcessing();
				return;
			}
			let doc = createDOM(str);
		
			/* get current tags */
			if( !Settings.get(['update_tags']) || Settings.get(['clear_tags']) ){
				tags = [];
			}
			else if( Settings.get(['update_tags']) ){
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
			
			write(cssLine + '\n');
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
		timeRemaining(idsRemaining, newData.length, timeSince);

		/* update UI */

		statusText.textContent = `Processed ${iteration} of ${newData.length}`;
		statusBar.style.cssText = `--percent: ${percent}%; --colour: var(--stat-working);`;
		
		if( iteration >= newData.length ){
			finishProcessing();
			return;
		}
		timeout = setTimeout(processItem, Settings.get(['delay']));
	}

	function finishProcessing( ){
		window.removeEventListener('beforeunload', warnUserBeforeLeaving);

		if(output.length > 0)
		{
			store.set(`last_${List.type}_run`, output);
		}
		result.value = output;
		actionBtn.value = "Done";
		actionBtn.disabled = "disabled";
		statusText.textContent = `Completed with ${Log.errorCount} errors`;
		statusBar.style.cssText = `--percent: ${percent}%; --colour: var(--stat-working);`;
		timeText.textContent = '';
		exportBtn.removeAttr('disabled');
		clearBtn.removeAttr('disabled');
		exitBtn.disabled = false;
		exitBtn.value = "Exit";
		exitBtn.onclick = ()=>
		{
			UI.destruct();
			if(Settings.get(['update_tags']) || Settings.get(['update_notes']))
			{
				alert("Refesh the page for tag and note updates to show.");
			}
			
			errorPercent = Log.errorCount / i * 100;
			if(Log.errorCount < 1 && Log.warningCount > 0)
			{
				alert(`${Log.warningCount} warning(s) occurred while processing.\n\nIt is likely that all updates were successful. However, if you notice missing images, try running the tool again.`);
			}
			else if(Log.errorCount > 0 && Log.warningCount < 1)
			{
				alert(`${Log.errorCount} error(s) occurred while processing.\n\nOut of ${iteration} processsed items, that represents a ${errorPercent}% error rate. Some updates were likely successful, especially if the error rate is low.\n\nBefore seeking help, try refreshing your list page and rerunning the tool to fix these errors, using your updated CSS as input.`);
			}
			else if(Log.errorCount > 0 && Log.warningCount > 0)
			{
				alert(`${Log.errorCount} error(s) and ${Log.warningCount} warning(s) occurred while processing.\n\nOut of ${iteration} processsed items, that represents a ${errorPercent}% error rate. Some updates were likely successful, especially if the error rate is low.\n\nBefore seeking help, try refreshing your list page and rerunning the tool to fix these errors, using your updated CSS as input.`);
			}
		};
	}

	var imagesTotal = 0;
	var imagesDone = 0;
	var imageDelay = 50;

	function updateImageStatus( ){
		imagesDone++;
		let imagesRemaining = imagesTotal - imagesDone;
		statusText.textContent = `Validating images (${imagesDone} of ~${imagesTotal})...`;
		timeRemaining(imagesRemaining, imagesTotal, imageDelay);
	}

	function timeRemaining( remainingCount, delayInMs ){
		let seconds = remainingCount * (delayInMs / 1000);
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
		timeText.textContent = `~ ${formatted} left`;
	}

	async function beginProcessing( ){
		Settings.save();
		window.addEventListener('beforeunload', warnUserBeforeLeaving);

		exitBtn.disabled = "disabled";
		importBtn.attr('disabled', 'disabled');
		exportBtn.attr('disabled', 'disabled');
		clearBtn.attr('disabled', 'disabled');
		autofill.attr('disabled', 'disabled');
		writeToOutput.attr('disabled', 'disabled');
		actionBtn.value = "Stop";
		actionBtn.onclick = ()=>{
			actionBtn.value = 'Stopping...';
			actionBtn.disabled = 'disabled';
			newData = [];
			clearTimeout(timeout);
			finishProcessing();
		};
		let categories = [];
		for([categoryId, check] of Object.entries(Settings.get(['checked_categories'])))
		{
			if(check.checked)
			{
				categories.push(parseInt(categoryId));
			}
		}

		result.value = 'Your CSS will be output here once processing is complete. If you want to see items as they are added, turn on Live Preview.';
		write(`\/*\nGenerated by MyAnimeList-Tools v${ver}\nhttps://github.com/ValerioLyndon/MyAnimeList-Tools\n\nTemplate=${Settings.get(['css_template']).replace(/\*\//g, "*[DEL]/")}\nMatchTemplate=${Settings.get(['match_template'])}\n*\/\n\n`);

		let beforeProcessing = [];
		let oldLines = existing.value.replace(/\/\*[\s\S]*?Generated by MyAnimeList-Tools[\s\S]*?\*\/\s+/,', ').split("\n");
		imagesTotal = oldLines.length;
		statusText.textContent = `Checking your input for matches...`;

		for( let i = 0; i < data.length; i++ ){
			let item = data[i];
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
				if( Settings.get(['check_existing']).checked ){
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
							write(lineText + "\n");
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
					write(lineText + "\n");
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