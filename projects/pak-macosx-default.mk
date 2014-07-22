#
#   pak-macosx-default.mk -- Makefile to build Embedthis Pak for macosx
#

NAME                  := pak
VERSION               := 0.9.4
PROFILE               ?= default
ARCH                  ?= $(shell uname -m | sed 's/i.86/x86/;s/x86_64/x64/;s/arm.*/arm/;s/mips.*/mips/')
CC_ARCH               ?= $(shell echo $(ARCH) | sed 's/x86/i686/;s/x64/x86_64/')
OS                    ?= macosx
CC                    ?= clang
CONFIG                ?= $(OS)-$(ARCH)-$(PROFILE)
BUILD                 ?= build/$(CONFIG)
LBIN                  ?= $(BUILD)/bin
PATH                  := $(LBIN):$(PATH)

ME_COM_EJS            ?= 1
ME_COM_EST            ?= 1
ME_COM_HTTP           ?= 1
ME_COM_MATRIXSSL      ?= 0
ME_COM_NANOSSL        ?= 0
ME_COM_OPENSSL        ?= 0
ME_COM_PCRE           ?= 1
ME_COM_SQLITE         ?= 0
ME_COM_SSL            ?= 1
ME_COM_VXWORKS        ?= 0
ME_COM_WINSDK         ?= 1
ME_COM_ZLIB           ?= 1

ifeq ($(ME_COM_EST),1)
    ME_COM_SSL := 1
endif
ifeq ($(ME_COM_MATRIXSSL),1)
    ME_COM_SSL := 1
endif
ifeq ($(ME_COM_NANOSSL),1)
    ME_COM_SSL := 1
endif
ifeq ($(ME_COM_OPENSSL),1)
    ME_COM_SSL := 1
endif
ifeq ($(ME_COM_EJS),1)
    ME_COM_ZLIB := 1
endif

ME_COM_COMPILER_PATH  ?= clang
ME_COM_LIB_PATH       ?= ar
ME_COM_MATRIXSSL_PATH ?= /usr/src/matrixssl
ME_COM_NANOSSL_PATH   ?= /usr/src/nanossl
ME_COM_OPENSSL_PATH   ?= /usr/src/openssl

CFLAGS                += -g -w
DFLAGS                +=  $(patsubst %,-D%,$(filter ME_%,$(MAKEFLAGS))) -DME_COM_EJS=$(ME_COM_EJS) -DME_COM_EST=$(ME_COM_EST) -DME_COM_HTTP=$(ME_COM_HTTP) -DME_COM_MATRIXSSL=$(ME_COM_MATRIXSSL) -DME_COM_NANOSSL=$(ME_COM_NANOSSL) -DME_COM_OPENSSL=$(ME_COM_OPENSSL) -DME_COM_PCRE=$(ME_COM_PCRE) -DME_COM_SQLITE=$(ME_COM_SQLITE) -DME_COM_SSL=$(ME_COM_SSL) -DME_COM_VXWORKS=$(ME_COM_VXWORKS) -DME_COM_WINSDK=$(ME_COM_WINSDK) -DME_COM_ZLIB=$(ME_COM_ZLIB) 
IFLAGS                += "-Ibuild/$(CONFIG)/inc"
LDFLAGS               += '-Wl,-rpath,@executable_path/' '-Wl,-rpath,@loader_path/'
LIBPATHS              += -Lbuild/$(CONFIG)/bin
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
ME_WEB_PREFIX         ?= $(ME_ROOT_PREFIX)/var/www/$(NAME)-default
ME_LOG_PREFIX         ?= $(ME_ROOT_PREFIX)/var/log/$(NAME)
ME_SPOOL_PREFIX       ?= $(ME_ROOT_PREFIX)/var/spool/$(NAME)
ME_CACHE_PREFIX       ?= $(ME_ROOT_PREFIX)/var/spool/$(NAME)/cache
ME_SRC_PREFIX         ?= $(ME_ROOT_PREFIX)$(NAME)-$(VERSION)


ifeq ($(ME_COM_EJS),1)
    TARGETS           += build/$(CONFIG)/bin/ejs.mod
endif
TARGETS               += build/$(CONFIG)/bin/ca.crt
ifeq ($(ME_COM_EST),1)
    TARGETS           += build/$(CONFIG)/bin/libest.dylib
endif
TARGETS               += build/$(CONFIG)/bin/libmprssl.dylib
TARGETS               += build/$(CONFIG)/bin/pak

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
			echo "   [Warning] Make flags have changed since the last build: "`cat $(BUILD)/.makeflags`"" ; \
		fi ; \
	fi
	@echo $(MAKEFLAGS) >$(BUILD)/.makeflags

