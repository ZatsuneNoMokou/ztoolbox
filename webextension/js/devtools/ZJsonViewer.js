export class ZJsonViewer {
	/**
	 *  @type {any}
	 */
	#json;

	/**
	 *
	 * @param {any} json
	 */
	constructor(json) {
		this.#json = json;
	}

	/**
	 *
	 * @param {string} tagName
	 * @param {string|Array<string|HTMLElement>} content
	 * @param {...string[]} classList
	 * @returns {HTMLSpanElement}
	 */
	#createElement(tagName, content, ...classList) {
		const span = document.createElement(tagName);
		span.classList.add(...classList);
		if (Array.isArray(content)) {
			span.append(...content);
		} else {
			span.textContent = content;
		}
		return span;
	}

	#getValueType(value) {
		const type = typeof value;
		if (type === 'object') {
			if (Array.isArray(value)) {
				return 'array';
			}
			if (value === null) {
				return 'null';
			}
		}
		return type;
	}

	/**
	 *
	 * @param {string} str
	 * @return {Array<string|HTMLAnchorElement>}
	 */
	linkify(str) {
		const urlRegex = /([a-zA-Z]+?:\/\/(?:[^:]+:[^@]+@)?[a-zA-Z0-9.-]+(?:[a-zA-Z0-9\-_.!~*();\/?:&=+#%]*)*)/;
		return str.split(urlRegex)
			.map(str => {
				if (urlRegex.test(str)) {
					const link = document.createElement('a');
					link.href = str;
					link.target = '_blank';
					link.textContent = str;
					return link;
				}
				return str;
			})
			;
	}

	/**
	 *
	 * @param {string[]} pathArray
	 * @returns {string}
	 */
	pathArrayToString(pathArray) {
		return pathArray
			.map((key, index) => {
				if (index === 0) return key;
				if (typeof key !== 'string' || /[^\w$]/.test(key)) return `[${key}]`;
				return `.${key}`;
			})
			.join('')
		;
	}


	/**
	 *
	 * @param {any} value
	 * @returns {Array<string|HTMLAnchorElement>|string}
	 */
	#stringify(value) {
		if (value === null) return 'null';
		if (value === undefined) return 'undefined';
		if (['string', 'number'].includes(typeof value)) {
			return this.linkify(value.toString());
		}
		return JSON.stringify(value, null, 4);
	}

	/**
	 *
	 * @param {any} data
	 * @param {HTMLElement} parentElement
	 * @param {string[]} [path]
	 * @return {HTMLUListElement}
	 */
	#buildList(data, parentElement, path = []) {
		const valueType = this.#getValueType(data);
		if (['null', 'undefined', 'string', 'number'].includes(valueType)) {
			parentElement.append(
				this.#createElement('span', this.#stringify(data), `type-${valueType}`)
			);
			return;
		}


		if (path.length > 0) {
			const checkbox = document.createElement('input');
			checkbox.classList.add('collapse');
			checkbox.type = 'checkbox';
			checkbox.checked = path.length !== 5;
			if (parentElement.children.length) {
				parentElement.insertBefore(checkbox, parentElement.children.item(0));
			} else {
				parentElement.appendChild(checkbox);
			}
		}

		const ul = document.createElement('ul');
		ul.classList.add("z-json-viewer");
		parentElement.appendChild(ul);


		ul.classList.add('type-object');
		for (const [key, value] of Object.entries(data)) {
			const propSubPath = [...path];
			propSubPath.push(key);
			const li = document.createElement('li'),
				propertySpan = this.#createElement('span', key, 'property')
			;
			li.tabIndex = 0;
			li.dataset.path = this.pathArrayToString(propSubPath);
			li.append(propertySpan);
			ul.append(li);

			if (Array.isArray(value)) {
				const checkbox = document.createElement('input');
				checkbox.classList.add('collapse');
				checkbox.type = 'checkbox';
				checkbox.checked = true;
				li.insertBefore(checkbox, propertySpan);

				const arrayUl = document.createElement('ol');
				arrayUl.classList.add('type-array');
				li.classList.add('container-array');

				for (const [i, item] of value.entries()) {
					const arrayLi = document.createElement('li'),
						arraySubPath = [...propSubPath]
					;
					arraySubPath.push(i);
					arrayLi.dataset.path = this.pathArrayToString(arraySubPath);
					li.tabIndex = 0;
					if (typeof item === 'object') {
						arrayLi.classList.add(Array.isArray(item) ? 'container-array' : 'container-object');
						this.#buildList(item, arrayLi, arraySubPath);
					} else {
						const valueType = this.#getValueType(item);
						arrayLi.classList.add(`container-${valueType}`);
						arrayLi.append(this.#createElement('span', this.#stringify(item), `type-${this.#getValueType(item)}`));
					}
					arrayUl.appendChild(arrayLi);
				}

				li.appendChild(arrayUl);
			} else if (typeof value === 'object') {
				li.classList.add('container-object');
				this.#buildList(value, li, propSubPath);
			} else {
				const valueType = this.#getValueType(value);
				li.classList.add(`container-${valueType}`);
				li.append(this.#createElement('span', this.#stringify(value), `type-${valueType}`));
			}
		}

		return ul;
	}

	/**
	 *
	 * @param {HTMLElement} container
	 */
	render(container) {
		const ul = this.#buildList(this.#json, container);
		ul.classList.add('z-json-viewer-container');
	}
}