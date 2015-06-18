/*
    me.h -- MakeMe Configure Header for linux-x86-default

    This header is created by Me during configuration. To change settings, re-run
    configure or define variables in your Makefile to override these default values.
 */

/* Settings */
#ifndef ME_AUTHOR
    #define ME_AUTHOR "Embedthis Software"
#endif
#ifndef ME_CERTS_BITS
    #define ME_CERTS_BITS 2048
#endif
#ifndef ME_CERTS_DAYS
    #define ME_CERTS_DAYS 3650
#endif
#ifndef ME_CERTS_GENDH
    #define ME_CERTS_GENDH 0
#endif
#ifndef ME_COMPANY
    #define ME_COMPANY "embedthis"
#endif
#ifndef ME_COMPATIBLE
    #define ME_COMPATIBLE "0.11"
#endif
#ifndef ME_COMPILER_HAS_ATOMIC
    #define ME_COMPILER_HAS_ATOMIC 0
#endif
#ifndef ME_COMPILER_HAS_ATOMIC64
    #define ME_COMPILER_HAS_ATOMIC64 0
#endif
#ifndef ME_COMPILER_HAS_DOUBLE_BRACES
    #define ME_COMPILER_HAS_DOUBLE_BRACES 0
#endif
#ifndef ME_COMPILER_HAS_DYN_LOAD
    #define ME_COMPILER_HAS_DYN_LOAD 1
#endif
#ifndef ME_COMPILER_HAS_LIB_EDIT
    #define ME_COMPILER_HAS_LIB_EDIT 0
#endif
#ifndef ME_COMPILER_HAS_LIB_RT
    #define ME_COMPILER_HAS_LIB_RT 1
#endif
#ifndef ME_COMPILER_HAS_MMU
    #define ME_COMPILER_HAS_MMU 1
#endif
#ifndef ME_COMPILER_HAS_MTUNE
    #define ME_COMPILER_HAS_MTUNE 1
#endif
#ifndef ME_COMPILER_HAS_PAM
    #define ME_COMPILER_HAS_PAM 0
#endif
#ifndef ME_COMPILER_HAS_STACK_PROTECTOR
    #define ME_COMPILER_HAS_STACK_PROTECTOR 1
#endif
#ifndef ME_COMPILER_HAS_SYNC
    #define ME_COMPILER_HAS_SYNC 1
#endif
#ifndef ME_COMPILER_HAS_SYNC64
    #define ME_COMPILER_HAS_SYNC64 1
#endif
#ifndef ME_COMPILER_HAS_SYNC_CAS
    #define ME_COMPILER_HAS_SYNC_CAS 0
#endif
#ifndef ME_COMPILER_HAS_UNNAMED_UNIONS
    #define ME_COMPILER_HAS_UNNAMED_UNIONS 1
#endif
#ifndef ME_COMPILER_WARN64TO32
    #define ME_COMPILER_WARN64TO32 0
#endif
#ifndef ME_COMPILER_WARN_UNUSED
    #define ME_COMPILER_WARN_UNUSED 1
#endif
#ifndef ME_DEBUG
    #define ME_DEBUG 1
#endif
#ifndef ME_DEPTH
    #define ME_DEPTH 1
#endif
#ifndef ME_DESCRIPTION
    #define ME_DESCRIPTION "Embedthis Pak Manager"
#endif
#ifndef ME_EJS_ONE_MODULE
    #define ME_EJS_ONE_MODULE 1
#endif
#ifndef ME_EJSCRIPT_DB
    #define ME_EJSCRIPT_DB 0
#endif
#ifndef ME_EJSCRIPT_MAIL
    #define ME_EJSCRIPT_MAIL 0
#endif
#ifndef ME_EJSCRIPT_MAPPER
    #define ME_EJSCRIPT_MAPPER 0
#endif
#ifndef ME_EJSCRIPT_SHELL
    #define ME_EJSCRIPT_SHELL 0
#endif
#ifndef ME_EJSCRIPT_TAR
    #define ME_EJSCRIPT_TAR 1
#endif
#ifndef ME_EJSCRIPT_TEMPLATE
    #define ME_EJSCRIPT_TEMPLATE 0
#endif
#ifndef ME_EJSCRIPT_WEB
    #define ME_EJSCRIPT_WEB 0
#endif
#ifndef ME_EJSCRIPT_ZLIB
    #define ME_EJSCRIPT_ZLIB 1
#endif
#ifndef ME_ESFLAGS
    #define ME_ESFLAGS ""
#endif
#ifndef ME_HTTP_PAM
    #define ME_HTTP_PAM 0
#endif
#ifndef ME_INTEGRATE
    #define ME_INTEGRATE 1
#endif
#ifndef ME_MANIFEST
    #define ME_MANIFEST "installs/manifest.me"
#endif
#ifndef ME_MPR_LOGGING
    #define ME_MPR_LOGGING 1
#endif
#ifndef ME_NAME
    #define ME_NAME "pak"
#endif
#ifndef ME_PLATFORMS
    #define ME_PLATFORMS "local"
#endif
#ifndef ME_PREFIXES
    #define ME_PREFIXES "install-prefixes"
#endif
#ifndef ME_TITLE
    #define ME_TITLE "Embedthis Pak"
