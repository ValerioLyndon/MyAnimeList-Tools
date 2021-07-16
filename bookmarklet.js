javascript: /*
MyAnimeList-Tools
A CSS Generator and Tag updater

- Original code   2018/Aug/10 by BurntJello http://burntjello.webs.com
- Extra features  2019        by Cateinya
- Fixes           2020/Oct    by Cry5talz 
- Further changes 2021+       by Valerio Lyndon
*/

ver = '5.0_prerelease';
verMod = '2021/Jul/15';

defaultSettings = {
	"css_template": "/* [TITLE] *[DEL]/ .data.image a[href^=\"/[TYPE]/[ID]/\"]::before { background-image: url([IMGURL]); }",
	"delay": "3000",
	"match_template": "/[TYPE]/[ID]/",
	"update_tags": false,
	"checked_tags": {
		"english_title": false,
		"native_title": false,
		"season": false,
		"year": false,
		"genres": false,
		"authors": false,
		"score": false,
		"rank": false,
		"studio": false,
		"producers": false,
		"licensors": false,
		"serialization": false,
		"aired": false,
		"published": false,
		"rating": false,
		"rating": false,
		"rating": false
	},
	"clear_tags": false,
	"check_existing": false
};

if(localStorage.getItem('burnt_settings') !== null)
{
	settings = JSON.parse(localStorage.getItem('burnt_settings'));
}
else
{
	settings = defaultSettings;
}

CSS_TEMPLATE = settings['css_template'];
DELAY = settings['delay'];
MATCH_TEMPLATE = settings['match_template'];
UPDATE_TAGS = settings['update_tags'];
TAGS_ENGLISH_TITLE = settings['checked_tags']['english_title'];
TAGS_NATIVE_TITLE = settings['checked_tags']['native_title'];
TAGS_SEASON = settings['checked_tags']['season'];
TAGS_YEAR = settings['checked_tags']['year'];
TAGS_GENRES = settings['checked_tags']['genres'];
TAGS_AUTHORS = settings['checked_tags']['authors'];
TAGS_SCORE = settings['checked_tags']['score'];
TAGS_RANK = settings['checked_tags']['rank'];
TAGS_STUDIO = settings['checked_tags']['studio'];
TAGS_PRODUCERS = settings['checked_tags']['producers'];
TAGS_LICENSORS = settings['checked_tags']['licensors'];
TAGS_SERIALIZATION = settings['checked_tags']['serialization'];
TAGS_AIRED = settings['checked_tags']['aired'];
TAGS_PUBLISHED = settings['checked_tags']['published'];
TAGS_RATING = settings['checked_tags']['rating'];
/* these two lines are the only ones to check for existence since they were added after settings became a thing */
TAGS_DURATION = 'duration' in settings['checked_tags'] ? settings['checked_tags']['duration'] : defaultSettings['checked_tags']['total_duration'];
TAGS_TOTAL_DURATION = 'total_duration' in settings['checked_tags'] ? settings['checked_tags']['total_duration'] : defaultSettings['checked_tags']['total_duration'];
CLEAR_TAGS = settings['clear_tags'];
CHECK_EXISTING = settings['check_existing'];

/* TOOL CODE */

modernStyle = (document.getElementById("list_surround")) ? false : true;
animeManga = window.location.href.replace("https://myanimelist.net/", "").split("/")[0].replace("list", "");

/* Create GUI */

css(`
#burnt-bg, #burnt-gui {
	position: fixed;
	z-index: 99999;
}
#burnt-bg {
	top: 0;
	left: 0;
	right: 0;
	bottom: 0;
	background: rgba(0,0,0,0.5);
}
#burnt-gui {
	left: 50px;
	top: 50px;
	bottom: 50px;
	right: 50px;
	display: flex;
	flex-flow: row nowrap;
	background-color: #fff;
	border-style: solid;
	box-sizing: border-box;
	color: #000;
	font: 12px/1.5 sans-serif;
	text-align: left;
}
.burnt-overlay {
	position: fixed;
	top: 0;
	left: 0;
	right: 0;
	bottom: 0;
	z-index: 9999;
	background: rgba(0,0,0,0.5);
}
.burnt-popup {
	position: fixed;
	left: 50%;
	top: 50%;
	z-index: 9999;
	min-width: 300px;
	max-width: calc(100% - 100px);
	min-height: 100px;
	max-height: calc(100% - 100px);
	padding: 10px;
	background: #fff;
	overflow: auto;
	transform: translate(-50%,-50%);
}
.burnt-popup input:not([type="button"]),
.burnt-popup textarea {
	display: block;
	width: 100%;
	max-width: 600px;
	margin-bottom: 6px;
}
#burnt-status {
	background: #e6e6e6;
	padding: 2px 6px;
	margin: 5px 0 10px;
	--percent: 0%;
	--colour: #4277f2;
	background-image: linear-gradient(
			to right,
			var(--colour) var(--percent),
			transparent var(--percent)
		);
}
#burnt-time {
	float: right;
}
#burnt-gui * {
	box-sizing: inherit;
	color: #000;
	font: inherit;
}
#burnt-gui hr {
	height: 4px;
	background: #e6e6e6;
	border: 0;
	margin: 10px 0 15px;
}
#burnt-gui *:disabled {
	opacity: 0.7;
}
.burnt-btn + .burnt-btn {
	margin-left: 3px; 
}
.burnt-chk {
	display: block;
}
.burnt-tag {
	margin-left: 10px;
}
.burnt-tag-disabled {
	opacity: 0.5;
	pointer-events: none;
}
.burnt-textarea {
	width: 50%;
}
.burnt-textarea b {
	display: inline-block;
	height: 24px;
}
.burnt-textarea-btn {
	height: 20px;
	padding: 0 2px;
	margin-left: 3px;
	float: right;
}
#burnt-gui textarea {
	display: block;
	width: 100%;
	height: calc(100% - 24px);
	margin: 0;
	resize: none;
	font-family: monospace;
	word-break: break-all;
}
`);

