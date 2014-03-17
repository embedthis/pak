#
#   pak-macosx-default.mk -- Makefile to build Embedthis Pak for macosx
#

NAME                  := pak
VERSION               := 0.8.2
PROFILE               ?= default
ARCH                  ?= $(shell uname -m | sed 's/i.86/x86/;s/x86_64/x64/;s/arm.*/arm/;s/mips.*/mips/')
CC_ARCH               ?= $(shell echo $(ARCH) | sed 's/x86/i686/;s/x64/x86_64/')
OS                    ?= macosx
CC                    ?= clang
LD                    ?= ld
CONFIG                ?= $(OS)-$(ARCH)-$(PROFILE)
LBIN                  ?= $(CONFIG)/bin
PATH                  := $(LBIN):$(PATH)

ME_EXT_EJS            ?= 1
ME_EXT_EST            ?= 1
ME_EXT_HTTP           ?= 1
ME_EXT_PCRE           ?= 1
ME_EXT_SQLITE         ?= 1
ME_EXT_SSL            ?= 1
ME_EXT_ZLIB           ?= 1

ME_EXT_COMPILER_PATH  ?= clang
ME_EXT_DSI_PATH       ?= dsi
ME_EXT_EJS_PATH       ?= src/paks/ejs/ejs.me
ME_EXT_EST_PATH       ?= src/paks/est/est.me
ME_EXT_HTTP_PATH      ?= src/paks/http/http.me
ME_EXT_LIB_PATH       ?= ar
ME_EXT_LINK_PATH      ?= ld
ME_EXT_MAN_PATH       ?= man
ME_EXT_MAN2HTML_PATH  ?= man2html
ME_EXT_MATRIXSSL_PATH ?= /usr/src/matrixssl
ME_EXT_MPR_PATH       ?= src/paks/mpr/mpr.me
ME_EXT_NANOSSL_PATH   ?= /usr/src/nanossl
ME_EXT_OPENSSL_PATH   ?= /usr/src/openssl
ME_EXT_OSDEP_PATH     ?= src/paks/osdep/osdep.me
ME_EXT_PCRE_PATH      ?= src/paks/pcre/pcre.me
ME_EXT_PMAKER_PATH    ?= /Applications/PackageMaker.app/Contents/MacOS/PackageMaker
ME_EXT_VXWORKS_PATH   ?= $(WIND_BASE)
ME_EXT_ZIP_PATH       ?= zip
ME_EXT_ZLIB_PATH      ?= src/paks/zlib/zlib.me

export WIND_HOME      ?= $(WIND_BASE)/..

CFLAGS                += -w
DFLAGS                +=  $(patsubst %,-D%,$(filter ME_%,$(MAKEFLAGS))) -DME_EXT_EJS=$(ME_EXT_EJS) -DME_EXT_EST=$(ME_EXT_EST) -DME_EXT_HTTP=$(ME_EXT_HTTP) -DME_EXT_PCRE=$(ME_EXT_PCRE) -DME_EXT_SQLITE=$(ME_EXT_SQLITE) -DME_EXT_SSL=$(ME_EXT_SSL) -DME_EXT_ZLIB=$(ME_EXT_ZLIB) 
IFLAGS                += "-I$(CONFIG)/inc"
LDFLAGS               += '-Wl,-rpath,@executable_path/' '-Wl,-rpath,@loader_path/'
LIBPATHS              += -L$(CONFIG)/bin
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


ifeq ($(ME_EXT_EJS),1)
    TARGETS           += $(CONFIG)/bin/libejs.dylib
endif
ifeq ($(ME_EXT_EJS),1)
    TARGETS           += $(CONFIG)/bin/ejsc
endif
ifeq ($(ME_EXT_EJS),1)
    TARGETS           += $(CONFIG)/bin/ejs.mod
endif
ifeq ($(ME_EXT_EST),1)
    TARGETS           += $(CONFIG)/bin/libest.dylib
endif
TARGETS               += $(CONFIG)/bin/ca.crt
TARGETS               += $(CONFIG)/bin/http
TARGETS               += $(CONFIG)/bin/libmprssl.dylib
ifeq ($(ME_EXT_SQLITE),1)
    TARGETS           += $(CONFIG)/bin/libsql.dylib
endif
ifeq ($(ME_EXT_SQLITE),1)
    TARGETS           += $(CONFIG)/bin/sqlite
endif
TARGETS               += $(CONFIG)/bin/pak.mod
TARGETS               += $(CONFIG)/bin/pak

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
	@[ ! -x $(CONFIG)/bin ] && mkdir -p $(CONFIG)/bin; true
	@[ ! -x $(CONFIG)/inc ] && mkdir -p $(CONFIG)/inc; true
	@[ ! -x $(CONFIG)/obj ] && mkdir -p $(CONFIG)/obj; true
	@[ ! -f $(CONFIG)/inc/osdep.h ] && cp src/paks/osdep/osdep.h $(CONFIG)/inc/osdep.h ; true
	@if ! diff $(CONFIG)/inc/osdep.h src/paks/osdep/osdep.h >/dev/null ; then\
		cp src/paks/osdep/osdep.h $(CONFIG)/inc/osdep.h  ; \
	fi; true
	@[ ! -f $(CONFIG)/inc/me.h ] && cp projects/pak-macosx-default-me.h $(CONFIG)/inc/me.h ; true
	@if ! diff $(CONFIG)/inc/me.h projects/pak-macosx-default-me.h >/dev/null ; then\
		cp projects/pak-macosx-default-me.h $(CONFIG)/inc/me.h  ; \
	fi; true
	@if [ -f "$(CONFIG)/.makeflags" ] ; then \
		if [ "$(MAKEFLAGS)" != " ` cat $(CONFIG)/.makeflags`" ] ; then \
			echo "   [Warning] Make flags have changed since the last build: "`cat $(CONFIG)/.makeflags`"" ; \
		fi ; \
	fi
	@echo $(MAKEFLAGS) >$(CONFIG)/.makeflags

