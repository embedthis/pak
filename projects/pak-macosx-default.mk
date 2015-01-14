#
#   pak-macosx-default.mk -- Makefile to build Embedthis Pak for macosx
#

NAME                  := pak
VERSION               := 0.10.0
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
ME_COM_EJS            ?= 1
ME_COM_EST            ?= 0
ME_COM_HTTP           ?= 1
ME_COM_LIB            ?= 1
ME_COM_MPR            ?= 1
ME_COM_OPENSSL        ?= 1
ME_COM_OSDEP          ?= 1
ME_COM_PCRE           ?= 1
ME_COM_SQLITE         ?= 0
ME_COM_SSL            ?= 1
ME_COM_VXWORKS        ?= 0
ME_COM_WINSDK         ?= 1
ME_COM_ZLIB           ?= 1

ME_COM_OPENSSL_PATH   ?= "/usr"

ifeq ($(ME_COM_EST),1)
    ME_COM_SSL := 1
endif
ifeq ($(ME_COM_LIB),1)
    ME_COM_COMPILER := 1
endif
ifeq ($(ME_COM_OPENSSL),1)
    ME_COM_SSL := 1
endif
ifeq ($(ME_COM_EJS),1)
    ME_COM_ZLIB := 1
endif

CFLAGS                += -g -w
DFLAGS                +=  $(patsubst %,-D%,$(filter ME_%,$(MAKEFLAGS))) -DME_COM_COMPILER=$(ME_COM_COMPILER) -DME_COM_EJS=$(ME_COM_EJS) -DME_COM_EST=$(ME_COM_EST) -DME_COM_HTTP=$(ME_COM_HTTP) -DME_COM_LIB=$(ME_COM_LIB) -DME_COM_MPR=$(ME_COM_MPR) -DME_COM_OPENSSL=$(ME_COM_OPENSSL) -DME_COM_OSDEP=$(ME_COM_OSDEP) -DME_COM_PCRE=$(ME_COM_PCRE) -DME_COM_SQLITE=$(ME_COM_SQLITE) -DME_COM_SSL=$(ME_COM_SSL) -DME_COM_VXWORKS=$(ME_COM_VXWORKS) -DME_COM_WINSDK=$(ME_COM_WINSDK) -DME_COM_ZLIB=$(ME_COM_ZLIB) 
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


ifeq ($(ME_COM_EJS),1)
    TARGETS           += $(BUILD)/bin/ejs.mod
endif
TARGETS               += $(BUILD)/bin/ca.crt
TARGETS               += $(BUILD)/bin/libmprssl.dylib
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
			echo "   [Warning] Make flags have changed since the last build: "`cat $(BUILD)/.makeflags`"" ; \
		fi ; \
	fi
	@echo "$(MAKEFLAGS)" >$(BUILD)/.makeflags

clean:
	rm -f "$(BUILD)/obj/ejsLib.o"
	rm -f "$(BUILD)/obj/ejsc.o"
	rm -f "$(BUILD)/obj/httpLib.o"
	rm -f "$(BUILD)/obj/mprLib.o"
	rm -f "$(BUILD)/obj/mprSsl.o"
	rm -f "$(BUILD)/obj/pak.o"
	rm -f "$(BUILD)/obj/pcre.o"
	rm -f "$(BUILD)/obj/zlib.o"
	rm -f "$(BUILD)/bin/ejsc"
	rm -f "$(BUILD)/bin/ca.crt"
	rm -f "$(BUILD)/bin/libejs.dylib"
	rm -f "$(BUILD)/bin/libhttp.dylib"
	rm -f "$(BUILD)/bin/libmpr.dylib"
	rm -f "$(BUILD)/bin/libmprssl.dylib"
	rm -f "$(BUILD)/bin/libpcre.dylib"
	rm -f "$(BUILD)/bin/libzlib.dylib"
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
DEPS_2 += src/paks/osdep/osdep.h
DEPS_2 += $(BUILD)/inc/me.h

$(BUILD)/inc/osdep.h: $(DEPS_2)
	@echo '      [Copy] $(BUILD)/inc/osdep.h'
	mkdir -p "$(BUILD)/inc"
	cp src/paks/osdep/osdep.h $(BUILD)/inc/osdep.h

#
#   mpr.h
#
DEPS_3 += src/paks/mpr/mpr.h
DEPS_3 += $(BUILD)/inc/me.h
DEPS_3 += $(BUILD)/inc/osdep.h

