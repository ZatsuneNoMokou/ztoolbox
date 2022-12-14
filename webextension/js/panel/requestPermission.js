import {hasFetchPermission, requestFetchPermission} from "../utils/hasFetchPermission.js";

const btnSelector = '#requestPermissionItem';

document.addEventListener('click', async function (ev) {
	const target = ev.target.closest(btnSelector);
	if (!target) return;

	await requestFetchPermission()
		.catch(console.error)
	;
	chrome.runtime.reload();
});

async function updateBtnState() {
	const permission = await hasFetchPermission();
	const $btn = document.querySelector(btnSelector);
	$btn.classList.toggle('hide', !!permission);
}
updateBtnState()
	.catch(console.error)
;
