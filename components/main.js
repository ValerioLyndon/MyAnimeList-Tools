/* functionality vars */
var defaultSettings = {
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
	}
};

class Logger {
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
	}

	async determineStyle( ){
		if( this.isModern ){
			this.style = await this.#determineModernStyle();
		}
		else {
			this.style = await this.#determineClassicStyle();
		}
	}

	#determineModernStyle( ){
		stylesheet = $('head style[type="text/css"]:first-of-type').text();

		styleColIndex = stylesheet.indexOf('background-color', stylesheet.indexOf('.list-unit .list-status-title {')) + 17;
		styleCol = stylesheet.substr(styleColIndex, 8).replaceAll(/\s|\:|\;/g, '');

		switch(styleCol) {
			case '#4065BA':
				if(stylesheet.indexOf('logo_mal_blue.png') !== -1)
				{
					return 2;
				}
				else
				{
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
			default:
				Log.error('Failed to determine modern list style.');
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
			Log.errror('Could not access your classic list style page.');
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

var Log = new Logger();
var List = new ListInfo();

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
		this.css(`
			.root {
				display: contents;
			}
			.root.is-closed {
				visibility: hidden;
				pointer-events: none;
			}
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

	css( css ){
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

	/* handle settings from old versions */
	var settings = defaultSettings;

	if(store.has('settings'))
	{
		store.set('anime_settings', store.get('settings'));
		store.set('manga_settings', store.get('settings'));
		store.remove('settings');
	}
	if(store.has('last_run'))
	{
		store.set('last_anime_run', store.get('last_run'));
		store.set('last_manga_run', store.get('last_run'));
		store.remove('last_run');
	}

	if(store.has(`${List.type}_settings`))
	{
		try
		{
			settings = JSON.parse(store.get(`${List.type}_settings`));
		
			/* Check for missing settings and fill them in. This prevents errors while maintaining user settings, especially in the case of a user updating from an older version. */
			for(let [key, value] of Object.entries(defaultSettings))
			{
				if(!(key in settings))
				{
					settings[key] = defaultSettings[key];
				}
				if(value instanceof Object)
				{
					for(let subkey in defaultSettings[key])
					{
						if (!(subkey in settings[key]))
						{
							settings[key][subkey] = defaultSettings[key][subkey];
						}
					}
				}
			}
		}
		catch(e)
		{
			alert("Encountered an error while parsing your previous settings. Your settings have been reverted to defaults. To quickly recover your template settings, try selecting \"Last Run\" and then \"Autofill\". Other settings will need to be manually set. \n\nIf you've never run this tool before, you should never see this.");
			settings = defaultSettings;
		}
	}

	/* remove oddly formatted variable from v9.x */
	if(localStorage.getItem('burnt-theme') !== null)
	{
		localStorage.removeItem('burnt-theme');
	}

	/* TOOL CODE */

	/* Create GUI */

	UI.css(`
/*<<<css>>>*/
	`);

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

	function field(value, title, desc) {
		lbl = document.createElement('label');
		lbl.textContent = title;
		lbl.className = 'label';

		input = document.createElement('input');
		input.type = 'text';
		input.value = value;
		input.title = desc;
		input.className = 'field';
		input.spellcheck = false;

		lbl.append(input);
		$(cssGroup).append(lbl);
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
		chk.checked = setting;

		lbl.prepend(chk);
		$(parent).append(lbl);
		return chk;
	}


	/* Options section */

	$(sidebar).append($('<hr><b class="group-title">Global Options</b>'));
	let globalGroup = $('<div class="group"></div>');
	$(sidebar).append(globalGroup);

	chkCategory = chk(settings['select_categories'], "Update only specific categories.", globalGroup, 'Want to only update entries in certain categories instead of everything at once?');
	chkCategory.addEventListener('input', () => { toggleChks(chkCategory, categoryDrawer); });

	let categoryDrawer = $('<div class="drawer"></div>');
	$(globalGroup).append(categoryDrawer);

	let watchOrRead = List.type == 'anime' ? "Watching" : "Reading";
	let categoryChks = {
		"1": chk(settings['checked_categories']['1'], watchOrRead, categoryDrawer),
		"2": chk(settings['checked_categories']['2'], "Completed", categoryDrawer),
		"3": chk(settings['checked_categories']['3'], "On Hold", categoryDrawer),
		"4": chk(settings['checked_categories']['4'], "Dropped", categoryDrawer),
		"6": chk(settings['checked_categories']['6'], "Planned", categoryDrawer)
	};


	/* CSS Options */

	$(sidebar).append($('<hr><b class="group-title">CSS Options</b>'));
	let cssGroup = $('<div class="group"></div>');
	$(sidebar).append(cssGroup);

	delay = field(settings['delay'], "Delay", "Delay (ms) between requests to avoid spamming the server.");
	delay.style.width = "50px";
	delay.parentNode.classList.add('label--inline');

	matchTemplate = field(settings['match_template'], "Match Template", "Line matching template for reading previously generated code. Should match the ID format of your template. Only matching on [ID] is not enough, include previous/next characters to ensure the match is unique.");
	matchTemplate.parentNode.classList.add('label--inline');

	template = field(settings['css_template'], "Template", "CSS template.  Replacements are:\n[TYPE], [ID], [IMGURL], [IMGURLT], [IMGURLV], [IMGURLL], [TITLE], [TITLEEN], [TITLEFR], [TITLEES], [TITLEDE], [TITLERAW], [GENRES], [THEMES], [DEMOGRAPHIC], [RANK], [POPULARITY], [SCORE], [SEASON], [YEAR], [STARTDATE], [ENDDATE], and [DESC].\n\nAnime only:\n[STUDIOS], [PRODUCERS], [LICENSORS], [RATING], [DURATIONEP], [DURATIONTOTAL]\n\nManga only:\n[AUTHORS], [SERIALIZATION]");

	function toggleChks(checkbox, drawerSelector) {
		if(checkbox.checked)
		{
			$(gui).find(drawerSelector).removeClass('is-closed');
		}
		else
		{
			$(gui).find(drawerSelector).addClass('is-closed');
		}
	}

	chkExisting = chk(settings['check_existing'], "Validate existing images", cssGroup, "Attempt to load all images, updating the url if it fails. There is a 5 second delay to allow images to load. Not recommended while adding new anime or updating tags!");

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

		$(exportOverlay).find('#export-template').val(template.value);
		$(exportOverlay).find('#export-match').val(matchTemplate.value);

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

	chkTags = chk(settings['update_tags'], "Update Tags", tagGroup, 'Update your tags with the new information.');

	chkTags.addEventListener('input', () => { toggleChks(chkTags,tagDrawer); });

	let tagDrawer = $('<div class="drawer"></div>');
	$(tagGroup).append(tagDrawer);

	chkEnglish = chk(settings['checked_tags']['english_title'], "English title", tagDrawer);
	chkFrench = chk(settings['checked_tags']['french_title'], "French title", tagDrawer);
	chkSpanish = chk(settings['checked_tags']['spanish_title'], "Spanish title", tagDrawer);
	chkGerman = chk(settings['checked_tags']['german_title'], "German title", tagDrawer);
	chkNative = chk(settings['checked_tags']['native_title'], "Native title", tagDrawer);
	chkSeason = chk(settings['checked_tags']['season'], "Season", tagDrawer);
	chkYear = chk(settings['checked_tags']['year'], "Year", tagDrawer);
	chkGenres = chk(settings['checked_tags']['genres'], "Genres", tagDrawer);
	chkThemes = chk(settings['checked_tags']['themes'], "Themes", tagDrawer);
	chkDemographic = chk(settings['checked_tags']['demographic'], "Demographic", tagDrawer);
	chkScore = chk(settings['checked_tags']['score'], "Score", tagDrawer);
	chkRank = chk(settings['checked_tags']['rank'], "Rank", tagDrawer);
	chkPopularity = chk(settings['checked_tags']['popularity'], "Popularity", tagDrawer);
	/*Anime Only */
	chkStudio = chk(settings['checked_tags']['studio'], "Studio", tagDrawer);
	chkProducers = chk(settings['checked_tags']['producers'], "Producers", tagDrawer);
	chkLicensors = chk(settings['checked_tags']['licensors'], "Licensors", tagDrawer);
	chkAired = chk(settings['checked_tags']['aired'], "Aired", tagDrawer);
	chkRating = chk(settings['checked_tags']['rating'], "Rating", tagDrawer);
	chkDuration = chk(settings['checked_tags']['duration'], "Duration (Episode)", tagDrawer);
	chkTotalDuration = chk(settings['checked_tags']['total_duration'], "Duration (Total)", tagDrawer);
	/*Manga only*/
	chkPublished = chk(settings['checked_tags']['published'], "Published", tagDrawer);
	chkAuthors = chk(settings['checked_tags']['authors'], "Authors", tagDrawer);
	chkSerialization = chk(settings['checked_tags']['serialization'], "Serialization", tagDrawer);


	$(sidebar).append($('<b class="group-title">Note Options</b>'));
	let noteGroup = $('<div class="group"></div>');
	$(sidebar).append(noteGroup);

	chkNotes = chk(settings['update_notes'], "Update Notes", noteGroup, 'Update your comments/notes section with the new information.');

	chkNotes.addEventListener('input', () => {
		if(chkNotes.checked) {
			alert('Be warned! This setting will *entirely overwrite* your current notes. Do not use if you want to keep your notes.');
		}
		toggleChks(chkNotes,notesDrawer);
	});

	$(gui).find(tagDrawer).append($('<br />'));
	chkClearTags = chk(settings['clear_tags'], "Overwrite current tags", tagDrawer, "Overwrite all of your current tags with the new ones. If all other tag options are unchecked, this will completely remove all tags.\n\nDO NOT use this if you have any tags you want to keep.");

	let notesDrawer = $('<div class="drawer"></div>');
	$(noteGroup).append(notesDrawer);

	chkSynopsisNotes = chk(settings['checked_notes']['synopsis'], "Synopsis", notesDrawer);
	chkEnglishNotes = chk(settings['checked_notes']['english_title'], "English title", notesDrawer);
	chkFrenchNotes = chk(settings['checked_notes']['french_title'], "French title", notesDrawer);
	chkSpanishNotes = chk(settings['checked_notes']['spanish_title'], "Spanish title", notesDrawer);
	chkGermanNotes = chk(settings['checked_notes']['german_title'], "German title", notesDrawer);
	chkNativeNotes = chk(settings['checked_notes']['native_title'], "Native title", notesDrawer);
	chkSeasonNotes = chk(settings['checked_notes']['season'], "Season", notesDrawer);
	chkYearNotes = chk(settings['checked_notes']['year'], "Year", notesDrawer);
	chkGenresNotes = chk(settings['checked_notes']['genres'], "Genres", notesDrawer);
	chkThemesNotes = chk(settings['checked_notes']['themes'], "Themes", notesDrawer);
	chkDemographicNotes = chk(settings['checked_notes']['demographic'], "Demographic", notesDrawer);
	chkScoreNotes = chk(settings['checked_notes']['score'], "Score", notesDrawer);
	chkRankNotes = chk(settings['checked_notes']['rank'], "Rank", notesDrawer);
	chkPopularityNotes = chk(settings['checked_notes']['popularity'], "Popularity", notesDrawer);
	/*Anime Only */
	chkStudioNotes = chk(settings['checked_notes']['studio'], "Studio", notesDrawer);
	chkProducersNotes = chk(settings['checked_notes']['producers'], "Producers", notesDrawer);
	chkLicensorsNotes = chk(settings['checked_notes']['licensors'], "Licensors", notesDrawer);
	chkAiredNotes = chk(settings['checked_notes']['aired'], "Aired", notesDrawer);
	chkRatingNotes = chk(settings['checked_notes']['rating'], "Rating", notesDrawer);
	chkDurationNotes = chk(settings['checked_notes']['duration'], "Duration (Episode)", notesDrawer);
	chkTotalDurationNotes = chk(settings['checked_notes']['total_duration'], "Duration (Total)", notesDrawer);
	/*Manga only*/
	chkPublishedNotes = chk(settings['checked_notes']['published'], "Published", notesDrawer);
	chkAuthorsNotes = chk(settings['checked_notes']['authors'], "Authors", notesDrawer);
	chkSerializationNotes = chk(settings['checked_notes']['serialization'], "Serialization", notesDrawer);

	/* HIDE IRRELEVANT */
	if(List.isAnime)
	{
		chkPublished.parentNode.style.display = 'none';
		chkAuthors.parentNode.style.display = 'none';
		chkSerialization.parentNode.style.display = 'none';

		chkPublishedNotes.parentNode.style.display = 'none';
		chkAuthorsNotes.parentNode.style.display = 'none';
		chkSerializationNotes.parentNode.style.display = 'none';
	}
	else
	{
		chkStudio.parentNode.style.display = 'none';
		chkProducers.parentNode.style.display = 'none';
		chkLicensors.parentNode.style.display = 'none';
		chkAired.parentNode.style.display = 'none';
		chkRating.parentNode.style.display = 'none';
		chkDuration.parentNode.style.display = 'none';
		chkTotalDuration.parentNode.style.display = 'none';

		chkStudioNotes.parentNode.style.display = 'none';
		chkProducersNotes.parentNode.style.display = 'none';
		chkLicensorsNotes.parentNode.style.display = 'none';
		chkAiredNotes.parentNode.style.display = 'none';
		chkRatingNotes.parentNode.style.display = 'none';
		chkDurationNotes.parentNode.style.display = 'none';
		chkTotalDurationNotes.parentNode.style.display = 'none';
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

	lastRun = $('<input type="button" value="Last Run" class="btn btn-right" title="Fills the input field with the last known output of this tool.">');
	if(store.has(`last_${List.type}_run`))
	{
		lastRun.on('click',()=>{
			existing.value = store.get(`last_${List.type}_run`);
		});
	}
	else {
		lastRun.attr('disabled', 'disabled');
	}
	$(topL).append(lastRun);

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
		document.execCommand('copy');
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

	function decodeHtml(html)
	{
		txt = document.createElement("textarea");
		txt.innerHTML = html;
		return txt.value;
	}

	function round(value, precision) {
		let multiplier = Math.pow(10, precision || 0);
		return Math.round(value * multiplier) / multiplier;
	}

	async function setTemplate(newTemplate, newMatchTemplate, newCss = false) {
		csrf = $('meta[name="csrf_token"]').attr('content');
		template.value = newTemplate;
		matchTemplate.value = newMatchTemplate;
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
				
				let bg_attach = $(doc).find('#style_edit_theme_background_image_attachment').find('[selected]').val() || '';
				let bg_vert = $(doc).find('#style_edit_theme_background_image_vertical_position').find('[selected]').val() || '';
				let bg_hori = $(doc).find('#style_edit_theme_background_image_horizontal_position').find('[selected]').val() || '';
				let bg_repeat = $(doc).find('#style_edit_theme_background_image_repeat').find('[selected]').val() || '';
				
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
				formData.append("csrf_token", csrf);
				
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
				formData.append('csrf_token', csrf);
				
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
	function getListInfo()
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
				getListInfo();
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

			setTimeout(getListInfo, faildelay);
		});
	};
	getListInfo();



	/* Primary Functions */

	var iteration = 0;
	var newData = [];
	var percent = 0;
	var timeout;
	var timeThen;
	async function processItem()
	{
		thisData = newData[iteration];
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
			if(!chkTags.checked || chkClearTags.checked) {
				tags = [];
			}
			else if(chkTags.checked)
			{
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
					authors[j] = authors[j].substring(startAt, endAt).trim().replaceAll(',','');
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

			let csrf = $('meta[name="csrf_token"]').attr('content');

			if(chkTags.checked)
			{
				if(titleEn && chkEnglish.checked) { tags.push(titleEn); }
				if(titleFr && chkFrench.checked) { tags.push(titleFr); }
				if(titleEs && chkSpanish.checked) { tags.push(titleEs); }
				if(titleDe && chkGerman.checked) { tags.push(titleDe); }
				if(titleNative && chkNative.checked) { tags.push(titleNative); }
				if(season && chkSeason.checked) { tags.push(season); }
				if(year && chkYear.checked) { tags.push(year); }
				if(studios && chkStudio.checked) { tags.push(studios); }
				if(producers && chkProducers.checked) { tags.push(producers); }
				if(licensors && chkLicensors.checked) { tags.push(licensors); }
				if(serializations && chkSerialization.checked) { tags.push(serializations); }
				if(genres && chkGenres.checked) { tags.push(genres); }
				if(themes && chkThemes.checked) { tags.push(themes); }
				if(demographic && chkDemographic.checked) { tags.push(demographic); }
				if(authors && chkAuthors.checked) { tags.push(authors); }
				if(chkAired.checked) { tags.push(airedTag); }
				if(chkPublished.checked) { tags.push(publishedTag); }
				if(chkScore.checked) { tags.push(scoreTag); }
				if(chkRank.checked) { tags.push(rankTag); }
				if(chkPopularity.checked) { tags.push(popularityTag); }
				if(chkRating.checked) { tags.push(ratingTag); }
				if(chkDuration.checked) { tags.push(durationTag); }
				if(chkTotalDuration.checked) { tags.push(totalDurationTag); }
				
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
				formData.append("csrf_token", csrf);
			
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

			if(chkNotes.checked)
			{
				let notes = [];

				if(titleEn && chkEnglishNotes.checked) { notes.push(titleEn); }
				if(titleFr && chkFrenchNotes.checked) { notes.push(titleFr); }
				if(titleEs && chkSpanishNotes.checked) { notes.push(titleEs); }
				if(titleDe && chkGermanNotes.checked) { notes.push(titleDe); }
				if(titleNative && chkNativeNotes.checked) { notes.push(titleNative); }
				if(season && chkSeasonNotes.checked) { notes.push(season); }
				if(year && chkYearNotes.checked) { notes.push(year); }
				if(studios && chkStudioNotes.checked) { notes.push(studios); }
				if(producers && chkProducersNotes.checked) { notes.push(producers); }
				if(licensors && chkLicensorsNotes.checked) { notes.push(licensors); }
				if(serializations && chkSerializationNotes.checked) { notes.push(serializations); }
				if(genres && chkGenresNotes.checked) { notes.push(genres); }
				if(themes && chkThemesNotes.checked) { notes.push(themes); }
				if(demographic && chkDemographicNotes.checked) { notes.push(demographic); }
				if(authors && chkAuthorsNotes.checked) { notes.push(authors); }
				if(chkAiredNotes.checked) { notes.push(airedTag); }
				if(chkPublishedNotes.checked) { notes.push(publishedTag); }
				if(chkScoreNotes.checked) { notes.push(scoreTag); }
				if(chkRankNotes.checked) { notes.push(rankTag); }
				if(chkPopularityNotes.checked) { notes.push(popularityTag); }
				if(chkRatingNotes.checked) { notes.push(ratingTag); }
				if(chkDurationNotes.checked) { notes.push(durationTag); }
				if(chkTotalDurationNotes.checked) { notes.push(totalDurationTag); }
				if(chkSynopsisNotes.checked) { notes.push(synopsis); }

				let notesStr = notes.join("\n\n");
				let notesRequestUrl = '';
				let notesRequestDict = {
					"comments": notesStr,
					"status": thisData['status'],
					"csrf_token": csrf
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
			cssLine = template.value
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
			
			result.value += cssLine + "\n";
			result.scrollTop = result.scrollHeight;
		}
		catch(e)
		{
			Log.error(`${List.type} #${id}: ${e}`);
		}
		
		continueProcessing();
	}

	function continueProcessing()
	{
		iteration++;

		/* update variables */

		percent = iteration / newData.length * 100;

		if(iteration === 1)
		{
			timeThen = performance.now() - delay.value;
		}
		timeSince = performance.now() - timeThen;
		timeThen = performance.now();

		idsRemaining = newData.length - iteration;
		seconds = idsRemaining * (timeSince / 1000);
		if(seconds <= 60)
		{
			timeRemaining = `${round(seconds)}s`;
		}
		else if(seconds > 60 && seconds < 3600)
		{
			timeRemaining = `${round(seconds / 60, 1)}m`;
		}
		else if(seconds > 3600)
		{
			timeRemaining = `${round(seconds / 60 / 60, 1)}h`;
		}
		else
		{
			timeRemaining = '?';
		}

		/* update UI */

		statusText.textContent = `Processed ${iteration} of ${newData.length}`;
		statusBar.style.cssText = `--percent: ${percent}%; --colour: var(--stat-working);`;
		timeText.textContent = `~ ${timeRemaining} left`;
		
		if(iteration === newData.length){
			finishProcessing();
			return;
		}
		timeout = setTimeout(processItem, delay.value);
	}

	function finishProcessing()
	{
		window.removeEventListener('beforeunload', warnUserBeforeLeaving);

		if(result.value.length > 0)
		{
			store.set(`last_${List.type}_run`, result.value);
		}
		actionBtn.value = "Done";
		actionBtn.disabled = "disabled";
		statusText.textContent = `Completed with ${Log.errorCount} errors`;
		timeText.textContent = '';
		exportBtn.removeAttr('disabled');
		clearBtn.removeAttr('disabled');
		exitBtn.disabled = false;
		exitBtn.value = "Exit";
		exitBtn.onclick = ()=>
		{
			UI.destruct();
			if(chkTags.checked || chkNotes.checked)
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

	function beginProcessing()
	{
		saveSettings();
		window.addEventListener('beforeunload', warnUserBeforeLeaving);

		let imageLoadDelay = 0;
		exitBtn.disabled = "disabled";
		importBtn.attr('disabled', 'disabled');
		exportBtn.attr('disabled', 'disabled');
		clearBtn.attr('disabled', 'disabled');
		autofill.attr('disabled', 'disabled');
		lastRun.attr('disabled', 'disabled');
		actionBtn.value = "Stop";
		actionBtn.onclick = ()=>{
			actionBtn.value = 'Stopping...';
			actionBtn.disabled = 'disabled';
			newData = [];
			clearTimeout(timeout);
			finishProcessing();
		};
		let categories = [];
		for([categoryId, chk] of Object.entries(categoryChks))
		{
			if(chk.checked)
			{
				categories.push(parseInt(categoryId));
			}
		}
		
		result.value += `\/*\nGenerated by MyAnimeList-Tools v${ver}\nhttps://github.com/ValerioLyndon/MyAnimeList-Tools\n\nTemplate=${template.value.replace(/\*\//g, "*[DEL]/")}\nMatchTemplate=${matchTemplate.value}\n*\/\n\n`;

		for(let k = 0; k < data.length; k++)
		{
			statusText.textContent = 'Checking your input for matches...';
			let id = data[k][`${List.type}_id`];
			let skip;
			/* Check old CSS for any existing lines and set "skip" var to true if found. */
			oldLines = existing.value.split("\n");
			oldLinesCount = oldLines.length;
			for(let j = 0; j < oldLinesCount; j++)
			{
				let match = matchTemplate.value.replaceAll(/\[ID\]/g, id).replaceAll(/\[TYPE\]/g, List.type);
				skip = oldLines[j].indexOf(match) !== -1 ? true : false;
				if(skip)
				{
					break;
				}
			}

			if(skip)
			{
				if(chkExisting.checked)
				{
					imageLoadDelay = 5000;
					let urlStart = oldLines[j].indexOf("http");
					let urlEnd = oldLines[j].indexOf(".jpg", urlStart);
					if(urlEnd === -1)
					{
						urlEnd = oldLines[j].indexOf(".webp", urlStart);
					}
					let imgUrl = oldLines[j].substring(urlStart, urlEnd + 4);
					let tempImg = document.createElement("img");
					tempImg.oldLine = oldLines[j];
					tempImg.animeId = id;
					tempImg.data = data[k];
					tempImg.onload = function(imgLoadEvent)
					{
						result.value += imgLoadEvent.target.oldLine + "\n";
					};
					tempImg.onerror = function(imgErrorEvent)
					{
						newData.push(imgErrorEvent.target.data);
					};
					tempImg.src = imgUrl;
				}
				else
				{
					result.value += oldLines[j] + "\n";
				}
			}
			else if(chkCategory.checked)
			{
				let rewatchKey = List.isAnime ? 'is_rewatching' : 'is_rewatching';
				for(let categoryId of categories)
				{
					/* if rewatching then set status to watching, since this is how it appears to the user */
					if(data[k][rewatchKey] === 1)
					{
						data[k]['status'] = 1;
					}
					if(data[k]['status'] == categoryId)
					{
						newData.push(data[k]);
					}
				}
			}
			else
			{
				newData.push(data[k]);
			}
		}

		timeout = setTimeout(processItem, imageLoadDelay);
	}

	function saveSettings()
	{
		settings = {
			"select_categories": chkCategory.checked,
			"checked_categories": {
				"1": categoryChks["1"].checked,
				"2": categoryChks["2"].checked,
				"3": categoryChks["3"].checked,
				"4": categoryChks["4"].checked,
				"6": categoryChks["6"].checked
			},
			"css_template": template.value,
			"delay": delay.value,
			"match_template": matchTemplate.value,
			"update_tags": chkTags.checked,
			"update_notes": chkNotes.checked,
			"checked_tags": {
				"english_title": chkEnglish.checked,
				"french_title": chkFrench.checked,
				"spanish_title": chkSpanish.checked,
				"german_title": chkGerman.checked,
				"native_title": chkNative.checked,
				"season": chkSeason.checked,
				"year": chkYear.checked,
				"genres": chkGenres.checked,
				"themes": chkThemes.checked,
				"demograpic": chkDemographic.checked,
				"authors": chkAuthors.checked,
				"score": chkScore.checked,
				"rank": chkRank.checked,
				"popularity": chkPopularity.checked,
				"studio": chkStudio.checked,
				"producers": chkProducers.checked,
				"licensors": chkLicensors.checked,
				"serialization": chkSerialization.checked,
				"aired": chkAired.checked,
				"published": chkPublished.checked,
				"rating": chkRating.checked,
				"duration": chkDuration.checked,
				"total_duration": chkTotalDuration.checked
			},
			"checked_notes": {
				"synopsis": chkSynopsisNotes.checked,
				"english_title": chkEnglishNotes.checked,
				"french_title": chkFrenchNotes.checked,
				"spanish_title": chkSpanishNotes.checked,
				"german_title": chkGermanNotes.checked,
				"native_title": chkNativeNotes.checked,
				"season": chkSeasonNotes.checked,
				"year": chkYearNotes.checked,
				"genres": chkGenresNotes.checked,
				"themes": chkThemesNotes.checked,
				"demograpic": chkDemographicNotes.checked,
				"authors": chkAuthorsNotes.checked,
				"score": chkScoreNotes.checked,
				"rank": chkRankNotes.checked,
				"popularity": chkPopularityNotes.checked,
				"studio": chkStudioNotes.checked,
				"producers": chkProducersNotes.checked,
				"licensors": chkLicensorsNotes.checked,
				"serialization": chkSerializationNotes.checked,
				"aired": chkAiredNotes.checked,
				"published": chkPublishedNotes.checked,
				"rating": chkRatingNotes.checked,
				"duration": chkDurationNotes.checked,
				"total_duration": chkTotalDurationNotes.checked
			},
			"clear_tags": chkClearTags.checked,
			"check_existing": chkExisting.checked
		};
		store.set(`${List.type}_settings`, JSON.stringify(settings));
	}
};