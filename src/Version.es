/*
    Version - SemVer version parser

    See http://http://semver.org
    This module imposes a limitation on version numbers. Each major, minor or patch number must be less than 999.
  */

module ejs.version {

const MaxVer: Number = 1000000000
const VerFactor: Number = 1000
const StrictSemVer = /(\d+\.\d+\.\d+)(-.*)*$/
const SemVer = /(\d[^.\-]*\.\d[^.\-]*\.\d[^.\-]*)(-.*)*/
const SemCriteria = /((?:\d[^.\-]*|[xX])\.(?:\d[^.\-]*|[xX])\.(?:\d[^.\-]*|[xX]))|(\*)|(^$)/
const SemExpr = /([~^]|<=|<|>=|>|==)*(.+)/

/**
    Version class supporting Semantic Versioning 2.0.0
    @stability prototype
 */
class Version {
    var baseVersion: String?    /* Base version portion without pre-release suffix */
    var preVersion: String?     /* Pre-release version suffix */
    var numberVersion: Number   /* Version string as a number (excludes prerelease) */
    var majorVersion: Number    /* Major version number */
    var minorVersion: Number    /* Minor version number */
    var patchVersion: Number    /* Patch version number */
    var publicVersion: Boolean  /* Version is not a pre-release */
    var ok: Boolean             /* Version is a valid a SemVer */

    /**
        Create and parse a version
        Use valid() to test if the version string was a valid SemVer version.
        @version Version string of the form: N.N.N[-PRE]
     */
    function Version(version: String) {
        version = complete(clean(version))
        try {
            [,baseVersion,preVersion] = version.match(SemVer)
            preVersion ||= ''
            publicVersion = (!preVersion && version.match(StrictSemVer)) || false
            numberVersion = asNumber(baseVersion)
            let [maj,min,pat] = baseVersion.split('.')
            majorVersion = maj
            minorVersion = min
            patchVersion = pat
            ok = true
        } catch {}
    }

    /**
        Test if the constructed version is valid
        @return true if the version was a valid SemVer version.
     */
    function valid() ok

    /**
        Test if the version is acceptable based on the supplied critera.
        @param criteria  The acceptable formats for criteria are:
        <pre>
        VER                             Allows prereleases
        ^ VER                           Same as >=1.2.3 <2.0.0 (does not allow prereleases)
        ~ VER                           Same as >=1.2.3 <2.0.0 (allows prereleases)
        1.2.X                           Any version starting with 1.2
        [>, >=, <, <=, ==, !=] VER
        EXPR || EXPR ...
        EXPR && EXPR ...
        EXPR EXPR ...
        </pre>
        @return true if the version is acceptable
    */
    public function acceptable(criteria): Boolean {
        if (!ok) return false
        for each (range in criteria.split('||')) {
            range = range.trim()
            let allMatched = true
            for each (expr in range.split(/\s*&&\s*|\s+/)) {
                if (!inRange(expr)) {
                    allMatched = false
                    break
                }
            }
            if (allMatched) {
                return true
            }
        }
        return false
    }

    /*
        Test if the version is within the range defined by the version expression
     */
    private function inRange(expr): Boolean {
        let op, ver
        try {
            [,op,partial] = expr.match(SemExpr)
            if (partial == '*') partial = 'x'
            ver = complete(partial)
            [,b,p] = ver.match(SemCriteria)
            if (op == '~' || op == '^') {
                if (op == '^' && !publicVersion) {
                    return false
                }
                let base = partial.split(/(\.)*[xX]/)[0].split('-')[0]
                return baseVersion.startsWith(base)
            }
            if (b.match(/[xX]/)) {
                let low = b.replace(/[xX]/, '0')
                let high = b.replace(/[xX]/, VerFactor - 1)
                return publicVersion && inRange('>=' + low) && inRange('<' + high)
            }
        } catch {
            return false
        }
        let min = 0, max = MaxVer
        if (op == '>') {
            min = asNumber(b) + 1
        } else if (op == '>=') {
            min = asNumber(b)
        } else if (op == '<') {
            max = asNumber(b) - 1
        } else if (op == '<=') {
            max = asNumber(b)
        } else {
            min = max = asNumber(b)
        }
        if (min <= numberVersion && numberVersion <= max && publicVersion) {
            return true
        }
        return false
    }

    /*
        Make the version a full three digits. Map '*' to 0.0.0.
     */
    private static function complete(ver): String {
        if (ver == '*') {
            return '0.0.0'
        }
        ver = ver.split('.')
        for (i = ver.length; i < 3; i++)
            ver.push('0')
        return ver.join('.')
    }

