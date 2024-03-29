// ==UserScript==
// @name         List Tools
// @namespace    V.L
// @version      /*$$$ver_core$$$*/_a/*$$$ver_user$$$*/
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

/*<<<credit>>>*/

const ver = '/*$$$ver_core$$$*/_a/*$$$ver_user$$$*/';
const verMod = '/*$$$ver_date$$$*/';

/*<<<store>>>*/

var store = new CustomStorage('userscript');

/*<<<interface>>>*/

/*<<<main>>>*/

/* Add "Tools" button to list */

if( List.isOwner ){
	let $button = $('<a href="javascript:void(0);">Tools</a>')
	.on('click',()=>{
		if( !UI || !UI.isAlive ){
			initialise();
		}
		UI.open();
	});

	if( List.isModern ){
		$button.addClass('icon-menu');
		$button.html(`
			<svg class="icon burnt-trigger-icon" xmlns="http://www.w3.org/2000/svg" height="20px" viewBox="0 0 512 512"><!--! Font Awesome Free 6.4.0 by @fontawesome - https://fontawesome.com License - https://fontawesome.com/license (Commercial License) Copyright 2023 Fonticons, Inc. --><path d="M78.6 5C69.1-2.4 55.6-1.5 47 7L7 47c-8.5 8.5-9.4 22-2.1 31.6l80 104c4.5 5.9 11.6 9.4 19 9.4h54.1l109 109c-14.7 29-10 65.4 14.3 89.6l112 112c12.5 12.5 32.8 12.5 45.3 0l64-64c12.5-12.5 12.5-32.8 0-45.3l-112-112c-24.2-24.2-60.6-29-89.6-14.3l-109-109V104c0-7.5-3.5-14.5-9.4-19L78.6 5zM19.9 396.1C7.2 408.8 0 426.1 0 444.1C0 481.6 30.4 512 67.9 512c18 0 35.3-7.2 48-19.9L233.7 374.3c-7.8-20.9-9-43.6-3.6-65.1l-61.7-61.7L19.9 396.1zM512 144c0-10.5-1.1-20.7-3.2-30.5c-2.4-11.2-16.1-14.1-24.2-6l-63.9 63.9c-3 3-7.1 4.7-11.3 4.7H352c-8.8 0-16-7.2-16-16V102.6c0-4.2 1.7-8.3 4.7-11.3l63.9-63.9c8.1-8.1 5.2-21.8-6-24.2C388.7 1.1 378.5 0 368 0C288.5 0 224 64.5 224 144l0 .8 85.3 85.3c36-9.1 75.8 .5 104 28.7L429 274.5c49-23 83-72.8 83-130.5zM56 432a24 24 0 1 1 48 0 24 24 0 1 1 -48 0z"/></svg>
			<span class="text">Tools</span>
		`);
		$('.list-menu-float').append($button);
	}
	else {
		$('#mal_cs_otherlinks div:last-of-type').append($button);
	}

	$('head').append($('<style>').text(`
		.burnt-trigger-icon {
			top: 15px;
			left: 15px;
		}
	`));

	automation();
}

/* Handle UI-less automatic runs of the tool. */
async function automation( ){
	await initialise();

	if( !settings.get(['allow_auto']) ){
		return;
	}
	if( List.isPreview ) {
		Log.generic('Skipped automatic update as the tool does not run on preview windows for safety of your CSS.');
		return;
	}

	let doCss = settings.get(['update_css']) && settings.get(['auto_css']);
	let doTags = settings.get(['update_tags']) && settings.get(['auto_tags']);
	let doNotes = settings.get(['update_notes']) && settings.get(['auto_notes']);
	let doHeaders = List.isModern && settings.get(['update_headers']) && settings.get(['auto_headers']);

	/* prevent spamming automatic runs */
	const msBetweenScraperRuns = 60 * 60 * 1000;
	const timeSinceLastScraperRun = Date.now() - store.get('last_auto_scraper', 0);
	const msBetweenHeaderRuns = 5 * 60 * 1000;
	const timeSinceLastHeaderRun = Date.now() - store.get('last_auto_headers', 0);

	if( timeSinceLastScraperRun < msBetweenScraperRuns ){
		const timeUntilNextRun = round((msBetweenScraperRuns - timeSinceLastScraperRun) / 1000);
		Log.generic(`Skipped automatic CSS, Tags, or Notes update as the last run happened too recently. Please start the tool manually or wait until the delay has reset in ${timeUntilNextRun} seconds.`);
		doCss = false;
		doTags = false;
		doNotes = false;
	}
	if( timeSinceLastHeaderRun < msBetweenHeaderRuns ){
		const timeUntilNextRun = round((msBetweenHeaderRuns - timeSinceLastHeaderRun) / 1000);
		Log.generic(`Skipped automatic category headers update as the last run happened too recently. Please start the tool manually or wait until the delay has reset in ${timeUntilNextRun} seconds.`);
		doHeaders = false;
	}
	
	if( doCss || doTags || doNotes || doHeaders ){
		worker = new Worker(true);
		worker.start(doCss, doTags, doNotes, doHeaders);
		Log.generic('Performing automatic update.');
	}
	
}