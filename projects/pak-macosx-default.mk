#
#   pak-macosx-default.mk -- Makefile to build Embedthis Pak for macosx
#

NAME                  := pak
VERSION               := 0.11.2
PROFILE               ?= default
ARCH                  ?= $(shell uname -m | sed 's/i.86/x86/;s/x86_64/x64/;s/arm.*/arm/;s/mips.*/mips/')
CC_ARCH               ?= $(shell echo $(ARCH) | sed 's/x86/i686/;s/x64/x86_64/')
OS                    ?= macosx
CC                    ?= clang
CONFIG                ?= $(OS)-$(ARCH)-$(PROFILE)
BUILD                 ?= build/$(CONFIG)
LBIN                  ?= $(BUILD)/bin
PATH                  := $(LBIN):$(PATH)

ME_COM_COMPILER       ?= 1
ME_COM_EJSCRIPT       ?= 1
ME_COM_HTTP           ?= 1
ME_COM_LIB            ?= 1
ME_COM_MATRIXSSL      ?= 0
ME_COM_MBEDTLS        ?= 1
ME_COM_MPR            ?= 1
ME_COM_NANOSSL        ?= 0
ME_COM_OPENSSL        ?= 0
ME_COM_OSDEP          ?= 1
ME_COM_PCRE           ?= 1
ME_COM_SQLITE         ?= 0
ME_COM_SSL            ?= 1
ME_COM_VXWORKS        ?= 0
ME_COM_WINSDK         ?= 1
ME_COM_ZLIB           ?= 1

ME_COM_OPENSSL_PATH   ?= "/usr/lib"

ifeq ($(ME_COM_LIB),1)
    ME_COM_COMPILER := 1
endif
ifeq ($(ME_COM_MBEDTLS),1)
    ME_COM_SSL := 1
endif
ifeq ($(ME_COM_OPENSSL),1)
    ME_COM_SSL := 1
endif
ifeq ($(ME_COM_EJSCRIPT),1)
    ME_COM_ZLIB := 1
endif

CFLAGS                += -g -w
DFLAGS                +=  $(patsubst %,-D%,$(filter ME_%,$(MAKEFLAGS))) -DME_COM_COMPILER=$(ME_COM_COMPILER) -DME_COM_EJSCRIPT=$(ME_COM_EJSCRIPT) -DME_COM_HTTP=$(ME_COM_HTTP) -DME_COM_LIB=$(ME_COM_LIB) -DME_COM_MATRIXSSL=$(ME_COM_MATRIXSSL) -DME_COM_MBEDTLS=$(ME_COM_MBEDTLS) -DME_COM_MPR=$(ME_COM_MPR) -DME_COM_NANOSSL=$(ME_COM_NANOSSL) -DME_COM_OPENSSL=$(ME_COM_OPENSSL) -DME_COM_OSDEP=$(ME_COM_OSDEP) -DME_COM_PCRE=$(ME_COM_PCRE) -DME_COM_SQLITE=$(ME_COM_SQLITE) -DME_COM_SSL=$(ME_COM_SSL) -DME_COM_VXWORKS=$(ME_COM_VXWORKS) -DME_COM_WINSDK=$(ME_COM_WINSDK) -DME_COM_ZLIB=$(ME_COM_ZLIB) 
IFLAGS                += "-I$(BUILD)/inc"
LDFLAGS               += '-Wl,-rpath,@executable_path/' '-Wl,-rpath,@loader_path/'
LIBPATHS              += -L$(BUILD)/bin
LIBS                  += -ldl -lpthread -lm

DEBUG                 ?= debug
CFLAGS-debug          ?= -g
DFLAGS-debug          ?= -DME_DEBUG
LDFLAGS-debug         ?= -g
DFLAGS-release        ?= 
CFLAGS-release        ?= -O2
LDFLAGS-release       ?= 
CFLAGS                += $(CFLAGS-$(DEBUG))
DFLAGS                += $(DFLAGS-$(DEBUG))
LDFLAGS               += $(LDFLAGS-$(DEBUG))

ME_ROOT_PREFIX        ?= 
ME_BASE_PREFIX        ?= $(ME_ROOT_PREFIX)/usr/local
ME_DATA_PREFIX        ?= $(ME_ROOT_PREFIX)/
ME_STATE_PREFIX       ?= $(ME_ROOT_PREFIX)/var
ME_APP_PREFIX         ?= $(ME_BASE_PREFIX)/lib/$(NAME)
ME_VAPP_PREFIX        ?= $(ME_APP_PREFIX)/$(VERSION)
ME_BIN_PREFIX         ?= $(ME_ROOT_PREFIX)/usr/local/bin
ME_INC_PREFIX         ?= $(ME_ROOT_PREFIX)/usr/local/include
ME_LIB_PREFIX         ?= $(ME_ROOT_PREFIX)/usr/local/lib
ME_MAN_PREFIX         ?= $(ME_ROOT_PREFIX)/usr/local/share/man
ME_SBIN_PREFIX        ?= $(ME_ROOT_PREFIX)/usr/local/sbin
ME_ETC_PREFIX         ?= $(ME_ROOT_PREFIX)/etc/$(NAME)
ME_WEB_PREFIX         ?= $(ME_ROOT_PREFIX)/var/www/$(NAME)
ME_LOG_PREFIX         ?= $(ME_ROOT_PREFIX)/var/log/$(NAME)
ME_SPOOL_PREFIX       ?= $(ME_ROOT_PREFIX)/var/spool/$(NAME)
ME_CACHE_PREFIX       ?= $(ME_ROOT_PREFIX)/var/spool/$(NAME)/cache
ME_SRC_PREFIX         ?= $(ME_ROOT_PREFIX)$(NAME)-$(VERSION)


ifeq ($(ME_COM_EJSCRIPT),1)
    TARGETS           += $(BUILD)/bin/ejs.mod
