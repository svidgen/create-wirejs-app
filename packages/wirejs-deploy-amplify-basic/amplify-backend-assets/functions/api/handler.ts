import { env } from 'process';
import { LambdaFunctionURLHandler, APIGatewayProxyEventV2 } from 'aws-lambda';
import { CookieJar, Context, requiresContext } from 'wirejs-resources';

// @ts-ignore
import * as api from '../../../api/index';

function createContext(event: APIGatewayProxyEventV2) {
	const baseUrl = `https://${event.requestContext.domainName}${event.rawPath}`;
	const queryString = event.queryStringParameters
		? `?${new URLSearchParams(event.queryStringParameters as any).toString()}`
		: '';
	const location = new URL(`${baseUrl}${queryString}`);

	const cookies = new CookieJar(event.headers['cookie']);
	return new Context({ cookies, location });
}

async function callApiMethod(api: any, call: any, context: any) {
	try {
		const [scope, ...rest] = call.method;
		console.log('api method parsed', { scope, rest });
		if (rest.length === 0) {
			console.log('api method resolved. invoking...');
			if (requiresContext(api[scope])) {
				return {
					data: await (api[scope] as any)(context, ...call.args.slice(1))
				};
			} else {
				return {
					data: await api[scope](...call.args)
				};
			}
		} else {
			console.log('nested scope found');
			return callApiMethod(api[scope], {
				...call,
				method: rest,
			}, context);
		}
	} catch (error: any) {
		console.log(error);
		return { error: error.message };
	}
}

export const handler: LambdaFunctionURLHandler = async (event, context) => {
	const calls = JSON.parse(event.body!);
	const responses = [];
	const wjsContext = createContext(event);

	for (const call of calls) {
		console.log('handling API call', call);
		responses.push(await callApiMethod(api, call, wjsContext));
	}
	
	console.log('setting cookies', wjsContext.cookies.getSetCookies());

	const cookies: string[] = [];
	for (const cookie of wjsContext.cookies.getSetCookies()) {
		const cookieOptions = [];
		if (cookie.maxAge) cookieOptions.push(`Max-Age=${cookie.maxAge}`);
		if (cookie.httpOnly) cookieOptions.push('HttpOnly');
		if (cookie.secure) cookieOptions.push('Secure');
		cookies.push(`${cookie.name}=${cookie.value}; ${cookieOptions.join('; ')}`);
	}

	return {
		statusCode: 200,
		cookies,
		headers: {
			'Content-Type': 'application/json; charset=utf-8'
		},
		body: JSON.stringify(responses)
	}
}