clean:
	rm -f "build/$(CONFIG)/obj/ejsLib.o"
	rm -f "build/$(CONFIG)/obj/ejsc.o"
	rm -f "build/$(CONFIG)/obj/estLib.o"
	rm -f "build/$(CONFIG)/obj/httpLib.o"
	rm -f "build/$(CONFIG)/obj/mprLib.o"
	rm -f "build/$(CONFIG)/obj/mprSsl.o"
	rm -f "build/$(CONFIG)/obj/pak.o"
	rm -f "build/$(CONFIG)/obj/pcre.o"
	rm -f "build/$(CONFIG)/obj/zlib.o"
	rm -f "build/$(CONFIG)/bin/ejsc"
	rm -f "build/$(CONFIG)/bin/ca.crt"
	rm -f "build/$(CONFIG)/bin/libejs.dylib"
	rm -f "build/$(CONFIG)/bin/libest.dylib"
	rm -f "build/$(CONFIG)/bin/libhttp.dylib"
	rm -f "build/$(CONFIG)/bin/libmpr.dylib"
	rm -f "build/$(CONFIG)/bin/libmprssl.dylib"
	rm -f "build/$(CONFIG)/bin/libpcre.dylib"
	rm -f "build/$(CONFIG)/bin/libzlib.dylib"
	rm -f "build/$(CONFIG)/bin/pak"

clobber: clean
	rm -fr ./$(BUILD)


#
#   mpr.h
#
build/$(CONFIG)/inc/mpr.h: $(DEPS_1)
	@echo '      [Copy] build/$(CONFIG)/inc/mpr.h'
	mkdir -p "build/$(CONFIG)/inc"
	cp src/paks/mpr/mpr.h build/$(CONFIG)/inc/mpr.h

#
#   me.h
#
build/$(CONFIG)/inc/me.h: $(DEPS_2)
	@echo '      [Copy] build/$(CONFIG)/inc/me.h'

#
#   osdep.h
#
build/$(CONFIG)/inc/osdep.h: $(DEPS_3)
	@echo '      [Copy] build/$(CONFIG)/inc/osdep.h'
	mkdir -p "build/$(CONFIG)/inc"
	cp src/paks/osdep/osdep.h build/$(CONFIG)/inc/osdep.h

#
#   mprLib.o
#
DEPS_4 += build/$(CONFIG)/inc/me.h
DEPS_4 += build/$(CONFIG)/inc/mpr.h
DEPS_4 += build/$(CONFIG)/inc/osdep.h

build/$(CONFIG)/obj/mprLib.o: \
    src/paks/mpr/mprLib.c $(DEPS_4)
	@echo '   [Compile] build/$(CONFIG)/obj/mprLib.o'
	$(CC) -c $(DFLAGS) -o build/$(CONFIG)/obj/mprLib.o -arch $(CC_ARCH) $(CFLAGS) $(IFLAGS) src/paks/mpr/mprLib.c

#
#   libmpr
#
DEPS_5 += build/$(CONFIG)/inc/mpr.h
DEPS_5 += build/$(CONFIG)/inc/me.h
DEPS_5 += build/$(CONFIG)/inc/osdep.h
DEPS_5 += build/$(CONFIG)/obj/mprLib.o

build/$(CONFIG)/bin/libmpr.dylib: $(DEPS_5)
	@echo '      [Link] build/$(CONFIG)/bin/libmpr.dylib'
	$(CC) -dynamiclib -o build/$(CONFIG)/bin/libmpr.dylib -arch $(CC_ARCH) $(LDFLAGS) $(LIBPATHS) -install_name @rpath/libmpr.dylib -compatibility_version 0.9 -current_version 0.9 "build/$(CONFIG)/obj/mprLib.o" $(LIBS) 

#
#   pcre.h
#
build/$(CONFIG)/inc/pcre.h: $(DEPS_6)
	@echo '      [Copy] build/$(CONFIG)/inc/pcre.h'
	mkdir -p "build/$(CONFIG)/inc"
	cp src/paks/pcre/pcre.h build/$(CONFIG)/inc/pcre.h

#
#   pcre.o
#
DEPS_7 += build/$(CONFIG)/inc/me.h
DEPS_7 += build/$(CONFIG)/inc/pcre.h

build/$(CONFIG)/obj/pcre.o: \
    src/paks/pcre/pcre.c $(DEPS_7)
	@echo '   [Compile] build/$(CONFIG)/obj/pcre.o'
	$(CC) -c $(DFLAGS) -o build/$(CONFIG)/obj/pcre.o -arch $(CC_ARCH) $(CFLAGS) $(IFLAGS) src/paks/pcre/pcre.c

ifeq ($(ME_COM_PCRE),1)
#
#   libpcre
#
DEPS_8 += build/$(CONFIG)/inc/pcre.h
DEPS_8 += build/$(CONFIG)/inc/me.h
DEPS_8 += build/$(CONFIG)/obj/pcre.o

