export class Resource {
	constructor(public scope: Resource | string, public id: string) {}

	get absoluteId(): string {
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