// @ts-check
let fs = require('fs');
let debug = ( ...args ) => console.log( ...args );
let package = require('./package.json');
let templatePackage = require('./template/package.json');
let ncp = require('ncp').ncp;
let process = require('process');
let child = require('child_process');
let os = require('os');

// Enable debugging
// debug.enabled = true;

let templateDir = __dirname + '/template';
let isWindows = os.platform() == 'win32';

module.exports = {

    VERSION: package.version,

    devDependencies: Object.keys( templatePackage.devDependencies || [] ),
    dependencies: Object.keys( templatePackage.dependencies || [] ),    

    /**
     * @param {String} targetDir
     */
    setup: function setupTypeScriptPackage( targetDir, { name = undefined } = {} ) {

        if ( name ) targetDir += '/' + name;

        debug(`Setup project ...`);
        debug(`Directory : ${targetDir}`);

        if ( !fs.existsSync(targetDir) ) {
            debug(`Create directory ...`);
            fs.mkdirSync(targetDir);
        }

        debug(`Copy files ...`);

        ncp(templateDir, targetDir, (err) => {
            
            if ( err ) debug(`Error`, err);
            else debug(`Complete.`);

            // Install latest dependencies
            let yarn = child.spawn( 'yarn' , ['add'].concat( this.devDependencies ).concat( this.dependencies ) , {
                cwd: targetDir,
                env: process.env,
                shell: true
            });

            yarn.stdin.on('data', (data) => console.log(data.toString()));
            yarn.stdout.on('data', (data) => console.log(data.toString()));

        });

    }

}