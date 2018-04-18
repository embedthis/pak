#!/usr/bin/env ejs

/*
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
const PAK: Path = Path('pak.json')
const PACKAGE: Path = Path('package.json')
const PakProperties = ['dependencies', 'devDependencies', 'optionalDependencies',
    'main', 'scripts', 'commitplease', 'migrated']

var PakFiles = [ PAK, PACKAGE ]

//  TODO - convert to public members of Pak
var catalogs: Object?
var dirTokens: Object
var files: Object
var options: Object
var spec: Object
var state: Object
var out: File = App.outputStream
var currentPak: Package?

class Pak
{
    private const RC: String = 'pakrc'
    private const DOTRC: String = '.pakrc'
    private const DIR_PERMS: Number = 0775

    public var directories: Object

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
        /* KEEP
            pak: {
                lookup:    'https://localhost:4443/search/${NAME}',
                query:     'https://localhost:4443/search/${NAME}',
                publish:   'https://localhost:4443/pak/publish',
                download:  'https://github.com/${OWNER}/${NAME}/archive/${TAG}.tar.gz',
                overrides: 'https://raw.githubusercontent.com/embedthis/pak-overrides/master'
            },
        */
            pak: {
                lookup:    'https://embedthis.com/catalog/search/${NAME}',
                query:     'https://embedthis.com/catalog/search/${NAME}',
                publish:   'https://embedthis.com/catalog/pak/publish',
                download:  'https://github.com/${OWNER}/${NAME}/archive/${TAG}.tar.gz',
                overrides: 'https://raw.githubusercontent.com/embedthis/pak-overrides/master'
            },
            bower: {
                lookup: 'http://bower.herokuapp.com/packages/${NAME}',
                query: 'http://bower.herokuapp.com/packages',
                download: 'https://github.com/${OWNER}/${NAME}/archive/${TAG}.tar.gz',
            },
            npm: {
                lookup: 'http://registry.npmjs.org/${NAME}',
                download: 'http://registry.npmjs.org/${NAME}/-/${NAME}-${TAG}.tgz',
            }
        },
        directories: {
            export: (!Path('lib').exists && Path('src').exists) ? 'src' : 'lib'
            contents: 'contents',
            paks: 'paks',
            pakcache: '~/.paks',
            top: '.',
        },
        requirePrimaryCatalog: true,
    }

    private var requiredKeywords = [ 'description', 'name', 'version' ]

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
        name: aname.toLowerCase(),
        title: aname.toPascal() + ' Application',
        version: '1.0.0',
        dependencies: {},
        import: true,
        profile: 'debug',
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
            init: { alias: 'i' },
            log: { range: /\w+(:\d)/, value: 'stderr:1' },
            name: { range: String },
            nodeps: { },
            noupdate: { alias: 'n' },
            optional: { alias: 'o' },
            paks: { range: String },
            password: { range: String },
            quiet: { alias: 'q' },
            silent: { alias: 's' },
            trace: { range: /\w+(:\d)/, value: 'stderr:4' },
            verbose: { alias: 'v' },
            version: { alias: 'V', range: String },
            versions: {},
            write: { alias: 'w' },
        },
        usage: usage,
        onerror: 'exit',
    }

    function usage(): Void {
        print('\nUsage: pak ' + ' [options] [commands] ...\n\n' +
            '  Commands:\n' +
            '    cache [paks...]             # Populate the cache with paks\n' +
            '    cached [paks...]            # List paks in the cache\n' +
            '    config                      # Show the Pak configuration\n' +
            '    depend [paks...]            # Display installed pak dependencies\n' +
            '    edit key[=value]...         # Edit a pak description file \n' +
            '    help                        # Display this usage help\n' +
            '    info paks...                # Display README for cached paks\n' +
            '    init [name [version]]       # Initialize directory for pak\n' +
            '    install paks...             # Install a pak on the local system\n' +
            '    license paks...             # Display LICENSE for paks\n' +
            '    list [paks...]              # List installed paks\n' +
            '    lockdown                    # Lockdown dependencies\n' +
            '    profile [dev|prod]          # Select profile\n' +
            '    prune [paks...]             # Prune named paks\n' +
            '    publish [name uri pass]     # publish a pak in a catalog\n' +
            '    retract name [pass]         # Unpublish a pak\n' +
            '    search paks...              # Search for paks in the catalog\n' +
            '    uninstall paks...           # Uninstall a pak on the local system\n' +
            '    update [paks...]            # Update the cache with latest version\n' +
            '    upgrade [paks...]           # Upgrade installed paks with latest version\n' +
            '    version [major|minor|patch] # Display or increment the version \n\n' +
            '  General options:\n' +
            '    --cache dir                 # Directory to use for the Pak cache\n' +
            '    --dir dir                   # Change to directory before running\n' +
            '    --force                     # Force requested action\n' +
            '    --log file:level            # Send output to a file at a given level\n' +
            '    --name name                 # Set an application name for "pak init"\n' +
            '    --nodeps                    # Do not install or upgrade dependencies\n' +
            '    --noupdate                  # Do not update the pak cache when upgrading\n' +
            '    --optional                  # Install as an optional dependency\n' +
            '    --paks dir                  # Use given directory for "paks" directory\n' +
            '    --password file             # File containing the package password\n' +
            '    --quiet, -q                 # Run quietly\n' +
            '    --silent                    # Run totally silently\n' +
            '    --verbose, -v               # Run verbosely\n' +
            '    --write, -w                 # Write installed package to dependencies\n\n' +
            '  List options:\n' +
            '    -a, --all                   # Show all versions for a pak\n' +
            '    --details                   # Show pak details\n' +
            '    --versions                  # Show pak version information\n' +
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
        }
    }

    function setup(task) {
        if (options.init && task != 'init' && !PACKAGE.exists) {
            init()
        }
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
        spec = {}
        if (PAK.exists) {
            spec = PAK.readJSON()
        }
        if (PACKAGE.exists) {
            let package = PACKAGE.readJSON()
            if (!spec) {
                //  Try to determine if this is a legacy package.json
                if (package.pak || package.export || package.origin) {
                    spec = package
                }
            } else if (package.version && spec.version) {
                qtrace('Warn', 'Version property exists in package.json and pak.json')
            }
            spec.name ||= package.name
            spec.version ||= package.version
            spec.repository ||= package.repository
        } else if (!spec) {
            spec = PakTemplate.clone()
        }
        spec.dependencies ||= {}
        spec.optionalDependencies ||= {}
        spec.devDependencies ||= {}

        //  DEPRECATE
        if (spec.pak) {
            if (spec.pak.version) {
                delete spec.pak.version
            }
            blend(spec, spec.pak)
            delete spec.pak
        }
        let pver = spec.pak || spec.devDependencies.pak
        if (pver && !Version(Config.Version).acceptable(pver)) {
            throw '' + spec.name + ' requires Pak ' + pver + '. Pak version ' + Config.Version +
                            ' is not compatible with this requirement.' + '\n'
        }
        //  LEGACY
        if (spec.mode) {
            spec.profile = spec.mode
            delete spec.mode
        }
        if (spec.modes) {
            spec.profiles = spec.modes
            delete spec.modes
        }
        if (spec.profile && spec.profiles && spec.profiles[spec.profile]) {
            blend(spec, spec.profiles[spec.profile], {combine: true})
        }
        state.force = options.force
    }

    function checkDir() {
        let path = Package.getSpecFile('.')
        if (!path || !path.exists) {
            throw 'Missing pak json. Check you are in the right directory or do "pak init" first.'
        }
    }

    function process() {
        let rest = args.rest
        let task = rest.shift()

        setup(task)

        switch (task) {
        case 'build':
            build(rest)
            break

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
            checkDir()
            depend(rest)
            break

        case 'edit':
            checkDir()
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
            checkDir()
            install(rest)
            break

       case 'license':
            license(rest)
            break

        case 'list':
        case 'installed':
            checkDir()
            list(rest)
            break

        case 'lockdown':
            checkDir()
            lockdown()
            break

        //  LEGACY
        case 'mode':
        case 'profile':
            checkDir()
            profile(rest)
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

        case 'sync':
            checkDir()
            state.force = true
            options.noupdate = true
            upgrade(rest)
            break

        case 'uninstall':
            checkDir()
            uninstall(rest)
            break

        case 'update':
            update(rest);
            break

        case 'upgrade':
            checkDir()
            upgrade(rest)
            break

        case 'version':
            checkDir()
            version(rest)
            break

        case 'setdeps':
            checkDir()
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

    function buildPak(pak: Package) {
        trace('Building', pak.name)
        runScripts(pak, 'build')
    }

    function build(names: Array): Void {
        for each (name in names) {
            buildPak(Package(Path(name).basename))
        }
    }

    function cache(names: Array): Void {
        if (names.length == 0) {
            if (!PAK.exists && !PACKAGE.exists) {
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
            if (criteria == 'match') {
                criteria = '~' + Version(pak.cache.version).compatible
                pak.cache.dependencies[other] = criteria
                saveSpec(pak.cachePath.join(PAK), pak.cache)
            }
            if (pak.catalog) {
                other = pak.catalog + ':' + other
            }
            let dep = Package(other, criteria)
            if (Path(dep.name).isDir) {
                dep.setSource(dep.name)
            }
            if (state.installing && dep.install) {
                trace('Info', 'Dependency ' + dep.name + ' installed')
            } else if (!dep.cached) {
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
        trace('Cache', pak.name, pak.cacheVersion)
        let dest = pak.cachePath
        if (!dest) {
            throw new Error('Empty cache path for ' + pak.name)
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
                    pak.source.files = (pak.source.files + ['pak.json', 'package.json', 'README.md', 'LICENSE.md']).unique()
                }
                copyTree(pak, pak.sourcePath, pak.cachePath, pak.source.ignore, pak.source.files)
            } else {
                throw 'Cannot find package ' + pak.name + ' to install'
            }
            if (!Package.getSpecFile(pak.cachePath)) {
                trace('Create', 'pak.json for', pak.name)
                pak.cache = { name: pak.name, version: pak.cacheVersion.toString(), dependencies: {} }
                saveSpec(pak.cachePath.join(PAK), pak.cache)
            }
            pak.resolve()

            if (!pak.cache) {
                throw new Error('Missing cache for ', pak.name)
            }
            if (pak.sourcePath) {
                /* Update origin */
                pak.source.origin = pak.origin
                if (pak.source.migrated) {
                    pak.source = trimPackageProperties(pak.source)
                }
                saveSpec(pak.cachePath.join(PAK), pak.source)
            } else {
                if (pak.origin) {
                    /* Apply global override downloaded from catalog */
                    for each (over in pak.overrides) {
                        over = over[pak.origin].overrides
                        for (let [criteria, properties] in over) {
                            if (Version(pak.cacheVersion).acceptable(criteria)) {
                                vtrace('Apply', 'Pak overrides for ' + pak.name)
                                blend(pak.cache, properties, {combine: true})
                                pak.name = pak.cache.name
                                break
                            }
                        }
                    }
                    pak.cache.origin = pak.origin
                    if (pak.cache.migrated) {
                        pak.cache = trimPackageProperties(pak.cache)
                    }
                    saveSpec(pak.cachePath.join(PAK), pak.cache)
                    /*
                        Resolve after updating the json file as it will be re-read
                     */
                    pak.resolve()
                }
                if (pak.cache.repository && pak.cache.repository.patch) {
                    applyPatch(pak)
                }
            }
            if (!pak.sourcePath || options.all) {
                cacheDependencies(pak)
            }
            runScripts(pak, 'postcache')
            qtrace('Info', pak + ' ' + pak.cacheVersion + ' successfully cached')
        }
        catch (e) {
            if (!options.debug) {
                dest.removeAll()
            }
            throw e
        }
    }

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
        /*
            Build list of qualifying paks from cached versions
         */
        for each (name in names) {
            let versions = Version.sort(directories.pakcache.files(name + '/*/*', {relative: true}), -1)
            for each (version in versions) {
                let parts = version.components
                version = parts[1] + '/' + parts[0] + '#' + parts[2]
                let pak = Package(version)
                let pakset = sets[pak.origin] || {}
                sets[pak.origin] = pakset
                pakset[pak.cacheVersion] = pak
            }
        }
        for each (pakset in sets) {
            versions = []
            for each (pak in pakset) {
                versions.append(pak.cacheVersion)
            }
            let latest = versions[0]

            if (options.all) {
                printf(pakset[latest].name + '\n')
                for each (pak in pakset) {
                    out.write('    ' + pak.cacheVersion + ' from ' + pak.origin + '\n')
                }
            } else {
                let pak = pakset[latest]
                let origin = pak.origin ? (' from ' + pak.origin) : ''
                printf('%26s %6s %s', pak.name, pak.cacheVersion, origin)
                if (options.details && pak.cache) {
                    out.write(': ')
                    print(serialize(pak.cache, {pretty: true, indent: 4}))
                }
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
    function init(args = null) {
        if (PAK.exists) {
            throw 'Package description "' + PAK + '" .already exists in this directory'
        }
        qtrace('Create', PAK)
        let pspec = PakTemplate.clone()
        if (args && args.length > 0) {
            let [name, version] = args
            pspec.name = name
            pspec.title = name.toPascal() + ' Application'
            pspec.version = version
        } else {
            pspec.name = options.name || App.dir.basename.toLowerCase()
        }
        saveSpec(PAK, pspec)
    }

    private var blending = {}

    /*
        Blend dependencies bottom up so that lower paks can define directories and upper paks can take precedence.
     */
    private function blendPak(pak: Package) {
        if (!pak.cache) {
            throw new Error('Pak ' + pak + ' at ' + pak.cachePath + ' is incomplete')
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
        if (pak.cache.blend) {
            blend(spec, pak.cache.blend, {combine: true})
        }
        for (let [k,v] in spec.directories) {
            spec.directories[k] = Path(v)
            directories[k] = Path(v)
        }
        if (pak.cache.pak) {
            blend(pak.cache, pak.cache.pak)
            delete pak.cache.pak
        }
        if (pak.cache.profile) {
            spec.profile ||= pak.cache.profile
        }
        //  LEGACY
        if (pak.cache.mode) {
            spec.profile ||= pak.cache.mode
        }
        /*
            Manage external json files (esp.json, expansive.json)
         */
        let manage = pak.cache.manage
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
        if (topDeps[pak.name] || topDeps[pak.args] || topDeps[pak.origin]) {
            if (options.write) {
                if (optional(spec, pak.name) || (options.optional && !spec.dependencies[pak.name])) {
                    spec.optionalDependencies ||= {}
                    spec.optionalDependencies[pak.name] ||= '~' + pak.cacheVersion.compatible
                    Object.sortProperties(spec.optionalDependencies)
                } else {
                    if (!options.nodeps) {
                        //  Should already be created
                        spec.dependencies ||= {}
                        spec.dependencies[pak.name] ||= '~' + pak.cacheVersion.compatible
                        Object.sortProperties(spec.dependencies)
                    }
                }
            }
        }
    }

    function install(names: Array) {
        if (names.length == 0) {
            if (!PAK.exists && !PACKAGE.exists) {
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
                if (!version && spec.optionalDependencies && spec.optionalDependencies[name]) {
                    version = spec.optionalDependencies[name]
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
                if (!state.upgrading) {
                    if (pak.installVersion.acceptable(pak.versionCriteria)) {
                        qtrace('Info', pak + ' is already installed')
                        return
                    }
                }
            }
        }
        state.installing = true
        if (!pak.cache || !pak.cache.version || !Version(pak.cache.version).acceptable(pak.versionCriteria)) {
            locatePak(pak)
            let force = state.force
            state.force = false
            cachePak(pak)
            state.force = force
        }
        if (state.upgrading && pak.installed) {
            if (Version(pak.cache.version).acceptable('>' + pak.installVersion)) {
                trace('Upgrade', pak.name + ' from ' + pak.installVersion + ' to ' + pak.cache.version)
            } else if (!state.force) {
                qtrace('Info', pak.name + ' ' + pak.installVersion + ' is the most recent acceptable version')
                return
            }
        }
        runScripts(pak, 'preinstall')
        installPak(pak, true)

        let path = Package.getSpecFile('.')
        if (!path || !path.exists) {
            vtrace('Create', path)
        } else {
            vtrace('Update', path)
        }
        if (!options.nodeps) {
            saveSpec(path, spec)
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
        if (PAK.exists) {
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
        } else {
            pak.name = pak.cache.name
            pak.resolve()
        }
        if (installDeps) {
            try {
                let dir = blend({}, pak.cache.blend.directories, {combine: true})
                if (dir.export) {
                    directories.export = dir.export
                }
            } catch {}
            installDependencies(pak)
        }
        blendPak(pak)

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
        /*
            Override installed pak based on local overrides from the application's json in 'spec'
         */
        let overrides = spec.overrides
        if (spec.overrides) {
            if (spec.overrides['*']) {
                vtrace('Apply', 'Local overrides for all paks')
                blend(pak.cache, spec.overrides['*'], {combine: true})
                pak.dirty = true
            }
            if (spec.overrides[pak.name]) {
                vtrace('Apply', 'Local overrides for ' + pak.name)
                blend(pak.cache, spec.overrides[pak.name], {combine: true})
                pak.dirty = true
            }
            /* Saved below to paks/name/ *.json */
        }
        let ignore = pak.cache.ignore || []
        if (!(ignore is Array)) {
            ignore = [ignore]
        }
        let export = pak.cache.export || []
        if (!(export is Array)) {
            export = [export]
        }
        export = export.clone()
        let from = pak.cachePath
        let files = pak.cache.files || []
        if (!(files is Array)) {
            files = [files]
        }
        if (spec.import) {
            let import = getPakSetting(pak, 'import')
            if (import !== false) {
                if (spec.override && spec.override[pak.name] && spec.override[pak.name].export) {
                    export = spec.override[pak.name].export
                } else {
                    let needExports = (export.length == 0)
                    let needFiles = (files.length == 0)
                    for each (dir in ['dist', 'lib']) {
                        let path = pak.cachePath.join(dir)
                        if (path.exists) {
                            if (needFiles) {
                                files.push('dist/' + '**')
                            }
                            if (needExports) {
                                export.push({ from: 'dist/', trim: 1 })
                            }
                            break
                        }
                    }
                }
            }
        } else {
            export = []
        }
        if (!(export is Array)) {
            export = [export]
        }
        if (files && !(files is Array)) {
            files = [files]
        }
        if (!files || files.length == 0) {
            files = ['**']
        } else {
            files = (files + ['pak.json', 'package.json']).unique()
        }
        copyTree(pak, from, dest, ignore, files, export || [])
        vtrace('Info', pak + ' ' + pak.cacheVersion + ' successfully installed')
        vtrace('Info', 'Use "pak info ' + pak.name + '" to view the README')

        /*
            Rewrite the installed pak's json if there are local overrides
         */
        if (pak.dirty && overrides && (overrides['*'] || overrides[pak.name])) {
            let path = Package.getSpecFile(pak.installPath)
            saveSpec(path, pak.cache)
            vtrace('Save', path + ' with local overrides')
        }
        for (let [key,path] in spec.directories) {
            mkdir(path, DIR_PERMS)
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
            let installed = pak.installVersion ? ' installed' : ' uninstalled'
            let from = 'unknown-origin'
            if (pak.install && pak.install.origin) {
                from = pak.install.origin
            } else if (pak.cache && pak.cache.origin) {
                from = pak.cache.origin
            }
            let frozen = (pak.install && pak.install.frozen) ? 'frozen' : pak.versionCriteria
            let why = 'local'
            if (spec.dependencies[pak.name]) {
                why = 'dependency'
            } else if (optional(spec, pak.name)) {
                why = 'optional'
            }
            let version = pak.installVersion || pak.cacheVersion || '-----'
            if (options.details && pak.install) {
                print(pak.name + ' ' + serialize(pak.install, {pretty: true, indent: 4}))
            } else {
                printf('%24s %6s %12s %11s %7s  %s\n', pak.name, version, installed, why, frozen, from)
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
                spec.dependencies[pak.name] = '~' + pak.installVersion.compatible
                delete spec.optionalDependencies[pak.name]
            } else {
                trace('Info', pak.name + ' is not installed')
            }
        }
        let path = Package.getSpecFile('.')
        saveSpec(path, spec)
    }

    function profile(newProfile, meta) {
        if (newProfile.length == 0) {
            print(spec.profile)
        } else {
            setValue('profile', newProfile[0])
            trace('Set', 'Profile to "' + newProfile[0] + '"')
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
        /* Remove parent only if empty */
        removeDir(pak.cachePath.dirname, false)
        qtrace('Info', pak + ' successfully pruned')
        runScripts(pak, 'postprune')
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
        print('Pak configuration: ' + serialize(obj, {pretty: true, quotes: false}))
    }

    /*
        pak [--password passfile] publish
        pak [--password passfile] publish name email endpoint [override]
     */
    function publish(args): Void {
        let passfile = options.password
        let name, endpoint, over
        if (args.length == 0) {
            if (!PAK.exists && !PACKAGE.exists) {
                throw 'Cannot find pak json in current directory'
            }
            let pak = new Package(spec.name)
            if (pak.publish === false) {
                qtrace('Skip', pak + ' has publish: false')
                return
            }
            pak.setSource('.')
            if (!validatePak(pak)) {
                return
            }
            name = pak.name
            endpoint = (spec.repository && spec.repository.url) || null
            over = (spec.repository && spec.repository.override) || null
        } else if (args.length == 3) {
            [name, endpoint, over] = args
        } else if (args.length == 2) {
            [name, endpoint] = args
        } else {
            throw 'Incorrect args for publish'
        }
        if (!endpoint) {
            throw 'Missing repository property in pak json.'
        }
        let password
        if (passfile) {
            password = Path(passfile).readString().trim()
        } else {
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
        let data = { name: name, endpoint: endpoint, password: password, override: over }
        http.setHeader('Content-Type', 'application/json')
        let uri = catalogs.publish
        try {
            qtrace('Publish', name + ' at ' + uri)
            http.post(uri, serialize(data))
            let response = deserialize(http.response)
            if (response.error) {
                qtrace('Error', response.feedback.error)
            } else {
                qtrace('Info', name + ' successfully published at ' + endpoint)
            }
        } catch (e) {
            throw 'Cannot register package. ' + e
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
            throw 'Cannot register package. ' + e
        }
    }

    function uninstallPak(pak: Package): Void {
        if (!state.force) {
            if (users = requiredInstalledPak(pak)) {
                throw 'Cannot remove "' + pak + '". It is required by: ' + users.join(', ') + '.'
            }
        }
        runScripts(pak, 'uninstall')

        if (options.write) {
            delete spec.dependencies[pak.name]
            delete spec.optionalDependencies[pak.name]
        }
        if (spec.overrides) {
            delete spec.overrides[pak.name]
        }
        let path = Package.getSpecFile('.')
        saveSpec(path, spec)
        removeDir(pak.installPath, true)

        path = directories.export.join(pak.name)
        if (path.exists) {
            removeDir(path, true)
        }
        qtrace('Uninstall', pak.name)
        runScripts(pak, 'postuninstall')
    }

    function uninstall(patterns): Void {
        let list = []
        let sets = getPaks({}, patterns, spec)
        for each (pat in patterns) {
            for each (pak in sets) {
                if (matchPakName(pak.name, [pat])) {
                    list.push(pak)
                    if (!pak.installed && !state.force) {
                        if (!((spec.dependencies[pak.name] || spec.optionalDependencies[pak.name]) && options.write)) {
                            throw 'Pak "' + pak + '" is not installed'
                        }
                    }
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
        if ((!PAK.exists && !PACKAGE.exists) || !spec) {
            error('Cannot read pak json')
        }
        topDeps = {}
        if (names.length == 0) {
            let sets = getPaks({}, [], spec)
            Object.sortProperties(sets)
            for each (pak in sets) {
                topDeps[pak.name] = true
            }
            for each (pak in sets) {
                upgradePak(pak)
            }
        } else {
            for each (name in names) {
                topDeps[name] = true
            }
            for each (name in names) {
                let criteria = spec.dependencies[name] || optional(spec, name)
                upgradePak(Package(name, criteria))
            }
        }
    }

    /*
        Upgrade installed packs with latest version from the cache
     */
    function upgradePak(pak: Package? = null) {
        let current = pak.installVersion
        if (!options.noupdate || !pak.cached) {
            if (!pak.cached) {
                vtrace('Info', 'Pak "' + pak.name + '" not present in cache. Updating cache first.')
            }
            try {
                updatePak(pak)
            } catch (e) {
                if (pak.cacheVersion) {
                    trace('Info', 'Continue with cached version', pak.cacheVersion)
                } else {
                    throw e
                }
            }
        }
        if (current && current.same(pak.cacheVersion) && !state.force) {
            trace('Info', 'Installed ' + pak + ' is current with ' + pak.installVersion +
                ' for version requirement ' + pak.versionCriteria)
            return
        }
        if (state.force && pak.installVersion && pak.installVersion.same(pak.cacheVersion)) {
            state.reinstall = true
        }
        if (pak.install && pak.install.frozen) {
            trace('Info', 'Installed ' + pak + ' ' + pak.installVersion + ' is frozen')
            return
        }
        runScripts(pak, 'preupgrade')
        state.upgrading = true
        installCommon(pak)
        delete state.upgrading
    }

    function version(rest: Array) {
        let newVersion = rest.toString()
        let v = Version(spec.version)
        if (newVersion == '') {
            print(spec.version)
            return
        }
        if (newVersion == 'bump') {
            newVersion = v.pre ? 'pre' : 'patch'
        }
        if (newVersion == 'major') {
            newVersion = (v.major + 1) + '.0.0'
        } else if (newVersion == 'minor') {
            newVersion = v.major + '.' + (v.minor + 1) + '.0'
        } else if (newVersion == 'patch') {
            newVersion = v.major + '.' + v.minor + '.' + (v.patch + 1)
        } else if (newVersion == 'pre' || newVersion == 'prerelease') {
            let parts = v.pre.split('.')
            let d = (parts[parts.length - 1] cast Number) + 1
            let pre = parts.slice(0, -1) + '.' + d
            newVersion = v.major + '.' + v.minor + '.' + v.patch + pre
        }
        edit(['version=' + newVersion])
        edit(['version'])
    }

    function copyTree(pak, fromDir: Path, toDir: Path, ignore, files, exportList: Array?) {
        if (files && !(files is Array)) {
            files = [files]
        }
        if (!files || files.length == 0) {
            files = ['**']
        } else {
            files = (files + ['pak.json', 'package.json', 'README.md', 'LICENSE.md']).unique()
        }
        if (ignore && !(ignore is Array)) {
            ignore = [ignore]
        }
        for each (item in ignore) {
            files.push('!' + item)
        }
        var export = {}
        for each (pat in exportList) {
            if (!pat.script) {
                if (pat is String) {
                    pat = { from: [pat], to: Path(pak.name), overwrite: true}
                } else {
                    pat = pat.clone(true)
                    if (!(pat.from is Array)) {
                        pat.from = [pat.from || '**'] + [ '!package.json', '!*.md']
                    }
                    pat.to ||= Path(pak.name)
                    if (pat.overwrite == undefined) {
                        pat.overwrite = true
                    }
                }
                let dir = Path(directories.export || directories.export)
                let to = dir.join(pat.to.toString().expand(dirTokens, {fill: '.'}))
                if (!to.childOf('.')) {
                    throw 'Copy destination "' + to + '" for pak "' + pak.name + '" is outside current directory'
                }
                for each (f in fromDir.files(pat.from)) {
                    export[f] = { overwrite: pat.overwrite, to: to, trim: pat.trim }
                }
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
                let exp = export[from]
                if (exp) {
                    let base: Path = exp.to
                    let path = from.relativeTo(fromDir)
                    if (exp.trim) {
                        path = path.components.slice(exp.trim).join(path.separator)
                    }
                    let to = base.join(path).relative
                    if (from.isDir) {
                        global.pak.makeDir(to)
                    } else {
                        if (!to.exists || exp.overwrite) {
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
        for each (pat in exportList) {
            if (pat.script) {
                trace('Run', 'Custom export script')
                eval(pat.script)
            }
        }
    }

    private function fetchPak(pak: Package) {
        let temp = Path('').temp()
        try {
            let http = new Http
            // http.verify = false
            http.followRedirects = true
            trace('Get', pak.download)
            http.get(pak.download)
            let file = File(temp, 'w')
            let buf = new ByteArray
            while (http.read(buf) > 0) {
                let wrote = file.write(buf)
            }
            file.close()
            if (http.status != 200) {
                throw 'Cannot download ' + pak.download + ' status ' + http.status
            }
            http.close()
            trace('Extract', 'Extract to ' + pak.cachePath)
            Tar(temp, {uncompress: true, dest: pak.cachePath, trim: 1}).extract()
/* FUTURE
            Could apply ignore and files
            let tmp = Path('').temp()
            Tar(temp, {uncompress: true, dest: tmp, trim: 1}).extract()
            copyTree(pak, tmp, pak.cachePath, pak.source.ignore, pak.source.files)
            tmp.removeAll()
*/
        } catch (e) {
            trace('Error', e)
            pak.cachePath.removeAll()
            /* Remove empty directories */
            pak.cachePath.parent.remove()
            pak.cachePath.parent.parent.remove()
        } finally {
            temp.remove()
        }
    }

    /*
        Fetch overrides for a pak and save in pak.overrides[].
        If a local ~/.pak/overrides exists, it takes precedence.
        Otherwise, fetch overrides from the supplied 'url' or
        from the pak-overrides repo.
     */
    function fetchGlobalOverrides(pak, url = null) {
        pak.overrides ||= []
        let over
        let path = App.home.join('.pak/overrides', pak.name + '.json')
        if (path.exists) {
            over = path.readJSON()
        } else {
            if (!url) {
                url = catalogs.pak.overrides + '/' + pak.name + '.json'
            }
            if (url) {
                try {
                    let http = new Http
                    // http.verify = false
                    http.get(url)
                    if (http.status == 200) {
                        over = deserialize(http.response)
                        vtrace('Fetch', 'Override: ', url)
                    }
                    http.close()
                } catch (e) {
                    trace('Error', e)
                }
            }
        }
        if (over) {
            if (over[pak.origin]) {
                let site = over[pak.origin]
                if (site.versions) {
                    pak.versionFormat = site.versions
                }
                if (site.overrides) {
                    pak.overrides.push(over)
                }
            }
        }
    }

    function applyPatch(pak) {
        let url = pak.cache.repository.patch
        let temp = Path('').temp()
        try {
            let http = new Http
            http.verify = false
            http.followRedirects = true
            let current = App.dir
            let dest = pak.cachePath

            trace('Fetch', 'Patch:', url)
            http.get(url)
            let temp = Path('').temp()
            let file = File(temp, 'w')
            let buf = new ByteArray
            while (http.read(buf) > 0) {
                let wrote = file.write(buf)
            }
            file.close()
            if (http.status != 200) {
                throw 'Cannot download ' + pak.download + ' status ' + http.status
            }
            http.close()

            trace('Extract', 'Extract to ' + dest)
            Tar(temp, {uncompress: true, dest: dest, trim: 1}).extract()

        } catch (e) {
            trace('Error', e)
        } finally {
            temp.remove()
        }
    }

    /*
        Events:
            build
            install
            preinstall
            postcache
            postprune
            preupdate
            preupgrade
            uninstall
     */
    private function runScripts(pak: Package, event: String) {
        if (!pak.cache) {
            return
        }
        try {
            let results
            currentPak = pak

            let scripts
            if (pak.cache && pak.cache.pak && pak.cache.scripts) {
                scripts = pak.cache.scripts[event]
            }
            if (scripts) {
                if (!(scripts is Array)) {
                    scripts = [scripts]
                }
                for each (script in scripts) {
                    if (script is String || script.script) {
                        vtrace('Run', 'Event "' + event + '"')
                        eval('require ejs.unix\n' + script.script)

                    } else if (script.path) {
                        let path = pak.cachePath.join(script.path)
                        if (!path.exists) {
                            throw 'Cannot find ' + path
                        }
                        if (path.extension == 'es') {
                            vtrace('Run', 'ejs', path)
                            load(path)
                        } else if (path.extension == 'me') {
                            if (Cmd.locate('me')) {
                                vtrace('Run', 'me -q --file ' + path + ' pak-' + event)
                                results = Cmd.run('me -q --file ' + path + ' pak-' + event)
                            } else {
                                throw 'Cannot run MakeMe installation script "' + event + '" for ' + pak + '\n' + e
                            }
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
                path = pak.cachePath.join(pak.name + '.me')
                if (path.exists) {
                    if (Cmd.locate('me')) {
                        vtrace('Run', 'me -q --file ' + path + ' pak-' + event)
                        results = Cmd.run('me -q --file ' + path + ' pak-' + event)
                    } else {
                        throw 'Cannot run MakeMe installation script "' + event + '" for ' + pak + '\n' + e
                    }
                } else {
                    //  DEPRECATED
                    path = pak.cachePath.join('start.me')
                    if (path.exists) {
                        if (Cmd.locate('me')) {
                            vtrace('Run', 'me -q --file ' + path + ' ' + event)
                            results = Cmd.run('me -q --file ' + path + ' ' + event)
                        } else {
                            throw 'Cannot run MakeMe installation script "' + event + '" for ' + pak + '\n' + e
                        }
                    }
                }
            }
            if (results) {
                out.write(results)
            }
        } catch (e) {
            throw 'Cannot run installation script "' + event + '" for ' + pak + '\n' + e
        }
        currentPak = null
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
            if (name == pat) {
                return true
            }
        }
        return false
    }

    private function getDeps(pak: Package, deps = {}, level: Number = 0) {
        if (options.all || level == 0) {
            let obj = pak.install ? pak.install : pak.cache
            if (obj) {
                for (let [name,criteria] in obj.dependencies) {
                    let dep = Package(name, criteria)
                    getDeps(dep, deps, level + 1)
                }
            }
        }
        if (level > 0) {
            deps[pak.name] = pak
        }
        return deps
    }

    private function printDeps(pak: Package, prefix: String = '') {
        print('\n' + pak.name + ' ' + (pak.installVersion || pak.cacheVersion) + ' dependencies:')
        let deps = getDeps(pak)
        if (Object.getOwnPropertyCount(deps) == 0) {
            print('    none')
        }
        for (let [name, dep] in deps) {
            out.write(prefix)
            //  TODO - should display the version criteria
            out.write('    ' + dep.name + ' ' + (dep.installVersion || pak.cacheVersion) + ' (' +
                dep.versionCriteria + ')\n')
        }
    }

    private function requiredCachedPak(pak: Package): Array? {
        let users = []
        /* Path is: ~/.paks/OWNER/NAME/VERSION */
        for each (path in directories.pakcache.files('*/*/*')) {
            let name = path.dirname.parent.basename.toString()
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
        let versions = pak.versions || []
        pak.versions = []
        let tags = {}
        if (pak.owner != '@npm') {
            vtrace('Run', [git, 'ls-remote', '--tags', pak.endpoint].join(' '))
            let data
            try {
                data = Cmd.run([git, 'ls-remote', '--tags', pak.endpoint])
            } catch (e) {
                trace('Warn', 'Cannot get remote versions for:', pak.endpoint)
                throw e.message
            }
            versions = data.trim().
                replace(/[ \t]+/g, ' ').
                replace(/^.+refs\/tags\/*/mg, '').
                split(/[\r\n]+/).
                filter(function(e) !e.match(/\{/))
            if (pak.versionFormat) {
                let re = RegExp(pak.versionFormat)
                let matching = []
                for each (v in versions) {
                    if (v.match(re)) {
                        let trimmed = v.match(re).slice(1).join('.')
                        matching.push(trimmed)
                        tags[trimmed] = v
                    }
                }
                versions = matching
            }
        }
        Version.sort(versions, -1)
        let found
        for each (v in versions) {
            if (v && Version(v).acceptable(criteria)) {
                pak.versions.push(v)
                if (!found) {
                    found = true
                    pak.setRemoteVersion(tags[v] ? tags[v] : v)
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
        vtrace('Select', pak + ' ' + pak.cacheVersion)
        let download = catalogs[pak.catalog || 'pak'].download
        download = download.expand({OWNER: pak.owner, NAME: pak.repository, TAG: pak.remoteTag})
        pak.setDownload(download)
        pak.resolve()
        return true
    }

    /*
        Locate a pak by name. May search catalogs.
     */
    private function locatePak(pak: Package, exceptions = true): Boolean {
        let location
        if (pak.endpoint) {
            fetchGlobalOverrides(pak)
            location = selectVersion(pak, pak.versionCriteria || (options.all ? '*' : '~*'))
        } else {
            for (let [cname, catalog] in catalogs) {
                if (pak.catalog && pak.catalog != cname) {
                    continue
                }
                trace('Info', 'Search catalog: "' + cname + '" for ' + pak.name + ' for version ' + pak.versionCriteria)
                let cmd = catalog.lookup
                let http = new Http
                try {
                    cmd = cmd.expand({NAME: pak.name})
                    vtrace('Get', cmd)
                    // http.verify = false
                    http.get(cmd)
                    if (http.status != 200) {
                        vtrace('Info', 'Cannot not find "' + pak.name + '" in "' + cname +
                               '" catalog. Status ' + http.status)
                        continue
                    }
                } catch (e) {
                    print(e)
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
                        for each (item in response.data) {
                            if (item.name == pak.name) {
                                if (item.endpoint.startsWith('@')) {
                                    vtrace('Redirect', 'Redirect to ' + item.endpoint.slice(1))
                                    pak.parseEndpoint(item.endpoint.slice(1))
                                    pak.resolve()
                                    return locatePak(pak)
                                }
                                pak.parseEndpoint(item.endpoint)
                                fetchGlobalOverrides(pak, item.override)
                                pak.resolve()
                                location = selectVersion(pak, pak.versionCriteria || (options.all ? '*' : '~*'))
                                if (location) {
                                    location = item.endpoint
                                }
                                break
                            }
                        }
                    } else if (cname == 'bower') {
                        pak.parseEndpoint(location)
                        fetchGlobalOverrides(pak)
                        pak.resolve()
                        location = selectVersion(pak, pak.versionCriteria || (options.all ? '*' : '~*'))
                        location = response.url

                    } else if (cname == 'npm') {
                        for (let [key,value] in response.versions) {
                            if (value.deprecated) {
                                delete response.versions[key]
                            }
                        }
                        pak.versions = Object.getOwnPropertyNames(response.versions).map(function(e) e.trimStart('v'))
                        if (options.debug) {
                            vtrace('Info', 'Available versions:')
                            dump(pak.versions)
                        }
                        pak.endpoint = '@npm/' + pak.name
                        fetchGlobalOverrides(pak)
                        location = selectVersion(pak, pak.versionCriteria || (options.all ? '*' : '~*'))
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
        if (!location) {
            if (exceptions) {
                throw 'Cannot locate package "' + pak.args + '" ' + pak.versionCriteria
            }
            return false
        }
        return true
    }

    /*
        Only used by search
     */
    private function searchCatalogs(ref: String): Array {
        let pak = Package(ref)
        /*
            Search for exact match (quicker)
         */
        if (locatePak(pak, false)) {
            return [pak]
        }
        /*
            Now search for partial name match or keyword match
         */
        let http = new Http
        let matches = []
        for (let [cname, catalog] in catalogs) {
            if (pak.catalog && pak.catalog != cname) {
                continue
            }
            trace('Info', 'Search catalog: ' + cname + ' for partial "' + pak.name + '" ' + (pak.versionCriteria || ''))
            let cmd = catalog.query || catalog.lookup
            cmd = cmd.expand({NAME: pak.name})
            try {
                vtrace('Get', cmd)
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
                        let criteria = pak.versionCriteria || (options.all ? '*' : '~*')
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
            throw 'Cannot find package "' + pak + '" with suitable version'
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
        saveSpec(PAK, spec)
    }

    function validatePak(pak: Package): Boolean {
        if (!pak.sourcePath.join(PAK).exists && !pak.sourcePath.join(PACKAGE)) {
            throw 'Pak is missing required pak json file '
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
        if (!pspec.version || !Version(pspec.version).valid) {
            throw 'Invalid package version: ' + pspec.version
        }
        return true
    }

    /*
        Validate a pak json object
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
                } else {
                    /* Deleted items still show in getOwnPropertyCount */
                    count = 0
                    for (item in value) {
                        count++
                    }
                    if (count == 0) {
                        empty.push(key)
                    }
                }
            }
        }
        for each (key in empty) {
            delete obj[key]
        }
        return obj
    }

    function getDepPaks(result, patterns, pak) {
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
                    // trace('Warn', 'Cannot find package "' + dep.name + '" referenced by "' + pak.name + '"')
                    dep.cache = { dependencies: {}, pak: {} }
                    continue
                }
                getDepPaks(result, patterns, dep.install || dep.cache)
            }
        }
        return result
    }

    function getInstalledPaks(result, patterns, pak) {
        for each (path in directories.paks.files('*')) {
            if (path.isDir) {
                let dep = Package(path.absolute)
                if (matchPakName(dep.name, patterns)) {
                    /* Overwrites entry for dependencies if present */
                    let prior = result[dep.name]
                    if (prior && (prior.versionCriteria != '~*')) {
                        if (dep.versionCriteria == '~*') {
                            dep.versionCriteria = prior.versionCriteria
                        }
                    } else if (spec.optionalDependencies[dep.name]) {
                        dep.versionCriteria = spec.optionalDependencies[dep.name]
                    }
                    dep.cacheVersion = null
                    dep.resolve(dep.versionCriteria)
                    result[dep.name] = dep
                }
            }
        }
        return result
    }

    function getPaks(result, patterns, pak) {
        getDepPaks(result, patterns, pak)
        getInstalledPaks(result, patterns, pak)
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
        Search order: pakrc : .pakrc : ../.../[pakrc|.pakrc] : json (for directories only)
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
        if (key == 'version' && PACKAGE.exists) {
            let data = PACKAGE.readJSON()
            data.version = value
            PACKAGE.write(serialize(cleanSpec(data), {pretty: true, indent: 4}) + '\n')
        } else {
            path = Package.getSpecFile('.')
            saveSpec(path, spec)
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

    /*
        Get an override property from the application's json:pak.override[name]
     */
    private function getPakSetting(pak, property) {
        let override = spec.override
        return ((override && override[pak.name] && override[pak.name][property] === true) ||
                      (override && override['*'] && override['*'][property] === true))
    }

    private function optional(obj, name)
        spec.optionalDependencies ? spec.optionalDependencies[name] : null

    private function saveSpec(path: Path, spec) {
        spec = spec.clone(true)
        path.dirname.makeDir()
        if (path.dirname == '.' && PACKAGE.exists) {
            let data = PACKAGE.readJSON()
            if (data.version) {
                delete spec.version
            }
        }
        path.write(serialize(cleanSpec(spec), {pretty: true, indent: 4}) + '\n')
    }

    function trimPackageProperties(spec) {
        if (spec.migrated) {
            spec = black(spec, PakProperties)
        }
        return spec
    }

    function black(obj, mask) {
        let result
        result = obj.clone()
        for each (let key in mask) {
            delete result[key]
        }
        return result
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

public function run(command, copt = {}): String {
    trace('Run', command)
    return Cmd.run(command, copt)
}

public function npm(command, program): Void {
    if (!Cmd.locate('npm')) {
        throw 'Cannot locate the "npm" utility.'
    }
    if (!Cmd.locate(program)) {
        command = 'npm ' + command + ' ' + program
        trace('Run', command)
        Cmd.run(command)
    }
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
