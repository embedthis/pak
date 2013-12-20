/*
    Package.es -- Pak package description class
 */

module ejs.pak {

require ejs.unix
require ejs.version

class Package {
    use default namespace public
    var name: String            //  Bare name without version information
    var installPath: Path?      //  Path to installed copy of the pak
    var installed: Boolean      //  True if installed locally
    var cachePath: Path?        //  Path to pak in paks cache (includes version)
    var cached: Boolean         //  True if present in the cache
    var sourcePath: Path        //  Source for the package
    var sourced: Boolean        //  True if source present
    var remoteUri: String       //  Remote repository location
    var downloadUri: String     //  URI to download a version
    var protocol: String
    var host: String
    var owner: String
    var repName: String
    var repTag: String          //  Repository tag for this version
    var spec: Object            //  Package description spec data
    var resolved: Boolean

    var versions: Array?        //  List of available versions
    var installVersion: Version?
    var cacheVersion: Version?
    var remoteVersion: Version?
    var searchCriteria: String?

    /*
        Create a pak description object. Pathname may be a filename, URI, pak name or a versioned pak name
     */
    function Package(path: String) {
        if (path.contains('#')) {
            [path, ver] = path.toString().split('#')
            searchCriteria = ver
        }
        name = Path(path).basename
    }

    /*
        Resolve as much as we can about a package
     */
    function resolve(criteria = null) {
        setInstallPath()
        if (criteria) {
            searchCriteria = criteria
        }
        if (searchCriteria) {
            selectCacheVersion(searchCriteria)
        } else if (cacheVersion) {
            setCachePath()
        }
        loadSpec()
        if (spec && spec.version) {
            installVersion = Version(spec.version)
        }
        resolved = true
    }

    function selectCacheVersion(criteria: String) {
        if (cacheVersion && cacheVersion.acceptable(criteria)) {
            return
        }
        /*
            Pick most recent qualifying version
         */
        for each (path in find(dirs.pakcache, name + '/*', false).reverse()) {
            let candidate = Version(path.basename)
            if (candidate.acceptable(criteria)) {
                cacheVersion = candidate
                break
            }
        }
        setCachePath()
    }

    function setCachePath(path: Path? = null) {
        if (path) {
            cachePath = path
        } else if (cacheVersion && cacheVersion.valid) {
            cachePath = dirs.pakcache.join(name, cacheVersion.toString())
        } else {
            cachePath = null
        }
        if (cachePath && cachePath.exists) {
            if (Package.readSpec(cachePath, {quiet: true})) {
                cached = true
            }
        } else {
            cached = false
        }
    }

    function setDownload(uri: String) {
        downloadUri = uri
        dtrace('Set', 'Download uri: ' + downloadUri)
    }

    function setCacheVersion(ver: String?) {
        if (ver) {
            cacheVersion = Version(ver)
            setCachePath()
        } else {
            cacheVersion = null
        }
    } 

    public function setInstallPath() {
        installPath = dirs.paks.join(name)
        installed = installPath.exists
    }

    function setInstalledVersion(ver: String?) {
        if (ver) {
            installVersion = Version(ver)
        } else {
            installVersion = null
        }
    } 

    function setRemoteVersion(ver: String?) {
        if (ver) {
            remoteVersion = Version(ver)
        } else {
            remoteVersion = null
        }
    } 

    /*
        Set a remote endpoint to download the package. Remote formats examples:  
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
        if (!matches) {
            return false
        }
        try {
            let [,protocol,host,owner,repName] = matches
            this.remoteUri = remote
            this.protocol = protocol
            this.host = host
            this.owner = owner
            this.repName = repName
        } catch {
            return false
        }
        return true
    }

    function setSearchCriteria(criteria: String) {
        searchCriteria = criteria
        selectCacheVersion(searchCriteria)
    }

    function setSource(path: Path) {
        if (!path.exists && Package.getSpecFile(path)) {
            throw 'Pak source at ' + path + ' is missing package.json'
            return
        }
        sourcePath = path
        sourced = sourcePath.exists
        loadSpec()
        if (spec) {
            spec.version ||= '0.0.0'
            cacheVersion = Version(spec.version)
        }
    }

    function setRepTag(tag: String) {
        repTag = tag
    }

    private function loadSpec(path: Path? = null) {
        if (path) {
            spec = Package.readSpec(path)
        } else if (sourcePath && sourcePath.exists) {
            spec = Package.readSpec(sourcePath)
            /* UNUSED - not best place 
            cacheVersion ||= Version(spec.version)
            */
        } else if (installPath && installPath.exists) {
            spec = Package.readSpec(installPath)
        } else if (cachePath && cachePath.exists) {
            spec = Package.readSpec(cachePath, {quiet: true})
        }
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

    public function toString() name

} /* class Package */
} /* ejs.pak */

