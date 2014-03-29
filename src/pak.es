#!/usr/bin/env ejs

/*
    pak.es -- Embedthis Pak Package Manager

    Copyright (c) All Rights Reserved. See details at the end of the file.
 */

module ejs.pak {

require ejs.unix
require ejs.tar
require ejs.zlib
require ejs.version

const MAX_VER: Number = 1000000000
const VER_FACTOR: Number = 1000
const HOME = Path(App.getenv('HOME') || '.')
const BOWER: Path = Path('bower.json')

var PACKAGE: Path = Path('package.json')
var BOWER: Path = Path('bower.json')
var PakFiles = [ PACKAGE, BOWER ]

var catalogs: Array
var dirs: Object
var files: Object
var extensions: Object
var options: Object
var out: File = App.outputStream

class PakCmd 
{
    //  TODO - move above as constants
    private const RC: String = 'pakrc'
    private const DOTRC: String = '.pakrc'
    private const DIR_PERMS: Number = 0775

    private var appName: String = 'pak'
    private var args: Args
    private var git: Path
    private var searchPath: String
    private var tempFile: Path?
    private var installed: Object = {}

    /* This layers over App.config */
    private var defaultConfig = {
        catalogs: [ 
            //  TODO SSL
            'http://embedthis.com/catalog/do/pak',
            'https://bower.herokuapp.com/packages',
        ],
        publish: 'http://embedthis.com/pak/do/catalog/publish',
        dirs: {
            paks: Path('paks'),
            pakcache: Path('~/.paks'),
        },
        extensions: {
            es: 'es',
            js: 'js',
            ejs: 'ejs',
            pak: 'pak',
            mod: 'mod',
        },
    }

    private var requiredKeywords = [ 'description', 'license', 'name', 'repository', 'version' ]

    private var sysdirs = {
        '',    
        '.',
        '..',
        '/Applications': true,
        '/Library': true,
        '/Network': true,
        '/System': true,
        '/Program Files': true,
        '/Program Files (x86)': true,
        '/Users': true,
        '/bin': true,
        '/dev': true,
        '/etc': true,
        '/home': true,
        '/opt': true,
        '/sbin': true,
        '/tmp': true,
        '/usr': true,
        '/usr/bin': true,
        '/usr/include': true,
        '/usr/lib': true,
        '/usr/sbin': true,
        '/usr/local': true,
        '/usr/local/bin': true,
        '/usr/local/etc': true,
        '/usr/local/include': true,
        '/usr/local/lib': true,
        '/usr/local/man': true,
        '/usr/local/opt': true,
        '/usr/local/share': true,
        '/usr/local/src': true,
        '/usr/local/x': true,
        '/var': true,
        '/var/cache': true,
        '/var/lib': true,
        '/var/log': true,
        '/var/run': true,
        '/var/spool': true,
        '/var/tmp': true,
        '/': true,
    }


    function PakCmd() {
        App.log.name = 'pak'
        config = App.config
        blend(App.config, defaultConfig, {overwrite: false})
        dirs = App.config.dirs
        catalogs = App.config.catalogs
        files = App.config.files
        extensions = App.config.extensions

        if (Config.OS == 'macosx') {
            extensions.lib = 'dylib'
        } else if (Config.OS == 'windows') {
            extensions.lib = 'dll'
        } else {
            extensions.lib = 'so'
        }
    }

    private var argTemplate = {
        options: {
            all: { alias: 'a'},
            cache: { alias: 'c', range: String },
            catalog: { range: String },
            code: { range: String },
            debug: { alias: 'd' },
            details: {},
            dir: { range: String },
            force: { alias: 'f' },
            log: { range: /\w+(:\d)/, value: 'stderr:1' },
            paks: { alias: 'p', range: String },
            quiet: { alias: 'q' },
            silent: { alias: 's' },
            verbose: { alias: 'v' },
            version: { alias: 'V', range: String },
            versions: {},
        },
        usage: usage,
        onerror: 'exit',
    }

    //  TODO - need search
    function usage(): Void {
        print('\nUsage: pak ' + ' [options] [commands] ...\n' +
            '  Commands:\n' + 
            '    cache [paks...]          # Populate the cache with paks\n' +
            '    cached [paks...]         # List paks in the cache\n' +
            '    config                   # Show the Pak configuration\n' +
            '    depend [paks...]         # Display installed pak dependencies\n' +
            '    edit key[=value]...      # Edit a pak description file \n' +
            '    help                     # Display this usage help\n' +
            '    info paks...             # Display README for a pak\n' +
            '    init [name [version]]    # Create a new package.json\n' +
            '    install paks...          # Install a pak on the local system\n' +
            '    list [paks...]           # list installed paks\n' +
            '    prune [paks...]          # Prune named paks\n' +
            '    publish [name uri pass]  # publish a pak in a catalog\n' +
            '    retract name [pass]      # Unpublish a pak\n' +
            '    search paks...           # Search for paks in the catalog\n' +
            '    uninstall                # Uninstall a pak on the local system\n' +
            '    update [paks...]         # Update the cache with latest version\n' +
            '    upgrade [paks...]        # Upgrade installed paks\n' +
            '  General options:\n' + 
            '    --catalog catalog        # Catalog to use instead of defaults\n' +
            '    --cache dir              # Director to use for the Pak cache\n' +
            '    --dir dir                # Change to directory before running\n' +
            '    --force                  # Ignore dependencies and continue\n' +
            '    --log file:level         # Send output to a file at a given level\n' + 
            '    --paks dir               # Use given directory for paks cache\n' +
            '    -q, --quiet              # Run in quiet mode\n' +
            '    -s, --silent             # Run in totally silent mode\n' +
            '    -v, --verbose            # Run in verbose mode\n' +
            '  List options:\n' + 
            '    -a, --all                # Show all versions for a pak\n' +
            '    --details                # Show pak details\n' +
            '    --versions               # Show pak version information\n' +
            '')
        App.exit(1)
    }

    function main() {
        args = Args(argTemplate)
        try {
            processOptions(args)
            if (args.rest.length == 0) {
                usage()
            }
            process()
        } catch (e) {
            if (e is String) {
                msg = e
                error(msg)
            } else {
                msg = e.message
                error(msg)
                if (!args || args.options.verbose) {
                    print(e)
                }
            }
            App.exit(2)
        } finally {
            cleanup()
        }
    }

