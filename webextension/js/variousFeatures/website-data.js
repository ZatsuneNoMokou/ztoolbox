export class WebsiteData {
	constructor() {
		this.notificationState = {
			count: null,
			/**
			 * Undefined to know when we're checking the first time
			 * @type {?boolean}
			 */
			logged: undefined
		};
		this.count = 0;
		this.folders = new Map();
		this.websiteIcon = '';
		this.logged = null;
		this.loginId = '';
		this.href = '';
	}

	/**
	 *
	 * @param {object} data
	 * @returns {WebsiteData}
	 */
	static fromJSON(data) {
		const newInstance = new WebsiteData();
		newInstance.notificationState = data.notificationState ?? {};
		if (!('count' in newInstance.notificationState)) {
			newInstance.notificationState.count = 0
		}

		newInstance.count = data.count ?? 0;
		if (typeof newInstance.count === 'string') {
			const count = parseInt(newInstance.count);
			if (!isNaN(count)) {
				newInstance.count = count;
			}
		}
		newInstance.folders = new Map(data.folders ?? []);
		newInstance.websiteIcon = data.websiteIcon ?? '';
		newInstance.logged = data.logged ?? false;
		newInstance.loginId = data.loginId ?? '';
		newInstance.href = data.href ?? '';
		return newInstance;
	}

	toJSON() {
		return {
			notificationState: JSON.parse(JSON.stringify(this.notificationState)),
			count: this.count,
			folders: [...this.folders.entries()],
			websiteIcon: this.websiteIcon,
			logged: this.logged,
			loginId: this.loginId,
			href: this.href,
		}
	}
}