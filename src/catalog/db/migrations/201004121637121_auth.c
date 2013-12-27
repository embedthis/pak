/*
    auth migration
 */
#include "esp.h"

static int forward(Edi *db) {
    EdiRec  *rec;
    cchar   *password;
    
    ediAddTable(db, "auth");
    ediAddColumn(db, "auth", "id", EDI_TYPE_INT, EDI_AUTO_INC | EDI_INDEX | EDI_KEY);
    ediAddColumn(db, "auth", "authname", EDI_TYPE_STRING, 0);
    ediAddColumn(db, "auth", "password", EDI_TYPE_STRING, 0);
    ediAddColumn(db, "auth", "email", EDI_TYPE_STRING, 0);
    ediAddColumn(db, "auth", "roles", EDI_TYPE_STRING, 0);

    /*
        The mprMakePassword API uses Blowfish. This call requests 16 bytes of salt and iterates 128 rounds.
        Use mprCheckPassword to check.
     */
    password = mprMakePassword("demo", 16, 128);
    rec = ediCreateRec(db, "auth");
    ediSetFields(rec, ediMakeJson("{ authname: 'admin', password: '%s', email: 'dev@embedthis.com', roles: 'edit, view' }", password));
    ediUpdateRec(db, rec);

    password = mprMakePassword("demo", 16, 128);
    rec = ediCreateRec(db, "auth");
    ediSetFields(rec, ediMakeJson("{ authname: 'guest', password: '%s', email: 'guest@example.com', roles: 'view' }", password));
    ediUpdateRec(db, rec);
    return 0;
}

static int backward(Edi *db)
{
    return ediRemoveTable(db, "auth");
}

ESP_EXPORT int esp_migration_auth(Edi *db)
{
    ediDefineMigration(db, forward, backward);
    return 0;
}