endif
TARGETS               += $(BUILD)/.install-certs-modified
TARGETS               += $(BUILD)/bin/pak

unexport CDPATH

ifndef SHOW
.SILENT:
endif

all build compile: prep $(TARGETS)

.PHONY: prep

prep:
	@echo "      [Info] Use "make SHOW=1" to trace executed commands."
	@if [ "$(CONFIG)" = "" ] ; then echo WARNING: CONFIG not set ; exit 255 ; fi
	@if [ "$(ME_APP_PREFIX)" = "" ] ; then echo WARNING: ME_APP_PREFIX not set ; exit 255 ; fi
	@[ ! -x $(BUILD)/bin ] && mkdir -p $(BUILD)/bin; true
	@[ ! -x $(BUILD)/inc ] && mkdir -p $(BUILD)/inc; true
	@[ ! -x $(BUILD)/obj ] && mkdir -p $(BUILD)/obj; true
	@[ ! -f $(BUILD)/inc/me.h ] && cp projects/pak-macosx-default-me.h $(BUILD)/inc/me.h ; true
	@if ! diff $(BUILD)/inc/me.h projects/pak-macosx-default-me.h >/dev/null ; then\
		cp projects/pak-macosx-default-me.h $(BUILD)/inc/me.h  ; \
	fi; true
	@if [ -f "$(BUILD)/.makeflags" ] ; then \
		if [ "$(MAKEFLAGS)" != "`cat $(BUILD)/.makeflags`" ] ; then \
			echo "   [Warning] Make flags have changed since the last build" ; \
			echo "   [Warning] Previous build command: "`cat $(BUILD)/.makeflags`"" ; \
		fi ; \
	fi
	@echo "$(MAKEFLAGS)" >$(BUILD)/.makeflags

clean:
	rm -f "$(BUILD)/obj/ejs.o"
	rm -f "$(BUILD)/obj/ejsLib.o"
	rm -f "$(BUILD)/obj/ejsc.o"
	rm -f "$(BUILD)/obj/http.o"
	rm -f "$(BUILD)/obj/httpLib.o"
	rm -f "$(BUILD)/obj/mbedtls.o"
	rm -f "$(BUILD)/obj/mbedtlsLib.o"
	rm -f "$(BUILD)/obj/mprLib.o"
	rm -f "$(BUILD)/obj/openssl.o"
	rm -f "$(BUILD)/obj/pak.o"
	rm -f "$(BUILD)/obj/pcre.o"
	rm -f "$(BUILD)/obj/zlib.o"
	rm -f "$(BUILD)/bin/pak-ejsc"
	rm -f "$(BUILD)/.install-certs-modified"
	rm -f "$(BUILD)/bin/libejs.dylib"
	rm -f "$(BUILD)/bin/libhttp.dylib"
	rm -f "$(BUILD)/bin/libmbedtls.a"
	rm -f "$(BUILD)/bin/libmpr.dylib"
	rm -f "$(BUILD)/bin/libpcre.dylib"
	rm -f "$(BUILD)/bin/libzlib.dylib"
	rm -f "$(BUILD)/bin/libmpr-mbedtls.a"
	rm -f "$(BUILD)/bin/pak"

clobber: clean
	rm -fr ./$(BUILD)

#
#   me.h
#

$(BUILD)/inc/me.h: $(DEPS_1)

#
#   osdep.h
#
DEPS_2 += src/osdep/osdep.h
DEPS_2 += $(BUILD)/inc/me.h

$(BUILD)/inc/osdep.h: $(DEPS_2)
	@echo '      [Copy] $(BUILD)/inc/osdep.h'
	mkdir -p "$(BUILD)/inc"
	cp src/osdep/osdep.h $(BUILD)/inc/osdep.h

#
#   mpr.h
#
DEPS_3 += src/mpr/mpr.h
DEPS_3 += $(BUILD)/inc/me.h
DEPS_3 += $(BUILD)/inc/osdep.h

$(BUILD)/inc/mpr.h: $(DEPS_3)
	@echo '      [Copy] $(BUILD)/inc/mpr.h'
	mkdir -p "$(BUILD)/inc"
	cp src/mpr/mpr.h $(BUILD)/inc/mpr.h

#
#   http.h
#
DEPS_4 += src/http/http.h
DEPS_4 += $(BUILD)/inc/mpr.h

$(BUILD)/inc/http.h: $(DEPS_4)
	@echo '      [Copy] $(BUILD)/inc/http.h'
	mkdir -p "$(BUILD)/inc"
	cp src/http/http.h $(BUILD)/inc/http.h

#
#   ejs.slots.h
#
DEPS_5 += src/ejscript/ejs.slots.h

$(BUILD)/inc/ejs.slots.h: $(DEPS_5)
	@echo '      [Copy] $(BUILD)/inc/ejs.slots.h'
	mkdir -p "$(BUILD)/inc"
	cp src/ejscript/ejs.slots.h $(BUILD)/inc/ejs.slots.h

#
#   pcre.h
#
DEPS_6 += src/pcre/pcre.h

$(BUILD)/inc/pcre.h: $(DEPS_6)
	@echo '      [Copy] $(BUILD)/inc/pcre.h'
	mkdir -p "$(BUILD)/inc"
	cp src/pcre/pcre.h $(BUILD)/inc/pcre.h

#
#   zlib.h
#
DEPS_7 += src/zlib/zlib.h
DEPS_7 += $(BUILD)/inc/me.h

$(BUILD)/inc/zlib.h: $(DEPS_7)
	@echo '      [Copy] $(BUILD)/inc/zlib.h'
	mkdir -p "$(BUILD)/inc"
	cp src/zlib/zlib.h $(BUILD)/inc/zlib.h

