class CustomStorage {
	constructor( type = 'localStorage' ){
		this.type = type;
		this.prefix = 'burnt_';
	}

	set( key, value ){
		if( value instanceof Object ){
			value = JSON.stringify(value);
		}

		if( this.type === 'userscript' ){
			GM_setValue(key,value);
		}
		else {
			key = `${this.prefix}${key}`;
			localStorage.setItem(key,value);
		}
	}

	get( key ){
		let value;
		if( this.type === 'userscript' ){
			value = GM_getValue(key);
		}
		else {
			key = `${this.prefix}${key}`;
			value = localStorage.getItem(key,value);
			if( value === null ){
				value = undefined;
			}
		}
		return value;
	}

	has( key ){
		return this.get(key) !== undefined;
	}

	remove( key ){
		if( this.type === 'userscript' ){
			GM_deleteValue(key);
		}
		else {
			key = `${this.prefix}${key}`;
			localStorage.removeItem(key);
		}
	}
}