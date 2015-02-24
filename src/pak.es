#!/usr/bin/env ejs

/*
    pak.es -- Embedthis Pak Manager

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

var catalogs: Object?
var directories: Object
var dirTokens: Object
var files: Object
var options: Object
var spec: Object
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
        catalogs: {
            pak: {
                list: 'http://embedthis.com/catalog/do/pak/search',
                query: 'http://embedthis.com/catalog/do/pak/search?keywords=${NAME}',
                download: 'https://github.com/${OWNER}/${NAME}/archive/${TAG}.tar.gz',
            },
            bower: {
                list: 'http://bower.herokuapp.com/packages',
                query: 'http://bower.herokuapp.com/packages/${NAME}',
                download: 'https://github.com/${OWNER}/${NAME}/archive/${TAG}.tar.gz',
            },
            npm: {
                __list: 'http://registry.npmjs.org/-/all?stale=update_after&startkey=1386393773409',
                query: 'http://registry.npmjs.org/${NAME}',
                download: 'http://registry.npmjs.org/${NAME}/-/${NAME}-${TAG}.tgz',
            }
        },
        directories: {
            /* exports */
            files: 'files',
            lib: (!Path('lib').exists && Path('src').exists) ? 'src' : 'lib'
            paks: 'paks',
            pakcache: '~/.paks',
            top: '.',
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
        optionalDependencies: {},
        pak: {
            import: true,
            mode: 'debug',
        },
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
            '    info paks...             # Display README for cached paks\n' +
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
            '    uninstall paks...        # Uninstall a pak on the local system\n' +
            '    update [paks...]         # Update the cache with latest version\n' +
            '    upgrade [paks...]        # Upgrade installed paks\n\n' +
            '  General options:\n' +
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
        spec.pak ||= {}
        spec.dependencies ||= {}
        spec.optionalDependencies ||= {}

        if (spec.pak.version && !Version(Config.Version).acceptable(spec.pak.version)) {
            throw '' + spec.title + ' requires Pak ' + spec.pak.version + '. Pak version ' + Config.Version +
                            ' is not compatible with this requirement.' + '\n'
        }
        if (spec.pak.mode && spec.pak.modes && spec.pak.modes[spec.pak.mode]) {
            blend(spec, spec.pak.modes[spec.pak.mode], {combine: true})
        }
        if (spec.pak is String) {
            trace('Warn', 'Using deprecated "pak" property as a version string. Use "pak.version" instead.')
            let version = spec.pak
            spec.pak = { version: version }
        }
        for each (name in ['app', 'blend', 'combine', 'export', 'frozen', 'import', 'install', 'mode', 'modes',
                'origin', 'paks', 'precious', 'render']) {
            if (spec[name] != null) {
                if (name == 'blend') {
                    trace('Warn', 'Using deprecated "blend" property. Use "pak.manage" instead.')
                    spec.pak.manage = spec.blend
                } else {
                    trace('Warn', 'Using deprecated "' + name + '" property. Use "pak.' + name + '" instead.')
                    spec.pak[name] = spec[name]
                }
                delete spec[name]
            }
        }
        state.force = options.force
    }

    function process() {
        let rest = args.rest
        let task = rest.shift()

        setup()

        switch (task) {
        case 'cache':
            cache(rest)
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
            info(rest)
            break

        case 'install':
            install(rest)
            break

       case 'license':
            license(rest)
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
            prune(rest)
            break

        case 'publish':
            publish(rest)
            break

        case 'retract':
        case 'unpublish':
            retract(rest)
            break

        case 'search':
            search(rest)
            break

        case 'uninstall':
            uninstall(rest)
            break

        case 'update':
            update(rest);
            break

        case 'upgrade':
            upgrade(rest)
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

    function cache(names: Array): Void {
        if (names.length == 0) {
            if (!PACKAGE.exists) {
                error('Nothing to install')
            } else {
                let pak = Package(spec.name)
                pak.setSource('.')
                cachePak(pak)
            }
        } else {
            for each (name in names) {
                if (Path(name).exists && Package.getSpecFile(name)) {
                    let pspec = Package.loadPackage(name)
                    if (!pspec.repository || !pspec.repository.url) {
                        throw 'Package.json is missing repository.url'
                    }
                    let pak = Package(pspec.repository.url)
                    pak.setSource(name)
                    cachePak(pak)
                } else {
                    let pak = Package(name)
                    locatePak(pak)
                    cachePak(pak)
                }
            }
        }
    }

    private function cacheDependencies(pak: Package): Boolean {
        let pspec = pak.cache
        if (!pspec.dependencies) {
            return false
        }
        for (let [other, criteria] in pspec.dependencies) {
            if (pak.catalog) {
                other = pak.catalog + ':' + other
            }
            let dep = Package(other, criteria)
            if (Path(dep.name).isDir) {
                dep.setSource(dep.name)
            }
            if (!dep.cached) {
                if (dep.sourcePath) {
                    trace('Info', 'Caching required dependency from source at: ' + dep.sourcePath)
                    cachePak(dep)
                } else {
                    try {
                        locatePak(dep)
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
                vtrace('Info', 'dependency "' + dep.name + '" for "' + pak.name + '" is cached')
            }
        }
        return true
    }

    private function cachePak(pak: Package) {
        if (pak.publish === false) {
            throw pak + ' cannot be published, has publish: false'
            return
        }
        if (pak.cached && !state.force) {
            vtrace('Info', pak + ' ' + pak.cacheVersion + ' is already cached')
            /* Ensure dependencies are present */
            if (!pak.sourcePath || options.all) {
                cacheDependencies(pak)
            }
            return
        }
        trace('Cache', pak.origin || pak.name, pak.cacheVersion)
        let dest = pak.cachePath
        if (!dest) {
            print("DEST NULL")
            dump(pak)
            throw new Error('boom')
        }
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
                vtrace('Info', 'Caching "' + pak.name + '" from "' + pak.sourcePath.relative + '" to "' +
                    pak.cachePath + '"')
                if (pak.source.files) {
                    pak.source.files = (pak.source.files + ['package.json', 'README.md', 'LICENSE.md']).unique()
                }
                copyTree(pak, pak.sourcePath, pak.cachePath, pak.source.ignore, pak.source.files)
            } else {
                throw 'Cannot find pak ' + pak.name + ' to install'
            }
            if (!Package.getSpecFile(pak.cachePath)) {
                throw 'Cannot find package description for ' + pak + ' from ' + pak.cachePath
            }
            pak.resolve()

            if (!pak.cache) {
                throw new Error('Missing cache for ', pak.name)
            }
            try {
                let http = new Http
                let cmd = 'https://raw.githubusercontent.com/embedthis/pak/dev/override/' + pak.name + '.json'
                http.verify = false
                http.get(cmd)
                if (http.status == 200) {
                    pak.override = deserialize(http.response)
                }
                //  MOB - temp
                let path = App.home.join('dev/pak/override/' + pak.name + '.json')
                if (path.exists) {
                    print("READ LOCAL OVERRIDE", pak.name)
                    pak.override = path.readJSON()
                }
                http.close()
            } catch (e) {
                 print("CATCH", e)
            }
            if (pak.origin) {
                if (pak.override) {
                    /* Apply global override downloaded from catalog */
                    let override = pak.override[pak.origin]
                    for (let [criteria, properties] in override) {
                        if (Version(pak.cacheVersion).acceptable(criteria)) {
                            vtrace('Apply', 'Pak overrides for ' + pak.name)
                            blend(pak.cache, properties, {combine: true})
                            pak.name = pak.cache.name
                            break
                        }
                    }
                }
                pak.cache.pak ||= {}
                pak.cache.pak.origin = pak.origin
                let path = pak.cachePath.join(PACKAGE)
                path.write(serialize(cleanSpec(pak.cache), {pretty: true, indent: 4}) + '\n')
                /*
                    Resolve after updating the package.json as it will be re-read
                 */
                pak.resolve()
            }
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

/* UNUSED
    function cacheName(name: String, dir: Path? = null) {
        let pak = Package(name)
        if (dir) {
            pak.setSource(dir)
            pak.setCacheVersion(pak.source.version)
        } else {
            locatePak(pak)
        }
        cachePak(pak)
    }
*/

    /*
        Show list of paks in the cache
            --all          # Independently list all versions of a module instead of just the most recent
            --versions     # Show versions appended to each pak
            --details      # List pak details
     */
    function cached(names: Array): Void {
        let sets = {}
        if (names.length == 0) {
            names = directories.pakcache.files('*', {relative:true}).sort()
        }
        for each (name in names) {
            /*
                Build list of qualifying paks from cached versions
             */
            let pak = Package(name)
            let pakset = sets[pak.origin] || {}
            sets[pak.origin] = pakset
            pakset[pak.cacheVersion] = pak
        }
        for each (pakset in sets) {
            versions = []
            for each (pak in pakset) {
                versions.append(pak.cacheVersion)
            }
            Version.sort(versions)
            let latest = versions[versions.length - 1]

            let pak = pakset[latest]
            let origin = pak.origin ? (' from ' + pak.origin) : ''
            if (options.all) {
                out.write(pak.name + ' ' + versions.join(', ') + origin)
            } else {
                out.write(pak.name + ' ' + pak.cacheVersion + origin)
            }
            if (options.details && pak.cache) {
                out.write(': ')
                print(serialize(pak.cache, {pretty: true, indent: 4}))
            }
            print()
        }
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

    function info(names: Array) {
        for each (name in names) {
            let criteria = (spec.dependencies && spec.dependencies[name]) || '*'
            let pak = Package(name, criteria)
            let path = (pak.installed) ? pak.installPath : pak.cachePath
            if (!path) {
                throw 'Pak "' + name + '" is not yet cached'
            }
            let readme = path.join('README.md')
            if (!readme.exists) {
                throw 'Pak is missing a README.md file'
            } else {
                print(readme.readString())
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
        Path(PACKAGE).write(serialize(cleanSpec(pspec), {pretty: true, indent: 4}))
    }

    private var blending = {}

    /*
        Blend dependencies bottom up so that lower paks can define directories and upper paks can override.
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

        if (!getPakSetting(pak, 'noblend')) {
            blendSpec(pak)
        }
        delete blending[pak.name]
    }

    private function blendSpec(pak: Package) {
        /*
            Apply pak overrides to the application package.json
         */
        if (pak.cache.pak.blend) {
            blend(spec, pak.cache.pak.blend, {combine: true})
        }

        /*
            Apply local overrides to the pak from application package.json
            Note: this should be rare
         */
        if (spec.pak.override) {
            if (spec.pak.override['*']) {
                vtrace('Apply', 'Local overrides for all paks')
                blend(pak.cache, spec.pak.override['*'], {combine: true})
                pak.dirty = true
            }
            if (spec.pak.override[pak.name]) {
                vtrace('Apply', 'Local overrides for ' + pak.name)
                blend(pak.cache, spec.pak.override[pak.name], {combine: true})
                pak.dirty = true
            }
        }

        for (let [k,v] in spec.directories) {
            spec.directories[k] = Path(v)
            directories[k] = Path(v)
        }
        if (pak.cache.pak.mode) {
            spec.pak.mode ||= pak.cache.pak.mode
        }
        /*
            Manage external json files (esp.json, expansive.json)
         */
        let manage = pak.cache.pak.manage
        if (manage && !(manage is Array)) {
            manage = [manage]
        }
        for each (let name in manage) {
            let dest = Path(name)
            let src = pak.cachePath.join(name)
            let obj = dest.exists ? dest.readJSON() : {}
            blend(obj, src.readJSON(), {combine: true})
            dest.write(serialize(cleanSpec(obj), {pretty: true, indent: 4}) + '\n')
        }
        /*
            Manage dependencies
         */
        if (topDeps[pak.name] || topDeps[pak.origin]) {
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

    function install(names: Array) {
        if (names.length == 0) {
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
                        installCommon(Package(name, version))
                    }
                }
            }
        } else {
            topDeps = {}
            for each (vname in names) {
                let [name,version] = vname.split('#')
                if (RegExp('^(npm:)|(pak:)|(bower:)').exec(name)) {
                    [, name] = name.split(':')
                }
                topDeps[name] = true
            }
            for each (vname in names) {
                let [name,version] = vname.split('#')
                if (!version && spec.dependencies && spec.dependencies[name]) {
                    version = spec.dependencies[name]
                }
                installCommon(Package(name, version))
            }
        }
    }

    /*
        Common code for install and upgrade
     */
    function installCommon(pak: Package) {
        if (pak.cached) {
            if (pak.installed && !state.force) {
                if (pak.installVersion.same(pak.cacheVersion)) {
                    qtrace('Info', pak + ' is already installed')
                    return
                }
                if (state.upgrade) {
                    if (Version(pak.cache.version).acceptable('>' + pak.installVersion)) {
                        vtrace('Info', 'Upgrading ' + pak.name + ' from ' + pak.installVersion +
                                       ' to ' + pak.cache.version)
                    } else {
                        qtrace('Info', pak.name + ' ' + pak.installVersion +
                               ' is the most recent available in the Pak cache')
                        return
                    }
                } else {
                    if (pak.installVersion.acceptable(pak.versionCriteria)) {
                        qtrace('Info', pak + ' is already installed')
                        return
                    }
                }
            }
        }
        if (/* UNUSED state.upgrade || */ !pak.cache || !Version(pak.cache.version).acceptable(pak.versionCriteria)) {
            locatePak(pak)
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
            path.write(serialize(cleanSpec(spec), {pretty: true, indent: 4}) + '\n')
        }
        runScripts(pak, 'install')
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
        let installDeps = !options.nodeps
        if (PACKAGE.exists) {
            if (getPakSetting(pak, 'nodeps')) {
                installDeps = false
            }
            if (options.nodeps) {
                installDeps = false
            }
        }
        if (!pak.cached) {
            locatePak(pak)
            cachePak(pak)
        }
        if (installDeps) {
            installDependencies(pak)
        }
        blendPak(pak)

        if (pak.cache.pak.install === false) {
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
        let export = pak.cache.pak.export || []
        if (!(export is Array)) {
            export = [export]
        }
        let from = pak.cachePath
        let files = pak.cache.files || []
        if (!(files is Array)) {
            files = [files]
        }
        if (spec.pak.import && getPakSetting(pak, 'noimport') !== true) {
            let needExports = (export.length == 0)
            let needFiles = (files.length == 0)
            for each (dir in ['dist', 'lib']) {
                let path = pak.cachePath.join(dir)
                if (path.exists) {
                    if (needFiles) {
                        files.push('dist/**')
                    }
                    if (needExports) {
                        export.push({ from: 'dist/', trim: 1 })
                    }
                    break
                }
            }
        } else {
            export = []
        }
        if (files && !(files is Array)) {
            files = [files]
        }
        if (!files || files.length == 0) {
            files = ['**']
        } else {
            files = (files + ['package.json']).unique()
        }
        copyTree(pak, from, dest, ignore, files, export || [])
        vtrace('Info', pak + ' ' + pak.cacheVersion + ' successfully installed')
        vtrace('Info', 'Use "pak info ' + pak.name + '" to view the README')

        /*
            Rewrite the installed pak's package.json if there are local overrides
         */
        let override = spec.pak.override
        if (pak.dirty && override && (override['*'] || override[pak.name])) {
            let path = pak.installPath.join(PACKAGE)
            path.write(serialize(cleanSpec(pak.cache), {pretty: true, indent: 4}) + '\n')
            vtrace('Save', path + ' with local overrides')
        }
    }

    private function installDependencies(pak: Package) {
        for (let [other, criteria] in pak.cache.dependencies) {
            installDependency(other, criteria)
        }
        if (options.all) {
            for (let [other, criteria] in pak.cache.optionalDependencies) {
                installDependency(other, criteria)
            }
        }
    }

    private function installDependency(name, criteria) {
        if (installed[name]) {
            return
        }
        let dep = Package(name, criteria)
        if (!dep.installed || state.force) {
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

    function license(names: Array) {
        for each (name in names) {
            let pak = Package(name, spec.dependencies[name])
            if (!pak.cached) {
                locatePak(pak)
            }
            if (pak && pak.cachePath.join('LICENSE.md')) {
                let license = pak.cachePath.join('LICENSE.md')
                print("LICENSE", license)
                if (!license.exists) {
                    let files = pak.cachePath.files('*LICENSE*')
                    if (files.length == 0) {
                        throw 'Pak is missing a LICENSE.md file'
                    }
                    license = files[0]
                }
                print(license.readString())
            }
        }
    }

    /*
        Show list of locally installed paks
            --versions     # Show versions appended to each pak
            --details      # List pak details
     */
    function list(patterns: Array): Void {
        let sets = getPaks({}, patterns, spec)
        Object.sortProperties(sets)
        for each (pak in sets) {
            spec.optionalDependencies ||= {}
            let opt = optional(pak.name) ? ' optional' : ''
            let cached = !pak.installVersion && pak.cacheVersion ? ' cached' : ''
            let installed = pak.installVersion ? ' installed' : ''
            let uninstalled = pak.installVersion || pak.cache.pak.install === false ? '' : ' uninstalled'
            let from = ''
            if (pak.install && pak.install.pak.origin) {
                from = ' from ' + pak.install.pak.origin
            } else if (pak.cache && pak.cache.pak.origin) {
                from = ' from ' + pak.cache.pak.origin
            }
            let frozen = (pak.install && pak.install.pak.frozen) ? ' frozen' : ''
            out.write(pak.name)
            let version = pak.installVersion || pak.cacheVersion
            if (!spec.dependencies[pak.name] && !optional(pak.name) && options.versions) {
                print(' ' + version + cached + uninstalled + installed + from + opt + frozen)
            } else if (options.details && pak.install) {
                out.write(' ')
                print(serialize(pak.install, {pretty: true, indent: 4}))
            } else if (options.versions) {
                print(' ' + version + cached + uninstalled + installed + from + opt + frozen)
            } else {
                print('')
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
            let pak = Package(name, criteria)
            if (pak.installed) {
                trace('Lockdown', pak.name + ' to ^' + pak.installVersion.compatible +
                    ' (was ' + deps[pak.name] + ')')
                spec.dependencies[pak.name] = '^' + pak.installVersion.compatible
                delete spec.optionalDependencies[pak.name]
            } else {
                trace('Info', pak.name + ' is not installed')
            }
        }
        let path = Package.getSpecFile('.')
        path.write(serialize(cleanSpec(spec), {pretty: true, indent: 4}) + '\n')
    }

    function mode(newMode, meta) {
        if (newMode.length == 0) {
            print(spec.pak.mode)
        } else {
            setValue('pak.mode', newMode[0])
            trace('Set', 'Mode to "' + spec.pak.mode + '"')
        }
    }

    function prune(names: Array) {
        if (names.length == 0) {
            names = directories.pakcache.files('*/*/*')
        }
        for each (path in names) {
            prunePak(Package(path))
        }
        if (names.length == 0) {
            qtrace('Info', 'Nothing to prune')
        }
    }

    /*
        []      Prune old versions. Keep the most recent version.
        --all   Prune all versions that are not being used.
        --force Prune regardless of whether other dependencies require the pak.
     */
    function prunePak(pak: Package) {
        var latest = Version.sort(directories.pakcache.join(pak.name).files('*/*'), -1)[0]
        if (!latest) {
            throw 'Nothing to prune for "' + pak + '"'
        }
        if (pak.cache && pak.cache.pak.precious && !state.force) {
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
        /* Remove parent only if empty */
        removeDir(pak.cachePath.dirname, false)
        qtrace('Info', pak + ' successfully pruned')
    }

    function search(args: Array) {
        for each (ref in args) {
            let indent = ''
            if (options.verbose || options.versions) {
                indent += '    '
            }
            for each (match in searchCatalogs(ref)) {
                let cached = match.cached ? 'cached' : ''
                if (options.versions) {
                    print(indent + match.name + ' ' + match.cacheVersion + ' ' + match.endpoint + ' ' + cached)
                    print(indent + '  versions:')
                    for each (v in match.versions) {
                        print(indent + indent + v)
                    }
                } else {
                    print(indent + match.name + ' ' + match.cacheVersion + ' ' + match.endpoint + ' ' + cached)
                }
            }
        }
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
        pak publish <CR>
        pak publish name URI [password]
     */
    function publish(args): Void {
        let uri = catalogs[0]
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
        let uri = catalogs[0]
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
        runScripts(pak, 'uninstall')

        delete spec.dependencies[pak.name]
        delete spec.optionalDependencies[pak.name]

        if (spec.override) {
            delete spec.override[pak.name]
        }
        let path = Package.getSpecFile('.')
        path.write(serialize(cleanSpec(spec), {pretty: true, indent: 4}) + '\n')
        removeDir(pak.installPath, true)
        qtrace('Uninstall', pak.name)
    }

    function uninstall(patterns): Void {
        let list = []
        let sets = getInstalledPaks({}, patterns, spec)
        for each (pak in sets) {
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

    function update(names: Array) {
        if (names.length == 0) {
            names = directories.pakcache.files('*/*/*')
        }
        for each (path in names) {
            updatePak(Package(path))
        }
    }

    /*
        Update cached packs
     */
    function updatePak(pak: Package) {
        let current = pak.cacheVersion
        locatePak(pak)
        if (current && current.same(pak.cacheVersion) && !state.force) {
            trace('Info', 'Cached ' + pak.name + ' is current with ' + pak.cacheVersion +
                          ' for version requirement ' + pak.versionCriteria)
            return pak
        }
        trace('Update', pak + ' to ' + pak.cacheVersion)
        runScripts(pak, 'preupdate')
        cachePak(pak)
        return pak
    }

    function upgrade(names: Array) {
        if (!PACKAGE.exists || !spec) {
            error('Cannot read package.json')
        }
        if (names.length == 0) {
            let deps = blend({}, spec.dependencies)
            blend(deps, spec.optionalDependencies)
            topDeps = deps
            for (let [name,criteria] in deps) {
                let pak = Package(name, criteria)
                if (pak.installed || !optional(pak.name)) {
                    upgradePak(pak)
                }
            }
        } else {
            topDeps = {}
            for each (name in names) {
                topDeps[name] = true
            }
            for each (name in names) {
                let criteria = spec.dependencies[name] || optional(name)
                upgradePak(Package(name, criteria))
            }
        }
    }

    /*
        Upgrade installed packs with latest version from the cache
     */
    function upgradePak(pak: Package? = null) {
        let current = pak.installVersion
        if (!pak.cached) {
            vtrace('Info', 'Pak "' + pak.name + '" not present in cache. Updating cache first.')
            updatePak(pak)
        }
        if (current && current.same(pak.cacheVersion) && !state.force) {
            trace('Info', 'Installed ' + pak + ' is current with ' + pak.installVersion +
                ' for version requirement ' + pak.versionCriteria)
            return
        }
        if (state.force && pak.installVersion && pak.installVersion.same(pak.cacheVersion)) {
            state.reinstall = true
        }
        if (pak.install && pak.install.pak.frozen) {
            trace('Info', 'Installed ' + pak + ' ' + pak.installVersion + ' is frozen')
            return
        }
        runScripts(pak, 'preupgrade')
        state.upgrade = true
        installCommon(pak)
        delete state.upgrade
    }

    function copyTree(pak, fromDir: Path, toDir: Path, ignore, files, exportList: Array?) {
        if (files && !(files is Array)) {
            files = [files]
        }
        if (!files || files.length == 0) {
            files = ['**']
        } else {
            files = (files + ['package.json', 'README.md', 'LICENSE.md']).unique()
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
                    pat.from = [pat.from || '**'] + [ '!package.json', '!*.md']
                }
                pat.to ||= Path(pak.name)
                if (pat.overwrite == undefined) {
                    pat.overwrite = true
                }
            }
            let dir = Path(directories.export || directories.lib)
            let to = dir.join(pat.to.toString().expand(dirTokens, {fill: '.'}))
            if (!to.childOf('.')) {
                throw 'Copy destination "' + to + '" for pak "' + pak.name + '" is outside current directory'
            }
            for each (f in fromDir.files(pat.from)) {
                export[f] = { overwrite: pat.overwrite, to: to, trim: pat.trim }
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
                    let path = from.relativeTo(fromDir)
                    if (export[from].trim) {
                        path = path.components.slice(export[from].trim).join(path.separator)
                    }
                    let to = base.join(path).relative
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
            trace('Get', pak.download)
            http.get(pak.download)
            let file = File(tgzName, 'w')
            let buf = new ByteArray
            while (http.read(buf) > 0) {
                let wrote = file.write(buf)
            }
            file.close()
            if (http.status != 200) {
                throw 'Cannot download ' + pak.download + ' status ' + http.status
            }
            http.close()
            vtrace('Save', 'Response to ' + tgzName.absolute)
            Zlib.uncompress(tgzName, tarName)
            let tar = new Tar(tarName.absolute)
            chdir(dest.parent)
            trace('Extract', 'Extract to ' + dest)
            //  Better to strip first part of file name and extract into the right place first time
            //  Tar options strip: 1
            tar.extract()
            removeDir(dest, true)
            let from
            if (pak.catalog == 'npm') {
                from = dest.parent.join('package')
            } else {
                from = dest.parent.join(pak.repository + '-' + pak.cacheVersion)
            }
            from.rename(dest)

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
            /* Ignore version component */
            pat = pat.split('#')[0]
            /* UNUSED
            if (!(pat is RegExp)) pat = RegExp(pat)
            if (name.match(pat))
            */
            if (name == pat) {
                return true
            }
        }
        return false
    }

    private function getDeps(pak: Package, deps = {}, level: Number = 0) {
        if (options.all || level == 0) {
            for (let [name,criteria] in pak.install.dependencies) {
                let dep = Package(name, criteria)
                getDeps(dep, deps, level + 1)
            }
        }
        if (level > 0) {
            deps[pak.name] = pak
        }
        return deps
    }

    private function printDeps(pak: Package, prefix: String = '') {
        print('\n' + pak.name + ' ' + pak.installVersion + ' dependencies:')
        let deps = getDeps(pak)
        if (Object.getOwnPropertyCount(deps) == 0) {
            print('    none')
        }
        for (let [name, dep] in deps) {
            out.write(prefix)
            out.write('    ' + dep.name + ' ' + dep.installVersion + '\n')
        }
    }


    private function requiredCachedPak(pak: Package): Array? {
        let users = []
        for each (path in directories.pakcache.files('*/*/*')) {
            let name = path.dirname.basename.toString()
            if (name != pak.name) {
                let pspec = Package.loadPackage(path, {quiet: true})
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
        for each (path in ls(directories.paks, true)) {
            let name = path.basename.toString()
            if (name != pak.name) {
                let pspec = Package.loadPackage(path, {quiet: true})
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

    private function selectVersion(pak: Package, criteria: String): Boolean {
        let versions = pak.versions
        pak.versions = []
        if (pak.catalog != 'npm') {
            trace('Run', [git, 'ls-remote', '--tags', pak.endpoint].join(' '))
            let data = Cmd.run([git, 'ls-remote', '--tags', pak.endpoint])
            versions = data.trim().
                replace(/[ \t]+/g, ' ').
                replace(/^.+refs\/tags\//mg, '').
                split(/[\r\n]+/).
                filter(function(e) !e.match(/\{/))
        }
        let found
        for each (v in Version.sort(versions, -1)) {
            if (v && Version(v).acceptable(criteria)) {
                pak.versions.push(v)
                if (!found) {
                    found = true
                    pak.setRemoteVersion(v)
                    pak.setCacheVersion(v)
                }
            }
        }
        if (!found) {
            if (state.force) {
                trace('Warn', 'Suitable release version not found for ' + pak.name + ' ' + criteria)
                pak.setRemoteVersion(versions[0])
                pak.setCachePath()
            } else {
                vtrace('Info', 'Pak "' + pak.name + '" ' + criteria + ' not found in catalog.')
                return false
            }
        }
        trace('Info', 'Selected ' + pak + ' ' + pak.remoteVersion)
        let download = catalogs[pak.catalog || 'pak'].download
        let download = download.expand({OWNER: pak.owner, NAME: pak.repository, TAG: pak.remoteTag})
        pak.setDownload(download)
        pak.resolve()
        return true
    }

    /*
        Locate a pak by name in the catalogs
     */
    private function locatePak(pak: Package, exceptions = true): Boolean {
        let location
        if (pak.endpoint) {
            location = selectVersion(pak, pak.versionCriteria || (options.all ? '*' : '^*'))
        } else {
            for (let [cname, catalog] in catalogs) {
                if (pak.catalog && pak.catalog != cname) {
                    continue
                }
                trace('Info', 'Search catalog: "' + cname + '" for ' + pak.name)
                let cmd = catalog.query
                let http = new Http
                try {
                    cmd = cmd.expand({NAME: pak.name})
                    vtrace('Retrieve', cmd)
                    http.get(cmd)
                    if (http.status != 200) {
                        vtrace('Info', 'Cannot not find "' + pak.name + '" in "' + cname + '" catalog. Status ' + http.status)
                        continue
                    }
                } catch (e) {
                    qtrace('Warn', 'Cannot access catalog at: ' + cmd)
                    if (App.config.requirePrimaryCatalog && !state.force) {
                        throw 'Cannot continue with offline primary catalog ' + cmd + '\n' + 'Wait or retry with --force'
                    }
                }
                try {
                    let response
                    try {
                        response = deserialize(http.response)
                    } catch {
                        trace('Skip', 'Bad response from catalog: ' + catalog + '\n' + http.response)
                    }
                    if (!response) {
                        trace('Skip', 'Missing catalog data')
                        continue
                    }
                    if (cname == 'pak') {
                        //  MOB untill pak catalog exact search
                        for each (item in response.data) {
                            if (item.name == pak.name) {
                            //  MOB TEMP
                                if (item.name == 'semantic-ui') {
                                    item.endpoint = 'Semantic-Org/Semantic-UI-CSS'
                                    vtrace('Info', 'Redirect to ' + item.endpoint)
                                } else if (item.name == 'angular' ||
                                    item.name == 'animate.css' ||
                                    item.name == 'bootstrap' ||
                                    item.name == 'font-awesome' ||
                                    item.name == 'html5shiv' ||
                                    item.name == 'jquery' ||
                                    item.name == 'semantic-ui') {
                                    item.endpoint = '@npm:' + item.name
                                    vtrace('Info', 'Redirect to ' + item.endpoint)
                                }
                                if (item.endpoint.startsWith('@')) {
                                    location = item.endpoint.slice(1)
                                    vtrace('Redirect', 'Redirect query to ' + location)
                                    pak.parseEndpoint(location)
                                    return locatePak(pak)
                                }
                                location = item.endpoint
                                pak.parseEndpoint(location)
                                selectVersion(pak, pak.versionCriteria || (options.all ? '*' : '^*'))
                                break
                            }
                        }
                    } else if (cname == 'bower') {
                        location = response.url
                        pak.parseEndpoint(location)
                        selectVersion(pak, pak.versionCriteria || (options.all ? '*' : '^*'))

                    } else if (cname == 'npm') {
                        pak.versions = Object.getOwnPropertyNames(response.versions).map(function(e) e.trimStart('v'))
                        if (options.debug) {
                            vtrace('Info', 'Available versions:')
                            dump(pak.versions)
                        }
                        location = selectVersion(pak, pak.versionCriteria || (options.all ? '*' : '^*'))
                        pak.endpoint = 'npm'
                    }
                    if (location) {
                        vtrace('Found', pak.name + ' in catalog "' + cname + '" at ' + pak.endpoint)
                        break
                    }
                } catch (e) {
                    vtrace('Warn', e)
                }
            }
        }
        if (!location && exceptions) {
            throw 'Cannot locate pak "' + pak.args + '" ' + pak.versionCriteria
        }
        return false
    }

    private function searchCatalogs(ref: String): Array {
        let pak = Package(ref)
        /*
            Search for exact match (quicker)
         */
        if (locatePak(pak, false)) {
            return [pak]
        }
        let http = new Http
        let matches = []
        for (let [cname, catalog] in catalogs) {
            if (pak.catalog && pak.catalog != cname) {
                continue
            }
            trace('Info', 'Search catalog: ' + cname + ' for partial "' + pak.name + '" ' + (pak.versionCriteria || ''))
            let cmd = catalog.list || catalog.query.expand({NAME: pak.name})
            try {
                vtrace('Retrieve', cmd)
                http.get(cmd)
            } catch (e) {
                qtrace('Warn', 'Cannot access catalog at: ' + cmd)
                if (App.config.requirePrimaryCatalog && !state.force) {
                    throw 'Cannot continue with offline primary catalog ' + cmd + '\n' + 'Wait or retry with --force'
                }
            }
            try {
                let index = {}
                let response
                try {
                    response = deserialize(http.response)
                } catch {
                    trace('Skip', 'Bad response from catalog: ' + catalog + '\n' + http.response)
                }
                if (!response) {
                    trace('Skip', 'Missing catalog data')
                    continue
                }
                let index = {}
                if (cname == 'npm') {
                    if (response.name == pak.name) {
                        pak.versions = Object.getOwnPropertyNames(response.versions).map(function(e) e.trimStart('v'))
                        index[pak.name] = response.repository.url
                    }
                } else {
                    if (response.data is Array) {
                        response = response.data
                    }
                    for each (item in response) {
                        index[item.name] = item.endpoint || item.url
                    }
                }
                for (let [pname, location] in index) {
                    if (pname.contains(pak.name)) {
                        trace('Query', pak.name + ' at ' + location)
                        let criteria = pak.versionCriteria || (options.all ? '*' : '^*')
                        let mpak = Package(location, criteria)
                        if (selectVersion(mpak, criteria)) {
                            matches.push(mpak)
                        }
                    }
                }
            } catch (e) {
                vtrace('Warn', e)
                qtrace('Info', 'Cannot find suitable ' + pak.name + ' in catalog: ' + cname)
            }
        }
        if (matches.length == 0) {
            throw 'Cannot find pak "' + pak + '" with suitable version'
        }
        return matches
    }

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
        PACKAGE.write(serialize(cleanSpec(spec), {pretty: true}))
    }

    function validatePak(pak: Package): Boolean {
        let requiredFiles = [ PACKAGE ]
        for each (file in requiredFiles) {
            let path = pak.sourcePath.join(file)
            if (!exists(path) && !path.isDir) {
                throw 'Pak is missing required file "' + file + '"'
            }
        }
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
    function validateJson(pak: Object): Boolean {
        if (!pak) {
            throw 'Invalid package description file'
        }
        for each (field in requiredKeywords) {
            if (pak[field] == undefined) {
                if (pak.name) {
                    throw 'Package ' + pak.name + ' does not validate. Missing or empty required field "' + field + '"'
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

    /*
        Remove empty top-level objects
     */
    function cleanSpec(obj) {
        obj = obj.clone()
        let empty = []
        for (let [key, value] in obj) {
            if (typeOf(value) == 'Object') {
                if (Object.getOwnPropertyCount(value) == 0) {
                    empty.push(key)
                }
            }
        }
        for each (key in empty) {
            delete obj[key]
        }
        return obj
    }

    function getPaks(result, patterns, pak) {
        /*
            Look at all dependencies to pick up non-installed cached paks
         */
        for (let [name, requiredVersion] in pak.dependencies) {
            if (!result[name]) {
                let dep = Package(name, requiredVersion)
                if (matchPakName(name, patterns)) {
                    result[name] = dep
                }
                if (!dep.install && !dep.cache) {
                    throw 'Cannot find pak "' + dep.name + '" referenced by "' + pak.name + '"'
                }
                getPaks(result, patterns, dep.install || dep.cache)
            }
        }
        /*
            Add installed paks that are not in pak.dependencies
         */
        getInstalledPaks(result, patterns, pak)
        return result
    }

    function getInstalledPaks(result, patterns, pak) {
        for each (path in directories.paks.files('*')) {
            if (path.isDir) {
                let dep = Package(path.basename)
                if (matchPakName(dep.name, patterns)) {
                    result[dep.name] = dep
                }
            }
        }
        return result
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
        }
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
            dirTokens[name.toUpperCase()] = path.absolute
        }
    }

    function getValue(key): Void {
        let obj = spec
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
        path.write(serialize(cleanSpec(spec), {pretty: true}) + '\n')
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

    private function getPakSetting(pak, property) {
        let override = spec.pak.override
        return ((override && override[pak.name] && override[pak.name][property] === true) ||
                      (override && override['*'] && override['*'][property] === true))
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