    function processOptions(args: Args) {
        options = args.options
        if (options.debug) {
            options.verbose = true
        }
        if (options.silent) {
            options.quiet = true
        }
        if (options.version) {
            print(Config.version)
            App.exit(0)
        }
        if (options.paks) {
            dirs.paks = Path(options.paks)
        }
        if (options.cache) {
            dirs.pakcache = Path(options.cache)
        }
        if (options.search) {
            //  TODO - no search switch defined
            searchPath = App.searchPath = options.search.split(Path.SearchSeparator)
        }
        if (options.log) {
            App.log.redirect(options.log)
            App.mprLog.redirect(options.log)
        }
        if (options.dir) {
            App.chdir(options.dir)
        }
        if (options.all || !options.quiet) {
            options.versions = true
        }
    }

    function setup() {
        setDefaults()
        if (options.catalog) {
            catalogs = [Uri(options.catalog)]
        } else {
            for (c in catalogs) {
                catalogs[c] = Uri(catalogs[c])
            }
        }
        for (d in dirs) {
            dirs[d] = Path(dirs[d])
        }
        for (let [d,value] in dirs) {
            dirs[d] = Path(value.toString().replace('~', HOME))
        }
        if (!dirs.pakcache.exist) {
            makeDir(dirs.pakcache)
        }
        git = Cmd.locate('git')
    }

    function process() {
        let rest = args.rest
        let task = rest.shift()
        setup()

        switch (task) {
        case 'cache':
            if (rest.length == 0) {
                if (!PACKAGE.exists) {
                    error('Nothing to install')
                } else {
                    let spec = Package.readSpec('.')
                    pak = Package(spec.name)
                    pak.setSource(Path('.').absolute)
                    cache(pak)
                }
            } else {
                for each (name in rest) {
                    let pak = Package(name)
                    if (Path(name).exists) {
                        pak.setSource(name)
                        /* Use name from package.json so directory can be any name */
                        let spec = Package.readSpec(name)
                        if (spec) {
                            pak.name = spec.name
                            pak.resolve()
                        }
                    }
                    cache(pak)
                }
            }
            break

        case 'cached':
            cached(rest)
            break

        case 'config':
            showConfig()
            break

        case 'depend':
            depend(rest)
            break

        case 'edit':
            edit(rest)
            break

        case 'help':
            usage()
            break

        case 'init':
            init(rest)
            break

        case 'info':
            let spec = Package.readSpec('.')
            for each (name in rest) {
                let criteria = (spec.dependencies && spec.dependencies[name]) || '*'
                let pak = Package(name)
                pak.resolve(criteria)
                if (pak.cachePath.join('README.md')) {
                    let readme = pak.cachePath.join('README.md')
                    let text = readme.readString()
                    if (Config.OS == 'macosx') {
                        try {
                            Cmd.run('open ' + readme)
                        } catch {
                            print(text)
                        }
                    }
                }
            }
            break

        case 'install':
            if (rest.length == 0) {
                if (!PACKAGE.exists) {
                    error('Nothing to install')
                } else {
                    let spec = Package.readSpec('.')
                    if (spec) {
                        let deps = blend({}, spec.dependencies)
                        if (options.all) {
                            blend(deps, spec.optionalDependencies)
                        }
                        for (let [name,version] in deps) {
                            let pak = Package(name)
                            pak.setSearchCriteria(version)
                            install(pak)
                        }
                    }
                }
            } else {
                let spec = Package.readSpec('.')
                for each (name in rest) {
                    let criteria = (spec && spec.dependencies && spec.dependencies[name]) || '*'
                    let pak = Package(name)
                    pak.resolve(criteria)
                    install(pak)
                }
            }
            break

        case 'list':
        case 'installed':
            list(rest)
            break

        case 'publish':
            publish(rest)
            break

        case 'prune':
            if (rest.length == 0) {
                let pak
                for each (path in dirs.pakcache.files('*/*')) {
                    pak = Package(path.dirname.basename)
                    pak.setVersion(path.basename)
                    prune(pak)
                }
            } else {
                let pak
                for each (name in rest) {
                    for each (path in dirs.pakcache.join(name).files('*')) {
                        pak = Package(name)
                        pak.setSearchCriteria(path.basename)
                        prune(pak)
                    }
                }
                if (!pak) {
                    qtrace('Info', 'Nothing to prune')
                }
            }
            break

        case 'retract': case 'unpublish':
            retract(rest)
            break

        case 'search':
            for each (name in rest) {
                search(Package(name))
            }
            break

        case 'uninstall':
            uninstall(rest)
            break

        case 'update':
            if (rest.length == 0) {
                for each (path in ls(dirs.pakcache, true)) {
                    update(Package(path))
                }
            } else for each (name in rest) {
                update(Package(name))
            }
            break

        case 'upgrade':
            if (!PACKAGE.exists) {
                error('Nothing to upgrade')
                break
            }
            let spec = Package.readSpec('.')
            if (!spec) {
                error('Cannot read package.json')
                break
            }
            if (rest.length == 0) {
                let deps = blend({}, spec.dependencies)
                blend(deps, spec.optionalDependencies)
                for (let [name,criteria] in deps) {
                    let pak = Package(name)
                    pak.resolve(criteria)
                    if (pak.installed || !spec.optionalDependencies[pak.name]) {
                        upgrade(pak)
                    }
                }
            } else {
                for each (name in rest) {
                    let criteria = spec.dependencies[name]
                    let pak = Package(name)
                    pak.resolve(criteria)
                    upgrade(pak)
                }
            }
            break

        case 'setdeps':
            setdeps()
            break

        default:
            usage()
            break
        }
        return true
    }

    private function cleanup() {
        if (tempFile) {
            tempFile.remove()
            tempFile = null
        }
    }

    /*
        Print pak dependencies. Pak is a bare pak name or a versioned pak name
     */
    function depend(patterns): Void {
        let options = args.options
        if (options.help) {
            //  TODO - not implemented
            dependHelp()
        }
        let list = []
        for each (path in dirs.paks.files('*')) {
            let pak = Package(path)
            pak.resolve()
            if (matchPakName(pak.name, patterns)) {
                list.push(pak)
            }
        }
        if (list.length > 0) {
            checkNamePatterns(patterns, list)
            for each (pak in list) {
                printDeps(pak)
            }
        } else if (patterns) {
            /*
                Look instead at cached packs
             */
            for each (path in dirs.pakcache.files('*')) {
                let pak = Package(path.basename)
                for each (v in path.files('*').reverse()) {
                    pak.setCacheVersion(v.basename)
                    pak.resolve()
                    if (matchPakName(pak.name, patterns)) {
                        list.push(pak)
                    }
                    if (!options.all) break
                }
            }
            checkNamePatterns(patterns, list)
            for each (pak in list) {
                printDeps(pak)
            }
        } else {
            error('No installed paks matching ' + patterns)
        }
    }