build/$(CONFIG)/bin/libpcre.dylib: $(DEPS_8)
	@echo '      [Link] build/$(CONFIG)/bin/libpcre.dylib'
	$(CC) -dynamiclib -o build/$(CONFIG)/bin/libpcre.dylib -arch $(CC_ARCH) $(LDFLAGS) -compatibility_version 0.9 -current_version 0.9 $(LIBPATHS) -install_name @rpath/libpcre.dylib -compatibility_version 0.9 -current_version 0.9 "build/$(CONFIG)/obj/pcre.o" $(LIBS) 
endif

#
#   http.h
#
build/$(CONFIG)/inc/http.h: $(DEPS_9)
	@echo '      [Copy] build/$(CONFIG)/inc/http.h'
	mkdir -p "build/$(CONFIG)/inc"
	cp src/paks/http/http.h build/$(CONFIG)/inc/http.h

#
#   httpLib.o
#
DEPS_10 += build/$(CONFIG)/inc/me.h
DEPS_10 += build/$(CONFIG)/inc/http.h
DEPS_10 += build/$(CONFIG)/inc/mpr.h

build/$(CONFIG)/obj/httpLib.o: \
    src/paks/http/httpLib.c $(DEPS_10)
	@echo '   [Compile] build/$(CONFIG)/obj/httpLib.o'
	$(CC) -c $(DFLAGS) -o build/$(CONFIG)/obj/httpLib.o -arch $(CC_ARCH) $(CFLAGS) $(IFLAGS) src/paks/http/httpLib.c

ifeq ($(ME_COM_HTTP),1)
#
#   libhttp
#
DEPS_11 += build/$(CONFIG)/inc/mpr.h
DEPS_11 += build/$(CONFIG)/inc/me.h
DEPS_11 += build/$(CONFIG)/inc/osdep.h
DEPS_11 += build/$(CONFIG)/obj/mprLib.o
DEPS_11 += build/$(CONFIG)/bin/libmpr.dylib
DEPS_11 += build/$(CONFIG)/inc/pcre.h
DEPS_11 += build/$(CONFIG)/obj/pcre.o
ifeq ($(ME_COM_PCRE),1)
    DEPS_11 += build/$(CONFIG)/bin/libpcre.dylib
endif
DEPS_11 += build/$(CONFIG)/inc/http.h
DEPS_11 += build/$(CONFIG)/obj/httpLib.o

LIBS_11 += -lmpr
ifeq ($(ME_COM_PCRE),1)
    LIBS_11 += -lpcre
endif

build/$(CONFIG)/bin/libhttp.dylib: $(DEPS_11)
	@echo '      [Link] build/$(CONFIG)/bin/libhttp.dylib'
	$(CC) -dynamiclib -o build/$(CONFIG)/bin/libhttp.dylib -arch $(CC_ARCH) $(LDFLAGS) $(LIBPATHS) -install_name @rpath/libhttp.dylib -compatibility_version 0.9 -current_version 0.9 "build/$(CONFIG)/obj/httpLib.o" $(LIBPATHS_11) $(LIBS_11) $(LIBS_11) $(LIBS) 
endif

#
#   zlib.h
#
build/$(CONFIG)/inc/zlib.h: $(DEPS_12)
	@echo '      [Copy] build/$(CONFIG)/inc/zlib.h'
	mkdir -p "build/$(CONFIG)/inc"
	cp src/paks/zlib/zlib.h build/$(CONFIG)/inc/zlib.h

#
#   zlib.o
#
DEPS_13 += build/$(CONFIG)/inc/me.h
DEPS_13 += build/$(CONFIG)/inc/zlib.h

build/$(CONFIG)/obj/zlib.o: \
    src/paks/zlib/zlib.c $(DEPS_13)
	@echo '   [Compile] build/$(CONFIG)/obj/zlib.o'
	$(CC) -c $(DFLAGS) -o build/$(CONFIG)/obj/zlib.o -arch $(CC_ARCH) $(CFLAGS) $(IFLAGS) src/paks/zlib/zlib.c

ifeq ($(ME_COM_ZLIB),1)
#
#   libzlib
#
DEPS_14 += build/$(CONFIG)/inc/zlib.h
DEPS_14 += build/$(CONFIG)/inc/me.h
DEPS_14 += build/$(CONFIG)/obj/zlib.o

build/$(CONFIG)/bin/libzlib.dylib: $(DEPS_14)
	@echo '      [Link] build/$(CONFIG)/bin/libzlib.dylib'
	$(CC) -dynamiclib -o build/$(CONFIG)/bin/libzlib.dylib -arch $(CC_ARCH) $(LDFLAGS) $(LIBPATHS) -install_name @rpath/libzlib.dylib -compatibility_version 0.9 -current_version 0.9 "build/$(CONFIG)/obj/zlib.o" $(LIBS) 
endif

#
#   ejs.h
#
build/$(CONFIG)/inc/ejs.h: $(DEPS_15)
	@echo '      [Copy] build/$(CONFIG)/inc/ejs.h'
	mkdir -p "build/$(CONFIG)/inc"
	cp src/paks/ejs/ejs.h build/$(CONFIG)/inc/ejs.h

