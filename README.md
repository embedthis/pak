# Embedthis Pak

[![pipeline status](https://gitlab.com/embedthis/pak/badges/master/pipeline.svg)](https://gitlab.com/embedthis/pak/commits/master)
<img align="right" src="https://www.embedthis.com/images/pak/pak-icon-128.png">

Pak is a generic package manager for applications. 
Pak makes it easy to retrieve, integrate and manage components for applications. 

Pak implements the CommonJS Package specification and uses Git as back-end storage for packages. 
Pak calls packages "paks". This is not a misspelling.

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

    Coming soon at https://www.embedthis.com/pak/doc/index.html

### To build with make:

    make

    You can pass make variables to tailor the build. For a list of variables:

    make help

### To build with MakeMe:

    ./configure
    me

    For a list of configure options:

    ./configure --help

### To install:

    sudo make install

    or

    sudo me install

### To uninstall

    sudo make uninstall

    or

    sudo me uninstall

Resources
---
  - [Pak Web Site](https://www.embedthis.com/pak/)
  - [Pak GitHub repository](https://github.com/embedthis/pak)
