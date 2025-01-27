export class Resource {
	/**
	 * @type {Resource | string}
	 */
	scope;

	/**
	 * @type {string}
	 */
	id;

	/**
	 * 
	 * @param {Resource | string} scope
	 * @param {string} id 
	 */
	constructor(scope, id) {
		this.scope = scope;
		this.id = id;
	}

	get absoluteId() {
		const sanitizedId = encodeURIComponent(this.id);
		if (typeof this.scope === 'string') {
			return `${encodeURIComponent(this.scope)}/${sanitizedId}`;
		} else if (typeof this.scope?.id === 'string') {
			return `${this.scope.absoluteId}/${sanitizedId}`;
		} else {
			throw new Error("Resources must defined within a scope. Provide either a namespace string or parent resource.");
		}
	}
}