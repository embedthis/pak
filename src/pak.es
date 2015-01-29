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
const HOME = App.home
const PACKAGE: Path = Path('package.json')
const BOWER: Path = Path('bower.json')

var PakFiles = [ PACKAGE, BOWER ]
var spec: Object

var catalogs: Array
var directories: Object
var dirTokens: Object
var files: Object
var options: Object
var state: Object
var out: File = App.outputStream

class Pak
{
    private const RC: String = 'pakrc'
    private const DOTRC: String = '.pakrc'
    private const DIR_PERMS: Number = 0775

    private var appName: String = 'pak'
    private var args: Args
    private var git: Path?
    private var searchPath: String
    private var tempFile: Path?
    private var installed: Object = {}
    private var topDeps: Object

    /* This layers over App.config */
    private var defaultConfig = {
        catalogs: [ 
            'http://embedthis.com/catalog/do/pak',
            //KEEP 'https://embedthis.com/catalog/do/pak',
            'https://bower.herokuapp.com/packages',
        ],
        directories: {
            /* exports */
            files: Path('files'),
            lib: Path('lib'),
            paks: Path('paks'),
            pakcache: Path('~/.paks'),
            public: Path('public'),
            source: Path('source'),
            top: Path('.'),
        },
        requirePrimaryCatalog: true,
        publish: 'https://embedthis.com/pak/do/catalog/publish',
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


    function Pak() {
        App.log.name = 'pak'
        config = App.config
        blend(App.config, defaultConfig, {overwrite: false})
        directories = App.config.directories
        catalogs = App.config.catalogs
        files = App.config.files
        state = {}
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
            name: { range: String },
            nodeps: { alias: 'n' },
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

    function usage(): Void {
        print('\nUsage: pak ' + ' [options] [commands] ...\n\n' +
            '  Commands:\n' + 
            '    cache [paks...]          # Populate the cache with paks\n' +
            '    cached [paks...]         # List paks in the cache\n' +
            '    config                   # Show the Pak configuration\n' +
            '    depend [paks...]         # Display installed pak dependencies\n' +
            '    edit key[=value]...      # Edit a pak description file \n' +
            '    help                     # Display this usage help\n' +
            '    info paks...             # Display README for paks\n' +
            '    init [name [version]]    # Create a new package.json\n' +
            '    install paks...          # Install a pak on the local system\n' +
            '    license paks...          # Display LICENSE for paks\n' +
            '    list [paks...]           # List installed paks\n' +
            '    lockdown                 # Lockdown dependencies\n' +
            '    mode [debug|release]     # Select property mode set\n' +
            '    prune [paks...]          # Prune named paks\n' +
            '    publish [name uri pass]  # publish a pak in a catalog\n' +
            '    retract name [pass]      # Unpublish a pak\n' +
            '    search paks...           # Search for paks in the catalog\n' +
            '    uninstall                # Uninstall a pak on the local system\n' +
            '    update [paks...]         # Update the cache with latest version\n' +
            '    upgrade [paks...]        # Upgrade installed paks\n\n' +
            '  General options:\n' + 
            '    --catalog catalog        # Catalog to use instead of defaults\n' +
            '    --cache dir              # Director to use for the Pak cache\n' +
            '    --dir dir                # Change to directory before running\n' +
            '    --force                  # Force requested action\n' +
            '    --log file:level         # Send output to a file at a given level\n' + 
            '    --name name              # Set an application name\n' +
            '    --nodeps                 # Do not install or upgrade dependencies\n' +
            '    --paks dir               # Use given directory for paks cache\n' +
            '    --quiet, -q              # Run in quiet mode\n' +
            '    --silent, -s             # Run in totally silent mode\n' +
            '    --verbose, -v            # Run in verbose mode\n\n' +
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
                if (!args || options.verbose) {
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
            directories.paks = Path(options.paks)
        }
        if (options.cache) {
            directories.pakcache = Path(options.cache)
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
        if (options.name) {
            aname = options.name
            PakTemplate.name = aname
            PakTemplate.title = aname.toPascal() + ' Application'
            PakTemplate.description = aname.toPascal() + ' Application'
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
        for (let [d,value] in directories) {
            directories[d] = Path(value.toString().replace('~', HOME))
        }
        if (!directories.pakcache.exist) {
            makeDir(directories.pakcache)
        }
        git = Cmd.locate('git')
        if (!git) {
            throw 'Cannot find "git" utility. Please install git first.'
        }
        let path = Package.getSpecFile('.') || Path(PACKAGE)
        spec = path.exists ? path.readJSON() : PakTemplate.clone()
        if (spec.pak && !Version(Config.Version).acceptable(spec.pak)) {
            throw '' + spec.title + ' requires Pak ' + spec.pak + '. Pak version ' + Config.Version +
                            ' is not compatible with this requirement.' + '\n'
        }
        if (spec.paks) {
            trace('Warn', 'Using deprecated "paks" property, use "app" instead')
            blend(spec, { app: spec.paks })
        }
        spec.dependencies ||= {}
        state.force = options.force
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
                        let pspec = Package.readSpec(name)
                        if (pspec) {
                            pak.name = pspec.name
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
            for each (name in rest) {
                let criteria = (spec.dependencies && spec.dependencies[name]) || '*'
                let pak = Package(name)
                pak.resolve(criteria)
                if (!pak.cached) {
                    pak = searchPak(pak)
                }
                if (pak && pak.cachePath.join('README.md')) {
                    let readme = pak.cachePath.join('README.md')
                    if (!readme.exists) {
                        throw 'Pak is missing a README.md file'
                    } else {
                        print(readme.readString())
                    }
                }
            }
            break

        case 'install':
            if (rest.length == 0) {
                if (!PACKAGE.exists) {
                    error('Nothing to install')
                } else {
                    if (spec) {
                        let deps = blend({}, spec.dependencies)
                        if (options.all) {
                            blend(deps, spec.optionalDependencies)
                        }
                        topDeps = deps
                        for (let [name,version] in deps) {
                            let pak = Package(name)
                            pak.setSearchCriteria(version)
                            install(pak)
                        }
                    }
                }
            } else {
                topDeps = {}
                for each (vname in rest) {
                    let [name,version] = vname.split('#')
                    topDeps[Path(name).basename] = true
                }
                for each (vname in rest) {
                    let [name,version] = vname.split('#')
                    if (!version && spec.dependencies && spec.dependencies[name]) {
                        vname += '#' + spec.dependencies[name]
                    }
                    let pak = Package(vname)
                    pak.resolve()
                    install(pak)
                }
            }
            break

       case 'license':
            for each (name in rest) {
                let criteria = (spec.dependencies && spec.dependencies[name]) || '*'
                let pak = Package(name)
                pak.resolve(criteria)
                if (!pak.cached) {
                    pak = searchPak(pak)
                }
                if (pak && pak.cachePath.join('LICENSE.md')) {
                    let license = pak.cachePath.join('LICENSE.md')
                    if (!license.exists) {
                        throw 'Pak is missing a LICENSE.md file'
                    } else {
                        print(license.readString())
                    }
                }
            }
            break

        case 'list':
        case 'installed':
            list(rest)
            break

        case 'lockdown':
            lockdown()
            break

        case 'mode':
            mode(rest)
            break

        case 'prune':
            if (rest.length == 0) {
                let pak
                for each (path in directories.pakcache.files('*/*')) {
                    pak = Package(path.dirname.basename)
                    pak.setVersion(path.basename)
                    prune(pak)
                }
            } else {
                let pak
                for each (name in rest) {
                    for each (path in directories.pakcache.join(name).files('*')) {
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

        case 'publish':
            publish(rest)
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
                for each (path in ls(directories.pakcache, true)) {
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
            if (!spec) {
                error('Cannot read package.json')
                break
            }
            if (rest.length == 0) {
                let deps = blend({}, spec.dependencies)
                blend(deps, spec.optionalDependencies)
                topDeps = deps
                for (let [name,criteria] in deps) {
                    let pak = Package(name)
                    pak.resolve(criteria)
                    if (pak.installed || !optional(pak.name)) {
                        upgrade(pak)
                    }
                }
            } else {
                topDeps = {}
                for each (name in rest) {
                    topDeps[Path(name).basename] = true
                }
                for each (name in rest) {
                    let criteria = spec.dependencies[name] || optional(name)
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
        Returned in dependency first order.
     */
    function depend(patterns): Void {
        let sets = getPaks({}, patterns, spec)
        for each (pak in sets) {
            printDeps(pak)
        }
    }

    function getValue(key): Void {
        let obj = Package.readSpec('.')
        for each (thisKey in key.split('.')) {
            obj = obj[thisKey]
        }
        if (Object.getOwnPropertyCount(obj) > 0) {
            print(obj.toJSON())
        } else {
            print(obj)
        }
    }

    function setValue(key, value): Void {
        let obj = spec
        for each (thisKey in key.split('.')) {
            if (Object.getOwnPropertyCount(obj[thisKey]) == 0) {
                key = thisKey
                break
            }
            obj = obj[thisKey]
        }
        obj[key] = value
        path = Package.getSpecFile('.')
        path.write(serialize(spec, {pretty: true}) + '\n')
    }

    function edit(args): Void {
        for each (arg in args) {
            let [key,value] = arg.split('=')
            if (value) {
                setValue(key, value)
            } else {
                getValue(key)
            }
        }
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
            if (!state.force) {
                qtrace('Info', pak + ' ' + pak.cacheVersion + ' is already cached')
                return
            }
        } else {
            vtrace('Info', pak + ' is not yet cached')
        }
        if (pak.sourcePath) {
            if (!pak.source) {
                qtrace('Skip', pak + ' does not have a valid package.json')
                return
            }
            pak.setCacheVersion(pak.source.version)
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
        let sets = {}
        for each (path in directories.pakcache.files('*/*').sort()) {
            let pak = Package(path.dirname.basename)
            pak.setCacheVersion(path.basename)
            if (matchPakName(pak.name, patterns)) {
                /* Aggregate the set of installed versions of each pak */
                let pakset = sets[pak.name]
                pakset ||= []
                sets[pak.name] = pakset
                pakset.append(pak)
            }
        }
        for each (pakset in sets) {
            let pak = pakset[0]
            if (options.all) {
                versions = []
                for each (pak in pakset) {
                    versions.append(pak.cacheVersion)
                }
                pak = pakset[0]
                out.write(pak.name + ' ' + Version.sort(versions).join(', '))
            } else {
                /* Pick last pak (highest version) */
                pak = pakset[pakset.length - 1]
                out.write(pak.name + ' ' + pak.cacheVersion)
            }
            pak.resolve()
            if (options.details && pak.cache) {
                out.write(': ')
                print(serialize(pak.cache, {pretty: true, indent: 4}))
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
        let pspec = PakTemplate.clone()
        if (args.length > 0) {
            let [name, version] = args
            pspec.name = name
            pspec.title = name.toPascal()
            pspec.description = pspec.title + ' Application'
            pspec.version = version
        } else {
            pspec.name = options.name || App.dir.basename.toLowerCase()
        }
        Path(PACKAGE).write(serialize(pspec, {pretty: true, indent: 4}))
    }

    function install(pak: Package) {
        pak.resolve(pak.searchCriteria || '*')
        if (pak.cached) {
            if (pak.installed && !state.force) {
                if (pak.installVersion.same(pak.cacheVersion)) {
                    qtrace('Info', pak + ' is already installed')
                } else if (Version(pak.cache.version).acceptable(pak.searchCriteria) && !state.upgrade) {
                    qtrace('Info', pak + ' is already installed')
                }
                return
            }
        } else {
            pak = searchPak(pak)
            cachePak(pak)
        }
        runScripts(pak, 'preinstall')
        installPak(pak, true)

        let path = Package.getSpecFile('.') || Path(PACKAGE)
        if (!path.exists) {
            vtrace('Create', path)
        } else {
            vtrace('Update', path)
        }
        if (!options.nodeps) {
            //  TEMP
            if (spec.optionalDependencies && Object.getOwnPropertyCount(spec.optionalDependencies) == 0) {
                delete spec.optionalDependencies
            }
            path.write(serialize(spec, {pretty: true, indent: 4}) + '\n')
        }
        runScripts(pak, 'install')
    }

    var blending = {}

    /* 
        Blend dependencies bottom up so that lower paks can define directories
     */
    private function blendPak(pak: Package) {
        if (!pak.cache) {
            throw new Error('Pak ' + pak + ' at ' + pak.cachePath + ' is missing a package.json')
        }
        if (blending[pak.name]) {
            return
        }
        blending[pak.name] = true
        vtrace('Blend', pak + ' configuration')

        //  DEPRECATE
        if (pak.cache.import != null) {
            trace('Warn', 'Using deprecated "import" property, use "app.*.noblend" instead')
            pak.cache.app ||= {}
            pak.cache.app['*'] ||= {}
            pak.cache.app['*'].noblend = pak.cache.import
        }
        if (!getAppSetting(pak, 'noblend')) {
            blendSpec(pak)
        }
        delete blending[pak.name]
    }

    private function blendSpec(pak: Package) {
        /*  KEEP
            Expand tokens in scripts before blending
        try {
            let scripts = pak.cache.app.client['+scripts']
            if (scripts) {
                for (let [key,value] in scripts) {
                    scripts[key] = value.expand(dirTokens)
                }
            }
        } catch {}
        */

        /*
            Combine directories, app and mode
         */
        let combine = blend({directories:'directories', app:'app',}, pak.cache.combine)
        for (let [key,value] in combine) {
            if (pak.cache[value]) {
                spec[key] ||= {}
                blend(spec[key], pak.cache[value], {combine: true})
                vtrace('Blend', 'Property ' + value + ' into ' + key)
            }
        }
        for (let [k,v] in spec.directories) {
            spec.directories[k] = Path(v)
            directories[k] = Path(v)
        }
        if (pak.cache.mode) {
            spec.mode ||= pak.cache.mode
        }
        for each (let name in pak.cache.blend) {
            let dest = Path(name)
            let src = pak.cachePath.join(name)
            let obj = dest.exists ? dest.readJSON() : {}
            blend(obj, src.readJSON(), {combine: true})
            dest.write(serialize(obj, {pretty: true, indent: 4}) + '\n')
        }
        if (topDeps[pak.name]) {
            if (optional(pak.name)) {
                spec.optionalDependencies ||= {}
                spec.optionalDependencies[pak.name] ||= '~' + pak.cachelVersion.compatible
                Object.sortProperties(spec.optionalDependencies)
            } else {
                if (!options.nodeps) {
                    spec.dependencies ||= {}
                    spec.dependencies[pak.name] ||= '~' + pak.cacheVersion.compatible
                    Object.sortProperties(spec.dependencies)
                }
            }
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

        /* Get updated dependency information in spec */
        pak.resolve()

        let installDeps = !options.nodeps
        if (PACKAGE.exists) {
            if (getAppSetting(pak, 'nodeps')) {
                installDeps = false
            }
            if (options.nodeps) {
                installDeps = false
            }
        }
        if (!pak.cached) {
            cachePak(pak)
            pak.resolve()
        }
        if (installDeps) {
            installDependencies(pak)
        }
        blendPak(pak)

        if (pak.cache.install === false) {
            /*
                Pak prefers to execute from cache. Don't install locally unless "force" and not "upgrade"
             */
            if (!state.force || state.upgrade) {
                trace('Cached', pak + ' ' + pak.cacheVersion)
            }
            return
        }
        qtrace(state.reinstall ? 'Reinstall': 'Install', pak.name, pak.cacheVersion)
        let dest = pak.installPath
        vtrace('Info', 'Installing "' + pak.name + '" from "' + pak.cachePath)
        if (dest.exists) {
            vtrace('Rmdir', dest)
            removeDir(dest, true)
        }
        if (!dest.exists) {
            vtrace('Mkdir', dest)
            mkdir(dest)
        }
        let ignore = pak.cache.ignore || []
        if (!(ignore is Array)) {
            ignore = [ignore]
        }
        let export = pak.cache.export
        if (export) {
            if (!(export is Array)) {
                export = [export]
            }
            if (PACKAGE.exists) {
                if (spec.paks) {
                    trace('Warn', 'Using deprecated "paks" property, use "app" instead')
                    spec.app ||= {}
                    blend(spec.app, spec.paks)
                    delete spec.paks
                }
                /*
                    Optionally override export with local app.NAME.export
                 */
                if (spec.app) {
                    let pspec = spec.app[pak.name]
                    if (spec.app['*']) {
                        pspec = blend(spec.app['*'].clone(true), pspec)
                    }
                    if (pspec) {
                        if (pspec.export) {
                            export = pspec.export
                        }
                        if (pspec.ignore) {
                            if (!(pspec.ignore is Array)) {
                                pspec.ignore = [pspec.ignore]
                            }
                            ignore += pspec.ignore
                        }
                    }
                }
            }
        }
        copyTree(pak, pak.cachePath, dest, ignore, pak.cache.files, export)
        vtrace('Info', pak + ' ' + pak.cacheVersion + ' successfully installed')
        vtrace('Info', 'Use "pak info ' + pak.name + '" to view the README')
    }

    private function installDependencies(pak: Package) {
        for (let [other, criteria] in pak.cache.dependencies) {
            installDependency(other, criteria, true)
        }
        if (options.all) {
            for (let [other, criteria] in pak.cache.optionalDependencies) {
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
        if (install && ((!dep.installed && dep.cache && dep.cache.install !== false) || state.force)) {
            vtrace('Info', 'Install required dependency ' + dep.name)
            try {
                installPak(dep)
            } catch (e) {
                print(e)
                if (state.force) {
                    qtrace('WARN', 'Cannot install required dependency "' + dep.name + '"' )
                } else {
                    throw 'Cannot install ' + pak.name + ' because of missing required dependency "' + dep.name + '"' 
                }
            }
        } else {
            vtrace('Info', 'dependency "' + dep.name + '" is installed')
        }
    }

    function getPaks(result, patterns, pak) {
        for (let [name, requiredVersion] in pak.dependencies) {
            if (!result[name]) {
                let dep = Package(directories.paks.join(name))
                dep.resolve(requiredVersion)
                if (matchPakName(name, patterns)) {
                    result[name] = dep
                }
                if (!dep.install && !dep.cache) {
                    throw 'Cannot find pak "' + dep.name + '" referenced by "' + pak.name + '"'
                }
                getPaks(result, patterns, dep.install || dep.cache)
            }
        }
        return result
    }

    /*
        Show list of locally installed paks
            --versions     # Show versions appended to each pak
            --details      # List pak details
     */
    function list(patterns: Array): Void {
        let sets = getPaks({}, patterns, spec)
        for each (pak in sets) {
            spec.optionalDependencies ||= {}
            let opt = optional(pak.name) ? ' optional' : ''
            let cached = !pak.installVersion && pak.cacheVersion ? ' cached' : ''
            let installed = pak.installVersion ? ' installed' : ''
            let uninstalled = pak.installVersion || pak.cache.install === false ? '' : ' uninstalled'
            let frozen = (pak.install && pak.install.frozen) ? ' frozen' : ''
            out.write(pak.name)
            let version = pak.installVersion || pak.cacheVersion
            if (!spec.dependencies[pak.name] && !optional(pak.name)) {
                out.write(' ')
                print(version + cached + uninstalled + installed + opt + frozen)
            } else if (options.details && pak.install) {
                out.write(' ')
                print(serialize(pak.install, {pretty: true, indent: 4}))
            } else if (options.versions) {
                print(' ' + version + cached + uninstalled + installed + opt + frozen)
            } else {
                print()
            }
        }
    }

    /*
        Lockdown the dependency versions. This moves all optional dependencies that are installed into
        dependencies and assigns a compatible version expression.
     */
    function lockdown(): Void {
        let deps = blend({}, spec.dependencies)
        blend(deps, spec.optionalDependencies)
        for (let [name,criteria] in deps) {
            let pak = Package(name)
            pak.resolve(criteria)
            if (pak.installed) {
                trace('Lockdown', pak.name + ' to ' + pak.installVersion.compatible + 
                    ' (was ' + spec.dependencies[pak.name] + ')')
                spec.dependencies[pak.name] = '~' + pak.installVersion.compatible
                delete spec.optionalDependencies[pak.name]
            } else {
                trace('Info', pak.name + ' is not installed')
            }
        }
        let path = Package.getSpecFile('.')
        path.write(serialize(spec, {pretty: true, indent: 4}) + '\n')
    }

    function mode(newMode, meta) {
        if (newMode.length == 0) {
            print(spec.mode)
        } else {
            setValue('mode', newMode[0])
            trace('Set', 'Mode to "' + spec.mode + '"')
        }
    }

    /*
        []      Prune old versions that are not being used. Keep the most recent version.
        --all   Prune all versions that are not being used.
        --force Prune regardless of whether other dependencies require the pak.
     */
    function prune(pak: Package) {
        pak.resolve()
        var latest = Version.sort(directories.pakcache.join(pak.name).files('*'), -1)[0]
        if (!latest) {
            throw 'Nothing to prune for "' + pak + '"'
        }
        if (pak.cache && pak.cache.precious && !state.force) {
            qtrace('Warn', 'Cannot prune "' + pak + '" designated as precious. Use --force to force pruning.')
            return
        }
        if (pak.cachePath == latest && !options.all) {
            qtrace('Info', 'Preserve latest version for ' + pak + ' ' + pak.cacheVersion)
            qtrace('Info', 'Use --all to prune all versions')
            return
        }
        if ((users = requiredCachedPak(pak)) != null) {
            if (!state.force) {
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
        let preserve = ['directories', 'catalogs']
        for (let [key,value] in obj) {
            if (!preserve.contains(key)) {
                delete obj[key]
            }
        }
        delete obj.directories.cache
        print('Pak configuration: ' + serialize(obj, {pretty: true, quotes: false}))
    }

    /*
        Update cached packs
     */
    function update(pak: Package? = null): Package {
        pak.resolve(pak.searchCriteria || '*')
        trace('Search', 'Latest version of ' + pak)
        let later = searchPak(pak)
        if (pak.cacheVersion && pak.cacheVersion.same(later.cacheVersion) && !state.force) {
            trace('Info', pak + ' is current with ' + pak.cacheVersion + ' for requirement ')
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
        if (pak.installed && pak.installVersion && pak.installVersion.same(later.cacheVersion)) {
            if (!state.force) {
                vtrace('Info', 'Installed ' + pak + ' is current with ' + pak.installVersion + 
                    ' for version requirement ' + pak.searchCriteria)
                return
            }
        } else {
            if (pak.cache.install !== false) {
                qtrace('Upgrade', pak + ' to ' + later.cacheVersion)
            }
        }
        if (state.force && pak.installVersion && pak.installVersion.same(pak.cacheVersion)) {
            state.reinstall = true
        }
        if (pak.install && pak.install.frozen) {
            trace('Info', 'Installed ' + pak + ' ' + pak.installVersion + ' is frozen')
            return
        }
        later.resolve(later.cacheVersion)
        runScripts(pak, 'preupgrade')
        state.upgrade = true
        install(later)
        delete state.upgrade
    }

    private function cacheDependencies(pak: Package): Boolean {
        let pspec = pak.cache
        if (!pspec.dependencies) {
            return false
        }
        for (let [other, criteria] in pspec.dependencies) {
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
                        print(e)
                        if (state.force) {
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

    function copyTree(pak, fromDir: Path, toDir: Path, ignore, files, exportList: Array?) {
        if (files && !(files is Array)) {
            files = [files]
        }
        if (!files || files.length == 0) {
            files = ['**']
        } else {
            files += ['package.json', 'README.md', 'LICENSE.md']
        }
        if (ignore && !(ignore is Array)) {
            ignore = [ignore]
        }
        for each (item in ignore) {
            files.push('!' + item)
        }
        var export = {}
        for each (pat in exportList) {
            if (pat is String) {
                pat = { from: [pat], to: Path(pak.name), overwrite: true}
            } else {
                if (!(pat.from is Array)) {
                    pat.from = [pat.from]
                }
                if (pat.overwrite == undefined) {
                    pat.overwrite = true
                }
            }
            let dir = Path(directories.exports || directories.source.join(directories.lib))
            let to = dir.join(pat.to.expand(dirTokens, {fill: '.'}))
            if (!to.childOf('.')) {
                throw 'Copy destination "' + to + '" for pak "' + pak.name + '" is outside current directory'
            }
            for each (f in fromDir.files(pat.from)) {
                export[f] = { overwrite: pat.overwrite, to: to }
            }
        }
        fromDir.operate(files, toDir, {
            flatten: false,
            prePerform: function(from, to, options) {
                if (!to.exists || state.force) {
                    vtrace('Copy', to)
                } else {
                    vtrace('Exists', to)
                }
            },
            postPerform: function(from, to, options) {
                if (export[from]) {
                    let base: Path = export[from].to
                    let to = base.join(from.relativeTo(fromDir)).relative
                    if (from.isDir) {
                        global.pak.makeDir(to)
                    } else {
                        if (!to.exists || export[from].overwrite) {
                            global.pak.makeDir(to.dirname)
                            if (to.exists) {
                                vtrace('Overwrite', to)
                            } else {
                                vtrace('Export', to)
                            }
                            from.copy(to)
                        } else {
                            vtrace('Exists', to)
                        }
                    }
                }
            }
        })
    }

    private function fetchPak(pak: Package) {
        let http = new Http
        let current = App.dir
        let tempName = Path('').temp()
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
            postcache
            install
            uninstall
            preupdate
            preupgrade
     */
    private function runScripts(pak: Package, event: String) {
        if (!pak.cache) {
            return
        }
        try {
            let results
            if (pak.cache && pak.cache.scripts) {
                let scripts = pak.cache.scripts[event]
                if (!(scripts is Array)) {
                    scripts = [scripts]
                }
                for each (script in scripts) {
                    if (script.script) {
                        eval(script.script)

                    } else if (script.path) {
                        let path = pak.cachePath.join(script.path)
                        if (!path.exists) {
                            throw 'Cannot find ' + path
                        }
                        if (path.extension == 'es') {
                            vtrace('Run', 'ejs', path)
                            load(path)
                        } else if (path.extension == 'me') {
                            vtrace('Run', 'me -q --file', path)
                            results = Cmd.run('me -q --file ' + path)
                        } else {
                            vtrace('Run', 'bash', path)
                            results = Cmd.run('bash ' + path)
                        }
                    } else if (script is String) {
                        vtrace('Run', script)
                        results = Cmd.run(script)
                    }
                }
            } else if (pak.cachePath) {
                path = pak.cachePath.join('start.me')
                if (path.exists) {
                    vtrace('Run', 'me -q --file ' + path + ' ' + event)
                    results = Cmd.run('me -q --file ' + path + ' ' + event)
                }
            }
            if (results) {
                vtrace('Output', results)
            }
        } catch (e) {
            throw 'Cannot run installion script "' + event + '" for ' + pak + '\n' + e
        }
    }

    private function copyPak(pak: Package) {
        vtrace('Info', 'Caching "' + pak.name + '" from "' + pak.sourcePath.relative + '" to "' + pak.cachePath + '"')
        copyTree(pak, pak.sourcePath, pak.cachePath, pak.source.ignore, pak.source.files)
    }

    private function cachePak(pak: Package) {
        trace('Cache', pak)
        let dest = pak.cachePath
        if (dest.exists) {
            vtrace('Rmdir', dest)
            removeDir(dest, true)
        }
        if (!dest.exists) {
            trace('Mkdir', dest)
            mkdir(dest)
        }
        try {
            if (!pak.sourcePath) {
                fetchPak(pak)
            } else if (pak.sourcePath.isDir) {
                copyPak(pak)
            } else {
                throw 'Cannot find pak ' + pak.name + ' to install'
            }
            if (!Package.getSpecFile(pak.cachePath)) {
                throw 'Cannot find package description for ' + pak + ' from ' + pak.cachePath
            }
            pak.resolve()
            if (!pak.sourcePath || options.all) {
                cacheDependencies(pak)
            }
            runScripts(pak, 'postcache')
            qtrace('Info', pak + ' ' + pak.cacheVersion + ' successfully cached')
        }
        catch (e) {
            dest.removeAll()
            throw e
        }
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
        let version = pak.installVersion || pak.cacheVersion
        pak.setCacheVersion(version)
        pak.resolve()
        if (options.all || level == 0) {
            for (let [name,criteria] in pak.cache.dependencies) {
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
        pak.setCacheVersion(version)
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
        http.setHeader('Content-Type', 'application/json')
        try {
            qtrace('Publish', pak.name + ' ' + pak.cacheVersion + ' at ' + uri)
            // FUTURE http.verifyIssuer = false
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
        http.setHeader('Content-Type', 'application/json')
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
        if (!state.force) {
            if (users = requiredInstalledPak(pak)) {
                throw 'Cannot remove "' + pak + '". It is required by: ' + users.join(', ') + '.'
            }
        }
        pak.resolve(pak.installVersion)
        runScripts(pak, 'uninstall')

        delete spec.dependencies[pak.name]
        delete spec.optionalDependencies[pak.name]

        if (spec.app) {
            delete spec.app[pak.name]
        }
        let path = Package.getSpecFile('.')
        path.write(serialize(spec, {pretty: true, indent: 4}) + '\n')
        removeDir(pak.installPath, true)
        qtrace('Remove', pak.name)
    }

    private function requiredCachedPak(pak: Package): Array? {
        let users = []
        for each (path in directories.pakcache.files('*/*')) {
            let name = path.dirname.basename.toString()
            if (name != pak.name) {
                let pspec = Package.readSpec(path, {quiet: true})
                if (pspec && pspec.dependencies) {
                    for (let [dname, criteria] in pspec.dependencies) {
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
        for each (path in ls(directories.paks, true)) {
            let name = path.basename.toString()
            if (name != pak.name) {
                let pspec = Package.readSpec(path, {quiet: true})
                if (pspec && pspec.dependencies) {
                    for (let [other, criteria] in pspec.dependencies) {
                        if (other == pak.name && pak.installVersion && pak.installVersion.acceptable(criteria)) {
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
        for each (v in Version.sort(versions, -1)) {
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
            if (state.force) {
                trace('Warn', 'Suitable release version not found for ' + pak.name + ' ' + criteria)
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
        Pak specifies a name and optional version 
     */
    private function searchPaks(pak: Package, exactName: Boolean = false): Array {
        /* Test if pak path is a github endpoint */
        if (pak.setRemoteEndpoint(pak.path)) {
            let criteria = pak.searchCriteria || (options.all ? '*' : '^*')
            try {
                selectRemoteVersion(pak, criteria, pak.path)
                return [pak]
            } catch {}
        }
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
                if (App.config.requirePrimaryCatalog && !state.force) {
                    throw 'Cannot continue with offline primary catalog ' + catalog + '\n' + 'Wait or retry with --force'
                }
            }
            try {
                let index = {}
                let data
                try {
                    data = deserialize(http.response)
                } catch {
                    trace('Skip', 'Bad response from catalog: ' + catalog + '\n' + http.response)
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

    private function searchPak(pak: Package, exact: Boolean = true): Package
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
        let pspec = pak.source
        let name = pspec.name
        if (!name || !name.match(/^[\w_-]+$/)) {
            throw 'Invalid package name: ' + name
        }
        if (!HOME.join('.embedthis')) {
            if (name.startsWith('ejs-') ||name.startsWith('esp-') || name.startsWith('bit-') ||
                name.startsWith('appweb-') || name.startsWith('pak-') || name.startsWith('me-')) {
                throw 'Reserved pak name ' + name
            }
        }
        if (pspec.name.start)
        if (!pspec.description) {
            throw 'Invalid package name: ' + pspec.description
        }
        if (!pspec.version || !Version(pspec.version).valid) {
            throw 'Invalid package version: ' + pspec.version
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
                throw 'Pak "' + pat + '" is not installed'
            }
        }
    }

    function uninstall(patterns): Void {
        let list = []
        let sets = getPaks({}, patterns, spec)
        for each (pak in sets) {
            pak.setInstallPath()
            if (matchPakName(pak.name, patterns)) {
                list.push(pak)
                if (!pak.installed && !pak.cached && !state.force) {
                    throw 'Pak "' + pak + '" is not installed'
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
        let obj = path.readJSON()
        blend(App.config, obj)
        if (obj.catalogs) {
            catalogs = obj.catalogs
        }
        return true
    }

    /*
        Search order: pakrc : .pakrc : ../.../[pakrc|.pakrc] : package.json (for directories only)
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
        //  UNUSED for ( ; d.parent != d; d = d.parent) {
            let f = Package.getSpecFile(d)
            if (f) {
                let pspec = f.readJSON()
                vtrace('Read', 'Configuration from: ' + f)
                for (let [field, value] in pspec.directories) {
                    directories[field] = f.dirname.join(value)
                }
                if (pspec.catalogs) {
                    catalogs = pspec.catalogs
                }
                // UNUSED break
            }
        // UNUSED }
        if (options.paks) {
            directories.paks = Path(options.paks)
        }
        if (options.cache) {
            directories.pakcache = Path(options.cache)
        }
        for (let [field, value] in directories) {
            directories[field] = Path(value).replace('~', HOME)
        }
        dirTokens = {}
        for (let [name,path] in directories) {
            dirTokens[name.toUpperCase()] = (name == 'lib') ? path : path.absolute
        }
    }

    public function makeDir(path: String): Void
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

    function error(msg) App.log.error(msg)

    let aname = App.dir.basename.toString()

    private var PakTemplate = {
        name: aname.toLowerCase()
        title: aname.toPascal() + ' Application',
        description: aname.toPascal() + ' Application',
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
        license: 'GPL',
        dependencies: {},
    }

    private function getAppSetting(pak, property) {
        let app = spec.app
        let result = ((app && app[pak.name] && app[pak.name][property] === true) || 
                     (app && app['*'] && app['*'][property] === true))
        return result
    }

    private function optional(obj, name)
        spec.optionalDependencies ? spec.optionalDependencies[name] : null
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

public function run(command, copt = {}): String {
    trace('Run', command)
    return Cmd.run(command, copt)
}

public var pak = new Pak
pak.main()

} /* ejs.pak module */


/*
    @copy   default

    Copyright (c) Embedthis Software. All Rights Reserved.

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
