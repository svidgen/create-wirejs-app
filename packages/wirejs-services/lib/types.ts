import type {
	AuthenticationService as AuthenticationServiceBase,
	withContext as withContextBase,
	FileService as FileServiceBase,
	Context as ContextBase
} from './index.js';

export declare class Context extends ContextBase {};
export declare class AuthenticationService extends AuthenticationServiceBase {};
export declare class FileService extends FileServiceBase {};
export declare function withContext(): typeof withContextBase;