#
#   ejs.slots.h
#
build/$(CONFIG)/inc/ejs.slots.h: $(DEPS_16)
	@echo '      [Copy] build/$(CONFIG)/inc/ejs.slots.h'
	mkdir -p "build/$(CONFIG)/inc"
	cp src/paks/ejs/ejs.slots.h build/$(CONFIG)/inc/ejs.slots.h

#
#   ejsByteGoto.h
#
build/$(CONFIG)/inc/ejsByteGoto.h: $(DEPS_17)
	@echo '      [Copy] build/$(CONFIG)/inc/ejsByteGoto.h'
	mkdir -p "build/$(CONFIG)/inc"
	cp src/paks/ejs/ejsByteGoto.h build/$(CONFIG)/inc/ejsByteGoto.h

#
#   ejsLib.o
#
DEPS_18 += build/$(CONFIG)/inc/me.h
DEPS_18 += build/$(CONFIG)/inc/ejs.h
DEPS_18 += build/$(CONFIG)/inc/mpr.h
DEPS_18 += build/$(CONFIG)/inc/pcre.h
DEPS_18 += build/$(CONFIG)/inc/osdep.h
DEPS_18 += build/$(CONFIG)/inc/http.h
DEPS_18 += build/$(CONFIG)/inc/ejs.slots.h
DEPS_18 += build/$(CONFIG)/inc/zlib.h

build/$(CONFIG)/obj/ejsLib.o: \
    src/paks/ejs/ejsLib.c $(DEPS_18)
	@echo '   [Compile] build/$(CONFIG)/obj/ejsLib.o'
	$(CC) -c $(DFLAGS) -o build/$(CONFIG)/obj/ejsLib.o -arch $(CC_ARCH) $(CFLAGS) $(IFLAGS) src/paks/ejs/ejsLib.c

ifeq ($(ME_COM_EJS),1)
#
#   libejs
#
DEPS_19 += build/$(CONFIG)/inc/mpr.h
DEPS_19 += build/$(CONFIG)/inc/me.h
DEPS_19 += build/$(CONFIG)/inc/osdep.h
DEPS_19 += build/$(CONFIG)/obj/mprLib.o
DEPS_19 += build/$(CONFIG)/bin/libmpr.dylib
DEPS_19 += build/$(CONFIG)/inc/pcre.h
DEPS_19 += build/$(CONFIG)/obj/pcre.o
ifeq ($(ME_COM_PCRE),1)
    DEPS_19 += build/$(CONFIG)/bin/libpcre.dylib
endif
DEPS_19 += build/$(CONFIG)/inc/http.h
DEPS_19 += build/$(CONFIG)/obj/httpLib.o
ifeq ($(ME_COM_HTTP),1)
    DEPS_19 += build/$(CONFIG)/bin/libhttp.dylib
endif
DEPS_19 += build/$(CONFIG)/inc/zlib.h
DEPS_19 += build/$(CONFIG)/obj/zlib.o
ifeq ($(ME_COM_ZLIB),1)
    DEPS_19 += build/$(CONFIG)/bin/libzlib.dylib
endif
DEPS_19 += build/$(CONFIG)/inc/ejs.h
DEPS_19 += build/$(CONFIG)/inc/ejs.slots.h
DEPS_19 += build/$(CONFIG)/inc/ejsByteGoto.h
DEPS_19 += build/$(CONFIG)/obj/ejsLib.o

ifeq ($(ME_COM_HTTP),1)
    LIBS_19 += -lhttp
endif
LIBS_19 += -lmpr
ifeq ($(ME_COM_PCRE),1)
    LIBS_19 += -lpcre
endif
ifeq ($(ME_COM_ZLIB),1)
    LIBS_19 += -lzlib
endif

build/$(CONFIG)/bin/libejs.dylib: $(DEPS_19)
	@echo '      [Link] build/$(CONFIG)/bin/libejs.dylib'
	$(CC) -dynamiclib -o build/$(CONFIG)/bin/libejs.dylib -arch $(CC_ARCH) $(LDFLAGS) $(LIBPATHS) -install_name @rpath/libejs.dylib -compatibility_version 0.9 -current_version 0.9 "build/$(CONFIG)/obj/ejsLib.o" $(LIBPATHS_19) $(LIBS_19) $(LIBS_19) $(LIBS) 
endif

#
#   ejsc.o
#
DEPS_20 += build/$(CONFIG)/inc/me.h
DEPS_20 += build/$(CONFIG)/inc/ejs.h

build/$(CONFIG)/obj/ejsc.o: \
    src/paks/ejs/ejsc.c $(DEPS_20)
	@echo '   [Compile] build/$(CONFIG)/obj/ejsc.o'
	$(CC) -c $(DFLAGS) -o build/$(CONFIG)/obj/ejsc.o -arch $(CC_ARCH) $(CFLAGS) $(IFLAGS) src/paks/ejs/ejsc.c

