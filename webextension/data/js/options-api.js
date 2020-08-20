'use strict';

import { options } from './options-data.js';

let chromeSettings,
	i18ex
;
if (browser.extension.getBackgroundPage() !== null) {
	const backgroundPage = browser.extension.getBackgroundPage();
	if (backgroundPage.hasOwnProperty("chromeSettings")) {
		chromeSettings = backgroundPage.chromeSettings;
	} else {
		chromeSettings = backgroundPage.chromeSettings = new backgroundPage.zDK.ChromePreferences(options);
	}

	if (backgroundPage.hasOwnProperty("i18ex")) {
		i18ex = backgroundPage.i18ex;
	} else {
		i18ex = backgroundPage.i18ex = new zDK.i18extended(browser.i18n.getMessage("language"));
	}
}

/*		---- Nodes translation ----		*/
function translateNodes() {
	for (let node of document.querySelectorAll("[data-translate-id]")) {
		if (typeof node.tagName === "string") {
			node.textContent = i18ex._(node.dataset.translateId);
			delete node.dataset.translateId;
		}
	}
}

if (typeof Opentip !== "undefined") {
	Opentip.styles.myDark = {
		// Make it look like the alert style. If you omit this, it will default to "standard"
		extends: "dark",
		background: "#212121",
		borderColor: "#212121"
	};
	Opentip.defaultStyle = "myDark"; // The default is "standard"
}

function translateNodes_title() {
	for (let node of document.querySelectorAll("[data-translate-title]")) {
		if (typeof node.tagName === "string") {
			const titleText =  i18ex._(node.dataset.translateTitle);

			let error = false;
			try {
				const Ot = Opentip;
				if (node.dataset.tooltipPosition) {
					const myOpentip = new Ot(node, titleText, "", {
						"tipJoint": node.dataset.tooltipPosition
					})
				} else {
					const myOpentip = new Ot(node, titleText)
				}
			} catch (err) {
				console.warn(err);
				error = true;
			}

			if (error === false) {
				delete node.dataset.translateTitle;
				node.removeAttribute("title");
			}
		}
	}
}

export function loadTranslations() {
	i18ex.loadingPromise
		.then(()=>{
			let body = document.querySelector('body'),
				observer = new MutationObserver(function(mutations) {
					mutations.forEach(function(mutation) {
						if(mutation.type === "childList"){
							translateNodes(document);
							translateNodes_title(document);
						}
					});
				});

			// configuration of the observer:
			const config = {
				attributes: false,
				childList: true,
				subtree: true
			};

			translateNodes();
			translateNodes_title();

			// pass in the target node, as well as the observer options
			observer.observe(body, config);

			// later, you can stop observing
			//observer.disconnect();
		})
	;
}

export function getPreference(prefId) {
	const pref = chromeSettings.get(prefId);
	if(pref!==undefined){
		return pref;
	}
}
export function savePreference(prefId, value) {
	chromeSettings.set(prefId, value);
}

function settingNode_onChange(event) {
	const node = this,
		settingName = (node.tagName.toLowerCase()==="input"&&typeof node.type==="string"&&node.type.toLowerCase()==="radio")? node.name : node.id
	;

	if (node.validity.valid) {
		savePreference(settingName, chromeSettings.getValueFromNode(node));
	}
}
function refreshSettings(event) {
	const backgroundPage = browser.extension.getBackgroundPage();

	let prefId = "";
	let prefValue = "";
	if (typeof event.key === "string") {
		prefId = event.key;
		prefValue = event.newValue;
	} else if (typeof event.target === "object") {
		prefId = event.target.id;
		prefValue = getPreference(prefId);
	}
	let prefNode = document.querySelector(`#preferences #${prefId}`);
	
	let isPanelPage = location.pathname.indexOf("panel.html") !== -1;
	
	if (event.type !== "input" && !(isPanelPage && typeof chromeSettings.options.get(prefId).showPrefInPanel === "boolean" && chromeSettings.options.get(prefId).showPrefInPanel === false) && typeof chromeSettings.options.get(prefId).type === "string" && !(typeof chromeSettings.options.get(prefId).hidden === "boolean" && chromeSettings.options.get(prefId).hidden)) {
		if (prefNode === null) {
			console.warn(`${prefId} node is null`);
		} else {
			switch (chromeSettings.options.get(prefId).type) {
				case 'string':
					if (typeof chromeSettings.options.get(prefId).stringList === 'boolean' && chromeSettings.options.get(prefId).stringList === true) {
						prefNode.value = backgroundPage.getFilterListFromPreference(getPreference(prefId)).join("\n");
					} else {
						prefNode.value = prefValue;
					}
					break;
				case 'color':
				case 'menulist':
					if (prefNode.tagName.toLowerCase()==="div") {
						const toCheck = prefNode.querySelector(`[value="${prefValue}"]`);
						if (toCheck) {
							toCheck.checked = true;
						} else {
							console.warn(`Error trying to update "${prefId}"`);
						}
					} else {
						prefNode.value = prefValue;
					}
					break;
				case 'integer':
					prefNode.value = parseInt(prefValue);
					break;
				case 'bool':
					prefNode.checked = chromeSettings.getBooleanFromVar(prefValue);
					break;
				case 'control':
					// Nothing to update, no value
					break;
			}
			let body = document.querySelector('body');
			if (prefId === "showAdvanced") {
				if (getPreference('showAdvanced')) {
					body.classList.add('showAdvanced');
				} else {
					body.classList.remove('showAdvanced');
				}
			}
			if (prefId === 'showExperimented') {
				if (getPreference("showExperimented")) {
					body.classList.add("showExperimented");
				} else {
					body.classList.remove("showExperimented");
				}
			}
			if (prefId === "panel_theme" || prefId === "background_color" && typeof theme_update === "function") {
				theme_update();
			}
			if (prefId === "hourlyAlarm") {
				sendDataToMain("hourlyAlarm_update");
			}
			if (
				typeof applyPanelSize === "function"
				&&
				(prefId === "panel_height" || prefId === "panel_width")
			) {
				applyPanelSize();
			}
		}
	}
}