#
#   ejs.h
#
DEPS_8 += src/ejscript/ejs.h
DEPS_8 += $(BUILD)/inc/me.h
DEPS_8 += $(BUILD)/inc/osdep.h
DEPS_8 += $(BUILD)/inc/mpr.h
DEPS_8 += $(BUILD)/inc/http.h
DEPS_8 += $(BUILD)/inc/ejs.slots.h
DEPS_8 += $(BUILD)/inc/pcre.h
DEPS_8 += $(BUILD)/inc/zlib.h

$(BUILD)/inc/ejs.h: $(DEPS_8)
	@echo '      [Copy] $(BUILD)/inc/ejs.h'
	mkdir -p "$(BUILD)/inc"
	cp src/ejscript/ejs.h $(BUILD)/inc/ejs.h

#
#   ejsByteGoto.h
#
DEPS_9 += src/ejscript/ejsByteGoto.h

$(BUILD)/inc/ejsByteGoto.h: $(DEPS_9)
	@echo '      [Copy] $(BUILD)/inc/ejsByteGoto.h'
	mkdir -p "$(BUILD)/inc"
	cp src/ejscript/ejsByteGoto.h $(BUILD)/inc/ejsByteGoto.h

#
#   mbedtls.h
#
DEPS_10 += src/mbedtls/mbedtls.h
DEPS_10 += $(BUILD)/inc/me.h
DEPS_10 += $(BUILD)/inc/osdep.h

$(BUILD)/inc/mbedtls.h: $(DEPS_10)
	@echo '      [Copy] $(BUILD)/inc/mbedtls.h'
	mkdir -p "$(BUILD)/inc"
	cp src/mbedtls/mbedtls.h $(BUILD)/inc/mbedtls.h

#
#   ejs.o
#
DEPS_11 += $(BUILD)/inc/ejs.h

$(BUILD)/obj/ejs.o: \
    src/ejscript/ejs.c $(DEPS_11)
	@echo '   [Compile] $(BUILD)/obj/ejs.o'
	$(CC) -c $(DFLAGS) -o $(BUILD)/obj/ejs.o -arch $(CC_ARCH) $(CFLAGS) $(IFLAGS) src/ejscript/ejs.c

#
#   ejsLib.o
#
DEPS_12 += $(BUILD)/inc/ejs.h
DEPS_12 += $(BUILD)/inc/mpr.h
DEPS_12 += $(BUILD)/inc/pcre.h
DEPS_12 += $(BUILD)/inc/me.h

$(BUILD)/obj/ejsLib.o: \
    src/ejscript/ejsLib.c $(DEPS_12)
	@echo '   [Compile] $(BUILD)/obj/ejsLib.o'
	$(CC) -c $(DFLAGS) -o $(BUILD)/obj/ejsLib.o -arch $(CC_ARCH) $(CFLAGS) -D_FILE_OFFSET_BITS=64 $(IFLAGS) src/ejscript/ejsLib.c

#
#   ejsc.o
#
DEPS_13 += $(BUILD)/inc/ejs.h

$(BUILD)/obj/ejsc.o: \
    src/ejscript/ejsc.c $(DEPS_13)
	@echo '   [Compile] $(BUILD)/obj/ejsc.o'
	$(CC) -c $(DFLAGS) -o $(BUILD)/obj/ejsc.o -arch $(CC_ARCH) $(CFLAGS) -D_FILE_OFFSET_BITS=64 $(IFLAGS) src/ejscript/ejsc.c

#
#   http.o
#
DEPS_14 += $(BUILD)/inc/http.h

$(BUILD)/obj/http.o: \
    src/http/http.c $(DEPS_14)
	@echo '   [Compile] $(BUILD)/obj/http.o'
	$(CC) -c $(DFLAGS) -o $(BUILD)/obj/http.o -arch $(CC_ARCH) $(CFLAGS) $(IFLAGS) src/http/http.c

#
#   httpLib.o
#
DEPS_15 += $(BUILD)/inc/http.h
DEPS_15 += $(BUILD)/inc/pcre.h

$(BUILD)/obj/httpLib.o: \
    src/http/httpLib.c $(DEPS_15)
	@echo '   [Compile] $(BUILD)/obj/httpLib.o'
	$(CC) -c $(DFLAGS) -o $(BUILD)/obj/httpLib.o -arch $(CC_ARCH) $(CFLAGS) -D_FILE_OFFSET_BITS=64 $(IFLAGS) src/http/httpLib.c

#
#   mbedtls.o
#
DEPS_16 += $(BUILD)/inc/mpr.h

$(BUILD)/obj/mbedtls.o: \
    src/mpr-mbedtls/mbedtls.c $(DEPS_16)
	@echo '   [Compile] $(BUILD)/obj/mbedtls.o'
	$(CC) -c $(DFLAGS) -o $(BUILD)/obj/mbedtls.o -arch $(CC_ARCH) $(CFLAGS) -D_FILE_OFFSET_BITS=64 $(IFLAGS) src/mpr-mbedtls/mbedtls.c

#
#   mbedtlsLib.o
#
DEPS_17 += $(BUILD)/inc/mbedtls.h

$(BUILD)/obj/mbedtlsLib.o: \
    src/mbedtls/mbedtlsLib.c $(DEPS_17)
	@echo '   [Compile] $(BUILD)/obj/mbedtlsLib.o'
	$(CC) -c $(DFLAGS) -o $(BUILD)/obj/mbedtlsLib.o -arch $(CC_ARCH) $(CFLAGS) $(IFLAGS) src/mbedtls/mbedtlsLib.c

#
#   mprLib.o
#
DEPS_18 += $(BUILD)/inc/mpr.h