clean:
	rm -f "$(CONFIG)/bin/libejs.dylib"
	rm -f "$(CONFIG)/bin/ejsc"
	rm -f "$(CONFIG)/bin/libest.dylib"
	rm -f "$(CONFIG)/bin/ca.crt"
	rm -f "$(CONFIG)/bin/libhttp.dylib"
	rm -f "$(CONFIG)/bin/http"
	rm -f "$(CONFIG)/bin/libmpr.dylib"
	rm -f "$(CONFIG)/bin/libmprssl.dylib"
	rm -f "$(CONFIG)/bin/makerom"
	rm -f "$(CONFIG)/bin/libpcre.dylib"
	rm -f "$(CONFIG)/bin/libsql.dylib"
	rm -f "$(CONFIG)/bin/sqlite"
	rm -f "$(CONFIG)/bin/libzlib.dylib"
	rm -f "$(CONFIG)/bin/pak"
	rm -f "$(CONFIG)/obj/ejsLib.o"
	rm -f "$(CONFIG)/obj/ejsc.o"
	rm -f "$(CONFIG)/obj/estLib.o"
	rm -f "$(CONFIG)/obj/httpLib.o"
	rm -f "$(CONFIG)/obj/http.o"
	rm -f "$(CONFIG)/obj/mprLib.o"
	rm -f "$(CONFIG)/obj/mprSsl.o"
	rm -f "$(CONFIG)/obj/makerom.o"
	rm -f "$(CONFIG)/obj/pcre.o"
	rm -f "$(CONFIG)/obj/sqlite3.o"
	rm -f "$(CONFIG)/obj/sqlite.o"
	rm -f "$(CONFIG)/obj/zlib.o"
	rm -f "$(CONFIG)/obj/pak.o"

clobber: clean
	rm -fr ./$(CONFIG)



#
#   version
#
version: $(DEPS_1)
	echo 0.8.2

#
#   mpr.h
#
$(CONFIG)/inc/mpr.h: $(DEPS_2)
	@echo '      [Copy] $(CONFIG)/inc/mpr.h'
	mkdir -p "$(CONFIG)/inc"
	cp src/paks/mpr/mpr.h $(CONFIG)/inc/mpr.h

#
#   me.h
#
$(CONFIG)/inc/me.h: $(DEPS_3)
	@echo '      [Copy] $(CONFIG)/inc/me.h'

#
#   osdep.h
#
$(CONFIG)/inc/osdep.h: $(DEPS_4)
	@echo '      [Copy] $(CONFIG)/inc/osdep.h'
	mkdir -p "$(CONFIG)/inc"
	cp src/paks/osdep/osdep.h $(CONFIG)/inc/osdep.h

#
#   mprLib.o
#
DEPS_5 += $(CONFIG)/inc/me.h
DEPS_5 += $(CONFIG)/inc/mpr.h
DEPS_5 += $(CONFIG)/inc/osdep.h

$(CONFIG)/obj/mprLib.o: \
    src/paks/mpr/mprLib.c $(DEPS_5)
	@echo '   [Compile] $(CONFIG)/obj/mprLib.o'
	$(CC) -c $(CFLAGS) $(DFLAGS) -o $(CONFIG)/obj/mprLib.o -arch $(CC_ARCH) $(IFLAGS) src/paks/mpr/mprLib.c

#
#   libmpr
#
DEPS_6 += $(CONFIG)/inc/mpr.h
DEPS_6 += $(CONFIG)/inc/me.h
DEPS_6 += $(CONFIG)/inc/osdep.h
DEPS_6 += $(CONFIG)/obj/mprLib.o

$(CONFIG)/bin/libmpr.dylib: $(DEPS_6)
	@echo '      [Link] $(CONFIG)/bin/libmpr.dylib'
	$(CC) -dynamiclib -o $(CONFIG)/bin/libmpr.dylib -arch $(CC_ARCH) $(LDFLAGS) $(LIBPATHS) -install_name @rpath/libmpr.dylib -compatibility_version 0.8.2 -current_version 0.8.2 "$(CONFIG)/obj/mprLib.o" $(LIBS) 

#
#   pcre.h
#
$(CONFIG)/inc/pcre.h: $(DEPS_7)
	@echo '      [Copy] $(CONFIG)/inc/pcre.h'
	mkdir -p "$(CONFIG)/inc"
	cp src/paks/pcre/pcre.h $(CONFIG)/inc/pcre.h

#
#   pcre.o
#
DEPS_8 += $(CONFIG)/inc/me.h
DEPS_8 += $(CONFIG)/inc/pcre.h

