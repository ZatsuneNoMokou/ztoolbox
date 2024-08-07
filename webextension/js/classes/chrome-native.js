import {randomId} from "../utils/randomId.js";
import {getSyncKeys} from "./chrome-preferences.js";
import {
	chromeNativeSettingsStorageKey,
	chromeNativeConnectedStorageKey,
	getElectronSettings
} from "./chrome-native-settings.js";
import {sendNotification} from "./chrome-notification.js";
import {getCurrentTab} from "../utils/getCurrentTab.js";
import {tabPageServerIpStorage} from "../variousFeatures/tabPageServerIp.js";
import ipRegex from "../../lib/ip-regex.js";

const port = chrome.runtime.connectNative('eu.zatsunenomokou.chromenativebridge');

port.onDisconnect.addListener(function () {
	chrome.storage.session.set({
		[chromeNativeConnectedStorageKey]: false
	})
		.catch(console.error)
	;
});

port.onMessage.addListener(async function(msg) {
	let haveBackgroundPage = false;
	if (typeof chrome.runtime.getBackgroundPage === 'function') {
		try {
			await chrome.runtime.getBackgroundPage();
			haveBackgroundPage = true;
		} catch (e) {
			console.debug(e)
		}
	}
	if (haveBackgroundPage) {
		/*
		 * TODO clean when Firefox support real manifest v3
		 * If background page present, then running in Firefox without full manifest v3 support
		 */
		if (location.pathname.endsWith('panel.html')) {
			console.debug('Ignoring chromeNative incoming messages');
			return;
		}
	}

	if (!msg && typeof msg !== 'object') {
		console.warn('UnexpectedMessage', msg);
		return;
	}



	switch (msg.type ?? null) {
		case 'ws open':
			console.log('[NativeMessaging]', 'ws open', msg);

			chrome.storage.session.set({
				[chromeNativeConnectedStorageKey]: true
			})
				.catch(console.error)
			;

			sendSocketData()
				.catch(console.error)
			;

			getSyncAllowedPreferences()
				.catch(console.error)
			;
			break;
		case 'ws close':
			console.log('[NativeMessaging]', 'ws close', msg);

			chrome.storage.session.set({
				[chromeNativeConnectedStorageKey]: false
			})
				.catch(console.error)
			;
			break;
		case "log":
			console.log('[NativeMessaging] log', msg.data);
			break;
		case 'ping':
			port.postMessage({
				type: 'commandReply',
				_id: msg._id
			});
			break;
		case 'sendNotification':
			handleSendNotification(msg._id, msg.opts)
				.catch(console.error)
			;
			break;
		case 'clearNotification':
			clearNotification(msg._id)
				.catch(console.error)
			;
			break;
		case 'closeActiveUrl':
			const activeTab = await getCurrentTab()
				.catch(console.error)
			;
			console.log('[NativeMessaging]', 'closeActiveUrl type', activeTab.url);
			if (msg.url && activeTab.url === msg.url) {
				await chrome.tabs.remove(activeTab.id)
					.catch(console.error)
				;
			}
			break;
		case 'openUrl':
			if (msg.url) {
				const tab = await chrome.tabs.create({
						url: msg.url,
						active: true
					})
						.catch(console.error)
				;
				port.postMessage({
					type: 'commandReply',
					_id: msg._id,
					data: {
						response: !!tab
					}
				});
			}
			break;
		case 'commandReply':
			break;
		case 'onSettingUpdate':
			updateSyncAllowedPreferences(msg.data)
				.catch(console.error)
			;
			break;
		default:
			console.log('[NativeMessaging]', 'Unknown type', msg);
	}
});


chrome.storage.onChanged.addListener(async (changes, area) => {
	if (area === 'session' && tabPageServerIpStorage in changes) {
		sendSocketData()
			.catch(console.error)
		;
		return;
	}

	if (area !== "local") return;

	if ("notification_support" in changes) {
		sendSocketData()
			.catch(console.error)
		;
	}
});

chrome.windows.onFocusChanged.addListener(async function onFocusChanged(windowId) {
	const window = await chrome.windows.get(windowId)
		.catch(console.error)
	;
	if (!window) {
		console.warn('[sendSocketData] UNREACHABLE_ACTIVE_TAB')
		await sendSocketData()
			.catch(console.error)
		;
		return;
	}
	if (window.type !== 'normal') {
		return;
	}

	const tabs = await chrome.tabs.query({
		windowId
	})
		.catch(console.error)
	;
	if (!tabs.length) {
		return;
	}
	// chrome.windows.onFocusChanged.removeListener(onFocusChanged);


	let isVivaldi = false
	for (let tab of tabs) {
		if (tab.vivExtData) {
			isVivaldi = true;
			break;
		}
	}

	await chrome.storage.local.set({
		'_isVivaldi': isVivaldi
	});
	await sendSocketData()
		.catch(console.error)
	;
});
chrome.tabs.onActivated.addListener(async function onFocusChanged(windowId) {
	await sendSocketData()
		.catch(console.error)
	;
});

