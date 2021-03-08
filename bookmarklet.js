javascript: /*
MyAnimeList CSS Generator and Tags updater

- Original code   2018/Aug/10 by BurntJello http://burntjello.webs.com
- Extra features  2019        by Cateinya
- Fixes           2020/Oct    by Cry5talz 
- Further changes 2021+       by Valerio Lyndon

Last modification: 2021/Mar/07
*/

/* modify these to change your defaults */
CSS_TEMPLATE = '/* [TITLE] *[DEL]/ .data.image a[href^="/anime/[ID]/"]::before { background-image: url([IMGURL]); }';
DELAY = "500";
MATCH_TEMPLATE = "/anime/[ID]/";
CHECK_EXISTING = false;
UPDATE_TAGS = false;
TAGS_ENGLISH_TITLE = false;
TAGS_NATIVE_TITLE = false;
TAGS_SEASON = false;
TAGS_YEAR = false;
TAGS_STUDIO = false;
TAGS_GENRES = false;
TAGS_PRODUCERS = false;
TAGS_AIRED = false;
TAGS_SCORE = false;
TAGS_RANK = false;


/* CSS_TEMPLATE = "[ID] | [TITLE] | [TITLEENG] | [TITLERAW] | [IMGURL] | [GENRES] | [STUDIOS] | [PRODUCERS] | [SEASON] | [YEAR] | [RANK] | [SCORE] | [STARTDATE] | [ENDDATE] | [DESC]"; */

/* defines the start of certain sections on the anime page */
DESC_START = "Synopsis</h2>";
RANK_START = "Ranked:</span>";

/* Anime page only */
STUDIOS_START = "Studios:</span>";
PRODUCERS_START = "Producers:</span>";
AIRED_START = "Aired:</span>";

/* Manga page only */
PUBLISHED_START = "Published:</span>";
AUTHORS_START = "Authors:</span>"; /* (To be added) */
SERIALIZATION_START = "Serialization:</span>"; /* (To be added) */

/* tool code */
moreIds = new Array();
modernStyle = (document.getElementById("list_surround")) ? false : true;

tempDiv = document.createElement("div");
document.body.appendChild(tempDiv);
tempDiv.style.position = "fixed";
tempDiv.style.left = "50px";
tempDiv.style.top = "50px";
tempDiv.style.bottom = "50px";
tempDiv.style.right = "50px";
tempDiv.style.backgroundColor = "#FFFFFF";
tempDiv.style.borderStyle = "solid";
tempDiv.style.zIndex = "99999";

thumbBtn = document.createElement("input");
tempDiv.appendChild(thumbBtn);
thumbBtn.type = "button";
thumbBtn.value = "Start";

statusText = document.createElement("span");
tempDiv.appendChild(statusText);
statusText.style.color = "#000000";

delay = document.createElement("input");
tempDiv.appendChild(delay);
delay.type = "text";
delay.value = DELAY;
delay.style.width = "50px";
delay.title = "Delay (ms) between requests to avoid spamming the server.";

matchTemplate = document.createElement("input");
tempDiv.appendChild(matchTemplate);
matchTemplate.type = "text";
matchTemplate.value = MATCH_TEMPLATE;
matchTemplate.title = "Line matching template for reading previously generated code. Should match the ID format of your template. Only matching on [ID] is not enough, include previous/next characters to ensure the match is unique.";

template = document.createElement("input");
tempDiv.appendChild(template);
template.type = "text";
template.value = CSS_TEMPLATE;
template.style.width = "50%";
template.title = "CSS template.  Replacements are [ID], [IMGURL], [IMGURLT], [IMGURLV], [IMGURLL], [TITLE], [TITLEENG], [GENRES], [STUDIOS], [PRODUCERS], [SEASON], [YEAR], [RANK], [SCORE], [STARTDATE], [ENDDATE], and [DESC]. ([DEL] will just be deleted)";

chkExistingLabel = document.createElement("span");
tempDiv.appendChild(chkExistingLabel);
chkExistingLabel.style.color = "#000000";
chkExistingLabel.appendChild(document.createTextNode(" Check Existing Images:"));

chkExisting = document.createElement("input");
tempDiv.appendChild(chkExisting);
chkExisting.type = "checkbox";
chkExisting.title = "Attempt to load all images, updating the url if it fails. There is a 5 second delay to allow images to load.  I do not recommend using this while adding new anime or updating tags!";
chkExisting.checked = CHECK_EXISTING;

exitBtn = document.createElement("input");
tempDiv.appendChild(exitBtn);
exitBtn.type = "button";
exitBtn.value = "Exit";

br1 = document.createElement("br");
tempDiv.appendChild(br1);

chkTags = document.createElement("input");
tempDiv.appendChild(chkTags);
chkTags.type = "checkbox";
chkTags.title = "Update Tags - CURRENTLY BROKEN";
chkTags.checked = UPDATE_TAGS;

tagsLabel = document.createElement("span");
tempDiv.appendChild(tagsLabel);
tagsLabel.style.color = "#000000";
tagsLabel.appendChild(document.createTextNode("Update Tags:"));

