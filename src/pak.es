#!/usr/bin/env ejs

/*
    pak.es -- Embedthis Pak Package Manager

    Copyright (c) All Rights Reserved. See details at the end of the file.
 */

module ejs.pak {

require ejs.unix
require ejs.tar
require ejs.zlib

const MAX_VER: Number = 1000000000
const VER_FACTOR: Number = 1000
const HOME = Path(App.getenv('HOME') || '.')
var PACKAGE: Path = Path('package.json')

var dirs: Object
var files: Object
var extensions: Object

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
    private var options: Object
    private var out: File = App.outputStream
    private var searchPath: String
    private var tempFile: Path?

    /* This layers over App.config */
    private var defaultConfig = {
        catalogs: [ 
            'http://embedthis.com/pak/catalog',
            // 'https://bower.herokuapp.com/packages',
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
        files: {
            package: PACKAGE,
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
            code: { range: String },
            debug: { alias: 'd'},
            details: {},
            dir: { range: String },
            field: { range: String },
            force: {},
            catalogs: { range: String },
            log: { range: /\w+(:\d)/, value: 'stderr:1' },
            quiet: { alias: 'q' },
            value: { range: String },
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
            '    --catalogs catalog...\n' +
            '    -d, --debug          # Run in debug mode (more verbose)\n' +
            '    --dir                # Change to directory before running\n' +
            '    --force              # Ignore dependencies and continue\n' +
            '    --paks dir           # Use given directory for packs cache\n' +
            '    --log file:level     # Send log output to a file at a given level\n' + 
            '    -q, --quiet          # Run in quiet mode\n' +
            '    -v, --verbose        # Run in verbose mode\n' +
            '  Edit options:\n' + 
            '    --field name         # Package field name to edit \n' +
            '    --value value        # Value to set field to\n' +
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
        for (c in config.catalogs) {
            config.catalogs[c] = Uri(config.catalogs[c])
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
            for each (pak in rest) {
                let path = Path(pak)
                if (path.exists) {
                    cache(Pak.src(pak))
                } else {
                    cache(Pak.remote(pak))
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
                    error("Nothing to install")
                }
                let o = PACKAGE.readJSON()
                for (let [name,version] in o.dependencies) {
                    let pak = Pak.local(name)
                    pak.setVersion(version)
                    pak.cached = false
                    pak.cachePath = null
                    pak.setCachePath()
                    install(pak)
                }
            } else {
                for each (pak in rest) {
                    install(Pak.local(pak))
                }
            }
            break

        case 'list':
            list(rest)
            break

        case 'publish':
            for each (pak in rest) {
                publish(Pak.local(pak))
            }
            break

        case 'prune':
            error('Prune not implemented')
            break

        case 'retract': case 'unpublish':
            for each (pak in rest) {
                retract(Pak.local(pak))
            }
            break

        case 'search':
            for each (pak in rest) {
                search(Pak.remote(pak))
            }
            break

        case 'uninstall':
            uninstall(rest)
            break

        case 'upgrade':
            if (rest.length == 0) {
                for each (path in ls(dirs.pakcache, true)) {
                    upgrade(Pak.local(path))
                }
            } else for each (pak in rest) {
                upgrade(Pak.local(pak))
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
                let out = pak.srcPath.join(pak.name).joinExt(extensions.mod)
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
        if (!PACKAGE.exists) {
            throw 'Missing package.json. Run pak in the directory containing the package description'
        }
        let spec = loadPakSpec('.')
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

    //  TODO - why this routine - why not use pak.cached?
    function checkCached(pak: Pak): Boolean {
        if (pak.cached) {
            return true
        }
        for each (path in find(dirs.pakcache, pak.name + '*', false).sort()) {
            if (pak.name == path.basename.toString()) {
                for each (v in path.files('*', {relative: true}).sort()) {
                    version = makeVersion(v)
                    if (pak.min <= version && version <= pak.max) {
                        if (path.join(v, PACKAGE).exists) {
                            if (!pak.version) {
                                pak.setVersion(v)
                            }
                            return true
                        }
                    }
                }
            }
        }
        return false
    }

    //  TODO - why this routine - why not use pak.installed?
    function checkInstalled(pak: Pak): Boolean {
        for each (path in find(dirs.paks, pak.name + '*', false).sort()) {
            if (pak.name == path.basename.toString()) {
                return true
            }
        }
        return false
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
            let pak = Pak.local(path)
            if (matchPak(pak, patterns)) {
                list.push(pak)
            }
        }
        if (list.length > 0) {
            checkPatterns(patterns, list)
            for each (pak in list) {
                if (pak.localPath.join(PACKAGE).exists) {
                    printDeps(pak)
                }
            }
        } else if (patterns) {
            /*
                Look at cached packs
             */
            for each (path in dirs.pakcache.files('*/*')) {
                let pak = Pak.cache(path)
                if (matchPak(pak, patterns)) {
                    list.push(pak)
                }
            }
            checkPatterns(patterns, list)
            for each (pak in list) {
                if (pak.cachePath.join(PACKAGE).exists) {
                    printDeps(pak)
                }
            }
        } else {
            error('No installed paks matching ' + patterns)
        }
    }

    function edit(path: Path): Void {
        if (!args.options.field) {
            erorr('Missing --field option')
        }
        if (!args.options.value) {
            erorr('Missing --value option')
        }
        let spec = loadPakSpec(path)
        spec[args.options.field] = args.options.value
        path.join(PACKAGE).write(serialize(spec, {pretty: true}))
    }

/* UNUSED
    private function fetchLocal(rep: Path, pak: Pak): Path? {
        let matches = []
        for each (path in find(rep, pak.name + '*', false)) {
            if (!path.isDir) {
                continue
            }
            let candidate = Pak.local(path)
            if (matchPak(candidate, [pak.name])) {
                matches.append(candidate)
            }
        }
        if (matches.length == 0) {
            return null
        }
        matches.sort()
        return rep.join(matches.pop().toString())
    }
*/

    /*
        Fetch a pak from a remote catalog using http
        @options version Qualifying version string

        TODO - eventually will need a web app to support owners of 
     */
    private function fetchRemote(pak: Pak): Path? {
        let http = new Http
        dtrace('Fetch', pak.remoteUri)
        try {
            http.get(pak.remoteUri)
            if (http.code != 200) {
                error('Cannot retrieve ' + url + ', Status: ' + (http.code || 404))
                return null
            }
        } catch (e) {
            error('Cannot retrieve ' + url + '\n' + e.message)
            return null
        }
        tempFile = Path('.').temp()
        tempFile.save(http.resposne)
        return tempFile
    }

    /*
        Cache a pak
        @param pak Name of the pak. can be a bare-pak name, versioned pak-name or a path to a physical pak file
     */
    function cache(pak: Pak) {
        if (checkCached(pak)) {
            if (!args.options.force) {
                trace('Info', (pak.namever || pak.name) + ' is already cached')
                return
            }
        } else {
            dtrace('Info', pak + ' is not yet cached')
        }
        if (!pak.srcPath) {
            let matches = searchPak(pak)
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
            let pak = Pak.cache(path)
            if (matchPak(pak, patterns)) {
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
                out.write(pak.name + ' [' + versions.join(', ') + ']')
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
        if (checkCached(pak)) {
            print('    ', pak.name, pak.version, 'installed')
        } else {
            let matches = searchPak(pak)
            if (matches.length == 0) {
                throw 'Cannot find pak "' + pak + '"'
            }
            for each (match in matches) {
                if (options.versions) {
                    print('    ' + match.name + ' ' + match.remote)
                    print('    Versions:')
                    for each (v in match.versions) {
                        print('        ' + v)
                    }
                } else {
                    print('    ' + match.name + ' ' + match.version + ' ' + match.remoteUri)
                }
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
        Path(PACKAGE).write(serialize(PackageTemplate, {pretty: true}))
    }

    
    /*
        install a pak locally
        Note: this function does not take patterns. For safety, the name of pak must match exactly.
        @param pak Name of the pak. can be a bare-pak name, versioned pak-name or a path to a physical pak file
     */
    function install(pak: Pak) {
        if (checkInstalled(pak)) {
            if (!args.options.force) {
                trace('Info', pak + ' is already installed')
                return
            }
        } else {
            dtrace('Info', pak + ' is not yet installed')
        }
        if (!pak.cached) {
            let matches = searchPak(pak)
            if (matches.length == 0) {
                if (pak.name == '.') {
                    throw 'Cannot find package.json in current directory'
                }
                throw 'Cannot find pak "' + pak + '" to install'
            }
            pak = matches[0]
        }
        installPak(pak)
    }

    private function installPak(pak: Pak): Void {
        trace('Install', pak.namever)
        if (!pak.cached) {
            cachePak(pak)
        }
        let dest = pak.localPath
        dtrace('Info', 'Installing "' + pak.name + '" from "' + pak.cachePath + '" to "' + dest + '"')
        if (dest.exists) {
            dtrace('Rmdir', dest)
            removeDir(dest, true)
        }
        dtrace('Mkdir', dest)
        mkdir(dest)
        copyTree(pak.cachePath, dest)
        dtrace('Info', pak + ' successfully installed')
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
            let pak = Pak.local(path)
            if (matchPak(pak, patterns)) {
                sets[pak.name] = pak
            }
        }
        for each (pak in sets) {
            if (!pak.localPath.join(PACKAGE).exists) {
                continue
            }
            out.write(pak.name)
            if (options.details) {
                out.write(': ')
                print(serialize(pak.spec, {pretty: true, indent: 4}))
            } else if (options.versions) {
                print(' [' + pak.version + ']')
            } else {
                print()
            }
        }
    }

    function showConfig() {
        let o = config.clone()
        let preserve = ['dirs', 'files', 'catalogs']
        for (let [key,value] in o) {
            if (!preserve.contains(key)) {
                delete o[key]
            }
        }
        print('Pak configuration: ' + serialize(o, {pretty: true, quotes: false}))
    }

    function upgrade(pak: Pak? = null) {
        if (!checkCached(pak)) {
            throw 'Pak "' + pak + '" is not installed'
        }
        if (!pak.srcPath) {
            throw 'Cannot find pak "' + pak + '" to upgrade'
        }
        path = queryRemote(rep, pak)
        //  TODO
    }

    private function cacheDependencies(pak: Pak): Boolean {
        let spec = pak.spec
        for (let [other, otherVer] in spec.dependencies) {
            let dep = Pak.cache(other)
            dep.setVersion(otherVer)
            if (!checkCached(dep)) {
                dtrace('Info', 'Caching required dependency ' + dep.name)
                try {
                    dep = Pak.src(dep.name)
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

    private function cachePak(pak: Pak): Void {
        let dest = pak.cachePath
        if (dest.exists) {
            dtrace('Rmdir', dest)
            removeDir(dest, true)
        }
        dtrace('Mkdir', dest)
        mkdir(dest)

        if (!pak.srcPath) {
            let http = new Http
            let current = App.dir
            let tempName = Path('.').temp()
            let tarName = tempName.joinExt('tar', true)
            let tgzName = tarName.joinExt('gz', true)
            try {
                http.followRedirects = true
                dtrace('Get', pak.downloadUri)
                http.get(pak.downloadUri)
                dtrace('Save', 'Response to ' + tgzName.absolute)
                tgzName.write(http.response)
                Zlib.uncompress(tgzName, tarName)
                let tar = new Tar(tarName.absolute)
                chdir(dest.parent)
                dtrace('Extract', 'Extract to ' + dest)
                //  Better to strip first part of file name and extract into the right place first time
                //  Tar options strip: 1
                tar.extract()
                dest.parent.join(pak.name + '-' + pak.version).rename(dest)
            } finally {
                chdir(current)
                //tgzName.remove()
                // tarName.remove()
                // tempName.remove()
                dest.parent.join(pak.name + '-' + pak.version).removeAll()
            }

        } else if (pak.srcPath.isDir) {
            dtrace('Info', 'Caching "' + pak.name + '" from "' + pak.srcPath.relative + '" to "' + dest + '"')
            if (pak.spec.files) {
                for each (f in pak.spec.files) {
                    copyTree(pak.srcPath, pak.cachePath, pak.spec.ignore, f)
                }
            } else {
                copyTree(pak.srcPath, pak.cachePath, pak.spec.ignore)
            }
        } else {
            throw 'Cannot find pack ' + pak.name + ' to install'
        }
        if (!pak.cachePath.join(PACKAGE).exists) {
            throw 'Package missing ' + PACKAGE + ' at ' + pak.cachePath
        }
        pak.spec = loadPakSpec(pak.cachePath)
        cacheDependencies(pak)

        let script = pak.cachePath.join('install.es')
        if (script.exists) {
            try {
                dtrace('Run', 'Installation script: ' + script)
                //  TODO - need to trap onerror
                //  TODO - need to set dirs.pakcache, inside the script env
                chdir(pak.srcPath)
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
            //  TODO - remove these and push into build.es
            installModules(pak)
            installNativeModules(pak)
            installDocumentation(pak)
        }
        //  TODO build source
        //  TODO run tests
        trace('Info', pak + ' successfully installed')
    }

    /*
        Find the most recent version of a pak
        TODO - remove and only use pak.latest
     */
    private function latest(pak: Pak): Pak? {
        let paks = find(dirs.pakcache, pak.name + '/*', false)
        paks = paks.sort()
        if (paks.length > 0) {
            return Pak(paks[0])
        }
        return pak
    }

    private function loadPakSpec(path: Path): Object 
        deserialize(path.join(PACKAGE).readString())

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

    function makeVersion(version: String): Number {
        version = version.trimStart("v")
        if (!version || version == '*') version = 0
        let parts = version.trim().split('.')
        let patch = 0, minor = 0
        let major = parts[0] cast Number
        if (parts.length > 1) {
            minor = parts[1] cast Number
        }
        if (parts.length > 2) {
            patch = parts[2] cast Number
        }
        return (((major * VER_FACTOR) + minor) * VER_FACTOR) + patch
    }

    function makeVersionString(version: Number): String {
        let patch = version % VER_FACTOR
        version /= VER_FACTOR
        let minor = version % VER_FACTOR
        version /= VER_FACTOR
        let major = version % VER_FACTOR
        version /= VER_FACTOR
        return '' + major + '.' + minor + '.' + patch
    }


    /*
        Match a pak name against user specified patterns
     */
    private function matchPak(pak: Pak, patterns: Array): Boolean {
        if (!patterns || patterns.length == 0) {
            return true
        }
        for each (pat in patterns) {
            //  TODO - what about version?
            if (!(pat is RegExp)) pat = RegExp(pat)
            if (pak.name.match(pat)) {
                return true
            }
        }
        return false
    }


    /*
        Given a package description file, print the pak dependencies
     */
    private function getDeps(pak: Pak, deps = {}, level: Number = 0) {
        if (options.all || level == 0) {
            for (let [name,version] in pak.spec.dependencies) {
                let dep = makePak(name, version)
                if (!dep.version) {
                    pak = latest(pak)
                }
                getDeps(dep, deps, level + 1)
            }
        }
        if (level > 0) {
            deps[pak.name] = pak
        }
        return deps
    }

    private function printDeps(pak: Pak, prefix: String = '') {
        print('\nDependencies for ' + pak.name + ':')
        let deps = getDeps(pak)
        if (Object.getOwnPropertyCount(deps) == 0) {
            print('    none')
        }
        for (let [name, dep] in deps) {
            out.write(prefix)
            out.write('    ' + dep.name + ' ' + dep.versionRange())
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

    /*
        Check if this pak is required by any others
        TODO OPT. Should get this from the index?
     */
    private function requiredPak(pak: Pak): Boolean {
        let vnum = makeVersion(pak.version)
        let consumers = []
        for each (path in ls(dirs.pakcache, true)) {
            let name = path.basename.toString()
            if (name != pak.name) {
                let spec = loadPakSpec(path)
                for (let [other, otherVer] in spec.dependencies) {
                    let dep = makePak(other, otherVer)
                    if (dep.name == pak.name && dep.min <= vnum && vnum <= dep.max) {
                        consumers.append(name)
                    }
                }
            }
        }
        if (consumers.length > 0) {
            throw 'Cannot remove "' + pak + '". It is required by: ' + consumers.join(', ')
        }
        return false
    }

    function uninstallPak(pak: Pak): Void {
        if (!args.options.force && requiredPak(pak)) {
            return
        }
        let script = pak.localPath.join('uninstall.es')
        if (script.exists) {
            try {
                trace('Run', 'Uninstall script: ' + script)
                Worker().load(script)
                Worker.join()
            } catch (e) {
                throw 'Cannot uinstall "' + pak + '"\n' + e
            }
        }
        trace('Remove', 'Pak from "' + pak.localPath + '"')
        removeDir(pak.localPath, true)
    }

    //  TODO - check pak usage
    function retract(pak: Pak): Void {
    }

    private function getVersions(pak: Pak, remote) {
        dtrace('Run', [git, 'ls-remote', '--tags', pak.remoteUri].join(' '))
        let data = Cmd.run([git, 'ls-remote', '--tags', pak.remoteUri])
        let versions = data.trim().
            replace(/[ \t]+/g, ' ').
            replace(/^.+refs\/tags\//mg, '').
            split(/[\r\n]+/).
            filter(function(e) !e.match(/\{/))
        pak.versions = versions
        let found 
        for each (v in versions.reverse()) {
            let vnum = makeVersion(v)
            if (pak.min <= vnum && vnum <= pak.max) {
                pak.vertag = v
                pak.setVersion(v)
                pak.setCachePath()
                found = true
                break
            }
        }
        if (!found) {
            if (options.force) {
                dtrace('Warn', 'Selected version not found in catalog for ' + pak.name + ' ' + pak.versionRange())
                pak.setVersion(versions[versions.length - 1])
                pak.setCachePath()
            } else {
                throw 'Selected version not found in catalog. ' + pak.versionRange()
            }
        }
        dtrace('Info', 'Selected version ' + pak.version + ' from catalog')
        if (pak.host != 'github.com') {
            throw 'Repository host "' + pak.host + '" is not support. Only github supported'
        }
        //  TODO pak.setDownloadUri()
        pak.downloadUri = 'https://github.com/' + pak.owner + '/' + pak.repName + '/archive/' + pak.vertag + '.tar.gz'
        dtrace('Set', 'Download URI: ' + pak.downloadUri)
    }

    /*
        Search for a pak in local or remote pak catalogs
        pak can be a path to a physical pak, a bare pak name or a versioned pak name.
     */
    private function searchPak(pak: Pak): Array {
        dtrace('Info', 'Searching catalogs: for ' + pak)
        let http = new Http
        let matches = []
        for each (catalog in config.catalogs) {
            dtrace('Info', 'Checking catalog "' + catalog + '"')
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
                    dtrace('Match', pak.name + ' at ' + remote)
                    pak.setRemote(remote)
                    getVersions(pak, remote)
                    matches.push(pak)
                    return matches
                }
                for (let [name, remote] in index.paks) {
                    if (name.contains(pak.name)) {
                        pak = Pak(name)
                        getVersions(pak, remote)
                        matches.push(pak)
                    }
                }
            } catch (e) {
                dtrace('Warn', e)
                trace('Warn', 'Cannot find suitable ' + pak.name + ' in catalog: ' + catalog)
            }
        }
        return matches
    }

    /*
        Set package dependencies based on module files. Uses exact versioning.
     */
    private function setdeps() {
        if (!PACKAGE.exists) {
            throw 'Missing ' + PACKAGE + '. Run pak in the directory containing the package description file'
        }
        moddeps = []
        for each (f in args.rest) {
            moddeps += Cmd.sh('ejsmod --depends ' + f).trim().split(' ')
        }
        let spec = loadPakSpec('.')
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

//  TODO - who uses this?
    function validatePak(pak: Pak): Boolean {
        let requiredFiles = [ PACKAGE ]
        for each (file in requiredFiles) {
            let path = pak.srcPath.join(file)
            if (!exists(path) && !path.isDir) {
                throw 'Pak is missing required files "' + file + '"'
            }
        }
        let requiredDirs = [ 'modules', 'doc', 'test' ]
        for each (file in requiredFiles) {
            let path = pak.srcPath.join(file)
            if (!exists(path) && !path.isDir) {
                throw 'Pak is missing required directory "' + file + '"'
            }
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

    function checkPatterns(patterns, list) {
        for each (pat in patterns) {
            let found
            for each (pak in list) {
                if ((matched = matchPak(pak, patterns)) == true) {
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
            let pak = Pak.local(path)
            if (matchPak(pak, patterns)) {
                list.push(pak)
                if (!checkInstalled(pak)) {
                    if (!args.options.force) {
                        throw 'Pak "' + pak + '" is not installed'
                    }
                }
            }
        }
        checkPatterns(patterns, list)
        for each (pak in list) {
            uninstallPak(pak)
        }
    }

    function loadConfig(path: Path): Boolean {
        if (!path.exists) {
            return false
        }
        dtrace('Read', 'Configuration from: ' + path)
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
        PACKAGE = files.package
        if (PACKAGE.exists) {
            let o = PACKAGE.readJSON()
            dtrace('Read', 'Configuration from: ' + PACKAGE)
            if (o.dirs && o.dirs.paks) {
                config.dirs.paks = o.dirs.paks
            }
            if (o.catalogs) {
                config.catalogs = o.catalogs
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
        rmdir(path, contents)
    }

    function error(msg) {
        App.log.error(msg)
    }

    private var PackageTemplate = {
        name: 'NAME',
        version: '1.0.0',
        description: 'Package Description',
        keywords: [
            'Put search keywords here',
        ],
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
        dependencies: {
            name: 'version',
        },
    }
}

/*
    Describe a pak name
 */
class Pak {
    var name: String            //  Bare name without version information
    var namever: Path?          //  Name # version

    var localPath: Path?        //  Path to local copy of the pak
    var installed: Boolean      //  True if present in local dir

    var cachePath: Path?        //  Path to pak in paks cache (includes version)
    var cached: Boolean         //  True if present in the cache

    var srcPath: Path           //  Source for Pak

    var versions: Array?        //  List of available versions
    var remoteUri: Uri          //  Remote repository location

    var downloadUri: Uri        //  URI to download a version
    var version: String?        //  Actual version of the pak
    var min: Number             //  Minimum acceptable version
    var max: Number             //  Maximum acceptable version
    var vernum: Number?         //  Version as a number
    var vertag: String?         //  Git version tag
    var spec: Object            //  Pak description spec data

    var protocol: String
    var host: String
    var owner: String
    var repName: String

    /*
        Create a pak description object. Pathname may be a filename, URI, pak name or a versioned pak name
     */
    function Pak(path: String, version: String? = null) {
        if (path.contains('#')) {
            [path, version] = path.toString().split('#')
            path = Path(path)
        }
        name = path
        if (version) {
            setVersion(version)
        }
    }

    //  TODO - need to support ~, ranges and other semvar matches
    function setVersion(version: String) {
        version = version.trimStart('v')
        this.version = null
        this.vernum = null
        this.namever = null
        max = min = 0
        if (version.contains('<=')) {
            max = makeVersion(version.split('<=')[1])
        } else if (version.contains('<')) {
            max = makeVersion(version.split('<')[1]) -1
        } else if (version.contains('>=')) {
            min = makeVersion(version.split('>=')[1])
        } else if (version.contains('>')) {
            min = makeVersion(version.split('>')[1]) + 1
        } else if (version.contains('==')) {
            max = min = makeVersion(version.split('==')[1])
        } else {
            max = min = makeVersion(version)
        }
        if (max == 0) {
            max = MAX_VER
        }
        if (version.match(/^\d.\d.\d[-]*/)) {
            this.version = version
            this.vernum = makeVersion(version)
            this.namever = this.name + '#' + this.version
        }
        setCachePath()
    }

    function setCachePath() {
        let pak = this
        pak.cachePath = null
        pak.cached = false
        if (pak.version) {
            pak.cachePath = dirs.pakcache.join(pak.name, pak.version)
        }
        if (pak.cachePath && pak.cachePath.exists) {
            let package = pak.cachePath.join(PACKAGE)
            if (package.exists) {
                pak.cached = true
                if (!pak.spec) {
                    pak.spec = pak.cachePath.join(PACKAGE).readJSON()
                }
            }
        }
    }

    static function local(path: Path): Pak {
        let version
        if (path.contains('#')) {
            [path, version] = path.toString().split('#')
            path = Path(path)
        }
        let name = path.basename
        if (!version) {
            version = Pak.latestCachedVersion(name)
        }
        let pak: Pak = new Pak(name, version)
        if (!path.exists) {
            path = dirs.paks.join(path)
        }
        pak.localPath = path
        let package = path.join(PACKAGE)
        if (path.exists) {
            if (!package.exists && pak.version) {
                package = path.join(pak.version, PACKAGE)
            }
            if (package.exists) {
                let obj = package.readJSON()
                if (!obj.version) {
                    obj.version = '0.0.0'
                }
                let vnum = makeVersion(obj.version)
                //  TODO - create inRange function
                if (obj.name == pak.name && pak.min <= vnum && vnum <= pak.max) {
                    pak.name = obj.name
                    pak.installed = true
                    pak.spec = obj
                    pak.setVersion(obj.version)
                    pak.setCachePath()
                }
            }
        }
        pak.setCachePath()
        return pak
    }

    static function src(path: Path): Pak {
        let pak: Pak = new Pak(path.basename)
        if (path.exists) {
            let package = path.join(PACKAGE)
            if (!package.exists && pak.version) {
                package = path.join(pak.version, PACKAGE)
            }
            if (package.exists) {
                let obj = package.readJSON()
                if (!obj.version) {
                    obj.version = '0.0.0'
                }
                let vnum = makeVersion(obj.version)
                pak.name = obj.name
                pak.spec = obj
                pak.srcPath = path.absolute
                pak.setVersion(obj.version)
                pak.setCachePath()
            }
        }
        return pak
    }

    static function remote(path: Path): Pak {
        let version
        if (path.contains('#')) {
            [path, version] = path.toString().split('#')
            path = Path(path)
        }
        let pak: Pak = new Pak(path.basename, version)
        pak.setCachePath()
        return pak
    }

    /*
        Called with an actual cache path '.../name/version'
     */
    static function cache(path: Path): Pak {
        let version = path.basename
        path = path.dirname
        let pak: Pak = new Pak(path.basename, version)
        pak.setCachePath()
        return pak;
    }

    public override function toString(): String {
        return name
    }

    public static function latestCachedVersion(name: String): Path? {
        let paks = find(dirs.pakcache, name + '/*', false)
        paks = paks.sort()
        if (paks.length > 0) {
            return paks[0].basename
        }
        return null
    }

    static function makeVersion(version: String): Number {
        version = version.trimStart("v")
        if (!version || version == '*') version = 0
        let parts = version.trim().split('.')
        let patch = 0, minor = 0
        let major = parts[0] cast Number
        if (parts.length > 1) {
            minor = parts[1] cast Number
        }
        if (parts.length > 2) {
            patch = parts[2] cast Number
        }
        return (((major * VER_FACTOR) + minor) * VER_FACTOR) + patch
    }

    public function setRemote(remote: String) {
        let matches = RegExp('([^:]+):\/\/([^\/]+)\/([^\/]+)\/([^\/]+).git').exec(remote)
        try {
            let [,protocol,host,owner,repName] = matches
            this.remoteUri = remote
            this.protocol = protocol
            this.host = host
            this.owner = owner
            this.repName = repName
        } catch {
            throw 'Remote URI does not match expected format: ' + remote
        }
    }

    public function versionRange(): String {
        let result = ''
        if (min) {
            if (max == undefined || min == max) {
                result += makeVersionString(min)
            } else if (max == MAX_VER) {
                result += '>= ' + makeVersionString(min)
            } else {
                result += '>= ' + makeVersionString(min) + ', <= ' + makeVersionString(max + 1)
            }
        }
        return result
    }

    //  TODO should not replicate
    function makeVersionString(version: Number): String {
        let patch = version % VER_FACTOR
        version /= VER_FACTOR
        let minor = version % VER_FACTOR
        version /= VER_FACTOR
        let major = version % VER_FACTOR
        version /= VER_FACTOR
        return '' + major + '.' + minor + '.' + patch
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