    function edit(args): Void {
        let spec = Package.readSpec('.')
        for each (arg in args) {
            let [key,value] = arg.split('=')
            if (value) {
                spec[key] = value
            } else {
                /* Missing value so display current value */
                print(spec[key])
            }
        }
        path = Package.getSpecFile('.')
        path.write(serialize(spec, {pretty: true}) + '\n')
    }

    /*
        Cache a pak
        @param pak Name of the pak. can be a bare pak name, versioned pak-name or a path to a physical pak file
     */
    function cache(pak: Package) {
        pak.resolve(pak.searchCriteria || '*')
        if (pak.publish === false) {
            qtrace('Skip', pak + ' has publish: false')
            return
        }
        if (pak.cached) {
            if (!args.options.force) {
                qtrace('Info', pak + ' ' + pak.cacheVersion + ' is already cached')
                return
            }
        } else {
            vtrace('Info', pak + ' is not yet cached')
        }
        if (pak.sourcePath) {
            if (!pak.spec) {
                qtrace('Skip', pak + ' does not have a valid package.json')
                return
            }
            pak.setCacheVersion(pak.spec.version)
        } else {
            pak = searchPak(pak)
        }
        cachePak(pak)
    }

    /*
        Show list of paks in the cache
            --all          # Independently list all versions of a module instead of just the most recent
            --versions     # Show versions appended to each pak
            --details      # List pak details
     */
    function cached(patterns: Array): Void {
        let options = args.options
        if (options.help) {
            //  TODO - not implemented
            listHelp()
        }
        let sets = {}
        for each (path in dirs.pakcache.files('*/*').sort()) {
            let pak = Package(path.dirname.basename)
            pak.setCacheVersion(path.basename)
            if (matchPakName(pak.name, patterns)) {
                let index = (options.all) ? pak.namever : pak.name
                /* Aggregate the set of installed versions of each pak */
                let pakset = sets[pak.name]
                pakset ||= []
                sets[index] = pakset
                pakset.append(pak)
            }
        }
        for each (pakset in sets) {
            let pak = pakset[0]
            if (options.versions) {
                versions = []
                for each (pak in pakset) {
                    versions.append(pak.cacheVersion)
                }
                pak = pakset[0]
                out.write(pak.name + ' ' + versions.join(', '))
            } else {
                /* Pick last pak (highest version) */
                pak = pakset[pakset.length - 1]
                out.write(pak.name)
            }
            if (options.details) {
                out.write(': ')
                print(serialize(pak.spec, {pretty: true, indent: 4}))
            }
            print()
        }
    }

    /*
        Search for a pak
        @param pak Name of the pak. can be a bare-pak name, versioned pak-name or a path to a physical pak file
     */
    function search(pak: Package) {
        let indent = ''
        if (options.verbose || options.versions) {
            indent += '    '
        }
        for each (match in searchPaks(pak, false)) {
            let cached = match.cached ? 'cached' : ''
            if (options.versions) {
                print(indent + match.name + ' ' + match.cacheVersion + ' ' + match.remoteUri + ' ' + cached)
                print(indent + '  versions:')
                for each (v in match.versions) {
                    print(indent + indent + v)
                }
            } else {
                print(indent + match.name + ' ' + match.cacheVersion + ' ' + match.remoteUri + ' ' + cached)
            }
        }
    }

    /*
        pak init 
        Generates package.json template
     */
    function init(args) {
        if (PACKAGE.exists) {
            throw 'Package description "' + PACKAGE + '" .already exists in this directory'
        }
        qtrace('Create', PACKAGE)
        let spec = PakTemplate.clone()
        if (args.length > 0) {
            let [name, version] = args
            spec.name = name
            spec.version = version
        }
        Path(PACKAGE).write(serialize(spec, {pretty: true, indent: 4}))
    }

    function install(pak: Package) {
        pak.resolve(pak.searchCriteria || '*')
        if (pak.cached) {
            if (pak.installed && Version(pak.spec.version).acceptable(pak.searchCriteria)) {
                if (!args.options.force) {
                    qtrace('Info', pak + ' is already installed')
                    return
                }
            }
        } else {
            pak = searchPak(pak)
            cachePak(pak)
        }
        runScripts(pak, 'preinstall')
        let path = Package.getSpecFile('.') || Path(PACKAGE)
        let spec = path.exists ? path.readJSON() : PakTemplate.clone()
        blendPak(spec, pak)
        if (!path.exists) {
            qtrace('Create', path)
        } else {
            qtrace('Update', path)
        }
        if (path.exists) {
            path.write(serialize(spec, {pretty: true, indent: 4}) + '\n')
        }
        installPak(pak)
        runScripts(pak, 'install')
    }

    var blending = {}

    /* 
        Blend dependencies bottom up so that lower paks can define dirs
     */
    private function blendPak(spec, pak: Package) {
        if (!pak.spec) {
            throw 'Pak ' + pak + ' at ' + pak.cachePath + ' is missing a package.json'
        }
        if (blending[pak.name]) {
            return
        }
        blending[pak.name] = true
        trace('Blend', pak + ' configuration')
        blendDependencies(spec, pak)
        //  TODO - document
        let paks = spec.paks
        if (!(paks && (paks.noblend || (paks[pak.name] && paks[pak.name].noblend)))) {
            blendSpec(spec, pak)
        }
        delete blending[pak.name]
    }

    private function blendDependencies(spec, pak: Package) {
        if (!pak.spec) {
            return
        }
        for (let [other, criteria] in pak.spec.dependencies) {
            let dep = Package(other)
            dep.resolve()
            if (!dep.installed) {
                dep.selectCacheVersion(criteria)
                dep.resolve()
                blendPak(spec, dep)
            }
        }
    }

