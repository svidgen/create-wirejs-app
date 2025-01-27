#!/usr/bin/env node

import process from 'process';
import path from 'path';
import fs from 'fs';
import { rimraf } from 'rimraf';
import copy from 'recursive-copy';
import { execa } from 'execa';
import esbuild from 'esbuild';

const CWD = process.cwd();
const SELF_DIR = import.meta.dirname;
const RESOURCE_OVERRIDES_BUILD = path.join(
	SELF_DIR, 'temp', 'wirejs-resource-overrides.build.js'
);
const PROJECT_API_DIR = path.join(CWD, 'api');
const PROJECT_DIST_DIR = path.join(CWD, 'dist');
const HOSTING_DIR = path.join(CWD, '.amplify-hosting');
const STATIC_DIR = path.join(HOSTING_DIR, 'static');
const COMPUTE_DUR = path.join(HOSTING_DIR, 'compute', 'default');

await rimraf(HOSTING_DIR);
await fs.promises.mkdir(HOSTING_DIR, { recursive: true });
await fs.promises.mkdir(STATIC_DIR, { recursive: true });
await fs.promises.mkdir(COMPUTE_DUR, { recursive: true });

await copy(
	path.join(SELF_DIR, 'static', 'deploy-manifest.json'),
	path.join(HOSTING_DIR, 'deploy-manifest.json')
);

await copy(PROJECT_DIST_DIR, STATIC_DIR);
await rimraf(path.join(STATIC_DIR, 'ssr'));

await copy(
	path.join(PROJECT_DIST_DIR, 'ssr'),
	path.join(HOSTING_DIR, 'compute', 'default', 'ssr')
);

// build API

await import(path.join(PROJECT_API_DIR, 'index.js'));

// const apiPackageJSON = await fs.promises.readFile(path.join(CWD, 'api', 'package.json'));
// const apiPackage = JSON.parse(apiPackageJSON);

// console.log(apiPackage);

// await execa`npm --prefix ${PROJECT_API_DIR} install ./wirejs-amplify-build/wirejs-resources-overrides`;

await execa`npm i bcryptjs`;

await esbuild.build({
	// todo: get entrypoint from package.json
	entryPoints: [path.join(SELF_DIR, 'wirejs-resources-overrides', 'index.js')],
	bundle: true,
	outfile: RESOURCE_OVERRIDES_BUILD,
	platform: 'node',
	format: 'esm',
	alias: {
		'bcrypt': 'bcryptjs'
	}
});

await esbuild.build({
	entryPoints: ['./api/index.js'],
	bundle: true,
	outfile: './.amplify-hosting/compute/default/api.js',
	platform: 'node',
	format: 'esm',
	alias: {
		'bcrypt': 'bcryptjs',
		'wirejs-resources': RESOURCE_OVERRIDES_BUILD
	}
});

await import(path.join(CWD, '.amplify-hosting/compute/default/api.js'));
console.log(globalThis.wirejsResources);

// await execa`npx ${ESBUILD_BIN} ./api/index.js --bundle --outfile=./.amplify-hosting/compute/default/api.js`;