ifeq ($(ME_COM_EJS),1)
#
#   ejsc
#
DEPS_21 += build/$(CONFIG)/inc/mpr.h
DEPS_21 += build/$(CONFIG)/inc/me.h
DEPS_21 += build/$(CONFIG)/inc/osdep.h
DEPS_21 += build/$(CONFIG)/obj/mprLib.o
DEPS_21 += build/$(CONFIG)/bin/libmpr.dylib
DEPS_21 += build/$(CONFIG)/inc/pcre.h
DEPS_21 += build/$(CONFIG)/obj/pcre.o
ifeq ($(ME_COM_PCRE),1)
    DEPS_21 += build/$(CONFIG)/bin/libpcre.dylib
endif
DEPS_21 += build/$(CONFIG)/inc/http.h
DEPS_21 += build/$(CONFIG)/obj/httpLib.o
ifeq ($(ME_COM_HTTP),1)
    DEPS_21 += build/$(CONFIG)/bin/libhttp.dylib
endif
DEPS_21 += build/$(CONFIG)/inc/zlib.h
DEPS_21 += build/$(CONFIG)/obj/zlib.o
ifeq ($(ME_COM_ZLIB),1)
    DEPS_21 += build/$(CONFIG)/bin/libzlib.dylib
endif
DEPS_21 += build/$(CONFIG)/inc/ejs.h
DEPS_21 += build/$(CONFIG)/inc/ejs.slots.h
DEPS_21 += build/$(CONFIG)/inc/ejsByteGoto.h
DEPS_21 += build/$(CONFIG)/obj/ejsLib.o
DEPS_21 += build/$(CONFIG)/bin/libejs.dylib
DEPS_21 += build/$(CONFIG)/obj/ejsc.o

LIBS_21 += -lejs
ifeq ($(ME_COM_HTTP),1)
    LIBS_21 += -lhttp
endif
LIBS_21 += -lmpr
ifeq ($(ME_COM_PCRE),1)
    LIBS_21 += -lpcre
endif
ifeq ($(ME_COM_ZLIB),1)
    LIBS_21 += -lzlib
endif

build/$(CONFIG)/bin/ejsc: $(DEPS_21)
	@echo '      [Link] build/$(CONFIG)/bin/ejsc'
	$(CC) -o build/$(CONFIG)/bin/ejsc -arch $(CC_ARCH) $(LDFLAGS) $(LIBPATHS) "build/$(CONFIG)/obj/ejsc.o" $(LIBPATHS_21) $(LIBS_21) $(LIBS_21) $(LIBS) 
endif

ifeq ($(ME_COM_EJS),1)
#
#   ejs.mod
#
DEPS_22 += src/paks/ejs/ejs.es
DEPS_22 += build/$(CONFIG)/inc/mpr.h
DEPS_22 += build/$(CONFIG)/inc/me.h
DEPS_22 += build/$(CONFIG)/inc/osdep.h
DEPS_22 += build/$(CONFIG)/obj/mprLib.o
DEPS_22 += build/$(CONFIG)/bin/libmpr.dylib
DEPS_22 += build/$(CONFIG)/inc/pcre.h
DEPS_22 += build/$(CONFIG)/obj/pcre.o
ifeq ($(ME_COM_PCRE),1)
    DEPS_22 += build/$(CONFIG)/bin/libpcre.dylib
endif
DEPS_22 += build/$(CONFIG)/inc/http.h
DEPS_22 += build/$(CONFIG)/obj/httpLib.o
ifeq ($(ME_COM_HTTP),1)
    DEPS_22 += build/$(CONFIG)/bin/libhttp.dylib
endif
DEPS_22 += build/$(CONFIG)/inc/zlib.h
DEPS_22 += build/$(CONFIG)/obj/zlib.o
ifeq ($(ME_COM_ZLIB),1)
    DEPS_22 += build/$(CONFIG)/bin/libzlib.dylib
endif
DEPS_22 += build/$(CONFIG)/inc/ejs.h
DEPS_22 += build/$(CONFIG)/inc/ejs.slots.h
DEPS_22 += build/$(CONFIG)/inc/ejsByteGoto.h
DEPS_22 += build/$(CONFIG)/obj/ejsLib.o
DEPS_22 += build/$(CONFIG)/bin/libejs.dylib
DEPS_22 += build/$(CONFIG)/obj/ejsc.o
DEPS_22 += build/$(CONFIG)/bin/ejsc

build/$(CONFIG)/bin/ejs.mod: $(DEPS_22)
	( \
	cd src/paks/ejs; \
	../../../$(LBIN)/ejsc --out ../../../build/$(CONFIG)/bin/ejs.mod --optimize 9 --bind --require null ejs.es ; \
	)
endif


#
#   http-ca-crt
#
DEPS_23 += src/paks/http/ca.crt

