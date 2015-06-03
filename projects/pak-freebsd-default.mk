#
#   pak-freebsd-default.mk -- Makefile to build Embedthis Pak for freebsd
#

NAME                  := pak
VERSION               := 0.10.1
PROFILE               ?= default
ARCH                  ?= $(shell uname -m | sed 's/i.86/x86/;s/x86_64/x64/;s/arm.*/arm/;s/mips.*/mips/')
CC_ARCH               ?= $(shell echo $(ARCH) | sed 's/x86/i686/;s/x64/x86_64/')
OS                    ?= freebsd
CC                    ?= gcc
CONFIG                ?= $(OS)-$(ARCH)-$(PROFILE)
BUILD                 ?= build/$(CONFIG)
LBIN                  ?= $(BUILD)/bin
PATH                  := $(LBIN):$(PATH)

ME_COM_COMPILER       ?= 1
ME_COM_EJS            ?= 1
ME_COM_EST            ?= 0
ME_COM_HTTP           ?= 1
ME_COM_LIB            ?= 1
ME_COM_MATRIXSSL      ?= 0
ME_COM_MBEDTLS        ?= 0
ME_COM_MPR            ?= 1
ME_COM_NANOSSL        ?= 0
ME_COM_OPENSSL        ?= 1
ME_COM_OSDEP          ?= 1
ME_COM_PCRE           ?= 1
ME_COM_SQLITE         ?= 0
ME_COM_SSL            ?= 1
ME_COM_VXWORKS        ?= 0
ME_COM_WINSDK         ?= 1
ME_COM_ZLIB           ?= 1

ME_COM_OPENSSL_PATH   ?= "/usr/lib"

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

CFLAGS                += -fPIC -w
DFLAGS                += -D_REENTRANT -DPIC $(patsubst %,-D%,$(filter ME_%,$(MAKEFLAGS))) -DME_COM_COMPILER=$(ME_COM_COMPILER) -DME_COM_EJS=$(ME_COM_EJS) -DME_COM_EST=$(ME_COM_EST) -DME_COM_HTTP=$(ME_COM_HTTP) -DME_COM_LIB=$(ME_COM_LIB) -DME_COM_MATRIXSSL=$(ME_COM_MATRIXSSL) -DME_COM_MBEDTLS=$(ME_COM_MBEDTLS) -DME_COM_MPR=$(ME_COM_MPR) -DME_COM_NANOSSL=$(ME_COM_NANOSSL) -DME_COM_OPENSSL=$(ME_COM_OPENSSL) -DME_COM_OSDEP=$(ME_COM_OSDEP) -DME_COM_PCRE=$(ME_COM_PCRE) -DME_COM_SQLITE=$(ME_COM_SQLITE) -DME_COM_SSL=$(ME_COM_SSL) -DME_COM_VXWORKS=$(ME_COM_VXWORKS) -DME_COM_WINSDK=$(ME_COM_WINSDK) -DME_COM_ZLIB=$(ME_COM_ZLIB) 
IFLAGS                += "-I$(BUILD)/inc"
LDFLAGS               += 
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
ifeq ($(ME_COM_SSL),1)
    TARGETS           += $(BUILD)/bin
endif
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
	@[ ! -f $(BUILD)/inc/me.h ] && cp projects/pak-freebsd-default-me.h $(BUILD)/inc/me.h ; true
	@if ! diff $(BUILD)/inc/me.h projects/pak-freebsd-default-me.h >/dev/null ; then\
		cp projects/pak-freebsd-default-me.h $(BUILD)/inc/me.h  ; \
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
	rm -f "$(BUILD)/obj/est.o"
	rm -f "$(BUILD)/obj/estLib.o"
	rm -f "$(BUILD)/obj/http.o"
	rm -f "$(BUILD)/obj/httpLib.o"
	rm -f "$(BUILD)/obj/mprLib.o"
	rm -f "$(BUILD)/obj/openssl.o"
	rm -f "$(BUILD)/obj/pak.o"
	rm -f "$(BUILD)/obj/pcre.o"
	rm -f "$(BUILD)/obj/zlib.o"
	rm -f "$(BUILD)/bin/ejsc"
	rm -f "$(BUILD)/bin"
	rm -f "$(BUILD)/bin/libejs.so"
	rm -f "$(BUILD)/bin/libhttp.so"
	rm -f "$(BUILD)/bin/libmpr.so"
	rm -f "$(BUILD)/bin/libpcre.so"
	rm -f "$(BUILD)/bin/libzlib.so"
	rm -f "$(BUILD)/bin/libmpr-openssl.a"
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