    private function blendSpec(spec, pak: Package) {
        /*
            Blend 'esp', 'dirs' and 'client-scripts' only
            Special handling for dirs which are also copied to this.dirs for immediate effect
         */
        blendSpecProperties(spec, 'esp', pak.spec, 'esp')
        blendSpecProperties(spec, 'dirs', pak.spec, 'dirs', {overwrite: false})
        for (let [k,v] in spec.dirs) {
            spec.dirs[k] = Path(v)
            dirs[k] = Path(v)
        }
        let PAKS = dirs.client ? { PAKS: dirs.paks.trimStart(dirs.client + '/') } : {PAKS: 'paks'}
        for each (script in pak.spec['client-scripts']) {
            let scripts = spec['client-scripts'] ||= []
            script = script.expand(PAKS).expand(spec)
            for (let [index,value] in spec['client-scripts']) {
                if (value.startsWith(script)) {
                    spec['client-scripts'].remove(index)
                }
            }
            scripts.push(script.expand(spec))
        }
        if (pak.spec.blend) {
            for (let [key,value] in pak.spec.blend) {
                spec[key] ||= {}
                blend(spec[key], pak.spec[value], {overwrite: false})
                vtrace('Blend', 'Property ' + value + ' into ' + key)
            }
        }
        if (spec.optionalDependencies && spec.optionalDependencies[pak.name]) {
            spec.optionalDependencies ||= {}
            spec.optionalDependencies[pak.name] ||= '~' + pak.installVersion.compatible
            Object.sortProperties(spec.optionalDependencies)
        } else {
            spec.dependencies ||= {}
            spec.dependencies[pak.name] ||= '~' + pak.installVersion.compatible
            Object.sortProperties(spec.dependencies)
        }
    }

    /*
        Install pak files top down. We don't overwrite existing (perhaps user-modified) files, 
        so lower packs won't modify the files of upper paks
     */
    private function installPak(pak: Package): Void {
        if (installed[pak.name]) {
            return
        }
        installed[pak.name] = true
        qtrace('Install', pak.name, pak.cacheVersion)
        if (!pak.cached) {
            cachePak(pak)
            pak.resolve()
        }
        let dest = pak.installPath
        trace('Info', 'Installing "' + pak.name + '" from "' + pak.cachePath)
        if (dest.exists) {
            vtrace('Rmdir', dest)
            removeDir(dest, true)
        }
        trace('Mkdir', dest)
        mkdir(dest)

        let export = pak.spec.export
        if (export && PACKAGE.exists) {
            //  TODO This should be read once at startup?
            //  TODO - document
            let spec = Package.readSpec('.', {quiet: true})
            if (spec.paks && (spec.paks.noexport || (spec.paks[pak.name] && spec.paks[pak.name].noexport))) {
                export = null
            }
        }
        copyTree(pak.cachePath, dest, pak.spec.ignore, pak.spec.files, export)
        /* Get updated dependency information in spec */
        pak.resolve()

        let installDeps = true
        if (PACKAGE.exists) {
            //  TODO This should be read once at startup?
            //  TODO - document
            let spec = Package.readSpec('.', {quiet: true})
            if (spec.paks && (spec.paks.nodeps || (spec.paks[pak.name] && spec.paks[pak.name].nodeps))) {
                installDeps = false
            }
        }
        if (installDeps) {
            installDependencies(pak)
        }
        trace('Info', pak + ' ' + pak.cacheVersion + ' successfully installed')
        trace('Info', 'Use "pak info ' + pak.name + '" to view the README')
    }

    private function installDependencies(pak: Package) {
        for (let [other, criteria] in pak.spec.dependencies) {
            installDependency(other, criteria, true)
        }
        if (options.all) {
            for (let [other, criteria] in pak.spec.optionalDependencies) {
                installDependency(other, criteria, false)
            }
        }
    }

    private function installDependency(name, criteria, install: Boolean) {
        if (installed[name]) {
            return
        }
        let dep = Package(name)
        dep.selectCacheVersion(criteria)
        dep.resolve()
        if (install && (!dep.installed || args.options.force)) {
            trace('Info', 'Install required dependency ' + dep.name)
            try {
                installPak(dep)
            } catch (e) {
                print(e)
                if (args.options.force) {
                    qtrace('WARN', 'Cannot install required dependency "' + dep.name + '"' )
                } else {
                    throw 'Cannot install ' + pak.name + ' because of missing required dependency "' + dep.name + '"' 
                }
            }
        } else {
            trace('Info', 'dependency "' + dep.name + '" is installed')
        }
    }

    /*
        Show list of locally installed paks
            --versions     # Show versions appended to each pak
            --details      # List pak details
     */
    function list(patterns: Array): Void {
        let options = args.options
        if (options.help) {
            listHelp()
        }
        let sets = {}
        for each (path in dirs.paks.files('*')) {
            let pak = Package(path)
            pak.resolve()
            if (matchPakName(pak.name, patterns)) {
                sets[pak.name] = pak
            }
        }
        let spec = Package.readSpec('.')
        for each (pak in sets) {
            let optional = (spec.optionalDependencies && spec.optionalDependencies[pak.name]) ? ' optional' : ''
            out.write(pak.name)
            if (options.details && pak.spec) {
                out.write(': ')
                print(serialize(pak.spec, {pretty: true, indent: 4}))
            } else if (options.versions) {
                print(' ' + pak.installVersion + optional)
            } else {
                print()
            }
        }
    }

    /*
        []      Prune old versions that are not being used. Keep the most recent version.
        --all   Prune all versions that are not being used.
        --force Prune regardless of whether other dependencies require the pak.
     */
    function prune(pak: Package) {
        pak.resolve()
        var latest = dirs.pakcache.join(pak.name).files('*').reverse()[0]
        if (!latest) {
            throw 'Nothing to prune for "' + pak + '"'
        }
        if (pak.spec && pak.spec.precious && !options.force) {
            qtrace('Warn', 'Cannot prune "' + pak + '" designated as precious. Use --force to force pruning.')
            return
        }
        if (pak.cachePath == latest && !options.all) {
            qtrace('Info', 'Preserve latest version for ' + pak + ' ' + pak.cacheVersion)
            qtrace('Info', 'Use --all to prune all versions')
            return
        }
        if ((users = requiredCachedPak(pak)) != null) {
            if (!options.force) {
                throw 'Cannot prune "' + pak + '". It is required by: ' + users.join(', ') + '.'
            }
        }
        qtrace('Prune', pak + ' ' + pak.cacheVersion)
        removeDir(pak.cachePath, true)
        /* Remove parent if empty */
        removeDir(pak.cachePath.dirname, false)
        qtrace('Info', pak + ' successfully pruned')
    }

    function showConfig() {
        let obj = App.config.clone()
        let preserve = ['dirs', 'catalogs']
        for (let [key,value] in obj) {
            if (!preserve.contains(key)) {
                delete obj[key]
            }
        }
        delete obj.dirs.cache
        print('Pak configuration: ' + serialize(obj, {pretty: true, quotes: false}))
    }

