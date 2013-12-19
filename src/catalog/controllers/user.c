/*
    user.c - User authentication and management
 */
#include "esp.h"

static void createUser() { 
    if (canUser("edit", 1)) {
        setParam("password", mprMakePassword(param("password"), 0, 0));
        sendResult(createRecFromParams("user"));
    }
}

static void getUser() { 
    /* Don't send the real password back to the user */
    sendRec(setField(readRec("user", param("id")), "password", "   n o t p a s s w o r d   "));
}

static void indexUser() {
    sendGrid(readTable("user"));
}

static void initUser() {
    sendRec(createRec("user", 0));
}

static void listUsers() {
    EdiGrid     *users;
    int         r;

    users = readTable("user");
    for (r = 0; r < users->nrecords; r++) {
        setField(users->records[r], "password", 0);
    }
    sendGrid(users);
}

static void removeUser() { 
    if (canUser("edit", 1)) {
        sendResult(removeRec("user", param("id")));
    }
}

static void updateUser() { 
    if (canUser("edit", 1)) {
        setParam("password", mprMakePassword(param("password"), 0, 0));
        sendResult(updateRecFromParams("user"));
    }
}

static void forgot() {
    EdiRec  *user;
    cchar   *msg, *name, *to;

    name = param("recover");
    if ((user = readRecWhere("user", "username", "==", name)) == 0) {
        if ((user = readRecWhere("user", "email", "==", name)) == 0) {
            /* Security delay */
            mprSleep(2500);
            sendResult(feedback("error", "Unknown user."));
            return;
        }
    }
    to = getField(user, "email");
    msg = sfmt("Password Reset\nPlease use this new temporary password %s\nLogin at %s\n",
        "temp", sjoin(httpUri(getConn(), "~"), "/user/login", NULL));
    if (espEmail(getConn(), to, "mob@emobrien.com", "Reset Password", 0, 0, msg, 0) < 0) {
        sendResult(feedback("error", "Cannot send password reset email."));
    } else {
        sendResult(feedback("inform", "Password reset details sent."));
    }
}

static void login() {
    bool        remember = smatch(param("remember"), "true");
    HttpConn    *conn = getConn();
    if (httpLogin(conn, param("username"), param("password"))) {
        render("{\"error\": 0, \"user\": {\"name\": \"%s\", \"abilities\": %s, \"remember\": %s}}", conn->username,
            mprSerialize(conn->user->abilities, MPR_JSON_QUOTES), remember ? "true" : "false");
    } else {
        sendResult(feedback("error", "Invalid Login"));
    }       
}

static void logout() {                                                                             
    httpLogout(getConn());
    sendResult(1);
}

ESP_EXPORT int esp_controller_kickstart_user(HttpRoute *route, MprModule *module) 
{
    Edi     *edi;

    espDefineAction(route, "user-create", createUser);
    espDefineAction(route, "user-get", getUser);
    espDefineAction(route, "user-list", listUsers);
    espDefineAction(route, "user-index", indexUser);
    espDefineAction(route, "user-init", initUser);

    espDefineAction(route, "user-remove", removeUser);
    espDefineAction(route, "user-update", updateUser);

    espDefineAction(route, "user-cmd-forgot", forgot);
    espDefineAction(route, "user-cmd-login", login);
    espDefineAction(route, "user-cmd-logout", logout);

    edi = espGetRouteDatabase(route);
    ediAddValidation(edi, "present", "user", "username", 0);
    ediAddValidation(edi, "unique", "user", "username", 0);
    ediAddValidation(edi, "present", "user", "email", 0);
    ediAddValidation(edi, "format", "user", "email", ".*@.*");
    ediAddValidation(edi, "unique", "user", "email", 0);
    ediAddValidation(edi, "present", "user", "roles", 0);
    return 0;
}