build/$(CONFIG)/bin/ca.crt: $(DEPS_23)
	@echo '      [Copy] build/$(CONFIG)/bin/ca.crt'
	mkdir -p "build/$(CONFIG)/bin"
	cp src/paks/http/ca.crt build/$(CONFIG)/bin/ca.crt

#
#   est.h
#
build/$(CONFIG)/inc/est.h: $(DEPS_24)
	@echo '      [Copy] build/$(CONFIG)/inc/est.h'
	mkdir -p "build/$(CONFIG)/inc"
	cp src/paks/est/est.h build/$(CONFIG)/inc/est.h

#
#   estLib.o
#
DEPS_25 += build/$(CONFIG)/inc/me.h
DEPS_25 += build/$(CONFIG)/inc/est.h
DEPS_25 += build/$(CONFIG)/inc/osdep.h

build/$(CONFIG)/obj/estLib.o: \
    src/paks/est/estLib.c $(DEPS_25)
	@echo '   [Compile] build/$(CONFIG)/obj/estLib.o'
	$(CC) -c $(DFLAGS) -o build/$(CONFIG)/obj/estLib.o -arch $(CC_ARCH) $(CFLAGS) $(IFLAGS) src/paks/est/estLib.c

ifeq ($(ME_COM_EST),1)
#
#   libest
#
DEPS_26 += build/$(CONFIG)/inc/est.h
DEPS_26 += build/$(CONFIG)/inc/me.h
DEPS_26 += build/$(CONFIG)/inc/osdep.h
DEPS_26 += build/$(CONFIG)/obj/estLib.o

build/$(CONFIG)/bin/libest.dylib: $(DEPS_26)
	@echo '      [Link] build/$(CONFIG)/bin/libest.dylib'
	$(CC) -dynamiclib -o build/$(CONFIG)/bin/libest.dylib -arch $(CC_ARCH) $(LDFLAGS) $(LIBPATHS) -install_name @rpath/libest.dylib -compatibility_version 0.9 -current_version 0.9 "build/$(CONFIG)/obj/estLib.o" $(LIBS) 
endif

#
#   mprSsl.o
#
DEPS_27 += build/$(CONFIG)/inc/me.h
DEPS_27 += build/$(CONFIG)/inc/mpr.h
DEPS_27 += build/$(CONFIG)/inc/est.h

build/$(CONFIG)/obj/mprSsl.o: \
    src/paks/mpr/mprSsl.c $(DEPS_27)
	@echo '   [Compile] build/$(CONFIG)/obj/mprSsl.o'
	$(CC) -c $(DFLAGS) -o build/$(CONFIG)/obj/mprSsl.o -arch $(CC_ARCH) $(CFLAGS) $(IFLAGS) "-I$(ME_COM_OPENSSL_PATH)/include" "-I$(ME_COM_MATRIXSSL_PATH)" "-I$(ME_COM_MATRIXSSL_PATH)/matrixssl" "-I$(ME_COM_NANOSSL_PATH)/src" src/paks/mpr/mprSsl.c

#
#   libmprssl
#
DEPS_28 += build/$(CONFIG)/inc/mpr.h
DEPS_28 += build/$(CONFIG)/inc/me.h
DEPS_28 += build/$(CONFIG)/inc/osdep.h
DEPS_28 += build/$(CONFIG)/obj/mprLib.o
DEPS_28 += build/$(CONFIG)/bin/libmpr.dylib
DEPS_28 += build/$(CONFIG)/inc/est.h
DEPS_28 += build/$(CONFIG)/obj/estLib.o
ifeq ($(ME_COM_EST),1)
    DEPS_28 += build/$(CONFIG)/bin/libest.dylib
endif
DEPS_28 += build/$(CONFIG)/obj/mprSsl.o

LIBS_28 += -lmpr
ifeq ($(ME_COM_OPENSSL),1)
    LIBS_28 += -lssl
    LIBPATHS_28 += -L$(ME_COM_OPENSSL_PATH)
endif
ifeq ($(ME_COM_OPENSSL),1)
    LIBS_28 += -lcrypto
    LIBPATHS_28 += -L$(ME_COM_OPENSSL_PATH)
endif
ifeq ($(ME_COM_EST),1)
    LIBS_28 += -lest
endif
ifeq ($(ME_COM_MATRIXSSL),1)
    LIBS_28 += -lmatrixssl
    LIBPATHS_28 += -L$(ME_COM_MATRIXSSL_PATH)
endif
ifeq ($(ME_COM_NANOSSL),1)
    LIBS_28 += -lssls
    LIBPATHS_28 += -L$(ME_COM_NANOSSL_PATH)/bin
endif

build/$(CONFIG)/bin/libmprssl.dylib: $(DEPS_28)
	@echo '      [Link] build/$(CONFIG)/bin/libmprssl.dylib'
	$(CC) -dynamiclib -o build/$(CONFIG)/bin/libmprssl.dylib -arch $(CC_ARCH) $(LDFLAGS) $(LIBPATHS)    -install_name @rpath/libmprssl.dylib -compatibility_version 0.9 -current_version 0.9 "build/$(CONFIG)/obj/mprSsl.o" $(LIBPATHS_28) $(LIBS_28) $(LIBS_28) $(LIBS) 

