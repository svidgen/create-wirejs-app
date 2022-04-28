#!/usr/bin/env node

const fs = require('fs');
const process = require('process');
const { exec, execSync } = require('child_process');
const copy = require('recursive-copy');

const [
	nodeBinPath,
	scriptPath,
	projectName,
] = process.argv;

(async () => {
	fs.mkdirSync(projectName);

	console.log("Writing base package files ...");
	await copy(`${__dirname}/template`, `./${projectName}`);

	fs.writeFileSync(`${projectName}/package.json`,
		JSON.stringify({
			name: projectName,
			version: "1.0.0",
			private: true,
			dependencies: {
				"ex-gratia": "^1.0.3",
				"wirejs-dom": "^1.0.4",
				"wirejs-scripts": "~/js/wirejs-scripts",
				"highlight.js": "^11.5.1"
			},
			scripts: {
				start: "wirejs-scripts start",
				build: "wirejs-scripts build"
			}
		}, null, "\t")
	);

	console.log("Fetching dependencies ...");
	process.chdir(projectName);
	execSync('npm install');

	console.log(`
Done creating ${projectName}!

To get started:

  cd ${projectName}
  npm start

Happy coding!
`);

})();
