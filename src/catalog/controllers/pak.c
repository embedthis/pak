/*
    pak Controller
 */
#include "esp.h"

#define PASSWORD_SALT   16
#define PASSWORD_ROUNDS 128

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

#if UNUSED
/*
    Create a new resource in the database
 */
static void createPak() { 
    if (canUser("edit", 1)) {
        sendResult(updateRec(createRec("pak", params())));
    }
}

/*
    List the resources in this group
    MOB - not needed
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
        mprPutToBuf(buf, "\"%s\": ", getField(rec, "name"));
        mprPutToBuf(buf, "\"%s\"", getField(rec, "uri"));
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
    if (canUser("edit", 1)) {
        sendResult(removeRec("pak", param("id")));
    }
}

/*
    Update an existing resource in the database
    If "id" is not defined, this is the same as a create
 */
static void updatePak() { 
    if (canUser("edit", 1)) {
        //  MOB - should verify that the pak name matches the conn->username
        sendResult(updateRec(setFields(readRec("pak", param("id")), params())));
    }
}
#endif

/*
    Can call this without being authenticated
 */
static void publishPackage() {
    EspReq      *req;
    EdiRec      *rec;
    cchar       *password, *name, *endpoint, *prior;
    bool        checkPassword;

    req = getReq();
    name = param("name");
    endpoint = param("endpoint");
    password = param("password");

    //  MOB API for this
    HttpConn *conn;
    conn = getConn();

//  Should verify that endpoint exists

    if (!name || !*name || !endpoint || !*endpoint) {
        sendResult(feedback("error", "Missing name or endpoint parameters"));
        return;
    }
    if (canUser("edit", 0) && smatch(conn->username, name)) {
        checkPassword = 0;
        mprLog(2, "pak: publish, logged in to edit pak %s", name);
    } else {
        if (!password || !*password) {
            sendResult(feedback("error", "Missing password parameter"));
            return;
        }
        checkPassword = 1;
        mprLog(2, "pak: publish, check password for %s", name);
    }
    //  MOB - need DOS wait here
    if ((rec = readRecWhere("pak", "name", "==", name)) != 0) {
        if (checkPassword && !mprCheckPassword(password, getField(rec, "password"))) {
            sendResult(feedback("error", "Invalid password"));
            return;
        }
        prior = getField(rec, "endpoint");
        setFields(rec, params());

    } else {
        rec = createRec("pak", params());
        setField(rec, "password", mprMakePassword(password, PASSWORD_SALT, PASSWORD_ROUNDS));
        prior = 0;
    }
    if (!(updateRec(rec))) {
        sendResult(feedback("error", "Cannot save package details"));
        return;
    }
    sendRec(rec);
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

static void searchCatalog() {
    EdiGrid     *grid;
    EdiRec      *rec;
    MprList     *words, *results;
    MprBuf      *data;
    cchar       *endpoint, *name, *word;
    int         next, r;

    addHeader("Content-Type", "application/json");
    words = mprCreateListFromWords(param("keywords"));
    results = mprCreateList(0, 0);

    if ((grid = readTable("pak")) == 0) {
        sendResult(feedback("error", "Cannot read Pak table"));
        return;
    }
    for (r = 0; r < grid->nrecords; r++) {
        rec = grid->records[r];
        name = getField(rec, "name");
        if (words->length == 0 || mprLookupStringItem(words, name) >= 0) {
            mprAddItem(results, rec);
        } else {
            for (ITERATE_ITEMS(words, word, next)) {
                if (scontains(name, word)) {
                    mprAddItem(results, rec);
                    break;
                }
            }
        }
    }
    data = mprCreateBuf(0, 0);
    mprPutStringToBuf(data, "[\n");
    for (ITERATE_ITEMS(results, rec, next)) {
        endpoint = getField(rec, "endpoint");
        if (sstarts(endpoint, "git@")) {
            continue;
        }
        mprPutToBuf(data, "{\"id\": \"%s\", \"name\": \"%s\", \"endpoint\": \"%s\"},\n",
            getField(rec, "id"), getField(rec, "name"), endpoint);
    }
    if (results->length > 0) {
        mprAdjustBufEnd(data, -2);
    }
    mprPutStringToBuf(data, "]\n");
    mprAddNullToBuf(data);
    print(mprGetBufStart(data));
    render("{\n  \"data\": %s }\n", mprGetBufStart(data));
}

/*
    Dynamic module initialization
 */
ESP_EXPORT int esp_controller_catalog_pak(HttpRoute *route, MprModule *module) 
{
    HttpRoute   *rp;

#if UNUSED
    espDefineAction(route, "pak-create", createPak);
    espDefineAction(route, "pak-list", listPak);
    espDefineAction(route, "pak-remove", removePak);
    espDefineAction(route, "pak-update", updatePak);
    espDefineAction(route, "pak-cmd-lookup", getCatalog);
#endif

    espDefineAction(route, "pak-get", getPak);
    espDefineAction(route, "pak-init", initPak);
    espDefineAction(route, "pak-cmd-publish", publishPackage);
    espDefineAction(route, "pak-cmd-retract", retractPackage);
    espDefineAction(route, "pak-cmd-search", searchCatalog);

    if ((rp = httpLookupRoute(route->host, "/do/*/default")) != 0) {
        rp->flags &= ~HTTP_ROUTE_XSRF;
    }
#if SAMPLE_VALIDATIONS && UNUSED && MOB
    Edi *edi = espGetRouteDatabase(route);
    ediAddValidation(edi, "present", "pak", "title", 0);
    ediAddValidation(edi, "unique", "pak", "title", 0);
    ediAddValidation(edi, "banned", "pak", "body", "(swear|curse)");
    ediAddValidation(edi, "format", "pak", "phone", "/^\(?([0-9]{3})\)?[-. ]?([0-9]{3})[-. ]?([0-9]{4})$/");
#endif
    return 0;
}
