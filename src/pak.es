#!/usr/bin/env ejs

/*
    pakcmd.es -- Embedthis Pak Package Manager

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

    /* This layers over App.config */
    private var defaultConfig = {
        catalogs: [ 
            'http://embedthis.com/pak/catalog',
            'https://bower.herokuapp.com/packages',
        ],
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
            cache: { range: String },
            catalog: { range: String },
            code: { range: String },
            debug: { alias: 'd' },
            details: {},
            dir: { range: String },
            force: { alias: 'f' },
            log: { range: /\w+(:\d)/, value: 'stderr:1' },
            quiet: { alias: 'q' },
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
            '    cache [paks...]      # Populate the cache with paks\n' +
            '    cached [paks...]     # List paks in the cache\n' +
            '    config               # Show the Pak configuration\n' +
            '    depend [paks...]     # Display installed pak dependencies\n' +
            '    edit key[=value]...  # Edit a pak description file \n' +
            '    help                 # Display this usage help\n' +
            '    init                 # Create a new package.json\n' +
            '    install paks...      # Install a pak on the local system\n' +
            '    list [paks...]       # list installed paks\n' +
            '    prune [paks...]      # Prune named paks\n' +
            '    publish [dir]        # Upload and publish a pak\n' +
            '    retract pak          # Unpublish a pak\n' +
            '    search paks...       # Search for paks in the catalog\n' +
            '    uninstall            # Uninstall a pak on the local system\n' +
            '    update [paks...]     # Update the cache with latest version\n' +
            '    upgrade [paks...]    # Upgrade installed paks\n' +
            '  General options:\n' + 
            '    --catalog catalog    # Catalog to use instead of defaults\n' +
            '    -d, --debug          # Run in debug mode (more verbose)\n' +
            '    --dir                # Change to directory before running\n' +
            '    --force              # Ignore dependencies and continue\n' +
            '    --log file:level     # Send log output to a file at a given level\n' + 
            '    --paks dir           # Use given directory for packs cache\n' +
            '    -q, --quiet          # Run in quiet mode\n' +
            '    -v, --verbose        # Run in verbose mode\n' +
            '  List options:\n' + 
            '    -a, --all            # Show all versions for a pak individually\n' +
            '    --details            # Show pak details\n' +
            '    --versions           # Show pak version information\n' +
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
                if (!args || args.options.debug) {
                    print(e)
                    // error(e.stack + '\n')
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
            options.verbose ||= true
        }
        if (options.version) {
            print(Config.version)
            App.exit(0)
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
        if (options.all || options.verbose) {
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
        // dirs.current = App.dir
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
                    cache(pak)
                }
            } else {
                for each (name in rest) {
                    let pak = Package(name)
                    if (Path(name).exists) {
                        pak.setSource(name)
                        /* Use name from package.json so directory can be any name */
                        let spec = Package.readSpec(name)
                        pak.name = spec.name
                        pak.resolve()
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

        case 'install':
            if (rest.length == 0) {
                if (!PACKAGE.exists) {
                    error('Nothing to install')
                } else {
                    let spec = Package.readSpec('.')
                    if (spec) {
                        for (let [name,version] in spec.dependencies) {
                            let pak = Package(name)
                            pak.setSearchCriteria(version)
                            install(pak)
                        }
                    }
                }
            } else {
                let spec = Package.readSpec('.')
                for each (name in rest) {
                    let criteria = (spec.dependencies && spec.dependencies[name]) || '*'
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
            for each (name in rest) {
                publish(Package(name))
            }
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
                    trace('Info', 'Nothing to prune')
                }
            }
            break

        case 'retract': case 'unpublish':
            for each (name in rest) {
                retract(Package(name))
            }
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
                error("Cannot read package.json")
                break
            }
            if (rest.length == 0) {
                for (let [name,criteria] in spec.dependencies) {
                    let pak = Package(name)
                    pak.resolve(criteria)
                    upgrade(pak)
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

    function buildPak(pak: Package) {
        let dir = pak.cachePath
        let path: Path = dir.join('build.es')
        if (path.exists) {
            trace('Build', pak.name)
            Worker().load(path)
/* UNUSED
        } else {
            let files = []
            if (pak.spec && pak.spec.ejs) {
                for each (e in [extensions.es, extensions.js]) {
                    files += find(dir, '*.' + e, {descend: true})
                }
            } else {
                files = find(dir.join('lib'), '*.' + extensions.js, {descend: true})
            }
            //  TODO - our should be just do lib as per CommonJS
            files -= ['build.es', 'install.es', 'remove.es']
            if (files.length > 0) {
                makeDir(dir.join(dirs.pakcache))
                let out = pak.sourcePath.join(pak.name).joinExt(extensions.mod)
                if (options.verbose) {
                    dtrace('Compile', 'ejsc --out ' + out + ' ' + files.join(' '))
                } else {
                    trace('Compile', pak.name)
                }
                Cmd.sh('ejsc --out ' + out + ' ' + files.join(' '))
            }
            */
        }
    }

    /*
        TODO - not used
        Build a pak file
        @param files Optional list of files to include in the package. Otherwise, build() discovers the files in the
            current directory based on the package.files.
     */
    function build(items: Array): Void {
        //  TODO - should build dependency list from the 'require' statements - ejsmod to create
        let spec = Package.readSpec('.')
        if (!spec) {
            throw 'Missing ' + PACKAGE + ' Run "pak" in the directory containing the package description'
        }
        validateJson(spec)
        let path = spec.name + '/' + spec.version + '.' + extensions.pak
        try {
            tar = new Tar(path)
            let list = []
            list.push(PACKAGE)
            if (items.length > 0) {
                //  TODO - should validate items. Must contain package.json ...
                //  TODO - should 
                for each (f in items) {
                    list.push(f)
                }
            } else if (spec.files) {
                for each (item in spec.files) {
                    for each (f in Path('.').files(item)) {
                        list.push(f)
                    }
                }
            } else {
                //  TODO -- need better filtering. Perhaps a file list would be better
                //  TODO - use .pakignore
                //  TODO - use Path().files
                items =  find('.', '*.' + extensions.lib, {descend: true})
                items += find('.', '*.mod', {descend: true})
                items += find('.', '*.es', {descend: true})
                items += find('doc', '*', {descend: true})
                items += find('bin', '*', {descend: true})
                items += find('lib', '*', {descend: true})
                items += find('test', '*', {descend: true})
                for each (f in items) {
                    if (f.isRegular) {
                        list.push(f)
                    }
                }
                list.push('install.es')
                list.push('uninstall.es')
            }
            tar.create(...list)
            trace('Build', path)
        } catch (e) {
            print(e)
        }
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
            trace('Skip', pak + ' has publish: false')
            return
        }
        if (pak.cached) {
            if (!args.options.force) {
                trace('Info', pak + ' ' + pak.cacheVersion + ' is already cached')
                return
            }
        } else {
            dtrace('Info', pak + ' is not yet cached')
        }
        if (pak.sourcePath) {
            if (!pak.spec) {
                trace('Skip', pak + ' does not have a valid package.json')
                return
            }
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
    function init() {
        if (PACKAGE.exists) {
            throw 'Package description "' + PACKAGE + '" .already exists in this directory'
        }
        trace('Create', PACKAGE)
        Path(PACKAGE).write(serialize(PakTemplate, {pretty: true, indent: 4}))
    }

    function install(pak: Package) {
        pak.resolve(pak.searchCriteria || '*')
        if (pak.cached) {
            if (pak.installed && Version(pak.spec.version).acceptable(pak.searchCriteria)) {
                if (!args.options.force) {
                    trace('Info', pak + ' is already installed')
                    return
                }
            }
        } else {
            pak = searchPak(pak)
            cachePak(pak)
        }
        let path = Package.getSpecFile('.') || Path(PACKAGE)
        let spec = path.exists ? path.readJSON() : PakTemplate.clone()
        blendPak(spec, pak)
        if (!path.exists) {
            trace('Create', path)
        } else {
            vtrace('Update', path)
        }
        if (path.exists) {
            path.write(serialize(spec, {pretty: true, indent: 4}) + '\n')
        }
        installPakFiles(pak)
    }

    /* 
        Blend dependencies bottom up so that lower paks can define dirs
     */
    private function blendPak(spec, pak: Package) {
        if (!pak.spec) {
            throw 'Pak ' + pak + ' at ' + pak.cachePath + ' is missing a package.json'
        }
        vtrace('Blend', pak + ' configuration')
        blendDependencies(spec, pak)
        blendSpec(spec, pak)
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
            Blend "esp", "dirs" and "client-scripts" only
            Special handling for dirs which are also copied to this.dirs for immediate effect
         */
        blendSpecProperties(spec, "esp", pak.spec, "esp")
        blendSpecProperties(spec, "dirs", pak.spec, "dirs")
        for (let [k,v] in spec.dirs) {
            spec.dirs[k] = Path(v)
            dirs[k] = Path(v)
        }
        let PAKS = dirs.client ? { PAKS: dirs.paks.trimStart(dirs.client + '/') } : {}
        for each (script in pak.spec['client-scripts']) {
            let scripts = spec['client-scripts'] ||= []
            script = script.expand(PAKS)
            scripts.push(script.expand(spec))
        }
        if (pak.spec.blend) {
            for (let [key,value] in pak.spec.blend) {
                spec[key] ||= {}
                blend(spec[key], pak.spec[value], {overwrite: false})
                dtrace('Blend', 'Property ' + value + ' into ' + key)
            }
        }
        spec.dependencies ||= {}
        spec.dependencies[pak.name] ||= '~' + pak.installVersion.compatible
        Object.sortProperties(spec.dependencies)
    }

    /*
        Install pak files top down. We don't overwrite existing (perhaps user-modified) files, 
        so lower packs won't modify the files of upper paks
     */
    private function installPakFiles(pak: Package): Void {
        trace('Install', pak.name, pak.cacheVersion)
        if (!pak.cached) {
            cachePak(pak)
            pak.resolve()
        }
        let dest = pak.installPath
        dtrace('Info', 'Installing "' + pak.name + '" from "' + pak.cachePath)
        if (dest.exists) {
            dtrace('Rmdir', dest)
            removeDir(dest, true)
        }
        dtrace('Mkdir', dest)
        mkdir(dest)
        copyTree(pak.cachePath, dest, pak.spec.ignore, pak.spec.files, pak.spec.export)
        installDependencies(pak)
        vtrace('Info', pak + ' ' + pak.cacheVersion + ' successfully installed')
    }

    private function installDependencies(pak: Package): Boolean {
        let spec = pak.spec
        if (!spec.dependencies) {
            return true
        }
        for (let [other, criteria] in spec.dependencies) {
            let dep = Package(other)
            dep.selectCacheVersion(criteria)
            dep.resolve()
            if (!dep.installed) {
                dtrace('Info', 'Install required dependency ' + dep.name)
                try {
                    installPakFiles(dep)
                } catch (e) {
                    print(e)
                    if (args.options.force) {
                        trace('WARN', 'Cannot install required dependency "' + dep.name + '"' )
                    } else {
                        throw 'Cannot install ' + pak.name + ' because of missing required dependency "' + dep.name + '"' 
                    }
                }
            } else {
                dtrace('Info', 'dependency "' + dep.name + '" is installed')
            }
        }
        return true
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
        for each (pak in sets) {
            out.write(pak.name)
            if (options.details && pak.spec) {
                out.write(': ')
                print(serialize(pak.spec, {pretty: true, indent: 4}))
            } else if (options.versions) {
                print(' ' + pak.installVersion)
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
            trace('Warn', 'Cannot prune "' + pak + '" designated as precious. Use --force to force pruning.')
            return
        }
        if (pak.cachePath == latest && !options.all) {
            trace('Info', 'Preserve latest version for ' + pak + ' ' + pak.cacheVersion)
            trace('Info', 'Use --all to prune all versions')
            return
        }
        if ((users = requiredCachedPak(pak)) != null) {
            if (!options.force) {
                throw 'Cannot prune "' + pak + '". It is required by: ' + users.join(', ') + '.'
            }
        }
        trace('Prune', pak + ' ' + pak.cacheVersion)
        removeDir(pak.cachePath, true)
        /* Remove parent if empty */
        removeDir(pak.cachePath.dirname, false)
        trace('Info', pak + ' successfully pruned')
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
        vtrace('Search', 'Latest version of ' + pak)
        let later = searchPak(pak)
        if (pak.cacheVersion && pak.cacheVersion.same(later.cacheVersion)) {
            trace('Info', pak + ' is current with ' + pak.cacheVersion + ' for requirement ')
            return pak
        }
        vtrace('Update', pak + ' to ' + later.cacheVersion)
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
        if (pak.installVersion && pak.installVersion.same(later.cacheVersion) && !options.force) {
            trace('Info', 'Installed ' + pak + ' is current with ' + pak.installVersion + 
                ' for version requirement ' + pak.searchCriteria)
            return
        }
        trace('Upgrade', pak + ' to ' + later.cacheVersion)
        later.resolve(later.cacheVersion)
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
                if (dep.sourced) {
                    dtrace('Info', 'Caching required dependency from source at: ' + dep.sourcePath)
                    cachePak(dep)
                } else {
                    try {
                        dep = searchPak(dep)
                        cachePak(dep)
                    } catch (e) {
                        //  TODO - should test if present and must display (e)
                        print(e)
                        if (args.options.force) {
                            trace('WARN', 'Cannot cache required dependency "' + dep.name + '"' )
                        } else {
                            throw 'Cannot cache ' + pak.name + ' because of missing required dependency "' + dep.name + '"' 
                        }
                    }
                }
            } else {
                dtrace('Info', 'dependency "' + dep.name + '" is cached')
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
                    print("SKIP", f)
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
                dtrace(relocate[f] ? 'Export' : 'Copy', to)
            }
        }
    }

    //  TODO - can we remove this and push into build.es
    function installModules(pak: Package): Void {
        for each (f in find(pak.cachePath.join(dirs.pakcache), '*.' + extensions.mod, {descend: true})) {
            let dest = dirs.modules.join(Path(f).basename)
            trace('Install', dest)
            cp(f, dest)
        }
    }

    //  TODO - can we remove this and push into build.es
    function installNativeModules(pak: Package): Void {
        for each (f in find(pak.cachePath.join(dirs.pakcache), '*.' + extensions.so, {descend: true})) {
            let dest = dirs.lib.join(Path(f).basename)
            trace('Install', dest)
            cp(f, dest)
        }
    }

    function installDocumentation(dir): Void {
        // print('TODO')
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
            dtrace('Get', pak.downloadUri)
            http.get(pak.downloadUri)
            let file = File(tgzName, 'w')
            let buf = new ByteArray
            while (http.read(buf) > 0) {
                let wrote = file.write(buf)
            }
            file.close()
            http.close()
            dtrace('Save', 'Response to ' + tgzName.absolute)
            Zlib.uncompress(tgzName, tarName)
            let tar = new Tar(tarName.absolute)
            chdir(dest.parent)
            dtrace('Extract', 'Extract to ' + dest)
            //  Better to strip first part of file name and extract into the right place first time
            //  Tar options strip: 1
            tar.extract()
            dest.parent.join(pak.repName + '-' + pak.cacheVersion).rename(dest)

        } finally {
            chdir(current)
            tgzName.remove()
            tarName.remove()
            tempName.remove()
            dest.parent.join(pak.name + '-' + pak.cacheVersion).removeAll()
        }
    }

    private function runInstallScripts(pak: Package) {
        let script = pak.cachePath.join('install.es')
        if (script.exists) {
            try {
                dtrace('Run', 'Installation script: ' + script)
                //  TODO - need to trap onerror
                //  TODO - need to set dirs.pakcache, inside the script env
                chdir(pak.sourcePath)
                Worker().load(script)
                Worker.join()
            } catch (e) {
                throw 'Cannot run installion script "' + script + '" for ' + pak + '\n' + e
            } finally {
                chdir(current)
            }
        } else {
            buildPak(pak)
            if (args.options.test) {
                // runTests(pak)
            }
            installModules(pak)
            installNativeModules(pak)
            installDocumentation(pak)
        }
    }

    private function copyPak(pak: Package) {
        dtrace('Info', 'Caching "' + pak.name + '" from "' + pak.sourcePath.relative + '" to "' + pak.cachePath + '"')
        copyTree(pak.sourcePath, pak.cachePath, pak.spec.ignore, pak.spec.files)
    }

    private function cachePak(pak: Package) {
        let dest = pak.cachePath
        if (dest.exists) {
            dtrace('Rmdir', dest)
            removeDir(dest, true)
        }
        dtrace('Mkdir', dest)
        mkdir(dest)
        if (!pak.sourcePath) {
            fetchPak(pak)
        } else if (pak.sourcePath.isDir) {
            copyPak(pak)
        } else {
            throw 'Cannot find pack ' + pak.name + ' to install'
        }
        if (!Package.getSpecFile(pak.cachePath)) {
            throw "Cannot find package description for " + pak + ' from ' + pak.cachePath
        }
        pak.resolve()
        cacheDependencies(pak)
        runInstallScripts(pak)
        trace('Info', pak + ' ' + pak.cacheVersion + ' successfully cached')
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
        pak publish # returns token
     */
    function publish(pak: Package): Void {
    //  TODO - revise. No 'to' option anymore
        let catalog = Path(args.options.to)
        if (!catalog) {
            catalog = dirs.catalogs[0]
        }
        if (catalog.contains('http://')) {
            //  TODO TODO
            publishRemote()
            // TODO path = fetchRemote(rep, pak)
        } else {
            //  TODO - really need to update the catalog
            //  TODO pak.path doesn't exist
            let from = pak.path
            let dir = catalog.join(pak.name)
            let target = dir.join(pak.path.basename).absolute.portable
            //  TODO -- must cleanup if cp or makedir fails
            makeDir(target.dirname)
            cp(from, target)
            tar = new Tar(target)
            let current = App.dir
            try {
                chdir(dir)
                tar.extract('package.json')
            } finally {
                chdir(current)
            }
            //  TODO publishLocal()
        }
    }

    function uninstallPak(pak: Package): Void {
        if (!args.options.force) {
            if (users = requiredInstalledPak(pak)) {
                throw 'Cannot remove "' + pak + '". It is required by: ' + users.join(', ') + '.'
            }
        }
        let script = pak.installPath.join('uninstall.es')
        if (script.exists) {
            try {
                trace('Run', 'Uninstall script: ' + script)
                Worker().load(script)
                Worker.join()
            } catch (e) {
                throw 'Cannot uinstall "' + pak + '"\n' + e
            }
        }
        removeDir(pak.installPath, true)
        /*
            Remove entry in dependencies
         */
        let path = Package.getSpecFile('.')
        let spec = path.readJSON()
        delete spec.dependencies[pak.name]
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
        trace('Remove', pak.name)
    }

    //  TODO - check pak usage
    function retract(pak: Package): Void {
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
            if (RegExp('^[\w\-]$').match(remote)) {
                trace('Warn', pak + ' is part of ' + remote + ' and not available separately')
            } else {
                throw 'Remote endpoint is not in the correct format: ' + remote
            }
        }
        dtrace('Run', [git, 'ls-remote', '--tags', pak.remoteUri].join(' '))
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
                dtrace('Warn', 'Desired version not found in catalog for ' + pak.name + ' ' + criteria)
                pak.setRemoteVersion(versions[versions.length - 1])
                pak.setCachePath()
            } else {
                throw 'Desired version not found in catalog. ' + criteria
            }
        }
        dtrace('Info', 'Matched ' + pak + ' ' + pak.remoteVersion + ' from ' + pak.remoteUri)
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
            vtrace('Info', 'Searching catalog: ' + catalog + ' for ' + pak + ' ' + (pak.searchCriteria || ''))
            try {
                http.get(catalog)
            } catch (e) {
                trace('Warn', 'Cannot access catalog at: ' + catalog)
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
                    vtrace('Skip', 'Bad response from catalog: ' + catalog)
                }
                if (!data) {
                    vtrace('Skip', 'Missing catalog data')
                    continue
                }
                if (data is Array) {
                    /* Bower index */
                    for each (item in data) {
                        index[item.name] = item.url
                    }
                } else {
                    index = data
                }
                let remote = index[pak.name]
                if (remote) {
                    /* Exact match */
                    vtrace('Query', pak.name + ' versions at ' + remote)
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
                            vtrace('Query', pak.name + ' versions at ' + remote)
                            let mpak = Package(pname)
                            let criteria = pak.searchCriteria || (options.all ? '*' : '^*')
                            selectRemoteVersion(mpak, criteria, remote)
                            matches.push(mpak)
                        }
                    }
                }
            } catch (e) {
                dtrace('Warn', e)
                trace('Info', 'Cannot find suitable ' + pak.name + ' in catalog: ' + catalog)
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
            throw 'Missing ' + PakFiles[0] + '. Run \"pak\"" in the directory containing the package file'
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

/* UNUSED
    function validatePak(pak: Package): Boolean {
        let requiredFiles = [ PACKAGE ]
        for each (file in requiredFiles) {
            let path = pak.sourcePath.join(file)
            if (!exists(path) && !path.isDir) {
                throw 'Pak is missing required files "' + file + '"'
            }
        }
        let requiredDirs = [ 'modules', 'doc', 'test' ]
        for each (file in requiredFiles) {
            let path = pak.sourcePath.join(file)
            if (!exists(path) && !path.isDir) {
                throw 'Pak is missing required directory "' + file + '"'
            }
        }
        return true
    }
    */

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
        dtrace('Read', 'Pak configuration from ' + path)
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
                dtrace('Read', 'Configuration from: ' + f)
                for (let [field, value] in spec.dirs) {
                    dirs[field] = f.dirname.join(value)
                }
                if (spec.catalogs) {
                    catalogs = spec.catalogs
                }
                break
            }
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

    function blendSpecProperties(dest, destKey, src, srcKey)
    {
        if (!dest || !src) return
        let from = src[srcKey]
        if (from) {
            if (from is Array) {
                dest[destKey] = []
            } else {
                dest[destKey] = {}
            }
            blend(dest[destKey], src[srcKey])
        }
    }

    function error(msg) App.log.error(msg)

    private var PakTemplate = {
        name: 'One word package name',
        title: 'Multiword package title',
        description: 'Package description',
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
        license: 'GPL',
        dependencies: {
            name: 'version',
        },
        'client-scripts': [],
        dirs: {},
    }
}


function trace(tag: String, ...args): Void {
    if (!options.quiet) {
        let msg = args.join(' ')
        let msg = '%12s %s' % (['[' + tag + ']'] + [msg]) + '\n'
        out.write(msg)
    }
}

function dtrace(tag, msg) {
    if (options.debug) {
        trace(tag, msg)
    }
}

function vtrace(tag, msg) {
    if (options.verbose) {
        trace(tag, msg)
    }
}

PakCmd().main()

} /* ejs.pak module */


/*
    @copy   default

    Copyright (c) Embedthis Software LLC, 2003-2013. All Rights Reserved.

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