$(BUILD)/inc/mpr.h: $(DEPS_3)
	@echo '      [Copy] $(BUILD)/inc/mpr.h'
	mkdir -p "$(BUILD)/inc"
	cp src/paks/mpr/mpr.h $(BUILD)/inc/mpr.h

#
#   http.h
#
DEPS_4 += src/paks/http/http.h
DEPS_4 += $(BUILD)/inc/mpr.h

$(BUILD)/inc/http.h: $(DEPS_4)
	@echo '      [Copy] $(BUILD)/inc/http.h'
	mkdir -p "$(BUILD)/inc"
	cp src/paks/http/http.h $(BUILD)/inc/http.h

#
#   ejs.slots.h
#

src/paks/ejs/ejs.slots.h: $(DEPS_5)

#
#   pcre.h
#
DEPS_6 += src/paks/pcre/pcre.h

$(BUILD)/inc/pcre.h: $(DEPS_6)
	@echo '      [Copy] $(BUILD)/inc/pcre.h'
	mkdir -p "$(BUILD)/inc"
	cp src/paks/pcre/pcre.h $(BUILD)/inc/pcre.h

#
#   zlib.h
#
DEPS_7 += src/paks/zlib/zlib.h
DEPS_7 += $(BUILD)/inc/me.h

$(BUILD)/inc/zlib.h: $(DEPS_7)
	@echo '      [Copy] $(BUILD)/inc/zlib.h'
	mkdir -p "$(BUILD)/inc"
	cp src/paks/zlib/zlib.h $(BUILD)/inc/zlib.h

#
#   ejs.h
#
DEPS_8 += src/paks/ejs/ejs.h
DEPS_8 += $(BUILD)/inc/me.h
DEPS_8 += $(BUILD)/inc/osdep.h
DEPS_8 += $(BUILD)/inc/mpr.h
DEPS_8 += $(BUILD)/inc/http.h
DEPS_8 += src/paks/ejs/ejs.slots.h
DEPS_8 += $(BUILD)/inc/pcre.h
DEPS_8 += $(BUILD)/inc/zlib.h

$(BUILD)/inc/ejs.h: $(DEPS_8)
	@echo '      [Copy] $(BUILD)/inc/ejs.h'
	mkdir -p "$(BUILD)/inc"
	cp src/paks/ejs/ejs.h $(BUILD)/inc/ejs.h

#
#   ejs.slots.h
#
DEPS_9 += src/paks/ejs/ejs.slots.h

$(BUILD)/inc/ejs.slots.h: $(DEPS_9)
	@echo '      [Copy] $(BUILD)/inc/ejs.slots.h'
	mkdir -p "$(BUILD)/inc"
	cp src/paks/ejs/ejs.slots.h $(BUILD)/inc/ejs.slots.h

#
#   ejsByteGoto.h
#
DEPS_10 += src/paks/ejs/ejsByteGoto.h

$(BUILD)/inc/ejsByteGoto.h: $(DEPS_10)
	@echo '      [Copy] $(BUILD)/inc/ejsByteGoto.h'
	mkdir -p "$(BUILD)/inc"
	cp src/paks/ejs/ejsByteGoto.h $(BUILD)/inc/ejsByteGoto.h

#
#   ejs.h
#

src/paks/ejs/ejs.h: $(DEPS_11)

#
#   ejsLib.o
#
DEPS_12 += src/paks/ejs/ejs.h
DEPS_12 += $(BUILD)/inc/mpr.h
DEPS_12 += $(BUILD)/inc/pcre.h
DEPS_12 += $(BUILD)/inc/me.h

$(BUILD)/obj/ejsLib.o: \
    src/paks/ejs/ejsLib.c $(DEPS_12)
	@echo '   [Compile] $(BUILD)/obj/ejsLib.o'
	$(CC) -c $(DFLAGS) -o $(BUILD)/obj/ejsLib.o -arch $(CC_ARCH) $(CFLAGS) $(IFLAGS) src/paks/ejs/ejsLib.c

#
#   ejsc.o
#
DEPS_13 += src/paks/ejs/ejs.h

$(BUILD)/obj/ejsc.o: \
    src/paks/ejs/ejsc.c $(DEPS_13)
	@echo '   [Compile] $(BUILD)/obj/ejsc.o'
	$(CC) -c $(DFLAGS) -o $(BUILD)/obj/ejsc.o -arch $(CC_ARCH) $(CFLAGS) $(IFLAGS) src/paks/ejs/ejsc.c

