import type { AuthenticationService } from "./services/authentication";

export type AuthenticationApi = ReturnType<AuthenticationService['buildApi']>;