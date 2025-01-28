import { registry } from 'wirejs-resources';
import { Resource } from 'wirejs-resources';

export {
	AuthenticationService,
	withContext,
	requiresContext,
	Context,
	CookieJar,
	Resource,
	registry,
} from 'wirejs-resources';

export class FileService extends Resource {
	constructor(scope, id) {
		super(scope, id);
		addResource('FileService', { absoluteId: this.absoluteId });
	}

	async write(...args) {
		console.log('"writing secret" ... :/ ... ');
	}
}

// expose resources to other resources that might depend on it.
registry.FileService = FileService;

// export class AuthenticationService {
// 	constructor(id) {
// 		addResource('AuthenticationService', { id });
// 	}

// 	buildApi(...args) {
// 		// console.log('AuthService.buildApi', [args]);
// 	}
// }

// export class Secret {
// 	constructor(id) {
// 		addResource('Secret', { id });
// 	}
// }

globalThis.wirejsResources = [];

function addResource(type, options) {
	wirejsResources.push({
		type,
		options
	});
}