    /*
        Update cached packs
     */
    function update(pak: Package? = null): Pak {
        pak.resolve(pak.searchCriteria || '*')
        trace('Search', 'Latest version of ' + pak)
        let later = searchPak(pak)
        if (pak.cacheVersion && pak.cacheVersion.same(later.cacheVersion)) {
            qtrace('Info', pak + ' is current with ' + pak.cacheVersion + ' for requirement ')
            return pak
        }
        trace('Update', pak + ' to ' + later.cacheVersion)
        runScripts(pak, 'preupdate')
        cachePak(later)
        return later
    }

    /*
        Upgrade installed packs
     */
    function upgrade(pak: Package? = null) {
        pak.resolve(pak.searchCriteria || '*')
        let later = pak
        if (!pak.cached) {
            later = update(pak)
        } 
        if (pak.installed && pak.installVersion && pak.installVersion.same(later.cacheVersion) && !options.force) {
            qtrace('Info', 'Installed ' + pak + ' is current with ' + pak.installVersion + 
                ' for version requirement ' + pak.searchCriteria)
            return
        }
        qtrace('Upgrade', pak + ' to ' + later.cacheVersion)
        later.resolve(later.cacheVersion)
        runScripts(pak, 'preupgrade')
        install(later)
    }

    private function cacheDependencies(pak: Package): Boolean {
        let spec = pak.spec
        if (!spec.dependencies) {
            return false
        }
        for (let [other, criteria] in spec.dependencies) {
            let dep = Package(other)
            dep.selectCacheVersion(criteria)
            if (Path(dep.name).isDir) {
                dep.setSource(dep.name)
            }
            dep.resolve()
            if (!dep.cached) {
                if (dep.sourcePath) {
                    trace('Info', 'Caching required dependency from source at: ' + dep.sourcePath)
                    cachePak(dep)
                } else {
                    try {
                        dep = searchPak(dep)
                        cachePak(dep)
                    } catch (e) {
                        //  TODO - should test if present and must display (e)
                        print(e)
                        if (args.options.force) {
                            qtrace('WARN', 'Cannot cache required dependency "' + dep.name + '"' )
                        } else {
                            throw 'Cannot cache ' + pak.name + ' because of missing required dependency "' + dep.name + '"' 
                        }
                    }
                }
            } else {
                trace('Info', 'dependency "' + dep.name + '" for "' + pak.name + '" is cached')
            }
        }
        return true
    }

    function copyTree(fromDir: Path, toDir: Path, ignore: Array?, include: Array?, export: Array?) {
        if (include) {
            include.push('package.json')
            if (fromDir.join('README.md').exists) {
                include.push('README.md')
            }
            if (fromDir.join('LICENSE.md').exists) {
                include.push('LICENSE.md')
            }
        }
        include ||= ['**']
        fromDir = fromDir.relative
        let ignoreSet = {}
        for each (pat in ignore) {
            for each (file in Path(fromDir).files(pat)) {
                ignoreSet[file] = true
            }
        }
        let files = []
        for each (pat in include) {
            for each (f in find(fromDir, pat, {descend: true, relative: true})) {
                let skip = false
                if (ignoreSet[f]) {
                    continue
                }
                files.push(f)
            }
        }
        let relocate = {}
        for each (pat in export) {
            for each (f in fromDir.files(pat, {relative: true})) {
                relocate[f] = true
            }
        }
        for each (f in files) {
            let target = toDir.join(f.trimStart(fromDir + '/'))
            let from = fromDir.join(f)
            let to = (relocate[f]) ? f : toDir.join(f)
            if (from.isDir) {
                makeDir(to)
            } else {
                makeDir(to.dirname)
                from.copy(to)
                trace(relocate[f] ? 'Export' : 'Copy', to)
            }
        }
    }

    private function fetchPak(pak: Package) {
        let http = new Http
        let current = App.dir
        let tempName = Path('.').temp()
        let tarName = tempName.joinExt('tar', true)
        let tgzName = tarName.joinExt('gz', true)
        let dest = pak.cachePath
        try {
            http.followRedirects = true
            trace('Get', pak.downloadUri)
            http.get(pak.downloadUri)
            let file = File(tgzName, 'w')
            let buf = new ByteArray
            while (http.read(buf) > 0) {
                let wrote = file.write(buf)
            }
            file.close()
            http.close()
            trace('Save', 'Response to ' + tgzName.absolute)
            Zlib.uncompress(tgzName, tarName)
            let tar = new Tar(tarName.absolute)
            chdir(dest.parent)
            trace('Extract', 'Extract to ' + dest)
            //  Better to strip first part of file name and extract into the right place first time
            //  Tar options strip: 1
            tar.extract()
            removeDir(dest, true)
            dest.parent.join(pak.repName + '-' + pak.cacheVersion).rename(dest)

        } finally {
            chdir(current)
            tgzName.remove()
            tarName.remove()
            tempName.remove()
            dest.parent.join(pak.name + '-' + pak.cacheVersion).removeAll()
        }
    }

    /*
        Events:
            cache
            preinstall
            install
            uninstall
            preupdate
            preupgrade
     */
    private function runScripts(pak: Package, event: String) {
        if (pak.spec && pak.spec.scripts) {
            let script = pak.spec.scripts[event]
            let path = pak.cachePath.join(script)
            if (path.exists) {
                let current = App.dir
                try {
                    chdir(pak.sourcePath)
                    if (path.extension == 'es') {
                        trace('Run', 'Ejs script', script)
                        load(path)
                    } else if (path.extension == 'bit') {
                        trace('Run', 'Bit', script)
                        Cmd.run('bit --file ' + path, {noio: true})
                    } else {
                        trace('Run', 'Shell', script)
                        Cmd.run('bash ' + path, {noio: true})
                    }
                } catch (e) {
                    throw 'Cannot run installion script "' + script + '" for ' + pak + '\n' + e
                } finally {
                    chdir(current)
                }
            }
        } else if (pak.cachePath) {
            path = pak.cachePath.join('start.me')
            if (path.exists) {
                trace('Run', 'me --file ' + path + ' ' + event)
                Cmd.run('me --file ' + path + ' ' + event, {noio: true})
            }
        }
    }

    private function copyPak(pak: Package) {
        trace('Info', 'Caching "' + pak.name + '" from "' + pak.sourcePath.relative + '" to "' + pak.cachePath + '"')
        copyTree(pak.sourcePath, pak.cachePath, pak.spec.ignore, pak.spec.files)
    }