$(BUILD)/obj/mprLib.o: \
    src/mpr/mprLib.c $(DEPS_18)
	@echo '   [Compile] $(BUILD)/obj/mprLib.o'
	$(CC) -c $(DFLAGS) -o $(BUILD)/obj/mprLib.o -arch $(CC_ARCH) $(CFLAGS) -D_FILE_OFFSET_BITS=64 $(IFLAGS) src/mpr/mprLib.c

#
#   openssl.o
#
DEPS_19 += $(BUILD)/inc/mpr.h

$(BUILD)/obj/openssl.o: \
    src/mpr-openssl/openssl.c $(DEPS_19)
	@echo '   [Compile] $(BUILD)/obj/openssl.o'
	$(CC) -c $(DFLAGS) -o $(BUILD)/obj/openssl.o -arch $(CC_ARCH) $(CFLAGS) -DME_COM_OPENSSL_PATH=$(ME_COM_OPENSSL_PATH) $(IFLAGS) "-I$(ME_COM_OPENSSL_PATH)/include" src/mpr-openssl/openssl.c

#
#   pak.o
#
DEPS_20 += $(BUILD)/inc/ejs.h

$(BUILD)/obj/pak.o: \
    src/pak.c $(DEPS_20)
	@echo '   [Compile] $(BUILD)/obj/pak.o'
	$(CC) -c $(DFLAGS) -o $(BUILD)/obj/pak.o -arch $(CC_ARCH) $(CFLAGS) -D_FILE_OFFSET_BITS=64 $(IFLAGS) src/pak.c

#
#   pcre.o
#
DEPS_21 += $(BUILD)/inc/me.h
DEPS_21 += $(BUILD)/inc/pcre.h

$(BUILD)/obj/pcre.o: \
    src/pcre/pcre.c $(DEPS_21)
	@echo '   [Compile] $(BUILD)/obj/pcre.o'
	$(CC) -c $(DFLAGS) -o $(BUILD)/obj/pcre.o -arch $(CC_ARCH) $(CFLAGS) $(IFLAGS) src/pcre/pcre.c

#
#   zlib.o
#
DEPS_22 += $(BUILD)/inc/me.h
DEPS_22 += $(BUILD)/inc/zlib.h

$(BUILD)/obj/zlib.o: \
    src/zlib/zlib.c $(DEPS_22)
	@echo '   [Compile] $(BUILD)/obj/zlib.o'
	$(CC) -c $(DFLAGS) -o $(BUILD)/obj/zlib.o -arch $(CC_ARCH) $(CFLAGS) $(IFLAGS) src/zlib/zlib.c

ifeq ($(ME_COM_MBEDTLS),1)
#
#   libmbedtls
#
DEPS_23 += $(BUILD)/inc/osdep.h
DEPS_23 += $(BUILD)/inc/mbedtls.h
DEPS_23 += $(BUILD)/obj/mbedtlsLib.o

$(BUILD)/bin/libmbedtls.a: $(DEPS_23)
	@echo '      [Link] $(BUILD)/bin/libmbedtls.a'
	ar -cr $(BUILD)/bin/libmbedtls.a "$(BUILD)/obj/mbedtlsLib.o"
endif

ifeq ($(ME_COM_SSL),1)
ifeq ($(ME_COM_MBEDTLS),1)
#
#   mbedtls
#
ifeq ($(ME_COM_MBEDTLS),1)
    DEPS_24 += $(BUILD)/bin/libmbedtls.a
endif
DEPS_24 += $(BUILD)/obj/mbedtls.o

$(BUILD)/bin/libmpr-mbedtls.a: $(DEPS_24)
	@echo '      [Link] $(BUILD)/bin/libmpr-mbedtls.a'
	ar -cr $(BUILD)/bin/libmpr-mbedtls.a "$(BUILD)/obj/mbedtls.o"
endif
endif

ifeq ($(ME_COM_SSL),1)
ifeq ($(ME_COM_OPENSSL),1)
#
#   openssl
#
DEPS_25 += $(BUILD)/obj/openssl.o

$(BUILD)/bin/libmpr-openssl.a: $(DEPS_25)
	@echo '      [Link] $(BUILD)/bin/libmpr-openssl.a'
	ar -cr $(BUILD)/bin/libmpr-openssl.a "$(BUILD)/obj/openssl.o"
endif
endif

#
#   libmpr
#
DEPS_26 += $(BUILD)/inc/osdep.h
ifeq ($(ME_COM_SSL),1)
ifeq ($(ME_COM_MBEDTLS),1)
    DEPS_26 += $(BUILD)/bin/libmpr-mbedtls.a
endif
endif
ifeq ($(ME_COM_SSL),1)
ifeq ($(ME_COM_OPENSSL),1)
    DEPS_26 += $(BUILD)/bin/libmpr-openssl.a
endif
endif
DEPS_26 += $(BUILD)/inc/mpr.h
DEPS_26 += $(BUILD)/obj/mprLib.o

ifeq ($(ME_COM_MBEDTLS),1)
    LIBS_26 += -lmbedtls
endif
ifeq ($(ME_COM_MBEDTLS),1)
    LIBS_26 += -lmpr-mbedtls
endif
ifeq ($(ME_COM_MBEDTLS),1)
    LIBS_26 += -lmbedtls
endif
ifeq ($(ME_COM_OPENSSL),1)
    LIBS_26 += -lmpr-openssl
    LIBPATHS_26 += -L"$(ME_COM_OPENSSL_PATH)"
endif
ifeq ($(ME_COM_OPENSSL),1)
ifeq ($(ME_COM_SSL),1)
    LIBS_26 += -lssl
    LIBPATHS_26 += -L"$(ME_COM_OPENSSL_PATH)"
endif
endif
ifeq ($(ME_COM_OPENSSL),1)
    LIBS_26 += -lcrypto
    LIBPATHS_26 += -L"$(ME_COM_OPENSSL_PATH)"
