'use strict';

import * as browserDetect from '../utils/browserDetect.js';
import {getSessionNativeIsConnected} from '../classes/chrome-native-settings.js';
import {loadPreferencesNodes} from "./preference-basic-ui.js";
import {theme_update, THEME_LS_PREF_CACHE_KEY} from "../classes/backgroundTheme.js";



document.documentElement.classList.toggle('isFirefox', browserDetect.isFirefox);
document.documentElement.classList.toggle('isChrome', browserDetect.isChrome);
if (browserDetect.isFirefox) {
	import("./requestPermission.js")
		.catch(console.error);
}



export const port = chrome.runtime.connect(chrome.runtime.id, {
	name: 'panel',
});
import("./tabUserStyles.js")
	.catch(console.error);



async function baseInit() {
	const chromeNativeConnected = await getSessionNativeIsConnected()
		.catch(console.error)
	;
	document.body.classList.toggle('delegated-version', chromeNativeConnected);

	/**
	 *
	 * @type {HTMLButtonElement}
	 */
	const $settings = document.querySelector('button#settings');
	if ($settings) {
		$settings.disabled = !chromeNativeConnected;
		$settings.classList.remove('hide');
	}

	if (!chromeNativeConnected) {
		loadPreferencesNodes()
			.catch(console.error)
		;
	}
}


theme_update()
	.catch(console.error);


window.onload = function () {
	window.onload = null;

	// TODO Remove later
	for (const key of Object.keys(self.localStorage)) {
		if (key === THEME_LS_PREF_CACHE_KEY) continue;
		self.localStorage.removeItem(key);
	}

	(async () => {
		import('../panel/panel.js')
			.catch(console.error);
		import('../panel/tabMover.js')
			.catch(console.error);
		baseInit()
			.catch(console.error);
	})()
		.catch(console.error)
	;
};
