# Embedthis Pak

Pak is a generic package manager implementing the CommonJS Package specification.
Pak uses Git as back-end storage for packages.

## Usage

##### Installing packages

    pak install <package>#<version>

##### Uninstalling packages

    pak uninstall <package>#<version>

##### Searching for packages

    pak search <name>

##### Create a new package

    pak create [files...]

##### Build a package

    pak build 

##### List a package's dependencies

    pak depend 

##### Publish a package

    pak publish 

##### Retract a package

    pak retract package <token> 

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

### To run

    make run

    or

    bit run

### To install:

    sudo make install

    or

    sudo bit install

### To uninstall

    sudo make uninstall

    or

    sudo bit uninstall

### To test:

    bit test

Resources
---
  - [Pak Web Site](http://embedthis.com/products/pak/)
  - [Pak GitHub repository](https://github.com/embedthis/pak)