#
#   http.h
#

src/paks/http/http.h: $(DEPS_14)

#
#   httpLib.o
#
DEPS_15 += src/paks/http/http.h

$(BUILD)/obj/httpLib.o: \
    src/paks/http/httpLib.c $(DEPS_15)
	@echo '   [Compile] $(BUILD)/obj/httpLib.o'
	$(CC) -c $(DFLAGS) -o $(BUILD)/obj/httpLib.o -arch $(CC_ARCH) $(CFLAGS) $(IFLAGS) src/paks/http/httpLib.c

#
#   mpr.h
#

src/paks/mpr/mpr.h: $(DEPS_16)

#
#   mprLib.o
#
DEPS_17 += src/paks/mpr/mpr.h

$(BUILD)/obj/mprLib.o: \
    src/paks/mpr/mprLib.c $(DEPS_17)
	@echo '   [Compile] $(BUILD)/obj/mprLib.o'
	$(CC) -c $(DFLAGS) -o $(BUILD)/obj/mprLib.o -arch $(CC_ARCH) $(CFLAGS) $(IFLAGS) src/paks/mpr/mprLib.c

#
#   mprSsl.o
#
DEPS_18 += src/paks/mpr/mpr.h

$(BUILD)/obj/mprSsl.o: \
    src/paks/mpr/mprSsl.c $(DEPS_18)
	@echo '   [Compile] $(BUILD)/obj/mprSsl.o'
	$(CC) -c $(DFLAGS) -o $(BUILD)/obj/mprSsl.o -arch $(CC_ARCH) $(CFLAGS) -DME_COM_OPENSSL_PATH="$(ME_COM_OPENSSL_PATH)" $(IFLAGS) "-I$(ME_COM_OPENSSL_PATH)/include" src/paks/mpr/mprSsl.c

#
#   pak.o
#
DEPS_19 += $(BUILD)/inc/ejs.h

$(BUILD)/obj/pak.o: \
    src/pak.c $(DEPS_19)
	@echo '   [Compile] $(BUILD)/obj/pak.o'
	$(CC) -c $(DFLAGS) -o $(BUILD)/obj/pak.o -arch $(CC_ARCH) $(CFLAGS) $(IFLAGS) src/pak.c

#
#   pcre.h
#

src/paks/pcre/pcre.h: $(DEPS_20)

#
#   pcre.o
#
DEPS_21 += $(BUILD)/inc/me.h
DEPS_21 += src/paks/pcre/pcre.h

$(BUILD)/obj/pcre.o: \
    src/paks/pcre/pcre.c $(DEPS_21)
	@echo '   [Compile] $(BUILD)/obj/pcre.o'
	$(CC) -c $(DFLAGS) -o $(BUILD)/obj/pcre.o -arch $(CC_ARCH) $(CFLAGS) $(IFLAGS) src/paks/pcre/pcre.c

#
#   zlib.h
#

src/paks/zlib/zlib.h: $(DEPS_22)

#
#   zlib.o
#
DEPS_23 += $(BUILD)/inc/me.h
DEPS_23 += src/paks/zlib/zlib.h

$(BUILD)/obj/zlib.o: \
    src/paks/zlib/zlib.c $(DEPS_23)
	@echo '   [Compile] $(BUILD)/obj/zlib.o'
	$(CC) -c $(DFLAGS) -o $(BUILD)/obj/zlib.o -arch $(CC_ARCH) $(CFLAGS) $(IFLAGS) src/paks/zlib/zlib.c

#
#   libmpr
#
DEPS_24 += $(BUILD)/inc/osdep.h
DEPS_24 += $(BUILD)/inc/mpr.h
DEPS_24 += $(BUILD)/obj/mprLib.o

$(BUILD)/bin/libmpr.dylib: $(DEPS_24)
	@echo '      [Link] $(BUILD)/bin/libmpr.dylib'
	$(CC) -dynamiclib -o $(BUILD)/bin/libmpr.dylib -arch $(CC_ARCH) $(LDFLAGS) $(LIBPATHS) -install_name @rpath/libmpr.dylib -compatibility_version 0.10 -current_version 0.10 "$(BUILD)/obj/mprLib.o" $(LIBS) 