#
#   pak.mod
#
DEPS_29 += src/Package.es
DEPS_29 += src/pak.es
DEPS_29 += src/paks/ejs-version/Version.es
DEPS_29 += build/$(CONFIG)/inc/mpr.h
DEPS_29 += build/$(CONFIG)/inc/me.h
DEPS_29 += build/$(CONFIG)/inc/osdep.h
DEPS_29 += build/$(CONFIG)/obj/mprLib.o
DEPS_29 += build/$(CONFIG)/bin/libmpr.dylib
DEPS_29 += build/$(CONFIG)/inc/pcre.h
DEPS_29 += build/$(CONFIG)/obj/pcre.o
ifeq ($(ME_COM_PCRE),1)
    DEPS_29 += build/$(CONFIG)/bin/libpcre.dylib
endif
DEPS_29 += build/$(CONFIG)/inc/http.h
DEPS_29 += build/$(CONFIG)/obj/httpLib.o
ifeq ($(ME_COM_HTTP),1)
    DEPS_29 += build/$(CONFIG)/bin/libhttp.dylib
endif
DEPS_29 += build/$(CONFIG)/inc/zlib.h
DEPS_29 += build/$(CONFIG)/obj/zlib.o
ifeq ($(ME_COM_ZLIB),1)
    DEPS_29 += build/$(CONFIG)/bin/libzlib.dylib
endif
DEPS_29 += build/$(CONFIG)/inc/ejs.h
DEPS_29 += build/$(CONFIG)/inc/ejs.slots.h
DEPS_29 += build/$(CONFIG)/inc/ejsByteGoto.h
DEPS_29 += build/$(CONFIG)/obj/ejsLib.o
ifeq ($(ME_COM_EJS),1)
    DEPS_29 += build/$(CONFIG)/bin/libejs.dylib
endif
DEPS_29 += build/$(CONFIG)/obj/ejsc.o
ifeq ($(ME_COM_EJS),1)
    DEPS_29 += build/$(CONFIG)/bin/ejsc
endif

build/$(CONFIG)/bin/pak.mod: $(DEPS_29)
	( \
	cd .; \
	$(LBIN)/ejsc --out ./build/$(CONFIG)/bin/pak.mod --optimize 9 ./src/Package.es ./src/pak.es ./src/paks/ejs-version/Version.es ; \
	)

#
#   pak.o
#
DEPS_30 += build/$(CONFIG)/inc/me.h
DEPS_30 += build/$(CONFIG)/inc/ejs.h

build/$(CONFIG)/obj/pak.o: \
    src/pak.c $(DEPS_30)
	@echo '   [Compile] build/$(CONFIG)/obj/pak.o'
	$(CC) -c $(DFLAGS) -o build/$(CONFIG)/obj/pak.o -arch $(CC_ARCH) $(CFLAGS) $(IFLAGS) src/pak.c

#
#   pak
#
DEPS_31 += build/$(CONFIG)/inc/mpr.h
DEPS_31 += build/$(CONFIG)/inc/me.h
DEPS_31 += build/$(CONFIG)/inc/osdep.h
DEPS_31 += build/$(CONFIG)/obj/mprLib.o
DEPS_31 += build/$(CONFIG)/bin/libmpr.dylib
DEPS_31 += build/$(CONFIG)/inc/pcre.h
DEPS_31 += build/$(CONFIG)/obj/pcre.o
ifeq ($(ME_COM_PCRE),1)
    DEPS_31 += build/$(CONFIG)/bin/libpcre.dylib
endif
DEPS_31 += build/$(CONFIG)/inc/http.h
DEPS_31 += build/$(CONFIG)/obj/httpLib.o
ifeq ($(ME_COM_HTTP),1)
    DEPS_31 += build/$(CONFIG)/bin/libhttp.dylib
endif
DEPS_31 += build/$(CONFIG)/inc/zlib.h
DEPS_31 += build/$(CONFIG)/obj/zlib.o
ifeq ($(ME_COM_ZLIB),1)
    DEPS_31 += build/$(CONFIG)/bin/libzlib.dylib
endif
DEPS_31 += build/$(CONFIG)/inc/ejs.h
DEPS_31 += build/$(CONFIG)/inc/ejs.slots.h
DEPS_31 += build/$(CONFIG)/inc/ejsByteGoto.h
DEPS_31 += build/$(CONFIG)/obj/ejsLib.o
ifeq ($(ME_COM_EJS),1)
    DEPS_31 += build/$(CONFIG)/bin/libejs.dylib
endif
DEPS_31 += build/$(CONFIG)/obj/ejsc.o
ifeq ($(ME_COM_EJS),1)
    DEPS_31 += build/$(CONFIG)/bin/ejsc