endif
ifeq ($(ME_COM_MBEDTLS),1)
    LIBS_26 += -lmpr-mbedtls
endif

$(BUILD)/bin/libmpr.dylib: $(DEPS_26)
	@echo '      [Link] $(BUILD)/bin/libmpr.dylib'
	$(CC) -dynamiclib -o $(BUILD)/bin/libmpr.dylib -arch $(CC_ARCH) $(LDFLAGS) $(LIBPATHS) -install_name @rpath/libmpr.dylib -compatibility_version 0.11 -current_version 0.11 "$(BUILD)/obj/mprLib.o" $(LIBPATHS_26) $(LIBS_26) $(LIBS_26) $(LIBS) 

ifeq ($(ME_COM_PCRE),1)
#
#   libpcre
#
DEPS_27 += $(BUILD)/inc/pcre.h
DEPS_27 += $(BUILD)/obj/pcre.o

$(BUILD)/bin/libpcre.dylib: $(DEPS_27)
	@echo '      [Link] $(BUILD)/bin/libpcre.dylib'
	$(CC) -dynamiclib -o $(BUILD)/bin/libpcre.dylib -arch $(CC_ARCH) $(LDFLAGS) -compatibility_version 0.11 -current_version 0.11 $(LIBPATHS) -install_name @rpath/libpcre.dylib -compatibility_version 0.11 -current_version 0.11 "$(BUILD)/obj/pcre.o" $(LIBS) 
endif

ifeq ($(ME_COM_HTTP),1)
#
#   libhttp
#
DEPS_28 += $(BUILD)/bin/libmpr.dylib
ifeq ($(ME_COM_PCRE),1)
    DEPS_28 += $(BUILD)/bin/libpcre.dylib
endif
DEPS_28 += $(BUILD)/inc/http.h
DEPS_28 += $(BUILD)/obj/httpLib.o

ifeq ($(ME_COM_MBEDTLS),1)
    LIBS_28 += -lmbedtls
endif
ifeq ($(ME_COM_MBEDTLS),1)
    LIBS_28 += -lmpr-mbedtls
endif
ifeq ($(ME_COM_MBEDTLS),1)
    LIBS_28 += -lmbedtls
endif
ifeq ($(ME_COM_OPENSSL),1)
    LIBS_28 += -lmpr-openssl
    LIBPATHS_28 += -L"$(ME_COM_OPENSSL_PATH)"
endif
ifeq ($(ME_COM_OPENSSL),1)
ifeq ($(ME_COM_SSL),1)
    LIBS_28 += -lssl
    LIBPATHS_28 += -L"$(ME_COM_OPENSSL_PATH)"
endif
endif
ifeq ($(ME_COM_OPENSSL),1)
    LIBS_28 += -lcrypto
    LIBPATHS_28 += -L"$(ME_COM_OPENSSL_PATH)"
endif
LIBS_28 += -lmpr
ifeq ($(ME_COM_MBEDTLS),1)
    LIBS_28 += -lmpr-mbedtls
endif
ifeq ($(ME_COM_PCRE),1)
    LIBS_28 += -lpcre
endif
ifeq ($(ME_COM_PCRE),1)
    LIBS_28 += -lpcre
endif
LIBS_28 += -lmpr

$(BUILD)/bin/libhttp.dylib: $(DEPS_28)
	@echo '      [Link] $(BUILD)/bin/libhttp.dylib'
	$(CC) -dynamiclib -o $(BUILD)/bin/libhttp.dylib -arch $(CC_ARCH) $(LDFLAGS) $(LIBPATHS) -install_name @rpath/libhttp.dylib -compatibility_version 0.11 -current_version 0.11 "$(BUILD)/obj/httpLib.o" $(LIBPATHS_28) $(LIBS_28) $(LIBS_28) $(LIBS) 
endif

ifeq ($(ME_COM_ZLIB),1)
#
#   libzlib
#
DEPS_29 += $(BUILD)/inc/zlib.h
DEPS_29 += $(BUILD)/obj/zlib.o

$(BUILD)/bin/libzlib.dylib: $(DEPS_29)
	@echo '      [Link] $(BUILD)/bin/libzlib.dylib'
	$(CC) -dynamiclib -o $(BUILD)/bin/libzlib.dylib -arch $(CC_ARCH) $(LDFLAGS) $(LIBPATHS) -install_name @rpath/libzlib.dylib -compatibility_version 0.11 -current_version 0.11 "$(BUILD)/obj/zlib.o" $(LIBS) 
endif

ifeq ($(ME_COM_EJSCRIPT),1)
#
#   libejs
#
ifeq ($(ME_COM_HTTP),1)
    DEPS_30 += $(BUILD)/bin/libhttp.dylib
endif
ifeq ($(ME_COM_PCRE),1)
    DEPS_30 += $(BUILD)/bin/libpcre.dylib
endif
DEPS_30 += $(BUILD)/bin/libmpr.dylib
ifeq ($(ME_COM_ZLIB),1)
    DEPS_30 += $(BUILD)/bin/libzlib.dylib
endif
DEPS_30 += $(BUILD)/inc/ejs.h
DEPS_30 += $(BUILD)/inc/ejs.slots.h
DEPS_30 += $(BUILD)/inc/ejsByteGoto.h
DEPS_30 += $(BUILD)/obj/ejsLib.o

ifeq ($(ME_COM_MBEDTLS),1)
    LIBS_30 += -lmbedtls
endif
ifeq ($(ME_COM_MBEDTLS),1)
    LIBS_30 += -lmpr-mbedtls
endif
ifeq ($(ME_COM_MBEDTLS),1)
    LIBS_30 += -lmbedtls
endif
ifeq ($(ME_COM_OPENSSL),1)
    LIBS_30 += -lmpr-openssl
    LIBPATHS_30 += -L"$(ME_COM_OPENSSL_PATH)"
