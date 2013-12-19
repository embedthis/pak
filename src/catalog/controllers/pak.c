/*
    pak Controller
 */
#include "esp.h"

/*
    Create a new resource in the database
 */
static void createPak() { 
    sendResult(updateRec(createRec("pak", params())));
}

/*
    Get a resource
 */
static void getPak() { 
    sendRec(readRec("pak", param("id")));
}

/*
    Initialize a new resource for the client to complete
 */
static void initPak() { 
    sendRec(createRec("pak", 0));
}

/*
    List the resources in this group
 */
static void listPak() {
    sendGrid(readTable("pak"));
}

/*
    Return the catalog pak contents
 */
static void getCatalog() { 
    EdiGrid     *catalog;
    EdiRec      *rec;
    EdiField    *fp;
    MprBuf      *buf;
    int         r;

    if ((catalog = readTable("pak")) == 0) {
        sendResult(feedback("error", "Cannot read pak table"));
    }
    buf = mprCreateBuf(0, 0);
    mprPutStringToBuf(buf, "{\n");
    for (r = 0; r < catalog->nrecords; r++) {
        mprPutStringToBuf(buf, "    ");
        rec = catalog->records[r];
        fp = ediGetField(rec, "name");
        mprPutToBuf(buf, "\"%s\": ", fp->value);
        fp = ediGetField(rec, "uri");
        mprPutToBuf(buf, "\"%s\"", fp->value);
        if ((r+1) < catalog->nrecords) {
            mprPutCharToBuf(buf, ',');
        }
        mprPutCharToBuf(buf, '\n');
    }
    mprPutStringToBuf(buf, "}\n");
    mprAddNullToBuf(buf);
    renderString(mprGetBufStart(buf));
}

/*
    Remove a resource identified by the "id" parameter
 */
static void removePak() { 
    sendResult(removeRec("pak", param("id")));
}

/*
    Update an existing resource in the database
    If "id" is not defined, this is the same as a create
 */
static void updatePak() { 
    sendResult(updateRec(setFields(readRec("pak", param("id")), params())));
}

static void publishPackage() {
    EspReq      *req;
    EdiRec      *rec;
    cchar       *key, *name, *uri, *priorUri;
#if UNUSED
    MprJson     *catalog, *keys, *paks;
    cchar       *key, *catalogPath, *keysPath, *name, *uri, *priorUri;
#endif

    req = getReq();
    name = param("name");
    uri = param("uri");
    key = param("key");

    // addHeader("Content-Type", "application/json");

    if (!name || !*name || !uri || !*uri) {
        sendResult(feedback("error", "Missing name and/or uri parameters"));
        return;
    }
    if ((rec = readRecWhere("pak", "name", "==", name)) != 0) {
        priorUri = getField(rec, "uri");
        if (!smatch(getField(rec, "key"), key)) {
            sendResult(feedback("error", "Must quote original publish key to republish"));
            return;
        }
    } else {
        rec = createRec("pak", params());
        priorUri = 0;
        if ((key = mprGetMD5(mprGetRandomString(32))) == 0) {
            sendResult(feedback("error", "Cannot generate publish key"));
            //  MOB - this must do an mprError too
            return;
        }
        setField(rec, "key", key);
    }
    if (!smatch(uri, priorUri)) {
        if (!(updateRec(rec))) {
            sendResult(feedback("error", "Cannot save package details"));
        } else {
            sendRec(rec);
        }
    } else {
        sendRec(rec);
    }
}

static void retractPackage() {
}

/*
    Dynamic module initialization
 */
ESP_EXPORT int esp_controller_catalog_pak(HttpRoute *route, MprModule *module) {
    espDefineAction(route, "pak-create", createPak);
    espDefineAction(route, "pak-get", getPak);
    espDefineAction(route, "pak-init", initPak);
    espDefineAction(route, "pak-list", listPak);
    espDefineAction(route, "pak-remove", removePak);
    espDefineAction(route, "pak-update", updatePak);

    espDefineAction(route, "pak-cmd-publish", publishPackage);
    espDefineAction(route, "pak-cmd-retract", retractPackage);
    espDefineAction(route, "pak-cmd-lookup", getCatalog);
    
#if SAMPLE_VALIDATIONS
    Edi *edi = espGetRouteDatabase(route);
    ediAddValidation(edi, "present", "pak", "title", 0);
    ediAddValidation(edi, "unique", "pak", "title", 0);
    ediAddValidation(edi, "banned", "pak", "body", "(swear|curse)");
    ediAddValidation(edi, "format", "pak", "phone", "/^\(?([0-9]{3})\)?[-. ]?([0-9]{3})[-. ]?([0-9]{4})$/");
#endif
    return 0;
}
