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
    private var config: Object
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
            //  TODO - rename
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
            debug: { alias: 'd'},
            details: {},
            dir: { range: String },
            field: { range: String },
            force: {},
            log: { range: /\w+(:\d)/, value: 'stderr:1' },
            noupdate: { },
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
            '    config               # Show the configuration\n' +
            '    depend [paks...]     # Display pak dependencies\n' +
            '    edit                 # Edit a pak description file \n' +
            '    help                 # Display this usage help\n' +
            '    init                 # Initialize a pak. Create package.json\n' +
            '    install paks...      # Install a pak on the local system\n' +
            '    list [paks...]       # list installed paks\n' +
            '    prune [paks...]      # Prune named paks\n' +
            '    publish [dir]        # Upload and publish a pak\n' +
            '    retract pak          # Unpublish a pak\n' +
            '    search name          # Search for a pak by name\n' +
            '    uninstall            # Uninstall a pak on the local system\n' +
            '    upgrade              # Upgrade all installed paks\n' +
            '  General options:\n' + 
            '    --catalog catalog    # Catalog to use instead of defaults\n' +
            '    -d, --debug          # Run in debug mode (more verbose)\n' +
            '    --dir                # Change to directory before running\n' +
            '    --force              # Ignore dependencies and continue\n' +
            '    --log file:level     # Send log output to a file at a given level\n' + 
            '    --noupdate           # Do not update package.json for install|uninstall\n' + 
            '    --paks dir           # Use given directory for packs cache\n' +
            '    -q, --quiet          # Run in quiet mode\n' +
            '    -v, --verbose        # Run in verbose mode\n' +
            '  Edit options:\n' + 
            '    --field name[=value] # Package.json field name to edit \n' +
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
        loadRC()
        if (options.catalog) {
            config.catalogs = [Uri(options.catalog)]
        } else {
            for (c in config.catalogs) {
                config.catalogs[c] = Uri(config.catalogs[c])
            }
        }
        for (d in dirs) {
            dirs[d] = Path(dirs[d])
        }
        dirs.current = App.dir
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
            for each (name in rest) {
                let pak = Pak(name)
                if (Path(name).exists) {
                    pak.setSource(name)
                }
                cache(pak)
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
            if (rest.length == 0) {
                edit('.')
            } else {
                for each (path in rest) {
                    edit(path)
                }
            }
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
                    let o = Pak.readSpec('.')
                    for (let [name,version] in o.dependencies) {
                        let pak = Pak(name)
                        pak.setVersion(version)
                        install(pak)
                    }
                }
            } else {
                for each (name in rest) {
                    install(Pak(name))
                }
            }
            break

        case 'list':
            list(rest)
            break

        case 'publish':
            for each (name in rest) {
                publish(Pak(name))
            }
            break

        case 'prune':
            if (rest.length == 0) {
                for each (path in dirs.pakcache.files('*/*')) {
                    let pak = Pak(path.dirname.basename)
                    pak.setVersion(path.basename)
                    prune(pak)
                }
            } else {
                for each (name in rest) {
                    for each (path in dirs.pakcache.join(name).files('*')) {
                        let pak = Pak(name)
                        pak.setVersion(path.basename)
                        prune(pak)
                    }
                }
            }
            break

        case 'retract': case 'unpublish':
            for each (name in rest) {
                retract(Pak(name))
            }
            break

        case 'search':
            for each (name in rest) {
                search(Pak(name))
            }
            break

        case 'uninstall':
            uninstall(rest)
            break

        case 'upgrade':
            if (rest.length == 0) {
                for each (path in ls(dirs.pakcache, true)) {
                    upgrade(Pak(path))
                }
            } else for each (name in rest) {
                upgrade(Pak(name))
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

    function buildPak(pak: Pak) {
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
        let spec = Pak.readSpec('.')
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
            let pak = Pak(path)
            pak.resolve()
            if (matchPakName(pak.name, patterns)) {
                list.push(pak)
            }
        }
        //  MOB REVIEW
        if (list.length > 0) {
            checkNamePatterns(patterns, list)
            for each (pak in list) {
                printDeps(pak)
            }
        } else if (patterns) {
            /*
                Look instead at cached packs
             */
            for each (path in dirs.pakcache.files('*/*')) {
                let pak = Pak(path.dirname.basename)
                pak.setVersion(path.basename)
                pak.resolve()
                if (matchPakName(pak.name, patterns)) {
                    list.push(pak)
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

    function edit(path: Path): Void {
        if (!args.options.field) {
            error('Missing --field option')
        }
        let spec = Pak.readSpec(path)
        let value
        if (args.options.field.contains('=')) {
            let parts = args.options.field.split('=')
            args.options.field = parts[0]
            value = parts[1]
        } else {
            /* Missing value so display current value */
            print(spec[args.options.field])
            return
        }
        spec[args.options.field] = value
        path = Pak.getSpecFile(path)
        path.write(serialize(spec, {pretty: true}))
    }

    /*
        Cache a pak
        @param pak Name of the pak. can be a bare-pak name, versioned pak-name or a path to a physical pak file
     */
    function cache(pak: Pak) {
        pak.resolve()
        if (pak.cached) {
            if (!args.options.force) {
                trace('Info', pak + ' is already cached')
                return
            }
        } else {
            dtrace('Info', pak + ' is not yet cached')
        }
        if (!pak.sourcePath) {
            let matches = searchPak(pak, true)
            if (matches.length == 0) {
                throw 'Cannot find pak "' + pak + '" to cached'
            }
            pak = matches[0]
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
            let pak = Pak(path.dirname.basename)
            pak.setVersion(path.basename)
            pak.resolve()
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
                    versions.append(pak.version)
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
    function search(pak: Pak) {
        let matches = searchPak(pak, false)
        if (matches.length == 0) {
            throw 'Cannot find pak "' + pak + '"'
        }
        let indent = ''
        if (options.verbose || options.versions) {
            print()
            indent += '    '
        }
        for each (match in matches) {
            if (options.versions) {
                match.resolve()
                let cached = match.cached ? (cached + ' ' + match.version) : ''
                print(indent + match.name + ' ' + match.remoteUri + ' ' + cached)
                print(indent + '  versions:')
                for each (v in match.versions) {
                    print(indent + indent + v)
                }
            } else {
                let cached = match.cached ? 'cached' : ''
                print(indent + match.name + ' ' + match.version + ' ' + match.remoteUri + ' ' + cached)
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
        Path(PACKAGE).write(serialize(PackageTemplate, {pretty: true, indent: 4}))
    }

    
    /*
        install a pak locally
        Note: this function does not take patterns. For safety, the name of pak must match exactly.
        @param pak Name of the pak. can be a bare-pak name, versioned pak-name or a path to a physical pak file
     */
    function install(pak: Pak) {
        pak.resolve()
        if (pak.installed) {
            if (!args.options.force) {
                trace('Info', pak + ' is already installed')
                return
            }
        } else {
            dtrace('Info', pak + ' is not yet installed')
        }
        if (!pak.cached) {
            let matches = searchPak(pak, true)
            if (matches.length == 0) {
                if (pak.name == '.') {
                    throw 'Cannot find package.json in current directory'
                }
                throw 'Cannot find pak "' + pak + '" to install'
            }
            pak = matches[0]
            pak.resolve()
        }
        installPak(pak)
    }

    private function installDependencies(pak: Pak): Boolean {
        let spec = pak.spec
        if (!spec.dependencies) {
            return true
        }
        for (let [other, criteria] in spec.dependencies) {
            let dep = Pak(other)
            dep.setVersionCriteria(criteria)
            if (!dep.installed) {
                dtrace('Info', 'Install required dependency ' + dep.name)
                try {
                    install(dep)
                } catch (e) {
                    //  TODO - should test if present and must display (e)
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

    private function installPak(pak: Pak): Void {
        trace('Install', pak.name, pak.version)
        assert(pak.resolved)
        if (!pak.cached) {
            cachePak(pak)
        }
        let dest = pak.installPath
        dtrace('Info', 'Installing "' + pak.name + '" from "' + pak.cachePath + '" to "' + dest + '"')
        if (dest.exists) {
            dtrace('Rmdir', dest)
            removeDir(dest, true)
        }
        dtrace('Mkdir', dest)
        mkdir(dest)
        copyTree(pak.cachePath, dest)
        installDependencies(pak)
        if (!options.noupdate) {
            let path = Pak.getSpecFile('.')
            let spec = path.readJSON()
            spec.dependencies[pak.name] = pak.version.toString()
            path.write(serialize(spec, {pretty: true, indent: 4}))
        }
        trace('Info', pak + ' successfully installed')
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
            let pak = Pak(path)
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
                print(' ' + pak.version)
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
    function prune(pak: Pak) {
        pak.resolve()
        var latest = dirs.pakcache.join(pak.name).files('*').reverse()[0]
        if (!latest) {
            throw 'Nothing to prune for "' + pak + '"'
        }
        if (pak.cachePath == latest && !options.all) {
            trace('Info', 'Preserve latest version for ' + pak + ' ' + pak.version)
            return
        }
        if ((users = requiredCachedPak(pak)) != null) {
            if (!options.force) {
                throw 'Cannot prune "' + pak + '". It is required by: ' + users.join(', ') + '.'
            }
        }
        trace('Prune', pak + ' ' + pak.version)
        removeDir(pak.cachePath, true)
        /* Remove parent if empty */
        removeDir(pak.cachePath.dirname, false)
        trace('Info', pak + ' successfully pruned')
    }

    function showConfig() {
        let o = config.clone()
        let preserve = ['dirs', 'catalogs']
        for (let [key,value] in o) {
            if (!preserve.contains(key)) {
                delete o[key]
            }
        }
        delete o.dirs.cache
        print('Pak configuration: ' + serialize(o, {pretty: true, quotes: false}))
    }

    function upgrade(pak: Pak? = null) {
        if (!pak.cached) {
            throw 'Pak "' + pak + '" is not cached'
        }
        if (!pak.sourcePath) {
            throw 'Cannot find pak "' + pak + '" to upgrade'
        }
        path = queryRemote(rep, pak)
        //  TODO
    }

    private function cacheDependencies(pak: Pak): Boolean {
        let spec = pak.spec
        if (!spec.dependencies) {
            return false
        }
        for (let [other, criteria] in spec.dependencies) {
            let dep = Pak(other)
            dep.setVersionCriteria(criteria)
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
                        //  Do a catalog search to get the download uri
                        let matches = searchPak(dep, true)
                        if (matches.length == 0) {
                            throw 'Cannot find pak "' + pak + '" to cached'
                        }
                        dep = matches[0]
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

    function copyTree(fromDir: Path, toDir: Path, ignore: Array? = null, include: String = '**') {
        fromDir = fromDir.relative
        let files = []
        for each (f in find(fromDir, include, {descend: true, relative: true})) {
            let skip = false
            for each (i in ignore) {
                if (f.startsWith(i)) {
                    skip = true
                }
            }
            if (!skip) {
                files.push(f)
            }
        }
        for each (f in files) {
            let target = toDir.join(f.trimStart(fromDir + '/'))
            let from = fromDir.join(f)
            let to = toDir.join(f)
            if (from.isDir) {
                makeDir(to)
            } else {
                from.copy(to)
                dtrace('Copy', to)
            }
        }
    }

    //  TODO - can we remove this and push into build.es
    function installModules(pak: Pak): Void {
        for each (f in find(pak.cachePath.join(dirs.pakcache), '*.' + extensions.mod, {descend: true})) {
            let dest = dirs.modules.join(Path(f).basename)
            trace('Install', dest)
            cp(f, dest)
        }
    }

    //  TODO - can we remove this and push into build.es
    function installNativeModules(pak: Pak): Void {
        for each (f in find(pak.cachePath.join(dirs.pakcache), '*.' + extensions.so, {descend: true})) {
            let dest = dirs.lib.join(Path(f).basename)
            trace('Install', dest)
            cp(f, dest)
        }
    }

    function installDocumentation(dir): Void {
        // print('TODO')
    }

    private function fetchPak(pak: Pak) {
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
                file.write(buf)
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
            dest.parent.join(pak.repName + '-' + pak.version).rename(dest)

        } finally {
            chdir(current)
            tgzName.remove()
            tarName.remove()
            tempName.remove()
            dest.parent.join(pak.name + '-' + pak.version).removeAll()
        }
    }

    private function configurePak(pak: Pak) {
        let script = pak.cachePath.join('install.es')
        if (script.exists) {
            try {
                dtrace('Run', 'Installation script: ' + script)
                //  TODO - need to trap onerror
                //  TODO - need to set dirs.pakcache, inside the script env
                chdir(pak.sourcePath)
                //  MOB - why run in worker?
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

    private function copyPak(pak: Pak) {
        dtrace('Info', 'Caching "' + pak.name + '" from "' + pak.sourcePath.relative + '" to "' + pak.cachePath + '"')
        if (pak.spec.files) {
            for each (f in pak.spec.files) {
                copyTree(pak.sourcePath, pak.cachePath, pak.spec.ignore, f)
            }
        } else {
            copyTree(pak.sourcePath, pak.cachePath, pak.spec.ignore)
        }
    }

    private function cachePak(pak: Pak) {
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
        pak.spec = Pak.readSpec(pak.cachePath)
        cacheDependencies(pak)
        configurePak(pak)
        trace('Info', pak + ' successfully cached')
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
            if (!(pat is RegExp)) pat = RegExp(pat)
            if (name.match(pat)) {
                return true
            }
        }
        return false
    }

    private function getDeps(pak: Pak, deps = {}, level: Number = 0) {
        pak.resolve()
        if (options.all || level == 0) {
            for (let [name,criteria] in pak.spec.dependencies) {
                let dep = Pak(name)
                dep.setVersionCriteria(criteria)
                getDeps(dep, deps, level + 1)
            }
        }
        if (level > 0) {
            deps[pak.name] = pak
        }
        return deps
    }

    private function printDeps(pak: Pak, prefix: String = '') {
        print('\n' + pak.name + ' dependencies:')
        let deps = getDeps(pak)
        if (Object.getOwnPropertyCount(deps) == 0) {
            print('    none')
        }
        for (let [name, dep] in deps) {
            out.write(prefix)
            out.write('    ' + dep.name + ' ' + dep.versionCriteria + '\n')
        }
    }

    /*
        pak publish # returns token
     */
    function publish(pak: Pak): Void {
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

    private function requiredCachedPak(pak: Pak): Array? {
        let users = []
        for each (path in dirs.pakcache.files('*/*')) {
            let name = path.dirname.basename.toString()
            if (name != pak.name) {
                let spec = Pak.readSpec(path, {quiet: true})
                for (let [dname, criteria] in spec.dependencies) {
                    if (dname == pak.name && pak.version.acceptable(criteria)) {
                        users.append(name)
                    }
                }
            }
        }
        return users.length ? users : null
    }

    private function requiredInstalledPak(pak: Pak): Array? {
        let users = []
        for each (path in ls(dirs.paks, true)) {
            let name = path.basename.toString()
            if (name != pak.name) {
                let spec = Pak.readSpec(path, {quiet: true})
                for (let [other, criteria] in spec.dependencies) {
                    if (other == pak.name && pak.version.acceptable(criteria)) {
                        users.append(name)
                    }
                }
            }
        }
        return users.length ? users : null
    }

    function uninstallPak(pak: Pak): Void {
        if (!args.options.force) {
            if (users = requiredInstalledPak(pak)) {
                throw 'Cannot remove "' + pak + '". It is required by: ' + users.join(', ') + '.'
            }
        }
        if (pak.spec && pak.spec.precious) {
            throw 'Cannot uninstall "' + pak + '" designated as "precious".'
        }
        let script = pak.installPath.join('uninstall.es')
        if (script.exists) {
            try {
                //  MOB - why run in worker?
                trace('Run', 'Uninstall script: ' + script)
                Worker().load(script)
                Worker.join()
            } catch (e) {
                throw 'Cannot uinstall "' + pak + '"\n' + e
            }
        }
        removeDir(pak.installPath, true)
        if (!options.noupdate) {
            let path = Pak.getSpecFile('.')
            let spec = path.readJSON()
            delete spec.dependencies[pak.name]
            path.write(serialize(spec, {pretty: true, indent: 4}))
        }
        trace('Remove', pak.name + ' from ' + pak.installPath)
    }

    //  TODO - check pak usage
    function retract(pak: Pak): Void {
    }

    private function selectRemoteVersion(pak: Pak, criteria: String) {
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
                    pak.setTag(v)
                    pak.setVersion(v)
                    pak.setCachePath()
                }
            }
        }
        if (!found) {
            if (options.force) {
                //  MOB - revise
                dtrace('Warn', 'Desired version not found in catalog for ' + pak.name + ' ' + criteria)
                pak.setVersion(versions[versions.length - 1])
                pak.setCachePath()
            } else {
                throw 'Desired version not found in catalog. ' + criteria
            }
        }
        dtrace('Info', 'Matched ' + pak + ' ' + pak.version + ' from ' + pak.remoteUri)
        if (pak.host != 'github.com') {
            throw 'Repository host "' + pak.host + '" is not support. Only github supported'
        }
        //  TODO pak.setDownloadUri()
        pak.downloadUri = 'https://github.com/' + pak.owner + '/' + pak.repName + '/archive/' + pak.tag + '.tar.gz'
        dtrace('Set', 'Download uri: ' + pak.downloadUri)
    }

    /*
        Search for a pak in remote catalog
        pak can be a path to a physical pak, a bare pak name or a versioned pak name.
     */
    private function searchPak(pak: Pak, exact: Boolean): Array {
        let http = new Http
        let matches = []
        for each (catalog in config.catalogs) {
            vtrace('Info', 'Searching catalog: ' + catalog + ' for ' + pak + '')
            try {
                http.get(catalog)
            } catch (e) {
                trace('Warn', 'Cannot access catalog at: ' + catalog)
            }
            try {
                let index = deserialize(http.response)
                if (index is Array) {
                    let old = index
                    let paks = {}
                    index = {paks:paks}
                    for each (item in old) {
                        paks[item.name] = item.url
                    }
                }
                let remote = index.paks[pak.name]
                if (remote) {
                    /* Exact match */
                    vtrace('Query', pak.name + ' versions at ' + remote)
                    let mpak = Pak(pak.name)
                    mpak.setRemoteEndpoint(remote)
                    let criteria = pak.version || (options.all ? '*' : '^*')
                    selectRemoteVersion(mpak, criteria)
                    matches.push(mpak)
                    return matches
                }
                if (!exact) {
                    for (let [pname, remote] in index.paks) {
                        /* Partial name match */
                        if (pname.contains(pak.name)) {
                            vtrace('Query', pak.name + ' versions at ' + remote)
                            let mpak = Pak(pname)
                            mpak.setRemoteEndpoint(remote)
                            let criteria = pak.version || (options.all ? '*' : '^*')
                            selectRemoteVersion(mpak, criteria)
                            matches.push(mpak)
                        }
                    }
                }
            } catch (e) {
                dtrace('Warn', e)
                trace('Info', 'Cannot find suitable ' + pak.name + ' in catalog: ' + catalog)
            }
        }
        return matches
    }

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
        let spec = Pak.readSpec('.')
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
    function validatePak(pak: Pak): Boolean {
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
                throw 'Cannot find pak for pattern "' + pat + '"'
            }
        }
    }

    function uninstall(patterns): Void {
        let list = []
        for each (path in dirs.paks.files('*')) {
            let pak = Pak(path)
            pak.resolve();
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

    function loadConfig(path: Path): Boolean {
        if (!path.exists) {
            return false
        }
        dtrace('Read', 'Pak config from ' + path)
        blend(config, path.readJSON())
        return true
    }

    /*
        Search order: pakrc : .pakrc : ../.../[pakrc|.pakrc] : package.json (for dirs only)
     */
    function loadRC() {
        if (RC.exists) {
            loadConfig(RC)
        } else if (DOTRC.exists) {
            loadConfig(DOTRC)
        } else {
            let base: Path = '.'
            let d: Path = base
            for ( ; d.parent != d; d = d.parent) {
                let f = d.join(RC)
                if (f.exists) {
                    loadConfig(f)
                    break
                }
                let f = d.join(DOTRC)
                if (f.exists) {
                    loadConfig(f)
                    break
                }
            }
            if (d.parent == d) {
                if (HOME.join(RC).exists) {
                    loadConfig(HOME.join(RC))
                } else if (HOME.join(DOTRC).exists) {
                    loadConfig(HOME.join(DOTRC))
                }
            }
        }
        let base: Path = '.'
        let d: Path = base
        for ( ; d.parent != d; d = d.parent) {
            let f = Pak.getSpecFile(d)
            if (f) {
                let o = f.readJSON()
                dtrace('Read', 'Configuration from: ' + f)
                if (o.dirs && o.dirs.paks) {
                    config.dirs.paks = d.join(o.dirs.paks)
                }
                if (o.catalogs) {
                    config.catalogs = o.catalogs
                }
                break
            }
        }
        if (dirs.pakcache) {
            dirs.pakcache = Path(dirs.pakcache.replace('~', HOME))
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

    function error(msg) App.log.error(msg)

    private var PackageTemplate = {
        name: 'NAME',
        version: '1.0.0',
        description: 'Package Description',
        keywords: [
            'Put search keywords here',
        ],
        dependencies: {
            name: 'version',
        },
        author: {
            name: 'Your name',
            email: 'Your email',
            url: 'Your web',
        },
        bugs: {
            email: 'name@example.com',
            url: 'http://example.com/bugs',
        },
        license: 'GPL',
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