$(CONFIG)/obj/pcre.o: \
    src/paks/pcre/pcre.c $(DEPS_8)
	@echo '   [Compile] $(CONFIG)/obj/pcre.o'
	$(CC) -c $(CFLAGS) $(DFLAGS) -o $(CONFIG)/obj/pcre.o -arch $(CC_ARCH) $(IFLAGS) src/paks/pcre/pcre.c

ifeq ($(ME_EXT_PCRE),1)
#
#   libpcre
#
DEPS_9 += $(CONFIG)/inc/pcre.h
DEPS_9 += $(CONFIG)/inc/me.h
DEPS_9 += $(CONFIG)/obj/pcre.o

$(CONFIG)/bin/libpcre.dylib: $(DEPS_9)
	@echo '      [Link] $(CONFIG)/bin/libpcre.dylib'
	$(CC) -dynamiclib -o $(CONFIG)/bin/libpcre.dylib -arch $(CC_ARCH) $(LDFLAGS) -compatibility_version 0.8.2 -current_version 0.8.2 $(LIBPATHS) -install_name @rpath/libpcre.dylib -compatibility_version 0.8.2 -current_version 0.8.2 "$(CONFIG)/obj/pcre.o" $(LIBS) 
endif

#
#   http.h
#
$(CONFIG)/inc/http.h: $(DEPS_10)
	@echo '      [Copy] $(CONFIG)/inc/http.h'
	mkdir -p "$(CONFIG)/inc"
	cp src/paks/http/http.h $(CONFIG)/inc/http.h

#
#   httpLib.o
#
DEPS_11 += $(CONFIG)/inc/me.h
DEPS_11 += $(CONFIG)/inc/http.h
DEPS_11 += $(CONFIG)/inc/mpr.h

$(CONFIG)/obj/httpLib.o: \
    src/paks/http/httpLib.c $(DEPS_11)
	@echo '   [Compile] $(CONFIG)/obj/httpLib.o'
	$(CC) -c $(CFLAGS) $(DFLAGS) -o $(CONFIG)/obj/httpLib.o -arch $(CC_ARCH) $(IFLAGS) src/paks/http/httpLib.c

#
#   libhttp
#
DEPS_12 += $(CONFIG)/inc/mpr.h
DEPS_12 += $(CONFIG)/inc/me.h
DEPS_12 += $(CONFIG)/inc/osdep.h
DEPS_12 += $(CONFIG)/obj/mprLib.o
DEPS_12 += $(CONFIG)/bin/libmpr.dylib
DEPS_12 += $(CONFIG)/inc/pcre.h
DEPS_12 += $(CONFIG)/obj/pcre.o
ifeq ($(ME_EXT_PCRE),1)
    DEPS_12 += $(CONFIG)/bin/libpcre.dylib
endif
DEPS_12 += $(CONFIG)/inc/http.h
DEPS_12 += $(CONFIG)/obj/httpLib.o

LIBS_12 += -lmpr
ifeq ($(ME_EXT_PCRE),1)
    LIBS_12 += -lpcre
endif

$(CONFIG)/bin/libhttp.dylib: $(DEPS_12)
	@echo '      [Link] $(CONFIG)/bin/libhttp.dylib'
	$(CC) -dynamiclib -o $(CONFIG)/bin/libhttp.dylib -arch $(CC_ARCH) $(LDFLAGS) $(LIBPATHS) -install_name @rpath/libhttp.dylib -compatibility_version 0.8.2 -current_version 0.8.2 "$(CONFIG)/obj/httpLib.o" $(LIBPATHS_12) $(LIBS_12) $(LIBS_12) $(LIBS) 

#
#   zlib.h
#
$(CONFIG)/inc/zlib.h: $(DEPS_13)
	@echo '      [Copy] $(CONFIG)/inc/zlib.h'
	mkdir -p "$(CONFIG)/inc"
	cp src/paks/zlib/zlib.h $(CONFIG)/inc/zlib.h

#
#   zlib.o
#
DEPS_14 += $(CONFIG)/inc/me.h
DEPS_14 += $(CONFIG)/inc/zlib.h

$(CONFIG)/obj/zlib.o: \
    src/paks/zlib/zlib.c $(DEPS_14)
	@echo '   [Compile] $(CONFIG)/obj/zlib.o'
	$(CC) -c $(CFLAGS) $(DFLAGS) -o $(CONFIG)/obj/zlib.o -arch $(CC_ARCH) $(IFLAGS) src/paks/zlib/zlib.c

ifeq ($(ME_EXT_ZLIB),1)
#
#   libzlib
#
DEPS_15 += $(CONFIG)/inc/zlib.h
DEPS_15 += $(CONFIG)/inc/me.h
DEPS_15 += $(CONFIG)/obj/zlib.o

$(CONFIG)/bin/libzlib.dylib: $(DEPS_15)
	@echo '      [Link] $(CONFIG)/bin/libzlib.dylib'
	$(CC) -dynamiclib -o $(CONFIG)/bin/libzlib.dylib -arch $(CC_ARCH) $(LDFLAGS) $(LIBPATHS) -install_name @rpath/libzlib.dylib -compatibility_version 0.8.2 -current_version 0.8.2 "$(CONFIG)/obj/zlib.o" $(LIBS) 
endif

