/*
    app.c - Catalog Application
 */
#include "esp.h"

/*
    Verify passwords using the pak table password.
    Callback from httpLogin to verify the username/password before modifying a pak.
 */
static bool verifyPassword(HttpConn *conn, cchar *pakname, cchar *password)
{
    HttpAuth    *auth;
    HttpUser    *user;
    EdiRec      *prec;

    auth = conn->rx->route->auth;
    if ((prec = readRecWhere("pak", "name", "==", pakname)) == 0) {
        mprLog(5, "verifyPassword: Unknown pak name \"%s\"", pakname);
        return 0;
    }
    if (!mprCheckPassword(password, getField(prec, "password"))) {
        mprLog(5, "Password for pak \"%s\" failed to authenticate", pakname);
        return 0;
    }
    if ((user = httpLookupUser(auth, pakname)) == 0) {
        user = httpAddUser(auth, pakname, 0, "edit, view");
    }
    httpSetConnUser(conn, user);
    mprLog(5, "Pak \"%s\" authenticated", pakname);
    return 1;
}

ESP_EXPORT int esp_app_catalog(HttpRoute *route, MprModule *module)
{
    httpSetAuthStoreVerify("app", verifyPassword);
    return 0;
}