export async function getBrowserName() {
	if (!!navigator?.userAgentData) {
		const searchedBrands = new Set(['vivaldi', 'firefox', 'opera', 'brave'])
		const browserBrand = navigator.userAgentData.brands
			.find(uaBrandData => searchedBrands.has(uaBrandData.brand.toLowerCase()))
		;
		if (browserBrand) {
			return `${browserBrand.brand} ${browserBrand.version ?? ''}`;
		}
	}

	const isVivaldi = (await chrome.storage.local.get('_isVivaldi'))?._isVivaldi;
	let browserName;
	if (isVivaldi) {
		browserName = 'Vivaldi';
	} else {
		const firefox = navigator.userAgent.split(' ')
			.find(str => str.toLowerCase().startsWith('firefox'))
		;
		if (firefox) {
			browserName = firefox.replace('/', ' ')
		} else {
			const chrome = navigator.userAgentData.brands
				.find(data => data.brand.toLowerCase() === 'chromium')
			;
			const edge = navigator.userAgentData.brands
				.find(data => data.brand.toLowerCase() === 'microsoft edge')
			;
			if (edge) {
				browserName = `MS Edge ${edge?.version ?? ''}`.trim();
			} else {
				browserName = `Chrome ${chrome?.version ?? ''}`.trim();
			}
		}
	}
	return browserName;
}

async function sendSocketData() {
	const values = await chrome.storage.local.get([
		'notification_support',
	]);

	let tabData = null;
	const activeTab = await getCurrentTab()
		.catch(console.error)
	;
	if (activeTab) {
		const raw = (await chrome.storage.session.get([tabPageServerIpStorage])),
			data = Object.assign({}, raw[tabPageServerIpStorage])
		;

		/**
		 * @type {undefined|TabPageServerIdData}
		 */
		const _tabData = data[`${activeTab.id}`];
		let url, domain;
		try {
			url = new URL(activeTab.url);
			domain = url.hostname;
		} catch (e) {
			console.error(e);
		}

		let ipMore = false;
		if (url && ipRegex({exact: true}).test(url.hostname)) {
			ipMore = url.hostname;
			domain = undefined;
		}

		const reader = (blob) => {
			return new Promise((resolve, reject) => {
				const reader = new FileReader();
				reader.onload = () => {
					resolve(reader.result);
				};
				reader.onerror = reject;
				reader.readAsDataURL(blob) ;
			})
		}

		/**
		 *
		 * @type {string|null}
		 */
		let favicon = null;
		try {
			// Stop if not valid url
			new URL(activeTab.favIconUrl);

			/**
			 * @type {Blob}
			 */
			const blob = (await (await fetch(activeTab.favIconUrl)).blob());
			favicon = await reader(blob);
		} catch (e) {
			console.error('[sendSocketData] ' + activeTab.favIconUrl, e);
		}

		tabData = {
			name: activeTab.title,
			faviconUrl: favicon,
			error: _tabData?.error ?? undefined,
			statusCode: _tabData?.statusCode,
			url: activeTab.url,
			domain,
			ip: _tabData?.ip,
			ipMore,
			openGraph: _tabData?.tabOpenGraphData ?? undefined,
			pageRating: _tabData?.pageRating ?? undefined,
		}
	}

	port.postMessage({
		type: 'updateSocketData',
		data: {
			notificationSupport: values.notification_support === true,
			userAgent: navigator.userAgent,
			browserName: await getBrowserName(),
			extensionId: chrome.runtime.id,
			tabData,
		}
	});
}

async function clearNotification(id) {
	console.info('clear notification : ' + id)
	await chrome.notifications.clear('chromeNative-' + id)
}
async function handleSendNotification(id, opts) {
	if (opts.timeoutType) delete opts.timeoutType;
	await sendNotification({
		...opts,
		id: 'chromeNative-' + id
	}, {
		onClickAutoClose: false,
		onButtonClickAutoClose: false
	});
}
chrome.notifications.onClosed.addListener(function (notificationId, byUser) {
	if (!notificationId.startsWith('chromeNative-')) return;

	chrome.notifications.clear(notificationId);
	const _id = notificationId.replace('chromeNative-', '');
	port.postMessage({
		type: 'commandReply',
		_id,
		data: {
			response: 'close',
			byUser
		}
	});
});
chrome.notifications.onButtonClicked.addListener(function (notificationId, buttonIndex) {
	if (!notificationId.startsWith('chromeNative-')) return;

	chrome.notifications.clear(notificationId);
	const _id = notificationId.replace('chromeNative-', '');
	port.postMessage({
		type: 'commandReply',
		_id,
		data: {
			response: 'action',
			index: buttonIndex
		}
	});
});
chrome.notifications.onClicked.addListener(async function (notificationId) {
	if (!notificationId.startsWith('chromeNative-')) return;

	chrome.notifications.clear(notificationId);
	const _id = notificationId.replace('chromeNative-', '');
	port.postMessage({
		type: 'commandReply',
		_id,
		data: {
			response: 'click'
		}
	});
});