    private function cachePak(pak: Package) {
        trace('Cache', pak)
        let dest = pak.cachePath
        if (dest.exists) {
            vtrace('Rmdir', dest)
            removeDir(dest, true)
        }
        trace('Mkdir', dest)
        mkdir(dest)
        if (!pak.sourcePath) {
            fetchPak(pak)
        } else if (pak.sourcePath.isDir) {
            copyPak(pak)
        } else {
            throw 'Cannot find pack ' + pak.name + ' to install'
        }
        if (!Package.getSpecFile(pak.cachePath)) {
            throw 'Cannot find package description for ' + pak + ' from ' + pak.cachePath
        }
        pak.resolve()
        if (!pak.sourcePath || options.all) {
            cacheDependencies(pak)
        }
        runScripts(pak, 'cache')
        qtrace('Info', pak + ' ' + pak.cacheVersion + ' successfully cached')
    }

    private function pakFileExists(path: Path): Boolean {
        for each (name in PakFiles) {
            let f = path.join(name)
            if (f.exists) {
                return true
            }
        }
        return false
    }

    /*
        Match a pak name against user specified patterns
     */
    private function matchPakName(name: String, patterns: Array): Boolean {
        if (!patterns || patterns.length == 0) {
            return true
        }
        for each (pat in patterns) {
            //  Ignore version copmonent
            pat = pat.split('#')[0]
            if (!(pat is RegExp)) pat = RegExp(pat)
            if (name.match(pat)) {
                return true
            }
        }
        return false
    }

    private function getDeps(pak: Package, deps = {}, level: Number = 0) {
        pak.resolve()
        if (options.all || level == 0) {
            for (let [name,criteria] in pak.spec.dependencies) {
                let dep = Package(name)
                dep.selectCacheVersion(criteria)
                getDeps(dep, deps, level + 1)
            }
        }
        if (level > 0) {
            deps[pak.name] = pak
        }
        return deps
    }

    private function printDeps(pak: Package, prefix: String = '') {
        let version = pak.installVersion || pak.cacheVersion
        print('\n' + pak.name + ' ' + version + ' dependencies:')
        let deps = getDeps(pak)
        if (Object.getOwnPropertyCount(deps) == 0) {
            print('    none')
        }
        for (let [name, dep] in deps) {
            out.write(prefix)
            let dver = dep.installVersion || dep.cacheVersion
            out.write('    ' + dep.name + ' ' + dver + '\n')
        }
    }

    /*
        pak publish <CR>
        pak publish name URI [password]
     */
    function publish(args): Void {
        let uri = options.catalog || catalogs[0]
        let name, endpoint, password
        if (!PACKAGE.exists) {
            throw 'Cannot find package.json in current directory'
        }
        let spec = Package.readSpec('.', {quiet: true})
        let pak = new Package(spec.name)
        if (pak.publish === false) {
            qtrace('Skip', pak + ' has publish: false')
            return
        }
        pak.setSource('.')
        if (args.length == 0) {
            name = pak.name
            endpoint = (spec.repository && spec.repository.url) || null
        } else if (args.length == 3) {
            [name, endpoint, password] = args
        } else if (args.length == 2) {
            [name, endpoint] = args
        } else {
            throw 'Incorrect args for publish'
        }
        if (!validatePak(pak)) {
            return
        }
        if (!endpoint) {
            throw 'Missing repository property in package.json.'
        }
        if (!password) {
            while (true) {
                password = App.getpass('Password: ')
                confirm = App.getpass('Confirm: ')
                if (password == confirm) {
                    break
                }
                stdout.write('\nPassword confirmation does not match\n')
            }
            stdout.write('\n')
        }
        if (!password || password.length < 8) {
            throw 'Bad password. Must be 8 characters or longer'
        }
        let http = new Http
        let data = { name: pak.name, endpoint: endpoint, password: password }
        http.setHeader('Content-Type', 'application/json');
        try {
            qtrace('Publish', pak.name + ' ' + pak.cacheVersion + ' at ' + uri)
//  TODO - while using a test cert
http.verifyIssuer = false
            http.post(uri + '/publish', serialize(data))
            let response = deserialize(http.response)
            if (response.error) {
                qtrace('Error', response.feedback.error)
            } else {
                qtrace('Info', pak.name + ' successfully published at ' + endpoint)
            }
        } catch (e) {
            throw 'Cannot register pak. ' + e
        } 
    }

    /*
        pak retract <CR>
        pak retract name [password]
     */
    function retract(args): Void {
        let uri = options.catalog || catalogs[0]
        let name, endpoint, password
        let spec = Package.readSpec('.', {quiet: true})
        let pak = new Package(spec.name)
        pak.setSource('.')
        if (args.length == 0) {
            name = pak.name
        } else if (args.length != 2) {
            throw 'Incorrect args for retract'
        } else {
            [name, password] = args
        }
        if (!password) {
            password = App.getpass('Password')
        }
        let http = new Http
        let data = { name: pak.name, endpoint: endpoint, password: password }
        http.setHeader('Content-Type', 'application/json');
        try {
            http.post(uri + '/retract', serialize(data))
            let response = deserialize(http.response)
            if (response.error) {
                qtrace('Error', response.feedback.error)
            } else {
                qtrace('Info', pak.name + ' retracted')
            }
        } catch (e) {
            throw 'Cannot register pak. ' + e
        } 
    }

    function uninstallPak(pak: Package): Void {
        if (!args.options.force) {
            if (users = requiredInstalledPak(pak)) {
                throw 'Cannot remove "' + pak + '". It is required by: ' + users.join(', ') + '.'
            }
        }
        pak.resolve(pak.installVersion)
        if (!pak.spec) {
            throw 'Cannot remove "' + pak + '". Missing package.json'
        }
        runScripts(pak, 'uninstall')
        /*
            Remove entry in ./package.json dependencies and optionalDependencies
         */
        let path = Package.getSpecFile('.')
        if (path) {
            let spec = path.readJSON()
            delete spec.dependencies[pak.name]
            delete spec.optionalDependencies[pak.name]

            /*
                Remove client scripts
             */
            if (spec['client-scripts']) {
                let PAKS = dirs.client ? { PAKS: dirs.paks.trimStart(dirs.client + '/') } : {}
                for each (script in pak.spec['client-scripts']) {
                    script = script.expand(PAKS).expand(spec)
                    for (let [key,value] in spec['client-scripts']) {
                        if (value.startsWith(script)) {
                            delete spec['client-scripts'][key]
                        }
                    }
                }
            }
            path.write(serialize(spec, {pretty: true, indent: 4}) + '\n')
        }
        removeDir(pak.installPath, true)
        qtrace('Remove', pak.name)
    }


