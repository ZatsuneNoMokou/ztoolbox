import {getCurrentTab} from "./browserTabUtils.js";
import {renderTemplate} from "../init-templates.js";
import {getPreference} from "../classes/chrome-preferences-2.js";

const idTabPageServerIp = 'tabPageServerIp',
	tabPageServerIpStorage = '_tabPageServerIp'
;

await browser.windows.getCurrent()

export async function updateData() {
	const $tabPageServerIp = document.querySelector(`#${idTabPageServerIp}`),
		raw = (await browser.storage.local.get([tabPageServerIpStorage])),
		data = Object.assign({}, raw[tabPageServerIpStorage])
	;

	for (let node of [...$tabPageServerIp.children]) {
		node.remove();
	}

	const activeTab = await getCurrentTab();
	if (!activeTab) {
		return;
	}

	/**
	 * @type {undefined|TabPageServerIdData}
	 */
	const tabData = data[`${activeTab.id}`];
	if (!tabData) {
		return;
	}

	const tabPageServerIp_alias = await getPreference('tabPageServerIp_alias');

	let ipMore = false;
	if (tabData.ip in tabPageServerIp_alias) {
		ipMore = tabPageServerIp_alias[tabData.ip];
	}

	let newElementNode = document.createElement("article");
	$tabPageServerIp.appendChild(newElementNode);
	newElementNode.outerHTML = await renderTemplate("tabPageServerIp", {
		...tabData,
		tabName: activeTab.title,
		favIconUrl: activeTab.favIconUrl,
		ipMore
	});
}


document.addEventListener('error', (e) => {
	const target = e.target;
	if (!target) {
		return console.debug('Received event without target!');
	}

	if (/(img|svg)/i.test(target.tagName) && !target.classList.contains('error') && target.closest(`#${idTabPageServerIp}`)) {
		const node = document.createElement('span');
		node.classList.add('material-icons')
		node.textContent = 'tab';
		node.dataset.oldSrc = target.src;
		target.replaceWith(node);
	}
}, true);