#
#   ejs.h
#
$(CONFIG)/inc/ejs.h: $(DEPS_16)
	@echo '      [Copy] $(CONFIG)/inc/ejs.h'
	mkdir -p "$(CONFIG)/inc"
	cp src/paks/ejs/ejs.h $(CONFIG)/inc/ejs.h

#
#   ejs.slots.h
#
$(CONFIG)/inc/ejs.slots.h: $(DEPS_17)
	@echo '      [Copy] $(CONFIG)/inc/ejs.slots.h'
	mkdir -p "$(CONFIG)/inc"
	cp src/paks/ejs/ejs.slots.h $(CONFIG)/inc/ejs.slots.h

#
#   ejsByteGoto.h
#
$(CONFIG)/inc/ejsByteGoto.h: $(DEPS_18)
	@echo '      [Copy] $(CONFIG)/inc/ejsByteGoto.h'
	mkdir -p "$(CONFIG)/inc"
	cp src/paks/ejs/ejsByteGoto.h $(CONFIG)/inc/ejsByteGoto.h

#
#   ejsLib.o
#
DEPS_19 += $(CONFIG)/inc/me.h
DEPS_19 += $(CONFIG)/inc/ejs.h
DEPS_19 += $(CONFIG)/inc/mpr.h
DEPS_19 += $(CONFIG)/inc/pcre.h
DEPS_19 += $(CONFIG)/inc/osdep.h
DEPS_19 += $(CONFIG)/inc/http.h
DEPS_19 += $(CONFIG)/inc/ejs.slots.h
DEPS_19 += $(CONFIG)/inc/zlib.h

$(CONFIG)/obj/ejsLib.o: \
    src/paks/ejs/ejsLib.c $(DEPS_19)
	@echo '   [Compile] $(CONFIG)/obj/ejsLib.o'
	$(CC) -c $(CFLAGS) $(DFLAGS) -o $(CONFIG)/obj/ejsLib.o -arch $(CC_ARCH) $(IFLAGS) src/paks/ejs/ejsLib.c

ifeq ($(ME_EXT_EJS),1)
#
#   libejs
#
DEPS_20 += $(CONFIG)/inc/mpr.h
DEPS_20 += $(CONFIG)/inc/me.h
DEPS_20 += $(CONFIG)/inc/osdep.h
DEPS_20 += $(CONFIG)/obj/mprLib.o
DEPS_20 += $(CONFIG)/bin/libmpr.dylib
DEPS_20 += $(CONFIG)/inc/pcre.h
DEPS_20 += $(CONFIG)/obj/pcre.o
ifeq ($(ME_EXT_PCRE),1)
    DEPS_20 += $(CONFIG)/bin/libpcre.dylib
endif
DEPS_20 += $(CONFIG)/inc/http.h
DEPS_20 += $(CONFIG)/obj/httpLib.o
DEPS_20 += $(CONFIG)/bin/libhttp.dylib
DEPS_20 += $(CONFIG)/inc/zlib.h
DEPS_20 += $(CONFIG)/obj/zlib.o
ifeq ($(ME_EXT_ZLIB),1)
    DEPS_20 += $(CONFIG)/bin/libzlib.dylib
endif
DEPS_20 += $(CONFIG)/inc/ejs.h
DEPS_20 += $(CONFIG)/inc/ejs.slots.h
DEPS_20 += $(CONFIG)/inc/ejsByteGoto.h
DEPS_20 += $(CONFIG)/obj/ejsLib.o

LIBS_20 += -lhttp
LIBS_20 += -lmpr
ifeq ($(ME_EXT_PCRE),1)
    LIBS_20 += -lpcre
endif
ifeq ($(ME_EXT_ZLIB),1)
    LIBS_20 += -lzlib
endif

$(CONFIG)/bin/libejs.dylib: $(DEPS_20)
	@echo '      [Link] $(CONFIG)/bin/libejs.dylib'
	$(CC) -dynamiclib -o $(CONFIG)/bin/libejs.dylib -arch $(CC_ARCH) $(LDFLAGS) $(LIBPATHS) -install_name @rpath/libejs.dylib -compatibility_version 0.8.2 -current_version 0.8.2 "$(CONFIG)/obj/ejsLib.o" $(LIBPATHS_20) $(LIBS_20) $(LIBS_20) $(LIBS) 
endif

#
#   ejsc.o
#
DEPS_21 += $(CONFIG)/inc/me.h
DEPS_21 += $(CONFIG)/inc/ejs.h

$(CONFIG)/obj/ejsc.o: \
    src/paks/ejs/ejsc.c $(DEPS_21)
	@echo '   [Compile] $(CONFIG)/obj/ejsc.o'
	$(CC) -c $(CFLAGS) $(DFLAGS) -o $(CONFIG)/obj/ejsc.o -arch $(CC_ARCH) $(IFLAGS) src/paks/ejs/ejsc.c

ifeq ($(ME_EXT_EJS),1)
#
#   ejsc
#
DEPS_22 += $(CONFIG)/inc/mpr.h
DEPS_22 += $(CONFIG)/inc/me.h
DEPS_22 += $(CONFIG)/inc/osdep.h
DEPS_22 += $(CONFIG)/obj/mprLib.o
DEPS_22 += $(CONFIG)/bin/libmpr.dylib
DEPS_22 += $(CONFIG)/inc/pcre.h
DEPS_22 += $(CONFIG)/obj/pcre.o
ifeq ($(ME_EXT_PCRE),1)
    DEPS_22 += $(CONFIG)/bin/libpcre.dylib
