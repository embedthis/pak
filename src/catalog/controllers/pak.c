/*
    pak Controller
 */
#include "esp.h"

#define PASSWORD_SALT   16
#define PASSWORD_ROUNDS 128

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
    EdiRec  *rec;

    rec = readRec("pak", param("id"));
    ediFilterRecFields(rec, "password", 0);
    sendRec(rec);
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
    EdiGrid     *grid;

    grid = readTable("pak");
    ediFilterGridFields(grid, "password", 0);
    sendGrid(grid);
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
    cchar       *password, *name, *endpoint, *prior;

    req = getReq();
    name = param("name");
    endpoint = param("endpoint");
    password = param("password");

    if (!name || !*name || !endpoint || !*endpoint || !password || !*password) {
        sendResult(feedback("error", "Missing name, endpoint or password parameters"));
        return;
    }
    if ((rec = readRecWhere("pak", "name", "==", name)) != 0) {
        prior = getField(rec, "endpoint");
        if (!mprCheckPassword(password, getField(rec, "password"))) {
            sendResult(feedback("error", "Invalid password"));
            return;
        }
    } else {
        rec = createRec("pak", params());
        setField(rec, "password", mprMakePassword(password, PASSWORD_SALT, PASSWORD_ROUNDS));
        prior = 0;
    }
    if (!smatch(endpoint, prior)) {
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
    EspReq      *req;
    EdiRec      *rec;
    cchar       *password, *name;

    req = getReq();
    name = param("name");
    password = param("password");

    if (!name || !*name || !password || !*password) {
        sendResult(feedback("error", "Missing name or password parameters"));
        return;
    }
    if ((rec = readRecWhere("pak", "name", "==", name)) == 0) {
        sendResult(feedback("error", "Cannot find pak"));
        return;

    } else if (!mprCheckPassword(password, getField(rec, "password"))) {
        sendResult(feedback("error", "Invalid password"));
        return;
    }
    sendResult(removeRec("pak", rec->id));
}

/*
    Dynamic module initialization
 */
ESP_EXPORT int esp_controller_catalog_pak(HttpRoute *route, MprModule *module) 
{
    HttpRoute   *rp;

    espDefineAction(route, "pak-create", createPak);
    espDefineAction(route, "pak-get", getPak);
    espDefineAction(route, "pak-init", initPak);
    espDefineAction(route, "pak-list", listPak);
    espDefineAction(route, "pak-remove", removePak);
    espDefineAction(route, "pak-update", updatePak);

    espDefineAction(route, "pak-cmd-publish", publishPackage);
    espDefineAction(route, "pak-cmd-retract", retractPackage);
    espDefineAction(route, "pak-cmd-lookup", getCatalog);

    if ((rp = httpLookupRoute(route->host, "/do/*/default")) != 0) {
        rp->flags &= ~HTTP_ROUTE_XSRF;
    }
    
#if SAMPLE_VALIDATIONS
    Edi *edi = espGetRouteDatabase(route);
    ediAddValidation(edi, "present", "pak", "title", 0);
    ediAddValidation(edi, "unique", "pak", "title", 0);
    ediAddValidation(edi, "banned", "pak", "body", "(swear|curse)");
    ediAddValidation(edi, "format", "pak", "phone", "/^\(?([0-9]{3})\)?[-. ]?([0-9]{3})[-. ]?([0-9]{4})$/");
#endif
    return 0;
}
