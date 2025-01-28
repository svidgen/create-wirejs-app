import type {
	AuthenticationService as AuthenticationServiceBase,
	withContext as withContextBase,
	FileService as FileServiceBase,
	Context as ContextBase,
	Resource as ResourceBase,
} from './index.js';

export declare class Resource extends ResourceBase {};
export declare class Context extends ContextBase {};
export declare class AuthenticationService extends AuthenticationServiceBase {};
export declare class FileService extends FileServiceBase {};
export declare function withContext(): typeof withContextBase;
export declare const overrides: any;