gui = document.createElement("div");
gui.id = "burnt-gui";

bg = $('<div id="burnt-bg""></div>');
overlay = $('<div class="burnt-overlay"></div>');

$('body').append(bg);
$('body').append(gui);

guiL = document.createElement('div');
gui.appendChild(guiL);
guiL.style.cssText = `
	width: 250px;
	padding: 10px 0 10px 10px;
	overflow-x: hidden;
	overflow-y: auto;
	flex: 0 0 auto;
`;

guiR = document.createElement('div');
gui.appendChild(guiR);
guiR.style.cssText = `
	display: flex;
	width: 90%;
	padding: 10px;
	flex: 1 1 auto;
	flex-flow: row nowrap;
`;

thumbBtn = document.createElement("input");
guiL.appendChild(thumbBtn);
thumbBtn.classList.add('burnt-btn');
thumbBtn.type = "button";
thumbBtn.value = "Loading...";
thumbBtn.disabled = 'disabled';
thumbBtn.onclick = function() { Process(); };

exitBtn = document.createElement("input");
guiL.appendChild(exitBtn);
exitBtn.classList.add('burnt-btn');
exitBtn.type = "button";
exitBtn.value = "Exit";
function Exit()
{
	$('#burnt-bg').remove();
	$('#burnt-gui').remove();
	$('.burnt-css').remove();
}
exitBtn.onclick = Exit;

statusBar = document.createElement("div");
statusBar.id = "burnt-status";
guiL.appendChild(statusBar);

statusText = document.createElement('span');
statusText.textContent = 'Setting up...';
statusBar.style.cssText = '--percent: 20%; --colour: #60ce81;';
statusBar.appendChild(statusText);

timeText = document.createElement('span');
timeText.id = 'burnt-time';
statusBar.appendChild(timeText);

function field(value, title, desc) {
	lbl = document.createElement('label');
	lbl.textContent = title;
	lbl.style.display = 'inline-block';
	lbl.style.marginRight = '10px';
	lbl.style.marginBottom = '5px';
	lbl.style.fontWeight = '700';
	lbl.style.textAlign = 'left';
	$(lbl).append($('<br />'));

	input = document.createElement('input');
	input.type = 'text';
	input.style.width = '100%';
	input.value = value;
	input.title = desc;
	input.style.fontWeight = '400';
	input.spellcheck = false;

	lbl.appendChild(input);
	guiL.appendChild(lbl);
	return input;
}

function chk(checked, title, className = false, desc = false) {
	var lbl = document.createElement('label');
	lbl.textContent = title;
	if(desc) {
		lbl.title = desc;
	}
	if(className) {
		lbl.className = className;
	}

	var chk = document.createElement("input");
	chk.type = "checkbox";
	chk.checked = checked;

	lbl.prepend(chk);
	guiL.appendChild(lbl);
	return chk;
}

/* Options section */

delay = field(DELAY, "Delay", "Delay (ms) between requests to avoid spamming the server.");
delay.style.width = "50px";

matchTemplate = field(MATCH_TEMPLATE, "Match Template", "Line matching template for reading previously generated code. Should match the ID format of your template. Only matching on [ID] is not enough, include previous/next characters to ensure the match is unique.");

template = field(CSS_TEMPLATE, "Template", "CSS template.  Replacements are:\n[TYPE], [ID], [IMGURL], [IMGURLT], [IMGURLV], [IMGURLL], [TITLE], [TITLEENG], [TITLERAW], [GENRES], [RANK], [SCORE], [SEASON], [YEAR], [STARTDATE], [ENDDATE], and [DESC].\n\nAnime only:\n[STUDIOS], [PRODUCERS], [LICENSORS], [RATING], [DURATIONEP], [DURATIONTOTAL]\n\nManga only:\n[AUTHORS], [SERIALIZATION]");
template.parentNode.style.width = "100%";

$(guiL).append($('<br />'));

chkTags = chk(UPDATE_TAGS, "Update Tags:", 'burnt-chk burnt-tagtoggle');