src/ejs/ejs.slots.h: $(DEPS_5)

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
DEPS_8 += src/ejs/ejs.h
DEPS_8 += $(BUILD)/inc/me.h
DEPS_8 += $(BUILD)/inc/osdep.h
DEPS_8 += $(BUILD)/inc/mpr.h
DEPS_8 += $(BUILD)/inc/http.h
DEPS_8 += src/ejs/ejs.slots.h
DEPS_8 += $(BUILD)/inc/pcre.h
DEPS_8 += $(BUILD)/inc/zlib.h

$(BUILD)/inc/ejs.h: $(DEPS_8)
	@echo '      [Copy] $(BUILD)/inc/ejs.h'
	mkdir -p "$(BUILD)/inc"
	cp src/ejs/ejs.h $(BUILD)/inc/ejs.h

#
#   ejs.slots.h
#
DEPS_9 += src/ejs/ejs.slots.h

$(BUILD)/inc/ejs.slots.h: $(DEPS_9)
	@echo '      [Copy] $(BUILD)/inc/ejs.slots.h'
	mkdir -p "$(BUILD)/inc"
	cp src/ejs/ejs.slots.h $(BUILD)/inc/ejs.slots.h

#
#   ejsByteGoto.h
#
DEPS_10 += src/ejs/ejsByteGoto.h

$(BUILD)/inc/ejsByteGoto.h: $(DEPS_10)
	@echo '      [Copy] $(BUILD)/inc/ejsByteGoto.h'
	mkdir -p "$(BUILD)/inc"
	cp src/ejs/ejsByteGoto.h $(BUILD)/inc/ejsByteGoto.h

#
#   est.h
#
DEPS_11 += src/est/est.h

$(BUILD)/inc/est.h: $(DEPS_11)
	@echo '      [Copy] $(BUILD)/inc/est.h'
	mkdir -p "$(BUILD)/inc"
	cp src/est/est.h $(BUILD)/inc/est.h

#
#   ejs.h
#

src/ejs/ejs.h: $(DEPS_12)

#
#   ejs.o
#
DEPS_13 += src/ejs/ejs.h

$(BUILD)/obj/ejs.o: \
    src/ejs/ejs.c $(DEPS_13)
	@echo '   [Compile] $(BUILD)/obj/ejs.o'
	$(CC) -c -o $(BUILD)/obj/ejs.o $(LDFLAGS) $(CFLAGS) $(DFLAGS) $(IFLAGS) src/ejs/ejs.c

#
#   ejsLib.o
#
DEPS_14 += src/ejs/ejs.h
DEPS_14 += $(BUILD)/inc/mpr.h
DEPS_14 += $(BUILD)/inc/pcre.h
DEPS_14 += $(BUILD)/inc/me.h

$(BUILD)/obj/ejsLib.o: \
    src/ejs/ejsLib.c $(DEPS_14)
	@echo '   [Compile] $(BUILD)/obj/ejsLib.o'
	$(CC) -c -o $(BUILD)/obj/ejsLib.o $(LDFLAGS) $(CFLAGS) $(DFLAGS) -DME_COM_OPENSSL_PATH="$(ME_COM_OPENSSL_PATH)" $(IFLAGS) "-I$(ME_COM_OPENSSL_PATH)/include" src/ejs/ejsLib.c

#
#   ejsc.o
#
DEPS_15 += src/ejs/ejs.h

$(BUILD)/obj/ejsc.o: \
    src/ejs/ejsc.c $(DEPS_15)
	@echo '   [Compile] $(BUILD)/obj/ejsc.o'
	$(CC) -c -o $(BUILD)/obj/ejsc.o $(LDFLAGS) $(CFLAGS) $(DFLAGS) -DME_COM_OPENSSL_PATH="$(ME_COM_OPENSSL_PATH)" $(IFLAGS) "-I$(ME_COM_OPENSSL_PATH)/include" src/ejs/ejsc.c

#
#   est.o
#
DEPS_16 += $(BUILD)/inc/mpr.h

$(BUILD)/obj/est.o: \
    src/mpr-est/est.c $(DEPS_16)
	@echo '   [Compile] $(BUILD)/obj/est.o'
	$(CC) -c -o $(BUILD)/obj/est.o $(LDFLAGS) $(CFLAGS) $(DFLAGS) $(IFLAGS) src/mpr-est/est.c

#
#   est.h
#

src/est/est.h: $(DEPS_17)

#
#   estLib.o
#
DEPS_18 += src/est/est.h

