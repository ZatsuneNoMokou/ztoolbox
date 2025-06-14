import {loadTranslations} from '../translation-api.js';
import {theme_cache_update} from '../classes/backgroundTheme.js';
import * as tabUserStyles from "./tabUserStyles.js";
import "./requestPermission.js";
import {chromeNativeConnectedStorageKey, getSessionNativeIsConnected} from "../classes/chrome-native-settings.js";
import {getCurrentTab} from "../utils/getCurrentTab.js";



document.addEventListener('click', e => {
	const elm = e.target.closest('[role="button"]');
	if (!elm) return;

	if (elm.classList.contains('disabled')) {
		e.preventDefault();
		e.stopImmediatePropagation();
	}
});

document.addEventListener('click', e => {
	const elm = e.target.closest('#disableNotifications');
	if (!elm) return;

	chrome.storage.local.get(['notification_support'])
		.then(async ({notification_support}) => {
			await chrome.storage.local.set({
				notification_support: !notification_support
			});

			updatePanelData()
				.catch(console.error)
			;
		})
		.catch(console.error)
	;
});

document.addEventListener('click', async e => {
	const elm = e.target.closest('#settings');
	if (!elm) return;

	const nativeIsConnected = await getSessionNativeIsConnected()
		.catch(console.error)
	;
	if (nativeIsConnected) {
		sendToMain('showSection', 'settings')
			.catch(console.error)
		;
	}
});

document.addEventListener('click', async e => {
	const elm = e.target.closest('#openDelegatedMain');
	if (!elm) return;

	const nativeIsConnected = await getSessionNativeIsConnected()
		.catch(console.error)
	;
	if (nativeIsConnected) {
		sendToMain('showSection', 'main')
			.catch(console.error)
		;
	}
});


chrome.storage.onChanged.addListener(async (changes, area) => {
	if (area !== "session") return;

	if (chromeNativeConnectedStorageKey in changes) {
		location.reload();
	}
});


window.theme_update = async function theme_update() {
	let panelColorStylesheet = await theme_cache_update(document.querySelector("#generated-color-stylesheet"));

	if (!!panelColorStylesheet && typeof panelColorStylesheet === "object") {
		console.info("Theme update");

		let currentThemeNode = document.querySelector("#generated-color-stylesheet");
		currentThemeNode.remove();

		document.body.dataset.theme = panelColorStylesheet.dataset.theme;

		document.head.appendChild(panelColorStylesheet);
	}
};

async function updatePanelData() {
	console.log("Updating panel data");

	const activeTab = await getCurrentTab();
	tabUserStyles.updateData(activeTab)
		.catch(console.error)
	;

	const {notification_support} = await chrome.storage.local.get(['notification_support']);

	/**
	 *
	 * @type {HTMLButtonElement|null}
	 */
	let disableNotificationsButton = document.querySelector('button#disableNotifications');
	if (disableNotificationsButton) {
		disableNotificationsButton.classList.toggle('off', !notification_support ?? false);
		disableNotificationsButton.dataset.translateTitle = !!notification_support? 'ExternalNotifications' : 'ExternalNotificationsDisabled';
	}
}



async function current_version(version) {
	/**
	 *
	 * @type {HTMLSpanElement|null}
	 */
	const current_version_node = document.querySelector("span#current_version");
	if (!current_version_node) return;

	//current_version_node.textContent = version;
	current_version_node.dataset.currentVersion = version;

	const lastCheck = (await chrome.storage.local.get(['_checkUpdate']))?._checkUpdate ?? {};
	current_version_node.dataset.hasUpdate = (lastCheck.hasUpdate ?? false).toString();
	if (!lastCheck.hasUpdate ?? false) {
		// if no update, no text
		current_version_node.dataset.translateTitle = '';
	}
}
current_version(chrome.runtime.getManifest().version)
	.catch(console.error)
;


loadTranslations()
	.catch(console.error)
;

updatePanelData()
	.catch(console.error)
;