chkTags.parentNode.addEventListener('click', toggleTags);

function toggleTags() {
	bool = chkTags.checked;
	if(bool) {
		$('.burnt-tag').removeClass('burnt-tag-disabled');
	} else {
		$('.burnt-tag').addClass('burnt-tag-disabled');
	}
}

chkEnglish = chk(TAGS_ENGLISH_TITLE, "English title", 'burnt-chk burnt-tag');
chkNative = chk(TAGS_NATIVE_TITLE, "Native title", 'burnt-chk burnt-tag');
chkSeason = chk(TAGS_SEASON, "Season", 'burnt-chk burnt-tag');
chkYear = chk(TAGS_YEAR, "Year", 'burnt-chk burnt-tag');
chkGenres = chk(TAGS_GENRES, "Genres", 'burnt-chk burnt-tag');
chkScore = chk(TAGS_SCORE, "Score", 'burnt-chk burnt-tag');
chkRank = chk(TAGS_RANK, "Rank", 'burnt-chk burnt-tag');
/*Anime Only */
chkStudio = chk(TAGS_STUDIO, "Studio", 'burnt-chk burnt-tag');
chkProducers = chk(TAGS_PRODUCERS, "Producers", 'burnt-chk burnt-tag');
chkLicensors = chk(TAGS_LICENSORS, "Licensors", 'burnt-chk burnt-tag');
chkAired = chk(TAGS_AIRED, "Aired", 'burnt-chk burnt-tag');
chkRating = chk(TAGS_RATING, "Rating", 'burnt-chk burnt-tag');
chkDuration = chk(TAGS_DURATION, "Duration (Episode)", 'burnt-chk burnt-tag');
chkTotalDuration = chk(TAGS_TOTAL_DURATION, "Duration (Total)", 'burnt-chk burnt-tag');
/*Manga only*/
chkPublished = chk(TAGS_PUBLISHED, "Published", 'burnt-chk burnt-tag');
chkAuthors = chk(TAGS_AUTHORS, "Authors", 'burnt-chk burnt-tag');
chkSerialization = chk(TAGS_SERIALIZATION, "Serialization", 'burnt-chk burnt-tag');

if(animeManga === 'anime') {
	chkPublished.parentNode.style.display = 'none';
	chkAuthors.parentNode.style.display = 'none';
	chkSerialization.parentNode.style.display = 'none';
} else {
	chkStudio.parentNode.style.display = 'none';
	chkProducers.parentNode.style.display = 'none';
	chkLicensors.parentNode.style.display = 'none';
	chkAired.parentNode.style.display = 'none';
	chkRating.parentNode.style.display = 'none';
	chkDuration.parentNode.style.display = 'none';
	chkTotalDuration.parentNode.style.display = 'none';
}

$(guiL).append($('<br />'));

chkClearTags = chk(CLEAR_TAGS, "Overwrite current tags", 'burnt-chk burnt-tag', "Overwrite all of your current tags with the new ones. If all other tag options are unchecked, this will completely remove all tags.\n\nDO NOT use this if you have any tags you want to keep.");

$(guiL).append($('<br />'));

chkExisting = chk(CHECK_EXISTING, "Validate existing images", 'burnt-chk', "Attempt to load all images, updating the url if it fails. There is a 5 second delay to allow images to load. Not recommended while adding new anime or updating tags!");

$(guiL).append($('<hr>'));

/* Import/Export section */

