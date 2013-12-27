# Embedthis Pak

<img align="right" src="http://embedthis.com/images/pak.png">


Pak is a simple package manager for embedding components into ESP/EJS applications. 
It makes it easy to retrieve, integrate and manage components for applications. Pak focusses on embedded applications using
ESP and EJS. It provides tested, integrated componens that work together. It is not intended
as a generic package manager to install complete applications.

Pak implements the CommonJS Package specification and 
uses Git as back-end storage for packages. Pak calls packages "paks". This is not a misspelling.

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