endif
ifeq ($(ME_COM_OPENSSL),1)
ifeq ($(ME_COM_SSL),1)
    LIBS_30 += -lssl
    LIBPATHS_30 += -L"$(ME_COM_OPENSSL_PATH)"
endif
endif
ifeq ($(ME_COM_OPENSSL),1)
    LIBS_30 += -lcrypto
    LIBPATHS_30 += -L"$(ME_COM_OPENSSL_PATH)"
endif
LIBS_30 += -lmpr
ifeq ($(ME_COM_MBEDTLS),1)
    LIBS_30 += -lmpr-mbedtls
endif
ifeq ($(ME_COM_PCRE),1)
    LIBS_30 += -lpcre
endif
ifeq ($(ME_COM_HTTP),1)
    LIBS_30 += -lhttp
endif
ifeq ($(ME_COM_PCRE),1)
    LIBS_30 += -lpcre
endif
LIBS_30 += -lmpr
ifeq ($(ME_COM_ZLIB),1)
    LIBS_30 += -lzlib
endif
ifeq ($(ME_COM_ZLIB),1)
    LIBS_30 += -lzlib
endif
ifeq ($(ME_COM_HTTP),1)
    LIBS_30 += -lhttp
endif

$(BUILD)/bin/libejs.dylib: $(DEPS_30)
	@echo '      [Link] $(BUILD)/bin/libejs.dylib'
	$(CC) -dynamiclib -o $(BUILD)/bin/libejs.dylib -arch $(CC_ARCH) $(LDFLAGS) $(LIBPATHS) -install_name @rpath/libejs.dylib -compatibility_version 0.11 -current_version 0.11 "$(BUILD)/obj/ejsLib.o" $(LIBPATHS_30) $(LIBS_30) $(LIBS_30) $(LIBS) 
endif

ifeq ($(ME_COM_EJSCRIPT),1)
#
#   ejsc
#
DEPS_31 += $(BUILD)/bin/libejs.dylib
DEPS_31 += $(BUILD)/obj/ejsc.o

ifeq ($(ME_COM_MBEDTLS),1)
    LIBS_31 += -lmbedtls
endif
ifeq ($(ME_COM_MBEDTLS),1)
    LIBS_31 += -lmpr-mbedtls
endif
ifeq ($(ME_COM_MBEDTLS),1)
    LIBS_31 += -lmbedtls
endif
ifeq ($(ME_COM_OPENSSL),1)
    LIBS_31 += -lmpr-openssl
    LIBPATHS_31 += -L"$(ME_COM_OPENSSL_PATH)"
endif
ifeq ($(ME_COM_OPENSSL),1)
ifeq ($(ME_COM_SSL),1)
    LIBS_31 += -lssl
    LIBPATHS_31 += -L"$(ME_COM_OPENSSL_PATH)"
endif
endif
ifeq ($(ME_COM_OPENSSL),1)
    LIBS_31 += -lcrypto
    LIBPATHS_31 += -L"$(ME_COM_OPENSSL_PATH)"
endif
LIBS_31 += -lmpr
ifeq ($(ME_COM_MBEDTLS),1)
    LIBS_31 += -lmpr-mbedtls
endif
ifeq ($(ME_COM_PCRE),1)
    LIBS_31 += -lpcre
endif
ifeq ($(ME_COM_HTTP),1)
    LIBS_31 += -lhttp
endif
ifeq ($(ME_COM_PCRE),1)
    LIBS_31 += -lpcre
endif
LIBS_31 += -lmpr
ifeq ($(ME_COM_ZLIB),1)
    LIBS_31 += -lzlib
endif
LIBS_31 += -lejs
ifeq ($(ME_COM_ZLIB),1)
    LIBS_31 += -lzlib
endif
ifeq ($(ME_COM_HTTP),1)
    LIBS_31 += -lhttp
endif

$(BUILD)/bin/pak-ejsc: $(DEPS_31)
	@echo '      [Link] $(BUILD)/bin/pak-ejsc'
	$(CC) -o $(BUILD)/bin/pak-ejsc -arch $(CC_ARCH) $(LDFLAGS) $(LIBPATHS) "$(BUILD)/obj/ejsc.o" $(LIBPATHS_31) $(LIBS_31) $(LIBS_31) $(LIBS) 
endif

ifeq ($(ME_COM_EJSCRIPT),1)
#
#   ejs.mod
#
DEPS_32 += src/ejscript/ejs.es
DEPS_32 += $(BUILD)/bin/pak-ejsc

$(BUILD)/bin/ejs.mod: $(DEPS_32)
	( \
	cd src/ejscript; \
	echo '   [Compile] ejs.mod' ; \
	"../../$(BUILD)/bin/pak-ejsc" --out "../../$(BUILD)/bin/ejs.mod" --optimize 9 --bind --require null ejs.es ; \
	)
endif

ifeq ($(ME_COM_EJSCRIPT),1)
#
#   ejscmd
#
DEPS_33 += $(BUILD)/bin/libejs.dylib
DEPS_33 += $(BUILD)/obj/ejs.o

ifeq ($(ME_COM_MBEDTLS),1)
    LIBS_33 += -lmbedtls
endif
ifeq ($(ME_COM_MBEDTLS),1)
    LIBS_33 += -lmpr-mbedtls
endif
ifeq ($(ME_COM_MBEDTLS),1)
    LIBS_33 += -lmbedtls
endif
ifeq ($(ME_COM_OPENSSL),1)
    LIBS_33 += -lmpr-openssl
    LIBPATHS_33 += -L"$(ME_COM_OPENSSL_PATH)"
endif
ifeq ($(ME_COM_OPENSSL),1)
ifeq ($(ME_COM_SSL),1)
    LIBS_33 += -lssl
    LIBPATHS_33 += -L"$(ME_COM_OPENSSL_PATH)"
