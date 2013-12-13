/*
    Describe a pak name
    MOB - extract into separate file
 */

module ejs.pak {

require ejs.unix
require ejs.version

class Pak {
    use default namespace public
    var name: String            //  Bare name without version information
    var version: Version
    var installPath: Path?      //  Path to installed copy of the pak
    var installed: Boolean      //  True if installed locally
    var cachePath: Path?        //  Path to pak in paks cache (includes version)
    var cached: Boolean         //  True if present in the cache
    var sourcePath: Path        //  Source for Pak
    var sourced: Boolean        //  True if source present
    var remoteUri: String       //  Remote repository location
    var downloadUri: String     //  URI to download a version
    var protocol: String
    var host: String
    var owner: String
    var repName: String
    var tag: String             //  Repository tag for this version
    var spec: Object            //  Pak description spec data
    var versionCriteria: String //  Required version criteria expression
    var resolved: Boolean

    var versions: Array?        //  List of available versions

    /*
        Create a pak description object. Pathname may be a filename, URI, pak name or a versioned pak name
     */
    function Pak(path: String) {
        if (path.contains('#')) {
            [path, ver] = path.toString().split('#')
            version = Version(ver)
        }
        name = Path(path).basename
    }

    function loadSpec(path: Path? = null) {
        if (path) {
            spec = Pak.readSpec(path)
        } else if (sourcePath && sourcePath.exists) {
            spec = Pak.readSpec(sourcePath)
        } else if (installPath && installPath.exists) {
            spec = Pak.readSpec(installPath)
        } else if (cachePath && cachePath.exists) {
            spec = Pak.readSpec(cachePath, {quiet: true})
        }
        if (spec) {
            version = Version(spec.version || '0.0.0')
            setCachePath()
        }
    }

    /*
        Resolve as much as we can about a Pak
     */
    function resolve() {
        setInstallPath()
        if (version) {
            setCachePath(dirs.pakcache.join(name, version.toString()))
        } else {
            setCachePath(dirs.pakcache.join(name).files('*').reverse()[0])
        }
        loadSpec()
        resolved = true
    }

    function same(ver: String) pak.version == ver

    function setCachePath(path: Path? = null) {
        if (path) {
            cachePath = path
        } else if (version) {
            cachePath = dirs.pakcache.join(name, version.toString())
        }
        if (cachePath) {
            cached = cachePath.exists
        }
    }

    function setDownload(uri: String)
        downloadUri = uri

    public function setInstallPath() {
        installPath = dirs.paks.join(name)
        installed = installPath.exists
    }

    /*
        Set a remote endpoint to download the Pak. Remote formats examples:  
        https://github.com/embedthis/pak-bit.git
        git@github.com:embedthis/pak-esp-gui.git
     */
    function setRemoteEndpoint(remote: String) {
        let matches
        if (remote.contains('://')) {
            matches = RegExp('([^:]+):\/\/([^\/]+)\/([^\/]+)\/([^\/]+).git').exec(remote)
        } else {
            matches = RegExp('([^@]+)@([^\/]+):([^\/]+)\/([^\/]+).git').exec(remote)
        }
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

    function setSource(path: Path) {
        if (!path.exists && Pak.getSpecFile(path)) {
            return
        }
        sourcePath = path
        sourced = sourcePath.exists
    }

    function setTag(tag: String) {
        this.tag = tag
    }

    function setVersion(ver: String) {
        version = Version(ver)
    } 

//UNUSED
    static function latestCachedVersion() {
        let names = find(dirs.pakcache, name + '/*', false)
        names = names.sort()
        if (names.length > 0) {
            return names[0].basename
        }
        return null
    }
    
    function setVersionCriteria(criteria) {
        if (!resolved) {
            resolve()
        }
        versionCriteria = criteria
        if (version && version.acceptable(criteria)) {
            return
        }
        for each (path in find(dirs.pakcache, name + '/*', false).reverse()) {
            let candidate = Version(path.basename)
            if (candidate.acceptable(criteria)) {
                version = candidate
                break
            }
        }
        setCachePath()
    }

    public function toString() name

    function get namever() {
        if (version) {
            return name + '#' + version
        }
        return name
    }

    static function readSpec(path: Path?, options = {}): Object {
        if (!path) {
            return null
        }
        for each (name in PakFiles) {
            let f = path.join(name)
            if (f.exists) {
                if (!options.quiet) dtrace('Read', f)
                return deserialize(f.readString())
            }
        }
        return null
    }

    public static function getSpecFile(path: Path): Path? {
        for each (pname in PakFiles) {
            let f = path.join(pname)
            if (f.exists) {
                return f
            }
        }
        return null
    }
} /* class Pak */
} /* ejs.pak */

