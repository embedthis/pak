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
    if ((rec = readRecWhere("pak", "name", "==", name)) != 0) {
        if (checkPassword && !mprCheckPassword(password, getField(rec, "password"))) {
            sendResult(feedback("error", "Invalid password"));
            return;
        }
        prior = getField(rec, "endpoint");
        setFields(rec, params());

    } else {
#if UNUSED
        cchar   *uri, *response, *err;
        uri = strim(endpoint, ".git", MPR_TRIM_END);
        uri = sjoin(uri, "/raw/master/package.json", NULL);
        status = httpRequest("GET", uri, NULL, &response, &err);

        if (status != 200) {
            feedback("warn", "Could not verify endpoint");
        } else {
            if (!response || mprParseJson(response) == 0) {
                feedback("warn", "Could not verify endpoint package.json");
            }
        }
#endif
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
    Edi         *edi = espGetRouteDatabase(route);

    espDefineAction(route, "pak-get", getPak);
    espDefineAction(route, "pak-init", initPak);
    espDefineAction(route, "pak-cmd-publish", publishPackage);
    espDefineAction(route, "pak-cmd-retract", retractPackage);
    espDefineAction(route, "pak-cmd-search", searchCatalog);

    if ((rp = httpLookupRoute(route->host, "/do/*/default")) != 0) {
        rp->flags &= ~HTTP_ROUTE_XSRF;
    }
    ediAddValidation(edi, "present", "pak", "name", 0);
    ediAddValidation(edi, "unique", "pak", "name", 0);
    return 0;
}