endif
endif
ifeq ($(ME_COM_OPENSSL),1)
    LIBS_33 += -lcrypto
    LIBPATHS_33 += -L"$(ME_COM_OPENSSL_PATH)"
endif
LIBS_33 += -lmpr
ifeq ($(ME_COM_MBEDTLS),1)
    LIBS_33 += -lmpr-mbedtls
endif
ifeq ($(ME_COM_PCRE),1)
    LIBS_33 += -lpcre
endif
ifeq ($(ME_COM_HTTP),1)
    LIBS_33 += -lhttp
endif
ifeq ($(ME_COM_PCRE),1)
    LIBS_33 += -lpcre
endif
LIBS_33 += -lmpr
ifeq ($(ME_COM_ZLIB),1)
    LIBS_33 += -lzlib
endif
LIBS_33 += -lejs
ifeq ($(ME_COM_ZLIB),1)
    LIBS_33 += -lzlib
endif
ifeq ($(ME_COM_HTTP),1)
    LIBS_33 += -lhttp
endif

$(BUILD)/bin/pak-ejs: $(DEPS_33)
	@echo '      [Link] $(BUILD)/bin/pak-ejs'
	$(CC) -o $(BUILD)/bin/pak-ejs -arch $(CC_ARCH) $(LDFLAGS) $(LIBPATHS) "$(BUILD)/obj/ejs.o" $(LIBPATHS_33) $(LIBS_33) $(LIBS_33) $(LIBS) -ledit 
endif

ifeq ($(ME_COM_HTTP),1)
#
#   httpcmd
#
DEPS_34 += $(BUILD)/bin/libhttp.dylib
DEPS_34 += $(BUILD)/obj/http.o

ifeq ($(ME_COM_MBEDTLS),1)
    LIBS_34 += -lmbedtls
endif
ifeq ($(ME_COM_MBEDTLS),1)
    LIBS_34 += -lmpr-mbedtls
endif
ifeq ($(ME_COM_MBEDTLS),1)
    LIBS_34 += -lmbedtls
endif
ifeq ($(ME_COM_OPENSSL),1)
    LIBS_34 += -lmpr-openssl
    LIBPATHS_34 += -L"$(ME_COM_OPENSSL_PATH)"
endif
ifeq ($(ME_COM_OPENSSL),1)
ifeq ($(ME_COM_SSL),1)
    LIBS_34 += -lssl
    LIBPATHS_34 += -L"$(ME_COM_OPENSSL_PATH)"
endif
endif
ifeq ($(ME_COM_OPENSSL),1)
    LIBS_34 += -lcrypto
    LIBPATHS_34 += -L"$(ME_COM_OPENSSL_PATH)"
endif
LIBS_34 += -lmpr
ifeq ($(ME_COM_MBEDTLS),1)
    LIBS_34 += -lmpr-mbedtls
endif
ifeq ($(ME_COM_PCRE),1)
    LIBS_34 += -lpcre
endif
LIBS_34 += -lhttp
ifeq ($(ME_COM_PCRE),1)
    LIBS_34 += -lpcre
endif
LIBS_34 += -lmpr

$(BUILD)/bin/http: $(DEPS_34)
	@echo '      [Link] $(BUILD)/bin/http'
	$(CC) -o $(BUILD)/bin/http -arch $(CC_ARCH) $(LDFLAGS) $(LIBPATHS) "$(BUILD)/obj/http.o" $(LIBPATHS_34) $(LIBS_34) $(LIBS_34) $(LIBS) 
endif

#
#   install-certs
#
DEPS_35 += src/certs/samples/ca.crt
DEPS_35 += src/certs/samples/ca.key
DEPS_35 += src/certs/samples/ec.crt
DEPS_35 += src/certs/samples/ec.key
DEPS_35 += src/certs/samples/roots.crt
DEPS_35 += src/certs/samples/self.crt
DEPS_35 += src/certs/samples/self.key
DEPS_35 += src/certs/samples/test.crt
DEPS_35 += src/certs/samples/test.key

$(BUILD)/.install-certs-modified: $(DEPS_35)
	@echo '      [Copy] $(BUILD)/bin'
	mkdir -p "$(BUILD)/bin"
	cp src/certs/samples/ca.crt $(BUILD)/bin/ca.crt
	cp src/certs/samples/ca.key $(BUILD)/bin/ca.key
	cp src/certs/samples/ec.crt $(BUILD)/bin/ec.crt
	cp src/certs/samples/ec.key $(BUILD)/bin/ec.key
	cp src/certs/samples/roots.crt $(BUILD)/bin/roots.crt
	cp src/certs/samples/self.crt $(BUILD)/bin/self.crt
	cp src/certs/samples/self.key $(BUILD)/bin/self.key
	cp src/certs/samples/test.crt $(BUILD)/bin/test.crt
	cp src/certs/samples/test.key $(BUILD)/bin/test.key
	touch "$(BUILD)/.install-certs-modified"

#
#   pak.mod
#
DEPS_36 += src/Package.es
DEPS_36 += src/pak.es
DEPS_36 += paks/ejs-version/Version.es
ifeq ($(ME_COM_EJSCRIPT),1)
    DEPS_36 += $(BUILD)/bin/ejs.mod
endif

$(BUILD)/bin/pak.mod: $(DEPS_36)
	"./$(BUILD)/bin/pak-ejsc" --optimize 9 --out "./$(BUILD)/bin/pak.mod" --optimize 9 src/Package.es src/pak.es paks/ejs-version/Version.es

#
#   pak
#
ifeq ($(ME_COM_EJSCRIPT),1)
    DEPS_37 += $(BUILD)/bin/libejs.dylib
endif
DEPS_37 += $(BUILD)/bin/pak.mod
DEPS_37 += $(BUILD)/obj/pak.o