endif
DEPS_31 += build/$(CONFIG)/bin/pak.mod
DEPS_31 += build/$(CONFIG)/obj/pak.o

ifeq ($(ME_COM_EJS),1)
    LIBS_31 += -lejs
endif
ifeq ($(ME_COM_HTTP),1)
    LIBS_31 += -lhttp
endif
LIBS_31 += -lmpr
ifeq ($(ME_COM_PCRE),1)
    LIBS_31 += -lpcre
endif
ifeq ($(ME_COM_ZLIB),1)
    LIBS_31 += -lzlib
endif

build/$(CONFIG)/bin/pak: $(DEPS_31)
	@echo '      [Link] build/$(CONFIG)/bin/pak'
	$(CC) -o build/$(CONFIG)/bin/pak -arch $(CC_ARCH) $(LDFLAGS) $(LIBPATHS) "build/$(CONFIG)/obj/pak.o" $(LIBPATHS_31) $(LIBS_31) $(LIBS_31) $(LIBS) 

#
#   stop
#
stop: $(DEPS_32)

#
#   installBinary
#
installBinary: $(DEPS_33)
	( \
	cd .; \
	mkdir -p "$(ME_APP_PREFIX)" ; \
	rm -f "$(ME_APP_PREFIX)/latest" ; \
	ln -s "0.9.4" "$(ME_APP_PREFIX)/latest" ; \
	mkdir -p "$(ME_VAPP_PREFIX)/bin" ; \
	cp build/$(CONFIG)/bin/pak $(ME_VAPP_PREFIX)/bin/pak ; \
	mkdir -p "$(ME_BIN_PREFIX)" ; \
	rm -f "$(ME_BIN_PREFIX)/pak" ; \
	ln -s "$(ME_VAPP_PREFIX)/bin/pak" "$(ME_BIN_PREFIX)/pak" ; \
	cp build/$(CONFIG)/bin/libejs.dylib $(ME_VAPP_PREFIX)/bin/libejs.dylib ; \
	cp build/$(CONFIG)/bin/libhttp.dylib $(ME_VAPP_PREFIX)/bin/libhttp.dylib ; \
	cp build/$(CONFIG)/bin/libmpr.dylib $(ME_VAPP_PREFIX)/bin/libmpr.dylib ; \
	cp build/$(CONFIG)/bin/libmprssl.dylib $(ME_VAPP_PREFIX)/bin/libmprssl.dylib ; \
	cp build/$(CONFIG)/bin/libpcre.dylib $(ME_VAPP_PREFIX)/bin/libpcre.dylib ; \
	cp build/$(CONFIG)/bin/libzlib.dylib $(ME_VAPP_PREFIX)/bin/libzlib.dylib ; \
	if [ "$(ME_COM_OPENSSL)" = 1 ]; then true ; \
	cp build/$(CONFIG)/bin/libssl*.dylib* $(ME_VAPP_PREFIX)/bin/libssl*.dylib* ; \
	cp build/$(CONFIG)/bin/libcrypto*.dylib* $(ME_VAPP_PREFIX)/bin/libcrypto*.dylib* ; \
	fi ; \
	if [ "$(ME_COM_EST)" = 1 ]; then true ; \
	cp build/$(CONFIG)/bin/libest.dylib $(ME_VAPP_PREFIX)/bin/libest.dylib ; \
	fi ; \
	cp build/$(CONFIG)/bin/ca.crt $(ME_VAPP_PREFIX)/bin/ca.crt ; \
	cp build/$(CONFIG)/bin/ejs.mod $(ME_VAPP_PREFIX)/bin/ejs.mod ; \
	cp build/$(CONFIG)/bin/pak.mod $(ME_VAPP_PREFIX)/bin/pak.mod ; \
	mkdir -p "$(ME_VAPP_PREFIX)/doc/man/man1" ; \
	cp doc/man/pak.1 $(ME_VAPP_PREFIX)/doc/man/man1/pak.1 ; \
	mkdir -p "$(ME_MAN_PREFIX)/man1" ; \
	rm -f "$(ME_MAN_PREFIX)/man1/pak.1" ; \
	ln -s "$(ME_VAPP_PREFIX)/doc/man/man1/pak.1" "$(ME_MAN_PREFIX)/man1/pak.1" ; \
	)

#
#   start
#
start: $(DEPS_34)

#
#   install
#
DEPS_35 += stop
DEPS_35 += installBinary
DEPS_35 += start

install: $(DEPS_35)

#
#   uninstall
#
DEPS_36 += stop

uninstall: $(DEPS_36)
	( \
	cd .; \
	rm -fr "$(ME_VAPP_PREFIX)" ; \
	rm -f "$(ME_APP_PREFIX)/latest" ; \
	rmdir -p "$(ME_APP_PREFIX)" 2>/dev/null ; true ; \
	)

#
#   version
#
version: $(DEPS_37)
	echo 0.9.4

