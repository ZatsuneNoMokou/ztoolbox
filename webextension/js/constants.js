/**
 *
 * @type {chrome.webRequest.RequestFilter}
 */
export const webRequestFilter = { urls: ['<all_urls>'], types: ['main_frame'] };

export const _userStylesStoreKey = '_userStyles',
	_tabStylesStoreKey = '_tabUserStyles',
	_userStylesStateStoreKey = '_userStylesState',
	_userScriptsStoreKey = '_userScripts',
	_userScriptsStateStoreKey = '_userScriptsState'
;
