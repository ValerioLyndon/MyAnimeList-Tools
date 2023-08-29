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
		else if( valType === 'number' ){
			value = Number(value);
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