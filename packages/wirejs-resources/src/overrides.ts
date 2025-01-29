import type { FileService } from "./services/file";
import type { AuthenticationService } from "./services/authentication";
import type { Secret } from "./resources/secret";

/**
 * Used by hosting providers to provide service overrides.
 */
export const overrides: {
	FileService?: typeof FileService;
	AuthenticationService?: typeof AuthenticationService;
	Secret?: typeof Secret;
} = {};