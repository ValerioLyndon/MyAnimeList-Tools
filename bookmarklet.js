javascript: /*
MyAnimeList CSS Generator and Tags updater

- Original code   2018/Aug/10 by BurntJello http://burntjello.webs.com
- Extra features  2019        by Cateinya
- Fixes           2020/Oct    by Cry5talz 
- Further changes 2021+       by Valerio Lyndon
*/

ver = '4.0_prerelease';
verMod = '2021/Jul/03';

/* modify these to change your defaults */
CSS_TEMPLATE = '/* [TITLE] *[DEL]/ .data.image a[href^="/anime/[ID]/"]::before { background-image: url([IMGURL]); }';
DELAY = "500";
MATCH_TEMPLATE = "/anime/[ID]/";
CHECK_EXISTING = false;
CLEAR_TAGS = false;
UPDATE_TAGS = false;
TAGS_ENGLISH_TITLE = false;
TAGS_NATIVE_TITLE = false;
TAGS_SEASON = false;
TAGS_YEAR = false;
TAGS_GENRES = false;
TAGS_AUTHORS = false;
TAGS_SCORE = false;
TAGS_RANK = false;
TAGS_STUDIO = false;
TAGS_PRODUCERS = false;
TAGS_LICENSORS = false;
TAGS_SERIALIZATION = false;
TAGS_AIRED = false;
TAGS_PUBLISHED = false;
TAGS_RATING = false;


/* CSS_TEMPLATE = "[ID] | [TYPE] | [TITLE] | [TITLEENG] | [TITLERAW] | [IMGURL] | [GENRES] | [AUTHORS] | [STUDIOS] | [PRODUCERS] | [LICENSORS] | [SERIALIZATION] | [SEASON] | [YEAR] | [RANK] | [SCORE] | [STARTDATE] | [ENDDATE] | [RATING] | [DESC]"; */

/* TOOL CODE */

modernStyle = (document.getElementById("list_surround")) ? false : true;
animeManga = window.location.href.replace("https://myanimelist.net/", "").split("/")[0].replace("list", "");

/* Create GUI */

function css(css) {
	var newCSS = document.createElement('style');
	newCSS.className = 'burnt-css';
	newCSS.textContent = css;
	document.head.appendChild(newCSS);
	return newCSS;
}

css(`
#burnt-gui {
	position: fixed;
	left: 50px;
	top: 50px;
	bottom: 50px;
	right: 50px;
	z-index: 99999;
	display: flex;
	flex-flow: row nowrap;
	background-color: #fff;
	border-style: solid;
	box-sizing: border-box;
	color: #000;
	font: 12px/1.5 sans-serif;
	text-align: left;
}
#burnt-status {
	background: #e6e6e6;
	padding: 2px 6px;
	margin: 5px 0 10px;
	--percent: 0%;
	background-image: linear-gradient(
			to right,
			#4277f2 var(--percent),
			transparent var(--percent)
		);
}
#burnt-gui * {
	box-sizing: inherit;
	color: #000;
	font: inherit;
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
	display: flex;
	width: 50%;
	flex-flow: column nowrap;
}
#burnt-gui textarea {
	font-family: monospace;
	word-break: break-all;
}
`);

gui = document.createElement("div");
document.body.appendChild(gui);
gui.id = "burnt-gui";

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
thumbBtn.value = "Start";

exitBtn = document.createElement("input");
guiL.appendChild(exitBtn);
exitBtn.classList.add('burnt-btn');
exitBtn.type = "button";
exitBtn.value = "Exit";

statusText = document.createElement("div");
statusText.id = "burnt-status";
guiL.appendChild(statusText);

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

delay = field(DELAY, "Delay", "Delay (ms) between requests to avoid spamming the server.");
delay.style.width = "50px";

matchTemplate = field(MATCH_TEMPLATE, "Match Template", "Line matching template for reading previously generated code. Should match the ID format of your template. Only matching on [ID] is not enough, include previous/next characters to ensure the match is unique.");

template = field(CSS_TEMPLATE, "Template", "CSS template.  Replacements are [ID], [IMGURL], [IMGURLT], [IMGURLV], [IMGURLL], [TITLE], [TITLEENG], [TITLERAW] [GENRES], [STUDIOS], [PRODUCERS], [SEASON], [YEAR], [RANK], [SCORE], [STARTDATE], [ENDDATE], and [DESC]. ([DEL] will just be deleted)");
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
}

