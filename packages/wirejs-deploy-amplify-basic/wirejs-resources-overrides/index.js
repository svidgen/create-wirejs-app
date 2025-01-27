export {
	AuthenticationService,
	withContext,
	requiresContext,
	Context,
	CookieJar,
} from 'wirejs-resources';

export class FileService {
	constructor(id) {
		addResource('FileService', { id });
	}
}

// export class AuthenticationService {
// 	constructor(id) {
// 		addResource('AuthenticationService', { id });
// 	}

// 	buildApi(...args) {
// 		// console.log('AuthService.buildApi', [args]);
// 	}
// }

export class Secret {
	constructor(id) {
		addResource('Secret', { id });
	}
}

globalThis.wirejsResources = [];

function addResource(type, options) {
	wirejsResources.push({
		type,
		options
	});
}