/*		---- Save/Restaure preferences from sync ----		*/

// Saves/Restaure options from/to browser.storage
function saveOptionsInSync(event) {
	chromeSettings.saveInSync()
		.then(() => {
			// Update status to let user know options were saved.
			let status = document.getElementById('status');
			if(status !== null){
				status.textContent = i18ex._('options_saved_sync');

				setTimeout(function() {
					status.textContent = '';
				}, 2500);
			}
		})
		.catch(console.warn)
	;
}
function restaureOptionsFromSync(event) {
	// Default values
	let mergePreferences = event.shiftKey;
	return chromeSettings.restaureFromSync((typeof mergePreferences === 'boolean')? mergePreferences : false);
}

/*		---- Node generation of settings ----		*/
export function loadPreferences(selector) {
	chromeSettings.loadPreferencesNodes(document.querySelector(selector));
	
	browser.storage.onChanged.addListener((changes, area) => {
		if (area === "local") {
			for (let prefId in changes) {
				if (changes.hasOwnProperty(prefId)) {
					refreshSettings({"key": prefId, oldValue: changes[prefId].oldValue, newValue: changes[prefId].newValue});
				}
			}
		}
	});
}

if(browser.extension.getBackgroundPage() !== null && typeof domDelegate !== 'undefined') {
	const delegate = (function () {
		const Delegate = domDelegate.Delegate;
		return new Delegate(document.body);
	})();
	const liveEvent = function (type, selector, handler) {
		delegate.on(type, selector, handler);
	};

	liveEvent("click", "[data-input-number-control]", function (e){
		const label = this,
			input = label.control,
			action = label.dataset.inputNumberControl
		;
		if (action === "moins" || action === "plus") {
			input[action === "plus" ? "stepUp" : "stepDown"](1);
			settingNode_onChange.apply(input, [e, input])
		}
		return false;
	});
	liveEvent("input", "[data-setting-type='string']", settingNode_onChange);
	liveEvent("change", "[data-setting-type='integer'],[data-setting-type='bool'],[data-setting-type='color'],input[data-setting-type='menulist'],[data-setting-type='menulist'] input[type='radio']", settingNode_onChange);
	liveEvent("click", "#export_preferences", exportPrefsToFile);
	liveEvent("click", "#import_preferences", importPrefsFromFile);
	liveEvent("click", "button[data-setting-type='file']", prefNode_FileType_onChange);
}

/*				---- Import data from ----				*/
function prefNode_FileType_onChange(event) {
	let backgroundPage = browser.extension.getBackgroundPage();
	backgroundPage.chromeSettings.prefNode_FileType_onChange(event);
}

/*		---- Import/Export preferences from file ----		*/
function exportPrefsToFile() {
	let backgroundPage = browser.extension.getBackgroundPage();
	backgroundPage.chromeSettings.exportPrefsToFile("ztoolbox", document);
}

async function importPrefsFromFile(event) {
	const backgroundPage = browser.extension.getBackgroundPage();
	let mergePreferences = (typeof event === "object" && typeof event.shiftKey === "boolean")? event.shiftKey : false;

	console.warn("Merge: " + mergePreferences);

	let error = false;
	try {
		await backgroundPage.chromeSettings.importPrefsFromFile("ztoolbox", mergePreferences, document);
	} catch (e) {
		error = true;
		console.warn(e);
	}

	if (error === false) {
		if (typeof refreshStreamsFromPanel === "function") {
			refreshStreamsFromPanel();
		} else {
			sendDataToMain("refreshStreams", "");
		}
	}
}
window.importPrefsFromFile = importPrefsFromFile;