$(guiL).append($('<br />'));

chkClearTags = chk(CLEAR_TAGS, "Overwrite current tags", 'burnt-chk burnt-tag', "Overwrite all of your current tags with the new ones. If all other tag options are unchecked, this will completely remove all tags.\n\nNot recommended if you use tags for anything outside of this tool. But even with this disabled, I would still consider your tags forfeit as soon as you click start as it will be a monumentous task to remove all the generated content from your tags.");

$(guiL).append($('<br />'));

chkExisting = chk(CHECK_EXISTING, "Validate existing images", 'burnt-chk', "Attempt to load all images, updating the url if it fails. There is a 5 second delay to allow images to load.  I do not recommend using this while adding new anime or updating tags!");

$(guiL).append($(`<br /><small style="font-size: 10px; font-style: italic;">MyAnimeList-Tools v${ver}<br />Last modified ${verMod}</small>`));


textareaL = document.createElement('div');
textareaL.className = 'burnt-textarea';
guiR.appendChild(textareaL);

$(textareaL).append($('<b style="font-weight: bold;">Input</b>'));

existing = document.createElement("textarea");
existing.style.cssText = `
	display: block;
	height: 100%;
	width: 100%;
	resize: none;
`;
existing.title = "Copy previously generated code here. The style for one anime ID must all be on the same line.";
existing.placeholder = "Copy previously generated code here. The style for one anime ID must all be on the same line.";
textareaL.appendChild(existing);

textareaR = document.createElement('div');
textareaR.className = 'burnt-textarea';
textareaR.style.paddingLeft = '10px';
guiR.appendChild(textareaR);

$(textareaR).append($('<b style="font-weight: bold;">Output</b>'));

result = document.createElement("textarea");
result.style.cssText = `
	display: block;
	height: 100%;
	width: 100%;
	resize: none;
`;
result.title = "Newly generated code will be output here.";
result.placeholder = "Newly generated code will be output here.";
result.readOnly = "readonly";
textareaR.appendChild(result);

toggleTags();

/* Common Functions */

function decodeHtml(html) {
	var txt = document.createElement("textarea");
	txt.innerHTML = html;
	return txt.value;
}

/* Primary Functions */

moreIds = [];

