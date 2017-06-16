Embedthis Pak(TM)

Welcome to Pak -- the package manager for embedded.

This document contains details regarding the installation procedure for the binary Embedthis Pak package.  This package contains Pak utility. You can read the documentation for the latest release online at:

https://embedthis.com/pak/doc/

This software is copyrighted and distributed under license. Please read the LICENSE.TXT for details.


Table of Contents

* System Requirements
* Installation Package Formats
* Development Environment Platform Support
* Apple MAC OS X  Release Details
* Windows Release Details
* Removing Pak
* Running Pak
* Building from the Source Code
* License and Copyright Information


System Requirements

Operating System Support

    * Windows Windows-7,8 (x86,x64)
    * Mac OS X 10.6+ (x64)
    * Linux 2.6 (x86,x64,arm,ppc,mips)

Installation Package Formats

The Pak binary installation is published in two formats:

    * Native Apple MAC OS X PKG format
    * Native Windows installer format

For other platforms, you will need to download the source code distribution and build then install. The product documentation describes how to build from source. 


Development Environment Platform Support

If you wish to embed Pak in your application or build Pak from source code, you will need to use a C compiler and associated development tools.  Several development environments are supported.  You may choose any of the following:

    * Linux/Unix GNU Tools

    * Windows Visual Studio 2010

    * WindRiver Tornado Development Tools


Apple Mac OS X Release Details

To install the native MAC OS X PKG image:

   1. Download the PKG image.

   2. Double click on the PKG file image.

   3. Answer the questions as prompted.


Windows Release Details

To install the Windows Installer image:

   1. Login with administrator privileges. This is necessary as the binary 
      installation needs to install a Windows Service.

   2. Use WinZip or equivalent software to extract the installation image. This
      will extract the README.TXT and setup.exe from the zip archive.

   3. Double click on the setup.exe image to run it.


Removing Pak

This is the procedure to remove Pak on all systems except Windows.

   1. Run the uninstall script in the install directory for Pak by typing:

      sudo /usr/lib/pak/latest/bin/uninstall

If you installed the Pak Windows Installer image, follow these steps to remove Pak. If you installed the Tar
self-install image, you will need to remove Pak using the procedure described above. 

   1. Login with administrator privileges

   2. Run the Add / Remove Programs applet from the control panel.

   3. Select the Embedthis Pak and choose remove.


Running Pak

    pak [options]

To get all the options for Pak, read the Pak man page via

    man pak

or get the command help via:

    pak --help

Building from the Source Code

If you wish to rebuild the Pak product from the distributed source code, please download the source code distribution from the Embedthis web site. Then read "Building from Source" in the Pak product documentation for an explanation of the necessary steps to successfully rebuild the product.


License and Copyright Information

This software is supplied under license. Both a GNU and commercial license are available. Please read LICENSE.TXT for details. This documentation and the software described in this document may be used and copied only in accordance with the terms of the accompanying license agreement. Product and technical information in this document is subject to change without notice and does not represent a commitment on the part of Embedthis Software LLC.

Copyright (c) Embedthis Software. All Rights Reserved.

Embedthis is a trademark of Embedthis Software LLC. Embedthis, Pak and Ejscript are trademarks of Embedthis Software. All other brand or product names are the trademarks or registered trademarks of their respective holders.


Embedthis Software, LLC.
4616 25th Ave NE, #733
Seattle, WA 98105.
+1 (408) 905-7017
embedthis.com
info@embedthis.com
