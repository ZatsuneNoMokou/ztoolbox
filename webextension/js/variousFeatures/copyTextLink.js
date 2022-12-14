'use strict';

import {default as env} from '../env.js';
import {i18ex} from "../translation-api.js";
import {sendNotification} from "../classes/chrome-notification.js";


async function initMenuCopyTextLink() {
	await i18ex.loadingPromise;

	const currentContentScript = (await chrome.scripting.getRegisteredContentScripts())
		.find(item => item.id === 'copyTextLink')
	;
	if (!!currentContentScript) {
		await chrome.scripting.unregisterContentScripts({
			ids: ['copyTextLink']
		});
	}
	await chrome.scripting.registerContentScripts([
		{
			"id": "copyTextLink",
			"js": [
				"/js/contentscripts/copyTextLink.js"
			],
			"matches": [ "<all_urls>" ],
			"runAt": "document_idle",
			allFrames: false
		}
	]);

	chrome.contextMenus.create({
		id: 'link_CopyTextLink',
		title: i18ex._("copy_link_text"),
		contexts: ["link"],
		targetUrlPatterns: ["<all_urls>"]
	});
}
initMenuCopyTextLink()
	.catch(console.error)
;


chrome.contextMenus.onClicked.addListener(function (info, tab) {
	if (info.menuItemId === 'link_CopyTextLink') {
		chrome.tabs.sendMessage(tab.id, {
			id: "copyLinkText",
			data: ""
		});
	}
});

async function onCopyLinkTextReply(responseData) {
	const clipboardResult = responseData.result;
	if (!clipboardResult || env !== 'prod') {
		sendNotification({
			'id': 'copy_link_result',
			"message": (clipboardResult) ? i18ex._("copied_link_text") : i18ex._("error_copying_to_clipboard")
		})
			.catch(console.error)
		;
	}

	console[(clipboardResult) ? "debug" : "warn"](`Copy to clipboad ${(clipboardResult) ? "success" : "error"}`, responseData);
}

chrome.runtime.onMessage.addListener(function (message, sender, sendResponse) {
	if (sender.id !== chrome.runtime.id) {
		console.error(sender.id)
		return;
	}

	if (typeof message === "object" && message.hasOwnProperty("data")) {
		if (message.id === "copyLinkText_reply") {
			onCopyLinkTextReply(message.data)
				.catch(console.error)
			;
		}
	}
});