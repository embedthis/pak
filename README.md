# Embedthis Pak

Pak is a package manager for ESP/EJS implementing the CommonJS Package specification.
Pak uses Git as back-end storage for packages.

## Usage

##### Installing packages

    pak install <package>
    pak install <package>#<version>
    pak install

##### Uninstalling packages

    pak uninstall <package>#<version>

##### List installed  packages

    pak list

##### List a package's dependencies

    pak depend 

##### Searching for packages

    pak search <name>

##### Publish a package

    pak publish NAME ENDPOINT PASSWORD

##### Retract a package

    pak retract NAME PASSWORD

##### Upgrade a package

    pak upgrade package

Licensing
---
See [LICENSE.md](https://github.com/embedthis/pak/blob/master/LICENSE.md) for details.

### Documentation:

    Coming soon at http://embedthis.com/products/pak/doc/product/index.html

### To build with make:

    make

    You can pass make variables to tailor the build. For a list of variables:

    make help

### To build with Bit:

    ./configure
    bit

    For a list of configure options:

    ./configure --help

### To install:

    sudo make install

    or

    sudo bit install

### To uninstall

    sudo make uninstall

    or

    sudo bit uninstall

Resources
---
  - [Pak Web Site](http://embedthis.com/products/pak/)
  - [Pak GitHub repository](https://github.com/embedthis/pak)
