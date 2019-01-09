/*
    config - Read configuration for gulp builds and define polyfills
 */

import * as fs from 'fs'
import * as json5 from 'json5'
import * as gulp from 'gulp'
import * as util from 'gulp-util'
import {blend} from './blend'

/*
    Polyfills
 */
global.print = (...args) => util.log(...args)
global.dump = (...args) => { for (let item of args) print(JSON.stringify(item, null, 4)) }

/*
    Build up config environment which is
        ../pak.json + package.json + pak.json + product.json + command line
 */
var config = {}
let argv = process.argv
let files = [
    '../pak.json',
    'pak.json',
    'product.json',
    '../CONFIG/keys.json',
    'CONFIG/keys.json',
]
for (let file of files) {
    file = process.cwd() + '/' + file
    if (fs.existsSync(file)) {
        let json = json5.parse(fs.readFileSync(file))
        blend(config, json)
    }
}
for (let i = 2; i < argv.length; i++) {
    let arg = argv[i]
    if (arg.indexOf('--') == 0) {
        arg = arg.slice(2)
        config[arg] = argv[++i] || true
    } else if (arg.indexOf('-') == 0) {
        arg = arg.slice(1)
        config[arg] = true
    }
}

/*
    Set sensible defaults: Default to profile == dev, debug == true if dev.
 */
config.profile = config.profile || process.env.PROFILE || 'dev'
if (!config.profiles[config.profile]) {
    util.log(`Cannot find profile "${config.profile}" in product.json`)
    process.exit(1)
}
if (config.debug == 'true') {
    config.debug = true
}
if (config.debug !== true) {
    config.debug = (config.profile == 'dev') ? true : false
}
blend(config, config.profiles[config.profile])

/*
    Patch version from ../pak.json
 */
try {
    var parent = json5.parse(fs.readFileSync(process.cwd() + '/../pak.json'))
    config.version = parent.version
} catch (err) {
    try {
        var parent = json5.parse(fs.readFileSync(process.cwd() + '/pak.json'))
        config.version = parent.version
    } catch (err) {
        print('Cannot read ../pak.json or ./pak.json')
    }
}
// util.log(`Select profile "${config.profile}", debug ${config.debug} ${config.version}`)

export default config