$(BUILD)/obj/estLib.o: \
    src/est/estLib.c $(DEPS_18)
	@echo '   [Compile] $(BUILD)/obj/estLib.o'
	$(CC) -c -o $(BUILD)/obj/estLib.o $(LDFLAGS) $(CFLAGS) $(DFLAGS) $(IFLAGS) src/est/estLib.c

#
#   http.h
#

src/http/http.h: $(DEPS_19)

#
#   http.o
#
DEPS_20 += src/http/http.h

$(BUILD)/obj/http.o: \
    src/http/http.c $(DEPS_20)
	@echo '   [Compile] $(BUILD)/obj/http.o'
	$(CC) -c -o $(BUILD)/obj/http.o $(LDFLAGS) $(CFLAGS) $(DFLAGS) $(IFLAGS) src/http/http.c

#
#   httpLib.o
#
DEPS_21 += src/http/http.h
DEPS_21 += $(BUILD)/inc/pcre.h

$(BUILD)/obj/httpLib.o: \
    src/http/httpLib.c $(DEPS_21)
	@echo '   [Compile] $(BUILD)/obj/httpLib.o'
	$(CC) -c -o $(BUILD)/obj/httpLib.o $(LDFLAGS) $(CFLAGS) $(DFLAGS) -DME_COM_OPENSSL_PATH="$(ME_COM_OPENSSL_PATH)" $(IFLAGS) "-I$(ME_COM_OPENSSL_PATH)/include" src/http/httpLib.c

#
#   mpr.h
#

src/mpr/mpr.h: $(DEPS_22)

#
#   mprLib.o
#
DEPS_23 += src/mpr/mpr.h

$(BUILD)/obj/mprLib.o: \
    src/mpr/mprLib.c $(DEPS_23)
	@echo '   [Compile] $(BUILD)/obj/mprLib.o'
	$(CC) -c -o $(BUILD)/obj/mprLib.o $(LDFLAGS) $(CFLAGS) $(DFLAGS) -DME_COM_OPENSSL_PATH="$(ME_COM_OPENSSL_PATH)" $(IFLAGS) "-I$(ME_COM_OPENSSL_PATH)/include" src/mpr/mprLib.c

#
#   openssl.o
#
DEPS_24 += $(BUILD)/inc/mpr.h

$(BUILD)/obj/openssl.o: \
    src/mpr-openssl/openssl.c $(DEPS_24)
	@echo '   [Compile] $(BUILD)/obj/openssl.o'
	$(CC) -c -o $(BUILD)/obj/openssl.o $(LDFLAGS) $(CFLAGS) -DME_COM_OPENSSL_PATH="$(ME_COM_OPENSSL_PATH)" $(IFLAGS) "-I$(ME_COM_OPENSSL_PATH)/include" src/mpr-openssl/openssl.c

#
#   pak.o
#
DEPS_25 += $(BUILD)/inc/ejs.h

$(BUILD)/obj/pak.o: \
    src/pak.c $(DEPS_25)
	@echo '   [Compile] $(BUILD)/obj/pak.o'
	$(CC) -c -o $(BUILD)/obj/pak.o $(LDFLAGS) $(CFLAGS) $(DFLAGS) -DME_COM_OPENSSL_PATH="$(ME_COM_OPENSSL_PATH)" $(IFLAGS) "-I$(ME_COM_OPENSSL_PATH)/include" src/pak.c

#
#   pcre.h
#

src/pcre/pcre.h: $(DEPS_26)

#
#   pcre.o
#
DEPS_27 += $(BUILD)/inc/me.h
DEPS_27 += src/pcre/pcre.h

$(BUILD)/obj/pcre.o: \
    src/pcre/pcre.c $(DEPS_27)
	@echo '   [Compile] $(BUILD)/obj/pcre.o'
	$(CC) -c -o $(BUILD)/obj/pcre.o $(LDFLAGS) $(CFLAGS) $(DFLAGS) $(IFLAGS) src/pcre/pcre.c

#
#   zlib.h
#

src/zlib/zlib.h: $(DEPS_28)

#
#   zlib.o
#
DEPS_29 += $(BUILD)/inc/me.h
DEPS_29 += src/zlib/zlib.h

$(BUILD)/obj/zlib.o: \
    src/zlib/zlib.c $(DEPS_29)
	@echo '   [Compile] $(BUILD)/obj/zlib.o'
	$(CC) -c -o $(BUILD)/obj/zlib.o $(LDFLAGS) $(CFLAGS) $(DFLAGS) $(IFLAGS) src/zlib/zlib.c

ifeq ($(ME_COM_SSL),1)
#
#   openssl
#
DEPS_30 += $(BUILD)/obj/openssl.o