    //  MOB - order functions
    private function requiredCachedPak(pak: Package): Array? {
        let users = []
        for each (path in dirs.pakcache.files('*/*')) {
            let name = path.dirname.basename.toString()
            if (name != pak.name) {
                let spec = Package.readSpec(path, {quiet: true})
                if (spec && spec.dependencies) {
                    for (let [dname, criteria] in spec.dependencies) {
                        if (dname == pak.name && pak.cacheVersion.acceptable(criteria)) {
                            users.append(name)
                        }
                    }
                }
            }
        }
        return users.length ? users : null
    }

    private function requiredInstalledPak(pak: Package): Array? {
        let users = []
        /*
            See if any installed paks has a dependency on pak
         */
        pak.resolve()
        for each (path in ls(dirs.paks, true)) {
            let name = path.basename.toString()
            if (name != pak.name) {
                let spec = Package.readSpec(path, {quiet: true})
                if (spec && spec.dependencies) {
                    for (let [other, criteria] in spec.dependencies) {
                        if (other == pak.name && pak.installVersion.acceptable(criteria)) {
                            users.append(name)
                        }
                    }
                }
            }
        }
        return users.length ? users : null
    }

    private function selectRemoteVersion(pak: Package, criteria: String, remote) {
        if (!pak.setRemoteEndpoint(remote)) {
            if (remote.match(/^[\w\-]$/)) {
                qtrace('Warn', pak + ' is part of ' + remote + ' and not available separately')
            } else {
                throw 'Remote endpoint is not in the correct format: ' + remote
            }
        }
        trace('Run', [git, 'ls-remote', '--tags', pak.remoteUri].join(' '))
        let data = Cmd.run([git, 'ls-remote', '--tags', pak.remoteUri])
        let versions = data.trim().
            replace(/[ \t]+/g, ' ').
            replace(/^.+refs\/tags\//mg, '').
            split(/[\r\n]+/).
            filter(function(e) !e.match(/\{/))
        let found 
        pak.versions = []
        for each (v in versions.reverse()) {
            if (v && Version(v).acceptable(criteria)) {
                pak.versions.push(v)
                if (!found) {
                    found = true
                    pak.setRepTag(v)
                    pak.setRemoteVersion(v)
                    pak.setCacheVersion(v)
                }
            }
        }
        if (!found) {
            if (options.force) {
                trace('Warn', 'Desired version not found in catalog for ' + pak.name + ' ' + criteria)
                pak.setRemoteVersion(versions[versions.length - 1])
                pak.setCachePath()
            } else {
                throw 'Desired version not found in catalog. ' + criteria
            }
        }
        trace('Info', 'Matched ' + pak + ' ' + pak.remoteVersion + ' from ' + pak.remoteUri)
        if (pak.host != 'github.com') {
            throw 'Repository host "' + pak.host + '" is not support. Only github supported'
        }
        pak.setDownload('https://github.com/' + pak.owner + '/' + pak.repName + '/archive/' + pak.repTag + '.tar.gz')
    }

    /*
        Search for matching paks in a remote catalog
        Pak specifies a nmae and optional version 
     */
    private function searchPaks(pak: Package, exactName: Boolean = false): Array {
        let http = new Http
        let matches = []
        for (let [index, catalog] in catalogs) {
            trace('Info', 'Searching catalog: ' + catalog + ' for ' + pak + ' ' + (pak.searchCriteria || ''))
            try {
                if (!catalog.toString().contains('bower')) {
                    catalog = catalog.toString() + '/search'
                }
                vtrace('Retrieve', catalog)
                http.get(catalog)
            } catch (e) {
                qtrace('Warn', 'Cannot access catalog at: ' + catalog)
                if (App.config.requirePrimaryCatalog && !options.force) {
                    throw 'Cannot continue with offline primary catalog ' + catalog + '\n' + 'Wait or retry with --force'
                }
            }
            try {
                let index = {}
                let data
                try {
                    data = deserialize(http.response)
                } catch {
                    trace('Skip', 'Bad response from catalog: ' + catalog)
                }
                if (!data) {
                    trace('Skip', 'Missing catalog data')
                    continue
                }
                if (!(data is Array)) {
                    data = data.data
                }
                for each (item in data) {
                    index[item.name] = item.endpoint || item.url
                }
                let remote = index[pak.name]
                if (remote) {
                    /* Exact match */
                    trace('Query', pak.name + ' versions at ' + remote)
                    let mpak = Package(pak.name)
                    let criteria = pak.searchCriteria || (options.all ? '*' : '^*')
                    selectRemoteVersion(mpak, criteria, remote)
                    matches.push(mpak)
                    return matches
                }
                if (!exactName) {
                    for (let [pname, remote] in index) {
                        /* Partial name match */
                        if (pname.contains(pak.name)) {
                            trace('Query', pak.name + ' versions at ' + remote)
                            let mpak = Package(pname)
                            let criteria = pak.searchCriteria || (options.all ? '*' : '^*')
                            selectRemoteVersion(mpak, criteria, remote)
                            matches.push(mpak)
                        }
                    }
                }
            } catch (e) {
                vtrace('Warn', e)
                qtrace('Info', 'Cannot find suitable ' + pak.name + ' in catalog: ' + catalog)
            }
        }
        if (matches.length == 0) {
            throw 'Cannot find pak "' + pak + '"'
        }
        return matches
    }

    private function searchPak(pak: Package, exact: Boolean = true): Pak
        searchPaks(pak, exact)[0]

    /*
        Set package dependencies based on module files. Uses exact versioning.
     */
    private function setdeps() {
        if (!pakFileExists('.')) {
            throw 'Missing ' + PakFiles[0] + '. Run "pak" in the directory containing the package file'
        }
        moddeps = []
        for each (f in args.rest) {
            moddeps += Cmd.sh('ejsmod --depends ' + f).trim().split(' ')
        }
        let spec = Package.readSpec('.')
        deps = []
        for each (mod in moddeps) {
            let parts = mod.split('/')
            let name = parts[0]
            let min = parts[1]
            dep = [name, '== ' + min]
            deps.append(dep)
        }
        spec.dependencies = deps
        PACKAGE.write(serialize(spec, {pretty: true}))
    }

    function validatePak(pak: Package): Boolean {
        let requiredFiles = [ PACKAGE ]
        for each (file in requiredFiles) {
            let path = pak.sourcePath.join(file)
            if (!exists(path) && !path.isDir) {
                throw 'Pak is missing required file "' + file + '"'
            }
        }
        pak.resolve()
        let spec = pak.spec
        let name = spec.name
        if (!name || !name.match(/^[\w_-]+$/)) {
            throw 'Invalid package name: ' + name
        }
        if (!HOME.join('.embedthis')) {
            if (name.startsWith('ejs-') ||name.startsWith('esp-') || name.startsWith('bit-') ||
                name.startsWith('appweb-') || name.startsWith('pak-')) {
                throw 'Reserved pak name ' + name
            }
        }
        if (spec.name.start)
        if (!spec.description) {
            throw 'Invalid package name: ' + spec.description
        }
        if (!spec.version || !Version(spec.version).valid) {
            throw 'Invalid package version: ' + spec.version
        }
        return true
    }

    /*
        Validate a package.json object
     */
    function validateJson(package: Object): Boolean {
        if (!package) {
            throw 'Invalid package description file'
        }
        for each (field in requiredKeywords) {
            if (package[field] == undefined) {
                if (package.name) {
                    throw 'Package ' + package.name + ' does not validate. Missing or empty required field "' + field + '"'
                }
                throw 'Package does not validate. Missing or empty required field "' + field + '"'
            }
        }
        return true
    }

    function checkNamePatterns(patterns, list) {
        for each (pat in patterns) {
            let found
            for each (pak in list) {
                if ((matched = matchPakName(pak.name, patterns)) == true) {
                    found = true
                    break
                }
            }
            if (!found) {
                throw 'Cannot find pak "' + pat + '"'
            }
        }
    }

    function uninstall(patterns): Void {
        let list = []
        for each (path in dirs.paks.files('*')) {
            let pak = Package(path)
            pak.setInstallPath();
            if (matchPakName(pak.name, patterns)) {
                list.push(pak)
                if (!pak.installed) {
                    if (!args.options.force) {
                        throw 'Pak "' + pak + '" is not installed'
                    }
                }
            }
        }
        checkNamePatterns(patterns, list)
        for each (pak in list) {
            uninstallPak(pak)
        }
    }

    function loadPakrc(path: Path): Boolean {
        if (!path.exists) {
            return false
        }
        vtrace('Read', 'Pak configuration from ' + path)
        let spec = path.readJSON()
        blend(App.config, spec)
        if (spec.catalogs) {
            catalogs = spec.catalogs
        }
        return true
    }

    /*
        Search order: pakrc : .pakrc : ../.../[pakrc|.pakrc] : package.json (for dirs only)
     */
    function setDefaults() {
        if (RC.exists) {
            loadPakrc(RC)
        } else if (DOTRC.exists) {
            loadPakrc(DOTRC)
        } else {
            let base: Path = '.'
            let d: Path = base
            for ( ; d.parent != d; d = d.parent) {
                let f = d.join(RC)
                if (f.exists) {
                    loadPakrc(f)
                    break
                }
                let f = d.join(DOTRC)
                if (f.exists) {
                    loadPakrc(f)
                    break
                }
            }
            if (d.parent == d) {
                if (HOME.join(RC).exists) {
                    loadPakrc(HOME.join(RC))
                } else if (HOME.join(DOTRC).exists) {
                    loadPakrc(HOME.join(DOTRC))
                } else if (Path('/etc/pakrc').exists) {
                    loadPakrc(Path('/etc/pakrc'))
                }
            }
        }
        let base: Path = '.'
        let d: Path = base
        for ( ; d.parent != d; d = d.parent) {
            let f = Package.getSpecFile(d)
            if (f) {
                let spec = f.readJSON()
                vtrace('Read', 'Configuration from: ' + f)
                for (let [field, value] in spec.dirs) {
                    dirs[field] = f.dirname.join(value)
                }
                if (spec.catalogs) {
                    catalogs = spec.catalogs
                }
                break
            }
        }
        if (options.paks) {
            dirs.paks = Path(options.paks)
        }
        if (options.cache) {
            dirs.pakcache = Path(options.cache)
        }
        for (let [field, value] in dirs) {
            dirs[field] = Path(value).replace('~', HOME)
        }
    }

    function makeDir(path: String): Void
        mkdir(path, DIR_PERMS)

    function removeDir(path: Path, contents: Boolean = false) {
        if (sysdirs[path]) {
            throw 'Internal error. Attempting to remove ' + path
        }
        if (contents) {
            rmdir(path, {hidden: true})
        } else {
            path.remove()
        }
    }

    function blendSpecProperties(dest, destKey, src, srcKey, options = {})
    {
        if (!dest || !src) return
        let from = src[srcKey]
        if (from) {
            if (from is Array) {
                dest[destKey] ||= []
            } else {
                dest[destKey] ||= {}
            }
            blend(dest[destKey], src[srcKey], options)
        }
    }

    function error(msg) App.log.error(msg)

    private var PakTemplate = {
        name: 'Package Name - unique one word package name',
        description: 'Full Package Description - one line',
        title: 'Display Package Title - several words. E.g. Company Product',
        version: '1.0.0',
        keywords: [
            'Put search keywords here',
        ],
        author: {
            name: 'Your name',
            email: 'Your email',
            url: 'Your web site',
        },
        bugs: {
            email: 'name@example.com',
            url: 'http://example.com/bugs',
        },
        repository: {
            type: 'git',
            url: 'git://github.com/user/repo.git',
        },
        dirs: {
            paks: './paks',
        },
        license: 'GPL',
        dependencies: {},
    }
}

/*
    Trace for quiet mode only
 */
function qtrace(tag: String, ...args): Void {
    if (!options.silent) {
        let msg = args.join(' ')
        let msg = '%12s %s' % (['[' + tag + ']'] + [msg]) + '\n'
        out.write(msg)
    }
}

function trace(tag: String, ...args) {
    if (!options.quiet) {
        let msg = args.join(' ')
        let msg = '%12s %s' % (['[' + tag + ']'] + [msg]) + '\n'
        out.write(msg)
    }
}

function vtrace(tag: String, ...args) {
    if (options.verbose) {
        let msg = args.join(' ')
        let msg = '%12s %s' % (['[' + tag + ']'] + [msg]) + '\n'
        out.write(msg)
    }
}

PakCmd().main()

} /* ejs.pak module */


/*
    @copy   default

    Copyright (c) Embedthis Software LLC, 2003-2014. All Rights Reserved.

    This software is distributed under commercial and open source licenses.
    You may use the Embedthis Open Source license or you may acquire a 
    commercial license from Embedthis Software. You agree to be fully bound
    by the terms of either license. Consult the LICENSE.md distributed with
    this software for full details and other copyrights.

    Local variables:
    tab-width: 4
    c-basic-offset: 4
    End:
    vim: sw=4 ts=4 expandtab

    @end
 */
