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

function css(css) {
	var newCSS = document.createElement('style');
	newCSS.className = 'burnt-css';
	newCSS.textContent = css;
	document.head.appendChild(newCSS);
	return newCSS;
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
			url = `https://myanimelist.net/${animeManga}/${id}`;

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
					
				}
				else
				{
					tagEl = document.getElementById(`tagRow${id}`);
					if(tagEl)
					{
						tags = tagEl.innerHTML.split(",");
					}
				}
				if(!tagEl)
				{
					alert('Tags are not shown on your list!\n\nPlease uncheck the "Update tags" box, or check the "Tags" box at https://myanimelist.net/editprofile.php?go=listpreferences and try again.');
					moreIds = [];
				}
			}
			
			if(chkClearTags.checked) {
				tags = [];
			} else {
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

			/* alternate titles */

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
			ratingStartTxt = "Rating:</span>";
			ratingStartIndex = str.indexOf(ratingStartTxt);
			if(ratingStartIndex != -1)
			{
				ratingStartIndex += ratingStartTxt.length;
				ratingStartIndex += 3; /* to avoid spaces that break end index */
				ratingEndIndex = str.indexOf(" ", ratingStartIndex);
				rating = str.substring(ratingStartIndex, ratingEndIndex);
			}
			ratingTag = `Rating: ${rating}`;
			removeTagIfExist('Rating: ', mode = 2);
			
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
				request2.send(`${amid}=${id}&csrf_token=${csrf}`);
			}
			
			/* thumbs */
			img = $(doc).find("img[itemprop=\"image\"]")[0];
			imgUrl = img.getAttribute("data-src") || img.src;
			
			imgUrlt = imgUrl.replace(".jpg", "t.jpg");
			imgUrlv = imgUrl.replace(".jpg", "v.jpg");
			imgUrll = imgUrl.replace(".jpg", "l.jpg");
			
			altText = img.alt;
			
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
				.replaceAll('[TITLE]', altText)
				.replaceAll(/(\[TITLEENG\]|\[ENGTITLE\])/g, titleEng ? titleEng : altText)
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
				.replaceAll('[DESC]', desc);
			
			result.value += cssLine + "\n";
		}
		catch(e)
		{
			console.log(`error on ${moreId}: ${e}`);
			errorCount++;
		}
		
		i++;
		
		statusText.innerHTML = `Processed ${i} of ${moreIds.length}`;
		percent = i / moreIds.length * 100;
		statusText.style.cssText = `--percent: ${percent}%`;
		
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
				alert(`${errorCount} errors occurred while processing.  See your browser's console for details.\n\nSome updates were probably successful.\nYou can try rerunning the tool to fix these errors (with updated CSS as input and after refreshing your list page).`);
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
					result.value += imgLoadEvent.target.oldLine + "\n";
				};
				tempImg.onerror = function(imgErrorEvent)
				{
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

function Exit()
{
	$('#burnt-gui').remove();
	$('.burnt-css').remove();
}

thumbBtn.onclick = function() { Process(); };
exitBtn.onclick = Exit;

alert("It's best to use the 'All Anime' view.\n\nCopy existing styles to the textarea before starting. This script will remove what is no longer needed, skip what already exists, and add the rest.\n\nThe options have tooltips, hover over them to see detailed info.");