endif
DEPS_22 += $(CONFIG)/inc/http.h
DEPS_22 += $(CONFIG)/obj/httpLib.o
DEPS_22 += $(CONFIG)/bin/libhttp.dylib
DEPS_22 += $(CONFIG)/inc/zlib.h
DEPS_22 += $(CONFIG)/obj/zlib.o
ifeq ($(ME_EXT_ZLIB),1)
    DEPS_22 += $(CONFIG)/bin/libzlib.dylib
endif
DEPS_22 += $(CONFIG)/inc/ejs.h
DEPS_22 += $(CONFIG)/inc/ejs.slots.h
DEPS_22 += $(CONFIG)/inc/ejsByteGoto.h
DEPS_22 += $(CONFIG)/obj/ejsLib.o
DEPS_22 += $(CONFIG)/bin/libejs.dylib
DEPS_22 += $(CONFIG)/obj/ejsc.o

LIBS_22 += -lejs
LIBS_22 += -lhttp
LIBS_22 += -lmpr
ifeq ($(ME_EXT_PCRE),1)
    LIBS_22 += -lpcre
endif
ifeq ($(ME_EXT_ZLIB),1)
    LIBS_22 += -lzlib
endif

$(CONFIG)/bin/ejsc: $(DEPS_22)
	@echo '      [Link] $(CONFIG)/bin/ejsc'
	$(CC) -o $(CONFIG)/bin/ejsc -arch $(CC_ARCH) $(LDFLAGS) $(LIBPATHS) "$(CONFIG)/obj/ejsc.o" $(LIBPATHS_22) $(LIBS_22) $(LIBS_22) $(LIBS) 
endif

ifeq ($(ME_EXT_EJS),1)
#
#   ejs.mod
#
DEPS_23 += src/paks/ejs/ejs.es
DEPS_23 += $(CONFIG)/inc/mpr.h
DEPS_23 += $(CONFIG)/inc/me.h
DEPS_23 += $(CONFIG)/inc/osdep.h
DEPS_23 += $(CONFIG)/obj/mprLib.o
DEPS_23 += $(CONFIG)/bin/libmpr.dylib
DEPS_23 += $(CONFIG)/inc/pcre.h
DEPS_23 += $(CONFIG)/obj/pcre.o
ifeq ($(ME_EXT_PCRE),1)
    DEPS_23 += $(CONFIG)/bin/libpcre.dylib
endif
DEPS_23 += $(CONFIG)/inc/http.h
DEPS_23 += $(CONFIG)/obj/httpLib.o
DEPS_23 += $(CONFIG)/bin/libhttp.dylib
DEPS_23 += $(CONFIG)/inc/zlib.h
DEPS_23 += $(CONFIG)/obj/zlib.o
ifeq ($(ME_EXT_ZLIB),1)
    DEPS_23 += $(CONFIG)/bin/libzlib.dylib
endif
DEPS_23 += $(CONFIG)/inc/ejs.h
DEPS_23 += $(CONFIG)/inc/ejs.slots.h
DEPS_23 += $(CONFIG)/inc/ejsByteGoto.h
DEPS_23 += $(CONFIG)/obj/ejsLib.o
DEPS_23 += $(CONFIG)/bin/libejs.dylib
DEPS_23 += $(CONFIG)/obj/ejsc.o
DEPS_23 += $(CONFIG)/bin/ejsc

$(CONFIG)/bin/ejs.mod: $(DEPS_23)
	( \
	cd src/paks/ejs; \
	../../../$(CONFIG)/bin/ejsc --out ../../../$(CONFIG)/bin/ejs.mod --optimize 9 --bind --require null ejs.es ; \
	)
endif

#
#   est.h
#
$(CONFIG)/inc/est.h: $(DEPS_24)
	@echo '      [Copy] $(CONFIG)/inc/est.h'
	mkdir -p "$(CONFIG)/inc"
	cp src/paks/est/est.h $(CONFIG)/inc/est.h

#
#   estLib.o
#
DEPS_25 += $(CONFIG)/inc/me.h
DEPS_25 += $(CONFIG)/inc/est.h
DEPS_25 += $(CONFIG)/inc/osdep.h

$(CONFIG)/obj/estLib.o: \
    src/paks/est/estLib.c $(DEPS_25)
	@echo '   [Compile] $(CONFIG)/obj/estLib.o'
	$(CC) -c $(CFLAGS) $(DFLAGS) -o $(CONFIG)/obj/estLib.o -arch $(CC_ARCH) $(IFLAGS) src/paks/est/estLib.c

ifeq ($(ME_EXT_EST),1)
#
#   libest
#
DEPS_26 += $(CONFIG)/inc/est.h
DEPS_26 += $(CONFIG)/inc/me.h
DEPS_26 += $(CONFIG)/inc/osdep.h
DEPS_26 += $(CONFIG)/obj/estLib.o

$(CONFIG)/bin/libest.dylib: $(DEPS_26)
	@echo '      [Link] $(CONFIG)/bin/libest.dylib'
	$(CC) -dynamiclib -o $(CONFIG)/bin/libest.dylib -arch $(CC_ARCH) $(LDFLAGS) $(LIBPATHS) -install_name @rpath/libest.dylib -compatibility_version 0.8.2 -current_version 0.8.2 "$(CONFIG)/obj/estLib.o" $(LIBS) 
