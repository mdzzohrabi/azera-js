#!/usr/bin/env node

let { program } = require('commander');
let { version } = require('../package.json');
let { existsSync, writeFileSync, mkdirSync } = require('fs');
let { resolve, dirname, basename } = require('path');

const log = console.log;
const error = (...params) => log(colorize(`<bg:red><white>Error</white></bg:red>`), ...params);
const success = (...params) => log(colorize(`<bg:green><black>Success</black></bg:green>`), ...params);

program
    .version(version)
    .description('Azera stack');

program
    .command('init')
    .description('Initialize application structure')
    .action(() => {

        let dir = resolve( __dirname , '../../../../' );
        
        // Execute when runs as a sub-module
        if ( basename(dirname(dirname(dirname(__dirname)))) != 'node_modules' ) {
            log(`Stack init only works as a sub-module`)
            return;
        }
        
        let packagePath = resolve(dir, './package.json');

        log(`Working directory : %s`, dir);

        if (!existsSync(packagePath)) {
            error(`Cannot file package.json file in current directory`);
            return;
        }

        let package = require(packagePath);

        if (existsSync(dir + '/tsconfig.json')) {
            log(`Application already initialized`);
            return;
        }

        log(`Initializing application structure ...`);

        log(`Initializing directories ...`);
        [ './src', './tests' ].map(path => resolve(dir, path)).forEach(path => {
            if (!existsSync(path)) {
                mkdirSync(path, { recursive: true });
            }
        });

        log(`Initializing files ...`);
        let files = {
            './src/index.ts': [
                `import {Kernel} from '@azera/stack';\n`,
                `async function bootstrap() {`,
                `\tlet kernel = await Kernel.createFullStack();`,
                `\tawait kernel.bootAndRun(__dirname + '/../app.config.json', 'cli');`,
                `}\n`,
                `bootstrap();`
            ].join('\n'),
            './app.config.json': [
                `{`,
                `\t"$schema": "./config.schema.json",`,
                `\t"services": []`,
                `}`
            ].join('\n'),
            './tsconfig.json': JSON.stringify({
                "extends": "@azera/stack",
                "compilerOptions": {
                    "outDir": "dist",
                    "inlineSourceMap": true
                },
                "include": ["src"],
                "exclude": ["node_modules", "src/**/public"]
            }, null, "\t"),
            './nodemon.json': JSON.stringify({
                "$schema": "https://json.schemastore.org/nodemon",
                "watch": ["./dist/**/*.js", "./app.config.json", "./**/*.yml"],
                "exec": "node dist/index http:start",
                "ext": "js"
            }, null, "\t")
        };

        Object.keys(files).forEach(file => {
            let path = resolve(dir, file);
            if (!existsSync(path)) {
                writeFileSync(path, files[file]);
            }
        });

        log(`Add default commands to package.json ...`);

        let scripts = {
            cli: 'node dist/index',
            web: 'node dist/index http:start',
            watch: 'yarn tsc -w',
            build: 'yarn tsc'
        }
        if (package['scripts']) {
            package.scripts = { ...scripts, ...package.scripts };
        } else {
            package.scripts = scripts;
        }

        writeFileSync(packagePath, JSON.stringify(package, null, "\t"));

        success(`Application structure generated successful, run "yarn cli config:schema" to generate configuration schema`);
        log(`Run "yarn cli" to see available commands`)

    });

program.parse(process.argv);

function colorize(param) {

    if (typeof param != 'string') return param;

    return param
        // Foreground color
        .replace(/<black>(.*)?<\/black>/, (_, text) => `\x1b[30m${ text }\x1b[0m`)
        .replace(/<red>(.*)?<\/red>/, (_, text) => `\x1b[31m${ text }\x1b[0m`)
        .replace(/<green>(.*)?<\/green>/, (_, text) => `\x1b[32m${ text }\x1b[0m`)
        .replace(/<yellow>(.*)?<\/yellow>/, (_, text) => `\x1b[33m${ text }\x1b[0m`)
        .replace(/<blue>(.*)?<\/blue>/, (_, text) => `\x1b[34m${ text }\x1b[0m`)
        .replace(/<magenta>(.*)?<\/magenta>/, (_, text) => `\x1b[35m${ text }\x1b[0m`)
        .replace(/<cyan>(.*)?<\/cyan>/, (_, text) => `\x1b[36m${ text }\x1b[0m`)
        .replace(/<white>(.*)?<\/white>/, (_, text) => `\x1b[37m${ text }\x1b[0m`)
        // Background color
        .replace(/<bg:black>(.*)?<\/bg:black>/, (_, text) => `\x1b[40m${ text }\x1b[0m`)
        .replace(/<bg:red>(.*)?<\/bg:red>/, (_, text) => `\x1b[41m${ text }\x1b[0m`)
        .replace(/<bg:green>(.*)?<\/bg:green>/, (_, text) => `\x1b[42m${ text }\x1b[0m`)
        .replace(/<bg:yellow>(.*)?<\/bg:yellow>/, (_, text) => `\x1b[43m${ text }\x1b[0m`)
        .replace(/<bg:blue>(.*)?<\/bg:blue>/, (_, text) => `\x1b[44m${ text }\x1b[0m`)
        .replace(/<bg:magenta>(.*)?<\/bg:magenta>/, (_, text) => `\x1b[45m${ text }\x1b[0m`)
        .replace(/<bg:cyan>(.*)?<\/bg:cyan>/, (_, text) => `\x1b[46m${ text }\x1b[0m`)
        .replace(/<bg:white>(.*)?<\/bg:white>/, (_, text) => `\x1b[47m${ text }\x1b[0m`)
        // Style
        .replace(/<bright>(.*)?<\/bright>/, (_, text) => `\x1b[1m${ text }\x1b[0m`)
        .replace(/<dim>(.*)?<\/dim>/, (_, text) => `\x1b[2m${ text }\x1b[0m`)
        .replace(/<u>(.*)?<\/u>/, (_, text) => `\x1b[4m${ text }\x1b[0m`)
        .replace(/<b>(.*)?<\/b>/, (_, text) => `\x1b[5m${ text }\x1b[0m`)
        .replace(/<r>(.*)?<\/r>/, (_, text) => `\x1b[7m${ text }\x1b[0m`)
        .replace(/<h>(.*)?<\/h>/, (_, text) => `\x1b[8m${ text }\x1b[0m`)

}