/**
 * Return the generated message id
 * @param {string} command
 * @param {any[]} data
 * @return {string}
 */
function callNative(command, ...data) {
	const _id = randomId();
	port.postMessage({
		_id,
		data: data.length === 0 ? undefined : data,
		type: command
	});
	return _id;
}

const timeout = 5000;
/**
 *
 * @see callNative
 * @param {string} command
 * @param {...any[]} data
 * @return {Promise<unknown>}
 */
function fnNative(command, ...data) {
	return new Promise((resolve, reject) => {
		const _id = callNative(command, ...data);

		const timerId = setTimeout(() => {
			port.onMessage.removeListener(callback);
			reject(new Error('TIMEOUT'));
		}, timeout);

		const callback = function callback(msg, port) {
			if (msg.type !== "commandReply" || msg._id !== _id) return;

			clearTimeout(timerId);
			port.onMessage.removeListener(callback);

			if (!!msg.error) {
				reject(msg);
			} else if (msg.result) {
				resolve(msg.result);
			} else {
				reject(new Error('UnexpectedMessage'));
			}
		};
		port.onMessage.addListener(callback);
	});
}



export async function ping() {
	try {
		await fnNative('ping');
		console.info('[NativeMessaging] pong');
	} catch (e) {
		console.error(e);
	}
}
self.ping = ping;

/**
 *
 * @param {string} id
 * @return {Promise<*>}
 */
export async function getPreference(id) {
	const {result} = await fnNative('getPreference', id);
	return result.value;
}

/**
 *
 * @param {string[]} ids
 * @return {Promise<Map<string, undefined|*>>}
 */
export async function getPreferences(ids) {
	const {result} = await fnNative('getPreferences', ids);

	const output = new Map();
	for (let {id, value} of result) {
		output.set(id, value);
	}
	return output;
}



async function getSyncAllowedPreferences() {
	const ids = getSyncKeys(),
		output = {},
		newPreferences = await getPreferences(ids)
	;

	for (let [id, value] of newPreferences) {
		if (value === undefined) continue;
		output[id] = value;
	}

	await chrome.storage.local.set({
		[chromeNativeSettingsStorageKey]: output
	});
}
async function updateSyncAllowedPreferences(data) {
	const ids = getSyncKeys(),
		isSync = ids.includes(data.id)
	;

	if (!data.id) {
		return;
	}

	console.log(`[NativeMessaging] onSettingUpdate${isSync ? ' (Sync included)' : ''}`, data);
	if (!isSync) {
		return;
	}

	const {id, newValue} = data,
		currentPreferences = await getElectronSettings()
	;
	if (newValue === undefined) {
		delete currentPreferences[id];
	} else {
		currentPreferences[id] = newValue;
	}

	await chrome.storage.local.set({
		[chromeNativeSettingsStorageKey]: currentPreferences
	});
}



/**
 *
 * @return {Promise<*[]>}
 */
export async function getDefaultValues() {
	const {result} = await fnNative('getDefaultValues');
	return result;
}
self.getDefaultValues = getDefaultValues;

/**
 *
 * @param {string} sectionName
 * @return {Promise<*>}
 */
export async function showSection(sectionName) {
	const {result} = await fnNative('showSection', sectionName);
	return result;
}



/**
 *
 * @param {string} browserName
 * @param {string} url
 * @return {Promise<void>}
 */
export async function openUrl(browserName, url) {
	const {result} = await fnNative('openUrl', browserName, url);
	console.dir(result)
	return result;
}

chrome.runtime.onMessage.addListener(function (message, sender, sendResponse) {
	if (sender.id !== chrome.runtime.id) {
		return;
	}

	if (message.id === 'ztoolbox_nativeOpenUrl') {
		const {data} = message;

		openUrl(data.browserName, data.url)
			.then(response => {
				sendResponse({
					response: response?.response ?? false,
					isError: false
				});
			})
			.catch(e => {
				console.error(e);
				sendResponse({
					response: e,
					isError: true
				});
			})
		;
		return true;
	} else if (message.id === 'showSection') {
		showSection(...message.data)
			.then(() => {
				sendResponse({
					isError: false
				});
			})
			.catch(err => {
				console.error(err);
				sendResponse({
					isError: true
				});
			})
		;
		return true;
	}
});