ifeq ($(ME_COM_MBEDTLS),1)
    LIBS_37 += -lmbedtls
endif
ifeq ($(ME_COM_MBEDTLS),1)
    LIBS_37 += -lmpr-mbedtls
endif
ifeq ($(ME_COM_MBEDTLS),1)
    LIBS_37 += -lmbedtls
endif
ifeq ($(ME_COM_OPENSSL),1)
    LIBS_37 += -lmpr-openssl
    LIBPATHS_37 += -L"$(ME_COM_OPENSSL_PATH)"
endif
ifeq ($(ME_COM_OPENSSL),1)
ifeq ($(ME_COM_SSL),1)
    LIBS_37 += -lssl
    LIBPATHS_37 += -L"$(ME_COM_OPENSSL_PATH)"
endif
endif
ifeq ($(ME_COM_OPENSSL),1)
    LIBS_37 += -lcrypto
    LIBPATHS_37 += -L"$(ME_COM_OPENSSL_PATH)"
endif
LIBS_37 += -lmpr
ifeq ($(ME_COM_MBEDTLS),1)
    LIBS_37 += -lmpr-mbedtls
endif
ifeq ($(ME_COM_PCRE),1)
    LIBS_37 += -lpcre
endif
ifeq ($(ME_COM_HTTP),1)
    LIBS_37 += -lhttp
endif
ifeq ($(ME_COM_PCRE),1)
    LIBS_37 += -lpcre
endif
LIBS_37 += -lmpr
ifeq ($(ME_COM_ZLIB),1)
    LIBS_37 += -lzlib
endif
ifeq ($(ME_COM_EJSCRIPT),1)
    LIBS_37 += -lejs
endif
ifeq ($(ME_COM_ZLIB),1)
    LIBS_37 += -lzlib
endif
ifeq ($(ME_COM_HTTP),1)
    LIBS_37 += -lhttp
endif

$(BUILD)/bin/pak: $(DEPS_37)
	@echo '      [Link] $(BUILD)/bin/pak'
	$(CC) -o $(BUILD)/bin/pak -arch $(CC_ARCH) $(LDFLAGS) $(LIBPATHS) "$(BUILD)/obj/pak.o" $(LIBPATHS_37) $(LIBS_37) $(LIBS_37) $(LIBS) 

#
#   installPrep
#

installPrep: $(DEPS_38)
	if [ "`id -u`" != 0 ] ; \
	then echo "Must run as root. Rerun with "sudo"" ; \
	exit 255 ; \
	fi

#
#   stop
#

stop: $(DEPS_39)

#
#   installBinary
#

installBinary: $(DEPS_40)
	mkdir -p "$(ME_APP_PREFIX)" ; \
	rm -f "$(ME_APP_PREFIX)/latest" ; \
	ln -s "$(VERSION)" "$(ME_APP_PREFIX)/latest" ; \
	mkdir -p "$(ME_VAPP_PREFIX)/bin" ; \
	cp $(BUILD)/bin/pak $(ME_VAPP_PREFIX)/bin/pak ; \
	chmod 755 "$(ME_VAPP_PREFIX)/bin/pak" ; \
	mkdir -p "$(ME_BIN_PREFIX)" ; \
	chmod 755 "$(ME_BIN_PREFIX)" ; \
	rm -f "$(ME_BIN_PREFIX)/pak" ; \
	ln -s "$(ME_VAPP_PREFIX)/bin/pak" "$(ME_BIN_PREFIX)/pak" ; \
	mkdir -p "$(ME_VAPP_PREFIX)/bin" ; \
	cp $(BUILD)/bin/roots.crt $(ME_VAPP_PREFIX)/bin/roots.crt ; \
	cp $(BUILD)/bin/ejs.mod $(ME_VAPP_PREFIX)/bin/ejs.mod ; \
	cp $(BUILD)/bin/pak.mod $(ME_VAPP_PREFIX)/bin/pak.mod ; \
	mkdir -p "$(ME_VAPP_PREFIX)/bin" ; \
	cp $(BUILD)/bin/libejs.dylib $(ME_VAPP_PREFIX)/bin/libejs.dylib ; \
	cp $(BUILD)/bin/libhttp.dylib $(ME_VAPP_PREFIX)/bin/libhttp.dylib ; \
	cp $(BUILD)/bin/libmpr.dylib $(ME_VAPP_PREFIX)/bin/libmpr.dylib ; \
	cp $(BUILD)/bin/libpcre.dylib $(ME_VAPP_PREFIX)/bin/libpcre.dylib ; \
	cp $(BUILD)/bin/libzlib.dylib $(ME_VAPP_PREFIX)/bin/libzlib.dylib ; \
	mkdir -p "$(ME_VAPP_PREFIX)/doc/man/man1" ; \
	cp doc/dist/man/pak.1 $(ME_VAPP_PREFIX)/doc/man/man1/pak.1 ; \
	mkdir -p "$(ME_MAN_PREFIX)/man1" ; \
	rm -f "$(ME_MAN_PREFIX)/man1/pak.1" ; \
	ln -s "$(ME_VAPP_PREFIX)/doc/man/man1/pak.1" "$(ME_MAN_PREFIX)/man1/pak.1"

#
#   start
#

start: $(DEPS_41)

#
#   install
#
DEPS_42 += installPrep
DEPS_42 += stop
DEPS_42 += installBinary
DEPS_42 += start

install: $(DEPS_42)

#
#   uninstall
#
DEPS_43 += stop

uninstall: $(DEPS_43)
	rm -fr "$(ME_VAPP_PREFIX)" ; \
	rm -f "$(ME_APP_PREFIX)/latest" ; \
	rmdir -p "$(ME_APP_PREFIX)" 2>/dev/null ; true

#
#   version
#

version: $(DEPS_44)
	echo $(VERSION)