$(BUILD)/bin/libmpr-openssl.a: $(DEPS_30)
	@echo '      [Link] $(BUILD)/bin/libmpr-openssl.a'
	ar -cr $(BUILD)/bin/libmpr-openssl.a "$(BUILD)/obj/openssl.o"
endif

ifeq ($(ME_COM_EST),1)
#
#   libest
#
DEPS_31 += $(BUILD)/inc/osdep.h
DEPS_31 += $(BUILD)/inc/est.h
DEPS_31 += $(BUILD)/obj/estLib.o

$(BUILD)/bin/libest.a: $(DEPS_31)
	@echo '      [Link] $(BUILD)/bin/libest.a'
	ar -cr $(BUILD)/bin/libest.a "$(BUILD)/obj/estLib.o"
endif

ifeq ($(ME_COM_SSL),1)
#
#   est
#
ifeq ($(ME_COM_EST),1)
    DEPS_32 += $(BUILD)/bin/libest.a
endif
DEPS_32 += $(BUILD)/obj/est.o

$(BUILD)/bin/libmpr-estssl.a: $(DEPS_32)
	@echo '      [Link] $(BUILD)/bin/libmpr-estssl.a'
	ar -cr $(BUILD)/bin/libmpr-estssl.a "$(BUILD)/obj/est.o"
endif

#
#   libmpr
#
DEPS_33 += $(BUILD)/inc/osdep.h
ifeq ($(ME_COM_SSL),1)
ifeq ($(ME_COM_OPENSSL),1)
    DEPS_33 += $(BUILD)/bin/libmpr-openssl.a
endif
endif
ifeq ($(ME_COM_SSL),1)
ifeq ($(ME_COM_EST),1)
    DEPS_33 += $(BUILD)/bin/libmpr-estssl.a
endif
endif
DEPS_33 += $(BUILD)/inc/mpr.h
DEPS_33 += $(BUILD)/obj/mprLib.o

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
ifeq ($(ME_COM_EST),1)
    LIBS_33 += -lest
endif
ifeq ($(ME_COM_EST),1)
    LIBS_33 += -lmpr-estssl
endif
ifeq ($(ME_COM_OPENSSL),1)
    LIBS_33 += -lmpr-openssl
    LIBPATHS_33 += -L"$(ME_COM_OPENSSL_PATH)"
endif

$(BUILD)/bin/libmpr.so: $(DEPS_33)
	@echo '      [Link] $(BUILD)/bin/libmpr.so'
	$(CC) -shared -o $(BUILD)/bin/libmpr.so $(LDFLAGS) $(LIBPATHS)  "$(BUILD)/obj/mprLib.o" $(LIBPATHS_33) $(LIBS_33) $(LIBS_33) $(LIBS) 

ifeq ($(ME_COM_PCRE),1)
#
#   libpcre
#
DEPS_34 += $(BUILD)/inc/pcre.h
DEPS_34 += $(BUILD)/obj/pcre.o

$(BUILD)/bin/libpcre.so: $(DEPS_34)
	@echo '      [Link] $(BUILD)/bin/libpcre.so'
	$(CC) -shared -o $(BUILD)/bin/libpcre.so $(LDFLAGS) $(LIBPATHS) "$(BUILD)/obj/pcre.o" $(LIBS) 
endif

ifeq ($(ME_COM_HTTP),1)
#
#   libhttp
#
DEPS_35 += $(BUILD)/bin/libmpr.so
ifeq ($(ME_COM_PCRE),1)
    DEPS_35 += $(BUILD)/bin/libpcre.so
endif
DEPS_35 += $(BUILD)/inc/http.h
DEPS_35 += $(BUILD)/obj/httpLib.o

ifeq ($(ME_COM_OPENSSL),1)
    LIBS_35 += -lmpr-openssl
    LIBPATHS_35 += -L"$(ME_COM_OPENSSL_PATH)"
endif
ifeq ($(ME_COM_OPENSSL),1)
ifeq ($(ME_COM_SSL),1)
    LIBS_35 += -lssl
    LIBPATHS_35 += -L"$(ME_COM_OPENSSL_PATH)"
endif
endif
ifeq ($(ME_COM_OPENSSL),1)
    LIBS_35 += -lcrypto
    LIBPATHS_35 += -L"$(ME_COM_OPENSSL_PATH)"
endif
ifeq ($(ME_COM_EST),1)
    LIBS_35 += -lest
endif
ifeq ($(ME_COM_EST),1)
    LIBS_35 += -lmpr-estssl
endif
LIBS_35 += -lmpr
ifeq ($(ME_COM_OPENSSL),1)
    LIBS_35 += -lmpr-openssl
    LIBPATHS_35 += -L"$(ME_COM_OPENSSL_PATH)"