chkEnglish = document.createElement("input");
tempDiv.appendChild(chkEnglish);
chkEnglish.type = "checkbox";
chkEnglish.title = "English title";
chkEnglish.checked = TAGS_ENGLISH_TITLE;

chkNative = document.createElement("input");
tempDiv.appendChild(chkNative);
chkNative.type = "checkbox";
chkNative.title = "Native title";
chkNative.checked = TAGS_NATIVE_TITLE;

chkSeason = document.createElement("input");
tempDiv.appendChild(chkSeason);
chkSeason.type = "checkbox";
chkSeason.title = "Season";
chkSeason.checked = TAGS_SEASON;

chkYear = document.createElement("input");
tempDiv.appendChild(chkYear);
chkYear.type = "checkbox";
chkYear.title = "Year";
chkYear.checked = TAGS_YEAR;

chkStudio = document.createElement("input");
tempDiv.appendChild(chkStudio);
chkStudio.type = "checkbox";
chkStudio.title = "Studio";
chkStudio.checked = TAGS_STUDIO;

chkGenres = document.createElement("input");
tempDiv.appendChild(chkGenres);
chkGenres.type = "checkbox";
chkGenres.title = "Genres";
chkGenres.checked = TAGS_GENRES;

chkProducers = document.createElement("input");
tempDiv.appendChild(chkProducers);
chkProducers.type = "checkbox";
chkProducers.title = "Producers";
chkProducers.checked = TAGS_PRODUCERS;

chkAired = document.createElement("input");
tempDiv.appendChild(chkAired);
chkAired.type = "checkbox";
chkAired.title = "Aired";
chkAired.checked = TAGS_AIRED;

chkScore = document.createElement("input");
tempDiv.appendChild(chkScore);
chkScore.type = "checkbox";
chkScore.title = "Score";
chkScore.checked = TAGS_SCORE;

chkRank = document.createElement("input");
tempDiv.appendChild(chkRank);
chkRank.type = "checkbox";
chkRank.title = "Rank";
chkRank.checked = TAGS_RANK;

existing = document.createElement("textarea");
tempDiv.appendChild(existing);
existing.style.height = "30%";
existing.style.width = "95%";
existing.style.display = "block";
existing.title = "Copy previously generated code here. The style for one anime ID must all be on the same line.";
existing.placeholder = "Copy previously generated code here. The style for one anime ID must all be on the same line.";

result = document.createElement("textarea");
tempDiv.appendChild(result);
result.style.height = "50%";
result.style.width = "95%";
result.style.display = "block";
result.title = "Newly generated code will be output here.";
result.placeholder = "Newly generated code will be output here.";
result.readOnly = "readonly";