endif

#
#   ca-crt
#
DEPS_27 += src/paks/est/ca.crt

$(CONFIG)/bin/ca.crt: $(DEPS_27)
	@echo '      [Copy] $(CONFIG)/bin/ca.crt'
	mkdir -p "$(CONFIG)/bin"
	cp src/paks/est/ca.crt $(CONFIG)/bin/ca.crt

#
#   http.o
#
DEPS_28 += $(CONFIG)/inc/me.h
DEPS_28 += $(CONFIG)/inc/http.h

$(CONFIG)/obj/http.o: \
    src/paks/http/http.c $(DEPS_28)
	@echo '   [Compile] $(CONFIG)/obj/http.o'
	$(CC) -c $(CFLAGS) $(DFLAGS) -o $(CONFIG)/obj/http.o -arch $(CC_ARCH) $(IFLAGS) src/paks/http/http.c

#
#   http
#
DEPS_29 += $(CONFIG)/inc/mpr.h
DEPS_29 += $(CONFIG)/inc/me.h
DEPS_29 += $(CONFIG)/inc/osdep.h
DEPS_29 += $(CONFIG)/obj/mprLib.o
DEPS_29 += $(CONFIG)/bin/libmpr.dylib
DEPS_29 += $(CONFIG)/inc/pcre.h
DEPS_29 += $(CONFIG)/obj/pcre.o
ifeq ($(ME_EXT_PCRE),1)
    DEPS_29 += $(CONFIG)/bin/libpcre.dylib
endif
DEPS_29 += $(CONFIG)/inc/http.h
DEPS_29 += $(CONFIG)/obj/httpLib.o
DEPS_29 += $(CONFIG)/bin/libhttp.dylib
DEPS_29 += $(CONFIG)/obj/http.o

LIBS_29 += -lhttp
LIBS_29 += -lmpr
ifeq ($(ME_EXT_PCRE),1)
    LIBS_29 += -lpcre
endif

$(CONFIG)/bin/http: $(DEPS_29)
	@echo '      [Link] $(CONFIG)/bin/http'
	$(CC) -o $(CONFIG)/bin/http -arch $(CC_ARCH) $(LDFLAGS) $(LIBPATHS) "$(CONFIG)/obj/http.o" $(LIBPATHS_29) $(LIBS_29) $(LIBS_29) $(LIBS) 

#
#   mprSsl.o
#
DEPS_30 += $(CONFIG)/inc/me.h
DEPS_30 += $(CONFIG)/inc/mpr.h
DEPS_30 += $(CONFIG)/inc/est.h

$(CONFIG)/obj/mprSsl.o: \
    src/paks/mpr/mprSsl.c $(DEPS_30)
	@echo '   [Compile] $(CONFIG)/obj/mprSsl.o'
	$(CC) -c $(CFLAGS) $(DFLAGS) -o $(CONFIG)/obj/mprSsl.o -arch $(CC_ARCH) $(IFLAGS) src/paks/mpr/mprSsl.c

#
#   libmprssl
#
DEPS_31 += $(CONFIG)/inc/mpr.h
DEPS_31 += $(CONFIG)/inc/me.h
DEPS_31 += $(CONFIG)/inc/osdep.h
DEPS_31 += $(CONFIG)/obj/mprLib.o
DEPS_31 += $(CONFIG)/bin/libmpr.dylib
DEPS_31 += $(CONFIG)/inc/est.h
DEPS_31 += $(CONFIG)/obj/mprSsl.o

LIBS_31 += -lmpr

$(CONFIG)/bin/libmprssl.dylib: $(DEPS_31)
	@echo '      [Link] $(CONFIG)/bin/libmprssl.dylib'
	$(CC) -dynamiclib -o $(CONFIG)/bin/libmprssl.dylib -arch $(CC_ARCH) $(LDFLAGS) $(LIBPATHS) -install_name @rpath/libmprssl.dylib -compatibility_version 0.8.2 -current_version 0.8.2 "$(CONFIG)/obj/mprSsl.o" $(LIBPATHS_31) $(LIBS_31) $(LIBS_31) $(LIBS) 

#
#   sqlite3.h
#
$(CONFIG)/inc/sqlite3.h: $(DEPS_32)
	@echo '      [Copy] $(CONFIG)/inc/sqlite3.h'
	mkdir -p "$(CONFIG)/inc"
	cp src/paks/sqlite/sqlite3.h $(CONFIG)/inc/sqlite3.h

#
#   sqlite3.o
#
DEPS_33 += $(CONFIG)/inc/me.h
DEPS_33 += $(CONFIG)/inc/sqlite3.h

$(CONFIG)/obj/sqlite3.o: \
    src/paks/sqlite/sqlite3.c $(DEPS_33)
	@echo '   [Compile] $(CONFIG)/obj/sqlite3.o'
	$(CC) -c $(CFLAGS) $(DFLAGS) -o $(CONFIG)/obj/sqlite3.o -arch $(CC_ARCH) $(IFLAGS) src/paks/sqlite/sqlite3.c

ifeq ($(ME_EXT_SQLITE),1)
#
#   libsql
#
DEPS_34 += $(CONFIG)/inc/sqlite3.h
DEPS_34 += $(CONFIG)/inc/me.h
DEPS_34 += $(CONFIG)/obj/sqlite3.o