ifeq ($(ME_COM_PCRE),1)
#
#   libpcre
#
DEPS_25 += $(BUILD)/inc/pcre.h
DEPS_25 += $(BUILD)/obj/pcre.o

$(BUILD)/bin/libpcre.dylib: $(DEPS_25)
	@echo '      [Link] $(BUILD)/bin/libpcre.dylib'
	$(CC) -dynamiclib -o $(BUILD)/bin/libpcre.dylib -arch $(CC_ARCH) $(LDFLAGS) -compatibility_version 0.10 -current_version 0.10 $(LIBPATHS) -install_name @rpath/libpcre.dylib -compatibility_version 0.10 -current_version 0.10 "$(BUILD)/obj/pcre.o" $(LIBS) 
endif

ifeq ($(ME_COM_HTTP),1)
#
#   libhttp
#
DEPS_26 += $(BUILD)/bin/libmpr.dylib
ifeq ($(ME_COM_PCRE),1)
    DEPS_26 += $(BUILD)/bin/libpcre.dylib
endif
DEPS_26 += $(BUILD)/inc/http.h
DEPS_26 += $(BUILD)/obj/httpLib.o

LIBS_26 += -lmpr
ifeq ($(ME_COM_PCRE),1)
    LIBS_26 += -lpcre
endif

$(BUILD)/bin/libhttp.dylib: $(DEPS_26)
	@echo '      [Link] $(BUILD)/bin/libhttp.dylib'
	$(CC) -dynamiclib -o $(BUILD)/bin/libhttp.dylib -arch $(CC_ARCH) $(LDFLAGS) $(LIBPATHS) -install_name @rpath/libhttp.dylib -compatibility_version 0.10 -current_version 0.10 "$(BUILD)/obj/httpLib.o" $(LIBPATHS_26) $(LIBS_26) $(LIBS_26) $(LIBS) 
endif

ifeq ($(ME_COM_ZLIB),1)
#
#   libzlib
#
DEPS_27 += $(BUILD)/inc/zlib.h
DEPS_27 += $(BUILD)/obj/zlib.o

$(BUILD)/bin/libzlib.dylib: $(DEPS_27)
	@echo '      [Link] $(BUILD)/bin/libzlib.dylib'
	$(CC) -dynamiclib -o $(BUILD)/bin/libzlib.dylib -arch $(CC_ARCH) $(LDFLAGS) $(LIBPATHS) -install_name @rpath/libzlib.dylib -compatibility_version 0.10 -current_version 0.10 "$(BUILD)/obj/zlib.o" $(LIBS) 
endif

ifeq ($(ME_COM_EJS),1)
#
#   libejs
#
ifeq ($(ME_COM_HTTP),1)
    DEPS_28 += $(BUILD)/bin/libhttp.dylib
endif
ifeq ($(ME_COM_PCRE),1)
    DEPS_28 += $(BUILD)/bin/libpcre.dylib
endif
DEPS_28 += $(BUILD)/bin/libmpr.dylib
ifeq ($(ME_COM_ZLIB),1)
    DEPS_28 += $(BUILD)/bin/libzlib.dylib
endif
DEPS_28 += $(BUILD)/inc/ejs.h
DEPS_28 += $(BUILD)/inc/ejs.slots.h
DEPS_28 += $(BUILD)/inc/ejsByteGoto.h
DEPS_28 += $(BUILD)/obj/ejsLib.o

ifeq ($(ME_COM_HTTP),1)
    LIBS_28 += -lhttp
endif
LIBS_28 += -lmpr
ifeq ($(ME_COM_PCRE),1)
    LIBS_28 += -lpcre
endif
ifeq ($(ME_COM_ZLIB),1)
    LIBS_28 += -lzlib
endif

$(BUILD)/bin/libejs.dylib: $(DEPS_28)
	@echo '      [Link] $(BUILD)/bin/libejs.dylib'
	$(CC) -dynamiclib -o $(BUILD)/bin/libejs.dylib -arch $(CC_ARCH) $(LDFLAGS) $(LIBPATHS) -install_name @rpath/libejs.dylib -compatibility_version 0.10 -current_version 0.10 "$(BUILD)/obj/ejsLib.o" $(LIBPATHS_28) $(LIBS_28) $(LIBS_28) $(LIBS) 
endif