errorCount = 0;
i = 0;
function ProcessNext()
{
	if(i < moreIds.length)
	{
		moreId = moreIds[i];
		
		try
		{
			animeManga = window.location.href.replace("https://myanimelist.net/", "").split("/")[0].replace("list", "");
			id = moreId.replace("more", "");
			url = "https://myanimelist.net/" + animeManga + "/" + id;

			request = new XMLHttpRequest();
			request.open("get", url, false);
			request.send(null);
			str = request.responseText;
			doc = new DOMParser().parseFromString(request.responseText, "text/html");
		
			/* tags */
			tags = new Array();
			if(chkTags.checked)
			{
				if(modernStyle)
				{
					tagEl = document.getElementsByClassName("tags-" + id);
					if(tagEl.length > 0)
					{
						tagEl = tagEl[0].children;
						for(j = 0; j< tagEl.length; j++) { tags.push(tagEl[j].getElementsByTagName("a")[0].textContent); }
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
			tagsLength = tags.length;
			
			for(j = 0; j < tagsLength; j++)
			{
				tags[j] = tags[j].replace(/^\s+|\s+$/g, "");
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
			season = null;
			year = null;
			DATE_START = ( animeManga == "anime" ) ? AIRED_START : PUBLISHED_START;
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
						if(tags[k].length == 0 || tags[k].toUpperCase() == season.toUpperCase() || tags[k] == year)
						{
							tags.splice(k, 1);
							tagsLength--;
							k--;
						}
					}
				}
			}
			
			/* studio (anime) */
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
			
			/* producers (anime) */
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
						studioUpper = producers[j].toUpperCase();
						
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
					else
					{
						producers.splice(j, 1);
						producersLength--;
						j--;
					}
				}
			}
			
			/* genres */
			genres = [];
			genresRaw = $(doc).find('[itemprop="genre"]');
			if(genresRaw.length !== 0)
			{
				for(i = 0; i < genresRaw.length; i++)
				{
					genres[i] = genresRaw.eq(i).text().trim();

					/* for(k = 0; k < tagsLength; k++)
					{
						if(tags[k].length == 0 || tags[k].toUpperCase() == genres[i].toUpperCase())
						{
							tags.splice(k, 1);
							tagsLength--;
							k--;
						}
					} */
				}
			}
			
			/* rank */
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

			if(chkTags.checked)
			{
				if(englishHtml && chkEnglish.checked) { tags.push(englishHtml); }
				if(nativeHtml && chkNative.checked) { tags.push(nativeHtml); }
				if(season && chkSeason.checked) { tags.push(season); }
				if(year && chkYear.checked) { tags.push(year); }
				if(studios && chkStudio.checked) { tags = tags.concat(studios); }
				if(producers && chkProducers.checked) { tags = tags.concat(producers); }
				if(genres && chkGenres.checked) { tags = tags.concat(genres); }
				if(chkAired.checked) { tags.push("Aired: " + dateArr[0].replace(/^\s+|\s+$/g, "") + (dateArr.length == 2 ? " to " + dateArr[1].replace(/^\s+|\s+$/g, "") : "")); }
				if(chkScore.checked) { tags.push("Score: " + scoreHtml); }
				if(chkRank.checked) { tags.push("Ranked: " + rankHtml); }
				
				newTagStr = tags.join(", ");
				
				request2 = new XMLHttpRequest();
				request2.open("post", "https://myanimelist.net/includes/ajax.inc.php?t=22&tags=" + encodeURIComponent(newTagStr), false);
				request2.setRequestHeader("Content-Type", "application/x-www-form-urlencoded; charset=UTF-8");
				request2.setRequestHeader("X-Requested-With", "XMLHttpRequest");
				var csrf = $('meta[name="csrf_token"]').attr('content');
				request2.send("aid=" + id + "&csrf_token=" + csrf);
			}
			
			/* thumbs */
			img = $(doc).find("img[itemprop=\"image\"]")[0];
			imgUrl = img.getAttribute("data-src") || img.src;
			/* Replace jpg with webp for better file quality/size */
			imgUrl = imgUrl.replace(".jpg", ".webp");
			
			imgUrlt = imgUrl.replace(".jpg", "t.jpg");
			imgUrlv = imgUrl.replace(".jpg", "v.jpg");
			imgUrll = imgUrl.replace(".jpg", "l.jpg");
			
			altText = img.alt;
			
			/* Synopsis (description) */
			desc = $(doc).find("[itemprop=\"description\"]").text().replace(/\r\n/g, " ").replace(/\n/g, "\\a").replace(/\"/g, "\\\"").replace(/^\s+|\s+$/g, "");
			
			cssLine = template.value
				.replace(/\[DEL\]/g, "")
				.replace(/\[ID\]/g, id)
				.replace(/\[IMGURL\]/g, imgUrl)
				.replace(/\[IMGURLT\]/g, imgUrlt)
				.replace(/\[IMGURLV\]/g, imgUrlv)
				.replace(/\[IMGURLL\]/g, imgUrll)
				.replace(/\[TITLE\]/g, altText)
				.replace(/\[TITLEENG\]/g, englishHtml ? englishHtml : altText)
				.replace(/\[TITLERAW\]/g, nativeHtml ? nativeHtml : "")
				.replace(/\[GENRES\]/g, genres ? genres.join(", ") : "")
				.replace(/\[STUDIOS\]/g, studios ? studios.join(", ") : "")
				.replace(/\[PRODUCERS\]/g, producers ? producers.join(", ") : "")
				.replace(/\[SEASON\]/g, season)
				.replace(/\[YEAR\]/g, year)
				.replace(/\[RANK\]/g, rankHtml)
				.replace(/\[SCORE\]/g, scoreHtml)
				.replace(/\[STARTDATE\]/g, dateArr[0].replace(/^\s+|\s+$/g, ""))
				.replace(/\[ENDDATE\]/g, dateArr.length == 2 ? dateArr[1].replace(/^\s+|\s+$/g, "") : "")
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
		
		setTimeout(ProcessNext, delay.value);
	}
	else
	{
		thumbBtn.value = "Done (close)";
		thumbBtn.onclick = function()
		{
			document.body.removeChild(tempDiv);
			if(chkTags.checked)
			{
				alert("Refesh the page for tag updates to show.");
			}
			if(errorCount > 0)
			{
				alert(errorCount + " errors occurred while processing.  See console for details.\n\n'Some' updates were probably successful.\nYou may need to rerun the tool to catch the rest (with updated CSS as input and after refreshing your list page).");
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
	
	result.value += "\/* Generated by MAL List Tool http://burntjello.webs.com\nTemplate=" + template.value.replace(/\*\//g, "*[DEL]/") + "\nMatchTemplate=" + matchTemplate.value + "\n*\/\n";
	
	if(modernStyle) { ids = $("tr.more-info").map(function () { return this.id.replace("more-", ""); } ).get() ; } else { ids = $("div.hide").map(function () { return this.id.replace("more", ""); } ).get() ; }
	
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
exitBtn.onclick = function() { document.body.removeChild(tempDiv); };

function Start()
{
	alert("It's best to use 'All Anime' view.\n\nCopy existing styles to the textarea before starting.\n\nThis script will remove what is no longer needed, skip what already exists, and add the rest.\n\nThe input controls have tooltips, hover over them to see what they are for.");
}

Start();