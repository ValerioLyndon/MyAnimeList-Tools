javascript:(()=>{/*<<<credit>>>*/

const ver = '/*$$$ver_core$$$*/_b/*$$$ver_book$$$*/';
const verMod = '/*$$$ver_date$$$*/';

/*<<<store>>>*/

var store = new CustomStorage('localStorage');

/*<<<interface>>>*/

/*<<<main>>>*/

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