ifeq ($(ME_COM_EJS),1)
#
#   ejsc
#
DEPS_29 += $(BUILD)/bin/libejs.dylib
DEPS_29 += $(BUILD)/obj/ejsc.o

LIBS_29 += -lejs
ifeq ($(ME_COM_HTTP),1)
    LIBS_29 += -lhttp
endif
LIBS_29 += -lmpr
ifeq ($(ME_COM_PCRE),1)
    LIBS_29 += -lpcre
endif
ifeq ($(ME_COM_ZLIB),1)
    LIBS_29 += -lzlib
endif

$(BUILD)/bin/ejsc: $(DEPS_29)
	@echo '      [Link] $(BUILD)/bin/ejsc'
	$(CC) -o $(BUILD)/bin/ejsc -arch $(CC_ARCH) $(LDFLAGS) $(LIBPATHS) "$(BUILD)/obj/ejsc.o" $(LIBPATHS_29) $(LIBS_29) $(LIBS_29) $(LIBS) 
endif

ifeq ($(ME_COM_EJS),1)
#
#   ejs.mod
#
DEPS_30 += src/paks/ejs/ejs.es
DEPS_30 += $(BUILD)/bin/ejsc

$(BUILD)/bin/ejs.mod: $(DEPS_30)
	( \
	cd src/paks/ejs; \
	echo '   [Compile] ejs.mod' ; \
	../../../$(BUILD)/bin/ejsc --out ../../../$(BUILD)/bin/ejs.mod --optimize 9 --bind --require null ejs.es ; \
	)
endif

#
#   http-ca-crt
#
DEPS_31 += src/paks/http/ca.crt

$(BUILD)/bin/ca.crt: $(DEPS_31)
	@echo '      [Copy] $(BUILD)/bin/ca.crt'
	mkdir -p "$(BUILD)/bin"
	cp src/paks/http/ca.crt $(BUILD)/bin/ca.crt

#
#   libmprssl
#
DEPS_32 += $(BUILD)/bin/libmpr.dylib
DEPS_32 += $(BUILD)/obj/mprSsl.o

LIBS_32 += -lmpr
ifeq ($(ME_COM_OPENSSL),1)
    LIBS_32 += -lssl
    LIBPATHS_32 += -L"$(ME_COM_OPENSSL_PATH)/lib"
    LIBPATHS_32 += -L"$(ME_COM_OPENSSL_PATH)"
endif
ifeq ($(ME_COM_OPENSSL),1)
    LIBS_32 += -lcrypto
    LIBPATHS_32 += -L"$(ME_COM_OPENSSL_PATH)/lib"
    LIBPATHS_32 += -L"$(ME_COM_OPENSSL_PATH)"
endif
ifeq ($(ME_COM_EST),1)
    LIBS_32 += -lest
endif

$(BUILD)/bin/libmprssl.dylib: $(DEPS_32)
	@echo '      [Link] $(BUILD)/bin/libmprssl.dylib'
	$(CC) -dynamiclib -o $(BUILD)/bin/libmprssl.dylib -arch $(CC_ARCH) $(LDFLAGS) $(LIBPATHS)   -install_name @rpath/libmprssl.dylib -compatibility_version 0.10 -current_version 0.10 "$(BUILD)/obj/mprSsl.o" $(LIBPATHS_32) $(LIBS_32) $(LIBS_32) $(LIBS) 

#
#   pak.mod
#
DEPS_33 += src/Package.es
DEPS_33 += src/pak.es
DEPS_33 += src/paks/ejs-version/Version.es
ifeq ($(ME_COM_EJS),1)
    DEPS_33 += $(BUILD)/bin/ejs.mod
endif

$(BUILD)/bin/pak.mod: $(DEPS_33)
	./$(BUILD)/bin/ejsc  --out ./$(BUILD)/bin/pak.mod --optimize 9 src/Package.es src/pak.es src/paks/ejs-version/Version.es

#
#   pak
#
ifeq ($(ME_COM_EJS),1)
    DEPS_34 += $(BUILD)/bin/libejs.dylib
endif
DEPS_34 += $(BUILD)/bin/pak.mod
DEPS_34 += $(BUILD)/obj/pak.o

ifeq ($(ME_COM_EJS),1)
    LIBS_34 += -lejs
endif
ifeq ($(ME_COM_HTTP),1)
    LIBS_34 += -lhttp
endif
LIBS_34 += -lmpr
ifeq ($(ME_COM_PCRE),1)
    LIBS_34 += -lpcre
