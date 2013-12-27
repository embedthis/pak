/*
    auth.c - Auth authentication and management
 */
#include "esp.h"

static void login() {
    HttpConn    *conn = getConn();
    if (httpLogin(conn, param("authname"), param("password"))) {
        render("{\"error\": 0, \"auth\": {\"name\": \"%s\", \"abilities\": %s}}", conn->username,
            mprSerialize(conn->user->abilities, MPR_JSON_QUOTES));
    } else {
        sendResult(feedback("error", "Invalid Login"));
    }       
}

static void logout() {                                                                             
    httpLogout(getConn());
    sendResult(1);
}

ESP_EXPORT int esp_controller_catalog_auth(HttpRoute *route, MprModule *module) 
{
    espDefineAction(route, "auth-cmd-login", login);
    espDefineAction(route, "auth-cmd-logout", logout);
    return 0;
}
