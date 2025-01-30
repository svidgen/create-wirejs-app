async function callApi(
	INTERNAL_API_URL: string,
	method: string[],
	...args: any
) {
	function isNode() {
		return typeof args[0]?.cookies?.getAll === 'function'
	}

	function apiUrl() {
		if (isNode()) {
			return INTERNAL_API_URL;
		} else {
			return "/api";
		}
	}
	
	let cookieHeader = {};

	if (isNode()) {
		const context = args[0];
		const cookies = context.cookies.getAll();
		cookieHeader = typeof cookies === 'object'
			? {
				Cookie: Object.entries(cookies).map(kv => kv.join('=')).join('; ')
			}
			: {};
	}

	const response = await fetch(apiUrl(), {
		method: 'POST',
		headers: {
			'Content-Type': 'application/json',
			...cookieHeader
		},
		body: JSON.stringify([{method, args:[...args]}]),
	});
	const body = await response.json();

	if (isNode()) {
		const context = args[0];
		for (const c of response.headers.getSetCookie()) {
			const parts = c.split(';').map(p => p.trim());
			const flags = parts.slice(1);
			const [name, value] = parts[0].split('=').map(decodeURIComponent);
			const httpOnly = flags.includes('HttpOnly');
			const secure = flags.includes('Secure');
			const maxAgePart = flags.find(f => f.startsWith('Max-Age='))?.split('=')[1];
			context.cookies.set({
				name,
				value,
				httpOnly,
				secure,
				maxAge: maxAgePart ? parseInt(maxAgePart) : undefined
			});
		}
	}

	const error = body[0].error;
	if (error) {
		throw new Error(error);
	}

	const value = body[0].data;
	return value;
};

export function apiTree(
	INTERNAL_API_URL: string,
	path: string[] = []
) {
	return new Proxy(function() {}, {
		apply(_target, _thisArg, args) {
			return callApi(INTERNAL_API_URL, path, ...args);
		},
		get(_target, prop: string) {
			return apiTree(INTERNAL_API_URL, [...path, prop]);
		}
	});
};