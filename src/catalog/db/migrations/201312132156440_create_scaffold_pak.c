/*
    Create Scaffold Pak
 */
#include "esp.h"

typedef struct PakData {
    cchar   *name;
    cchar   *uri;
} PakData;

PakData pakData[] = {
{ "angular", "https://github.com/embedthis/pak-angular.git" },
    { "angular-bootstrap", "https://github.com/embedthis/pak-angular-bootstrap.git" },
    { "animate", "https://github.com/embedthis/pak-animate.git" },
    { "bit", "https://github.com/embedthis/pak-bit.git" },
    { "bootstrap", "https://github.com/embedthis/pak-bootstrap.git" },
    { "d3", "https://github.com/embedthis/pak-d3.git" },
{ "esp-angular", "https://github.com/embedthis/pak-esp-angular.git" },
{ "esp-angular-mvc", "https://github.com/embedthis/pak-esp-angular-mvc.git" },
    { "esp-best", "https://github.com/embedthis/pak-esp-best.git" },
    { "esp-gui", "git@github.com:embedthis/pak-esp-gui.git" },
{ "esp-html-mvc", "git@github.com:embedthis/pak-esp-html-mvc.git" },
{ "esp-legacy-mvc", "git@github.com:embedthis/pak-esp-legacy-mvc.git" },
    { "esp-mgr", "https://github.com/embedthis/pak-esp-mgr.git" },
{ "esp-server", "https://github.com/embedthis/pak-esp-server.git" },
    { "esp-user", "https://github.com/embedthis/pak-esp-user.git" },
    { "flot", "https://github.com/embedthis/pak-flot.git" },
    { "font-awesome", "https://github.com/embedthis/pak-font-awesome.git" },
    { "html5shiv", "https://github.com/embedthis/pak-html5shiv.git" },
    { "jquery", "https://github.com/embedthis/pak-jquery.git" },
    { "less", "https://github.com/embedthis/pak-less.git" },
    { "more", "https://github.com/embedthis/pak-more.git" },
    { "normalize", "https://github.com/embedthis/pak-normalize.git" },
    { "nvd3", "https://github.com/embedthis/pak-nvd3.git" },
    { "openssl", "https://github.com/embedthis/pak-openssl.git" },
    { "php", "https://github.com/embedthis/pak-php.git" },
    { "respond", "https://github.com/embedthis/pak-respond.git" },
    { "version", "https://github.com/embedthis/pak-version.git" },
    { "xcharts", "https://github.com/embedthis/pak-xcharts.git" },

#if FUTURE
    { "appweb", "https://github.com/embedthis/pak-appweb-4.git" },
    { "ejs", "https://github.com/embedthis/pak-ejs-2.git" },
    { "mpr", "https://github.com/embedthis/pak-mpr-4.git" },
    { "http", "https://github.com/embedthis/pak-http.git" },
#endif
    { 0, 0 }
};

static int forward(Edi *db) {
    EdiRec      *rec;
    PakData     *cd;

    ediAddTable(db, "pak");
    ediAddColumn(db, "pak", "id", EDI_TYPE_INT, EDI_AUTO_INC | EDI_INDEX | EDI_KEY);
    ediAddColumn(db, "pak", "name", EDI_TYPE_STRING, 0);
    ediAddColumn(db, "pak", "uri", EDI_TYPE_STRING, 0);
    ediAddColumn(db, "pak", "key", EDI_TYPE_STRING, 0);

    if ((rec = ediCreateRec(db, "pak")) == 0) {
        return MPR_ERR_CANT_CREATE;
    }
    for (cd = pakData; cd->name; cd++) {
        if (!ediSetField(rec, "name", cd->name) ||
            !ediSetField(rec, "uri", cd->uri) ||
            !ediSetField(rec, "key", "0")) {
            mprError("Can't update field for pak table");
            return MPR_ERR_CANT_WRITE;
        }
        if (ediUpdateRec(db, rec) < 0) {
            mprError("Can't update record for pak table");
            return MPR_ERR_CANT_WRITE;
        }
    }
    return 0;
}

static int backward(Edi *db) {
    ediRemoveTable(db, "pak");
    return 0;
}

ESP_EXPORT int esp_migration_create_scaffold_pak(Edi *db)
{
    ediDefineMigration(db, forward, backward);
    return 0;
}