endif
ifeq ($(ME_COM_PCRE),1)
    LIBS_35 += -lpcre
endif
ifeq ($(ME_COM_PCRE),1)
    LIBS_35 += -lpcre
endif
LIBS_35 += -lmpr

$(BUILD)/bin/libhttp.so: $(DEPS_35)
	@echo '      [Link] $(BUILD)/bin/libhttp.so'
	$(CC) -shared -o $(BUILD)/bin/libhttp.so $(LDFLAGS) $(LIBPATHS)  "$(BUILD)/obj/httpLib.o" $(LIBPATHS_35) $(LIBS_35) $(LIBS_35) $(LIBS) 
endif

ifeq ($(ME_COM_ZLIB),1)
#
#   libzlib
#
DEPS_36 += $(BUILD)/inc/zlib.h
DEPS_36 += $(BUILD)/obj/zlib.o

$(BUILD)/bin/libzlib.so: $(DEPS_36)
	@echo '      [Link] $(BUILD)/bin/libzlib.so'
	$(CC) -shared -o $(BUILD)/bin/libzlib.so $(LDFLAGS) $(LIBPATHS) "$(BUILD)/obj/zlib.o" $(LIBS) 
endif

ifeq ($(ME_COM_EJS),1)
#
#   libejs
#
ifeq ($(ME_COM_HTTP),1)
    DEPS_37 += $(BUILD)/bin/libhttp.so
endif
ifeq ($(ME_COM_PCRE),1)
    DEPS_37 += $(BUILD)/bin/libpcre.so
endif
DEPS_37 += $(BUILD)/bin/libmpr.so
ifeq ($(ME_COM_ZLIB),1)
    DEPS_37 += $(BUILD)/bin/libzlib.so
endif
DEPS_37 += $(BUILD)/inc/ejs.h
DEPS_37 += $(BUILD)/inc/ejs.slots.h
DEPS_37 += $(BUILD)/inc/ejsByteGoto.h
DEPS_37 += $(BUILD)/obj/ejsLib.o

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
ifeq ($(ME_COM_EST),1)
    LIBS_37 += -lest
endif
ifeq ($(ME_COM_EST),1)
    LIBS_37 += -lmpr-estssl
endif
LIBS_37 += -lmpr
ifeq ($(ME_COM_OPENSSL),1)
    LIBS_37 += -lmpr-openssl
    LIBPATHS_37 += -L"$(ME_COM_OPENSSL_PATH)"
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
ifeq ($(ME_COM_ZLIB),1)
    LIBS_37 += -lzlib
endif
ifeq ($(ME_COM_HTTP),1)
    LIBS_37 += -lhttp
endif

$(BUILD)/bin/libejs.so: $(DEPS_37)
	@echo '      [Link] $(BUILD)/bin/libejs.so'
	$(CC) -shared -o $(BUILD)/bin/libejs.so $(LDFLAGS) $(LIBPATHS)  "$(BUILD)/obj/ejsLib.o" $(LIBPATHS_37) $(LIBS_37) $(LIBS_37) $(LIBS) 
endif

ifeq ($(ME_COM_EJS),1)
#
#   ejsc
#
DEPS_38 += $(BUILD)/bin/libejs.so
DEPS_38 += $(BUILD)/obj/ejsc.o

ifeq ($(ME_COM_OPENSSL),1)
    LIBS_38 += -lmpr-openssl
    LIBPATHS_38 += -L"$(ME_COM_OPENSSL_PATH)"
endif
ifeq ($(ME_COM_OPENSSL),1)
ifeq ($(ME_COM_SSL),1)
    LIBS_38 += -lssl
    LIBPATHS_38 += -L"$(ME_COM_OPENSSL_PATH)"
endif
endif
ifeq ($(ME_COM_OPENSSL),1)
    LIBS_38 += -lcrypto
    LIBPATHS_38 += -L"$(ME_COM_OPENSSL_PATH)"
endif
ifeq ($(ME_COM_EST),1)
    LIBS_38 += -lest
endif
ifeq ($(ME_COM_EST),1)
    LIBS_38 += -lmpr-estssl
endif
LIBS_38 += -lmpr
ifeq ($(ME_COM_OPENSSL),1)
    LIBS_38 += -lmpr-openssl
    LIBPATHS_38 += -L"$(ME_COM_OPENSSL_PATH)"
endif
ifeq ($(ME_COM_PCRE),1)
    LIBS_38 += -lpcre
endif
ifeq ($(ME_COM_HTTP),1)
    LIBS_38 += -lhttp
endif
ifeq ($(ME_COM_PCRE),1)
    LIBS_38 += -lpcre