importBtn = $('<input type="button" value="Import Template" class="burnt-btn" title="Import a CSS template to get started quickly.">');
importBtn.click(function() {
	$(gui).append(overlay);

	importOverlay = $(`<div class="burnt-popup">
		Input a template here. This will update the tool settings and may add some additional code to your MAL Custom CSS. You may wish to backup your Custom CSS before doing this.
		<br />
		<br />
		<input id="burnt-import-field" type="text" spellcheck="false"></input>
		<br />
		<input id="burnt-import-btn" type="button" value="Import" class="burnt-btn">
		<input id="burnt-close" type="button" value="Close" class="burnt-btn">
	</div>`);

	$(gui).append(importOverlay);

	$('#burnt-import-btn').click(function() {
		value = $('#burnt-import-field').val();

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
					if(!("css" in importedTemplate))
					{
						importedTemplate['css'] = '';
					}

					t = setTemplate(importedTemplate['template'], importedTemplate['matchtemplate'], importedTemplate['css']);
					if(!t)
					{
						alert('Import failed to update MAL Custom CSS. This is likely due to a code error and should be reported to the developer.');
					}
					else
					{
						alert('Import succeeded.');
					}

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
	
	$('#burnt-close').click(function() {
		importOverlay.remove();
		overlay.remove();
	});
});
$(guiL).append(importBtn);

exportBtn = $('<input type="button" value="Create Template" class="burnt-btn" title="Create a CSS template for others to use.">');
exportBtn.click(function() {
	$(gui).append(overlay);

	exportOverlay = $(`<div class="burnt-popup">
		Use this to create a template. The template and match template are required, but you may leave the CSS Styling field blank if desired.
		<br />
		<br />
		
		<b style="font-weight: bold">Template</b>
		<input id="burnt-export-template" type="text" spellcheck="false"></input>
		
		<b style="font-weight: bold">Match Template</b>
		<input id="burnt-export-match" type="text" spellcheck="false"></input>
		
		<b style="font-weight: bold">CSS Styling</b>
		<textarea id="burnt-export-css" type="text" spellcheck="false" style="resize: vertical; height: 150px;"></textarea>
		<br />
		<input id="burnt-export" type="text" placeholder="Template will be generated here and copied to your clipboard." readonly="readonly">
		<br />
		<input id="burnt-export-btn" type="button" value="Generate Template" class="burnt-btn" title="Generates text and copies to your clipboard.">
		<input id="burnt-close" type="button" value="Close" class="burnt-btn">
	</div>`);
	$(gui).append(exportOverlay);

	$('#burnt-export-template').val(template.value);
	$('#burnt-export-match').val(matchTemplate.value);

	$('#burnt-export-btn').click(function() {
		newTemplate = $('#burnt-export-template').val();
		newMatchTemplate = $('#burnt-export-match').val();

		if(newTemplate.length < 1 || newMatchTemplate < 1)
		{
			alert('Please fill out both the Template and Match Template fields.');
		}
		else
		{
			createdTemplate = {
				"template": newTemplate,
				"matchtemplate": newMatchTemplate,
				"css": $('#burnt-export-css').val()
			};
			$('#burnt-export').val(JSON.stringify(createdTemplate));
			
			document.querySelector('#burnt-export').select();
			document.execCommand('copy');
		}
	});
	
	$('#burnt-close').click(function() {
		exportOverlay.remove();
		overlay.remove();
	});
});
$(guiL).append(exportBtn);

$(guiL).append($('<hr>'));

/* "Copyright" section */

$(guiL).append($(`<div style="font-size: 10px; font-style: italic; margin-bottom: 5px;">MyAnimeList-Tools v${ver}<br />Last modified ${verMod}</div>`));

/* Settings section */

clearBtn = $('<input type="button" value="Clear Settings" class="burnt-btn" title="Clears any stored settings from previous runs.">');
if(localStorage.getItem('burnt_settings') !== null || localStorage.getItem('burnt_last_run') !== null)
{
	clearBtn.click(function() {
		localStorage.removeItem('burnt_settings');
		localStorage.removeItem('burnt_last_run');
		alert('Please exit and restart the tool to complete the clearing of your settings.');
	});
}
else
{
	clearBtn.attr('disabled', 'disabled');
}
$(guiL).append(clearBtn);

/* Textareas */

textareaL = document.createElement('div');
textareaL.className = 'burnt-textarea';
guiR.appendChild(textareaL);

$(textareaL).append($('<b style="font-weight: bold;">Input</b>'));

lastRun = $('<input type="button" value="Last Run" class="burnt-btn burnt-textarea-btn" title="Fills the input field with the last known output of this tool.">');
$(textareaL).append(lastRun);
if(localStorage.getItem('burnt_last_run') !== null)
{
	lastRun.click(function() {
		existing.textContent = localStorage.getItem('burnt_last_run');
	});
}
else {
	lastRun.attr('disabled', 'disabled');
}

autofill = $('<input type="button" value="Autofill" class="burnt-btn burnt-textarea-btn" title="Autofill the template fields based on any previously generated code found in the input.">');
$(textareaL).append(autofill);
autofill.click(function() {
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

existing = document.createElement("textarea");
existing.title = "Copy previously generated code here. The style for one anime ID must all be on the same line.";
existing.placeholder = "Copy previously generated code here. The style for one anime ID must all be on the same line.";
existing.spellcheck = false;
textareaL.appendChild(existing);

textareaR = document.createElement('div');
textareaR.className = 'burnt-textarea';
textareaR.style.paddingLeft = '10px';
guiR.appendChild(textareaR);

$(textareaR).append($('<b style="font-weight: bold;">Output</b>'));

copyOutput = $('<input type="button" value="Copy to Clipboard" class="burnt-btn burnt-textarea-btn" title="Copies output to clipboard.">');
$(textareaR).append(copyOutput);
copyOutput.click(function() {
	result.select();
	document.execCommand('copy');
});

result = document.createElement("textarea");
result.title = "Newly generated code will be output here.";
result.placeholder = "Newly generated code will be output here.";
result.readOnly = "readonly";
result.spellcheck = false;
textareaR.appendChild(result);

toggleTags();



/* Common Functions */

function decodeHtml(html)
{
	txt = document.createElement("textarea");
	txt.innerHTML = html;
	return txt.value;
}

function css(css)
{
	newCSS = document.createElement('style');
	newCSS.className = 'burnt-css';
	newCSS.textContent = css;
	document.head.appendChild(newCSS);
	return newCSS;
}

function round(value, precision) {
    var multiplier = Math.pow(10, precision || 0);
    return Math.round(value * multiplier) / multiplier;
}

function setTemplate(newTemplate, newMatchTemplate, newCss = false) {
	template.value = newTemplate;
	matchTemplate.value = newMatchTemplate;
	if(newCss !== false)
	{
		if(modernStyle)
		{
			/* Determine theme currently being used */

			stylesheet = $('head style[type="text/css"]:first-of-type').text();

			style = false;
			styleColIndex = stylesheet.indexOf('background-color', stylesheet.indexOf('.list-unit .list-status-title {')) + 17;
			styleCol = stylesheet.substr(styleColIndex, 8).replaceAll(/\s|\:|\;/g, '');

			switch(styleCol) {
				case '#4065BA':
					if(stylesheet.indexOf('logo_mal_blue.png') !== -1)
					{
						style = 2;
					}
					else
					{
						style = 1;
					}
					break;
				case '#244291':
					style = 3;
					break;
				case '#23B230':
					style = 4;
					break;
				case '#A32E2E':
					style = 5;
					break;
				case '#FAD54A':
					style = 6;
					break;
				case '#0080FF':
					style = 7;
					break;
				case '#39c65d':
					style = 8;
					break;
				case '#ff00bf':
					style = 9;
					break;
				case '#DB1C03':
					style = 10;
					break;
			}

			if(style === false)
			{
				alert('Failed to update Custom CSS');
				return false;
			}

			/* Update MAL custom CSS */

			styleUrl = `https://myanimelist.net/ownlist/style/theme/${style}`;
			request = new XMLHttpRequest();
			request.open("get", styleUrl, false);
			request.send(null);
			str = request.responseText;
			doc = new DOMParser().parseFromString(request.responseText, "text/html");

			customCss = $(doc).find('pre#custom-css').text();

			/* Temporarily update the pages CSS to make sure no page reload is required */
			$('head').append($(`<style>${newCss}</style>`));

			/* Remove any previously added myanimelist-tools CSS */
			customCss = customCss.replaceAll(/\/\*MYANIMELIST-TOOLS START\*\/(.|\n)*\/\*MYANIMELIST-TOOLS END\*\//g, '');

			if(newCss.length > 0)
			{
				finalCss = customCss + '\n\n/*MYANIMELIST-TOOLS START*/\n\n' + newCss + '\n\n/*MYANIMELIST-TOOLS END*/';
			}
			else
			{
				finalCss = customCss;
			}

			if(finalCss.length >= 65535)
			{
				alert('Your MAL Custom CSS may be longer than the max allowed length. If your CSS has been cut off at the end, you will need to resolve this issue.');
			}

			/* Send new CSS to MAL */
			
			csrf = $('meta[name="csrf_token"]').attr('content');
			boundary = '---------------------------35347544871910269115864526218';
			bg_attach = $(doc).find('#style_edit_theme_background_image_attachment').find('[selected]').val() || '';
			bg_vert = $(doc).find('#style_edit_theme_background_image_vertical_position').find('[selected]').val() || '';
			bg_hori = $(doc).find('#style_edit_theme_background_image_horizontal_position').find('[selected]').val() || '';
			bg_repeat = $(doc).find('#style_edit_theme_background_image_repeat').find('[selected]').val() || '';
			
			req2header = `--${boundary}\nContent-Disposition: form-data; name="style_edit_theme[show_cover_image]"\n\n1\n--${boundary}\nContent-Disposition: form-data; name="style_edit_theme[cover_image]"; filename=""\nContent-Type: application/octet-stream\n\n\n--${boundary}\nContent-Disposition: form-data; name="style_edit_theme[show_background_image]"\n\n1\n--${boundary}\nContent-Disposition: form-data; name="style_edit_theme[background_image]"; filename=""\nContent-Type: application/octet-stream\n\n\n--${boundary}\nContent-Disposition: form-data; name="style_edit_theme[background_image_attachment]"\n\n${bg_attach}\n--${boundary}\nContent-Disposition: form-data; name="style_edit_theme[background_image_vertical_position]"\n\n${bg_vert}\n--${boundary}\nContent-Disposition: form-data; name="style_edit_theme[background_image_horizontal_position]"\n\n${bg_hori}\n--${boundary}\nContent-Disposition: form-data; name="style_edit_theme[background_image_repeat]"\n\n${bg_repeat}\n--${boundary}\nContent-Disposition: form-data; name="style_edit_theme[css]"\n\n${finalCss}\n--${boundary}\nContent-Disposition: form-data; name="style_edit_theme[save]"\n\n\n--${boundary}\nContent-Disposition: form-data; name="csrf_token"\n\n${csrf}\n--${boundary}--`;
			
			request2 = new XMLHttpRequest();
			request2.open("post", styleUrl, false);
			request2.setRequestHeader("Content-Type", `multipart/form-data; boundary=${boundary}`);
			request2.send(req2header);
		}
		else
		{
			oldCss = $('head style[type="text/css"]:first-of-type');
			
			/* Update MAL custom CSS */

			styleListUrl = 'https://myanimelist.net/editprofile.php?go=stylepref&do=cssadv';
			request = new XMLHttpRequest();
			request.open("get", styleListUrl, false);
			request.send(null);
			str = request.responseText;
			doc = new DOMParser().parseFromString(request.responseText, "text/html");

			styleUrls = [];
			
			/* should produce one-two elements something like this:
			<a href="?go=stylepref&do=cssadv&id=473785">Style ID#473785</a> */
			$(doc).find('#dialog a').each(function() {
				id = this.href.split('&id=')[1];
				url = `https://myanimelist.net/editprofile.php?go=stylepref&do=cssadv&id=${id}`;
				styleUrls.push(url);
			});

			if(styleUrls.length < 1)
			{
				console.log('MyAnimeList-Tools error: No style IDs found while trying to import.');
				return false;
			}

			for(i = 0; i < styleUrls.length; i++)
			{
				styleUrl = styleUrls[i];
				request2 = new XMLHttpRequest();
				request2.open("get", styleUrl, false);
				request2.send(null);
				str2 = request2.responseText;
				doc2 = new DOMParser().parseFromString(request2.responseText, "text/html");

				customCss = $(doc2).find('textarea[name="cssText"]').text();

				if(customCss.trim() == oldCss.text().trim())
				{
					break;
				}
			}

			/* Remove any previously added myanimelist-tools CSS */
			customCss = customCss.replaceAll(/\/\*MYANIMELIST-TOOLS START\*\/(.|\n)*\/\*MYANIMELIST-TOOLS END\*\//g, '');

			if(newCss.length > 0)
			{
				finalCss = customCss + '\n\n/*MYANIMELIST-TOOLS START*/\n\n' + newCss + '\n\n/*MYANIMELIST-TOOLS END*/';
			}
			else
			{
				finalCss = customCss;
			}

			/* Temporarily update the pages CSS to make sure no page reload is required */
			oldCss.text(finalCss);

			if(finalCss.length >= 65535)
			{
				alert('Your MAL Custom CSS may be longer than the max allowed length. If your CSS has been cut off at the end, you will need to resolve this issue.');
			}

			/* Send new CSS to MAL */
			
			csrf = $('meta[name="csrf_token"]').attr('content');
			
			request3 = new XMLHttpRequest();
			request3.open("post", styleUrl, false);
			request3.setRequestHeader("Content-Type", 'application/x-www-form-urlencoded');
			request3.send(`cssText=${encodeURIComponent(finalCss)}&subForm=Update+CSS&csrf_token=${csrf}`);
		}
	}
	return true;
}



/* Get list info and enable buttons once done */

data = [];
baseUrl = window.location.href.split('?')[0];
offset = 0;
failures = 0;
statusPercent = 30;
function getListInfo()
{
	/* will take a list URL:
	https://myanimelist.net/animelist/Valerio_Lyndon?status=2
	and return:
	https://myanimelist.net/animelist/Valerio_Lyndon/load.json?status=7 */
	dataUrl = `${baseUrl}/load.json?status=7&offset=${offset}`;

	$.getJSON(dataUrl, function(json)
	{
		data = data.concat(json);

		if(json.length === 300)
		{
			/*setTimeout(getListInfo, 0);*/
			offset += 300;
			statusText.textContent = `Fetching list data (${offset} of ?)...`;
			statusPercent += 10;
			statusBar.style.cssText = `--percent: ${statusPercent <= 85 ? statusPercent : '85'}%; --colour: #60ce81;`;
			getListInfo();
		}
		else
		{
			statusText.textContent = `Successfully loaded ${data.length} items.`;
			statusBar.style.cssText = '--percent: 100%; --colour: #60ce81;';
			thumbBtn.value = 'Start';
			thumbBtn.removeAttribute('disabled');
		}
	}).fail(function()
	{
		failures++;

		statusText.textContent = `Data fetch failed, retrying in 8...`;

		if(failures > 3)
		{
			statusText.textContent = `Failed to fetch list info.`;
			statusBar.style.cssText = '--percent: 100%; --colour: #f24242;';
			return;
		}

		setTimeout(getListInfo, 8000);
	});
};
getListInfo();



/* Primary Functions */

newData = [];
var timeout;

errorCount = 0;
i = 0;
timeThen = performance.now() - delay.value;
function ProcessNext()
{
	if(i < newData.length)
	{
		thisData = newData[i];
		id = thisData[`${animeManga}_id`];

		/* set estimated time */
		timeSince = performance.now() - timeThen;
		timeThen = performance.now();

		idsRemaining = newData.length - 1 - i;
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
		
		try
		{
			url = `https://myanimelist.net/${animeManga}/${id}`;

			request = new XMLHttpRequest();
			request.open("get", url, false);
			request.send(null);
			str = request.responseText;
			doc = new DOMParser().parseFromString(request.responseText, "text/html");
		
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

			title = thisData[`${animeManga}_title`];

			titleEng = null;
			titleEngStartTxt = 'English:</span>';
			titleEngStartIndex = str.indexOf(titleEngStartTxt);
			if(str.indexOf(titleEngStartTxt) != -1)
			{
				titleEngStartIndex += titleEngStartTxt.length;
				titleEngEndIndex = str.indexOf('</div>', titleEngStartIndex);
				titleEng = str.substring(titleEngStartIndex, titleEngEndIndex);
				titleEng = decodeHtml(titleEng);
				
				titleEng = titleEng.trim().replace(',', '');
				removeTagIfExist(titleEng);
			}
			
			/* fallback on Synonym if no english title found */
			if(titleEng == null)
			{
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
						titleEng = titleSynArr[0].trim();
						removeTagIfExist(titleEng);
					}
				}
			}

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
			
			/* date */
			season = null;
			year = null;
			dateStartTxt = ( animeManga == "anime" ) ? 'Aired:</span>' : 'Published:</span>';
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
			genresRaw = $(doc).find('[itemprop="genre"]');
			if(genresRaw.length > 0)
			{
				for(j = 0; j < genresRaw.length; j++)
				{
					genres[j] = genresRaw.eq(j).text().trim();
					removeTagIfExist(genres[j]);
				}
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
			
			/* score */
			score = "?";
			scoreEle = $(doc).find("[itemprop=\"ratingValue\"]");
			if(scoreEle.length > 0)
			{
				score = scoreEle.text().trim();
			}
			scoreTag = `Score: ${score}`;
			removeTagIfExist('Score: ', mode = 2);
			
			/* Update Tags */
			if(chkTags.checked)
			{
				if(titleEng && chkEnglish.checked) { tags.push(titleEng); }
				if(titleNative && chkNative.checked) { tags.push(titleNative); }
				if(season && chkSeason.checked) { tags.push(season); }
				if(year && chkYear.checked) { tags.push(year); }
				if(studios && chkStudio.checked) { tags.push(studios); }
				if(producers && chkProducers.checked) { tags.push(producers); }
				if(licensors && chkLicensors.checked) { tags.push(licensors); }
				if(serializations && chkSerialization.checked) { tags.push(serializations); }
				if(genres && chkGenres.checked) { tags.push(genres); }
				if(authors && chkAuthors.checked) { tags.push(authors); }
				if(chkAired.checked) { tags.push(airedTag); }
				if(chkPublished.checked) { tags.push(publishedTag); }
				if(chkScore.checked) { tags.push(scoreTag); }
				if(chkRank.checked) { tags.push(rankTag); }
				if(chkRating.checked) { tags.push(ratingTag); }
				if(chkDuration.checked) { tags.push(durationTag); }
				if(chkTotalDuration.checked) { tags.push(totalDurationTag); }
				
				newTagStr = tags.join(", ");
				
				if(animeManga === 'anime') {
					reqUrl = 'https://myanimelist.net/includes/ajax.inc.php?t=22&tags=';
					amid = 'aid';
				} else {
					reqUrl = 'https://myanimelist.net/includes/ajax.inc.php?t=30&tags=';
					amid = 'mid';
				}

				csrf = $('meta[name="csrf_token"]').attr('content');
				request2 = new XMLHttpRequest();
				request2.open("post", reqUrl + encodeURIComponent(newTagStr), false);
				request2.setRequestHeader("Content-Type", "application/x-www-form-urlencoded; charset=UTF-8");
				request2.setRequestHeader("X-Requested-With", "XMLHttpRequest");
				request2.send(`${amid}=${id}&csrf_token=${csrf}`);
			}
			
			/* thumbs */
			img = $(doc).find("img[itemprop=\"image\"]")[0];
			imgUrl = img.getAttribute("data-src") || img.src;
			
			imgUrlt = imgUrl.replace(".jpg", "t.jpg");
			imgUrlv = imgUrl.replace(".jpg", "v.jpg");
			imgUrll = imgUrl.replace(".jpg", "l.jpg");
			
			/* Synopsis (description) */
			desc = $(doc).find("[itemprop=\"description\"]").text().replace(/\r\n/g, " ").replace(/\n/g, "\\a ").replace(/\"/g, "\\\"").trim();
			
			/* Generate CSS */
			cssLine = template.value
				.replaceAll('[DEL]', '')
				.replaceAll('[ID]', id)
				.replaceAll('[TYPE]', animeManga)
				.replaceAll('[IMGURL]', imgUrl)
				.replaceAll('[IMGURLT]', imgUrlt)
				.replaceAll('[IMGURLV]', imgUrlv)
				.replaceAll('[IMGURLL]', imgUrll)
				.replaceAll('[TITLE]', title)
				.replaceAll(/(\[TITLEENG\]|\[ENGTITLE\])/g, titleEng ? titleEng : title)
				.replaceAll(/(\[TITLERAW\]|\[RAWTITLE\])/g, titleNative ? titleNative : "")
				.replaceAll('[GENRES]', genres ? genres.join(", ") : "")
				.replaceAll('[STUDIOS]', studios ? studios.join(", ") : "")
				.replaceAll('[PRODUCERS]', producers ? producers.join(", ") : "")
				.replaceAll('[LICENSORS]', licensors ? licensors.join(", ") : "")
				.replaceAll('[SERIALIZATION]', serializations ? serializations.join(", ") : "")
				.replaceAll('[AUTHORS]', authors ? authors.join(" & ") : "")
				.replaceAll('[SEASON]', season)
				.replaceAll('[YEAR]', year)
				.replaceAll('[RANK]', rank)
				.replaceAll('[SCORE]', score)
				.replaceAll('[STARTDATE]', startDate)
				.replaceAll('[ENDDATE]', endDate)
				.replaceAll('[RATING]', rating)
				.replaceAll('[DURATIONEP]', duration)
				.replaceAll('[DURATIONTOTAL]', totalDuration)
				.replaceAll('[DESC]', desc);
			
			result.value += cssLine + "\n";
			result.scrollTop = result.scrollHeight;
		}
		catch(e)
		{
			console.log(`error on ${animeManga} #${id}: ${e}`);
			errorCount++;
		}
		
		i++;
		
		statusText.textContent = `Processed ${i} of ${newData.length}`;
		percent = i / newData.length * 100;
		statusBar.style.cssText = `--percent: ${percent}%`;

		timeText.textContent = `~ ${timeRemaining} left`;
		
		timeout = setTimeout(ProcessNext, delay.value);
	}
	else
	{
		DoneProcessing();
	}
}

function DoneProcessing()
{
	if(result.value.length > 0)
	{
		localStorage.setItem('burnt_last_run', result.value);
	}
	thumbBtn.value = "Done";
	thumbBtn.disabled = "disabled";
	statusText.textContent = `Completed with ${errorCount} errors`;
	timeText.textContent = '';
	exportBtn.removeAttr('disabled');
	clearBtn.removeAttr('disabled');
	exitBtn.disabled = false;
	exitBtn.value = "Exit";
	exitBtn.onclick = function()
	{
		Exit();
		if(chkTags.checked)
		{
			alert("Refesh the page for tag updates to show.");
		}
		if(errorCount > 0)
		{
			alert(`${errorCount} errors occurred while processing.  See your browser's console for details.\n\nSome updates were probably successful.\nYou can try rerunning the tool to fix these errors (with updated CSS as input and after refreshing your list page).`);
		}
	};
}

function Process()
{
	saveSettings();

	imageLoadDelay = 0;
	exitBtn.disabled = "disabled";
	importBtn.attr('disabled', 'disabled');
	exportBtn.attr('disabled', 'disabled');
	clearBtn.attr('disabled', 'disabled');
	autofill.attr('disabled', 'disabled');
	lastRun.attr('disabled', 'disabled');
	thumbBtn.value = "Stop";
	thumbBtn.onclick = function() {
		thumbBtn.value = 'Stopping...';
		thumbBtn.disabled = 'disabled';
		newData = [];
		clearTimeout(timeout);
		DoneProcessing();
	};
	
	result.value += `\/*\nGenerated by MyAnimeList-Tools v${ver}\nhttps://github.com/ValerioLyndon/MyAnimeList-Tools\n\nTemplate=${template.value.replace(/\*\//g, "*[DEL]/")}\nMatchTemplate=${matchTemplate.value}\n*\/\n\n`;

	for(k = 0; k < data.length; k++)
	{
		statusText.textContent = 'Checking your input for matches...';
		id = data[k][`${animeManga}_id`];
		skip = false;
		oldLines = existing.value.split("\n");
		oldLinesCount = oldLines.length;
		for(j = 0; j < oldLinesCount; j++)
		{
			match = matchTemplate.value.replace(/\[ID\]/g, id).replace(/\[TYPE\]/g, animeManga);
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
				urlStart = oldLines[j].indexOf("http");
				urlEnd = oldLines[j].indexOf(".jpg", urlStart);
				imgUrl = oldLines[j].substring(urlStart, urlEnd + 4);
				tempImg = document.createElement("img");
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
		else
		{
			newData.push(data[k])
		}
	}

	timeout = setTimeout(ProcessNext, imageLoadDelay);
}

function saveSettings()
{
	settings = {
		"css_template": template.value,
		"delay": delay.value,
		"match_template": matchTemplate.value,
		"update_tags": chkTags.checked,
		"checked_tags": {
			"english_title": chkEnglish.checked,
			"native_title": chkNative.checked,
			"season": chkSeason.checked,
			"year": chkYear.checked,
			"genres": chkGenres.checked,
			"authors": chkAuthors.checked,
			"score": chkScore.checked,
			"rank": chkRank.checked,
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
		"clear_tags": chkClearTags.checked,
		"check_existing": chkExisting.checked
	};
	localStorage.setItem('burnt_settings', JSON.stringify(settings));
}