errorCount = 0;
i = 0;
function ProcessNext()
{
	if(i < moreIds.length)
	{
		moreId = moreIds[i];
		
		try
		{
			id = moreId.replace("more", "");
			url = "https://myanimelist.net/" + animeManga + "/" + id;

			request = new XMLHttpRequest();
			request.open("get", url, false);
			request.send(null);
			str = request.responseText;
			doc = new DOMParser().parseFromString(request.responseText, "text/html");
		
			/* get current tags */
			tags = new Array();
			if(chkTags.checked)
			{
				if(modernStyle)
				{
					tagEl = document.querySelector(`.tags-${id}`);
					if(tagEl)
					{
						tagEls = tagEl.querySelectorAll('div a');
						for(j = 0; j< tagEls.length; j++)
						{
							tags.push(tagEls[j].textContent);
						}
					}
					else
					{
						alert('Tags are not shown on your list!\n\nPlease uncheck the "Update tags" box, or check the "Tags" box at https://myanimelist.net/editprofile.php?go=listpreferences and try again.');
					}
					
				}
				else
				{
					tagEl = document.getElementById("tagRow" + id);
					if(tagEl)
					{
						tags = tagEl.innerHTML.split(",");
					}
					else
					{
						alert('Tags are not shown on your list!\n\nPlease uncheck the "Update tags" box, or check the "Tags" box at https://myanimelist.net/editprofile.php?go=listpreferences and try again.');
					}
				}
			}
			
			if(chkClearTags.checked) {
				tags = [];
				tagsLength = 0;
			} else {
				tagsLength = tags.length;
				/* remove extra whitespace */
				for(j = 0; j < tagsLength; j++)
				{
					tags[j] = tags[j].trim();
				}
			}
			
			/* alternate titles */

			ENGLISH_START = "English:</span>";
			englishHtml = null;
			englishHtmlStartIndex = str.indexOf(ENGLISH_START);
			if(str.indexOf(ENGLISH_START) != -1)
			{
				englishHtmlStartIndex += ENGLISH_START.length;
				englishHtmlEndIndex = str.indexOf("</div>", englishHtmlStartIndex);
				englishHtml = str.substring(englishHtmlStartIndex, englishHtmlEndIndex);
				englishHtml = decodeHtml(englishHtml);
				
				englishHtml = englishHtml.replace(/^\s+|\s+$/g, "").replace(/,/g, "");
				englishUpper = englishHtml.toUpperCase();
				for(k = 0; k < tagsLength; k++)
				{
					if(tags[k].length == 0 || tags[k].toUpperCase() == englishUpper)
					{
						tags.splice(k, 1);
						tagsLength--;
						k--;
					}
				}
			}
			
			SYN_START = "Synonyms:</span>";
			if(englishHtml == null)
			{
				synHtmlStartIndex = str.indexOf(SYN_START);
				if(str.indexOf(SYN_START) != -1)
				{
					synHtmlStartIndex += SYN_START.length;
					synHtmlEndIndex = str.indexOf("</div>", synHtmlStartIndex);
					synHtml = str.substring(synHtmlStartIndex, synHtmlEndIndex);
					synHtml = decodeHtml(synHtml);
					synArr = synHtml.split(",");
					if(synArr.length > 0)
					{
						englishHtml = synArr[0].replace(/^\s+|\s+$/g, "");
						synUpper = englishHtml.toUpperCase();
						for(k = 0; k < tagsLength; k++)
						{
							if(tags[k].length == 0 || tags[k].toUpperCase() == synUpper)
							{
								tags.splice(k, 1);
								tagsLength--;
								k--;
							}
						}
					}
				}
			}

			NATIVE_START = "Japanese:</span>";
			nativeHtml = null;
			nativeHtmlStartIndex = str.indexOf(NATIVE_START);
			if(str.indexOf(NATIVE_START) != -1)
			{
				nativeHtmlStartIndex += NATIVE_START.length;
				nativeHtmlEndIndex = str.indexOf("</div>", nativeHtmlStartIndex);
				nativeHtml = str.substring(nativeHtmlStartIndex, nativeHtmlEndIndex);
				nativeHtml = decodeHtml(nativeHtml);
				
				nativeHtml = nativeHtml.replace(/^\s+|\s+$/g, "").replace(/,/g, "");
				nativeUpper = nativeHtml.toUpperCase();
				for(k = 0; k < tagsLength; k++)
				{
					if(tags[k].length == 0 || tags[k].toUpperCase() == nativeUpper)
					{
						tags.splice(k, 1);
						tagsLength--;
						k--;
					}
				}
			}
			
			/* date */
			AIRED_START = "Aired:</span>";
			PUBLISHED_START = "Published:</span>";
			DATE_START = ( animeManga == "anime" ) ? AIRED_START : PUBLISHED_START;
			season = null;
			year = null;
			dateHtmlStartIndex = str.indexOf(DATE_START) + DATE_START.length;
			if(str.indexOf(DATE_START) != -1)
			{
				dateHtmlEndIndex = str.indexOf("</div>", dateHtmlStartIndex);
				dateHtml = str.substring(dateHtmlStartIndex, dateHtmlEndIndex);
				dateArr = dateHtml.split(" to ");
				date1Arr = dateArr[0].split(",");
				if(date1Arr.length == 2)
				{
					season = null;
					if(date1Arr[0].indexOf("Jan") != -1 || date1Arr[0].indexOf("Feb") != -1 || date1Arr[0].indexOf("Mar") != -1)
					{
						season = "Winter";
					}
					if(date1Arr[0].indexOf("Apr") != -1 || date1Arr[0].indexOf("May") != -1 || date1Arr[0].indexOf("Jun") != -1)
					{
						season = "Spring";
					}
					if(date1Arr[0].indexOf("Jul") != -1 || date1Arr[0].indexOf("Aug") != -1 || date1Arr[0].indexOf("Sep") != -1)
					{
						season = "Summer";
					}
					if(date1Arr[0].indexOf("Oct") != -1 || date1Arr[0].indexOf("Nov") != -1 || date1Arr[0].indexOf("Dec") != -1)
					{
						season = "Fall";
					}
					year = date1Arr[1].replace(/^\s+|\s+$/g, "");
					for(k = 0; k < tagsLength; k++)
					{
						if(
							tags[k].length == 0 ||
							tags[k].toUpperCase() == season.toUpperCase() ||
							tags[k] == year ||
							tags[k].indexOf('Aired: ') != -1 ||
							tags[k].indexOf('Published: ') != -1
						) {
							tags.splice(k, 1);
							tagsLength--;
							k--;
						}
					}
				}
			}
			
			/* studio (anime) */
			STUDIOS_START = "Studios:</span>";
			studios = null;
			studiosHtmlStartIndex = str.indexOf(STUDIOS_START);
			if(str.indexOf(STUDIOS_START) != -1)
			{
				studiosHtmlStartIndex += STUDIOS_START.length;
				studiosHtmlEndIndex = str.indexOf("</div>", studiosHtmlStartIndex);
				studiosHtml = str.substring(studiosHtmlStartIndex, studiosHtmlEndIndex);
				
				studios = studiosHtml.split(",");
				studiosLength = studios.length;
				for(j = 0; j < studiosLength; j++)
				{
					g1 = studios[j].indexOf("\">") + 2;
					g2 = studios[j].indexOf("</a>");
					if(g2 == -1) { studios = null; break; }
					studios[j] = studios[j].substring(g1, g2).replace(/^\s+|\s+$/g, "");
					studios[j] = decodeHtml(studios[j]);
					studioUpper = studios[j].toUpperCase();
					
					for(k = 0; k < tagsLength; k++)
					{
						if(tags[k].length == 0 || tags[k].toUpperCase() == studioUpper)
						{
							tags.splice(k, 1);
							tagsLength--;
							k--;
						}
					}
				}
			}
			
			/* authors (manga) */
			AUTHORS_START = "Authors:</span>";
			authors = null;
			authorsHtmlStartIndex = str.indexOf(AUTHORS_START);
			if(str.indexOf(AUTHORS_START) != -1)
			{
				authorsHtmlStartIndex += AUTHORS_START.length;
				authorsHtmlEndIndex = str.indexOf("</div>", authorsHtmlStartIndex);
				authorsHtml = str.substring(authorsHtmlStartIndex, authorsHtmlEndIndex);

				authors = authorsHtml.split(", <a");
				authorsLength = authors.length;
				for(j = 0; j < authorsLength; j++)
				{
					g1 = authors[j].indexOf("\">") + 2;
					g2 = authors[j].indexOf("</a>");
					if(g2 == -1) { authors = null; break; }
					authors[j] = authors[j].substring(g1, g2).replace(/^\s+|\s+$/g, "").replaceAll(',','');
					authors[j] = decodeHtml(authors[j]);
					authorUpper = authors[j].toUpperCase();
					
					for(k = 0; k < tagsLength; k++)
					{
						if(tags[k].length == 0 || tags[k].toUpperCase() == authorUpper)
						{
							tags.splice(k, 1);
							tagsLength--;
							k--;
						}
					}
				}
			}

			/* producers (anime) */
			PRODUCERS_START = "Producers:</span>";
			producers = null;
			producersHtmlStartIndex = str.indexOf(PRODUCERS_START);
			if(str.indexOf(PRODUCERS_START) != -1)
			{
				producersHtmlStartIndex += PRODUCERS_START.length;
				producersHtmlEndIndex = str.indexOf("</div>", producersHtmlStartIndex);
				producersHtml = str.substring(producersHtmlStartIndex, producersHtmlEndIndex);
	
				producers = producersHtml.split(",");
				producersLength = producers.length;
				for(j = 0; j < producersLength; j++)
				{
					if(producers[j].indexOf("<sup>") == -1)
					{
						g1 = producers[j].indexOf("\">") + 2;
						g2 = producers[j].indexOf("</a>");
						if(g2 == -1) { producers = null; break; }
						producers[j] = producers[j].substring(g1, g2).replace(/^\s+|\s+$/g, "");
						producers[j] = decodeHtml(producers[j]);
						producersUpper = producers[j].toUpperCase();
						
						for(k = 0; k < tagsLength; k++)
						{
							if(tags[k].length == 0 || tags[k].toUpperCase() == producersUpper)
							{
								tags.splice(k, 1);
								tagsLength--;
								k--;
							}
						}
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
			LICENSORS_START = "Licensors:</span>";
			licensors = null;
			licensorsHtmlStartIndex = str.indexOf(LICENSORS_START);
			if(str.indexOf(LICENSORS_START) != -1)
			{
				licensorsHtmlStartIndex += LICENSORS_START.length;
				licensorsHtmlEndIndex = str.indexOf("</div>", licensorsHtmlStartIndex);
				licensorsHtml = str.substring(licensorsHtmlStartIndex, licensorsHtmlEndIndex);
	
				licensors = licensorsHtml.split(",");
				licensorsLength = licensors.length;
				for(j = 0; j < licensorsLength; j++)
				{
					if(licensors[j].indexOf("<sup>") == -1)
					{
						g1 = licensors[j].indexOf("\">") + 2;
						g2 = licensors[j].indexOf("</a>");
						if(g2 == -1) { licensors = null; break; }
						licensors[j] = licensors[j].substring(g1, g2).replace(/^\s+|\s+$/g, "");
						licensors[j] = decodeHtml(licensors[j]);
						licensorsUpper = licensors[j].toUpperCase();
						
						for(k = 0; k < tagsLength; k++)
						{
							if(tags[k].length == 0 || tags[k].toUpperCase() == licensorsUpper)
							{
								tags.splice(k, 1);
								tagsLength--;
								k--;
							}
						}
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
			SERIALIZATION_START = "Serialization:</span>";
			serialization = null;
			serializationHtmlStartIndex = str.indexOf(SERIALIZATION_START);
			if(str.indexOf(SERIALIZATION_START) != -1)
			{
				serializationHtmlStartIndex += SERIALIZATION_START.length;
				serializationHtmlEndIndex = str.indexOf("</div>", serializationHtmlStartIndex);
				serializationHtml = str.substring(serializationHtmlStartIndex, serializationHtmlEndIndex);
	
				serialization = serializationHtml.split(",");
				serializationLength = serialization.length;
				for(j = 0; j < serializationLength; j++)
				{
					if(serialization[j].indexOf("<sup>") == -1)
					{
						g1 = serialization[j].indexOf("\">") + 2;
						g2 = serialization[j].indexOf("</a>");
						if(g2 == -1) { serialization = null; break; }
						serialization[j] = serialization[j].substring(g1, g2).replace(/^\s+|\s+$/g, "");
						serialization[j] = decodeHtml(serialization[j]);
						serializationUpper = serialization[j].toUpperCase();
						
						for(k = 0; k < tagsLength; k++)
						{
							if(tags[k].length == 0 || tags[k].toUpperCase() == serializationUpper)
							{
								tags.splice(k, 1);
								tagsLength--;
								k--;
							}
						}
					}
					else
					{
						serialization.splice(j, 1);
						serializationLength--;
						j--;
					}
				}
			}

			/* rating (anime) */
			RATING_START = "Rating:</span>";
			ratingHtml = "";
			ratingHtmlStartIndex = str.indexOf(RATING_START);
			if(ratingHtmlStartIndex != -1)
			{
				ratingHtmlStartIndex += RATING_START.length;
				ratingHtmlStartIndex += 3; /* to avoid spaces that break end index */
				ratingHtmlEndIndex = str.indexOf(" ", ratingHtmlStartIndex);
				ratingHtml = str.substring(ratingHtmlStartIndex, ratingHtmlEndIndex);
			}
			
			/* genres */
			genres = [];
			genresRaw = $(doc).find('[itemprop="genre"]');
			if(genresRaw.length !== 0)
			{
				for(j = 0; j < genresRaw.length; j++)
				{
					genres[j] = genresRaw.eq(j).text().trim();
					
					/* removes duplicates from tags */
					for(k = 0; k < tagsLength; k++)
					{
						if(tags[k].length == 0 || tags[k].toUpperCase() == genres[j].toUpperCase())
						{
							tags.splice(k, 1);
							tagsLength--;
							k--;
						}
					}
				}
			}
			
			/* rank */
			RANK_START = "Ranked:</span>";
			rankHtml = "";
			rankHtmlStartIndex = str.indexOf(RANK_START);
			if(rankHtmlStartIndex != -1)
			{
				rankHtmlStartIndex += RANK_START.length;
				rankHtmlEndIndex = str.indexOf("<sup>", rankHtmlStartIndex);
				rankHtml = str.substring(rankHtmlStartIndex, rankHtmlEndIndex);
				rankHtml = rankHtml.replace(/^\s+|\s+$/g, "").replace("#", "");
			}
			
			/* score */
			scoreHtml = "";
			scoreEle = $(doc).find("[itemprop=\"ratingValue\"]");
			if(scoreEle.length > 0)
			{
				scoreHtml = scoreEle.text().trim();
			}
			
			/* Update Tags */
			if(chkTags.checked)
			{
				if(englishHtml && chkEnglish.checked) { tags.push(englishHtml); }
				if(nativeHtml && chkNative.checked) { tags.push(nativeHtml); }
				if(season && chkSeason.checked) { tags.push(season); }
				if(year && chkYear.checked) { tags.push(year); }
				if(studios && chkStudio.checked) { tags = tags.concat(studios); }
				if(producers && chkProducers.checked) { tags = tags.concat(producers); }
				if(licensors && chkLicensors.checked) { tags = tags.concat(licensors); }
				if(serialization && chkSerialization.checked) { tags = tags.concat(serialization); }
				if(genres && chkGenres.checked) { tags = tags.concat(genres); }
				if(authors && chkAuthors.checked) { tags = tags.concat(authors); }
				if(chkAired.checked) { tags.push("Aired: " + dateArr[0].replace(/^\s+|\s+$/g, "").replace(',', '') + (dateArr.length == 2 ? " to " + dateArr[1].replace(/^\s+|\s+$/g, "").replace(',', '') : "")); }
				if(chkPublished.checked) { tags.push("Published: " + dateArr[0].replace(/^\s+|\s+$/g, "").replace(',', '') + (dateArr.length == 2 ? " to " + dateArr[1].replace(/^\s+|\s+$/g, "").replace(',', '') : "")); }
				if(chkScore.checked) { tags.push("Score: " + scoreHtml); }
				if(chkRank.checked) { tags.push("Ranked: " + rankHtml); }
				if(chkRating.checked) { tags.push("Rating: " + ratingHtml); }
				
				newTagStr = tags.join(", ");
				
				if(animeManga === 'anime') {
					reqUrl = 'https://myanimelist.net/includes/ajax.inc.php?t=22&tags=';
					amid = 'aid';
				} else {
					reqUrl = 'https://myanimelist.net/includes/ajax.inc.php?t=30&tags=';
					amid = 'mid';
				}

				request2 = new XMLHttpRequest();
				request2.open("post", reqUrl + encodeURIComponent(newTagStr), false);
				request2.setRequestHeader("Content-Type", "application/x-www-form-urlencoded; charset=UTF-8");
				request2.setRequestHeader("X-Requested-With", "XMLHttpRequest");
				var csrf = $('meta[name="csrf_token"]').attr('content');
				request2.send(amid + '=' + id + '&csrf_token=' + csrf);
			}
			
			/* thumbs */
			img = $(doc).find("img[itemprop=\"image\"]")[0];
			imgUrl = img.getAttribute("data-src") || img.src;
			
			imgUrlt = imgUrl.replace(".jpg", "t.jpg");
			imgUrlv = imgUrl.replace(".jpg", "v.jpg");
			imgUrll = imgUrl.replace(".jpg", "l.jpg");
			
			altText = img.alt;
			
			/* Synopsis (description) */
			desc = $(doc).find("[itemprop=\"description\"]").text().replace(/\r\n/g, " ").replace(/\n/g, "\\a ").replace(/\"/g, "\\\"").replace(/^\s+|\s+$/g, "");
			
			/* Generate CSS */
			cssLine = template.value
				.replace(/\[DEL\]/g, "")
				.replace(/\[ID\]/g, id)
				.replace(/\[TYPE\]/g, animeManga)
				.replace(/\[IMGURL\]/g, imgUrl)
				.replace(/\[IMGURLT\]/g, imgUrlt)
				.replace(/\[IMGURLV\]/g, imgUrlv)
				.replace(/\[IMGURLL\]/g, imgUrll)
				.replace(/\[TITLE\]/g, altText)
				.replace(/(\[TITLEENG\]|\[ENGTITLE\])/g, englishHtml ? englishHtml : altText)
				.replace(/(\[TITLERAW\]|\[RAWTITLE\])/g, nativeHtml ? nativeHtml : "")
				.replace(/\[GENRES\]/g, genres ? genres.join(", ") : "")
				.replace(/\[STUDIOS\]/g, studios ? studios.join(", ") : "")
				.replace(/\[PRODUCERS\]/g, producers ? producers.join(", ") : "")
				.replace(/\[LICENSORS\]/g, licensors ? licensors.join(", ") : "")
				.replace(/\[SERIALIZATION\]/g, serialization ? serialization.join(", ") : "")
				.replace(/\[AUTHORS\]/g, authors ? authors.join(" & ") : "")
				.replace(/\[SEASON\]/g, season)
				.replace(/\[YEAR\]/g, year)
				.replace(/\[RANK\]/g, rankHtml)
				.replace(/\[SCORE\]/g, scoreHtml)
				.replace(/\[STARTDATE\]/g, dateArr[0].replace(/^\s+|\s+$/g, ""))
				.replace(/\[ENDDATE\]/g, dateArr.length == 2 ? dateArr[1].replace(/^\s+|\s+$/g, "") : "")
				.replace(/\[RATING\]/g, ratingHtml)
				.replace(/\[DESC\]/g, desc);
			
			result.value += cssLine + "\n";
		}
		catch(e)
		{
			/*alert("error " + moreId + ":" + e);*/
			console.log("error " + moreId, e);
			errorCount++;
		}
		
		i++;
		
		statusText.innerHTML = "Processed " + i + " of " + moreIds.length;
		percent = i / moreIds.length * 100;
		statusText.style.cssText = '--percent: ' + percent + '%';
		
		setTimeout(ProcessNext, delay.value);
	}
	else
	{
		thumbBtn.value = "Done";
		thumbBtn.disabled = "disabled";
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
				alert(errorCount + " errors occurred while processing.  See your browser's console for details.\n\nSome updates were probably successful.\nYou can try rerunning the tool to fix these errors (with updated CSS as input and after refreshing your list page).");
			}
		};
	}
}

function Process()
{
	imageLoadDelay = 0;
	exitBtn.disabled = "disabled";
	thumbBtn.value = "Stop";
	thumbBtn.onclick = function(){ moreIds = new Array();};
	
	result.value += `\/*\nGenerated by MyAnimeList-Tools v${ver}\nhttps://github.com/ValerioLyndon/MyAnimeList-Tools\n\nTemplate=${template.value.replace(/\*\//g, "*[DEL]/")}\nMatchTemplate=${matchTemplate.value}\n*\/\n\n`;
	
	if(modernStyle)
	{
		ids = $("tr.more-info").map(function () { return this.id.replace("more-", ""); } ).get() ;
	}
	else
	{
		ids = $("div.hide").map(function () { return this.id.replace("more", ""); } ).get() ;
	}
	
	idsLength = ids.length;
	for(k = 0; k < idsLength; k++)
	{
		indexOf = -1;
		oldLines = existing.value.split("\n");
		oldLinesCount = oldLines.length;
		for(j = 0; j < oldLinesCount; j++)
		{
			oldId = matchTemplate.value.replace(/\[ID\]/g, ids[k]);
			indexOf = oldLines[j].indexOf(oldId);
			if(indexOf != -1)
			{
				break;
			}
		}

		if(indexOf != -1)
		{
			if(chkExisting.checked)
			{
				imageLoadDelay = 5000;
				urlStart = oldLines[j].indexOf("http");
				urlEnd = oldLines[j].indexOf(".jpg", urlStart);
				imgUrl = oldLines[j].substring(urlStart, urlEnd + 4);
				tempImg = document.createElement("img");
				tempImg.oldLine = oldLines[j];
				tempImg.animeId = ids[k];
				tempImg.onload = function(imgLoadEvent)
				{
					/*console.log("imgLoadEvent(" + imgUrl + ")", imgLoadEvent.target.naturalHeight);*/
					result.value += imgLoadEvent.target.oldLine + "\n";
				};
				tempImg.onerror = function(imgErrorEvent)
				{
					/*console.log("imgErrorEvent(" + imgUrl + ")", imgErrorEvent);*/
					moreIds.push(imgErrorEvent.target.animeId);
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
			moreIds.push(ids[k]);
		}
	}

	setTimeout(ProcessNext, imageLoadDelay);
}

thumbBtn.onclick = function() { Process(); };
exitBtn.onclick = Exit;

function Start()
{
	alert("It's best to use the 'All Anime' view.\n\nCopy existing styles to the textarea before starting. This script will remove what is no longer needed, skip what already exists, and add the rest.\n\nThe options have tooltips, hover over them to see detailed info.");
}

function Exit()
{
	$('#burnt-gui').remove();
	$('.burnt-css').remove();
}

Start();