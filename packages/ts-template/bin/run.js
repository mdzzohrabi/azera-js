#!/usr/bin/env node
let yargs = require('yargs');
let app = require('../index.js');
let process = require('process');


let argv = yargs
    .version( app.VERSION )
    .option('name', { alias: 'n', description: 'Name of package' })
    .help()
    .argv
;

app.setup( process.cwd(), {
    name: argv._[0] || argv.name
})