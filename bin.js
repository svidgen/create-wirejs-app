#!/usr/bin/env node

const fs = require('fs');
const process = require('process');
const { exec, execSync } = require('child_process');

const [ nodeBinPath, scriptPath, projectName ] = process.argv;

const packageJson = `{
	"name": "${projectName}",
	"version": "0.1.0",
	"private": true,
	"dependencies": {
		"ex-gratia": "^1.0.3",
		"wirejs-dom": "^1.0.4"
	},
	"scripts": {
	  "start": "wirejs-scripts start",
	  "build": "wirejs-scripts build"
	}
  }
`;

const something = `
	"test": "jest",
	"build": "rimraf dist && yarn ex-gratia && webpack",
	"build:watch": "rimraf dist && webpack --mode development --progress --watch",
	"serve": "http-server ./dist -o",
	"start": "concurrently -k -p \"[{name}]\" -n \"Build,Serve\" -c \"cyan.bold,green.bold\" \"npm run build:watch\" \"npm run serve\""
`;

fs.mkdirSync(projectName);
fs.writeFileSync(`${projectName}/package.json`, packageJson);

process.chdir(projectName);
execSync('npm install');

console.log(`
Created ${projectName}.

To get started:

  cd ${projectName}
  npm start

Happy coding!
`);