endif
LIBS_38 += -lmpr
ifeq ($(ME_COM_ZLIB),1)
    LIBS_38 += -lzlib
endif
LIBS_38 += -lejs
ifeq ($(ME_COM_ZLIB),1)
    LIBS_38 += -lzlib
endif
ifeq ($(ME_COM_HTTP),1)
    LIBS_38 += -lhttp
endif

$(BUILD)/bin/ejsc: $(DEPS_38)
	@echo '      [Link] $(BUILD)/bin/ejsc'
	$(CC) -o $(BUILD)/bin/ejsc $(LDFLAGS) $(LIBPATHS)  "$(BUILD)/obj/ejsc.o" $(LIBPATHS_38) $(LIBS_38) $(LIBS_38) $(LIBS) $(LIBS) 
endif

ifeq ($(ME_COM_EJS),1)
#
#   ejs.mod
#
DEPS_39 += src/ejs/ejs.es
DEPS_39 += $(BUILD)/bin/ejsc

$(BUILD)/bin/ejs.mod: $(DEPS_39)
	( \
	cd src/ejs; \
	echo '   [Compile] ejs.mod' ; \
	"../../$(BUILD)/bin/ejsc" --out "../../$(BUILD)/bin/ejs.mod" --optimize 9 --bind --require null ejs.es ; \
	)
endif

ifeq ($(ME_COM_EJS),1)
#
#   ejscmd
#
DEPS_40 += $(BUILD)/bin/libejs.so
DEPS_40 += $(BUILD)/obj/ejs.o

ifeq ($(ME_COM_OPENSSL),1)
    LIBS_40 += -lmpr-openssl
    LIBPATHS_40 += -L"$(ME_COM_OPENSSL_PATH)"
endif
ifeq ($(ME_COM_OPENSSL),1)
ifeq ($(ME_COM_SSL),1)
    LIBS_40 += -lssl
    LIBPATHS_40 += -L"$(ME_COM_OPENSSL_PATH)"
endif
endif
ifeq ($(ME_COM_OPENSSL),1)
    LIBS_40 += -lcrypto
    LIBPATHS_40 += -L"$(ME_COM_OPENSSL_PATH)"
endif
ifeq ($(ME_COM_EST),1)
    LIBS_40 += -lest
endif
ifeq ($(ME_COM_EST),1)
    LIBS_40 += -lmpr-estssl
endif
LIBS_40 += -lmpr
ifeq ($(ME_COM_OPENSSL),1)
    LIBS_40 += -lmpr-openssl
    LIBPATHS_40 += -L"$(ME_COM_OPENSSL_PATH)"
endif
ifeq ($(ME_COM_PCRE),1)
    LIBS_40 += -lpcre
endif
ifeq ($(ME_COM_HTTP),1)
    LIBS_40 += -lhttp
endif
ifeq ($(ME_COM_PCRE),1)
    LIBS_40 += -lpcre
endif
LIBS_40 += -lmpr
ifeq ($(ME_COM_ZLIB),1)
    LIBS_40 += -lzlib
endif
LIBS_40 += -lejs
ifeq ($(ME_COM_ZLIB),1)
    LIBS_40 += -lzlib
endif
ifeq ($(ME_COM_HTTP),1)
    LIBS_40 += -lhttp
endif

$(BUILD)/bin/ejs: $(DEPS_40)
	@echo '      [Link] $(BUILD)/bin/ejs'
	$(CC) -o $(BUILD)/bin/ejs $(LDFLAGS) $(LIBPATHS) "$(BUILD)/obj/ejs.o" $(LIBPATHS_40) $(LIBS_40) $(LIBS_40) $(LIBS) $(LIBS) 
endif

ifeq ($(ME_COM_HTTP),1)
#
#   httpcmd
#
DEPS_41 += $(BUILD)/bin/libhttp.so
DEPS_41 += $(BUILD)/obj/http.o

ifeq ($(ME_COM_OPENSSL),1)
    LIBS_41 += -lmpr-openssl
    LIBPATHS_41 += -L"$(ME_COM_OPENSSL_PATH)"
endif
ifeq ($(ME_COM_OPENSSL),1)
ifeq ($(ME_COM_SSL),1)
    LIBS_41 += -lssl
    LIBPATHS_41 += -L"$(ME_COM_OPENSSL_PATH)"
endif
endif
ifeq ($(ME_COM_OPENSSL),1)
    LIBS_41 += -lcrypto
    LIBPATHS_41 += -L"$(ME_COM_OPENSSL_PATH)"
endif
ifeq ($(ME_COM_EST),1)
    LIBS_41 += -lest