$(CONFIG)/bin/libsql.dylib: $(DEPS_34)
	@echo '      [Link] $(CONFIG)/bin/libsql.dylib'
	$(CC) -dynamiclib -o $(CONFIG)/bin/libsql.dylib -arch $(CC_ARCH) $(LDFLAGS) $(LIBPATHS) -install_name @rpath/libsql.dylib -compatibility_version 0.8.2 -current_version 0.8.2 "$(CONFIG)/obj/sqlite3.o" $(LIBS) 
endif

#
#   sqlite.o
#
DEPS_35 += $(CONFIG)/inc/me.h
DEPS_35 += $(CONFIG)/inc/sqlite3.h

$(CONFIG)/obj/sqlite.o: \
    src/paks/sqlite/sqlite.c $(DEPS_35)
	@echo '   [Compile] $(CONFIG)/obj/sqlite.o'
	$(CC) -c $(CFLAGS) $(DFLAGS) -o $(CONFIG)/obj/sqlite.o -arch $(CC_ARCH) $(IFLAGS) src/paks/sqlite/sqlite.c

ifeq ($(ME_EXT_SQLITE),1)
#
#   sqliteshell
#
DEPS_36 += $(CONFIG)/inc/sqlite3.h
DEPS_36 += $(CONFIG)/inc/me.h
DEPS_36 += $(CONFIG)/obj/sqlite3.o
DEPS_36 += $(CONFIG)/bin/libsql.dylib
DEPS_36 += $(CONFIG)/obj/sqlite.o

LIBS_36 += -lsql

$(CONFIG)/bin/sqlite: $(DEPS_36)
	@echo '      [Link] $(CONFIG)/bin/sqlite'
	$(CC) -o $(CONFIG)/bin/sqlite -arch $(CC_ARCH) $(LDFLAGS) $(LIBPATHS) "$(CONFIG)/obj/sqlite.o" $(LIBPATHS_36) $(LIBS_36) $(LIBS_36) $(LIBS) 
endif

#
#   pak.mod
#
DEPS_37 += src/Package.es
DEPS_37 += src/pak.es
DEPS_37 += src/paks/ejs-version/Version.es
DEPS_37 += $(CONFIG)/inc/mpr.h
DEPS_37 += $(CONFIG)/inc/me.h
DEPS_37 += $(CONFIG)/inc/osdep.h
DEPS_37 += $(CONFIG)/obj/mprLib.o
DEPS_37 += $(CONFIG)/bin/libmpr.dylib
DEPS_37 += $(CONFIG)/inc/pcre.h
DEPS_37 += $(CONFIG)/obj/pcre.o
ifeq ($(ME_EXT_PCRE),1)
    DEPS_37 += $(CONFIG)/bin/libpcre.dylib
endif
DEPS_37 += $(CONFIG)/inc/http.h
DEPS_37 += $(CONFIG)/obj/httpLib.o
DEPS_37 += $(CONFIG)/bin/libhttp.dylib
DEPS_37 += $(CONFIG)/inc/zlib.h
DEPS_37 += $(CONFIG)/obj/zlib.o
ifeq ($(ME_EXT_ZLIB),1)
    DEPS_37 += $(CONFIG)/bin/libzlib.dylib
endif
DEPS_37 += $(CONFIG)/inc/ejs.h
DEPS_37 += $(CONFIG)/inc/ejs.slots.h
DEPS_37 += $(CONFIG)/inc/ejsByteGoto.h
DEPS_37 += $(CONFIG)/obj/ejsLib.o
ifeq ($(ME_EXT_EJS),1)
    DEPS_37 += $(CONFIG)/bin/libejs.dylib
endif
DEPS_37 += $(CONFIG)/obj/ejsc.o
ifeq ($(ME_EXT_EJS),1)
    DEPS_37 += $(CONFIG)/bin/ejsc
endif

$(CONFIG)/bin/pak.mod: $(DEPS_37)
	( \
	cd .; \
	$(LBIN)/ejsc --out ./$(CONFIG)/bin/pak.mod --optimize 9 ./src/Package.es ./src/pak.es ./src/paks/ejs-version/Version.es ; \
	)

#
#   pak.o
#
DEPS_38 += $(CONFIG)/inc/me.h
DEPS_38 += $(CONFIG)/inc/ejs.h

$(CONFIG)/obj/pak.o: \
    src/pak.c $(DEPS_38)
	@echo '   [Compile] $(CONFIG)/obj/pak.o'
	$(CC) -c $(CFLAGS) $(DFLAGS) -o $(CONFIG)/obj/pak.o -arch $(CC_ARCH) $(IFLAGS) src/pak.c

#
#   pak
#
DEPS_39 += $(CONFIG)/inc/mpr.h
DEPS_39 += $(CONFIG)/inc/me.h
DEPS_39 += $(CONFIG)/inc/osdep.h
DEPS_39 += $(CONFIG)/obj/mprLib.o
DEPS_39 += $(CONFIG)/bin/libmpr.dylib
DEPS_39 += $(CONFIG)/inc/pcre.h
DEPS_39 += $(CONFIG)/obj/pcre.o
ifeq ($(ME_EXT_PCRE),1)
    DEPS_39 += $(CONFIG)/bin/libpcre.dylib