    /*
        Convert a base version (without prerelease) into an integer
     */
    static function asNumber(version: String): Number {
        let parts = version.split('.')
        let patch = 0, minor = 0
        let major = parts[0] cast Number
        if (parts.length > 1) {
            minor = parts[1] cast Number
        }
        if (parts.length > 2) {
            patch = parts[2] cast Number
        }
        return (((major * VerFactor) + minor) * VerFactor) + patch
    }

    /*
        Clean a version string by trimming white space and leading 'v' or '='
     */
    private static function clean(v) v.trim().replace(/^[v=]/, '')

    /*
        Provide a string representation
     */
    public override function toString() baseVersion + preVersion

    private static function numberToVersion(vernum: Number): String {
        let patch = vernum % VerFactor
        vernum /= VerFactor
        let minor = vernum % VerFactor
        vernum /= VerFactor
        let major = vernum % VerFactor
        vernum /= VerFactor
        return '' + major + '.' + minor + '.' + patch
    }

    /**
        Calculate the next sequential patch release
        The current version object is not modified.
        @return The next patch release. 
     */
    function inc() numberToVersion(numberVersion + 1) + pre

    /**
        The public portion of the version without any prereleases qualification
     */
    function get version() baseVersion

    /**
        The version as a single number
     */
    function get number() numberVersion

    /**
        The version is a pre-release version
        This may be due to the version having a pre-release suffix, or if not a pure SemVer version,
        it may have non-number components that indicate a pre-release.
     */
    function get debug(): Boolean publicVersion

    /**
        The major release number portion of the version
     */
    function get major() majorVersion

    /**
        The minor release number portion of the version
     */
    function get minor() minorVersion

    /**
        The minor release number portion of the version
     */
    function get patch() patchVersion

    /**
        The pre-release portion of the version
     */
    function get pre() preVersion

} /* Version */
} /* ejs.version */

/*
    Tests
 */

/*
    MOB - could enable via conditional compilation

require ejs.version
let v

v = Version('')
assert(!v.ok)

v = Version('1')
assert(v.ok)
assert(v == '1.0.0')

v = Version('1.2')
assert(v.ok)
assert(v == '1.2.0')

v = Version('1.x')
assert(!v.ok)

v = Version('1.2.3')
assert(v.ok)
assert(v == '1.2.3')

v = Version('  1.2.3   ')
assert(v.ok)
assert(v == '1.2.3')

v = Version('  =1.2.3')
assert(v.ok)
assert(v == '1.2.3')

v = Version('  v1.2.3')
assert(v.ok)
assert(v == '1.2.3')

v = Version('1.2.3')
assert(v.ok)
assert(v == '1.2.3')
assert(v.version == '1.2.3')
assert(v.pre == '')
assert(v.major == 1)
assert(v.minor == 2)
assert(v.patch == 3)
assert(v.inc() == '1.2.4')

v = Version('1.2.3-debug')
assert(v.ok)
assert(v == '1.2.3-debug')
assert(v.version == '1.2.3')
assert(v.pre == '-debug')
assert(v.major == 1)
assert(v.minor == 2)
assert(v.patch == 3)

v = Version('1.2.3')
assert(v.acceptable('1.2.3'))
assert(v.acceptable('>=1.2.0'))
assert(v.acceptable('>=1.2.3'))

assert(!v.acceptable('>=1.2.4'))
assert(v.acceptable('   >=1.2.0  '))

assert(v.acceptable('<1.2.4'))
assert(v.acceptable('<=1.2.3'))
assert(v.acceptable('<2'))

assert(v.acceptable('>1.2 && <1.3'))
assert(!v.acceptable('>1.2 && <1.2.3'))
assert(v.acceptable('1.2.1 || 1.2.3'))
assert(v.acceptable('1.x'))
assert(!v.acceptable('2.x'))
assert(v.acceptable('1.2.x'))
assert(v.acceptable('~1.2'))
assert(!v.acceptable('~1.3'))
assert(v.acceptable('~1'))
assert(v.acceptable('~1.2'))
assert(v.acceptable('~1.2.3'))
assert(!v.acceptable('~2'))
assert(!v.acceptable('~1.3'))
assert(!v.acceptable('~1.2.4'))
assert(v.acceptable('*'))

assert(Version('1.2.3-debug').acceptable('~1.2.3'))
assert(!Version('1.2.3-debug').acceptable('^1.2.3'))
assert(!Version('1.2.3-debug').acceptable('^*'))

assert(!Version('1.2.3-debug').acceptable('*'))
assert(Version('1.2.3-debug').acceptable('~*'))

assert(!Version('1.2b.3').acceptable('^*'))
assert(!Version('1.2rc1.4').acceptable('^*'))
assert(!Version('1.2.4rc1').acceptable('^*'))
assert(!Version('1.0a').acceptable('1.0.0'))
*/