endif
ifeq ($(ME_COM_EST),1)
    LIBS_41 += -lmpr-estssl
endif
LIBS_41 += -lmpr
ifeq ($(ME_COM_OPENSSL),1)
    LIBS_41 += -lmpr-openssl
    LIBPATHS_41 += -L"$(ME_COM_OPENSSL_PATH)"
endif
ifeq ($(ME_COM_PCRE),1)
    LIBS_41 += -lpcre
endif
LIBS_41 += -lhttp
ifeq ($(ME_COM_PCRE),1)
    LIBS_41 += -lpcre
endif
LIBS_41 += -lmpr

$(BUILD)/bin/http: $(DEPS_41)
	@echo '      [Link] $(BUILD)/bin/http'
	$(CC) -o $(BUILD)/bin/http $(LDFLAGS) $(LIBPATHS) "$(BUILD)/obj/http.o" $(LIBPATHS_41) $(LIBS_41) $(LIBS_41) $(LIBS) $(LIBS) 
endif

ifeq ($(ME_COM_SSL),1)
#
#   install-certs
#
DEPS_42 += src/certs/samples/ca.crt
DEPS_42 += src/certs/samples/ca.key
DEPS_42 += src/certs/samples/dh.pem
DEPS_42 += src/certs/samples/ec.crt
DEPS_42 += src/certs/samples/ec.key
DEPS_42 += src/certs/samples/roots.crt
DEPS_42 += src/certs/samples/self.crt
DEPS_42 += src/certs/samples/self.key
DEPS_42 += src/certs/samples/test.crt
DEPS_42 += src/certs/samples/test.key

$(BUILD)/bin: $(DEPS_42)
	@echo '      [Copy] $(BUILD)/bin'
	mkdir -p "$(BUILD)/bin"
	cp src/certs/samples/ca.crt $(BUILD)/bin/ca.crt
	cp src/certs/samples/ca.key $(BUILD)/bin/ca.key
	cp src/certs/samples/dh.pem $(BUILD)/bin/dh.pem
	cp src/certs/samples/ec.crt $(BUILD)/bin/ec.crt
	cp src/certs/samples/ec.key $(BUILD)/bin/ec.key
	cp src/certs/samples/roots.crt $(BUILD)/bin/roots.crt
	cp src/certs/samples/self.crt $(BUILD)/bin/self.crt
	cp src/certs/samples/self.key $(BUILD)/bin/self.key
	cp src/certs/samples/test.crt $(BUILD)/bin/test.crt
	cp src/certs/samples/test.key $(BUILD)/bin/test.key
endif

#
#   pak.mod
#
DEPS_43 += src/Package.es
DEPS_43 += src/pak.es
DEPS_43 += paks/ejs-version/Version.es
ifeq ($(ME_COM_EJS),1)
    DEPS_43 += $(BUILD)/bin/ejs.mod
endif

$(BUILD)/bin/pak.mod: $(DEPS_43)
	"./$(BUILD)/bin/ejsc"  --out "./$(BUILD)/bin/pak.mod" --optimize 9 src/Package.es src/pak.es paks/ejs-version/Version.es

#
#   pak
#
DEPS_44 += init
ifeq ($(ME_COM_EJS),1)
    DEPS_44 += $(BUILD)/bin/libejs.so
endif
DEPS_44 += $(BUILD)/bin/pak.mod
DEPS_44 += $(BUILD)/obj/pak.o

ifeq ($(ME_COM_OPENSSL),1)
    LIBS_44 += -lmpr-openssl
    LIBPATHS_44 += -L"$(ME_COM_OPENSSL_PATH)"
endif
ifeq ($(ME_COM_OPENSSL),1)
ifeq ($(ME_COM_SSL),1)
    LIBS_44 += -lssl
    LIBPATHS_44 += -L"$(ME_COM_OPENSSL_PATH)"
endif
endif
ifeq ($(ME_COM_OPENSSL),1)
    LIBS_44 += -lcrypto
    LIBPATHS_44 += -L"$(ME_COM_OPENSSL_PATH)"
endif
ifeq ($(ME_COM_EST),1)
    LIBS_44 += -lest
endif
ifeq ($(ME_COM_EST),1)
    LIBS_44 += -lmpr-estssl
endif
LIBS_44 += -lmpr
ifeq ($(ME_COM_OPENSSL),1)
    LIBS_44 += -lmpr-openssl
    LIBPATHS_44 += -L"$(ME_COM_OPENSSL_PATH)"
endif
ifeq ($(ME_COM_PCRE),1)
    LIBS_44 += -lpcre
