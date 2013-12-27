/*
    app.c - Catalog Application
 */
#include "esp.h"

/*
    Common base controller used for all requests
 */
static void commonController(HttpConn *conn) 
{
#if UNUSED
    cchar   *uri, *next, *prefix;

    if (!httpLoggedIn(conn)) {
        uri = getUri();
        prefix = espGetConfig(conn->rx->route, "settings.prefix", 0);
        if (sstarts(uri, prefix)) {
            next = &uri[slen(prefix)];
            if (smatch(next, "/user/login") || smatch(next, "/user/logout")) {
                return;
            }
#if UNUSED
            loginRequired = espGetConfig(conn->rx->route, "settings.loginRequired", 0);
            if (loginRequired && *loginRequired) {
                httpError(conn, HTTP_CODE_UNAUTHORIZED, "Access Denied. Login required");
            }
#endif
        }
    }
#endif
}

/*
    Verify passwords using the pak table password.
    Callback from httpLogin to verify the username/password
 */
static bool verifyUser(HttpConn *conn, cchar *pakname, cchar *password)
{
    HttpAuth    *auth;
    HttpUser    *user;
    EdiRec      *prec;

    auth = conn->rx->route->auth;
    if ((prec = readRecWhere("pak", "name", "==", pakname)) == 0) {
        mprLog(5, "verifyUser: Unknown pak name \"%s\"", pakname);
        return 0;
    }
    if (!mprCheckPassword(password, getField(prec, "password"))) {
        mprLog(5, "Password for user \"%s\" failed to authenticate", pakname);
        return 0;
    }
    if ((user = httpLookupUser(auth, pakname)) == 0) {
        user = httpAddUser(auth, pakname, 0, "edit, view");
    }
    httpSetConnUser(conn, user);
    mprLog(5, "Pak (user) \"%s\" authenticated", pakname);
    return 1;
}

ESP_EXPORT int esp_app_catalog(HttpRoute *route, MprModule *module)
{
    espDefineBase(route, commonController);
    httpSetAuthStoreVerify("app", verifyUser);
    return 0;
}