endif
ifeq ($(ME_COM_ZLIB),1)
    LIBS_34 += -lzlib
endif

$(BUILD)/bin/pak: $(DEPS_34)
	@echo '      [Link] $(BUILD)/bin/pak'
	$(CC) -o $(BUILD)/bin/pak -arch $(CC_ARCH) $(LDFLAGS) $(LIBPATHS) "$(BUILD)/obj/pak.o" $(LIBPATHS_34) $(LIBS_34) $(LIBS_34) $(LIBS) 

#
#   installPrep
#

installPrep: $(DEPS_35)
	if [ "`id -u`" != 0 ] ; \
	then echo "Must run as root. Rerun with "sudo"" ; \
	exit 255 ; \
	fi

#
#   stop
#

stop: $(DEPS_36)

#
#   installBinary
#

installBinary: $(DEPS_37)
	mkdir -p "$(ME_APP_PREFIX)" ; \
	rm -f "$(ME_APP_PREFIX)/latest" ; \
	ln -s "0.10.0" "$(ME_APP_PREFIX)/latest" ; \
	mkdir -p "$(ME_VAPP_PREFIX)/bin" ; \
	cp $(BUILD)/bin/pak $(ME_VAPP_PREFIX)/bin/pak ; \
	mkdir -p "$(ME_BIN_PREFIX)" ; \
	rm -f "$(ME_BIN_PREFIX)/pak" ; \
	ln -s "$(ME_VAPP_PREFIX)/bin/pak" "$(ME_BIN_PREFIX)/pak" ; \
	mkdir -p "$(ME_VAPP_PREFIX)/bin" ; \
	cp $(BUILD)/bin/ca.crt $(ME_VAPP_PREFIX)/bin/ca.crt ; \
	cp $(BUILD)/bin/ejs.mod $(ME_VAPP_PREFIX)/bin/ejs.mod ; \
	cp $(BUILD)/bin/pak.mod $(ME_VAPP_PREFIX)/bin/pak.mod ; \
	mkdir -p "$(ME_VAPP_PREFIX)/bin" ; \
	cp $(BUILD)/bin/libejs.dylib $(ME_VAPP_PREFIX)/bin/libejs.dylib ; \
	cp $(BUILD)/bin/libhttp.dylib $(ME_VAPP_PREFIX)/bin/libhttp.dylib ; \
	cp $(BUILD)/bin/libmpr.dylib $(ME_VAPP_PREFIX)/bin/libmpr.dylib ; \
	cp $(BUILD)/bin/libmprssl.dylib $(ME_VAPP_PREFIX)/bin/libmprssl.dylib ; \
	cp $(BUILD)/bin/libpcre.dylib $(ME_VAPP_PREFIX)/bin/libpcre.dylib ; \
	cp $(BUILD)/bin/libzlib.dylib $(ME_VAPP_PREFIX)/bin/libzlib.dylib ; \
	if [ "$(ME_COM_EST)" = 1 ]; then true ; \
	mkdir -p "$(ME_VAPP_PREFIX)/bin" ; \
	cp $(BUILD)/bin/libest.dylib $(ME_VAPP_PREFIX)/bin/libest.dylib ; \
	fi ; \
	mkdir -p "$(ME_VAPP_PREFIX)/doc/man/man1" ; \
	cp doc/documents/man/pak.1 $(ME_VAPP_PREFIX)/doc/man/man1/pak.1 ; \
	mkdir -p "$(ME_MAN_PREFIX)/man1" ; \
	rm -f "$(ME_MAN_PREFIX)/man1/pak.1" ; \
	ln -s "$(ME_VAPP_PREFIX)/doc/man/man1/pak.1" "$(ME_MAN_PREFIX)/man1/pak.1"

#
#   start
#

start: $(DEPS_38)

#
#   install
#
DEPS_39 += installPrep
DEPS_39 += stop
DEPS_39 += installBinary
DEPS_39 += start

install: $(DEPS_39)

#
#   uninstall
#
DEPS_40 += stop

uninstall: $(DEPS_40)
	rm -fr "$(ME_VAPP_PREFIX)" ; \
	rm -f "$(ME_APP_PREFIX)/latest" ; \
	rmdir -p "$(ME_APP_PREFIX)" 2>/dev/null ; true

#
#   version
#

version: $(DEPS_41)
	echo 0.10.0