#endif
#ifndef ME_TUNE
    #define ME_TUNE "speed"
#endif
#ifndef ME_VERSION
    #define ME_VERSION "0.11.2"
#endif

/* Prefixes */
#ifndef ME_ROOT_PREFIX
    #define ME_ROOT_PREFIX "/"
#endif
#ifndef ME_BASE_PREFIX
    #define ME_BASE_PREFIX "/usr/local"
#endif
#ifndef ME_DATA_PREFIX
    #define ME_DATA_PREFIX "/"
#endif
#ifndef ME_STATE_PREFIX
    #define ME_STATE_PREFIX "/var"
#endif
#ifndef ME_APP_PREFIX
    #define ME_APP_PREFIX "/usr/local/lib/pak"
#endif
#ifndef ME_VAPP_PREFIX
    #define ME_VAPP_PREFIX "/usr/local/lib/pak/0.11.2"
#endif
#ifndef ME_BIN_PREFIX
    #define ME_BIN_PREFIX "/usr/local/bin"
#endif
#ifndef ME_INC_PREFIX
    #define ME_INC_PREFIX "/usr/local/include"
#endif
#ifndef ME_LIB_PREFIX
    #define ME_LIB_PREFIX "/usr/local/lib"
#endif
#ifndef ME_MAN_PREFIX
    #define ME_MAN_PREFIX "/usr/local/share/man"
#endif
#ifndef ME_SBIN_PREFIX
    #define ME_SBIN_PREFIX "/usr/local/sbin"
#endif
#ifndef ME_ETC_PREFIX
    #define ME_ETC_PREFIX "/etc/pak"
#endif
#ifndef ME_WEB_PREFIX
    #define ME_WEB_PREFIX "/var/www/pak"
#endif
#ifndef ME_LOG_PREFIX
    #define ME_LOG_PREFIX "/var/log/pak"
#endif
#ifndef ME_SPOOL_PREFIX
    #define ME_SPOOL_PREFIX "/var/spool/pak"
#endif
#ifndef ME_CACHE_PREFIX
    #define ME_CACHE_PREFIX "/var/spool/pak/cache"
#endif
#ifndef ME_SRC_PREFIX
    #define ME_SRC_PREFIX "pak-0.11.2"
#endif

/* Suffixes */
#ifndef ME_EXE
    #define ME_EXE ""
#endif
#ifndef ME_SHLIB
    #define ME_SHLIB ".so"
#endif
#ifndef ME_SHOBJ
    #define ME_SHOBJ ".so"
#endif
#ifndef ME_LIB
    #define ME_LIB ".a"
#endif
#ifndef ME_OBJ
    #define ME_OBJ ".o"
#endif

/* Profile */
#ifndef ME_CONFIG_CMD
    #define ME_CONFIG_CMD "me -d -q -platform linux-x86-default -configure . --with openssl -gen make"
#endif
#ifndef ME_PAK_PRODUCT
    #define ME_PAK_PRODUCT 1
#endif
#ifndef ME_PROFILE
    #define ME_PROFILE "default"
#endif
#ifndef ME_TUNE_SPEED
    #define ME_TUNE_SPEED 1
#endif

/* Miscellaneous */
#ifndef ME_MAJOR_VERSION
    #define ME_MAJOR_VERSION 0
#endif
#ifndef ME_MINOR_VERSION
    #define ME_MINOR_VERSION 11
#endif
#ifndef ME_PATCH_VERSION
    #define ME_PATCH_VERSION 2
#endif
#ifndef ME_VNUM
    #define ME_VNUM 90002
#endif

/* Components */
#ifndef ME_COM_CC
    #define ME_COM_CC 1
#endif
#ifndef ME_COM_EJS
    #define ME_COM_EJS 1
#endif
#ifndef ME_COM_EJSCRIPT
    #define ME_COM_EJSCRIPT 1
#endif
#ifndef ME_COM_HTTP
    #define ME_COM_HTTP 1
#endif
#ifndef ME_COM_LIB
    #define ME_COM_LIB 1
#endif
#ifndef ME_COM_MATRIXSSL
    #define ME_COM_MATRIXSSL 0
#endif
#ifndef ME_COM_MBEDTLS
    #define ME_COM_MBEDTLS 0
#endif
#ifndef ME_COM_MPR
    #define ME_COM_MPR 1
#endif
#ifndef ME_COM_NANOSSL
    #define ME_COM_NANOSSL 0
#endif
#ifndef ME_COM_OPENSSL
    #define ME_COM_OPENSSL 1
#endif
#ifndef ME_COM_OSDEP
    #define ME_COM_OSDEP 1
#endif
#ifndef ME_COM_PCRE
    #define ME_COM_PCRE 1
#endif
#ifndef ME_COM_SQLITE
    #define ME_COM_SQLITE 0
#endif
#ifndef ME_COM_SSL
    #define ME_COM_SSL 1
#endif
#ifndef ME_COM_VXWORKS
    #define ME_COM_VXWORKS 0
#endif
#ifndef ME_COM_WINSDK
    #define ME_COM_WINSDK 1
#endif
#ifndef ME_COM_ZLIB
    #define ME_COM_ZLIB 1
#endif