endif
DEPS_39 += $(CONFIG)/inc/http.h
DEPS_39 += $(CONFIG)/obj/httpLib.o
DEPS_39 += $(CONFIG)/bin/libhttp.dylib
DEPS_39 += $(CONFIG)/inc/zlib.h
DEPS_39 += $(CONFIG)/obj/zlib.o
ifeq ($(ME_EXT_ZLIB),1)
    DEPS_39 += $(CONFIG)/bin/libzlib.dylib
endif
DEPS_39 += $(CONFIG)/inc/ejs.h
DEPS_39 += $(CONFIG)/inc/ejs.slots.h
DEPS_39 += $(CONFIG)/inc/ejsByteGoto.h
DEPS_39 += $(CONFIG)/obj/ejsLib.o
ifeq ($(ME_EXT_EJS),1)
    DEPS_39 += $(CONFIG)/bin/libejs.dylib
endif
DEPS_39 += $(CONFIG)/obj/ejsc.o
ifeq ($(ME_EXT_EJS),1)
    DEPS_39 += $(CONFIG)/bin/ejsc
endif
DEPS_39 += $(CONFIG)/bin/pak.mod
DEPS_39 += $(CONFIG)/obj/pak.o

ifeq ($(ME_EXT_EJS),1)
    LIBS_39 += -lejs
endif
LIBS_39 += -lhttp
LIBS_39 += -lmpr
ifeq ($(ME_EXT_PCRE),1)
    LIBS_39 += -lpcre
endif
ifeq ($(ME_EXT_ZLIB),1)
    LIBS_39 += -lzlib
endif

$(CONFIG)/bin/pak: $(DEPS_39)
	@echo '      [Link] $(CONFIG)/bin/pak'
	$(CC) -o $(CONFIG)/bin/pak -arch $(CC_ARCH) $(LDFLAGS) $(LIBPATHS) "$(CONFIG)/obj/pak.o" $(LIBPATHS_39) $(LIBS_39) $(LIBS_39) $(LIBS) 

#
#   stop
#
stop: $(DEPS_40)

#
#   installBinary
#
installBinary: $(DEPS_41)
	( \
	cd .; \
	mkdir -p "$(ME_APP_PREFIX)" ; \
	rm -f "$(ME_APP_PREFIX)/latest" ; \
	ln -s "0.8.2" "$(ME_APP_PREFIX)/latest" ; \
	mkdir -p "$(ME_VAPP_PREFIX)/bin" ; \
	cp $(CONFIG)/bin/pak $(ME_VAPP_PREFIX)/bin/pak ; \
	mkdir -p "$(ME_BIN_PREFIX)" ; \
	rm -f "$(ME_BIN_PREFIX)/pak" ; \
	ln -s "$(ME_VAPP_PREFIX)/bin/pak" "$(ME_BIN_PREFIX)/pak" ; \
	cp $(CONFIG)/bin/libejs.dylib $(ME_VAPP_PREFIX)/bin/libejs.dylib ; \
	cp $(CONFIG)/bin/libest.dylib $(ME_VAPP_PREFIX)/bin/libest.dylib ; \
	cp $(CONFIG)/bin/libhttp.dylib $(ME_VAPP_PREFIX)/bin/libhttp.dylib ; \
	cp $(CONFIG)/bin/libmpr.dylib $(ME_VAPP_PREFIX)/bin/libmpr.dylib ; \
	cp $(CONFIG)/bin/libmprssl.dylib $(ME_VAPP_PREFIX)/bin/libmprssl.dylib ; \
	cp $(CONFIG)/bin/libpcre.dylib $(ME_VAPP_PREFIX)/bin/libpcre.dylib ; \
	cp $(CONFIG)/bin/libzlib.dylib $(ME_VAPP_PREFIX)/bin/libzlib.dylib ; \
	cp $(CONFIG)/bin/ca.crt $(ME_VAPP_PREFIX)/bin/ca.crt ; \
	cp $(CONFIG)/bin/ejs.mod $(ME_VAPP_PREFIX)/bin/ejs.mod ; \
	cp $(CONFIG)/bin/pak.mod $(ME_VAPP_PREFIX)/bin/pak.mod ; \
	mkdir -p "$(ME_VAPP_PREFIX)/doc/man/man1" ; \
	cp doc/man/pak.1 $(ME_VAPP_PREFIX)/doc/man/man1/pak.1 ; \
	mkdir -p "$(ME_MAN_PREFIX)/man1" ; \
	rm -f "$(ME_MAN_PREFIX)/man1/pak.1" ; \
	ln -s "$(ME_VAPP_PREFIX)/doc/man/man1/pak.1" "$(ME_MAN_PREFIX)/man1/pak.1" ; \
	)

#
#   start
#
start: $(DEPS_42)

#
#   install
#
DEPS_43 += stop
DEPS_43 += installBinary
DEPS_43 += start

install: $(DEPS_43)

#
#   uninstall
#
DEPS_44 += stop

uninstall: $(DEPS_44)
	( \
	cd .; \
	rm -fr "$(ME_VAPP_PREFIX)" ; \
	rm -f "$(ME_APP_PREFIX)/latest" ; \
	rmdir -p "$(ME_APP_PREFIX)" 2>/dev/null ; true ; \
	)

