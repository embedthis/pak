/*
    user migration
 */
#include "esp.h"

static int forward(Edi *db) {
    EdiRec  *rec;
    cchar   *password;
    
    ediAddTable(db, "user");
    ediAddColumn(db, "user", "id", EDI_TYPE_INT, EDI_AUTO_INC | EDI_INDEX | EDI_KEY);
    ediAddColumn(db, "user", "username", EDI_TYPE_STRING, 0);
    ediAddColumn(db, "user", "password", EDI_TYPE_STRING, 0);
    ediAddColumn(db, "user", "email", EDI_TYPE_STRING, 0);
    ediAddColumn(db, "user", "roles", EDI_TYPE_STRING, 0);

    /*
        The mprMakePassword API uses Blowfish. This call requests 16 bytes of salt and iterates 128 rounds.
        Use mprCheckPassword to check.
     */
    password = mprMakePassword("demo", 16, 128);
    rec = ediCreateRec(db, "user");
    ediSetFields(rec, ediMakeJson("{ username: 'admin', password: '%s', email: 'dev@embedthis.com', roles: 'edit, view' }", password));
    ediUpdateRec(db, rec);

    password = mprMakePassword("demo", 16, 16);
    rec = ediCreateRec(db, "user");
    ediSetFields(rec, ediMakeJson("{ username: 'guest', password: '%s', email: 'guest@example.com', roles: 'view' }", password));
    ediUpdateRec(db, rec);
    return 0;
}

static int backward(Edi *db)
{
    return ediRemoveTable(db, "user");
}

ESP_EXPORT int esp_migration_user(Edi *db)
{
    ediDefineMigration(db, forward, backward);
    return 0;
}