endif
ifeq ($(ME_COM_HTTP),1)
    LIBS_44 += -lhttp
endif
ifeq ($(ME_COM_PCRE),1)
    LIBS_44 += -lpcre
endif
LIBS_44 += -lmpr
ifeq ($(ME_COM_ZLIB),1)
    LIBS_44 += -lzlib
endif
ifeq ($(ME_COM_EJS),1)
    LIBS_44 += -lejs
endif
ifeq ($(ME_COM_ZLIB),1)
    LIBS_44 += -lzlib
endif
ifeq ($(ME_COM_HTTP),1)
    LIBS_44 += -lhttp
endif

$(BUILD)/bin/pak: $(DEPS_44)
	@echo '      [Link] $(BUILD)/bin/pak'
	$(CC) -o $(BUILD)/bin/pak $(LDFLAGS) $(LIBPATHS)  "$(BUILD)/obj/pak.o" $(LIBPATHS_44) $(LIBS_44) $(LIBS_44) $(LIBS) $(LIBS) 

#
#   installPrep
#

installPrep: $(DEPS_45)
	if [ "`id -u`" != 0 ] ; \
	then echo "Must run as root. Rerun with "sudo"" ; \
	exit 255 ; \
	fi

#
#   stop
#

stop: $(DEPS_46)

#
#   installBinary
#

installBinary: $(DEPS_47)
	mkdir -p "$(ME_APP_PREFIX)" ; \
	rm -f "$(ME_APP_PREFIX)/latest" ; \
	ln -s "$(VERSION)" "$(ME_APP_PREFIX)/latest" ; \
	mkdir -p "$(ME_VAPP_PREFIX)/bin" ; \
	cp $(BUILD)/bin/pak $(ME_VAPP_PREFIX)/bin/pak ; \
	mkdir -p "$(ME_BIN_PREFIX)" ; \
	rm -f "$(ME_BIN_PREFIX)/pak" ; \
	ln -s "$(ME_VAPP_PREFIX)/bin/pak" "$(ME_BIN_PREFIX)/pak" ; \
	mkdir -p "$(ME_VAPP_PREFIX)/bin" ; \
	cp $(BUILD)/bin/roots.crt $(ME_VAPP_PREFIX)/bin/roots.crt ; \
	cp $(BUILD)/bin/ejs.mod $(ME_VAPP_PREFIX)/bin/ejs.mod ; \
	cp $(BUILD)/bin/pak.mod $(ME_VAPP_PREFIX)/bin/pak.mod ; \
	mkdir -p "$(ME_VAPP_PREFIX)/bin" ; \
	cp $(BUILD)/bin/libejs.so $(ME_VAPP_PREFIX)/bin/libejs.so ; \
	cp $(BUILD)/bin/libhttp.so $(ME_VAPP_PREFIX)/bin/libhttp.so ; \
	cp $(BUILD)/bin/libmpr.so $(ME_VAPP_PREFIX)/bin/libmpr.so ; \
	cp $(BUILD)/bin/libpcre.so $(ME_VAPP_PREFIX)/bin/libpcre.so ; \
	cp $(BUILD)/bin/libzlib.so $(ME_VAPP_PREFIX)/bin/libzlib.so ; \
	if [ "$(ME_COM_EST)" = 1 ]; then true ; \
	mkdir -p "$(ME_VAPP_PREFIX)/bin" ; \
	cp $(BUILD)/bin/libest.so $(ME_VAPP_PREFIX)/bin/libest.so ; \
	fi ; \
	mkdir -p "$(ME_VAPP_PREFIX)/doc/man/man1" ; \
	cp doc/dist/man/pak.1 $(ME_VAPP_PREFIX)/doc/man/man1/pak.1 ; \
	mkdir -p "$(ME_MAN_PREFIX)/man1" ; \
	rm -f "$(ME_MAN_PREFIX)/man1/pak.1" ; \
	ln -s "$(ME_VAPP_PREFIX)/doc/man/man1/pak.1" "$(ME_MAN_PREFIX)/man1/pak.1"

#
#   start
#

start: $(DEPS_48)

#
#   install
#
DEPS_49 += installPrep
DEPS_49 += stop
DEPS_49 += installBinary
DEPS_49 += start

install: $(DEPS_49)

#
#   uninstall
#
DEPS_50 += stop

uninstall: $(DEPS_50)
	rm -fr "$(ME_VAPP_PREFIX)" ; \
	rm -f "$(ME_APP_PREFIX)/latest" ; \
	rmdir -p "$(ME_APP_PREFIX)" 2>/dev/null ; true

#
#   version
#

version: $(DEPS_51)
	echo $(VERSION)

